# Personal Cloud Storage - Backend API

High-performance FastAPI backend for personal cloud storage with media streaming capabilities.

## Features

- 🔐 JWT-based authentication with rate limiting
- 📁 File system management (list, download, search)
- 🎵 Audio streaming with seek support
- 🎥 Video streaming with range requests
- 🔒 Secure file access with path traversal prevention
- ⚡ High-performance async operations

## Installation

**⚠️ Security Update:** Version 1.0.1 includes important security patches. All dependencies have been updated to secure versions.

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Edit `.env` and configure:
```env
ROOT_DIRECTORY=/path/to/your/files
ACCESS_PASSWORD=your_secure_password
JWT_SECRET_KEY=your_random_secret_key
```

## Running the Server

### Development Mode
```bash
python -m backend.main
```

Or with uvicorn directly:
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Authentication

**POST** `/api/auth/login`
- Login with password to get JWT token
- Rate limited: 5 requests per minute
- Request body: `{"password": "your_password"}`
- Response: `{"token": "jwt_token", "message": "Login successful"}`

### File Management

**GET** `/api/files/list?path=&sort_by=name&search=`
- List files in a directory
- Requires: `Authorization: Bearer <token>`
- Query params:
  - `path`: Directory path (default: root)
  - `sort_by`: Sort field (name/size/modified)
  - `search`: Search query (optional)

**GET** `/api/files/download?path=<file_path>`
- Download a file
- Requires: `Authorization: Bearer <token>`
- Supports range requests for resume

### Media Streaming

**GET** `/api/stream/audio?path=<audio_file>`
- Stream audio files
- Requires: `Authorization: Bearer <token>`
- Supports range requests for seeking

**GET** `/api/stream/video?path=<video_file>`
- Stream video files
- Requires: `Authorization: Bearer <token>`
- Supports range requests for seeking

## Security Features

- JWT token-based authentication
- Password verification before token generation
- Rate limiting on login endpoint (prevents brute force)
- Path traversal attack prevention
- CORS configuration
- Bearer token requirement for all protected endpoints

## Configuration

Environment variables (in `.env`):

| Variable | Description | Default |
|----------|-------------|---------|
| `ROOT_DIRECTORY` | Root directory for file storage | `./files` |
| `PORT` | Server port | `8000` |
| `HOST` | Server host | `0.0.0.0` |
| `ACCESS_PASSWORD` | Access password for authentication | `changeme` |
| `JWT_SECRET_KEY` | Secret key for JWT signing | (auto-generated) |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `JWT_EXPIRATION_HOURS` | Token expiration time | `24` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

## Development

Run with auto-reload:
```bash
uvicorn backend.main:app --reload
```

API documentation available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
