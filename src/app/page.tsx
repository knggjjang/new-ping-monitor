"use client";

import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Settings, Plus, Activity, Zap } from "lucide-react";
import PingCard from "@/components/PingCard";
import { useAppStore } from "@/store/useAppStore";

export default function Dashboard() {
  const { settings, results, setResults, setSettings } = useAppStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [latestRelease, setLatestRelease] = useState<any>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch
    invoke("get_settings").then((s: any) => setSettings(s));
    invoke("get_ping_results").then((r: any) => setResults(r));
    
    // Check for engine errors (e.g. permission denied)
    invoke("get_engine_error").then((err: any) => {
      if (err) setEngineError(err);
    });

    // Fetch latest release info
    invoke("get_latest_release")
      .then((res: any) => setLatestRelease(res))
      .catch((err) => console.error("Failed to fetch release:", err));

    // Listen for real-time updates from Rust
    const unlisten = listen("ping-update", (event: any) => {
      setResults(event.payload as any);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue rounded-full blur-[120px] opacity-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-pink rounded-full blur-[120px] opacity-10" />
      </div>

      {/* Header */}
      <header className="flex justify-between items-center px-8 py-6 z-10">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Zap className="text-neon-blue fill-neon-blue/20" size={32} />
            NETWORK <span className="text-white/20">DASHBOARD</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-1 font-bold">
            Real-time Latency Monitoring • Cross-Platform
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            className="glass p-3 rounded-full hover:bg-white/10 transition-colors"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings size={20} className="text-white/70" />
          </button>
        </div>
      </header>

      {/* Grid Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 z-10">
        {/* Security & Status Alert */}
        {engineError && (
          <div className="p-3 rounded-lg bg-neon-red/10 border border-neon-red/30 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-neon-red" size={20} />
              <p className="text-sm text-neon-red font-medium">
                {engineError}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-3 py-1 rounded bg-neon-red/20 text-xs font-bold hover:bg-neon-red/30 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settings.targets.map((target) => (
            <PingCard
              key={target.host}
              name={target.name}
              host={target.host}
              results={results[target.host] || []}
              colors={{
                online: settings.colors.online,
                offline: settings.colors.offline,
              }}
            />
          ))}
          
          {/* Add New Hook */}
          <button className="glass border-dashed border-2 border-white/10 flex flex-col items-center justify-center p-8 rounded-2xl hover:border-neon-blue/40 hover:bg-neon-blue/5 transition-all group min-h-[200px]">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Plus size={24} className="text-white/40 group-hover:text-neon-blue" />
            </div>
            <span className="text-sm font-bold text-white/30 group-hover:text-white/60">Add New Target</span>
          </button>
        </div>
      </div>

      {/* Footer / Stats */}
      <footer className="px-8 py-4 border-t border-white/5 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-[10px] font-bold text-white/40 uppercase">System Active</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <span className="text-[10px] font-bold text-white/40 uppercase">
            {settings.targets.length} Targets Monitored
          </span>
        </div>
        <div className="flex items-center gap-4">
          {latestRelease && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-neon-blue/10 border border-neon-blue/20">
              <Activity size={10} className="text-neon-blue" />
              <span className="text-[10px] font-bold text-neon-blue uppercase">
                Latest: {latestRelease.tag_name}
              </span>
            </div>
          )}
          <div className="text-[10px] font-bold text-white/20 uppercase">
            v0.1.0 • Antigravity AI
          </div>
        </div>
      </footer>
    </div>
  );
}
