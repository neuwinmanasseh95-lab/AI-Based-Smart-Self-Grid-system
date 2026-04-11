import { useState, useEffect, useMemo } from 'react';
import { 
  Sun, 
  Battery, 
  Zap, 
  Clock, 
  Activity,
  ShieldAlert,
  TrendingDown,
  ArrowLeft,
  Lightbulb,
  Fan,
  Tv,
  Refrigerator,
  WashingMachine,
  Power
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { SmartHomeAppliance } from './SmartHome';

interface TelemetryData {
  solarVoltage: number;
  packVoltage: number;
  loadPowerWatts: number;
  loadPowerPercent: number;
  soc: number;
  temp: number;
  current: number;
  anomalyDetected: boolean;
  anomalyDetails: {
    message: string;
    location: string;
  };
  metadata?: {
    total_voltage: string;
    avg_temp: string;
    power_source: string;
    solar_voltage: number;
    smart_home_load: number;
  }
}

export const RemoteDashboard = ({ onBack }: { onBack: () => void }) => {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [appliances, setAppliances] = useState<SmartHomeAppliance[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [telemetryRes, appliancesRes] = await Promise.all([
          fetch("/api/telemetry"),
          fetch("/api/appliances")
        ]);
        const telemetry = await telemetryRes.json();
        const apps = await appliancesRes.json();
        setData(telemetry);
        setAppliances(apps);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleAppliance = async (id: string) => {
    const updated = appliances.map(app => 
      app.id === id ? { ...app, isOn: !app.isOn } : app
    );
    setAppliances(updated);
    
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

  const calculateRuntime = () => {
    if (!data) return "00:00";
    const totalLoadPower = appliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0);
    const solarChargingPower = data.solarVoltage > 0 ? (data.solarVoltage * 0.5) : 0;
    const netPower = totalLoadPower - solarChargingPower;
    
    if (netPower <= 0) return "∞";
    
    const totalEnergyWh = 80 * 5 * 3.7 * (data.soc / 100);
    const hoursRemaining = totalEnergyWh / netPower;
    
    const h = Math.floor(hoursRemaining);
    const m = Math.floor((hoursRemaining - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const projectionData = useMemo(() => {
    if (!data) return [];
    const points = [];
    const totalLoadPower = appliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0);
    const netPower = totalLoadPower - (data.solarVoltage * 0.5);
    const totalEnergyWh = 80 * 5 * 3.7 * (data.soc / 100);
    
    for (let i = 0; i <= 12; i++) {
      const projectedEnergy = Math.max(0, totalEnergyWh - (netPower * i));
      const projectedSoc = (projectedEnergy / (80 * 5 * 3.7)) * 100;
      points.push({
        hour: `${i}h`,
        soc: Number(projectedSoc.toFixed(1))
      });
      if (projectedSoc <= 0) break;
    }
    return points;
  }, [data, appliances]);

  const ApplianceIcon = ({ type, isOn }: { type: string; isOn: boolean }) => {
    const color = isOn ? 'text-yellow-400' : 'text-zinc-600';
    switch (type) {
      case 'light': return <Lightbulb className={`${color} w-5 h-5`} />;
      case 'fan': return <Fan className={`${color} w-5 h-5 ${isOn ? 'animate-spin' : ''}`} />;
      case 'tv': return <Tv className={`${color} w-5 h-5`} />;
      case 'refrigerator': return <Refrigerator className={`${color} w-5 h-5`} />;
      case 'washing_machine': return <WashingMachine className={`${color} w-5 h-5`} />;
      default: return <Zap className={`${color} w-5 h-5`} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-zinc-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                <Activity className="text-emerald-500" />
                REMOTE DASHBOARD
              </h1>
              <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em]">
                Standalone Control & Monitoring
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-zinc-900/50 border border-zinc-800 px-6 py-3 rounded-2xl">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-xl font-mono font-bold text-white">
                {currentTime.toLocaleTimeString([], { hour12: false })}
              </span>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {data?.anomalyDetected && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border-2 border-red-500 p-6 rounded-3xl flex items-center gap-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
            >
              <ShieldAlert className="w-8 h-8 text-red-500" />
              <div>
                <h2 className="text-xl font-bold text-white uppercase">CRITICAL SYSTEM ANOMALY</h2>
                <p className="text-red-400 font-mono text-xs mt-1">
                  {data.anomalyDetails.message} // {data.anomalyDetails.location}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Solar Voltage</span>
              <Sun className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-5xl font-bold">{data?.solarVoltage.toFixed(1)}V</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Pack Voltage</span>
              <Battery className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-5xl font-bold">{data?.packVoltage.toFixed(1)}V</div>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${data?.soc}%` }} />
              </div>
              <span className="text-[10px] font-bold text-emerald-500">{data?.soc}%</span>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Load Power</span>
              <Zap className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-5xl font-bold">{Math.round(data?.loadPowerPercent || 0)}%</div>
            <div className="text-[10px] font-mono text-zinc-500 mt-2">{data?.loadPowerWatts.toFixed(0)}W TOTAL DRAW</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Est. Runtime</span>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-5xl font-bold">{calculateRuntime()}</div>
            <div className="text-[10px] font-mono text-zinc-500 mt-2 uppercase tracking-widest">Until Depletion</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Appliance Controls */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Power className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Appliance Controls</h3>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                {appliances.filter(a => a.isOn).length} Active
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {appliances.map((app) => (
                <button
                  key={app.id}
                  onClick={() => toggleAppliance(app.id)}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
                    app.isOn 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                      : 'bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${app.isOn ? 'bg-emerald-500/20' : 'bg-zinc-900'}`}>
                      <ApplianceIcon type={app.type} isOn={app.isOn} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-bold uppercase tracking-tight">{app.name}</span>
                      <span className="text-[10px] font-mono opacity-60">{app.power}W Distribution</span>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${app.isOn ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-800'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Runtime Projection */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
            <div className="flex items-center gap-3 mb-8">
              <TrendingDown className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Runtime Projection</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                  <XAxis dataKey="hour" stroke="#52525b" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#52525b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a' }} />
                  <Area type="monotone" dataKey="soc" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
