"use client";

import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Settings, Plus, Zap, AlertCircle, Download, Upload, Check, Palette, Layout } from "lucide-react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy 
} from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import PingCard from "@/components/PingCard";
import { useAppStore } from "@/store/useAppStore";

export default function Dashboard() {
  const { settings, results, setResults, setSettings } = useAppStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTarget, setNewTarget] = useState({ Name: "", Host: "" });
  const [latestRelease, setLatestRelease] = useState<any>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setMounted(true);
    invoke("get_settings").then((s: any) => { if (s) setSettings(s); });
    invoke("get_ping_results").then((r: any) => { if (r) setResults(r); });
    invoke("get_engine_error").then((err: any) => { if (err) setEngineError(err); });
    invoke("get_latest_release").then((res: any) => setLatestRelease(res)).catch((err) => console.error(err));
    const unlisten = listen("ping-update", (event: any) => { setResults(event.payload as any); });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  if (!mounted) return null;

  const handleAddTarget = () => {
    if (newTarget.Name && newTarget.Host) {
      const updated = { ...settings, Targets: [...settings.Targets, newTarget] };
      setSettings(updated);
      invoke("update_settings", { newSettings: updated });
      setNewTarget({ Name: "", Host: "" });
      setIsAddOpen(false);
    }
  };

  const removeTarget = (host: string) => {
    const updated = { ...settings, Targets: settings.Targets.filter(t => t.Host !== host) };
    setSettings(updated);
    invoke("update_settings", { newSettings: updated });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = settings.Targets.findIndex(t => t.Host === active.id);
      const newIndex = settings.Targets.findIndex(t => t.Host === over.id);
      const newOrder = arrayMove(settings.Targets, oldIndex, newIndex);
      const updated = { ...settings, Targets: newOrder };
      setSettings(updated);
      invoke("update_settings", { newSettings: updated });
    }
  };

  const handleImport = async () => {
    try {
      const newSettings: any = await invoke("import_settings");
      setSettings(newSettings);
      setActionMessage({ text: "설정을 성공적으로 불러왔습니다.", type: 'success' });
    } catch (e) { if (e !== "취소됨") setActionMessage({ text: `불러오기 실패: ${e}`, type: 'error' }); }
  };

  const handleExport = async () => {
    try {
      await invoke("export_settings");
      setActionMessage({ text: "설정을 성공적으로 내보냈습니다.", type: 'success' });
    } catch (e) { if (e !== "취소됨") setActionMessage({ text: `내보내기 실패: ${e}`, type: 'error' }); }
  };

  return (
    <div 
      style={{ backgroundColor: settings.BackgroundColor || "#050505" }}
      className="flex flex-col h-full text-white overflow-hidden relative transition-colors duration-700"
    >
      {/* 배경 장식 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div style={{ backgroundColor: settings.SuccessColor }} className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-10 transition-colors duration-1000" />
        <div style={{ backgroundColor: settings.FailureColor }} className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-10 transition-colors duration-1000" />
      </div>

      {/* 헤더 */}
      <header className="flex flex-col px-8 py-10 z-10 select-none relative">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Zap className="text-neon-blue fill-neon-blue/20" size={32} />
            뉴 핑 모니터 <span className="text-white/20">대시보드</span>
          </h1>
          <button 
            className="glass p-2 rounded-full hover:bg-white/10 transition-all shadow-xl border-white/10 hover:scale-110 active:scale-95" 
            onClick={() => setIsSettingsOpen(true)}
            title="환경 설정"
          >
            <Settings size={18} className="text-white/60" />
          </button>
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-1 font-bold">
          네이티브 통합 테마 시스템 • v0.4.0
        </p>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 z-10 custom-scrollbar">
        <AnimatePresence>
          {actionMessage && (
            <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl border backdrop-blur-xl animate-in slide-in-from-top duration-300 ${
              actionMessage.type === 'success' ? 'bg-neon-green/10 border-neon-green/30 text-neon-green' : 'bg-neon-red/10 border-neon-red/30 text-neon-red'
            }`}>
              <div className="flex items-center gap-3">
                {actionMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                <span className="text-sm font-bold">{actionMessage.text}</span>
              </div>
            </div>
          )}
        </AnimatePresence>

        {engineError && (
          <div className="p-4 rounded-xl bg-neon-red/10 border border-neon-red/30 flex items-center justify-between animate-pulse mb-4 shadow-lg shadow-neon-red/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-neon-red" size={24} />
              <div>
                <p className="text-sm font-bold text-neon-red">시스템 오류</p>
                <p className="text-xs text-neon-red/80">{engineError}</p>
              </div>
            </div>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-neon-red/20 text-xs font-bold hover:bg-neon-red/30 transition-colors">다시 시도</button>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={settings.Targets.map(t => t.Host)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
              {settings?.Targets?.map((target) => (
                <PingCard key={target.Host} name={target.Name} host={target.Host} results={results[target.Host] || []} colors={{ online: settings.SuccessColor, offline: settings.FailureColor }} />
              ))}
              <button onClick={() => setIsAddOpen(true)} className="glass border-dashed border-2 border-white/10 flex flex-col items-center justify-center p-8 rounded-2xl hover:border-neon-blue/40 hover:bg-neon-blue/5 transition-all group min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Plus size={24} className="text-white/40 group-hover:text-neon-blue" />
                </div>
                <span className="text-sm font-bold text-white/30 group-hover:text-white/60">새 모니터링 대상 추가</span>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      </main>

      {/* 설정 모달 */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="glass w-full max-w-md p-8 rounded-3xl border border-white/10 space-y-6 animate-in zoom-in duration-200 shadow-2xl">
              <h2 className="text-2xl font-black tracking-tighter uppercase">앱 <span className="text-neon-pink">설정</span></h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">핑 측정 주기 (초)</label>
                  <input type="number" min="1" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-pink/50 transition-colors" value={settings.Interval} onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    const updated = { ...settings, Interval: val };
                    setSettings(updated);
                    invoke("update_settings", { newSettings: updated });
                  }} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2"><Palette size={12} /> 테마 커스터마이징</label>
                  <div className="grid grid-cols-1 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60 font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: settings.SuccessColor }} /> 온라인 테마</span>
                      <input type="color" value={settings.SuccessColor} onChange={(e) => {
                        const updated = { ...settings, SuccessColor: e.target.value };
                        setSettings(updated);
                        invoke("update_settings", { newSettings: updated });
                      }} className="w-10 h-10 rounded-xl overflow-hidden bg-transparent cursor-pointer border-none" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60 font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: settings.FailureColor }} /> 오프라인 테마</span>
                      <input type="color" value={settings.FailureColor} onChange={(e) => {
                        const updated = { ...settings, FailureColor: e.target.value };
                        setSettings(updated);
                        invoke("update_settings", { newSettings: updated });
                      }} className="w-10 h-10 rounded-xl overflow-hidden bg-transparent cursor-pointer border-none" />
                    </div>
                    <div className="flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="text-xs text-white/60 font-bold flex items-center gap-2"><Layout size={14} className="text-white/40" /> 앱 배경 색상</span>
                      <input type="color" value={settings.BackgroundColor || "#050505"} onChange={(e) => {
                        const updated = { ...settings, BackgroundColor: e.target.value };
                        setSettings(updated);
                        invoke("update_settings", { newSettings: updated });
                      }} className="w-10 h-10 rounded-xl overflow-hidden bg-transparent cursor-pointer border-none" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={handleImport} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all">
                    <Download size={14} className="text-neon-blue" /> 설정 불러오기
                  </button>
                  <button onClick={handleExport} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all">
                    <Upload size={14} className="text-neon-pink" /> 설정 내보내기
                  </button>
                </div>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="w-full px-6 py-4 rounded-xl font-bold bg-white/10 text-white mt-4 border border-white/5 hover:bg-white/20 transition-all">설정 닫기</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      <footer className="px-8 py-4 border-t border-white/10 flex justify-between items-center z-10 bg-white/5 backdrop-blur-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div style={{ backgroundColor: settings.SuccessColor }} className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">SYSTEM ONLINE</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{settings?.Targets?.length || 0} TARGETS ACTIVE</span>
        </div>
        <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">v0.4.0 • ANTIGRAVITY</div>
      </footer>
    </div>
  );
}
