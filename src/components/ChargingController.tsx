import { useState, useEffect } from 'react';
import { Zap, BatteryCharging, Clock, AlertCircle } from 'lucide-react';

interface ChargingControllerProps {
  currentPower: number;
  onPowerChange: (power: number) => void;
  soc: number;
  totalCapacityWh: number;
}

export const ChargingController = ({ currentPower, onPowerChange, soc, totalCapacityWh }: ChargingControllerProps) => {
  const [targetPower, setTargetPower] = useState(currentPower);
  
  // Calculate remaining energy to fill (100% - SOC)
  const energyNeededWh = (totalCapacityWh * (100 - soc)) / 100;
  
  // Estimated time in hours
  const estTimeHours = currentPower > 0 ? (energyNeededWh / currentPower) : Infinity;
  const hours = Math.floor(estTimeHours);
  const minutes = Math.round((estTimeHours - hours) * 60);

  const powerLevels = [
    { label: '0kW', value: 0 },
    { label: '3.7kW', value: 3700 },
    { label: '7.4kW', value: 7400 },
    { label: '11kW', value: 11000 },
    { label: '22kW', value: 22000 },
  ];

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BatteryCharging className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">EV Charging Controller</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase ${currentPower > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
          {currentPower > 0 ? 'Active' : 'Idle'}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {powerLevels.map((level) => (
          <button
            key={level.label}
            onClick={() => onPowerChange(level.value)}
            className={`py-3 px-2 rounded-xl text-xs font-mono transition-all ${
              currentPower === level.value
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-zinc-950 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 flex justify-between items-center">
        <div>
           <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Current Power</div>
           <div className="text-2xl font-bold text-white">{(currentPower / 1000).toFixed(1)} kW</div>
        </div>
        <div className="text-right">
           <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Est. Time Remaining</div>
           <div className="text-xl font-bold text-emerald-400">
             {estTimeHours === Infinity ? '--:--' : `${hours}h ${minutes}m`}
           </div>
        </div>
      </div>
      
      {soc >= 98 && (
        <div className="flex items-center gap-2 text-emerald-500 text-xs mt-2">
          <AlertCircle className="w-4 h-4" />
          <span>Battery is nearly full. Reducing power to trickle charge.</span>
        </div>
      )}
    </div>
  );
};
