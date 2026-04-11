# Remote BMS Dashboard Implementation Guide

This folder contains a standalone React application designed to monitor your Battery Management System (BMS) remotely.

## 1. How the Integration Works
The integration uses a **Producer-Consumer** architecture:
- **Producer (Main App)**: Every second, the main BMS app calculates its state and sends a `POST` request to `/api/telemetry`.
- **Bridge (Server)**: The server saves this data into a `telemetry.json` file.
- **Consumer (Remote Dashboard)**: This dashboard app sends a `GET` request to `/api/telemetry` every 2 seconds to display the latest data.

## 2. Local Setup
To run this dashboard locally:
1. Open your terminal in this folder (`/remote-dashboard`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 3. Vercel Deployment Steps
To host this dashboard on Vercel:
1. **Push to GitHub**: Create a new repository on GitHub and push the contents of this `/remote-dashboard` folder to it.
2. **Import to Vercel**:
   - Log in to [Vercel](https://vercel.com).
   - Click "Add New" -> "Project".
   - Import your GitHub repository.
3. **Configure Settings**:
   - Vercel will automatically detect it as a **Vite** project.
   - Click **Deploy**.
4. **CORS Note**: The main BMS app is already configured to allow requests from any domain (CORS enabled), so your Vercel app will be able to fetch data immediately.

## 4. API Configuration
The API URL is currently hardcoded in `src/App.tsx`:
`https://ais-dev-ud52njvxjdxjr24b3mxiyf-455245030455.asia-southeast1.run.app/api/telemetry`

If you deploy your main BMS app to a different URL, simply update the `BMS_API_URL` constant in `src/App.tsx`.
