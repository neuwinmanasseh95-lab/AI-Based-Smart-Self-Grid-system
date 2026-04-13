import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { Battery, Thermometer, Zap, Activity, Save, Download, RefreshCcw, Settings2, X, Brain, AlertTriangle, CheckCircle2, Sun, Gauge, Power, ArrowRightLeft, ExternalLink, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float, Html } from "@react-three/drei";
import * as THREE from "three";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

import { RemoteDashboard } from './components/RemoteDashboard';
import { SmartHome, SmartHomeAppliance } from './components/SmartHome';
import { PowerSankey } from './components/PowerSankey';

interface BatteryCell {
  id: number;
  name: string;
  voltage: number;
  current: number;
  temperature: number;
  soh: number; // State of Health (%)
  soc: number; // State of Charge (%)
}

interface AIAnalysis {
  cells: BatteryCell[];
  alert: string;
  status: 'normal' | 'warning' | 'critical';
  recommendation: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const Battery3D = ({ 
  cell, 
  isSelected, 
  onSelect,
  isCharging,
  isAiMonitoring
}: { 
  cell: BatteryCell; 
  isSelected: boolean; 
  onSelect: (cell: BatteryCell) => void;
  isCharging: boolean;
  isAiMonitoring: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const aiGlowRef = useRef<THREE.Mesh>(null);
  
  // Lifting animation logic: ONLY on selection as requested
  const targetY = isSelected ? 1.5 : 0;
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
    }
    if (glowRef.current && isCharging) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
      glowRef.current.scale.set(scale, scale, scale);
      glowRef.current.position.y = meshRef.current?.position.y || 0;
    }
    if (aiGlowRef.current && isAiMonitoring) {
      const opacity = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      if (aiGlowRef.current.material instanceof THREE.MeshStandardMaterial) {
        aiGlowRef.current.material.opacity = opacity;
      }
      aiGlowRef.current.position.y = meshRef.current?.position.y || 0;
    }
    if (pulseRef.current && isSelected) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.2;
      pulseRef.current.scale.set(s, s, 1);
      if (pulseRef.current.material instanceof THREE.MeshStandardMaterial) {
        pulseRef.current.material.opacity = 0.6 - (Math.sin(state.clock.elapsedTime * 6) + 1) * 0.2;
      }
    }
  });

  // Blue color as per image
  const color = "#1e40af"; // Deep blue

  return (
    <group 
      position={[
        (cell.id % 10) * 0.46 - 2.07, 
        0, 
        Math.floor(cell.id / 10) * 0.46 - 2.07
      ]}
    >
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(cell);
        }}
        castShadow
      >
        {/* Taller, blue cylinder as per image */}
        <cylinderGeometry args={[0.2, 0.2, 1.0, 32]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.6}
          roughness={0.3}
        />

        {/* Charging Glow */}
        {isCharging && (
          <mesh ref={glowRef}>
            <cylinderGeometry args={[0.22, 0.22, 1.02, 32]} />
            <meshStandardMaterial 
              color="#fbbf24" 
              transparent 
              opacity={0.3}
              emissive="#fbbf24"
              emissiveIntensity={0.5}
            />
          </mesh>
        )}

        {/* AI Monitoring Scan Glow */}
        {isAiMonitoring && (
          <mesh ref={aiGlowRef}>
            <cylinderGeometry args={[0.23, 0.23, 1.05, 32]} />
            <meshStandardMaterial 
              color="#a855f7" 
              transparent 
              opacity={0.1}
              emissive="#a855f7"
              emissiveIntensity={0.3}
            />
          </mesh>
        )}
        
        {/* Parameter HUD - Only on selection */}
        <Html distanceFactor={8} position={[0, 1.2, 0]} center>
          <AnimatePresence>
            {isSelected && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-zinc-950/95 border border-blue-500/40 p-3 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none min-w-[100px]"
              >
                <div className="text-blue-400 text-[10px] font-black mb-2 tracking-tight">{cell.name}</div>
                <div className="h-px bg-zinc-800 mb-2 w-full" />
                <div className="flex flex-col gap-1.5 font-mono text-[9px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">VOLT:</span>
                    <span className="text-white font-bold">{cell.voltage.toFixed(2)}V</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">CURR:</span>
                    <span className="text-white font-bold">{cell.current.toFixed(1)}A</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">TEMP:</span>
                    <span className={`${cell.temperature > 50 ? 'text-red-400' : 'text-white'} font-bold`}>
                      {cell.temperature.toFixed(2)}°C
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">SOC:</span>
                    <span className="text-white font-bold">{cell.soc}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">SOH:</span>
                    <span className="text-white font-bold">{cell.soh}%</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Html>

        {/* Selection Pulse Ring at Base */}
        {isSelected && (
          <mesh ref={pulseRef} position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.25, 0.35, 32]} />
            <meshStandardMaterial 
              color="#3b82f6" 
              transparent 
              opacity={0.5} 
              emissive="#3b82f6" 
              emissiveIntensity={1}
            />
          </mesh>
        )}

        {/* Realistic Battery Details */}
        {/* Top Cap */}
        <mesh position={[0, 0.51, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={1} roughness={0.1} />
        </mesh>

        {/* Busbars (Copper Connectors) as per image - Zig-zag pattern */}
        {cell.id % 10 < 9 && (
          <mesh position={[0.23, 0.53, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.46, 0.02, 0.08]} />
            <meshStandardMaterial color="#b45309" metalness={0.8} roughness={0.2} />
          </mesh>
        )}
      </mesh>
    </group>
  );
};

const BatteryStack3D = ({ 
  cells, 
  selectedCell, 
  onSelect,
  timeOfDay,
  isAiMonitoring
}: { 
  cells: BatteryCell[]; 
  selectedCell: BatteryCell | null; 
  onSelect: (cell: BatteryCell) => void;
  timeOfDay: string;
  isAiMonitoring: boolean;
}) => {
  const envPreset = timeOfDay === 'night' ? 'night' : timeOfDay === 'noon' ? 'city' : 'sunset';
  
  return (
    <div className="w-full h-[600px] bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 relative shadow-inner cursor-default">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-zinc-800">
          3D Precision Stack • Click to Inspect
        </div>
        {isAiMonitoring && (
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-purple-400 bg-purple-500/10 px-2 py-1 rounded backdrop-blur-sm border border-purple-500/30 animate-pulse">
            <Brain className="w-3 h-3" />
            AI Analysis Active
          </div>
        )}
      </div>
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={35} />
        <OrbitControls 
          enablePan={false} 
          minPolarAngle={Math.PI / 6} 
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={20}
          makeDefault
        />
        
        <ambientLight intensity={0.8} />
        <spotLight position={[15, 20, 15]} angle={0.2} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, 10, -10]} intensity={1} color="#ffffff" />
        
        <group position={[0, -0.2, 0]}>
          {cells.map((cell) => (
            <Battery3D 
              key={cell.id} 
              cell={cell} 
              isSelected={selectedCell?.id === cell.id}
              onSelect={onSelect}
              isCharging={timeOfDay !== 'night'}
              isAiMonitoring={isAiMonitoring}
            />
          ))}
          
          {/* Base Plate with Grid */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.52, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#09090b" metalness={0.8} roughness={0.4} />
          </mesh>
        </group>
        
        <ContactShadows position={[0, -0.55, 0]} opacity={0.4} scale={20} blur={2.5} far={5} />
        <Environment preset={envPreset} />
      </Canvas>
    </div>
  );
};

export default function App() {
  const [cells, setCells] = useState<BatteryCell[]>([]);
  const [aiCells, setAiCells] = useState<BatteryCell[]>([]);
  const [selectedCell, setSelectedCell] = useState<BatteryCell | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState<string>("");
  const [isLiveSync, setIsLiveSync] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<{ time: string; success: boolean } | null>(null);
  const [show3D, setShow3D] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'dawn' | 'noon' | 'evening' | 'night'>('noon');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeView, setActiveView] = useState<'grid' | 'distribution' | 'smarthome'>('grid');
  const [globalTargetTemp, setGlobalTargetTemp] = useState(25);
  const [capacityHistory, setCapacityHistory] = useState<{ time: string; soc: number }[]>([]);
  const [showRuntimeGraph, setShowRuntimeGraph] = useState(false);

  // Runtime Estimation
  const calculateRuntime = () => {
    const totalLoadPower = smartHomeAppliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0);
    
    const solarChargingPower = solarVoltage > 0 ? ((solarVoltage / 300) * 500) : 0;
    
    const netPower = totalLoadPower - solarChargingPower;
    
    if (netPower <= 0) return "Charging";
    
    // Assume 5Ah capacity per cell
    const totalEnergyWh = cells.reduce((acc, cell) => acc + (5 * cell.voltage * (cell.soc / 100)), 0);
    const hours = totalEnergyWh / netPower;
    
    if (hours > 24) return "> 24h";
    const mins = Math.round((hours % 1) * 60);
    return `${Math.floor(hours)}h ${mins}m`;
  };

  const getRuntimeProjectionData = () => {
    const totalLoadPower = smartHomeAppliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0);

    const solarChargingPower = solarVoltage > 0 ? ((solarVoltage / 300) * 500) : 0;
    const netPower = totalLoadPower - solarChargingPower;
    
    const currentSoc = cells.reduce((acc, c) => acc + c.soc, 0) / cells.length;
    const totalEnergyWh = cells.reduce((acc, cell) => acc + (5 * cell.voltage * (cell.soc / 100)), 0);
    
    const data = [];
    for (let i = 0; i <= 12; i++) {
      const projectedEnergy = Math.max(0, totalEnergyWh - (netPower * i));
      const projectedSoc = (projectedEnergy / (cells.length * 5 * 3.7)) * 100;
      data.push({
        hour: `${i}h`,
        soc: Number(projectedSoc.toFixed(1))
      });
      if (projectedSoc <= 0) break;
    }
    return data;
  };

  // Auto-fullscreen on mount (if possible/requested)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable full-screen mode: ${e.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Solar voltage logic based on time of day
  useEffect(() => {
    const solarMap = {
      dawn: 120,
      noon: 300,
      evening: 80,
      night: 0
    };
    setSolarVoltage(solarMap[timeOfDay]);
  }, [timeOfDay]);
  
  // Power & Load State
  const [solarVoltage, setSolarVoltage] = useState(300);
  const [powerSource, setPowerSource] = useState<'battery' | 'solar'>('battery');

  const [smartHomeAppliances, setSmartHomeAppliances] = useState<SmartHomeAppliance[]>([
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
  ]);

  const toggleAppliance = async (id: string) => {
    const updated = smartHomeAppliances.map(app => 
      app.id === id ? { ...app, isOn: !app.isOn } : app
    );
    setSmartHomeAppliances(updated);
    
    // Sync to server
    try {
      await fetch("/api/appliances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.error("Failed to sync appliances:", e);
    }
  };

  // Poll for appliance updates from remote
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/appliances");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Oops, we haven't got JSON!");
        }
        const data = await res.json();
        setSmartHomeAppliances(data);
      } catch (e) {
        console.error("Failed to poll appliances:", e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // AI State
  const [isAiMonitoring, setIsAiMonitoring] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const lastAiAnalysisTime = useRef<number>(0);
  const prevStatusRef = useRef<'normal' | 'warning' | 'critical' | null>(null);

  // Sound Alert Effect
  useEffect(() => {
    if (isAiMonitoring && aiAnalysis && !isMuted) {
      if (aiAnalysis.status !== prevStatusRef.current) {
        if (aiAnalysis.status === 'critical') {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
          audio.volume = 0.4;
          audio.play().catch(() => {});
        } else if (aiAnalysis.status === 'warning') {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        }
        prevStatusRef.current = aiAnalysis.status;
      }
    } else if (!isAiMonitoring || !aiAnalysis) {
      prevStatusRef.current = null;
    }
  }, [aiAnalysis, isAiMonitoring, isMuted]);

  useEffect(() => {
    fetchCells();
  }, []);

  // Simulation Loop (Charge / Discharge)
  useEffect(() => {
    const interval = setInterval(() => {
      const totalBatteryVoltage = cells.reduce((acc, cell) => acc + cell.voltage, 0);
      const isBatteryFull = cells.every(c => c.voltage >= 4.19);
      const isBatteryLow = totalBatteryVoltage < 240;
      
      const smartHomePower = smartHomeAppliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0);
      const totalLoadCurrent = smartHomePower / (totalBatteryVoltage || 296);
      
      // Solar Charging Current (Simulated)
      const solarPower = solarVoltage > 0 ? ((solarVoltage / 300) * 500) : 0;
      const solarChargeCurrent = solarPower / (totalBatteryVoltage || 370); // Max 500W charge
      
      // Advanced Switching Logic
      let nextPowerSource: 'battery' | 'solar' = 'battery';

      // EMERGENCY OVERRIDE: If AI detects anomaly, force solar and shutdown battery
      const isEmergency = aiAnalysis?.status === 'critical' || aiAnalysis?.status === 'warning';
      
      if (isEmergency) {
        nextPowerSource = 'solar';
        
        // Load Shedding: If solar is not enough, turn off non-essential appliances
        const currentLoad = smartHomeAppliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0);
        if (solarPower < currentLoad) {
          // Priority list for shutdown: AC -> Fans -> Lights
          const priorityOrder = ['air_conditioner', 'fan', 'tv', 'washing_machine', 'light'];
          let loadToShed = currentLoad - solarPower;
          let updatedAppliances = [...smartHomeAppliances];
          let changed = false;

          for (const type of priorityOrder) {
            for (let i = 0; i < updatedAppliances.length; i++) {
              if (updatedAppliances[i].isOn && updatedAppliances[i].type === type) {
                updatedAppliances[i] = { ...updatedAppliances[i], isOn: false };
                loadToShed -= updatedAppliances[i].power;
                changed = true;
                if (loadToShed <= 0) break;
              }
            }
            if (loadToShed <= 0) break;
          }

          if (changed) {
            setSmartHomeAppliances(updatedAppliances);
            // Sync to server
            fetch("/api/appliances", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedAppliances),
            }).catch(e => console.error("Emergency sync failed:", e));
          }
        }
      } else {
        if (solarVoltage >= 300) {
          nextPowerSource = 'solar';
        } else if (isBatteryLow && solarVoltage > 240) {
          nextPowerSource = 'solar';
        } else if (solarVoltage < 240) {
          nextPowerSource = 'battery';
        } else if (isBatteryFull) {
          nextPowerSource = 'battery';
        } else if (solarVoltage > totalBatteryVoltage + 5) {
          nextPowerSource = 'solar';
        }
      }

      setPowerSource(nextPowerSource);

      setCells(prevCells => {
        const newCells = prevCells.map(cell => {
          let newVoltage = cell.voltage;
          let newTemp = cell.temperature;
          let newSoc = cell.soc;
          let newSoh = cell.soh;

          // Simultaneous Charge/Discharge Logic
          const chargeRate = !isBatteryFull ? (solarChargeCurrent / 100) : 0;
          const dischargeRate = (nextPowerSource === 'battery') ? (totalLoadCurrent / 100) : 0;
          const netRate = chargeRate - dischargeRate;

          // Update SOC and Voltage based on net rate
          if (netRate > 0) {
            // Net Charging
            newVoltage = Math.min(4.2, cell.voltage + (netRate * 0.01));
            newSoc = Math.min(100, cell.soc + (netRate * 0.5));
          } else if (netRate < 0) {
            // Net Discharging
            newVoltage = Math.max(2.5, cell.voltage + (netRate * 0.01));
            newSoc = Math.max(0, cell.soc + (netRate * 0.5));
          }

          // Temperature Simulation with Global Control
          // Natural cooling/heating towards target
          const tempDiff = globalTargetTemp - cell.temperature;
          newTemp += tempDiff * 0.05; // Approach target temp

          // Load heating
          if (dischargeRate > 0) {
            newTemp += (dischargeRate * 5);
          }
          
          // Solar charging heating (slight)
          if (chargeRate > 0) {
            newTemp += (chargeRate * 1);
          }

          // Degrade SOH slightly during high temp/load
          if (newTemp > 60 || totalLoadCurrent > 3) {
            newSoh = Math.max(0, cell.soh - 0.0001);
          }

          return { 
            ...cell, 
            voltage: Number(newVoltage.toFixed(3)), 
            temperature: Number(newTemp.toFixed(2)),
            soc: Number(newSoc.toFixed(1)),
            soh: Number(newSoh.toFixed(2))
          };
        });

        // Update Capacity History
        const avgSoc = newCells.reduce((acc, c) => acc + c.soc, 0) / newCells.length;
        setCapacityHistory(prev => {
          const newHistory = [...prev, { time: new Date().toLocaleTimeString(), soc: Number(avgSoc.toFixed(1)) }];
          return newHistory.slice(-20); // Keep last 20 points
        });

        return newCells;
      });

      // Update Motor Stats - REMOVED
    }, 1000);
    return () => clearInterval(interval);
  }, [cells, solarVoltage, powerSource, globalTargetTemp, smartHomeAppliances]);

  // Live Telemetry Interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLiveSync && remoteUrl) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(remoteUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              pack_data: cells,
              metadata: {
                total_voltage: cells.reduce((acc, cell) => acc + cell.voltage, 0).toFixed(2),
                avg_temp: (cells.reduce((acc, cell) => acc + cell.temperature, 0) / cells.length || 0).toFixed(1),
                power_source: powerSource,
                solar_voltage: solarVoltage,
                smart_home_load: smartHomeAppliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0)
              }
            }),
          });
          setLastSyncStatus({ time: new Date().toLocaleTimeString(), success: response.ok });
        } catch (error) {
          setLastSyncStatus({ time: new Date().toLocaleTimeString(), success: false });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLiveSync, remoteUrl, cells, powerSource, solarVoltage, smartHomeAppliances]);

  // Internal Telemetry Sync for Remote Dashboard API
  useEffect(() => {
    const interval = setInterval(async () => {
      const totalLoadPower = smartHomeAppliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0);
      const avgSoc = cells.reduce((acc, c) => acc + c.soc, 0) / cells.length;
      const avgTemp = cells.reduce((acc, c) => acc + c.temperature, 0) / cells.length;
      const totalPackVoltage = cells.reduce((acc, c) => acc + c.voltage, 0);
      const totalCurrent = totalLoadPower / (totalPackVoltage || 296);

      const telemetryData = {
        solarVoltage: solarVoltage,
        packVoltage: Number(totalPackVoltage.toFixed(1)),
        loadPowerWatts: Number(totalLoadPower.toFixed(1)),
        loadPowerPercent: Number(((totalLoadPower / 5000) * 100).toFixed(1)),
        soc: Number(avgSoc.toFixed(1)),
        temp: Number(avgTemp.toFixed(1)),
        current: Number(totalCurrent.toFixed(2)),
        anomalyDetected: aiAnalysis?.status === 'critical' || aiAnalysis?.status === 'warning',
        anomalyDetails: {
          message: aiAnalysis?.alert || "System Normal",
          location: aiAnalysis?.status === 'critical' ? "Cell Stack Anomaly" : "All Systems Nominal"
        }
      };

      try {
        await fetch("/api/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(telemetryData),
        });
      } catch (error) {
        // Silent fail for internal sync
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cells, smartHomeAppliances, solarVoltage, aiAnalysis]);

  // AI Monitoring Interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAiMonitoring) {
      interval = setInterval(async () => {
        const now = Date.now();
        // Increased interval to 60 seconds to avoid rate limits
        if (now - lastAiAnalysisTime.current > 60000 && !isAiAnalyzing) {
          runAiAnalysis();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAiMonitoring, cells, isAiAnalyzing]);

  const runAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    lastAiAnalysisTime.current = Date.now();
    
    // Pre-process data to find outliers (single cell variances)
    const avgVolt = cells.reduce((acc, c) => acc + c.voltage, 0) / cells.length;
    const avgTemp = cells.reduce((acc, c) => acc + c.temperature, 0) / cells.length;
    
    const outliers = cells.filter(c => 
      Math.abs(c.voltage - avgVolt) > 0.1 || 
      Math.abs(c.temperature - avgTemp) > 5
    ).slice(0, 10); // Limit to top 10 outliers for prompt length

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this 10x10 battery pack data (100 cells). 
        CRITICAL: You must alert if ANY single cell shows variance from the pack average (e.g., voltage deviation > 0.1V or temperature deviation > 5°C).
        Focus on Battery Health (SOH), SOC balance, and thermal stability.
        Identify anomalies, provide status (normal, warning, critical), a detailed health report message, and a technical recommendation.
        
        System Context:
        Power Source: ${powerSource}, Solar: ${solarVoltage}V, Smart Home Load: ${smartHomeAppliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0)}W.
        
        Representative Sample: ${JSON.stringify(cells.slice(0, 15))}
        Detected Outliers (Single Cell Variances): ${JSON.stringify(outliers)}
        (If outliers are present, prioritize reporting them immediately)`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cells: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.NUMBER },
                    name: { type: Type.STRING },
                    voltage: { type: Type.NUMBER },
                    current: { type: Type.NUMBER },
                    temperature: { type: Type.NUMBER }
                  },
                  required: ["id", "name", "voltage", "current", "temperature"]
                }
              },
              alert: { type: Type.STRING },
              status: { type: Type.STRING, enum: ["normal", "warning", "critical"] },
              recommendation: { type: Type.STRING }
            },
            required: ["cells", "alert", "status", "recommendation"]
          }
        }
      });

      const result = JSON.parse(response.text) as AIAnalysis;
      setAiAnalysis(result);
      setAiCells(result.cells);
    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      // Handle rate limiting (429) gracefully
      if (error?.message?.includes('429') || error?.status === 429) {
        setAiAnalysis({
          cells: [],
          alert: "AI Rate Limit Reached. Retrying in 1 minute...",
          status: 'warning',
          recommendation: "The system is currently experiencing high demand. Automated monitoring will resume shortly."
        });
      } else {
        setAiAnalysis({
          cells: [],
          alert: "AI Monitoring Service Unavailable",
          status: 'warning',
          recommendation: "Please check your network connection or try again later."
        });
      }
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const fetchCells = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/battery-pack");
      const data = await response.json();
      setCells(data);
    } catch (error) {
      console.error("Failed to fetch battery data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveCells = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/battery-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cells),
      });
      if (response.ok) {
        alert("Battery pack configuration saved to cloud!");
      }
    } catch (error) {
      console.error("Failed to save battery data:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateCell = (id: number, updates: Partial<BatteryCell>) => {
    const newCells = cells.map((cell) =>
      cell.id === id ? { ...cell, ...updates } : cell
    );
    setCells(newCells);
    if (selectedCell?.id === id) {
      setSelectedCell({ ...selectedCell, ...updates });
    }
  };

  const downloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cells, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "battery_pack_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const getStatusColor = (cell: BatteryCell) => {
    if (cell.temperature > 60 || cell.voltage > 4.2 || cell.voltage < 3.0) {
      return "bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]";
    }
    if (cell.temperature > 45 || cell.voltage > 4.0) {
      return "bg-yellow-500/20 border-yellow-500 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]";
    }
    return "bg-green-500/20 border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]";
  };

  const totalVoltage = cells.reduce((acc, cell) => acc + cell.voltage, 0).toFixed(2);
  const avgTemp = (cells.reduce((acc, cell) => acc + cell.temperature, 0) / cells.length || 0).toFixed(1);

  return (
    <Router>
      <Routes>
        <Route path="/remote" element={<RemoteDashboard onBack={() => window.location.href = '/'} />} />
        <Route path="/" element={<MainApp 
          cells={cells}
          setCells={setCells}
          loading={loading}
          saving={saving}
          isAiMonitoring={isAiMonitoring}
          setIsAiMonitoring={setIsAiMonitoring}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          aiAnalysis={aiAnalysis}
          setAiAnalysis={setAiAnalysis}
          aiCells={aiCells}
          setAiCells={setAiCells}
          isAiAnalyzing={isAiAnalyzing}
          activeView={activeView}
          setActiveView={setActiveView}
          powerSource={powerSource}
          setPowerSource={setPowerSource}
          solarVoltage={solarVoltage}
          setSolarVoltage={setSolarVoltage}
          smartHomeAppliances={smartHomeAppliances}
          toggleAppliance={toggleAppliance}
          calculateRuntime={calculateRuntime}
          totalVoltage={totalVoltage}
          avgTemp={avgTemp}
          getStatusColor={getStatusColor}
          capacityHistory={capacityHistory}
          isLiveSync={isLiveSync}
          setIsLiveSync={setIsLiveSync}
          remoteUrl={remoteUrl}
          setRemoteUrl={setRemoteUrl}
          lastSyncStatus={lastSyncStatus}
          globalTargetTemp={globalTargetTemp}
          setGlobalTargetTemp={setGlobalTargetTemp}
          show3D={show3D}
          setShow3D={setShow3D}
          timeOfDay={timeOfDay}
          setTimeOfDay={setTimeOfDay}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          selectedCell={selectedCell}
          setSelectedCell={setSelectedCell}
          updateCell={updateCell}
          saveCells={saveCells}
          showRuntimeGraph={showRuntimeGraph}
          setShowRuntimeGraph={setShowRuntimeGraph}
          getRuntimeProjectionData={getRuntimeProjectionData}
        />} />
      </Routes>
    </Router>
  );
};

const MainApp = ({ 
  cells, setCells, loading, saving, isAiMonitoring, setIsAiMonitoring, 
  isMuted, setIsMuted,
  aiAnalysis, setAiAnalysis, aiCells, setAiCells, isAiAnalyzing, 
  activeView, setActiveView, powerSource, setPowerSource, 
  solarVoltage, setSolarVoltage, smartHomeAppliances, toggleAppliance, 
  calculateRuntime, totalVoltage, avgTemp, getStatusColor, capacityHistory,
  isLiveSync, setIsLiveSync, remoteUrl, setRemoteUrl, lastSyncStatus,
  globalTargetTemp, setGlobalTargetTemp, show3D, setShow3D, timeOfDay,
  setTimeOfDay, isFullscreen, toggleFullscreen, selectedCell, 
  setSelectedCell, updateCell, saveCells, showRuntimeGraph, 
  setShowRuntimeGraph, getRuntimeProjectionData
}: any) => {
  const navigate = useNavigate();
  const totalLoadPower = smartHomeAppliances.reduce((acc, app: any) => acc + (app.isOn ? app.power : 0), 0);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-emerald-500 font-mono text-sm tracking-widest uppercase">Initializing Core Systems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans p-4 md:p-6">
      <header className="max-w-[1600px] mx-auto mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${powerSource === 'solar' ? 'bg-yellow-500' : 'bg-emerald-500'} animate-pulse`} />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
              Power Source: <span className={powerSource === 'solar' ? 'text-yellow-500' : 'text-emerald-500'}>{powerSource.toUpperCase()}</span>
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-white">
            VIRTUAL <span className="text-emerald-500">BATTERY</span> PACK <span className="text-zinc-700 text-2xl">10x10</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 rounded-lg transition-all text-sm font-medium"
          >
            <Power className="w-4 h-4" />
            {isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
          </button>
          <button
            onClick={() => setShow3D(!show3D)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium border ${show3D ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
          >
            <Settings2 className={`w-4 h-4 ${show3D ? 'rotate-90' : ''} transition-transform`} />
            {show3D ? 'VIEW 2D GRID' : 'VIEW 3D STACK'}
          </button>
          <button
            onClick={() => setIsAiMonitoring(!isAiMonitoring)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium border ${isAiMonitoring ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
          >
            <Brain className={`w-4 h-4 ${isAiMonitoring ? 'animate-pulse' : ''}`} />
            {isAiMonitoring ? 'AI MONITORING ON' : 'START AI MONITOR'}
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all border ${isMuted ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
            title={isMuted ? "Unmute Alerts" : "Mute Alerts"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1 gap-2">
            <Activity className={`w-4 h-4 ${isLiveSync ? 'text-emerald-500 animate-pulse' : 'text-zinc-600'}`} />
            <input 
              type="text" 
              placeholder="Remote API URL..." 
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-mono w-40 text-zinc-300"
            />
            <button 
              onClick={() => setIsLiveSync(!isLiveSync)}
              className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${isLiveSync ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              {isLiveSync ? 'LIVE ON' : 'LIVE OFF'}
            </button>
          </div>
          <button
            onClick={saveCells}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-all text-sm font-medium"
          >
            {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            SAVE
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Column: Power & Loads */}
        <div className="xl:col-span-1 space-y-6">
          {/* Solar Panel Control */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Sun className={`w-5 h-5 ${timeOfDay === 'noon' ? 'text-yellow-500' : timeOfDay === 'dawn' ? 'text-orange-400' : 'text-zinc-600'}`} />
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Solar Cycle</span>
              </div>
              <div className={`text-[10px] font-mono px-2 py-0.5 rounded ${powerSource === 'solar' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-zinc-800 text-zinc-600'}`}>
                {solarVoltage}V
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              {(['dawn', 'noon', 'evening', 'night'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeOfDay(t)}
                  className={`text-[8px] font-mono uppercase py-2 rounded border transition-all ${
                    timeOfDay === t 
                      ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]' 
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0"
              max="400"
              value={solarVoltage}
              onChange={(e) => setSolarVoltage(parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
          </div>

          {/* Smart Home Load Summary */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-orange-500" />
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Active Home Loads</span>
              </div>
              <button 
                onClick={() => setActiveView('smarthome')}
                className="text-[10px] font-mono text-emerald-500 hover:text-emerald-400 uppercase tracking-widest"
              >
                Manage
              </button>
            </div>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {smartHomeAppliances.filter(app => app.isOn).map(app => (
                <div key={app.id} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase">{app.name}</span>
                  </div>
                  <span className="text-xs font-mono text-orange-400">{app.power}W</span>
                </div>
              ))}
              {smartHomeAppliances.filter(app => app.isOn).length === 0 && (
                <div className="text-center py-8 text-zinc-600 text-[10px] uppercase font-mono border border-dashed border-zinc-800 rounded-xl">
                  All appliances offline
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-between items-end">
              <div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Total Load</div>
                <div className="text-2xl font-black text-white">
                  {smartHomeAppliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0)}W
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Runtime</div>
                <div className="text-lg font-bold text-emerald-500">{calculateRuntime()}</div>
              </div>
            </div>
          </div>

          {/* System Stats */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Total Pack</div>
              <div className="text-xl font-bold">{totalVoltage}V</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Avg Temp</div>
              <div className="text-xl font-bold">{avgTemp}°C</div>
            </div>
            <div className="col-span-2 pt-2 border-t border-zinc-800/50">
              <div className="flex justify-between items-center">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Est. Runtime</div>
                <button 
                  onClick={() => setShowRuntimeGraph(!showRuntimeGraph)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${showRuntimeGraph ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700'}`}
                >
                  {showRuntimeGraph ? 'CLOSE GRAPH' : 'VIEW GRAPH'}
                </button>
              </div>
              <div className={`text-sm font-bold mt-1 ${calculateRuntime() === 'Charging' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                {calculateRuntime()}
              </div>
            </div>
          </div>

          {showRuntimeGraph && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl overflow-hidden"
            >
              <div className="text-[10px] font-mono text-zinc-500 uppercase mb-4">Runtime Projection (SOC vs Time)</div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getRuntimeProjectionData()}>
                    <defs>
                      <linearGradient id="colorRuntime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="hour" stroke="#52525b" fontSize={10} />
                    <YAxis domain={[0, 100]} stroke="#52525b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '10px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Area type="monotone" dataKey="soc" stroke="#10b981" fillOpacity={1} fill="url(#colorRuntime)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Global Temperature Control */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Thermometer className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Global Temp Control</span>
              </div>
              <div className="text-[10px] font-mono text-blue-400">{globalTargetTemp}°C</div>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={globalTargetTemp}
              onChange={(e) => setGlobalTargetTemp(parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between mt-2 text-[8px] font-mono text-zinc-600 uppercase">
              <span>Cooling</span>
              <span>Heating</span>
            </div>
          </div>

          {/* Cell Editor */}
          <AnimatePresence mode="wait">
            {selectedCell && (
              <motion.div
                key={selectedCell.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                    <Settings2 className="w-4 h-4 text-emerald-500" />
                    {selectedCell.name}
                  </h2>
                  <button onClick={() => setSelectedCell(null)} className="p-1 hover:bg-zinc-800 rounded-full transition-colors">
                    <X className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">SOC (%)</label>
                      <input
                        type="number"
                        value={selectedCell.soc}
                        onChange={(e) => updateCell(selectedCell.id, { soc: parseInt(e.target.value) })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">SOH (%)</label>
                      <input
                        type="number"
                        value={selectedCell.soh}
                        onChange={(e) => updateCell(selectedCell.id, { soh: parseInt(e.target.value) })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Voltage (V)</label>
                    <input
                      type="range"
                      min="2.5"
                      max="4.5"
                      step="0.1"
                      value={selectedCell.voltage}
                      onChange={(e) => updateCell(selectedCell.id, { voltage: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Temp (°C)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={selectedCell.temperature}
                      onChange={(e) => updateCell(selectedCell.id, { temperature: parseInt(e.target.value) })}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Middle Column: 10x10 Grid or 3D Stack or Detailed Distribution */}
        <div className="xl:col-span-2">
          <div className="flex gap-2 mb-4 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 w-fit">
            <button 
              onClick={() => setActiveView('grid')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${activeView === 'grid' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              System Grid
            </button>
            <button 
              onClick={() => setActiveView('distribution')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${activeView === 'distribution' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Detailed Distribution
            </button>
            <button 
              onClick={() => setActiveView('smarthome')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${activeView === 'smarthome' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Smart Home Simulation
            </button>
          </div>

          {activeView === 'grid' ? (
            show3D ? (
              <BatteryStack3D 
                cells={cells} 
                selectedCell={selectedCell} 
                onSelect={setSelectedCell} 
                timeOfDay={timeOfDay}
                isAiMonitoring={isAiMonitoring}
              />
            ) : (
              <div className="bg-zinc-900/20 border border-zinc-800/50 p-4 rounded-3xl">
                <div className="grid grid-cols-10 gap-1.5 md:gap-2">
                  {cells.map((cell) => (
                    <motion.button
                      key={cell.id}
                      whileHover={{ scale: 1.1, zIndex: 10 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedCell(cell)}
                      className={`relative flex flex-col items-center justify-center p-1 rounded-full border transition-all aspect-square ${getStatusColor(cell)} ${selectedCell?.id === cell.id ? 'ring-1 ring-white ring-offset-2 ring-offset-[#0a0a0a]' : ''} ${timeOfDay !== 'night' ? 'shadow-[0_0_15px_rgba(251,191,36,0.2)]' : ''}`}
                    >
                      {timeOfDay !== 'night' && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full bg-yellow-400/20"
                        />
                      )}
                      <Battery className={`w-3 h-3 md:w-4 md:h-4 ${timeOfDay !== 'night' ? 'text-yellow-500' : ''}`} />
                      <div className="text-[6px] md:text-[8px] font-bold mt-0.5">{cell.voltage.toFixed(1)}V</div>
                      <div className="text-[5px] md:text-[6px] opacity-50">{cell.soc}%</div>
                      
                      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          strokeDasharray="100"
                          strokeDashoffset={100 - Math.min(100, (cell.temperature / 100) * 100)}
                          className="opacity-10 transition-all duration-500"
                        />
                      </svg>
                    </motion.button>
                  ))}
                </div>
              </div>
            )
          ) : activeView === 'distribution' ? (
            <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl min-h-[600px] space-y-8">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">DETAILED POWER DISTRIBUTION</h2>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Real-time Load Analysis & Efficiency</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-emerald-500">
                    {smartHomeAppliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0).toFixed(1)}W
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Total System Load</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Source Analysis */}
                <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-500" />
                    Source Efficiency
                  </h3>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Active Source</div>
                        <div className={`text-lg font-bold ${powerSource === 'solar' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                          {powerSource.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Voltage</div>
                        <div className="text-lg font-bold">{powerSource === 'solar' ? solarVoltage : totalVoltage}V</div>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full ${powerSource === 'solar' ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      System is currently drawing power from the {powerSource} grid. 
                      {powerSource === 'solar' ? ' Solar array is providing direct load support while maintaining pack stability.' : ' Battery pack is discharging to meet current load demands.'}
                    </p>
                  </div>
                </div>

                {/* Load Analysis */}
                <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    Smart Home Loads
                  </h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {smartHomeAppliances.filter(app => app.isOn).map(app => (
                      <div key={app.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                        <div className="text-[10px] font-bold text-white uppercase">{app.name}</div>
                        <div className="text-[10px] font-mono text-orange-400">{app.power}W</div>
                      </div>
                    ))}
                    {smartHomeAppliances.filter(app => app.isOn).length === 0 && (
                      <div className="text-center py-8 text-zinc-600 text-[10px] uppercase font-mono">No active loads</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Flow Diagram (Sankey) */}
              <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-emerald-500 to-orange-500 opacity-20" />
                
                <div className="flex flex-col items-center gap-8">
                  <div className="text-center">
                    <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Real-time Energy Flow (Sankey)</h3>
                    <div className="h-px w-24 bg-zinc-800 mx-auto" />
                  </div>

                  <div className="w-full max-w-3xl aspect-[16/8] bg-zinc-900/20 rounded-3xl border border-zinc-800/50 p-8 flex items-center justify-center">
                    <PowerSankey 
                      solarPower={(solarVoltage / 300) * 500}
                      batteryPower={totalLoadPower - ((solarVoltage / 300) * 500)}
                      loadPower={totalLoadPower}
                      width={700}
                      height={300}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-12 w-full max-w-2xl">
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-zinc-600 uppercase mb-1">Generation</div>
                      <div className="text-sm font-bold text-yellow-500">{((solarVoltage / 300) * 500).toFixed(1)}W</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-zinc-600 uppercase mb-1">Storage Delta</div>
                      <div className={`text-sm font-bold ${(totalLoadPower - ((solarVoltage / 300) * 500)) < 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {(totalLoadPower - ((solarVoltage / 300) * 500)).toFixed(1)}W
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-zinc-600 uppercase mb-1">Consumption</div>
                      <div className="text-sm font-bold text-orange-500">{totalLoadPower.toFixed(1)}W</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <SmartHome 
              appliances={smartHomeAppliances} 
              onToggle={toggleAppliance} 
              onBack={() => setActiveView('grid')}
              estimatedTime={calculateRuntime()}
            />
          )}
        </div>

        {/* Right Column: AI Analysis & Capacity Graph */}
        <div className="xl:col-span-1 space-y-6">
          {/* Capacity History Graph */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Capacity History</span>
              </div>
              <div className="text-[10px] font-mono text-emerald-500">Avg SOC: {capacityHistory[capacityHistory.length - 1]?.soc || 0}%</div>
            </div>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={capacityHistory}>
                  <defs>
                    <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '10px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area type="monotone" dataKey="soc" stroke="#10b981" fillOpacity={1} fill="url(#colorSoc)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <AnimatePresence>
            {isAiMonitoring ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-purple-500 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Digital Twin
                  </h3>
                  {isAiAnalyzing && <RefreshCcw className="w-3 h-3 text-purple-500 animate-spin" />}
                </div>

                <div className="grid grid-cols-10 gap-1 opacity-50 grayscale-[0.5]">
                  {(aiCells.length > 0 ? aiCells : cells).map((cell) => (
                    <div
                      key={`ai-${cell.id}`}
                      className={`relative flex items-center justify-center p-1 rounded-full border aspect-square ${getStatusColor(cell)}`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    </div>
                  ))}
                </div>

                {aiAnalysis && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-5 rounded-2xl border ${
                      aiAnalysis.status === 'critical' ? 'bg-red-500/10 border-red-500/50 text-red-400' :
                      aiAnalysis.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' :
                      'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest opacity-70">AI Insight</span>
                          <button onClick={() => setAiAnalysis(null)} className="p-1 hover:bg-white/10 rounded-full">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="font-bold text-sm mb-2 leading-tight">{aiAnalysis.alert}</div>
                        <div className="text-xs opacity-80 leading-relaxed">{aiAnalysis.recommendation}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <div className="bg-zinc-900/30 border border-zinc-800 border-dashed p-12 rounded-3xl flex flex-col items-center justify-center text-center">
                <Brain className="w-10 h-10 text-zinc-800 mb-4" />
                <p className="text-zinc-600 text-xs uppercase tracking-widest">AI Monitoring Offline</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="max-w-[1600px] mx-auto mt-8 pt-6 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600 text-[10px] font-mono uppercase tracking-[0.2em]">
        <div className="flex items-center gap-4">
          <span>© 2026 Virtual Battery Systems • V2.0.0</span>
          {lastSyncStatus && (
            <span className={`flex items-center gap-1 ${lastSyncStatus.success ? 'text-emerald-500' : 'text-red-500'}`}>
              <div className={`w-1 h-1 rounded-full ${lastSyncStatus.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
              Last Sync: {lastSyncStatus.time}
            </span>
          )}
        </div>
        <div className="flex gap-6">
          <a href="/api/battery-pack" target="_blank" className="hover:text-emerald-500 transition-colors">API</a>
          <span className="text-zinc-800">|</span>
          <span>Grid: 10x10 (100 Cells)</span>
        </div>
      </footer>
    </div>
  );
}
