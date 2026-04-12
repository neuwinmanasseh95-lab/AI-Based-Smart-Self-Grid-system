import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";

const app = express();
const DATA_FILE = path.join("/tmp", "battery-data.json");
const TELEMETRY_FILE = path.join("/tmp", "telemetry.json");
const APPLIANCES_FILE = path.join("/tmp", "appliances.json");

app.use(cors());
app.use(express.json());

// Helper to get data with fallback to defaults
const getInitialData = (file: string, defaults: any) => {
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch (e) {
      return defaults;
    }
  }
  return defaults;
};

// API Routes
app.get("/api/appliances", (req, res) => {
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
  res.json(getInitialData(APPLIANCES_FILE, defaultAppliances));
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
  const defaultTelemetry = {
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
  };
  res.json(getInitialData(TELEMETRY_FILE, defaultTelemetry));
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
  const defaultData = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    name: `Cell ${i + 1}`,
    voltage: 3.7,
    current: 0.5,
    temperature: 25,
    soc: 100,
    soh: 100,
  }));
  res.json(getInitialData(DATA_FILE, defaultData));
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

export default app;
