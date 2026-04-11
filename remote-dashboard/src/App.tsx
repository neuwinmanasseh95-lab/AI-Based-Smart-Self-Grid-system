import { useState, useEffect, useMemo } from 'react';
import { 
  Sun, 
  Battery, 
  Zap, 
  Clock, 
  ShieldAlert, 
  TrendingDown,
  Activity,
  Thermometer
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
import { motion, AnimatePresence } from 'framer-motion';

// CONFIG: The URL of your main BMS application
const BMS_API_URL = "https://ais-dev-ud52njvxjdxjr24b3mxiyf-455245030455.asia-southeast1.run.app/api/telemetry";

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

export default function App() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(false);

  // 1. REAL-TIME CLOCK
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. API INTEGRATION (Fetching from the BMS App)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(BMS_API_URL);
        if (!response.ok) throw new Error('API Offline');
        const result = await response.json();
        setData(result);
        setIsOnline(true);
      } catch (err) {
        console.error("Connection failed:", err);
        setIsOnline(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // 3. GRAPHICAL ESTIMATED TIME (Projection)
  const projectionData = useMemo(() => {
    if (!data) return [];
    const points = [];
    const netPower = data.loadPowerWatts - (data.solarVoltage * 0.5);
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
  }, [data]);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP BAR: Title & Clock */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800 pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4">
              <Activity className="text-emerald-500 w-10 h-10" />
              REMOTE BMS HUB
            </h1>
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.3em] mt-2">
              Satellite Link Status: <span className={isOnline ? "text-emerald-500" : "text-red-500"}>
                {isOnline ? "ENCRYPTED & ONLINE" : "LINK INTERRUPTED"}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-8 bg-zinc-900/40 border border-zinc-800 px-8 py-4 rounded-3xl">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">System Time</span>
              <span className="text-3xl font-mono font-bold">
                {currentTime.toLocaleTimeString([], { hour12: false })}
              </span>
            </div>
            <Clock className="w-8 h-8 text-zinc-600" />
          </div>
        </header>

        {/* AI CRITICAL ALERT SECTION */}
        <AnimatePresence>
          {data?.anomalyDetected && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-600/10 border-2 border-red-600 p-8 rounded-[2.5rem] flex items-center gap-8 shadow-[0_0_50px_rgba(220,38,38,0.2)]"
            >
              <div className="p-5 bg-red-600 rounded-2xl animate-pulse">
                <ShieldAlert className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">AI CRITICAL ANOMALY DETECTED</h2>
                <p className="text-red-400 font-mono text-sm mt-1">
                  {data.anomalyDetails.message}
                </p>
                <div className="mt-3 inline-block bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                  Location: {data.anomalyDetails.location}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* SOLAR VOLTAGE */}
          <div className="bg-zinc-900/30 border border-zinc-800 p-10 rounded-[2.5rem] space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Solar Input</span>
              <Sun className="w-6 h-6 text-yellow-500 group-hover:rotate-90 transition-transform duration-500" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-7xl font-black">{data?.solarVoltage.toFixed(1)}</span>
              <span className="text-2xl font-medium text-zinc-600">V</span>
            </div>
          </div>

          {/* BATTERY PACK VOLTAGE */}
          <div className="bg-zinc-900/30 border border-zinc-800 p-10 rounded-[2.5rem] space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Pack Voltage</span>
              <Battery className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-7xl font-black">{data?.packVoltage.toFixed(1)}</span>
              <span className="text-2xl font-medium text-zinc-600">V</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${data?.soc}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-emerald-500">{data?.soc}% SOC</span>
            </div>
          </div>

          {/* LOAD POWER PERCENTAGE */}
          <div className="bg-zinc-900/30 border border-zinc-800 p-10 rounded-[2.5rem] space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Load Power</span>
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-7xl font-black">{Math.round(data?.loadPowerPercent || 0)}</span>
              <span className="text-2xl font-medium text-zinc-600">%</span>
            </div>
            <div className="text-xs font-mono text-zinc-500 uppercase">
              Actual: {data?.loadPowerWatts.toFixed(0)}W
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: GRAPH & THERMALS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* GRAPHICAL ESTIMATED TIME */}
          <div className="lg:col-span-3 bg-zinc-900/30 border border-zinc-800 p-10 rounded-[2.5rem] space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <TrendingDown className="text-emerald-500" />
                <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400">Estimated Capacity Projection</h3>
              </div>
              <div className="text-[10px] font-mono text-zinc-600 uppercase border border-zinc-800 px-3 py-1 rounded-full">
                12H Simulation Window
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData}>
                  <defs>
                    <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#52525b" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    stroke="#52525b" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #27272a', borderRadius: '16px', fontSize: '12px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="soc" 
                    stroke="#10b981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorSoc)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SECONDARY TELEMETRY */}
          <div className="space-y-8">
            <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-[2.5rem] space-y-8">
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Live Diagnostics</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Thermometer className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs text-zinc-400">Core Temp</span>
                  </div>
                  <span className="text-xl font-bold">{data?.temp.toFixed(1)}°C</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs text-zinc-400">Net Current</span>
                  </div>
                  <span className="text-xl font-bold">{data?.current.toFixed(2)}A</span>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Health Index</span>
                    <span className="text-xs font-bold text-emerald-500">OPTIMAL</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem]">
              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed uppercase tracking-wider">
                System is operating within nominal safety parameters. Satellite link is stable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
