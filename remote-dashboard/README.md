# BMS Remote Dashboard

This is a standalone React application designed to be deployed to Vercel (or any static hosting) to remotely monitor and control your AI-Powered Smart Home BMS.

## Features
- **Real-time Energy Flow**: Dynamic Sankey chart showing solar, battery, and load distribution.
- **Smart Home Control**: Toggle appliances remotely.
- **AI Monitoring**: Receive critical alerts and recommendations from the main system.
- **Live Sync**: Connects via the "Remote API URL" feature.

## How to Deploy to Vercel
1. Download or copy this folder.
2. Push it to a new GitHub repository.
3. Connect the repository to Vercel.
4. Once deployed, copy the Vercel URL.
5. In your **Main BMS App**, paste the Vercel URL into the "Remote API URL" field and toggle **LIVE ON**.
6. In this **Remote Dashboard**, paste the Main BMS App URL into the connection box and click **CONNECT**.

## Local Development
```bash
npm install
npm run dev
```
