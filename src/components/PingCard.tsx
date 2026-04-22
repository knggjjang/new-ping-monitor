"use client";

import React from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { ShieldCheck, ShieldAlert, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PingResult {
  Host: string;
  Latency: number | null;
  Status: boolean;
  Timestamp: string;
}

interface PingCardProps {
  name: string;
  host: string;
  results: PingResult[];
  colors: {
    online: string;
    offline: string;
  };
}

export default function PingCard({ name, host, results, colors }: PingCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: host });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  const safeResults = results || [];
  const latest = safeResults[safeResults.length - 1];
  const isOnline = latest?.Status ?? false;
  const currentLatency = latest?.Latency ?? 0;

  const data = safeResults.map((r, i) => ({
    value: r.Latency ?? 0,
    index: i,
  }));

  const currentColor = isOnline ? colors.online : colors.offline;

  return (
    <div 
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: currentColor,
        boxShadow: isDragging ? `0 20px 40px rgba(0,0,0,0.4), 0 0 20px ${currentColor}40` : `0 0 10px ${currentColor}20`,
      }}
      className={`glass relative p-3 sm:p-5 rounded-2xl overflow-hidden transition-all duration-500 border h-full flex flex-col ${isDragging ? 'scale-105 ring-2 ring-neon-blue/30' : ''}`}
    >
      <div className="flex justify-between items-start mb-2 sm:mb-4 shrink-0">
        <div className="flex items-start gap-2 sm:gap-3">
          <div 
            {...attributes} 
            {...listeners} 
            className="mt-1 p-1 hover:bg-white/10 rounded cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60 transition-colors"
          >
            <GripVertical size={14} />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-sm sm:text-lg font-bold tracking-tight text-white/90 truncate">{name}</h3>
            <p className="text-[10px] sm:text-xs font-mono text-white/40 truncate">{host}</p>
          </div>
        </div>
        <div className={`p-1.5 sm:p-2 rounded-full shrink-0 ${isOnline ? 'bg-green-500/10 text-neon-green' : 'bg-red-500/10 text-neon-red'}`}>
          {isOnline ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-2 sm:mb-4 ml-6 sm:ml-8 shrink-0">
        <span 
          style={{ color: currentColor, textShadow: `0 0 10px ${currentColor}40` }}
          className="text-xl sm:text-3xl font-black"
        >
          {isOnline ? `${currentLatency}ms` : "연결 안됨"}
        </span>
        <span className="text-[8px] sm:text-[10px] font-bold text-white/20 tracking-widest uppercase">
          지연시간
        </span>
      </div>

      {/* 차트 영역이 가변적으로 늘어나고 줄어들도록 설정 */}
      <div className="flex-1 min-h-0 w-full -mx-3 sm:-mx-5 -mb-3 sm:-mb-5 mt-auto opacity-50">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`color-${host.replace(/\./g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={currentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={[0, 'auto']} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={currentColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#color-${host.replace(/\./g, '-')})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div 
        className="absolute -bottom-10 -right-10 w-32 h-32 blur-[60px] opacity-20 pointer-events-none"
        style={{ backgroundColor: currentColor }}
      />
    </div>
  );
}
