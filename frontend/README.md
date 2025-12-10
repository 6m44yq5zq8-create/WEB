# Personal Cloud Storage - Frontend

Beautiful Next.js frontend with liquid glass UI design and media streaming capabilities.

## Features

- 🎨 **Liquid Glass Design** - iOS 26 inspired frosted glass UI
- 📱 **Responsive** - Works on mobile and desktop
- ⚡ **Static Export** - SSG for easy deployment
- 🎵 **Media Players** - Built-in audio and video players
- 🔍 **Search & Sort** - Find files quickly
- 🔐 **JWT Auth** - Secure authentication

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Axios** for API requests

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://49.232.185.68:3000](http://49.232.185.68:3000) in your browser.

### Build

```bash
npm run build
```

The static files will be generated in the `out/` directory.

### Production

Serve the static files:

```bash
npm start
```

## Configuration

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://49.232.185.68:8000
```

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page (file browser)
│   ├── login/             # Login page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── AudioPlayer.tsx    # Audio player component
│   ├── VideoPlayer.tsx    # Video player component
│   ├── FileItem.tsx       # File list item
│   ├── Breadcrumb.tsx     # Navigation breadcrumb
│   └── SkeletonLoader.tsx # Loading skeleton
├── lib/                   # Utilities and helpers
│   ├── api.ts            # API client with interceptors
│   ├── auth.tsx          # Authentication context
│   ├── config.ts         # Configuration
│   └── utils.ts          # Utility functions
└── types/                # TypeScript types
    └── index.ts          # Type definitions
```

## Components

### AudioPlayer

Floating audio player with:
- Play/pause controls
- Seek bar with progress
- Volume control
- Glass morphism design

### VideoPlayer

Full-screen video player with:
- HTML5 video element
- Playback speed control
- Fullscreen support
- Custom controls overlay

### FileItem

File list item with:
- File icon based on type
- File metadata (size, date)
- Download button
- Smooth animations

### Breadcrumb

Navigation breadcrumb showing current path with click navigation.

### SkeletonLoader

Loading placeholder with shimmer animation.

## Styling

### Tailwind Configuration

Custom colors and utilities for glass morphism:

```javascript
{
  colors: {
    glass: {
      light: 'rgba(255, 255, 255, 0.1)',
      medium: 'rgba(255, 255, 255, 0.2)',
      dark: 'rgba(0, 0, 0, 0.1)',
    },
  },
}
```

### Custom Classes

- `.glass-card` - Glass card with backdrop blur
- `.glass-button` - Glass button with hover effects
- `.skeleton` - Loading skeleton animation

## Authentication

The app uses JWT tokens stored in localStorage:

1. User enters password on login page
2. Backend validates and returns JWT token
3. Token stored in localStorage
4. All API requests include token in Authorization header
5. Automatic redirect to login if token invalid

## API Integration

All API calls go through the axios client with interceptors:

- Automatically adds JWT token to requests
- Handles 401 errors (redirects to login)
- Centralized error handling

## Deployment

### Static Export

The app is configured for static export:

```javascript
// next.config.js
module.exports = {
  output: 'export',
  images: {
    unoptimized: true,
  },
}
```

### Deploy to Vercel

```bash
vercel
```

### Deploy to Netlify

```bash
npm run build
# Upload the 'out' directory
```

### Deploy to GitHub Pages

```bash
npm run build
# Configure GitHub Pages to serve from 'out' directory
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Static generation for fast loading
- Code splitting for optimal bundle size
- Image optimization (when not exported)
- Lazy loading of components

## Accessibility

- Semantic HTML
- Keyboard navigation support
- ARIA labels where needed
- Focus management

## Development Tips

### Hot Reload

The dev server supports hot reload. Changes to components will reflect immediately.

### TypeScript

Run type checking:

```bash
npx tsc --noEmit
```

### Linting

Run ESLint:

```bash
npm run lint
```

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Delete `.next` and `out` directories
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install`
4. Run `npm run build`

### API Connection Issues

1. Check that backend is running
2. Verify `NEXT_PUBLIC_API_URL` is correct
3. Check CORS configuration in backend
4. Verify JWT token in localStorage

## License

GPL-3.0 License - see LICENSE file for details.
