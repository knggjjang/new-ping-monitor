"use client";

import React from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { Activity, ShieldCheck, ShieldAlert, GripVertical } from "lucide-react";
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

  // 결과 데이터가 없을 경우를 대비한 안전 장치
  const safeResults = results || [];
  const latest = safeResults[safeResults.length - 1];
  const isOnline = latest?.Status ?? false;
  const currentLatency = latest?.Latency ?? 0;

  // 차트 데이터 준비
  const data = safeResults.map((r, i) => ({
    value: r.Latency ?? 0,
    index: i,
  }));

  const currentColor = isOnline ? colors.online : colors.offline;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`glass relative p-5 rounded-2xl overflow-hidden transition-all duration-500 ${isOnline ? 'neon-border-green' : 'neon-border-red'} ${isDragging ? 'scale-105 shadow-2xl ring-2 ring-neon-blue/50' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          {/* 드래그 핸들 */}
          <div 
            {...attributes} 
            {...listeners} 
            className="mt-1 p-1 hover:bg-white/10 rounded cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60 transition-colors"
          >
            <GripVertical size={16} />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white/90">{name}</h3>
            <p className="text-xs font-mono text-white/40">{host}</p>
          </div>
        </div>
        <div className={`p-2 rounded-full ${isOnline ? 'bg-green-500/10 text-neon-green' : 'bg-red-500/10 text-neon-red'}`}>
          {isOnline ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-6 ml-8">
        <span className={`text-3xl font-black ${isOnline ? 'neon-text-green' : 'neon-text-red'}`}>
          {isOnline ? `${currentLatency}ms` : "연결 안됨"}
        </span>
        <span className="text-[10px] font-bold text-white/20 tracking-widest uppercase">
          지연시간
        </span>
      </div>

      <div className="h-24 w-full -mx-5 -mb-5 mt-4 opacity-50">
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
