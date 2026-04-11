# Virtual Battery Pack Manager

A high-precision, 4x4 virtual battery pack simulator built with React, Express, and Tailwind CSS. This tool allows for real-time monitoring and simulation of battery cell parameters, with cloud-oriented data persistence and live telemetry synchronization.

## Features

- **4x4 Matrix Grid**: Visual representation of 16 battery cells in a circular, hardware-inspired interface.
- **Real-time Parameter Simulation**:
  - **Voltage (V)**: Range 2.5V - 4.5V.
  - **Current Flow (A)**: Range 0A - 5A.
  - **Temperature (°C)**: Range 0°C - 100°C.
- **Dynamic Status Indicators**:
  - **Green**: Normal operation.
  - **Yellow**: Warning (High voltage or temperature).
  - **Red**: Critical (Over-voltage, under-voltage, or overheating).
- **GenAI Monitoring**:
  - **AI Digital Twin**: A second 4x4 grid that reflects the AI's analysis of the primary pack.
  - **Anomalies Detection**: Gemini AI continuously monitors the JSON data to identify irregular patterns.
  - **Smart Alerts**: Provides contextual alerts (Normal, Warning, Critical) based on complex data relationships.
  - **Actionable Recommendations**: AI provides specific advice on how to handle detected issues.
- **Cloud-Oriented Persistence**:
  - **Local API**: Saves configuration to a local `battery-data.json` file via an Express backend.
  - **Live Telemetry Sync**: Automatically sends full pack data to a remote cloud API every second via HTTP POST.
- **Data Export**:
  - **JSON Export**: Download the current 4x4 configuration as a local file.
  - **Raw API Access**: Access the current state via the `/api/battery-pack` endpoint.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, Lucide React (Icons), Framer Motion (Animations).
- **Backend**: Express (Node.js), tsx (Runtime).
- **Data Format**: JSON.

## Getting Started

### Prerequisites

- Node.js installed on your system.

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server (Full-stack mode):
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`.

## API Documentation

### Local Endpoints

- **GET `/api/battery-pack`**: Retrieves the current state of all 16 battery cells.
- **POST `/api/battery-pack`**: Saves the current state to the server's local storage.

### Live Telemetry Format

When "Live Sync" is enabled, the application sends a POST request every second to your specified Remote URL with the following schema:

```json
{
  "timestamp": "2026-04-07T10:05:38Z",
  "pack_data": [
    {
      "id": 0,
      "name": "Cell 1",
      "voltage": 3.7,
      "current": 0.5,
      "temperature": 25
    },
    ...
  ],
  "metadata": {
    "total_voltage": "59.20",
    "avg_temp": "25.0"
  }
}
```

## License

This project is licensed under the Apache-2.0 License.
