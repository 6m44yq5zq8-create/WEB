# Quick Start Guide

## Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- npm or yarn

## Setup Steps

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create configuration file
cp .env.example .env

# Edit .env file with your settings
# Important: Set ROOT_DIRECTORY to your files location
# Important: Set ACCESS_PASSWORD to your desired password
nano .env  # or use any text editor
```

Example `.env` configuration:
```env
ROOT_DIRECTORY=/home/user/my-files
ACCESS_PASSWORD=my-secure-password
JWT_SECRET_KEY=change-this-to-random-string
PORT=8000
```

### 2. Start Backend

```bash
# From backend directory
python -m backend.main

# Or with uvicorn
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### 3. Frontend Setup

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# (Optional) Configure API URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### 4. Start Frontend

#### Development Mode

```bash
# From frontend directory
npm run dev
```

Frontend will be available at: `http://localhost:3000`

#### Production Mode

```bash
# Build the frontend
npm run build

# Serve the static files
npx serve out
```

## Usage

1. **Open Browser**: Navigate to `http://localhost:3000` (or your frontend URL)

2. **Login**: Enter the password you set in `backend/.env` file

3. **Browse Files**: 
   - Click on folders to navigate
   - Use breadcrumb to go back
   - Search for files using the search bar
   - Sort by name, size, or modified date

4. **Play Media**:
   - Click on audio files (MP3, WAV, etc.) to open the audio player
   - Click on video files (MP4, MKV, etc.) to open the video player

5. **Download Files**:
   - Click the download button on any file
   - Or open non-media files to trigger download

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Change PORT in .env file or use different port
uvicorn backend.main:app --port 8001
```

**Permission denied for directory:**
- Make sure ROOT_DIRECTORY exists and has read permissions
- Check that the path in .env is correct

**Module not found:**
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend Issues

**Build errors:**
```bash
# Clean and rebuild
rm -rf .next out node_modules
npm install
npm run build
```

**API connection error:**
- Verify backend is running on correct port
- Check NEXT_PUBLIC_API_URL in .env.local
- Check browser console for CORS errors

**Login fails:**
- Verify ACCESS_PASSWORD in backend/.env
- Check backend logs for errors
- Clear browser localStorage and try again

## File Structure

```
WEB/
├── backend/           # Python FastAPI backend
│   ├── main.py       # Main application
│   ├── auth.py       # Authentication
│   ├── config.py     # Configuration
│   └── .env          # Environment variables (create this)
└── frontend/         # Next.js frontend
    ├── src/
    │   ├── app/      # Pages
    │   ├── components/ # UI components
    │   └── lib/      # Utilities
    └── out/          # Built static files
```

## Security Notes

- Always use a strong ACCESS_PASSWORD
- Change JWT_SECRET_KEY to a random string
- Don't commit .env files to git
- Use HTTPS in production
- Set proper CORS origins for production

## Production Deployment

### Backend

Deploy to any Python hosting service:
- Railway
- Heroku
- DigitalOcean
- AWS/GCP/Azure

Update `FRONTEND_URL` in .env to your frontend domain.

### Frontend

Deploy static files to:
- Vercel (recommended)
- Netlify
- GitHub Pages
- Any static hosting

Update `NEXT_PUBLIC_API_URL` to your backend domain.

## Support

For issues and questions, check:
- README.md for detailed documentation
- backend/README.md for backend specifics
- frontend/README.md for frontend specifics
- TODO.md for development status

## License

GPL-3.0 - see LICENSE file
