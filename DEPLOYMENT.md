# Golf League App Deployment Guide

## 🚀 Production Deployment

### Frontend (GitHub Pages)
The frontend is already configured for GitHub Pages deployment at `trackmansucks.com`.

### Backend Deployment

#### Option 1: Render (Recommended)
1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Connect your GitHub repository
   - Select the repository
   - Choose "Web Service"

3. **Configure Service**
   - **Name**: `golf-league-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (or paid for better performance)

4. **Environment Variables**
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `PORT`: `10000` (Render default)

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Copy the generated URL (e.g., `https://golf-league-backend.onrender.com`)

#### Option 2: Railway
1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Connect your repository
   - Railway will auto-detect Node.js
   - Add environment variables
   - Deploy

#### Option 3: Heroku
1. **Create Heroku Account**
   - Go to [heroku.com](https://heroku.com)
   - Sign up

2. **Deploy**
   ```bash
   heroku create golf-league-backend
   heroku config:set NODE_ENV=production
   heroku config:set DATABASE_URL=your_postgres_url
   git push heroku main
   ```

### Database Setup

#### PostgreSQL Database
1. **Create Database**
   - Use Render PostgreSQL, Railway PostgreSQL, or Heroku Postgres
   - Copy the connection string

2. **Initialize Database**
   - Deploy your backend first
   - Make a POST request to: `https://your-backend-url.com/api/setup-database`
   - This will create all necessary tables

### Configuration Updates

#### 1. Update API Client
In `api.js`, update the backend URL:
```javascript
// Set to true for local development, false for production
const isDevelopment = false;

if (isDevelopment) {
    this.baseURL = 'http://localhost:3001';
} else {
    // Update this to your actual backend URL
    this.baseURL = 'https://your-backend-url.com';
}
```

#### 2. Environment Variables
Set these in your backend deployment:
- `NODE_ENV`: `production`
- `DATABASE_URL`: Your PostgreSQL connection string
- `PORT`: Port number (usually auto-set by platform)

### Testing Production

1. **Update API URL**
   - Change `isDevelopment = false` in `api.js`
   - Update the production URL to your actual backend URL

2. **Test Endpoints**
   - Health check: `https://your-backend-url.com/api/health`
   - Database setup: `https://your-backend-url.com/api/setup-database`

3. **Test Frontend**
   - Visit `https://trackmansucks.com`
   - Test all functionality

### Local Development

To switch back to local development:
1. Set `isDevelopment = true` in `api.js`
2. Run `node server.js` for backend
3. Run `python3 -m http.server 8000` for frontend

### Troubleshooting

#### CORS Issues
- Ensure CORS is configured for your domain
- Check that `trackmansucks.com` is in the allowed origins

#### Database Connection
- Verify `DATABASE_URL` is correct
- Ensure database is accessible from your backend

#### Environment Variables
- Double-check all environment variables are set
- Restart the service after changing environment variables

### Security Notes

1. **Environment Variables**
   - Never commit `.env` files to Git
   - Use platform-specific environment variable management

2. **CORS**
   - Only allow necessary origins
   - Don't use `*` in production

3. **Database**
   - Use connection pooling
   - Enable SSL in production

### Performance Optimization

1. **Database Indexes**
   - Add indexes for frequently queried columns
   - Monitor query performance

2. **Caching**
   - Consider adding Redis for caching
   - Cache leaderboard calculations

3. **CDN**
   - Use GitHub Pages CDN for static assets
   - Consider additional CDN for better global performance 