"""
Main FastAPI application for Personal Cloud Storage System.
Provides API endpoints for authentication, file management, and media streaming.
"""
import os
import mimetypes
from pathlib import Path
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import settings
from .auth import create_access_token, verify_token, check_access_password

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
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
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

async def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify JWT token from Authorization header.
    
    Args:
        credentials: HTTP authorization credentials
        
    Returns:
        Token payload dictionary
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials
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
    # Remove leading slashes and resolve the path
    user_path = user_path.lstrip('/')
    full_path = (base / user_path).resolve()
    
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
                    path=str(item.relative_to(settings.ROOT_DIRECTORY)),
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

@app.get("/api/stream/audio")
async def stream_audio(
    path: str = Query(..., description="Audio file path"),
    range: Optional[str] = Header(None),
    payload: dict = Depends(verify_jwt_token)
):
    """
    Stream audio file with range request support.
    
    Args:
        path: Relative path to audio file
        range: Range header for seeking
        payload: JWT token payload
        
    Returns:
        Streaming response with audio data
        
    Raises:
        HTTPException: If file not found or not an audio file
    """
    try:
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

@app.get("/api/stream/video")
async def stream_video(
    path: str = Query(..., description="Video file path"),
    range: Optional[str] = Header(None),
    payload: dict = Depends(verify_jwt_token)
):
    """
    Stream video file with range request support.
    
    Args:
        path: Relative path to video file
        range: Range header for seeking
        payload: JWT token payload
        
    Returns:
        Streaming response with video data
        
    Raises:
        HTTPException: If file not found or not a video file
    """
    try:
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
