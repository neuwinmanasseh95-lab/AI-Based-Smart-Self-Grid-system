import { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Sun, 
  Battery, 
  Activity, 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  Power, 
  Settings, 
  Wifi, 
  WifiOff,
  Lightbulb,
  Tv,
  Wind,
  Refrigerator,
  Fan,
  WashingMachine
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PowerSankey } from './components/PowerSankey';

interface Telemetry {
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

interface Appliance {
  id: string;
  name: string;
  type: string;
  power: number;
  isOn: boolean;
  x: number;
  y: number;
}

interface AIAnalysis {
  alert: string;
  status: 'normal' | 'warning' | 'critical';
  recommendation: string;
}

export default function App() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Polling logic
  useEffect(() => {
    if (!isConnected || !sourceUrl) return;

    const interval = setInterval(async () => {
      try {
        const baseUrl = sourceUrl.endsWith('/') ? sourceUrl.slice(0, -1) : sourceUrl;
        
        // Fetch Telemetry
        const telRes = await fetch(`${baseUrl}/api/telemetry`);
        const telData = await telRes.json();
        setTelemetry(telData);

        // Fetch Appliances
        const appRes = await fetch(`${baseUrl}/api/appliances`);
        const appData = await appRes.json();
        setAppliances(appData);

        // Fetch AI Analysis (Mocked or from telemetry if available)
        // In this setup, we'll assume the source app pushes AI alerts to telemetry or a specific endpoint
        // For simplicity, we'll check if telemetry has anomaly details
        if (telData.anomalyDetected) {
          setAiAnalysis({
            alert: telData.anomalyDetails.message,
            status: 'critical',
            recommendation: "Check physical connections immediately."
          });
        }

        setLastUpdate(new Date());
      } catch (e) {
        console.error("Sync failed:", e);
        setIsConnected(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected, sourceUrl]);

  const toggleAppliance = async (id: string) => {
    if (!sourceUrl) return;
    const baseUrl = sourceUrl.endsWith('/') ? sourceUrl.slice(0, -1) : sourceUrl;
    
    const updated = appliances.map(app => 
      app.id === id ? { ...app, isOn: !app.isOn } : app
    );
    setAppliances(updated);

    try {
      await fetch(`${baseUrl}/api/appliances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error("Failed to toggle appliance:", e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'light': return <Lightbulb className="w-5 h-5" />;
      case 'tv': return <Tv className="w-5 h-5" />;
      case 'air_conditioner': return <Wind className="w-5 h-5" />;
      case 'refrigerator': return <Refrigerator className="w-5 h-5" />;
      case 'fan': return <Fan className="w-5 h-5" />;
      case 'washing_machine': return <WashingMachine className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">Remote Command Center</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter">
              BMS <span className="text-emerald-500">REMOTE</span> DASHBOARD
            </h1>
          </div>

          <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 p-2 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-lg border border-zinc-800">
              {isConnected ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-zinc-600" />}
              <input 
                type="text" 
                placeholder="Enter Source URL..." 
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-mono w-48 text-zinc-300"
              />
            </div>
            <button 
              onClick={() => setIsConnected(!isConnected)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isConnected 
                ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' 
                : 'bg-emerald-500 text-black hover:bg-emerald-400'
              }`}
            >
              {isConnected ? 'DISCONNECT' : 'CONNECT'}
            </button>
          </div>
        </header>

        {!isConnected ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800">
              <Settings className="w-8 h-8 text-zinc-700 animate-spin-slow" />
            </div>
            <h2 className="text-xl font-medium text-zinc-400 mb-2">System Offline</h2>
            <p className="text-zinc-600 text-sm max-w-xs">
              Enter the API URL of your main BMS application to begin real-time telemetry synchronization.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Energy Flow & AI */}
            <div className="lg:col-span-7 space-y-6">
              {/* Sankey Card */}
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 backdrop-blur-md">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Zap className="w-5 h-5 text-orange-500" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Energy Distribution</h3>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    LIVE SYNC: {lastUpdate?.toLocaleTimeString()}
                  </div>
                </div>
                
                <div className="h-[300px] w-full">
                  <PowerSankey 
                    solarPower={telemetry ? (telemetry.solarVoltage / 300) * 500 : 0}
                    batteryPower={telemetry ? (telemetry.current * telemetry.packVoltage) : 0}
                    loadPower={telemetry?.loadPowerWatts || 0}
                    width={500}
                    height={250}
                  />
                </div>
              </div>

              {/* AI Alerts */}
              <AnimatePresence>
                {aiAnalysis && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-6 rounded-3xl border ${
                      aiAnalysis.status === 'critical' 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-2xl ${
                        aiAnalysis.status === 'critical' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                      }`}>
                        <AlertTriangle className={`w-6 h-6 ${
                          aiAnalysis.status === 'critical' ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-bold uppercase tracking-tighter ${
                            aiAnalysis.status === 'critical' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            AI System Alert: {aiAnalysis.status.toUpperCase()}
                          </h4>
                          <Brain className="w-4 h-4 text-purple-500 animate-pulse" />
                        </div>
                        <p className="text-zinc-200 text-lg font-medium mb-3 leading-tight">
                          {aiAnalysis.alert}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-black/20 p-3 rounded-xl border border-white/5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="font-mono uppercase tracking-wider">Recommendation:</span>
                          <span className="text-zinc-300">{aiAnalysis.recommendation}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Smart Home Controls */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 backdrop-blur-md h-full">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Power className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Smart Home Control</h3>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {appliances.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => toggleAppliance(app.id)}
                      className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                        app.isOn 
                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl transition-colors ${
                          app.isOn ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {getIcon(app.type)}
                        </div>
                        <div className="text-left">
                          <div className={`text-sm font-bold tracking-tight transition-colors ${
                            app.isOn ? 'text-white' : 'text-zinc-500'
                          }`}>
                            {app.name.toUpperCase()}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-600">
                            CONSUMPTION: {app.power}W
                          </div>
                        </div>
                      </div>
                      
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                        app.isOn 
                        ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-600'
                      }`}>
                        <Power className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-800/50">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Total Load</div>
                      <div className="text-3xl font-bold tracking-tighter text-white">
                        {appliances.reduce((acc, a) => acc + (a.isOn ? a.power : 0), 0)}<span className="text-emerald-500 ml-1">W</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Active Devices</div>
                      <div className="text-xl font-bold text-zinc-300">
                        {appliances.filter(a => a.isOn).length} / {appliances.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
