# Personal Cloud Storage System 🌟

A high-performance, beautiful personal cloud storage system with **liquid glass UI design** and **media streaming capabilities**.

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.1-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green)

## ✨ Features

### 🔐 Security
- **JWT-based authentication** with secure token management
- **Rate limiting** to prevent brute force attacks
- **Path traversal protection** for secure file access
- **CORS configuration** for controlled access

### 📁 File Management
- **Directory listing** with breadcrumb navigation
- **File search** across all directories
- **Sorting options** (by name, size, or modified date)
- **File download** with resume support
- **Metadata display** (size, modified time, file type)

### 🎵 Media Streaming
- **Audio player** with:
  - Liquid glass floating player design
  - Play/pause, seek controls
  - Volume control
  - Progress tracking
- **Video player** with:
  - HTML5 video player
  - Fullscreen support
  - Playback speed control (0.5x - 2x)
  - Range request support for seeking

### 🎨 UI/UX Design
- **Liquid Glass Design** (iOS 26 inspired)
  - Frosted glass effects with backdrop blur
  - Rounded corners and soft shadows
  - Semi-transparent floating elements
- **Smooth animations** with Framer Motion
- **Skeleton loading screens**
- **Micro-interactions** on buttons and elements
- **Fully responsive** - works on mobile and desktop
- **Touch-friendly** interface for mobile devices

## 🏗️ Architecture

### Backend (Python FastAPI)
- Async API endpoints for high performance
- JWT token authentication
- File system management
- Media streaming with Range support
- Rate limiting and security measures

### Frontend (Next.js)
- Static export (SSG) for easy deployment
- TypeScript for type safety
- Tailwind CSS for styling
- Framer Motion for animations
- Axios for API communication

## 🔐 Security

**Version 1.0.1 - All Security Vulnerabilities Fixed ✅**

This project takes security seriously:
- ✅ All dependencies updated to patched versions (see [SECURITY.md](SECURITY.md))
- ✅ JWT token-based authentication
- ✅ Rate limiting (5 attempts/min) to prevent brute force
- ✅ Path traversal attack prevention
- ✅ CORS configuration
- ✅ Secure password handling with bcrypt
- ✅ Input validation and sanitization

For security updates and advisories, see [SECURITY.md](SECURITY.md).

## 📋 Prerequisites

- **Python 3.9+** (for backend)
- **Node.js 18+** (for frontend)
- **npm or yarn** (for frontend dependencies)

## 🚀 Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

5. Run the server:
```bash
python -m backend.main
# Or with uvicorn:
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://49.232.185.68:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment (optional):
```bash
# Create .env.local if you need custom API URL
echo "NEXT_PUBLIC_API_URL=http://49.232.185.68:8000" > .env.local
```

4. Run development server:
```bash
npm run dev
```

The frontend will be available at `http://49.232.185.68:3000`

5. Build for production:
```bash
npm run build
```

Static files will be in the `out/` directory.

## ⚙️ Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ROOT_DIRECTORY` | Root directory for file storage | `./files` |
| `PORT` | Server port | `8000` |
| `HOST` | Server host | `0.0.0.0` |
| `ACCESS_PASSWORD` | Access password | `changeme` |
| `JWT_SECRET_KEY` | JWT signing secret | (auto) |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `JWT_EXPIRATION_HOURS` | Token expiration | `24` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://49.232.185.68:3000` |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://49.232.185.68:8000` |

## 📖 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://49.232.185.68:8000/docs
- **ReDoc**: http://49.232.185.68:8000/redoc

## 🎬 Usage

1. **Login**: Enter your access password on the login page
2. **Browse**: Navigate through folders using the file list or breadcrumb
3. **Search**: Use the search bar to find files
4. **Sort**: Change sorting order (name, size, modified)
5. **Play Media**: Click on audio/video files to play them
6. **Download**: Click the download button on files to download them

## 🔧 Development

### Project Structure

```
WEB/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # Main application
│   ├── auth.py             # Authentication utilities
│   ├── config.py           # Configuration
│   ├── requirements.txt    # Python dependencies
│   └── README.md           # Backend documentation
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities and helpers
│   │   └── types/         # TypeScript types
│   ├── next.config.js     # Next.js configuration
│   ├── tailwind.config.js # Tailwind CSS configuration
│   └── package.json       # Node.js dependencies
├── .github/
│   └── workflows/
│       └── build.yml      # CI/CD workflow
├── TODO.md                # Development checklist
└── README.md              # This file
```

### Running Tests

Backend:
```bash
cd backend
pytest
```

Frontend:
```bash
cd frontend
npm test
```

## 🚢 Deployment

### Frontend Static Deployment

The frontend is built as a static site and can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **GitHub Pages**
- **Any static hosting service**

The GitHub workflow automatically builds and packages the static files as an artifact on each push to main/master.

### Backend Deployment

The backend can be deployed to:
- **Railway**
- **Heroku**
- **DigitalOcean**
- **AWS/GCP/Azure**
- **Any server with Python support**

## 📝 TODO

See [TODO.md](TODO.md) for the complete development checklist.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FastAPI** for the amazing async Python framework
- **Next.js** for the powerful React framework
- **Tailwind CSS** for the utility-first CSS framework
- **Framer Motion** for beautiful animations

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

Made with ❤️ using Python, Next.js, and lots of coffee ☕
