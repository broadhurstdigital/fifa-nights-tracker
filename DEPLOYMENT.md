# FIFA Nights League Tracker - Deployment Guide

## Option 1: Railway (Recommended - Easiest)

### Prerequisites
- GitHub account
- Railway account (free signup)

### Steps
1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/fifa-nights-tracker.git
   git push -u origin main
   ```

2. **Deploy to Railway**
   - Go to https://railway.app
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your fifa-nights-tracker repo
   - Railway will auto-detect the Docker setup
   - Add PostgreSQL service (click "Add Service" → "Database" → "PostgreSQL")
   - Environment variables are auto-configured

3. **Access Your App**
   - Railway provides a public URL automatically
   - Database connection string is auto-provided

## Option 2: Render (100% Free)

### Backend (Render)
1. **Push to GitHub** (same as above)
2. **Deploy Backend**
   - Go to https://render.com
   - Sign up with GitHub
   - Click "New" → "Web Service"
   - Connect GitHub repo
   - Use these settings:
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`
     - Environment: `Node`
   - Add PostgreSQL database (free tier)

### Frontend (Vercel)
1. **Deploy Frontend**
   - Go to https://vercel.com
   - Import from GitHub
   - Select `frontend` folder
   - Auto-deploys with custom domain

## Option 3: Heroku (Simple but Paid)
- Backend: Heroku dyno ($7/month)
- Database: Heroku Postgres (free tier available)
- Frontend: Vercel/Netlify (free)

## Environment Variables Needed
```
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
PORT=3001
```

## Post-Deployment
1. Import your CSV fixture data
2. Create initial players
3. Test all functionality
4. Share the URL with friends

## Estimated Costs
- **Railway**: Free trial, then $5/month
- **Render**: 100% free (with limitations)
- **Heroku**: $7/month minimum

Choose Railway for easiest setup, Render for completely free hosting.