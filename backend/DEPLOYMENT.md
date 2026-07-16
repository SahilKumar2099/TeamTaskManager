# Backend deployment notes

## Render deployment
This backend is prepared for deployment on Render.

### Files added
- render.yaml

### Render settings
- Build Command: `npm install`
- Start Command: `npm start`
- Node Version: `18+`

### Required environment variables
- PORT: `10000`
- MONGO_URI: your MongoDB Atlas connection string
- JWT_SECRET: a strong production secret
- JWT_EXPIRE: `24h`
- CORS_ORIGIN: your frontend URL, for example `https://your-frontend.onrender.com`

## Notes
- The server listens on `0.0.0.0` for hosting platforms.
- CORS is configured from the `CORS_ORIGIN` variable.
- MongoDB Atlas credentials must be set in `MONGO_URI`.
