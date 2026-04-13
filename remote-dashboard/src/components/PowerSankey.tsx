import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { motion } from 'motion/react';

interface PowerSankeyProps {
  solarPower: number;
  batteryPower: number; // Positive if discharging, negative if charging
  loadPower: number;
  width?: number;
  height?: number;
}

interface NodeExtra {
  id: string;
  name: string;
  color: string;
}

interface LinkExtra {
  color: string;
}

type Node = SankeyNode<NodeExtra, LinkExtra>;
type Link = SankeyLink<NodeExtra, LinkExtra>;

export const PowerSankey: React.FC<PowerSankeyProps> = ({ 
  solarPower, 
  batteryPower, 
  loadPower,
  width = 600,
  height = 300
}) => {
  const data = useMemo(() => {
    const nodes: NodeExtra[] = [
      { id: 'solar', name: 'Solar Array', color: '#fbbf24' },
      { id: 'battery', name: 'Battery Pack', color: '#10b981' },
      { id: 'load', name: 'Smart Home Loads', color: '#f97316' },
    ];

    const links: { source: string; target: string; value: number; color: string }[] = [];

    // Logic for flows
    if (batteryPower < 0) {
      // Charging: Solar -> Battery
      const chargingPower = Math.abs(batteryPower);
      links.push({ source: 'solar', target: 'battery', value: chargingPower, color: '#fbbf24' });
      
      // Solar -> Load
      if (solarPower > chargingPower) {
        links.push({ source: 'solar', target: 'load', value: solarPower - chargingPower, color: '#fbbf24' });
      }
    } else {
      // Discharging: Solar -> Load AND Battery -> Load
      if (solarPower > 0) {
        links.push({ source: 'solar', target: 'load', value: solarPower, color: '#fbbf24' });
      }
      if (batteryPower > 0) {
        links.push({ source: 'battery', target: 'load', value: batteryPower, color: '#10b981' });
      }
    }

    // Ensure values are at least 1 for visibility if active
    const processedLinks = links.map(l => ({
      ...l,
      value: Math.max(1, l.value)
    }));

    return { nodes, links: processedLinks };
  }, [solarPower, batteryPower, loadPower]);

  const { nodes, links } = useMemo(() => {
    const sankeyGenerator = sankey<NodeExtra, LinkExtra>()
      .nodeWidth(15)
      .nodePadding(40)
      .extent([[0, 0], [width, height]]);

    // Map string IDs to indices for d3-sankey
    const nodeMap = new Map(data.nodes.map((n, i) => [n.id, i]));
    const sankeyData = {
      nodes: data.nodes.map(n => ({ ...n })),
      links: data.links.map(l => ({
        source: nodeMap.get(l.source)!,
        target: nodeMap.get(l.target)!,
        value: l.value,
        color: l.color
      }))
    };

    return sankeyGenerator(sankeyData as any);
  }, [data, width, height]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          {links.map((link: any, i) => (
            <linearGradient 
              key={`grad-${i}`} 
              id={`link-grad-${i}`} 
              gradientUnits="userSpaceOnUse"
              x1={link.source.x1} 
              x2={link.target.x0}
            >
              <stop offset="0%" stopColor={link.color} stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.4" />
            </linearGradient>
          ))}
        </defs>

        {/* Links */}
        <g>
          {links.map((link: any, i) => (
            <motion.path
              key={`link-${i}`}
              d={sankeyLinkHorizontal()(link) || ''}
              fill="none"
              stroke={`url(#link-grad-${i})`}
              strokeWidth={Math.max(2, link.width)}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          ))}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node: any, i) => (
            <g key={`node-${i}`} transform={`translate(${node.x0}, ${node.y0})`}>
              <motion.rect
                width={node.x1 - node.x0}
                height={node.y1 - node.y0}
                fill={node.color}
                rx={4}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="shadow-lg"
              />
              <text
                x={node.x0 < width / 2 ? 20 : -5}
                y={(node.y1 - node.y0) / 2}
                dy="0.35em"
                textAnchor={node.x0 < width / 2 ? "start" : "end"}
                className="fill-zinc-400 text-[10px] font-mono uppercase tracking-widest pointer-events-none"
              >
                {node.name}
              </text>
              <text
                x={node.x0 < width / 2 ? 20 : -5}
                y={(node.y1 - node.y0) / 2 + 12}
                dy="0.35em"
                textAnchor={node.x0 < width / 2 ? "start" : "end"}
                className="fill-white text-[10px] font-bold pointer-events-none"
              >
                {node.id === 'load' ? loadPower.toFixed(1) : 
                 node.id === 'solar' ? solarPower.toFixed(1) : 
                 Math.abs(batteryPower).toFixed(1)}W
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};
