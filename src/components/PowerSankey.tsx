import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { motion } from 'motion/react';

interface PowerSankeyProps {
  evChargingPower: number;
  batteryPower: number; // Positive if discharging, negative if charging
  loadPower: number;
  gridPower: number; // Positive if exporting to grid, negative if importing from grid
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
  evChargingPower, 
  batteryPower, 
  loadPower,
  gridPower,
  width = 600,
  height = 300
}) => {
  const data = useMemo(() => {
    const nodes: NodeExtra[] = [
      { id: 'evCharging', name: 'EV Charging Input', color: '#fbbf24' },
      { id: 'battery', name: 'Battery Pack', color: '#10b981' },
      { id: 'grid', name: 'Utility Grid', color: '#a855f7' },
      { id: 'load', name: 'EV System Loads', color: '#f97316' },
    ];

    const links: { source: string; target: string; value: number; color: string }[] = [];

    // Logic for flows
    // EV Charging -> Battery -> Load
    if (evChargingPower > 0) {
      links.push({ source: 'evCharging', target: 'battery', value: evChargingPower, color: '#fbbf24' });
      
      // If charging power is less than load, battery covers the remainder
      if (evChargingPower < loadPower) {
         links.push({ source: 'battery', target: 'load', value: loadPower - evChargingPower, color: '#10b981' });
      } else {
         // Excess power goes into battery (already covered by first push)
      }
    } else {
        // Normal discharge
        if (batteryPower > 0) {
            links.push({ source: 'battery', target: 'load', value: loadPower, color: '#10b981' });
        }
    }

    // Grid interaction
    if (gridPower < 0) {
      links.push({ source: 'grid', target: 'load', value: Math.abs(gridPower), color: '#a855f7' });
    }
    if (gridPower > 0) {
      links.push({ source: 'battery', target: 'grid', value: gridPower, color: '#10b981' });
    }

    // Filter out zero value links and ensure minimum visibility
    const processedLinks = links.filter(l => l.value > 0.1).map(l => ({
      ...l,
      value: Math.max(1, l.value)
    }));

    return { nodes, links: processedLinks };
  }, [evChargingPower, batteryPower, loadPower, gridPower]);

  const { nodes, links, safeWidth, safeHeight } = useMemo(() => {
    // Ensure width and height are valid to prevent NaN
    const sw = isNaN(width as any) || !width ? 600 : Math.max(1, width);
    const sh = isNaN(height as any) || !height ? 300 : Math.max(1, height);

    const sankeyGenerator = sankey<NodeExtra, LinkExtra>()
      .nodeWidth(15)
      .nodePadding(40)
      .extent([[0, 0], [sw, sh]]);

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

    const graph = sankeyGenerator(sankeyData as any);
    return { 
      nodes: graph.nodes.filter((n: any) => !isNaN(n.x0) && !isNaN(n.y0)), 
      links: graph.links.filter((l: any) => !isNaN(l.width)),
      safeWidth: sw,
      safeHeight: sh
    };
  }, [data, width, height]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg width={safeWidth} height={safeHeight} className="overflow-visible">
        <defs>
          {links.map((link: any, i) => {
            if (isNaN(link.source.x1) || isNaN(link.target.x0)) return null;
            return (
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
            );
          })}
        </defs>

        {/* Links */}
        <g>
          {links.map((link: any, i) => {
            const path = sankeyLinkHorizontal()(link);
            if (!path) return null;
            return (
              <motion.path
                key={`link-${i}`}
                d={path}
                fill="none"
                stroke={`url(#link-grad-${i})`}
                strokeWidth={Math.max(2, link.width || 2)}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node: any, i) => {
            const nodeWidth = Math.max(0, (node.x1 || 0) - (node.x0 || 0));
            const nodeHeight = Math.max(0, (node.y1 || 0) - (node.y0 || 0));
            
            return (
              <g key={`node-${i}`} transform={`translate(${node.x0 || 0}, ${node.y0 || 0})`}>
                <motion.rect
                  width={nodeWidth}
                  height={nodeHeight}
                  fill={node.color}
                  rx={4}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="shadow-lg"
                />
                <text
                  x={node.x0 < safeWidth / 2 ? 20 : -5}
                  y={nodeHeight / 2}
                  dy="0.35em"
                  textAnchor={node.x0 < safeWidth / 2 ? "start" : "end"}
                  className="fill-zinc-400 text-[10px] font-mono uppercase tracking-widest pointer-events-none"
                >
                  {node.name}
                </text>
                <text
                  x={node.x0 < safeWidth / 2 ? 20 : -5}
                  y={nodeHeight / 2 + 12}
                  dy="0.35em"
                  textAnchor={node.x0 < safeWidth / 2 ? "start" : "end"}
                  className="fill-white text-[10px] font-bold pointer-events-none"
                >
                  {node.id === 'load' ? (loadPower ?? 0).toFixed(1) : 
                   node.id === 'evCharging' ? (evChargingPower ?? 0).toFixed(1) : 
                   node.id === 'grid' ? Math.abs(gridPower ?? 0).toFixed(1) :
                   Math.abs(batteryPower ?? 0).toFixed(1)}W
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
