import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), "battery-data.json");
  const TELEMETRY_FILE = path.join(process.cwd(), "telemetry.json");
  const APPLIANCES_FILE = path.join(process.cwd(), "appliances.json");

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/appliances", (req, res) => {
    if (fs.existsSync(APPLIANCES_FILE)) {
      const data = fs.readFileSync(APPLIANCES_FILE, "utf-8");
      res.json(JSON.parse(data));
    } else {
      const defaultAppliances = [
        { id: 'l1', name: 'Living Room Light', type: 'light', power: 40, isOn: false, x: 25, y: 25 },
        { id: 'tv1', name: 'Smart TV', type: 'tv', power: 150, isOn: false, x: 50, y: 40 },
        { id: 'ac1', name: 'Air Conditioner', type: 'air_conditioner', power: 1500, isOn: false, x: 50, y: 20 },
        { id: 'ref1', name: 'Refrigerator', type: 'refrigerator', power: 200, isOn: true, x: 85, y: 75 },
        { id: 'l2', name: 'Kitchen Light', type: 'light', power: 40, isOn: false, x: 75, y: 75 },
        { id: 'wm1', name: 'Washing Machine', type: 'washing_machine', power: 500, isOn: false, x: 15, y: 85 },
        { id: 'f1', name: 'Ceiling Fan', type: 'fan', power: 75, isOn: false, x: 25, y: 75 },
        { id: 'f3', name: 'Fan 3', type: 'fan', power: 75, isOn: false, x: 75, y: 25 },
        { id: 'l8', name: 'Light 8', type: 'light', power: 40, isOn: false, x: 10, y: 10 },
        { id: 'l9', name: 'Light 9', type: 'light', power: 40, isOn: false, x: 90, y: 90 },
      ];
      res.json(defaultAppliances);
    }
  });

  app.post("/api/appliances", (req, res) => {
    try {
      const data = req.body;
      fs.writeFileSync(APPLIANCES_FILE, JSON.stringify(data, null, 2));
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error" });
    }
  });

  app.get("/api/telemetry", (req, res) => {
    if (fs.existsSync(TELEMETRY_FILE)) {
      const data = fs.readFileSync(TELEMETRY_FILE, "utf-8");
      res.json(JSON.parse(data));
    } else {
      res.json({
        solarVoltage: 0,
        packVoltage: 0,
        loadPowerWatts: 0,
        loadPowerPercent: 0,
        soc: 0,
        temp: 0,
        current: 0,
        anomalyDetected: false,
        anomalyDetails: {
          message: "No data",
          location: "N/A"
        }
      });
    }
  });

  app.post("/api/telemetry", (req, res) => {
    try {
      const data = req.body;
      fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(data, null, 2));
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error" });
    }
  });

  app.get("/api/battery-pack", (req, res) => {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } else {
      // Return default 10x10 grid if no data exists
      const defaultData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Cell ${i + 1}`,
        voltage: 3.7,
        current: 0.5,
        temperature: 25,
        soc: 100,
        soh: 100,
      }));
      res.json(defaultData);
    }
  });

  app.post("/api/battery-pack", (req, res) => {
    try {
      const data = req.body;
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json({ status: "success", message: "Battery data saved successfully" });
    } catch (error) {
      res.status(500).json({ status: "error", message: "Failed to save data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
