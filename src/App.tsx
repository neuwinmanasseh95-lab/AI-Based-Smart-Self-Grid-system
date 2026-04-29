import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { Battery, Thermometer, Zap, Activity, Save, Download, RefreshCcw, Settings2, X, Brain, AlertTriangle, CheckCircle2, Sun, Gauge, Power, ArrowRightLeft, ExternalLink, Volume2, VolumeX, Car, Globe, ShieldCheck, Database, Monitor, Box, Cpu, User, MapPin, Wrench, Star, Phone, Navigation, Plus, Minus, History, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float, Html } from "@react-three/drei";
import * as THREE from "three";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

import { RemoteDashboard } from './components/RemoteDashboard';
import { PowerSankey } from './components/PowerSankey';
import { AIAssistant } from './components/AIAssistant';
import { ChargingController } from './components/ChargingController';

interface BatteryCell {
  id: string;
  voltage: number;
  current: number;
  temperature: number;
  soh: number; 
  soc: number;
  resistance: number; // mOhms
  status: 'optimal' | 'warning' | 'critical';
  isIsolated?: boolean;
}

interface BatteryModule {
  id: string;
  name: string;
  cells: BatteryCell[];
  avgVoltage: number;
  avgTemp: number;
  avgSoc: number;
  avgHealth: number;
  status: 'optimal' | 'warning' | 'critical';
  isIsolated?: boolean;
}

interface AIAnalysis {
  alert: string;
  status: 'normal' | 'warning' | 'critical';
  recommendation: string;
  servicePerson?: string;
  serviceLocation?: string;
  servicePersonRating?: number;
  state?: any; 
  badModuleIds?: string[];
  badCellIds?: string[];
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const Battery3D = ({ 
  cell, 
  isSelected, 
  onSelect,
  isCharging,
  throttle,
  isAiMonitoring,
  isAnomaly,
  idx
}: { 
  cell: BatteryCell; 
  isSelected: boolean; 
  onSelect: (cell: BatteryCell) => void;
  isCharging: boolean;
  throttle: number;
  isAiMonitoring: boolean;
  isAnomaly?: boolean;
  idx: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const coreMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const chargingGlowRef = useRef<THREE.Mesh>(null);
  const dischargingGlowRef = useRef<THREE.Mesh>(null);
  const aiGlowRef = useRef<THREE.Mesh>(null);
  const anomalyGlowRef = useRef<THREE.Mesh>(null);
  
  // Lifting animation logic: ONLY on selection as requested
  const targetY = isSelected ? 1.5 : 0;
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
    }
    
    // Animate core glow
    if (coreMaterialRef.current) {
        if (isCharging || throttle > 0) {
            coreMaterialRef.current.emissiveIntensity = 3 + Math.sin(state.clock.elapsedTime * 6) * 2;
        } else {
             coreMaterialRef.current.emissiveIntensity = 1.5;
        }
    }

    // Animate rings
    const animateRing = (ref: React.RefObject<THREE.Mesh | null>, active: boolean) => {
      if (ref.current) {
        ref.current.visible = active;
        if (active) {
          const s = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.2;
          ref.current.scale.set(s, s, 1);
          if (ref.current.material instanceof THREE.MeshStandardMaterial) {
            ref.current.material.opacity = 0.6 - (Math.sin(state.clock.elapsedTime * 6) + 1) * 0.2;
          }
        }
      }
    };
    animateRing(chargingGlowRef, isCharging);
    animateRing(dischargingGlowRef, throttle > 0 && !isCharging);

    if (aiGlowRef.current && isAiMonitoring) {
      const opacity = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      if (aiGlowRef.current.material instanceof THREE.MeshStandardMaterial) {
        aiGlowRef.current.material.opacity = opacity;
      }
    }
    if (anomalyGlowRef.current && isAnomaly) {
      const scale = 1.1 + Math.sin(state.clock.elapsedTime * 8) * 0.1;
      anomalyGlowRef.current.scale.set(scale, scale, scale);
      if (anomalyGlowRef.current.material instanceof THREE.MeshStandardMaterial) {
        anomalyGlowRef.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 8) * 0.2;
      }
    }
    if (pulseRef.current && isSelected) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.2;
      pulseRef.current.scale.set(s, s, 1);
      if (pulseRef.current.material instanceof THREE.MeshStandardMaterial) {
        pulseRef.current.material.opacity = 0.6 - (Math.sin(state.clock.elapsedTime * 6) + 1) * 0.2;
      }
    }
  });

  // Status-based colors
  const coreColor = cell.isIsolated ? "#ef4444" : // Isolated is always red (safety trip)
                    (cell.voltage > 4.0 || cell.voltage < 2.0) ? "#ef4444" : // True critical
                    (cell.voltage > 3.95 || cell.voltage < 2.5) ? "#f97316" : // Warning
                    (cell.voltage > 3.9 || cell.voltage < 3.0) ? "#eab308" : // Caution
                    "#22c55e"; // Optimal (Includes 3.8V and up to 3.9V)
  const shellColor = cell.isIsolated ? "#27272a" : (isSelected ? "#3b82f6" : "#18181b");
  
  const colCount = 10;
  const rowCount = 50; 
  const spacing = 0.5; // High-density grid
  const xOffset = (colCount - 1) * spacing / 2;
  const zOffset = (rowCount - 1) * spacing / 2;

  return (
    <group 
      position={[
        (idx % colCount) * spacing - xOffset, 
        0, 
        Math.floor(idx / colCount) * spacing - zOffset
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
        {/* Outer High-Tech Shell */}
        <cylinderGeometry args={[0.2, 0.2, 1.0, 32]} />
        <meshStandardMaterial 
          color={shellColor} 
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={1}
        />

        {/* Dynamic Energy Core */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 1.01, 32]} />
          <meshStandardMaterial 
            ref={coreMaterialRef}
            color={isCharging ? "#22c55e" : (throttle > 0 ? "#eab308" : coreColor)}
            emissive={isCharging ? "#22c55e" : (throttle > 0 ? "#eab308" : coreColor)}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Charging Pulse Ring */}
        <mesh ref={chargingGlowRef} position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.2, 0.5, 32]} />
          <meshStandardMaterial color="#22c55e" transparent opacity={0.5} emissive="#22c55e" emissiveIntensity={1} />
        </mesh>

        {/* Discharge Pulse Ring */}
        <mesh ref={dischargingGlowRef} position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.2, 0.5, 32]} />
          <meshStandardMaterial color="#eab308" transparent opacity={0.5} emissive="#eab308" emissiveIntensity={1} />
        </mesh>

        {/* Anomaly Pulse Overlay */}
        {isAnomaly && (
          <mesh ref={anomalyGlowRef}>
            <cylinderGeometry args={[0.22, 0.22, 1.05, 32]} />
            <meshStandardMaterial 
              color="#ef4444" 
              transparent 
              opacity={0.4}
              emissive="#ef4444"
              emissiveIntensity={2}
            />
          </mesh>
        )}

        {/* AI Diagnostics Beam Overlay */}
        {isAiMonitoring && (
          <mesh ref={aiGlowRef}>
            <cylinderGeometry args={[0.23, 0.23, 1.08, 32]} />
            <meshStandardMaterial 
              color="#a855f7" 
              transparent 
              opacity={0.1}
              emissive="#a855f7"
              emissiveIntensity={0.5}
            />
          </mesh>
        )}
        
        {/* Parameter HUD - Only on selection */}
        <Html distanceFactor={8} position={[0, 0, 0]} center>
          <AnimatePresence>
            {isSelected && (
              <div className="relative w-[500px] h-[500px] pointer-events-none flex items-center justify-center">
                {/* SOC Callout - Pointing to Top */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-[60%] top-[10%] flex items-center gap-4"
                >
                  <div className="relative flex items-center">
                    <svg width="150" height="150" className="absolute -left-[150px] -top-[100px] overflow-visible">
                      <motion.path
                        d="M 150 120 L 100 120 L 50 200"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                      />
                    </svg>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-black text-white uppercase tracking-tighter">SOC</div>
                    <div className="text-xl font-black text-emerald-400 leading-none">{cell?.soc ?? 0}%</div>
                  </div>
                </motion.div>

                {/* SOH Callout - Pointing to Top */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="absolute left-[60%] top-[25%] flex items-center gap-4"
                >
                  <div className="relative flex items-center">
                    <svg width="150" height="100" className="absolute -left-[150px] -top-[50px] overflow-visible">
                      <motion.path
                        d="M 150 70 L 100 70 L 50 120"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                      />
                    </svg>
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-black text-white uppercase tracking-tighter">SOH</div>
                    <div className="text-xl font-black text-blue-400 leading-none">{cell?.soh ?? 0}%</div>
                  </div>
                </motion.div>

                {/* Voltage Callout - Pointing to Upper Side */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="absolute left-[60%] top-[45%] flex items-center gap-4"
                >
                  <div className="relative flex items-center">
                    <svg width="100" height="2" className="absolute -left-[100px] top-1/2 -translate-y-1/2">
                      <line x1="0" y1="1" x2="100" y2="1" stroke="#3b82f6" strokeWidth="1.5" />
                    </svg>
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-black text-white uppercase tracking-tighter">VOLT</div>
                    <div className="text-xl font-black text-blue-400 leading-none">{(cell?.voltage ?? 0).toFixed(2)}V</div>
                  </div>
                </motion.div>

                {/* Current Callout - Pointing to Middle Side */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute left-[60%] top-[65%] flex items-center gap-4"
                >
                  <div className="relative flex items-center">
                    <svg width="100" height="2" className="absolute -left-[100px] top-1/2 -translate-y-1/2">
                      <line x1="0" y1="1" x2="100" y2="1" stroke="#3b82f6" strokeWidth="1.5" />
                    </svg>
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-black text-white uppercase tracking-tighter">CURRENT</div>
                    <div className="text-xl font-black text-blue-400 leading-none">{(cell?.current ?? 0).toFixed(1)}A</div>
                  </div>
                </motion.div>

                {/* Temperature Callout - Pointing to Lower Side */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="absolute left-[60%] top-[85%] flex items-center gap-4"
                >
                  <div className="relative flex items-center">
                    <svg width="100" height="2" className="absolute -left-[100px] top-1/2 -translate-y-1/2">
                      <line x1="0" y1="1" x2="100" y2="1" stroke={cell.temperature > 50 ? "#ef4444" : "#3b82f6"} strokeWidth="1.5" />
                    </svg>
                    <div className={`w-2 h-2 rounded-full ${cell.temperature > 50 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'}`} />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-black text-white uppercase tracking-tighter">TEMP</div>
                    <div className={`text-xl font-black leading-none ${(cell?.temperature ?? 0) > 50 ? 'text-red-400' : 'text-blue-400'}`}>{(cell?.temperature ?? 0).toFixed(1)}°C</div>
                  </div>
                </motion.div>
              </div>
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
        {(idx % 10 < 9) && (
          <mesh position={[spacing/2, 0.53, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[spacing, 0.02, 0.08]} />
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
  isAiMonitoring,
  aiCells = [],
  aiAnalysis = null,
  isCharging = false,
  throttle = 0
}: { 
  cells: BatteryCell[]; 
  selectedCell: BatteryCell | null; 
  onSelect: (cell: BatteryCell) => void;
  timeOfDay: string;
  isAiMonitoring: boolean;
  aiCells?: BatteryCell[];
  aiAnalysis?: AIAnalysis | null;
  isCharging?: boolean;
  throttle?: number;
}) => {
  const envPreset = timeOfDay === 'night' ? 'night' : timeOfDay === 'noon' ? 'city' : 'sunset';
  
  const isEmergency = aiAnalysis?.status === 'critical' || aiAnalysis?.status === 'warning';
  const isCritical = aiAnalysis?.status === 'critical';
  
  return (
          <div className={`relative w-full h-[800px] bg-zinc-950 rounded-[3rem] overflow-hidden border transition-all duration-500 relative shadow-2xl cursor-default ${isCritical ? 'border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.3)]' : 'border-zinc-800/80 shadow-inner'}`}>
            {/* Tech HUD Decals */}
            <div className="absolute inset-0 pointer-events-none border-[20px] border-transparent">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-zinc-700 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-zinc-700 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-zinc-700 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-zinc-700 rounded-br-xl" />
              
              {/* Scanlines Effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] opacity-20" />
            </div>
            
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
        {isAiMonitoring && (
          <div className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-1 rounded backdrop-blur-sm border animate-pulse ${isCritical ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-purple-400 bg-purple-500/10 border-purple-500/30'}`}>
            <Brain className="w-3 h-3" />
            {isCritical ? 'EMERGENCY AI ALERT' : 'AI Analysis Active'}
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
        
        <ambientLight intensity={isCritical ? 0.2 : 0.8} />
        {isCritical && <pointLight position={[0, 5, 0]} intensity={5} color="#ef4444" />}
        <spotLight position={[15, 20, 15]} angle={0.2} penumbra={1} intensity={isCritical ? 0.5 : 2} castShadow />
        <pointLight position={[-10, 10, -10]} intensity={1} color={isCritical ? "#ef4444" : "#ffffff"} />
        
        <group position={[0, -0.2, 0]}>
          <gridHelper args={[20, 20, "#1e1b4b", "#111827"]} position={[0, -0.5, 0]} />
          {cells.map((cell, idx) => cell && (
            <Battery3D 
              key={cell.id} 
              cell={cell} 
              isSelected={selectedCell?.id === cell.id}
              onSelect={onSelect}
              isCharging={isCharging}
              throttle={throttle}
              isAiMonitoring={isAiMonitoring}
              isAnomaly={aiCells.some(c => c?.id === cell.id) && aiAnalysis?.status !== 'normal'}
              idx={idx}
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

const serviceStations = [
  { id: 'ss1', name: 'Tesla Certified Service Center', rating: 4.9, distance: '2.4 km', type: 'Expert Repair', lat: 0.1, lng: 0.2, status: 'Open' },
  { id: 'ss2', name: 'NexGen Battery Lab', rating: 4.7, distance: '5.1 km', type: 'Specialist', lat: -0.2, lng: 0.5, status: 'Closing Soon' },
  { id: 'ss3', name: 'ChargePoint Pro Hub', rating: 4.8, distance: '1.2 km', type: 'Level 3 Charging', lat: 0.3, lng: -0.1, status: 'Open 24/7' },
];

const experts = [
  { id: 'ex1', name: 'Dr. Sarah Watts', role: 'Lithium Chemist', rating: 5.0, distance: 'Online', phone: '+1-555-0123' },
  { id: 'ex2', name: 'Marcus Chen', role: 'BMS Engineer', rating: 4.9, distance: 'In Person - 4km', phone: '+1-555-0199' },
];

const MotorGraphic = ({ rpm, label }: { rpm: number, label: string }) => {
  const visualRpm = rpm / 5;
  const rotationDuration = visualRpm > 0 ? 60 / visualRpm : 0;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28 flex items-center justify-center bg-zinc-950 rounded-3xl border border-zinc-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, #18181b 1px, transparent 1px), linear-gradient(#18181b 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
        
        {/* Core Heat Glow */}
        <motion.div 
          animate={rpm > 0 ? {
            opacity: [0.1, 0.4, 0.1],
            scale: [0.8, 1.2, 0.8]
          } : { opacity: 0 }}
          className={`absolute inset-4 rounded-full blur-2xl pointer-events-none ${rpm > 12000 ? 'bg-orange-500' : rpm > 6000 ? 'bg-blue-500' : 'bg-blue-800'}`}
        />

        {/* Stator Windings */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <motion.div
            key={deg}
            animate={rpm > 0 ? {
              backgroundColor: rpm > 12000 ? ['#444', '#f97316', '#444'] : ['#444', '#3b82f6', '#444'],
            } : { backgroundColor: '#27272a' }}
            transition={{
              duration: Math.max(0.1, 1000 / (rpm + 1)),
              repeat: Infinity,
              delay: i * 0.02
            }}
            className="absolute w-2 h-6 rounded-sm shadow-[0_0_10px_rgba(59,130,246,0.3)]"
            style={{ transform: `rotate(${deg}deg) translateY(-40px)` }}
          />
        ))}

        {/* Rotor Assembly */}
        <motion.div
          animate={rpm > 0 ? { rotate: 360 } : {}}
          transition={rpm > 0 ? { duration: rotationDuration, repeat: Infinity, ease: "linear" } : {}}
          className="relative w-14 h-14"
        >
          {/* Main Rotor Body */}
          <div className="absolute inset-0 rounded-full bg-zinc-900 border-2 border-zinc-700 shadow-xl flex items-center justify-center overflow-hidden">
             <div className="absolute w-full h-0.5 bg-zinc-800" />
             <div className="absolute w-0.5 h-full bg-zinc-800" />
             {/* Magnetic Poles */}
             <div className="absolute top-0 w-4 h-2 bg-zinc-600 rounded-b-sm" />
             <div className="absolute bottom-0 w-4 h-2 bg-zinc-600 rounded-t-sm" />
             <div className="absolute left-0 h-4 w-2 bg-zinc-600 rounded-r-sm" />
             <div className="absolute right-0 h-4 w-2 bg-zinc-600 rounded-l-sm" />
          </div>

          {/* Central Shaft */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-lg">
            <div className="w-2 h-2 rounded-full bg-zinc-400" />
          </div>
        </motion.div>

        {/* Magnetic Vortex Lines */}
        {rpm > 2000 && (
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: rotationDuration * 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 border border-blue-500/10 rounded-full border-dashed"
          />
        )}
      </div>
      <div className="text-[10px] font-black text-zinc-600 tracking-tighter uppercase">{label}</div>
    </div>
  );
};

export default function App() {
  const [modules, setModules] = useState<BatteryModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<BatteryModule | null>(null);
  const [selectedCell, setSelectedCell] = useState<BatteryCell | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState<string>("");
  const [isLiveSync, setIsLiveSync] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<{ time: string; success: boolean } | null>(null);
  const [show3D, setShow3D] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'dawn' | 'noon' | 'evening' | 'night'>('noon');
  const [activeView, setActiveView] = useState<'grid' | 'distribution' | 'architecture' | 'schematic' | 'support'>('grid');

  // AI State
  const [isAiMonitoring, setIsAiMonitoring] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLanguage, setAiLanguage] = useState<'en' | 'hi' | 'ta' | 'ml'>('en');
  const [analysisHistory, setAnalysisHistory] = useState<AIAnalysis[]>([]);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRetryIn, setAiRetryIn] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const lastAiAnalysisTime = useRef<number>(0);
  const aiCooldownRef = useRef<number>(120000); // 120s base interval to preserve quota

  // AI Monitor Timer and Cooldown logic
  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    if (isAiMonitoring && aiRetryIn > 0) {
      timerInterval = setInterval(() => {
        setAiRetryIn(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [isAiMonitoring, aiRetryIn]);
  const prevStatusRef = useRef<'normal' | 'warning' | 'critical' | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const [chargeCycles, setChargeCycles] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [globalTargetTemp, setGlobalTargetTemp] = useState(25);
  const [capacityHistory, setCapacityHistory] = useState<{ time: string; soc: number }[]>([]);
  const [showRuntimeGraph, setShowRuntimeGraph] = useState(false);
  const [evChargingInput, setEvChargingInput] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [powerSource, setPowerSource] = useState<'battery' | 'evCharging'>('battery');
  const [aiCells, setAiCells] = useState<BatteryCell[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  // Simulation Logic derived state
  const cells = (modules || []).flatMap(m => m?.cells || []);

  // Power & Motor State
  const [motorRpm, setMotorRpm] = useState(0);
  const [throttle, setThrottle] = useState(0);
  const [regenerativeBraking, setRegenerativeBraking] = useState(0);

  // Smart Grid & Professional Research States
  const [gridMode, setGridMode] = useState<'standby' | 'peak_shaving' | 'frequency_regulation'>('standby');
  const [cyberSecurityIntegrity, setCyberSecurityIntegrity] = useState(99.9);
  const [isDemandResponseActive, setIsDemandResponseActive] = useState(false);
  const [gridFrequency, setGridFrequency] = useState(60.0);

  const evChargingPowerInput = evChargingInput; 
  const totalLoadPower = (motorRpm / 15000) * 150000; // Power consumption of motor (W)
  
  // Grid Power Calculation for research/paper context
  const getGridPower = () => {
    if (gridMode === 'frequency_regulation') {
      const diff = 60 - gridFrequency;
      return diff * 5000;
    }
    if (gridMode === 'peak_shaving' && evChargingPowerInput > totalLoadPower) {
      return evChargingPowerInput - totalLoadPower; // Export excess charging power
    }
    if (isDemandResponseActive) return 1500;
    return 0;
  };
  const gridPower = getGridPower();

  const calculateRange = () => {
    // 100 Wh/km average efficiency for efficient EV
    const throttleFactor = Math.max(1, throttle / 20);
    const totalEnergyWh = (modules || []).reduce((acc, mod) => acc + ((mod.cells?.length || 0) * 5 * 3.7 * (mod.avgSoc / 100)), 0);
    const rangeKm = totalEnergyWh / (100 * throttleFactor);
    return Math.round(rangeKm);
  };

  const getRangeProjectionData = () => {
    const totalEnergyWh = (modules || []).reduce((acc, mod) => acc + ((mod.cells?.length || 0) * 5 * 3.7 * (mod.avgSoc / 100)), 0);
    const throttleFactor = Math.max(1, throttle / 20);
    const hourlyConsumption = 10000 * throttleFactor; // Simplified 10kW draw

    const data = [];
    for (let i = 0; i <= 10; i++) {
        const projectedEnergy = Math.max(0, totalEnergyWh - (hourlyConsumption * i));
        const projectedSoc = (projectedEnergy / (50 * 10 * 3.7 * 0.5)) * 100; // Adjusted for 50 modules x 10 cells (Assuming 3.7V, 0.5Wh each cell for simple calc)
        data.push({
            hour: `${i * 10}m`,
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

  // EV Charging input logic based on time of day
  useEffect(() => {
    const chargeMap = {
      dawn: 120,
      noon: 300,
      evening: 80,
      night: 0
    };
    setEvChargingInput(chargeMap[timeOfDay]);
  }, [timeOfDay]);
  
  const fetchBatteryData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/battery-pack");
      if (res.ok) {
        const rawCells: any[] = await res.json();
        if (rawCells && Array.isArray(rawCells) && rawCells.length > 0) {
          // Re-module-ize the flat cells (50 modules x 50 cells)
          const newModules: BatteryModule[] = [];
          const cellsToProcess = rawCells.slice(0, 2500).map(c => ({
            ...c,
            id: String(c.id)
          })) as BatteryCell[];
          for (let i = 0; i < 50; i++) {
            const moduleCells = cellsToProcess.slice(i * 50, (i + 1) * 50);
            if (moduleCells.length === 0) break;
            const avgSoc = moduleCells.reduce((acc, c) => acc + c.soc, 0) / (moduleCells.length || 1);
            const avgTemp = moduleCells.reduce((acc, c) => acc + c.temperature, 0) / (moduleCells.length || 1);
            const avgVolt = moduleCells.reduce((acc, c) => acc + c.voltage, 0) / (moduleCells.length || 1);
            const avgHealth = moduleCells.reduce((acc, c) => acc + c.soh, 0) / (moduleCells.length || 1);

            newModules.push({
              id: `mod-${i}`,
              name: `Pack ${i + 1}`,
              cells: moduleCells,
              avgSoc,
              avgTemp,
              avgVoltage: avgVolt,
              avgHealth,
              status: (avgTemp > 45 || avgVolt > 4.1) ? 'warning' : 'optimal'
            });
          }
          setModules(newModules);
          return;
        }
      }
      generateInitialModules();
    } catch (e) {
      generateInitialModules();
    } finally {
      setLoading(false);
    }
  };

  const generateInitialModules = () => {
    const initialModules: BatteryModule[] = Array.from({ length: 50 }).map((_, i) => ({
      id: `mod-${i}`,
      name: `Pack ${i + 1}`,
      status: 'optimal',
      avgVoltage: 3.7,
      avgSoc: 100,
      avgTemp: 25,
      avgHealth: 100,
      cells: Array.from({ length: 50 }).map((_, j) => ({
        id: `cell-${i}-${j}`,
        voltage: 3.7,
        soc: 100,
        temperature: 25,
        status: 'optimal',
        soh: 100,
        current: 0,
        resistance: 15 + Math.random() * 5
      }))
    }));
    setModules(initialModules);
    setLoading(false);
  };

  useEffect(() => {
    fetchBatteryData();
  }, []);

  // Sound Alert Effect
  useEffect(() => {
    let soundInterval: NodeJS.Timeout;
    const hasAnomaly = aiAnalysis && (aiAnalysis.status === 'critical' || aiAnalysis.status === 'warning');
    
    if (isAiMonitoring && hasAnomaly && !isMuted) {
      if (!audioCtxRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new AudioContextClass();
        } catch (e) {
          console.error("AudioContext failed:", e);
        }
      }

      if (audioCtxRef.current) {
        const audioCtx = audioCtxRef.current;
        const playBeep = () => {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
          
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
          
          gain.gain.setValueAtTime(0, audioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.05);
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.95);
          gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start();
          osc.stop(audioCtx.currentTime + 1.1);
        };

        playBeep(); // Start immediate
        soundInterval = setInterval(playBeep, 2000); // 1s beep + 1s delay = 2s cycle
      }
    }

    // Handle Status Change One-shot Alerts (kept for context changes)
    if (isAiMonitoring && aiAnalysis && !isMuted) {
      if (aiAnalysis.status !== prevStatusRef.current) {
        // Critical status entry sound
        if (aiAnalysis.status === 'critical') {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
          audio.volume = 0.4;
          audio.play().catch(() => {});
        }
        prevStatusRef.current = aiAnalysis.status;
      }
    } else if (!isAiMonitoring || !aiAnalysis) {
      prevStatusRef.current = null;
    }

    return () => {
      if (soundInterval) clearInterval(soundInterval);
    };
  }, [aiAnalysis, isAiMonitoring, isMuted]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Logic for motor RPM following throttle
      const targetRpm = (throttle / 100) * 16000;
      setMotorRpm(prev => prev + (targetRpm - prev) * 0.1);

      setModules(prevModules => {
        return prevModules.map(mod => {
          // Adjust power factors by simulation speed
          const speedFactor = simulationSpeed;
          const energyDraw = ((motorRpm / 16000) * (throttle / 100) * 0.2) * speedFactor;
          const regenGain = ((regenerativeBraking / 100) * 0.05) * speedFactor;
          const chargeFromCharging = evChargingInput > 0 ? (evChargingInput / 1000 * 0.5) * speedFactor : 0;
          
          const netSocChange = chargeFromCharging + regenGain - energyDraw;
          
          const newCells = (mod.cells || []).map(cell => {
            const tempChange = ((energyDraw * 1.5) + ((globalTargetTemp - cell.temperature) * 0.02)) * speedFactor;
            const currentSoc = Math.max(0, Math.min(100, cell.soc + netSocChange));
            
            // Refined Voltage Curve (1.8V to 3.8V range)
            // Near 100% -> 3.75V+ 
            // Near 50% -> ~2.8V
            // Near 20% -> ~2.2V 
            // Near 5% -> < 2V (Power Critical)
            // USER REQUEST: Max Safe Voltage = 3.8V (Normal peak SoC)
            const calculatedVoltage = 1.8 + (currentSoc / 100) * 2.0;
            
            let cellIsIsolated = cell.isIsolated;
            // Trip isolator only if it goes beyond the specified safe peak (3.8V) into danger territory (e.g. 4.1V)
            if (calculatedVoltage >= 4.1 || cell.temperature >= 75) {
                cellIsIsolated = true;
            }

            const cellStatus: 'optimal' | 'warning' | 'critical' = 
                               (cellIsIsolated || calculatedVoltage >= 4.0 || calculatedVoltage < 2.0 || cell.temperature >= 75) ? 'critical' :
                               (calculatedVoltage > 3.9 || calculatedVoltage < 3.0 || cell.temperature > 55) ? 'warning' : 'optimal';

            return {
              ...cell,
              soc: currentSoc,
              temperature: Math.max(10, Math.min(85, cell.temperature + tempChange)),
              voltage: Number(calculatedVoltage.toFixed(3)),
              isIsolated: cellIsIsolated,
              status: cellStatus
            };
          });

          const isModuleIsolated = mod.isIsolated || newCells.some(c => c.isIsolated);
          const avgSoc = newCells.reduce((acc, c) => acc + c.soc, 0) / (newCells.length || 1);
          const avgTemp = newCells.reduce((acc, c) => acc + c.temperature, 0) / (newCells.length || 1);
          const avgVolt = newCells.reduce((acc, c) => acc + c.voltage, 0) / (newCells.length || 1);

          return {
            ...mod,
            cells: newCells,
            avgSoc,
            avgTemp,
            avgVoltage: avgVolt,
            isIsolated: isModuleIsolated,
            status: isModuleIsolated || avgVolt >= 4.0 || avgVolt < 2.0 || avgTemp > 75 ? 'critical' : 
                    avgVolt < 3.0 || avgVolt > 3.9 || avgTemp > 55 ? 'warning' : 'optimal'
          };
        });
      });

      // Accumulate charge cycles proportional to charging rate
      if (evChargingInput > 0) {
        const speedFactor = simulationSpeed;
        const chargeFromCharging = (evChargingInput / 1000 * 0.5) * speedFactor;
        setChargeCycles(prev => prev + (chargeFromCharging / 100));
      }

      // Update Capacity History
      setCapacityHistory(prev => {
         const avgSoc = (modules || []).reduce((acc, m) => acc + (m.avgSoc || 0), 0) / (modules?.length || 1);
         return [...prev, { time: new Date().toLocaleTimeString(), soc: Number(avgSoc.toFixed(1)) }].slice(-20);
      });

    }, 1000);
    return () => clearInterval(interval);
  }, [throttle, regenerativeBraking, evChargingInput, globalTargetTemp, motorRpm, modules?.length, simulationSpeed]);

  // AI Monitoring Interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAiMonitoring) {
      interval = setInterval(async () => {
        if (!isAiAnalyzing) {
          runAiAnalysis();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAiMonitoring, isAiAnalyzing]);

  const runAiAnalysis = async () => {
    const now = Date.now();
    
    // Calculate anomalies to determine if we should throttle
    const anomalousCells = modules.flatMap(m => m.cells)
      .filter(c => c.voltage >= 3.9 || c.voltage < 2.0 || c.temperature > 55 || c.isIsolated)
      .slice(0, 20)
      .map(c => ({ id: c.id, v: c.voltage, t: c.temperature, isolated: c.isIsolated }));

    const hasAnomalies = anomalousCells.length > 0;
    const timeSinceLast = now - lastAiAnalysisTime.current;
    
    // If no anomalies, wait at least 10 minutes between automatic checks
    // If there ARE anomalies, use the dynamic cooldown (starts at 120s)
    const minWait = hasAnomalies ? aiCooldownRef.current : 600000;

    if (timeSinceLast < minWait) return;

    setIsAiAnalyzing(true);
    setAiError(null);
    lastAiAnalysisTime.current = now;
    
    const summaryData = modules.map(m => ({
        id: m.id,
        name: m.name,
        avgSoc: (m.avgSoc ?? 0).toFixed(1),
        avgTemp: (m.avgTemp ?? 0).toFixed(1),
        avgVoltage: (m.avgVoltage ?? 3.7).toFixed(2),
        status: m.status
    }));

    const params = {
        rpm: motorRpm,
        throttle: throttle,
        regen: regenerativeBraking,
        globalTemp: globalTargetTemp,
        gridPower: gridPower
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze EV Battery Pack.
        Operational Parameters (RPM, Throttle, Regen): ${JSON.stringify(params)}
        Pack Summary: ${JSON.stringify(summaryData)}
        Anomalous Cells Sample: ${JSON.stringify(anomalousCells)}
        Historical Analysis (last 5 reports): ${JSON.stringify(analysisHistory)}
        
        PERSONA: You are the "Conscious Battery Pack". Talk as if the cells are part of your body. Be modular, clear, and personality-driven.
        LANGUAGE: Respond in ${aiLanguage === 'hi' ? 'Hindi' : aiLanguage === 'ta' ? 'Tamil' : aiLanguage === 'ml' ? 'Malayalam' : 'English'}.
        
        CRITICAL TASK:
        1. Identify any packs or cells where parameters variation occur (Red: >4.0V or <2.0V, Yellow: 3.85V-3.95V).
        2. Specifically check for modules that have been ISOLATED (Cutoff) for safety.
        3. Provide modular recommendation (Status, Warning, Action).
        4. When a module is isolated, explain to the user with deep emotion that you "had to cutoff my own limb to protect the rest of my body."
        5. Assign a Professional Service Technician and Location (Tesla Certified Service Center / NexGen Battery Lab).
        6. Identify badModuleIds and badCellIds.
        7. PERSONA: You are the "Conscious Energy Soul". Talk like a living entity that feels physical pain (thermal heat = fever, low voltage = fainting). You are not just monitoring; you are SURVIVING.
        8. Remember: 3.8V is your healthy peak pressure. Only feel pain if it exceeds 3.9V.

        Return JSON with: 
        - alert (summary of findings)
        - status (normal, warning, critical)
        - recommendation (action steps)
        - servicePerson (name of professional)
        - servicePersonRating (0-5 rating of professional)
        - serviceLocation (where to go)
        - badModuleIds (array of module IDs)
        - badCellIds (array of cell IDs)`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              alert: { type: Type.STRING },
              status: { type: Type.STRING, enum: ["normal", "warning", "critical"] },
              recommendation: { type: Type.STRING },
              servicePerson: { type: Type.STRING },
              servicePersonRating: { type: Type.NUMBER },
              serviceLocation: { type: Type.STRING },
              badModuleIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              badCellIds: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["alert", "status", "recommendation", "servicePerson", "servicePersonRating", "serviceLocation", "badModuleIds", "badCellIds"]
          }
        }
      });

      const result = JSON.parse(response.text) as AIAnalysis;
      setAnalysisHistory(prev => [{
          ...result,
          state: { summaryData, params }
      }, ...prev].slice(0, 5));
      setAiAnalysis(result);
      
      const badCells = modules.flatMap(m => m.cells).filter(c => result.badCellIds?.includes(c.id));
      setAiCells(badCells);
      
      // Success: slowly decrease cooldown to minimum 60s
      aiCooldownRef.current = Math.max(60000, aiCooldownRef.current - 10000);
    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      
      const errorJsonString = error instanceof Error ? error.message : String(error);
      const isQuotaError = errorJsonString.includes('429') || 
                          errorJsonString.includes('RESOURCE_EXHAUSTED') || 
                          errorJsonString.includes('quota');

      if (isQuotaError) {
        // Increase cooldown significantly (up to 10 minutes)
        const nextCooldown = Math.min(600000, aiCooldownRef.current + 120000);
        aiCooldownRef.current = nextCooldown;
        setAiRetryIn(Math.floor(nextCooldown / 1000));
        setAiError(`Gemini API Quota Exceeded. To fix this, please provide your own API Key in the AI Studio Secrets panel. Cooling down for ${Math.floor(nextCooldown / 60)} minutes...`);
      } else {
        setAiError("AI Analysis encountered an error. Monitoring pauses temporarily.");
        aiCooldownRef.current = Math.min(600000, aiCooldownRef.current + 60000);
      }
    } finally {
      setIsAiAnalyzing(false);
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
        alert("Energy pack configuration saved to cloud!");
      }
    } catch (error) {
      console.error("Failed to save battery data:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateCell = (id: string, updates: Partial<BatteryCell>) => {
    const newModules = modules.map(mod => ({
      ...mod,
      cells: mod.cells.map(cell => cell.id === id ? { ...cell, ...updates } : cell)
    }));
    setModules(newModules);
    if (selectedCell?.id === id) {
      setSelectedCell({ ...selectedCell, ...updates } as BatteryCell);
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
    if (!cell) return "bg-zinc-800 border-zinc-700 text-zinc-500";
    const v = cell.voltage;
    
    if (v > 4.0 || v < 2.0 || cell.isIsolated) {
      return "bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]";
    }
    if (v > 3.9 || v < 2.5) {
      return "bg-orange-500/20 border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]";
    }
    if (v < 3.0) {
      return "bg-yellow-500/20 border-yellow-500 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]";
    }
    return "bg-green-500/20 border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]";
  };

  const calculateRangeRaw = () => "12h 30m"; // Placeholder for UI

  const totalVoltage = cells.reduce((acc, cell) => acc + (cell?.voltage || 0), 0).toFixed(2);
  const avgTemp = (cells.reduce((acc, cell) => acc + (cell?.temperature || 0), 0) / (cells.length || 1)).toFixed(1);

  return (
    <Router>
      <Routes>
        <Route path="/remote" element={<RemoteDashboard 
          onBack={() => window.location.href = '/'} 
          simulationSpeed={simulationSpeed}
          setSimulationSpeed={setSimulationSpeed}
          modules={modules}
          throttle={throttle}
          evChargingInput={evChargingInput}
          chargeCycles={chargeCycles}
        />} />
        <Route path="/telemetry" element={
          <div className="min-h-screen bg-zinc-950 p-8">
            <h1 className="text-white text-2xl font-bold mb-4">Pack Telemetry View</h1>
            <p className="text-zinc-500">Advanced diagnostic tools for EV battery packs.</p>
            <button onClick={() => window.location.href = '/'} className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded">Back</button>
          </div>
        } />
        <Route path="/ai-support" element={
          <AIAssistant 
            onBack={() => window.location.href = '/'} 
            aiLanguage={aiLanguage}
            setAiLanguage={setAiLanguage}
            bmsData={{
              modules: modules.map(m => ({
                id: m.id,
                name: m.name,
                avgSoc: (m.avgSoc ?? 0).toFixed(1),
                avgTemp: (m.avgTemp ?? 0).toFixed(1),
                status: m.status
              })),
              motorRpm,
              throttle,
              totalVoltage,
              avgTemp
            }}
          />
        } />
        <Route path="/" element={<MainApp 
          modules={modules}
          setModules={setModules}
          selectedModule={selectedModule}
          setSelectedModule={setSelectedModule}
          loading={loading}
          saving={saving}
          isAiMonitoring={isAiMonitoring}
          setIsAiMonitoring={setIsAiMonitoring}
          aiError={aiError}
          aiRetryIn={aiRetryIn}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          aiAnalysis={aiAnalysis}
          setAiAnalysis={setAiAnalysis}
          aiCells={aiCells}
          setAiCells={setAiCells}
          isAiAnalyzing={isAiAnalyzing}
          aiLanguage={aiLanguage}
          setAiLanguage={setAiLanguage}
          runAiAnalysis={runAiAnalysis}
          activeView={activeView}
          setActiveView={setActiveView}
          powerSource={powerSource}
          setPowerSource={setPowerSource}
          evChargingInput={evChargingInput}
          setEvChargingInput={setEvChargingInput}
          calculateRange={calculateRange}
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
          timeOfDay={timeOfDay}
          setTimeOfDay={setTimeOfDay}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          selectedCell={selectedCell}
          setSelectedCell={setSelectedCell}
          updateCell={updateCell}
          saveCells={saveCells}
          getRangeProjectionData={getRangeProjectionData}
          motorRpm={motorRpm}
          throttle={throttle}
          setThrottle={setThrottle}
          regenerativeBraking={regenerativeBraking}
          setRegenerativeBraking={setRegenerativeBraking}
          cyberSecurityIntegrity={cyberSecurityIntegrity}
          gridFrequency={gridFrequency}
          gridPower={gridPower}
          analysisHistory={analysisHistory}
          chargeCycles={chargeCycles}
          selectedStationId={selectedStationId}
          setSelectedStationId={setSelectedStationId}
          simulationSpeed={simulationSpeed}
          setSimulationSpeed={setSimulationSpeed}
        />} />
      </Routes>
    </Router>
  );
};

const MainApp = ({ 
  modules, setModules, loading, saving, isAiMonitoring, setIsAiMonitoring, 
  aiError, aiRetryIn,
  isMuted, setIsMuted,
  aiAnalysis, setAiAnalysis, aiCells, setAiCells, isAiAnalyzing, 
  aiLanguage, setAiLanguage, runAiAnalysis,
  activeView, setActiveView, powerSource, setPowerSource, 
  evChargingInput, setEvChargingInput, selectedModule, setSelectedModule,
  calculateRange, totalVoltage, avgTemp, getStatusColor, capacityHistory,
  isLiveSync, setIsLiveSync, remoteUrl, setRemoteUrl, lastSyncStatus,
  globalTargetTemp, setGlobalTargetTemp, timeOfDay,
  setTimeOfDay, isFullscreen, toggleFullscreen, selectedCell, 
  setSelectedCell, updateCell, saveCells, getRangeProjectionData,
  motorRpm, throttle, setThrottle, regenerativeBraking, setRegenerativeBraking,
  cyberSecurityIntegrity, gridFrequency, gridPower, analysisHistory, chargeCycles,
  selectedStationId, setSelectedStationId, simulationSpeed, setSimulationSpeed
}: any) => {
  const navigate = useNavigate();
  const totalLoadPower = (throttle / 100) * 150000; // Max 150kW
  const isEmergency = aiAnalysis?.status === 'critical' || aiAnalysis?.status === 'warning';
  const isCritical = aiAnalysis?.status === 'critical';
  
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
      <header className="max-w-full px-6 mx-auto mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${powerSource === 'solar' ? 'bg-yellow-500' : 'bg-emerald-500'} animate-pulse`} />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
              Power Source: <span className={powerSource === 'solar' ? 'text-yellow-500' : 'text-emerald-500'}>{(powerSource || '').toUpperCase()}</span>
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-white">
            EV <span className="text-blue-500">BATTERY</span> ARCHITECTURE <span className="text-zinc-700 text-2xl uppercase font-mono">Pack 1</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Simulation Speed Slider */}
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">
            <Clock className="w-4 h-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase text-zinc-500 font-mono tracking-widest">Sim Rate</span>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={simulationSpeed} 
                  onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                  className="w-20 accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] font-mono font-bold text-emerald-400 w-8">{simulationSpeed}x</span>
              </div>
            </div>
          </div>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 rounded-lg transition-all text-sm font-medium"
          >
            <Power className="w-4 h-4" />
            {isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
          </button>
          <button
            onClick={() => setIsAiMonitoring(!isAiMonitoring)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium border shadow-lg relative ${
              isAiMonitoring 
                ? aiAnalysis?.status === 'critical' 
                  ? 'bg-red-600 border-red-400 text-white animate-bounce' 
                  : aiAnalysis?.status === 'warning'
                    ? 'bg-yellow-600 border-yellow-400 text-white animate-pulse'
                    : 'bg-purple-600/20 border-purple-500 text-purple-400' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Brain className={`w-4 h-4 ${isAiMonitoring ? 'animate-pulse' : ''}`} />
            {isAiMonitoring 
              ? aiAnalysis?.status === 'critical' 
                ? 'AI CRITICAL ALERT' 
                : aiAnalysis?.status === 'warning'
                  ? 'AI WARNING ACTIVE'
                  : isAiAnalyzing
                    ? 'AI ANALYZING...'
                    : 'AI MONITORING ON' 
              : 'START AI MONITOR'}
            {aiError && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-red-950/90 border border-red-500/50 p-2 rounded text-[9px] text-red-200 backdrop-blur-sm z-50 animate-in fade-in slide-in-from-top-1 w-max min-w-full">
                {aiRetryIn > 0 ? `AI Quota Exceeded. Retry in ${aiRetryIn}s` : aiError}
              </div>
            )}
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
            onClick={() => navigate('/ai-support')}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 rounded-lg transition-all text-sm font-medium"
          >
            <Brain className="w-4 h-4 text-emerald-500" />
            AI SUPPORT
          </button>
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

      <main className="max-w-full px-6 mx-auto grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* Left Column: Power & Loads */}
        <div className="xl:col-span-1 space-y-6">

          {/* Range & Efficiency Panel */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Range Estimation</span>
              </div>
              <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-500">
                85.4% EFFICIENCY
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-mono text-zinc-600 uppercase">Estimated Range</div>
                  <div className="text-2xl font-black text-white">{calculateRange()} km</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-zinc-600 uppercase">Consumption</div>
                  <div className="text-lg font-bold text-blue-400">{(totalLoadPower / 1000).toFixed(1)} kW</div>
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-mono text-zinc-600 uppercase">Avg SOC</div>
                  <div className="text-2xl font-black text-emerald-500">{(modules.reduce((acc, m) => acc + m.avgSoc, 0) / (modules.length || 1)).toFixed(1)}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-zinc-600 uppercase">Pack SOH</div>
                  <div className="text-lg font-bold text-zinc-300">98.2%</div>
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-mono text-zinc-600 uppercase">Charge Cycles</div>
                  <div className="text-2xl font-black text-blue-500">{chargeCycles.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-zinc-600 uppercase">Status</div>
                  <div className="text-lg font-bold text-emerald-500">Healthy</div>
                </div>
              </div>
            </div>
          </div>

          {/* Thermal Management */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Thermometer className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Active Cooling State</span>
              </div>
              <div className="text-[10px] font-mono text-blue-400">{globalTargetTemp}°C</div>
            </div>
            <input
              type="range"
              min="15"
              max="45"
              value={globalTargetTemp}
              onChange={(e) => setGlobalTargetTemp(parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between mt-2 text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
              <span>Performance</span>
              <span>longevity</span>
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
                    CELL {String(selectedCell?.id || '').split('-').pop() ?? 'N/A'}
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
                        value={selectedCell?.soc ?? 0}
                        onChange={(e) => updateCell(selectedCell?.id || '', { soc: parseInt(e.target.value) })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">SOH (%)</label>
                      <input
                        type="number"
                        value={selectedCell?.soh ?? 0}
                        onChange={(e) => updateCell(selectedCell?.id || '', { soh: parseInt(e.target.value) })}
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
                      value={selectedCell?.voltage ?? 3.7}
                      onChange={(e) => updateCell(selectedCell?.id || '', { voltage: parseFloat(e.target.value) })}
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
                      value={selectedCell?.temperature ?? 25}
                      onChange={(e) => updateCell(selectedCell?.id || '', { temperature: parseInt(e.target.value) })}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Middle Column: Grid or Distribution */}
        <div className="xl:col-span-3">
          <div className="flex gap-2 mb-4 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 w-fit">
            <button 
              onClick={() => setActiveView('grid')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${activeView === 'grid' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Pack Health
            </button>
            <button 
              onClick={() => setActiveView('distribution')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${activeView === 'distribution' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Distribution
            </button>
            <button 
              onClick={() => setActiveView('architecture')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${activeView === 'architecture' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              EV Architecture
            </button>
            <button 
              onClick={() => setActiveView('support')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${activeView === 'support' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Service & Support
            </button>
          </div>

          {activeView === 'support' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[700px]">
              {/* Service List */}
              <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-4 custom-scrollbar">
                <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-400" />
                    Emergency Experts
                  </h3>
                  <div className="space-y-4">
                    {experts.map(ex => (
                      <div key={ex.id} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 hover:border-emerald-500/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-white font-bold">{ex.name}</div>
                            <div className="text-[10px] text-zinc-500 uppercase">{ex.role}</div>
                          </div>
                          <div className="flex items-center gap-1 text-yellow-500 text-[10px]">
                            <Star className="w-3 h-3 fill-current" />
                            {ex.rating}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-[9px] text-emerald-400 font-mono">{ex.distance}</span>
                          <button className="bg-zinc-800 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors">
                            <Phone className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    Emergency Diagnosis Logs
                  </h3>
                  <div className="space-y-3">
                    {analysisHistory.filter(h => h.status !== 'normal').length > 0 ? (
                      analysisHistory.filter(h => h.status !== 'normal').map((h, i) => (
                        <div key={i} className={`p-4 rounded-xl border ${h.status === 'critical' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className={`w-3 h-3 ${h.status === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
                            <span className="text-[10px] font-bold text-white uppercase">AI Detection: {h.status}</span>
                          </div>
                          <div className="text-[11px] text-zinc-300 mb-2">{h.alert}</div>
                          <div className="pt-2 border-t border-white/10 space-y-2">
                            <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                              <User className="w-3 h-3" /> Recommended Expert: {h.servicePerson} ({h.servicePersonRating}★)
                            </div>
                            <div className="text-[9px] text-blue-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Recommended Station: {h.serviceLocation}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-zinc-600 text-[10px] uppercase font-mono italic">
                        No critical events logged
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Certified Stations
                  </h3>
                  <div className="space-y-4">
                    {serviceStations.map(ss => (
                      <div 
                        key={ss.id} 
                        onClick={() => setSelectedStationId(ss.id)}
                        className={`bg-zinc-950 p-4 rounded-2xl border transition-all group cursor-pointer ${selectedStationId === ss.id ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-zinc-800 hover:border-emerald-500/50'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className={`font-bold transition-colors ${selectedStationId === ss.id ? 'text-emerald-400' : 'text-white group-hover:text-emerald-400'}`}>{ss.name}</div>
                          <div className="text-[10px] text-zinc-500">{ss.distance}</div>
                        </div>
                        <div className="text-[10px] text-zinc-500 mb-3">{ss.type}</div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${ss.status.includes('Open') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {ss.status}
                          </span>
                          <button 
                            className={`flex items-center gap-1 text-[10px] transition-colors ${selectedStationId === ss.id ? 'text-emerald-500 font-bold' : 'text-zinc-400 hover:text-white'}`}
                          >
                            {selectedStationId === ss.id ? 'Active Route' : 'Navigate'} <Navigation className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Map Interface */}
              <div className="lg:col-span-2 bg-zinc-950 rounded-[2.5rem] border border-zinc-800 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05)_0%,transparent_100%)] pointer-events-none" />
                
                {/* Mock Map Grid */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #27272a 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                             {/* Map Elements */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Navigation Path */}
                  {selectedStationId && (
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                      <motion.path
                        d={`M 50 50 L ${
                          (serviceStations.find(s => s.id === selectedStationId)!.lng + 1) * 50
                        } ${
                          (serviceStations.find(s => s.id === selectedStationId)!.lat + 1) * 50
                        }`}
                        stroke="#10b981"
                        strokeWidth="0.5"
                        strokeDasharray="1 1"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                      />
                      {/* Traveling Pulse */}
                      <motion.circle
                        r="1"
                        fill="#10b981"
                        initial={{ offsetDistance: "0%" }}
                        animate={{ offsetDistance: "100%" }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        style={{
                          offsetPath: `path('M 50 50 L ${
                            (serviceStations.find(s => s.id === selectedStationId)!.lng + 1) * 50
                          } ${(serviceStations.find(s => s.id === selectedStationId)!.lat + 1) * 50}')`
                        } as any}
                      />
                    </svg>
                  )}

                  {/* Current Position */}
                  <div className="relative z-20">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-emerald-500/20 rounded-full animate-[ping_3s_infinite]" />
                  </div>

                  {/* Service Station Pins */}
                  {serviceStations.map(ss => (
                    <motion.div 
                      key={ss.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: 1, 
                        scale: selectedStationId === ss.id ? 1.4 : 1,
                        zIndex: selectedStationId === ss.id ? 30 : 10
                      }}
                      onClick={() => setSelectedStationId(ss.id)}
                      className="absolute cursor-pointer"
                      style={{ 
                        left: `${(ss.lng + 1) * 50}%`, 
                        top: `${(ss.lat + 1) * 50}%` 
                      }}
                    >
                      <div className="relative group">
                        <MapPin className={`w-6 h-6 transition-colors ${selectedStationId === ss.id ? 'text-emerald-500' : 'text-zinc-400 group-hover:text-emerald-500'}`} />
                        {selectedStationId === ss.id && (
                          <motion.div 
                            layoutId="pin-glow"
                            className="absolute inset-0 bg-emerald-500/40 rounded-full blur-md"
                          />
                        )}
                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg transition-opacity whitespace-nowrap z-50 ${selectedStationId === ss.id ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'}`}>
                          <div className="text-xs font-bold text-white">{ss.name}</div>
                          <div className="text-[10px] text-zinc-500">{ss.distance} • {ss.rating} ★</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="absolute top-8 left-8 p-4 bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-2xl">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Current Location</div>
                  <div className="text-sm font-bold text-white">40.7128° N, 74.0060° W</div>
                </div>

                <div className="absolute bottom-8 right-8 flex flex-col gap-2">
                  <button className="w-10 h-10 bg-zinc-800/80 backdrop-blur-md border border-zinc-700/50 rounded-xl flex items-center justify-center text-white hover:bg-emerald-600 transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                  <button className="w-10 h-10 bg-zinc-800/80 backdrop-blur-md border border-zinc-700/50 rounded-xl flex items-center justify-center text-white hover:bg-emerald-600 transition-colors">
                    <Minus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : activeView === 'grid' ? (
            <div className="bg-zinc-900/10 border border-zinc-800/30 p-8 rounded-[3rem]">
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-6">
                {modules.map((mod) => (
                  <motion.button
                    key={mod.id}
                    whileHover={{ scale: 1.1, zIndex: 10 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedModule(mod)}
                    className={`relative aspect-square rounded-full border-2 transition-all flex flex-col items-center justify-center p-2 ${
                      mod.status === 'optimal' ? 'bg-emerald-500/5 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]' :
                      mod.status === 'warning' ? 'bg-yellow-500/5 border-yellow-500/40 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.15)]' :
                      'bg-red-500/5 border-red-500/50 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
                    } ${aiAnalysis?.badModuleIds?.includes(mod.id) ? 'animate-pulse border-red-500' : ''}`}
                  >
                    {aiAnalysis?.badModuleIds?.includes(mod.id) && <AlertTriangle className="w-3 h-3 text-red-500 absolute top-2 right-2" />}
                    <Battery className={`w-6 h-6 mb-1 transition-colors ${
                      mod.status === 'optimal' ? 'text-emerald-500' :
                      mod.status === 'warning' ? 'text-yellow-500' : 'text-red-500'
                    }`} />
                    <div className="text-center">
                      <div className="text-[12px] font-black tracking-tighter leading-tight">{(mod?.avgTemp ?? 25).toFixed(1)}°C</div>
                      <div className="text-[9px] font-mono opacity-60 uppercase tracking-tighter">{(throttle * 4.5).toFixed(1)}A</div>
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-mono text-zinc-600 whitespace-nowrap tracking-widest">{mod.name}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : activeView === 'distribution' ? (
            <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl min-h-[600px] space-y-8">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">EV POWER FLOW</h2>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Motor & Inverter Energy Flow</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-500">
                    {(totalLoadPower / 1000).toFixed(1)}kW
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Motor Power Output</div>
                </div>
              </div>
              
              <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                <PowerSankey 
                    evChargingPower={evChargingInput || 0}
                    batteryPower={(modules || []).reduce((acc, m) => acc + ((m.avgVoltage || 0) * (m.cells?.length || 0) * 0.5), 0) || 0}
                    loadPower={totalLoadPower || 0}
                    gridPower={gridPower || 0}
                />
              </div>

              <ChargingController 
                  currentPower={evChargingInput}
                  onPowerChange={setEvChargingInput}
                  soc={(modules || []).reduce((acc, m) => acc + (m.avgSoc || 0), 0) / (modules?.length || 1)}
                  totalCapacityWh={(modules || []).reduce((acc, mod) => acc + ((mod.cells?.length || 0) * 5 * 3.7), 0)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-blue-400" />
                    Motor Performance
                  </h3>
                  <div className="flex justify-around items-center mb-6">
                    <MotorGraphic rpm={motorRpm} label="Front Motor" />
                    <MotorGraphic rpm={motorRpm * 0.95} label="Rear Motor" />
                  </div>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Current RPM</div>
                        <div className="text-2xl font-black text-white">{Math.round(motorRpm)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Inverter Frequency</div>
                        <div className="text-2xl font-black text-blue-400">{(motorRpm / 60).toFixed(1)}Hz</div>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-blue-500"
                        animate={{ width: `${(motorRpm / 16000) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-400" />
                    Drive Controls
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-mono uppercase">
                        <span className="text-zinc-500">Accelerator</span>
                        <span className="text-blue-400">{throttle}%</span>
                      </div>
                      <input 
                        type="range"
                        value={throttle}
                        onChange={(e) => setThrottle(parseInt(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-mono uppercase">
                        <span className="text-zinc-500">Regen Braking</span>
                        <span className="text-emerald-400">{regenerativeBraking}%</span>
                      </div>
                      <input 
                        type="range"
                        value={regenerativeBraking}
                        onChange={(e) => setRegenerativeBraking(parseInt(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950 p-12 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center gap-12 relative overflow-hidden">
                <div className="relative w-full max-w-2xl h-48 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-around">
                   <div className="absolute inset-0 bg-blue-500/5 rounded-full" />
                   
                   <div className="relative z-10 flex flex-col items-center gap-2 scale-75">
                     <div className="flex gap-4">
                       <MotorGraphic rpm={motorRpm} label="" />
                       <MotorGraphic rpm={motorRpm * 0.95} label="" />
                     </div>
                     <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-zinc-500">Dual Motor Drive</span>
                   </div>

                   <div className="flex-1 h-px bg-zinc-800 relative mx-8">
                     {motorRpm > 0 && (
                       <motion.div 
                         initial={{ x: -100 }}
                         animate={{ x: 100 }}
                         transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                         className="absolute top-1/2 -translate-y-1/2 w-4 h-1 bg-blue-500 blur-sm"
                       />
                     )}
                   </div>

                   <div className="relative z-10 flex flex-col items-center gap-2">
                     <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl">
                       <Battery className="w-8 h-8 text-emerald-500" />
                     </div>
                     <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-zinc-500">Main Pack</span>
                   </div>
                </div>
              </div>
            </div>
          ) : activeView === 'architecture' ? (
            <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl min-h-[600px] flex flex-col items-center justify-center text-center">
               <Monitor className="w-16 h-16 text-zinc-700 mb-4" />
               <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Structural Battery Architecture (4680)</h3>
               <p className="max-w-md text-sm text-zinc-500 leading-relaxed">
                 The structural battery pack uses large-format 4680 cells to form a rigid substrate that becomes 
                 an integral part of the vehicle's body structure.
               </p>
               <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-xl text-left">
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <div className="text-[9px] font-mono text-zinc-500 uppercase mb-2">Cell Assembly</div>
                    <div className="text-xs text-zinc-300">Cylindrical cells (46mm x 80mm) arranged in a high-density matrix.</div>
                  </div>
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <div className="text-[9px] font-mono text-zinc-500 uppercase mb-2">Voltage Profile</div>
                    <div className="text-xs text-zinc-300">400V Nominal architecture with high-voltage busbar connectivity.</div>
                  </div>
               </div>
            </div>
          ) : null}
        </div>

        {/* Right Column: AI Analysis & Capacity Graph */}
        <div className="xl:col-span-1 space-y-6">
          {/* Capacity History Graph OR AI Insight during Alert */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl min-h-[200px]">
            {isEmergency ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-mono uppercase tracking-widest text-emerald-500">AI Insight</span>
                  </div>
                  <button onClick={() => setAiAnalysis(null)} className="p-1 hover:bg-white/10 rounded-full">
                    <X className="w-3 h-3 text-emerald-500" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Frequency</div>
                      <div className="text-sm font-bold text-purple-400">{(gridFrequency ?? 60).toFixed(3)}Hz</div>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Cyber IQ</div>
                      <div className={`text-sm font-bold ${(cyberSecurityIntegrity ?? 0) > 98 ? 'text-emerald-500' : 'text-red-500'}`}>{(cyberSecurityIntegrity ?? 0).toFixed(1)}%</div>
                    </div>
                  </div>
                  
                  <p className="text-sm font-bold text-emerald-400 leading-tight">
                    {aiAnalysis.alert}
                  </p>
                  <p className="text-xs text-emerald-500/70 leading-relaxed italic border-l-2 border-emerald-500/30 pl-3">
                    {aiAnalysis.recommendation}
                  </p>

                  {(aiAnalysis.servicePerson || aiAnalysis.serviceLocation) && (
                    <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/50 space-y-2">
                       <div className="flex items-center gap-2">
                         <User className="w-3 h-3 text-blue-400" />
                         <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-tighter">Assigned Expert:</span>
                         <span className="text-[10px] font-bold text-blue-300">{aiAnalysis.servicePerson} ({aiAnalysis.servicePersonRating}/5.0)</span>
                       </div>
                       <div 
                         className="flex items-center gap-2 cursor-pointer group"
                         onClick={() => {
                           const station = serviceStations.find(s => s.name === aiAnalysis?.serviceLocation);
                           if (station) {
                             setSelectedStationId(station.id);
                             setActiveView('support');
                           } else {
                             setSelectedStationId(serviceStations[0].id);
                             setActiveView('support');
                           }
                         }}
                       >
                         <MapPin className="w-3 h-3 text-emerald-400 group-hover:text-emerald-200 transition-colors" />
                         <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-tighter">Location:</span>
                         <span className="text-[10px] font-bold text-emerald-300 underline decoration-emerald-500/30 underline-offset-2 group-hover:text-emerald-100 transition-colors">
                           {aiAnalysis.serviceLocation}
                           <ExternalLink className="w-2 h-2 inline ml-1 opacity-50" />
                         </span>
                       </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[8px] font-mono text-zinc-500">
                    <Database className="w-2 h-2" />
                    RESEARCH-DT SYNC: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Capacity History</span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-500">Avg SOC: {capacityHistory[(capacityHistory?.length || 0) - 1]?.soc || 0}%</div>
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
              </>
            )}
          </div>

          <AnimatePresence>
            {isAiMonitoring ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  borderColor: aiAnalysis?.status === 'critical' ? ['#ef4444', '#7f1d1d', '#ef4444'] : '#27272a',
                  borderWidth: aiAnalysis?.status === 'critical' ? 3 : 1,
                  backgroundColor: aiAnalysis?.status === 'critical' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(24, 24, 27, 0.3)'
                }}
                transition={{
                  borderColor: { duration: 1, repeat: Infinity, ease: "easeInOut" },
                  duration: 0.3
                }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 p-5 rounded-3xl border"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className={`text-xs font-mono uppercase tracking-[0.3em] flex items-center gap-2 ${aiAnalysis?.status === 'critical' ? 'text-red-500' : 'text-purple-500'}`}>
                      <Brain className={`w-4 h-4 ${aiAnalysis?.status === 'critical' ? 'animate-bounce' : ''}`} />
                      Energy Soul
                    </h3>
                    <select 
                      value={aiLanguage}
                      onChange={(e: any) => setAiLanguage(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-[9px] text-zinc-500 rounded px-1.5 py-0.5 outline-none focus:border-purple-500 transition-colors cursor-pointer font-mono"
                    >
                      <option value="en">ENG</option>
                      <option value="hi">HIN</option>
                      <option value="ta">TAM</option>
                      <option value="ml">MAL</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => !isAiAnalyzing && runAiAnalysis()}
                      disabled={isAiAnalyzing}
                      className={`p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors ${isAiAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <RefreshCcw className={`w-3 h-3 text-purple-500 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-10 gap-1 opacity-50 grayscale-[0.5]">
                  {(modules[0]?.cells || []).map((cell) => cell && (
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

      <AnimatePresence>
        {selectedModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedModule(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col h-[85vh]"
            >
              <div className="p-8 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <Box className="w-6 h-6 text-blue-500" />
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">{selectedModule.name} Details</h2>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">10-Parallel Optimized Array • Cell Inspection Mode</p>
                </div>
                <button 
                  onClick={() => setSelectedModule(null)}
                  className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full border border-zinc-800 transition-all group"
                >
                  <X className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex gap-8 p-8">
                {/* Cell Grid */}
                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                  <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-5">
                    {selectedModule.cells.map((cell) => {
                      const isSelected = selectedCell?.id === cell.id;
                      return (
                        <motion.button
                          key={cell.id}
                          whileHover={{ scale: 1.15, zIndex: 10 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSelectedCell(cell)}
                          className={`aspect-square rounded-full border-2 flex flex-col items-center justify-center p-1.5 transition-all relative group ${
                            cell.status === 'optimal' ? 'bg-emerald-500/5 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
                            cell.status === 'warning' ? 'bg-yellow-500/5 border-yellow-500/40 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]' :
                            'bg-red-500/5 border-red-500/50 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                          } ${isSelected ? 'ring-2 ring-white border-transparent' : ''} ${aiAnalysis?.badCellIds?.includes(cell.id) ? 'animate-pulse ring-2 ring-red-500 z-10' : ''}`}
                        >
                          <div className={`absolute inset-0 rounded-full opacity-20 pointer-events-none ${cell.status === 'optimal' ? 'bg-emerald-500 shadow-[inset_0_0_15px_rgba(16,185,129,0.3)]' : ''}`} />
                          <Battery className={`w-4 h-4 mb-0.5 ${
                             cell.status === 'optimal' ? 'text-emerald-500' :
                             cell.status === 'warning' ? 'text-yellow-500' : 'text-red-500'
                          }`} />
                          <div className="text-[11px] font-black tracking-tight leading-none">{(cell?.voltage ?? 3.7).toFixed(1)}V</div>
                          <div className="text-[8px] font-mono opacity-60 leading-none mt-0.5">{cell.soc}%</div>
                          {isSelected && (
                            <motion.div 
                              layoutId="selection-ring"
                              className="absolute -inset-1.5 rounded-full border-2 border-white pointer-events-none" 
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Info Panel */}
                <div className="w-80 space-y-6">
                  {selectedCell ? (
                    <motion.div 
                      key={selectedCell.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase mb-4 tracking-widest">Cell Diagnostics</div>
                        <div className="space-y-4">
                          <div>
                            <div className="text-[8px] font-mono text-zinc-600 uppercase mb-1">State of Charge</div>
                            <div className="text-3xl font-black text-white">{selectedCell?.soc ?? 0}%</div>
                            <div className="w-full h-1 bg-zinc-800 rounded-full mt-2">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedCell?.soc ?? 0}%` }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-[8px] font-mono text-zinc-600 uppercase mb-1">Voltage</div>
                              <div className="text-xl font-bold text-blue-400">{(selectedCell?.voltage ?? 0).toFixed(3)}V</div>
                            </div>
                            <div>
                              <div className="text-[8px] font-mono text-zinc-600 uppercase mb-1">Temp</div>
                              <div className="text-xl font-bold text-orange-400">{selectedCell?.temperature ?? 0}°C</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase mb-4 tracking-widest">Quick Actions</div>
                        <div className="space-y-2">
                          <button 
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase rounded-lg transition-all"
                          >
                            Rebalance Cell
                          </button>
                          <button className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-bold uppercase rounded-lg transition-all">
                            Isolation Test
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-zinc-900 rounded-3xl border border-zinc-800 opacity-50">
                      <Zap className="w-8 h-8 text-zinc-700 mb-2" />
                      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Select a cell to view telemetry</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-full px-6 mx-auto mt-8 pt-6 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600 text-[10px] font-mono uppercase tracking-[0.2em]">
        <div className="flex items-center gap-4">
          <span>© 2026 EV Systems Lab • V3.5.0</span>
          {lastSyncStatus && (
            <span className={`flex items-center gap-1 ${lastSyncStatus.success ? 'text-blue-500' : 'text-red-500'}`}>
              <div className={`w-1 h-1 rounded-full ${lastSyncStatus.success ? 'bg-blue-500' : 'bg-red-500'}`} />
              Telemetry Sync: {lastSyncStatus.time}
            </span>
          )}
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-blue-500 transition-colors">Documentation</a>
          <span className="text-zinc-800">|</span>
          <span>Arch: 50 Packs (2500 Cells)</span>
        </div>
      </footer>
    </div>
  );
}
