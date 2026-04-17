"use client";

import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Settings, Plus, Activity, Zap, AlertCircle } from "lucide-react";
import PingCard from "@/components/PingCard";
import { useAppStore } from "@/store/useAppStore";

export default function Dashboard() {
  const { settings, results, setResults, setSettings } = useAppStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTarget, setNewTarget] = useState({ name: "", host: "" });
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

  const handleAddTarget = () => {
    if (newTarget.name && newTarget.host) {
      const updated = {
        ...settings,
        targets: [...settings.targets, newTarget],
      };
      setSettings(updated);
      invoke("update_settings", { newSettings: updated });
      setNewTarget({ name: "", host: "" });
      setIsAddOpen(false);
    }
  };

  const removeTarget = (host: string) => {
    const updated = {
      ...settings,
      targets: settings.targets.filter(t => t.host !== host),
    };
    setSettings(updated);
    invoke("update_settings", { newSettings: updated });
  };

  return (
    <div className="flex flex-col h-full bg-[#050505]/80 text-white overflow-hidden relative backdrop-blur-xl">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue rounded-full blur-[120px] opacity-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-pink rounded-full blur-[120px] opacity-10" />
      </div>

      {/* Header */}
      <header data-tauri-drag-region className="flex justify-between items-center px-8 py-6 z-10 select-none">
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
          <button 
            onClick={() => setIsAddOpen(true)}
            className="glass border-dashed border-2 border-white/10 flex flex-col items-center justify-center p-8 rounded-2xl hover:border-neon-blue/40 hover:bg-neon-blue/5 transition-all group min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Plus size={24} className="text-white/40 group-hover:text-neon-blue" />
            </div>
            <span className="text-sm font-bold text-white/30 group-hover:text-white/60">Add New Target</span>
          </button>
        </div>
      </main>

      {/* Add Target Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="glass w-full max-w-md p-8 rounded-3xl border border-white/10 space-y-6 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black tracking-tighter">ADD NEW <span className="text-neon-blue">TARGET</span></h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Target Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. My Server"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-blue/50 transition-colors"
                  value={newTarget.name}
                  onChange={(e) => setNewTarget({...newTarget, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">IP or Domain</label>
                <input 
                  type="text" 
                  placeholder="e.g. 192.168.0.1"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-blue/50 transition-colors"
                  value={newTarget.host}
                  onChange={(e) => setNewTarget({...newTarget, host: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setIsAddOpen(false)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white/40 hover:bg-white/5 transition-colors"
              >
                CANCEL
              </button>
              <button 
                onClick={handleAddTarget}
                className="flex-1 px-6 py-3 rounded-xl font-bold bg-neon-blue text-black hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                ADD TARGET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="glass w-full max-w-md p-8 rounded-3xl border border-white/10 space-y-6 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black tracking-tighter">APP <span className="text-neon-pink">SETTINGS</span></h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Polling Interval (ms)</label>
                <input 
                  type="number" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-pink/50 transition-colors"
                  value={settings.interval_ms}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const updated = { ...settings, interval_ms: val };
                    setSettings(updated);
                    invoke("update_settings", { newSettings: updated });
                  }}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Manage Targets</label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {settings.targets.map(t => (
                    <div key={t.host} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-xs font-bold">{t.name} <span className="text-white/30 ml-2">{t.host}</span></div>
                      <button 
                        onClick={() => removeTarget(t.host)}
                        className="text-[10px] font-black text-neon-red hover:underline"
                      >
                        REMOVE
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="w-full px-6 py-4 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              CLOSE SETTINGS
            </button>
          </div>
        </div>
      )}

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
            v0.1.7 • Antigravity AI
          </div>
        </div>
      </footer>
    </div>
  );
}
