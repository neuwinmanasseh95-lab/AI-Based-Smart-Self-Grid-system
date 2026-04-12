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
  Wind
} from 'lucide-react';
import { motion } from 'motion/react';

export interface SmartHomeAppliance {
  id: string;
  name: string;
  type: 'light' | 'fan' | 'tv' | 'refrigerator' | 'washing_machine' | 'air_conditioner';
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
        <div className={`relative w-10 h-7 rounded-sm border-2 transition-all duration-500 ${isOn ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-zinc-800 bg-zinc-900'}`}>
          <Tv className={`absolute inset-0 m-auto w-4 h-4 ${isOn ? 'text-blue-400' : 'text-zinc-700'}`} />
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
        <div className={`relative w-10 h-10 rounded-lg border-2 transition-all duration-500 ${isOn ? 'border-blue-400 bg-zinc-800 shadow-lg' : 'border-zinc-800 bg-zinc-900'}`}>
          <div className="absolute top-1 left-1 right-1 h-2 bg-zinc-900 rounded-sm flex items-center px-1 gap-0.5">
            <div className={`w-1 h-1 rounded-full ${isOn ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-800'}`} />
            <div className="w-4 h-0.5 bg-zinc-800 rounded-full" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center mt-2">
            <motion.div 
              animate={{ rotate: isOn ? 360 : 0 }} 
              transition={{ repeat: Infinity, duration: isOn ? 0.2 : 0, ease: "linear" }}
              className={`w-6 h-6 rounded-full border-2 border-dashed ${isOn ? 'border-blue-400/50' : 'border-zinc-800'}`}
            >
              <WashingMachine className={`w-full h-full p-1 ${isOn ? 'text-blue-300' : 'text-zinc-700'}`} />
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
        <div className={`relative w-14 h-8 rounded-md border-2 transition-all duration-500 ${isOn ? 'border-cyan-400 bg-zinc-800 shadow-[0_0_25px_rgba(34,211,238,0.4)]' : 'border-zinc-800 bg-zinc-900'}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <Wind className={`${isOn ? 'text-cyan-400' : 'text-zinc-700'} w-6 h-6 ${isOn ? 'animate-pulse' : ''}`} />
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
              
              {/* Intense Compressor Vibration */}
              <motion.div 
                animate={{ 
                  x: [-0.8, 0.8, -0.8],
                  y: [-0.8, 0.8, -0.8] 
                }}
                transition={{ repeat: Infinity, duration: 0.04 }}
                className="absolute inset-0 border border-cyan-400/30 rounded-md"
              />

              {/* Rapid Power Indicator */}
              <motion.div 
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.2 }}
                className="absolute top-1 right-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_5px_rgba(34,211,238,1)]"
              />
            </>
          )}
          <div className="absolute bottom-1 left-2 right-2 h-0.5 bg-zinc-700 rounded-full opacity-50" />
        </div>
      );
      default: return <Zap className={`${color} w-6 h-6`} />;
    }
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

      {/* Floor Plan Simulation */}
      <div className="flex-1 relative bg-zinc-900/20 border border-zinc-800 rounded-[2.5rem] overflow-hidden p-8 flex flex-col items-center justify-center gap-8">
        <div className="relative w-full max-w-4xl aspect-[4/3] border-4 border-zinc-700 rounded-lg overflow-hidden bg-zinc-950 shadow-2xl">
          {/* Room Dividers (Matching the image) */}
          {/* Horizontal divider */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-700" />
          {/* Vertical divider (bottom half) */}
          <div className="absolute top-1/2 left-[45%] w-1 h-1/2 bg-zinc-700" />
          
          {/* Appliances */}
          {appliances.map((app) => (
            <div 
              key={app.id}
              className="absolute group"
              style={{ left: `${app.x}%`, top: `${app.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <button
                onClick={() => onToggle(app.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 ${
                  app.isOn 
                    ? 'bg-zinc-800/80 border-zinc-600 shadow-lg' 
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

        {/* Summary at the end of simulation */}
        <div className="w-full max-w-4xl flex items-center justify-between bg-zinc-900/80 border border-zinc-700 p-6 rounded-3xl backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-orange-500/20 rounded-2xl border border-orange-500/50">
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Total Power Consumption</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">{totalPower}</span>
                <span className="text-xl font-bold text-orange-500">W</span>
              </div>
            </div>
          </div>

          <div className="h-16 w-px bg-zinc-800" />

          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest text-right block">Pack Estimated Time</span>
              <div className="flex items-center gap-3 justify-end">
                <Clock className="w-6 h-6 text-emerald-500" />
                <span className="text-4xl font-black text-emerald-500">{estimatedTime}</span>
              </div>
            </div>
            <div className="p-4 bg-emerald-500/20 rounded-2xl border border-emerald-500/50">
              <Battery className="w-8 h-8 text-emerald-500" />
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
