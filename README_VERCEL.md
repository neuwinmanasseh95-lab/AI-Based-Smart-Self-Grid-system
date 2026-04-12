# Deploying to Vercel

This application is ready to be hosted on Vercel.

## Prerequisites
1. A Vercel account.
2. The Vercel CLI installed (`npm i -g vercel`) or your project connected to a GitHub repository.

## Deployment Steps
1. **Environment Variables**:
   - In your Vercel project settings, add `GEMINI_API_KEY` with your Google Gemini API key.
   - (Optional) Add `VITE_APP_URL` if you need self-referential links in the frontend.

2. **Deploy**:
   - Run `vercel` in the root directory.
   - Follow the prompts to link and deploy.

## Important Note on Persistence
This app uses local JSON files to store appliance states and battery telemetry. 
**Vercel uses an ephemeral filesystem**, meaning any changes made to the "Smart Home" or "Battery Data" will be lost when the serverless function restarts (cold start).

For production-grade persistence, it is recommended to replace the `fs` logic in `api/index.ts` with a database like:
- **Vercel KV** (Redis)
- **Vercel Postgres**
- **MongoDB Atlas**
- **Firebase Firestore**

The current implementation uses the `/tmp` directory to allow temporary writes during a session.
