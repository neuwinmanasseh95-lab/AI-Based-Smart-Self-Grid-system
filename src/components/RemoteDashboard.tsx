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
  Power,
  RefreshCcw
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
}

interface EvSubsystem {
  id: string;
  name: string;
  type: string;
  power: number;
  isOn: boolean;
}

export const RemoteDashboard = ({ 
  onBack, 
  simulationSpeed, 
  setSimulationSpeed,
  modules,
  throttle,
  evChargingInput,
  chargeCycles
}: { 
  onBack: () => void;
  simulationSpeed?: number;
  setSimulationSpeed?: (v: number) => void;
  modules?: any[];
  throttle?: number;
  evChargingInput?: number;
  chargeCycles?: number;
}) => {
  const [subsystems, setSubsystems] = useState<EvSubsystem[]>([
    { id: 'hvac', name: 'Pack Thermal Control', type: 'fan', power: 1200, isOn: true },
    { id: 'coolant', name: 'Active Coolant Pump', type: 'fan', power: 800, isOn: true },
    { id: 'bms', name: 'Master BMS Logic', type: 'cpu', power: 150, isOn: true },
    { id: 'cabin', name: 'Infotainment System', type: 'tv', power: 450, isOn: true },
  ]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const data = useMemo(() => {
    if (!modules || modules.length === 0) return null;
    
    // Average everything across modules
    const allCells = modules.flatMap(m => m.cells || []);
    const avgSoc = allCells.reduce((acc, c) => acc + (c.soc || 0), 0) / (allCells.length || 1);
    const avgTemp = allCells.reduce((acc, c) => acc + (c.temperature || 0), 0) / (allCells.length || 1);
    const avgVoltage = allCells.reduce((acc, c) => acc + (c.voltage || 0), 0) / (allCells.length || 1);
    
    return {
      solarVoltage: evChargingInput ? (evChargingInput / 10) : 0,
      packVoltage: avgVoltage * 100, // assuming 100s configuration for total pack
      loadPowerWatts: (throttle || 0) * 1500, // 150kW max
      loadPowerPercent: throttle || 0,
      soc: Math.round(avgSoc),
      temp: avgTemp,
      current: (throttle || 0) * 4, // simplistic current calc
      anomalyDetected: avgTemp > 65 || avgSoc < 5,
      anomalyDetails: {
        message: avgTemp > 65 ? "Thermal Overload Imminent" : "Critical Low Capacity",
        location: "Module " + (modules[0]?.id || "0")
      }
    };
  }, [modules, throttle, evChargingInput]);

  const toggleSubsystem = (id: string) => {
    setSubsystems(prev => prev.map(sub => 
      sub.id === id ? { ...sub, isOn: !sub.isOn } : sub
    ));
  };

  const calculateRange = () => {
    if (!data) return "0 km";
    const totalLoadPower = subsystems.reduce((acc, sub) => acc + (sub.isOn ? sub.power : 0), 0) + (data.loadPowerWatts || 0);
    const totalEnergyWh = 85000 * (data.soc / 100); // 85kWh pack example
    
    if (totalLoadPower <= 0) return "---";
    
    const hoursRemaining = totalEnergyWh / totalLoadPower;
    const estKmh = (data.current * data.packVoltage / 200); // Rough estimate
    const range = hoursRemaining * estKmh;
    
    return `${Math.round(range)} km`;
  };

  const projectionData = useMemo(() => {
    if (!data) return [];
    const points = [];
    const totalLoadPower = subsystems.reduce((acc, sub) => acc + (sub.isOn ? sub.power : 0), 0) + (data.loadPowerWatts || 0);
    const totalEnergyWh = 85000 * (data.soc / 100);
    
    for (let i = 0; i <= 10; i++) {
        const projectedEnergy = Math.max(0, totalEnergyWh - (totalLoadPower * i));
        const projectedSoc = (projectedEnergy / 85000) * 100;
        points.push({
          hour: `${i}h`,
          soc: Number(projectedSoc.toFixed(1))
        });
        if (projectedSoc <= 0) break;
    }
    return points;
  }, [data, subsystems]);

  const SubsystemIcon = ({ type, isOn }: { type: string; isOn: boolean }) => {
    const color = isOn ? 'text-emerald-400' : 'text-zinc-600';
    switch (type) {
      case 'fan': return <Fan className={`${color} w-5 h-5 ${isOn ? 'animate-spin' : ''}`} />;
      case 'tv': return <Tv className={`${color} w-5 h-5`} />;
      case 'cpu': return <Zap className={`${color} w-5 h-5`} />;
      default: return <Power className={`${color} w-5 h-5`} />;
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
            {setSimulationSpeed && (
              <div className="flex items-center gap-3 border-r border-zinc-800 pr-6 mr-6">
                <Clock className="w-4 h-4 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase text-zinc-500 font-mono tracking-widest">Sim Speed</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={simulationSpeed} 
                      onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                      className="w-24 accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-emerald-400">{simulationSpeed}x</span>
                  </div>
                </div>
              </div>
            )}
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
                  {data?.anomalyDetails?.message ?? "General Hardware Mismatch"} // {data?.anomalyDetails?.location ?? "Master Control Unit"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Solar Voltage</span>
              <Sun className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-5xl font-bold">{(data?.solarVoltage ?? 0).toFixed(1)}V</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Pack Voltage</span>
              <Battery className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-5xl font-bold">{(data?.packVoltage ?? 0).toFixed(1)}V</div>
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
            <div className="text-[10px] font-mono text-zinc-500 mt-2">{(data?.loadPowerWatts ?? 0).toFixed(0)}W TOTAL DRAW</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Charge Cycles</span>
              <RefreshCcw className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-5xl font-bold">{(chargeCycles ?? 0).toFixed(2)}</div>
            <div className="text-[10px] font-mono text-zinc-500 mt-2 uppercase tracking-widest">Lifetime Total</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Est. Range</span>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-5xl font-bold tracking-tighter">{calculateRange()}</div>
            <div className="text-[10px] font-mono text-zinc-500 mt-2 uppercase tracking-widest">Until Depletion</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subsystem Controls */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Power className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Subsystem Status</h3>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                {(subsystems || []).filter(a => a.isOn).length} Active
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subsystems.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => toggleSubsystem(sub.id)}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
                    sub.isOn 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                      : 'bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${sub.isOn ? 'bg-emerald-500/20' : 'bg-zinc-900'}`}>
                      <SubsystemIcon type={sub.type} isOn={sub.isOn} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-bold uppercase tracking-tight">{sub.name}</span>
                      <span className="text-[10px] font-mono opacity-60">{sub.power}W Consumption</span>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${sub.isOn ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-800'}`} />
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
