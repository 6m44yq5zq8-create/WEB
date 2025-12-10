# Deployment Guide

This guide covers deploying the Personal Cloud Storage System to various platforms.

## Overview

The system consists of two parts:
1. **Backend (Python FastAPI)** - Requires Python runtime
2. **Frontend (Static Files)** - Just HTML/CSS/JS, no Node.js needed

## Backend Deployment

### Option 1: Railway (Recommended)

Railway provides free hosting for small projects.

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Initialize Railway:**
```bash
cd backend
railway login
railway init
```

3. **Add environment variables in Railway dashboard:**
```
ROOT_DIRECTORY=/app/files
ACCESS_PASSWORD=your_secure_password
JWT_SECRET_KEY=your_random_secret_key
FRONTEND_URL=https://your-frontend-url.vercel.app
```

4. **Deploy:**
```bash
railway up
```

### Option 2: Heroku

1. **Install Heroku CLI and login:**
```bash
heroku login
```

2. **Create app:**
```bash
cd backend
heroku create your-app-name
```

3. **Set environment variables:**
```bash
heroku config:set ROOT_DIRECTORY=/app/files
heroku config:set ACCESS_PASSWORD=your_password
heroku config:set JWT_SECRET_KEY=your_secret
heroku config:set FRONTEND_URL=https://your-frontend.vercel.app
```

4. **Create Procfile:**
```bash
echo "web: uvicorn backend.main:app --host 0.0.0.0 --port \$PORT" > Procfile
```

5. **Deploy:**
```bash
git push heroku main
```

### Option 3: DigitalOcean App Platform

1. Connect your GitHub repository
2. Select "Python" as the app type
3. Set build command: `pip install -r requirements.txt`
4. Set run command: `uvicorn backend.main:app --host 0.0.0.0 --port 8080`
5. Add environment variables in the dashboard
6. Deploy

### Option 4: Traditional VPS (Ubuntu)

1. **Install Python and dependencies:**
```bash
sudo apt update
sudo apt install python3.9 python3-pip python3-venv nginx
```

2. **Setup application:**
```bash
cd /opt
git clone your-repo.git cloud-storage
cd cloud-storage/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **Create systemd service:**
```bash
sudo nano /etc/systemd/system/cloud-storage.service
```

```ini
[Unit]
Description=Personal Cloud Storage API
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/cloud-storage/backend
Environment="PATH=/opt/cloud-storage/backend/venv/bin"
ExecStart=/opt/cloud-storage/backend/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
```

4. **Enable and start:**
```bash
sudo systemctl enable cloud-storage
sudo systemctl start cloud-storage
```

5. **Configure Nginx:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Frontend Deployment

### Option 1: Vercel (Recommended)

Perfect for Next.js applications.

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Build frontend:**
```bash
cd frontend
npm run build
```

3. **Deploy:**
```bash
vercel --prod
```

4. **Set environment variable in Vercel dashboard:**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### Option 2: Netlify

1. **Install Netlify CLI:**
```bash
npm install -g netlify-cli
```

2. **Build frontend:**
```bash
cd frontend
npm run build
```

3. **Deploy:**
```bash
netlify deploy --prod --dir=out
```

4. **Set environment variable in Netlify dashboard:**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### Option 3: GitHub Pages

1. **Build frontend:**
```bash
cd frontend
npm run build
```

2. **Add .nojekyll file:**
```bash
touch out/.nojekyll
```

3. **Push to gh-pages branch:**
```bash
cd out
git init
git add -A
git commit -m "Deploy to GitHub Pages"
git push -f git@github.com:username/repo.git main:gh-pages
```

4. **Configure in GitHub:**
- Go to repository Settings > Pages
- Select gh-pages branch
- Save

### Option 4: Static Hosting (S3, CloudFlare Pages, etc.)

1. **Build frontend:**
```bash
cd frontend
npm run build
```

2. **Upload the `out/` directory to your hosting:**
- AWS S3 + CloudFront
- CloudFlare Pages
- Azure Static Web Apps
- Google Cloud Storage

3. **Configure environment variable:**
Update `NEXT_PUBLIC_API_URL` before building.

## Configuration for Production

### Backend Configuration

1. **Update .env for production:**
```env
ROOT_DIRECTORY=/path/to/production/files
PORT=8000
HOST=0.0.0.0
ACCESS_PASSWORD=strong_production_password
JWT_SECRET_KEY=long_random_string_at_least_32_chars
JWT_EXPIRATION_HOURS=24
FRONTEND_URL=https://your-frontend-domain.com
```

2. **Security checklist:**
- [ ] Use strong ACCESS_PASSWORD
- [ ] Generate random JWT_SECRET_KEY
- [ ] Set correct FRONTEND_URL for CORS
- [ ] Ensure ROOT_DIRECTORY has proper permissions
- [ ] Enable HTTPS
- [ ] Consider adding rate limiting at reverse proxy level

### Frontend Configuration

1. **Update environment variable:**
```bash
# .env.local or Vercel/Netlify dashboard
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

2. **Build for production:**
```bash
npm run build
```

3. **Optimization checklist:**
- [ ] API URL points to production backend
- [ ] Build completes without errors
- [ ] Test login flow
- [ ] Verify media playback
- [ ] Check mobile responsiveness

## Domain Setup

### Backend Domain (api.yourdomain.com)

1. **Add A record pointing to your server IP**
2. **Setup SSL with Let's Encrypt:**
```bash
sudo certbot --nginx -d api.yourdomain.com
```

### Frontend Domain (yourdomain.com)

1. **For Vercel/Netlify:**
   - Add custom domain in dashboard
   - Update DNS records as instructed
   - SSL is automatic

2. **For custom hosting:**
   - Add A record or CNAME
   - Setup SSL certificate
   - Configure CDN if needed

## Post-Deployment Testing

### Backend Tests

1. **Health check:**
```bash
curl https://api.yourdomain.com/
```

2. **Login test:**
```bash
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}'
```

3. **File list test:**
```bash
curl https://api.yourdomain.com/api/files/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Frontend Tests

1. Open https://yourdomain.com
2. Test login flow
3. Browse folders
4. Test search
5. Play audio file
6. Play video file
7. Download file
8. Test on mobile device

## Monitoring

### Backend Monitoring

1. **Check logs:**
```bash
# Railway
railway logs

# Heroku
heroku logs --tail

# VPS
sudo journalctl -u cloud-storage -f
```

2. **Monitor performance:**
- CPU usage
- Memory usage
- Request rate
- Error rate

### Frontend Monitoring

1. **Check Vercel/Netlify analytics**
2. **Monitor:**
- Page load time
- Error rate
- Geographic distribution

## Backup

### Backend Data

1. **File storage:**
```bash
# Backup files
tar -czf backup-$(date +%Y%m%d).tar.gz /path/to/files

# Upload to cloud storage
aws s3 cp backup-*.tar.gz s3://your-backup-bucket/
```

2. **Configuration:**
```bash
# Backup .env
cp backend/.env backend/.env.backup
```

### Frontend

No backup needed - static files can be rebuilt anytime.

## Scaling

### Backend Scaling

1. **Vertical scaling:**
   - Upgrade server resources
   - Increase memory/CPU

2. **Horizontal scaling:**
   - Add load balancer
   - Deploy multiple instances
   - Use shared file storage (NFS/S3)

### Frontend Scaling

Automatic with CDN:
- Vercel/Netlify handle scaling automatically
- CloudFlare for additional CDN layer
- No changes needed

## Troubleshooting

### Backend Issues

**Problem:** CORS errors
- Check FRONTEND_URL in .env
- Verify CORS middleware configuration

**Problem:** JWT errors
- Verify JWT_SECRET_KEY is set
- Check token expiration

**Problem:** File access errors
- Check ROOT_DIRECTORY permissions
- Verify path exists

### Frontend Issues

**Problem:** Cannot connect to API
- Verify NEXT_PUBLIC_API_URL
- Check CORS configuration
- Verify backend is running

**Problem:** Build fails
- Check Node.js version (18+)
- Delete node_modules and reinstall
- Check for TypeScript errors

## Security Best Practices

1. **Use HTTPS everywhere**
2. **Strong passwords** (20+ characters)
3. **Regular updates** of dependencies
4. **Monitor access logs**
5. **Backup regularly**
6. **Rate limiting** at proxy level
7. **Firewall configuration**
8. **Regular security audits**

## Cost Estimation

### Free Tier Options

- **Backend:** Railway (free tier) or Heroku (free tier)
- **Frontend:** Vercel/Netlify (generous free tier)
- **Total:** $0/month for small usage

### Paid Options

- **Backend:** $5-20/month (DigitalOcean, Railway Pro)
- **Frontend:** $0-20/month (usually free)
- **Domain:** $10-15/year
- **Total:** ~$5-25/month

## Support

For deployment issues:
1. Check README.md
2. Review QUICKSTART.md
3. Check backend/frontend READMEs
4. Review logs
5. Open GitHub issue

## Next Steps

After deployment:
1. ✅ Test all features
2. ✅ Setup monitoring
3. ✅ Configure backups
4. ✅ Add custom domain
5. ✅ Enable SSL
6. ✅ Share with users!

---

**Happy Deploying!** 🚀
