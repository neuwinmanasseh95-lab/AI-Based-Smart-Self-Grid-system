import { useState, useMemo } from 'react';
import { 
  Lightbulb, 
  Fan, 
  Tv, 
  Refrigerator, 
  WashingMachine, 
  Zap, 
  Clock,
  ArrowLeft,
  Power,
  Battery,
  Wind,
  Car,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';

export interface SmartHomeAppliance {
  id: string;
  name: string;
  type: 'light' | 'fan' | 'tv' | 'refrigerator' | 'washing_machine' | 'air_conditioner' | 'ev_charger' | 'grid_gateway';
  power: number; // Watts
  isOn: boolean;
  x: number; // % from left
  y: number; // % from top
}

interface SmartHomeProps {
  appliances: SmartHomeAppliance[];
  onToggle: (id: string) => void;
  onBack: () => void;
  estimatedTime: string;
}

export const SmartHome = ({ appliances, onToggle, onBack, estimatedTime }: SmartHomeProps) => {
  const totalPower = useMemo(() => {
    return appliances.reduce((acc, app) => acc + (app.isOn ? app.power : 0), 0);
  }, [appliances]);

  const ApplianceIcon = ({ type, isOn }: { type: string; isOn: boolean }) => {
    const color = isOn ? 'text-yellow-400' : 'text-zinc-600';
    
    switch (type) {
      case 'light': return (
        <div className="relative">
          {/* Ceiling Mount Stem if high up */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-zinc-700 rounded-full opacity-40" />
          <Lightbulb className={`${color} w-6 h-6 transition-all duration-500 ${isOn ? 'drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] scale-110' : ''}`} />
          {isOn && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full"
            />
          )}
        </div>
      );
      case 'fan': return (
        <div className="relative p-1 border-2 border-zinc-800 rounded-full">
          {/* Ceiling Stem */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-1 h-6 bg-zinc-700/60 rounded-full" />
          <motion.div 
            animate={{ rotate: isOn ? 360 : 0 }} 
            transition={{ repeat: Infinity, duration: isOn ? 0.4 : 0, ease: "linear" }}
            className="relative"
          >
            <Fan className={`${color} w-6 h-6`} />
            {isOn && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_5px_white]" />
              </div>
            )}
          </motion.div>
          {isOn && (
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute -inset-1 border border-emerald-500/30 rounded-full"
            />
          )}
        </div>
      );
      case 'tv': return (
        <div className={`relative w-14 h-9 rounded-sm border-[3px] transition-all duration-500 ${isOn ? 'border-zinc-700 bg-black shadow-[0_0_25px_rgba(59,130,246,0.2)]' : 'border-zinc-800 bg-zinc-900'}`}>
          {/* Wall Bracket Shadow */}
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-zinc-800 rounded-full blur-[1px]" />
          <Tv className={`absolute inset-0 m-auto w-6 h-6 ${isOn ? 'text-blue-400' : 'text-zinc-700'}`} />
          {isOn && (
            <motion.div 
              animate={{ opacity: [0.4, 0.7, 0.4], x: [-1, 1, -1] }}
              transition={{ repeat: Infinity, duration: 0.05 }}
              className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-white/5 overflow-hidden"
            >
              <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(255,255,255,0.05)_1px,rgba(255,255,255,0.05)_2px)]" />
            </motion.div>
          )}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-zinc-700 rounded-full" />
        </div>
      );
      case 'refrigerator': return (
        <div className={`relative w-8 h-12 rounded-md border-2 transition-all duration-500 ${isOn ? 'border-emerald-500/50 bg-zinc-800 shadow-inner' : 'border-zinc-800 bg-zinc-900'}`}>
          <Refrigerator className={`absolute inset-0 m-auto w-5 h-5 ${isOn ? 'text-emerald-400' : 'text-zinc-700'}`} />
          {isOn && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
              <motion.div 
                animate={{ height: [2, 4, 2] }}
                transition={{ repeat: Infinity, duration: 0.3 }}
                className="w-0.5 bg-emerald-500/50 rounded-full"
              />
              <motion.div 
                animate={{ height: [4, 2, 4] }}
                transition={{ repeat: Infinity, duration: 0.3 }}
                className="w-0.5 bg-emerald-500/50 rounded-full"
              />
            </div>
          )}
          {/* Compressor Hum Animation */}
          {isOn && (
            <motion.div 
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 0.1 }}
              className="absolute inset-0 border border-emerald-500/10 rounded-md"
            />
          )}
          <div className="absolute top-4 right-1 w-0.5 h-3 bg-zinc-700 rounded-full" />
        </div>
      );
      case 'washing_machine': return (
        <div className={`relative w-14 h-14 rounded-lg border-2 transition-all duration-500 ${isOn ? 'border-blue-400 bg-zinc-800 shadow-lg' : 'border-zinc-800 bg-zinc-900'}`}>
          <div className="absolute top-1 left-1 right-1 h-3 bg-zinc-900 rounded-sm flex items-center px-1 gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-800'}`} />
            <div className="w-6 h-1 bg-zinc-800 rounded-full" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center mt-3">
            <motion.div 
              animate={{ rotate: isOn ? 360 : 0 }} 
              transition={{ repeat: Infinity, duration: isOn ? 0.2 : 0, ease: "linear" }}
              className={`w-9 h-9 rounded-full border-2 border-dashed ${isOn ? 'border-blue-400/50' : 'border-zinc-800'}`}
            >
              <WashingMachine className={`w-full h-full p-1.5 ${isOn ? 'text-blue-300' : 'text-zinc-700'}`} />
            </motion.div>
          </div>
          {isOn && (
            <motion.div 
              animate={{ x: [-0.5, 0.5, -0.5], y: [-0.5, 0.5, -0.5] }}
              transition={{ repeat: Infinity, duration: 0.05 }}
              className="absolute inset-0 border border-white/5 rounded-lg"
            />
          )}
        </div>
      );
      case 'air_conditioner': return (
        <div className={`relative w-16 h-7 rounded-sm border-2 transition-all duration-500 ${isOn ? 'border-zinc-600 bg-zinc-800 shadow-[0_10px_20px_rgba(0,0,0,0.5)]' : 'border-zinc-800 bg-zinc-900'}`}>
          {/* Ceiling Mount Interface */}
          <div className="absolute -top-1 left-4 right-4 h-1 bg-zinc-700 opacity-50 rounded-t-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Wind className={`${isOn ? 'text-cyan-400' : 'text-zinc-700'} w-6 h-4 ${isOn ? 'animate-pulse' : ''}`} />
          </div>
          {isOn && (
            <>
              {/* High Power Pulsating Glow */}
              <motion.div 
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="absolute inset-0 bg-cyan-400/10 rounded-md"
              />
              
              {/* Air Flow Particles */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, opacity: 0 }}
                  animate={{ x: 25, opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                  className="absolute right-0 top-1/2 w-3 h-0.5 bg-cyan-400/60 rounded-full"
                  style={{ top: `${25 + i * 25}%` }}
                />
              ))}
            </>
          )}
          <div className="absolute bottom-1 left-2 right-2 h-0.5 bg-zinc-700 rounded-full opacity-50" />
        </div>
      );
      case 'ev_charger': return (
        <div className={`relative w-12 h-12 rounded-xl border-2 transition-all duration-500 ${isOn ? 'border-emerald-400 bg-emerald-950/20 shadow-[0_0_30px_rgba(52,211,153,0.3)]' : 'border-zinc-800 bg-zinc-900'}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <Car className={`${isOn ? 'text-emerald-400' : 'text-zinc-700'} w-7 h-7`} />
          </div>
          {isOn && (
            <motion.div 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute -top-1 -right-1"
            >
              <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            </motion.div>
          )}
        </div>
      );
      case 'grid_gateway': return (
        <div className={`relative w-12 h-12 rounded-full border-2 transition-all duration-500 ${isOn ? 'border-purple-400 bg-purple-950/20 shadow-[0_0_30px_rgba(168,85,247,0.3)]' : 'border-zinc-800 bg-zinc-900'}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <Globe className={`${isOn ? 'text-purple-400' : 'text-zinc-700'} w-6 h-6`} />
          </div>
          {isOn && (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-purple-400/30 rounded-full"
            />
          )}
        </div>
      );
      default: return <Zap className={`${color} w-6 h-6`} />;
    }
  };

  const [automationLog, setAutomationLog] = useState<{msg: string, time: string}[]>([
    { msg: "System Booting: Neural Network Linked", time: new Date().toLocaleTimeString() },
    { msg: "IoT Gateway: Handshake Successful with Grid", time: new Date().toLocaleTimeString() }
  ]);

  const addLog = (msg: string) => {
    setAutomationLog(prev => [{ msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
  };

  const handleScenario = (scenario: 'away' | 'night' | 'eco') => {
    let affected = 0;
    const nightLoads = ['ref1', 'gw1', 'l3'];
    const ecoThreshold = 300;

    appliances.forEach(app => {
      if (scenario === 'away' && app.isOn && app.id !== 'gw1' && app.id !== 'ref1') {
        onToggle(app.id);
        affected++;
      }
      if (scenario === 'night') {
        if (!nightLoads.includes(app.id) && app.isOn) {
          onToggle(app.id);
          affected++;
        }
        if (app.id === 'l3' && !app.isOn) {
          onToggle(app.id);
          affected++;
        }
      }
      if (scenario === 'eco' && app.isOn && app.power > ecoThreshold) {
        onToggle(app.id);
        affected++;
      }
    });
    addLog(`Scenario: ${scenario.toUpperCase()} - Modified ${affected} devices`);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SMART HOME SIMULATION</h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Load Control Center</p>
          </div>
        </div>
      </div>

      {/* Automation Scenarios */}
      <div className="grid grid-cols-3 gap-4">
        {(['away', 'night', 'eco'] as const).map(scenario => (
          <button
            key={scenario}
            onClick={() => handleScenario(scenario)}
            className="group relative overflow-hidden bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            {scenario === 'away' ? <Power className="w-5 h-5 text-orange-500" /> : scenario === 'night' ? <Clock className="w-5 h-5 text-purple-400" /> : <Zap className="w-5 h-5 text-emerald-400" />}
            <span className="text-[10px] font-bold uppercase tracking-widest">{scenario} Mode</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Floor Plan Simulation */}
        <div className="flex-[3] relative bg-zinc-900/10 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden p-8 flex flex-col items-center justify-center gap-8">
          <div className="relative w-full max-w-4xl aspect-[4/3] border-8 border-zinc-900 rounded-3xl overflow-hidden bg-[#121212] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
          {/* Roof Structure */}
          <div className="absolute top-0 left-0 w-full h-[30%] bg-zinc-900/40">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[500px] border-l-transparent border-r-[500px] border-r-transparent border-b-[150px] border-b-zinc-800" />
          </div>

          {/* Floors & Walls */}
          {/* Ground Floor Ceiling / First Floor Floor */}
          <div className="absolute top-[60%] left-0 w-full h-2 bg-zinc-700 shadow-lg" />
          
          {/* Central Dividing Wall / Stairs area */}
          <div className="absolute top-[30%] left-[48%] w-1.5 h-[70%] bg-zinc-700" />
          
          {/* Room Labels */}
          <div className="absolute top-[65%] left-[5%] text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Living Room</div>
          <div className="absolute top-[65%] left-[55%] text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Smart Kitchen</div>
          <div className="absolute top-[35%] left-[5%] text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Loft / Study</div>
          <div className="absolute top-[35%] left-[55%] text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Master Bedroom</div>

          {/* Stairs Decoration */}
          <div className="absolute top-[60%] left-[40%] w-[10%] h-[40%] border-r-4 border-t-4 border-zinc-800/50 rounded-tr-3xl" />
          
          {/* Appliances */}
          {appliances.map((app) => (
            <div 
              key={app.id}
              className="absolute group"
              style={{ left: `${app.x}%`, top: `${app.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <button
                onClick={() => {
                  onToggle(app.id);
                  addLog(`${app.isOn ? 'Disabled' : 'Enabled'} ${app.name}`);
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 ${
                  app.isOn 
                    ? 'bg-zinc-800/80 border-zinc-600 shadow-[0_10px_20px_rgba(0,0,0,0.3)]' 
                    : 'bg-transparent border-transparent hover:bg-zinc-900/50'
                } border`}
              >
                <ApplianceIcon type={app.type} isOn={app.isOn} />
                <div className="flex flex-col items-center">
                  <span className={`text-[8px] font-bold uppercase tracking-tighter ${app.isOn ? 'text-white' : 'text-zinc-500'}`}>
                    {app.name}
                  </span>
                  <span className="text-[6px] font-mono text-zinc-600">{app.power}W</span>
                </div>
                
                {/* Status Indicator */}
                <div className={`w-1 h-1 rounded-full mt-1 ${app.isOn ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'bg-zinc-700'}`} />
              </button>
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-zinc-800">
                Click to {app.isOn ? 'Turn Off' : 'Turn On'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar: Activity & Summary */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Automation Log */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-3xl flex-1 min-h-0 flex flex-col">
            <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap className="w-3 h-3 text-emerald-500" />
              Intelligence Log
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {automationLog.map((log, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className="p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl flex flex-col"
                >
                  <span className="text-[7px] font-mono text-zinc-600 mb-1">{log.time}</span>
                  <p className="text-[9px] font-bold text-zinc-300 tracking-tight">{log.msg}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-3xl backdrop-blur-md shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/50">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-[0.2em] mb-1 block">Live Load</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">{totalPower}</span>
                  <span className="text-sm font-bold text-orange-500">W</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/50">
                <Battery className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-[0.2em] mb-1 block">Grid Reach</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-emerald-500">{estimatedTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel List */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {appliances.map((app) => (
          <button
            key={app.id}
            onClick={() => onToggle(app.id)}
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
              app.isOn 
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' 
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <ApplianceIcon type={app.type} isOn={app.isOn} />
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold uppercase">{app.name}</span>
                <span className="text-[8px] font-mono opacity-60">{app.power}W</span>
              </div>
            </div>
            <Power className={`w-4 h-4 ${app.isOn ? 'opacity-100' : 'opacity-20'}`} />
          </button>
        ))}
      </div>
    </div>
  );
};
