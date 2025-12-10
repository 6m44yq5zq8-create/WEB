"""
Main FastAPI application for Personal Cloud Storage System.
Provides API endpoints for authentication, file management, and media streaming.
"""
import os
import mimetypes
from pathlib import Path
from typing import Optional, List
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Depends, Header, Query, Request, Body
from fastapi import UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
import base64
import secrets
import json
from webauthn_store import store_credential, get_all_credentials, get_credential_by_id, update_sign_count, delete_credential

# Challenge store for register/login (simple in-memory store for single-user system)
webauthn_challenges = {
    'register': None,
    'login': None
}
from auth import create_access_token, verify_token, check_access_password

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI app
app = FastAPI(
    title="Personal Cloud Storage API",
    description="High-performance file management and media streaming API",
    version="1.0.0"
)

# Add rate limiting handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:8900"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# ============================================================================
# Models
# ============================================================================

class LoginRequest(BaseModel):
    """Login request model."""
    password: str

class LoginResponse(BaseModel):
    """Login response model."""
    token: str
    message: str

class FileInfo(BaseModel):
    """File information model."""
    name: str
    path: str
    is_directory: bool
    size: Optional[int] = None
    modified_time: Optional[str] = None
    file_type: Optional[str] = None

class DirectoryListing(BaseModel):
    """Directory listing response model."""
    path: str
    items: List[FileInfo]
    total: int

# ============================================================================
# Dependency Functions
# ============================================================================

async def verify_jwt_token(request: Request) -> dict:
    """
    Verify JWT token. Accepts token from either the Authorization header
    (Bearer) or from a `token` query parameter. This allows media elements
    (which can't attach Authorization headers) to include the token in the
    URL when necessary.

    Returns payload dict on success or raises HTTPException(401) on failure.
    """
    # 1) Try Authorization header first
    auth_header = request.headers.get("authorization")
    token = None
    if auth_header and auth_header.lower().startswith('bearer '):
        token = auth_header.split(None, 1)[1]

    # 2) Fallback to query parameter `token` or `access_token`
    if not token:
        token = request.query_params.get('token') or request.query_params.get('access_token')

    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload

# ============================================================================
# Helper Functions
# ============================================================================

def get_file_type(file_path: Path) -> str:
    """
    Determine file type based on extension.
    
    Args:
        file_path: Path to the file
        
    Returns:
        File type string (audio, video, image, document, other)
    """
    mime_type, _ = mimetypes.guess_type(str(file_path))
    
    if mime_type:
        if mime_type.startswith('audio/'):
            return 'audio'
        elif mime_type.startswith('video/'):
            return 'video'
        elif mime_type.startswith('image/'):
            return 'image'
        elif mime_type in ['application/pdf', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
            return 'document'
    
    return 'other'

def safe_path_join(base: Path, user_path: str) -> Path:
    """
    Safely join user-provided path with base directory.
    Prevents directory traversal attacks.
    
    Args:
        base: Base directory path
        user_path: User-provided path component
        
    Returns:
        Resolved absolute path
        
    Raises:
        HTTPException: If path traversal is detected
    """
    # Normalize separators: accept both backslash and forward slash from clients
    # Remove leading slashes and split into path components to avoid accidental
    # path injection via .. or malformed separators.
    import re
    user_path = user_path.lstrip('/\\')
    if user_path == "":
        full_path = base.resolve()
    else:
        parts = [p for p in re.split(r'[\\/]+', user_path) if p and p != '.' ]
        full_path = base.joinpath(*parts).resolve()
    
    # Ensure the resolved path is within the base directory
    try:
        full_path.relative_to(base.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return full_path

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint - API status check."""
    return {
        "message": "Personal Cloud Storage API",
        "version": "1.0.0",
        "status": "operational"
    }


def b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')


def b64decode(data: str) -> bytes:
    padding = '=' * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def get_rp_id():
    # Derive rp_id from FRONTEND_URL host
    from urllib.parse import urlparse
    parsed = urlparse(settings.FRONTEND_URL)
    return parsed.hostname

@app.post("/api/auth/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, login_data: LoginRequest):
    """
    Authenticate user and return JWT token.
    Rate limited to 5 attempts per minute to prevent brute force attacks.
    
    Args:
        request: FastAPI request object (for rate limiting)
        login_data: Login credentials
        
    Returns:
        JWT token and success message
        
    Raises:
        HTTPException: If password is incorrect
    """
    if not check_access_password(login_data.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Create JWT token
    token = create_access_token(data={"authenticated": True})
    
    return LoginResponse(
        token=token,
        message="Login successful"
    )


@app.get('/api/auth/passkey/exists')
async def passkey_exists():
    creds = get_all_credentials()
    return {'exists': len(creds) > 0}


@app.get('/api/auth/passkey/register/options')
async def passkey_register_options(payload: dict = Depends(verify_jwt_token)):
    # Generate a new challenge
    challenge_bytes = secrets.token_bytes(32)
    challenge = b64encode(challenge_bytes)
    webauthn_challenges['register'] = challenge

    rp = {
        'name': 'Personal Cloud Storage',
        'id': get_rp_id()
    }
    user_handle = b64encode(b'site_user')

    # Add excludeCredentials from existing creds to prevent re-registration on same device
    existing_creds = get_all_credentials()
    exclude_credentials = []
    for c in existing_creds:
        exclude_credentials.append({'type': 'public-key', 'id': c['credential_id']})

    options = {
        'challenge': challenge,
        'rp': rp,
        'user': {
            'id': user_handle,
            'name': 'site_user',
            'displayName': 'site_user'
        },
        'pubKeyCredParams': [
            {'type': 'public-key', 'alg': -7},  # ES256
            {'type': 'public-key', 'alg': -257} # RS256
        ],
        'authenticatorSelection': {'authenticatorAttachment': 'platform', 'userVerification': 'preferred'},
        'timeout': 60000,
        'attestation': 'direct'
    }
    if exclude_credentials:
        options['excludeCredentials'] = exclude_credentials

    return options


@app.post('/api/auth/passkey/register/verify')
async def passkey_register_verify(request: Request, payload: dict = Body(...), jwt_payload: dict = Depends(verify_jwt_token)):
    try:
        # This endpoint verifies the attestation object from the client and stores credential
        # Payload is expected to be the registration response from navigator.credentials.create()
        expected_challenge = webauthn_challenges.get('register')
        if not expected_challenge:
            raise HTTPException(status_code=400, detail="Missing challenge; request registration options first")

        # We'll verify using the webauthn library
        from webauthn import verify_registration_response, WebAuthnRegistrationResponse

        # Construct response object as expected by the verification library
        registration_response = payload

        # expected values
        expected_origin = settings.FRONTEND_URL
        expected_rp_id = get_rp_id()

        verification = verify_registration_response(
            credential=registration_response,
            expected_challenge=expected_challenge,
            expected_origin=expected_origin,
            expected_rp_id=expected_rp_id,
            require_user_verification=False,
        )

        # verification should contain credential_id, public_key and sign_count
        credential_id = verification.credential_id
        public_key = verification.credential_public_key
        sign_count = verification.sign_count

        # Store credential
        store_credential(credential_id, public_key, sign_count)

        return {'status': 'ok'}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Passkey registration verification failed: {str(e)}')


@app.get('/api/auth/passkey/login/options')
async def passkey_login_options():
    # If we have credentials, return allowCredentials and a challenge
    creds = get_all_credentials()
    if not creds:
        return {'allowCredentials': [], 'challenge': None}

    challenge_bytes = secrets.token_bytes(32)
    challenge = b64encode(challenge_bytes)
    webauthn_challenges['login'] = challenge

    allow_credentials = []
    for c in creds:
        allow_credentials.append({
            'id': c['credential_id'],
            'type': 'public-key',
            'transports': c['transports'].split(',') if c.get('transports') else []
        })

    options = {
        'challenge': challenge,
        'allowCredentials': allow_credentials,
        'timeout': 60000,
        'userVerification': 'preferred',
        'rpId': get_rp_id()
    }

    return options


@app.get('/api/auth/passkey/list')
async def passkey_list(jwt_payload: dict = Depends(verify_jwt_token)):
    creds = get_all_credentials()
    # Return minimal public info to client (no public_key)
    return [{'credential_id': c['credential_id'], 'transports': c['transports'], 'created_at': c['created_at']} for c in creds]


@app.delete('/api/auth/passkey/{credential_id}')
async def passkey_delete(credential_id: str, jwt_payload: dict = Depends(verify_jwt_token)):
    cred = get_credential_by_id(credential_id)
    if not cred:
        raise HTTPException(status_code=404, detail='Credential not found')
    delete_credential(credential_id)
    return {'status': 'deleted'}


@app.post('/api/auth/passkey/login/verify')
async def passkey_login_verify(request: Request, payload: dict = Body(...)):
    try:
        expected_challenge = webauthn_challenges.get('login')
        if not expected_challenge:
            raise HTTPException(status_code=400, detail='Missing login challenge; request options first')

        from webauthn import verify_authentication_response

        assertion = payload
        credential_id = assertion.get('id') or assertion.get('rawId')
        cred = get_credential_by_id(credential_id)
        if not cred:
            raise HTTPException(status_code=400, detail='Unknown credential')

        expected_origin = settings.FRONTEND_URL
        expected_rp_id = get_rp_id()

        verification = verify_authentication_response(
            credential=assertion,
            expected_challenge=expected_challenge,
            expected_rp_id=expected_rp_id,
            expected_origin=expected_origin,
            credential_public_key=cred['public_key'],
            prev_sign_count=cred['sign_count']
        )

        # Update sign count
        update_sign_count(credential_id, verification.new_sign_count)

        # Issue JWT token same as password login
        token = create_access_token(data={'authenticated': True})
        return {'token': token}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Passkey login verification failed: {str(e)}')

@app.get("/api/files/list", response_model=DirectoryListing)
async def list_files(
    path: str = Query("", description="Directory path to list"),
    sort_by: str = Query("name", description="Sort by: name, size, modified"),
    search: Optional[str] = Query(None, description="Search query"),
    payload: dict = Depends(verify_jwt_token)
):
    """
    List files and directories in the specified path.
    
    Args:
        path: Relative path from root directory
        sort_by: Sort field (name, size, modified)
        search: Optional search query
        payload: JWT token payload
        
    Returns:
        Directory listing with file information
        
    Raises:
        HTTPException: If path is invalid or access is denied
    """
    try:
        directory = safe_path_join(settings.ROOT_DIRECTORY, path)
        
        if not directory.exists():
            raise HTTPException(status_code=404, detail="Directory not found")
        
        if not directory.is_dir():
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        # Get all items in directory
        items = []
        for item in directory.iterdir():
            try:
                stat = item.stat()
                
                # Apply search filter if provided
                if search and search.lower() not in item.name.lower():
                    continue
                
                file_info = FileInfo(
                    name=item.name,
                    path=item.relative_to(settings.ROOT_DIRECTORY).as_posix(),
                    is_directory=item.is_dir(),
                    size=stat.st_size if item.is_file() else None,
                    modified_time=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    file_type=get_file_type(item) if item.is_file() else "folder"
                )
                items.append(file_info)
            except (PermissionError, OSError):
                # Skip items we can't access
                continue
        
        # Sort items
        if sort_by == "size":
            items.sort(key=lambda x: x.size or 0, reverse=True)
        elif sort_by == "modified":
            items.sort(key=lambda x: x.modified_time or "", reverse=True)
        else:  # name
            items.sort(key=lambda x: (not x.is_directory, x.name.lower()))
        
        return DirectoryListing(
            path=path,
            items=items,
            total=len(items)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing directory: {str(e)}")

@app.get("/api/files/download")
async def download_file(
    path: str = Query(..., description="File path to download"),
    payload: dict = Depends(verify_jwt_token)
):
    """
    Download a file with range request support.
    
    Args:
        path: Relative path to the file
        payload: JWT token payload
        
    Returns:
        File response with appropriate headers
        
    Raises:
        HTTPException: If file not found or access denied
    """
    try:
        file_path = safe_path_join(settings.ROOT_DIRECTORY, path)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")

@app.api_route("/api/stream/token", methods=["GET", "POST"])
async def create_stream_token(
    path: str = Query(..., description="File path to create a short-lived stream token"),
    payload: dict = Depends(verify_jwt_token)
):
    """
    Create a short-lived stream token for the requested `path`.
    Accepts GET and POST to be tolerant of different client implementations.
    Requires a valid user JWT (checked by `verify_jwt_token`). Returns a
    JWT with a small expiration and claims {stream: True, path: <path>}.
    """
    expires = timedelta(seconds=60)
    token = create_access_token(data={"stream": True, "path": path}, expires_delta=expires)
    return {"token": token, "expires_in": int(expires.total_seconds())}


@app.get("/api/stream/audio")
async def stream_audio(
    path: str = Query(..., description="Audio file path"),
    range: Optional[str] = Header(None),
    token: Optional[str] = Query(None, description="JWT authentication token or short-lived stream token"),
    request: Request = None
):
    """
    Stream audio file with range request support.
    
    Args:
        path: Relative path to audio file
        range: Range header for seeking
        token: JWT token (can be passed via query parameter for media elements)
        request: Request object for Authorization header fallback
        
    Returns:
        Streaming response with audio data
        
    Raises:
        HTTPException: If file not found or not an audio file
    """
    try:
        # Validate access: accept token from query parameter or Authorization header
        if token:
            payload_token = verify_token(token)
            if not payload_token:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            # If it's a stream token, verify the path matches
            if payload_token.get('stream'):
                if payload_token.get('path') != path:
                    raise HTTPException(status_code=403, detail="Token not valid for this path")
        else:
            # Fallback: require JWT via Authorization header
            if request is None:
                raise HTTPException(status_code=401, detail="Missing authentication token")
            await verify_jwt_token(request)

        file_path = safe_path_join(settings.ROOT_DIRECTORY, path)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        file_size = file_path.stat().st_size
        mime_type, _ = mimetypes.guess_type(str(file_path))
        
        if not mime_type or not mime_type.startswith('audio/'):
            mime_type = 'audio/mpeg'  # Default to MP3
        
        # Handle range requests
        start = 0
        end = file_size - 1
        
        if range:
            range_match = range.replace('bytes=', '').split('-')
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if len(range_match) > 1 and range_match[1] else end
        
        # Generator function for streaming
        async def iterfile():
            with open(file_path, 'rb') as f:
                f.seek(start)
                remaining = end - start + 1
                chunk_size = 64 * 1024  # 64KB chunks
                
                while remaining > 0:
                    chunk_size = min(chunk_size, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
        
        headers = {
            'Content-Range': f'bytes {start}-{end}/{file_size}',
            'Accept-Ranges': 'bytes',
            'Content-Length': str(end - start + 1),
        }
        
        return StreamingResponse(
            iterfile(),
            media_type=mime_type,
            headers=headers,
            status_code=206 if range else 200
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error streaming audio: {str(e)}")


@app.post('/api/files/create-folder')
@limiter.limit('10/minute')
async def create_folder(
    request: Request,
    parent: Optional[str] = Query('', description='Parent folder path (relative)'),
    name: str = Body(..., embed=True, description='New folder name'),
    payload: dict = Depends(verify_jwt_token)
):
    """
    Create a new folder inside `parent` with name `name`.
    """
    try:
        # Sanitize folder name: avoid path separators
        if not name or '/' in name or '\\' in name or name in ('..', '.'):
            raise HTTPException(status_code=400, detail='Invalid folder name')

        dest_path = safe_path_join(settings.ROOT_DIRECTORY, (parent or '').strip('/\\'))
        new_dir = dest_path.joinpath(name).resolve()
        # ensure inside root
        try:
            new_dir.relative_to(settings.ROOT_DIRECTORY.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail='Invalid folder path')

        if new_dir.exists():
            raise HTTPException(status_code=409, detail='Folder already exists')

        new_dir.mkdir(parents=False, exist_ok=False)
        return {'status': 'created', 'path': new_dir.relative_to(settings.ROOT_DIRECTORY).as_posix()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to create folder: {str(e)}')


@app.post('/api/files/upload')
@limiter.limit('20/minute')
async def upload_file(
    request: Request,
    path: Optional[str] = Query('', description='Parent directory to upload into'),
    file: UploadFile = File(...),
    payload: dict = Depends(verify_jwt_token)
):
    """
    Upload a file to server, safe handling and size limiting applied.
    """
    try:
        parent = safe_path_join(settings.ROOT_DIRECTORY, (path or '').strip('/\\'))

        # Sanitize filename
        filename = os.path.basename(file.filename)
        if not filename:
            raise HTTPException(status_code=400, detail='Missing filename')
        if filename in ('.', '..'):
            raise HTTPException(status_code=400, detail='Invalid filename')

        # target file path
        dest = parent.joinpath(filename).resolve()
        try:
            dest.relative_to(settings.ROOT_DIRECTORY.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail='Invalid upload path')

        # Prevent overwriting
        if dest.exists():
            raise HTTPException(status_code=409, detail='File already exists')

        # Stream to disk and enforce size
        max_bytes = settings.UPLOAD_MAX_BYTES
        written = 0
        with open(dest, 'wb') as out_f:
            while True:
                chunk = await file.read(64 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    out_f.close()
                    os.remove(dest)
                    raise HTTPException(status_code=413, detail='File too large')
                out_f.write(chunk)

        return {'status': 'uploaded', 'path': dest.relative_to(settings.ROOT_DIRECTORY).as_posix(), 'size': written}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'File upload failed: {str(e)}')

@app.get("/api/stream/video")
async def stream_video(
    path: str = Query(..., description="Video file path"),
    range: Optional[str] = Header(None),
    token: Optional[str] = Query(None, description="JWT authentication token or short-lived stream token"),
    request: Request = None
):
    """
    Stream video file with range request support.
    
    Args:
        path: Relative path to video file
        range: Range header for seeking
        token: JWT token (can be passed via query parameter for media elements)
        request: Request object for Authorization header fallback
        
    Returns:
        Streaming response with video data
        
    Raises:
        HTTPException: If file not found or not a video file
    """
    try:
        # Validate access: accept token from query parameter or Authorization header
        if token:
            payload_token = verify_token(token)
            if not payload_token:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            # If it's a stream token, verify the path matches
            if payload_token.get('stream'):
                if payload_token.get('path') != path:
                    raise HTTPException(status_code=403, detail="Token not valid for this path")
        else:
            if request is None:
                raise HTTPException(status_code=401, detail="Missing authentication token")
            await verify_jwt_token(request)

        file_path = safe_path_join(settings.ROOT_DIRECTORY, path)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        file_size = file_path.stat().st_size
        mime_type, _ = mimetypes.guess_type(str(file_path))
        
        if not mime_type or not mime_type.startswith('video/'):
            mime_type = 'video/mp4'  # Default to MP4
        
        # Handle range requests
        start = 0
        end = file_size - 1
        
        if range:
            range_match = range.replace('bytes=', '').split('-')
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if len(range_match) > 1 and range_match[1] else end
        
        # Generator function for streaming
        async def iterfile():
            with open(file_path, 'rb') as f:
                f.seek(start)
                remaining = end - start + 1
                chunk_size = 256 * 1024  # 256KB chunks for video
                
                while remaining > 0:
                    chunk_size = min(chunk_size, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
        
        headers = {
            'Content-Range': f'bytes {start}-{end}/{file_size}',
            'Accept-Ranges': 'bytes',
            'Content-Length': str(end - start + 1),
        }
        
        return StreamingResponse(
            iterfile(),
            media_type=mime_type,
            headers=headers,
            status_code=206 if range else 200
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error streaming video: {str(e)}")

# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
