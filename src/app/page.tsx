"use client";

import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Settings, Plus, Zap, AlertCircle, Download, Upload, Check, Palette, Layout, Trash2, X, Edit3 } from "lucide-react";
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
import { AnimatePresence, motion } from "framer-motion";
import PingCard from "@/components/PingCard";
import { useAppStore } from "@/store/useAppStore";

export default function Dashboard() {
  const { settings, results, setResults, setSettings } = useAppStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newTarget, setNewTarget] = useState({ Name: "", Host: "" });
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
      if (settings.Targets.some(t => t.Host === newTarget.Host)) {
        setActionMessage({ text: "이미 등록된 호스트입니다.", type: 'error' });
        return;
      }
      const updated = { ...settings, Targets: [...settings.Targets, newTarget] };
      setSettings(updated);
      invoke("update_settings", { newSettings: updated });
      setNewTarget({ Name: "", Host: "" });
      setActionMessage({ text: "새 대상을 추가했습니다.", type: 'success' });
    }
  };

  const updateTargetInfo = (index: number, field: 'Name' | 'Host', value: string) => {
    const newTargets = [...settings.Targets];
    newTargets[index] = { ...newTargets[index], [field]: value };
    const updated = { ...settings, Targets: newTargets };
    setSettings(updated);
    invoke("update_settings", { newSettings: updated });
  };

  const removeTarget = (host: string) => {
    const updated = { ...settings, Targets: settings.Targets.filter(t => t.Host !== host) };
    setSettings(updated);
    invoke("update_settings", { newSettings: updated });
    setActionMessage({ text: "대상을 삭제했습니다.", type: 'success' });
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
          통합 관리 시스템 최적화 • v0.5.0
        </p>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 z-10 custom-scrollbar">
        <AnimatePresence>
          {actionMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl ${
              actionMessage.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center gap-3">
                {actionMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                <span className="text-sm font-bold">{actionMessage.text}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {engineError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between animate-pulse mb-4 shadow-lg shadow-red-500/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-500" size={24} />
              <div>
                <p className="text-sm font-bold text-red-500">시스템 오류</p>
                <p className="text-xs text-red-500/80">{engineError}</p>
              </div>
            </div>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-red-500/20 text-xs font-bold hover:bg-red-500/30 transition-colors">다시 시도</button>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={settings.Targets.map(t => t.Host)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
              {settings?.Targets?.map((target) => (
                <PingCard key={target.Host} name={target.Name} host={target.Host} results={results[target.Host] || []} colors={{ online: settings.SuccessColor, offline: settings.FailureColor }} />
              ))}
              {settings.Targets.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                  <p className="text-white/20 font-bold">등록된 모니터링 대상이 없습니다.</p>
                  <button onClick={() => setIsSettingsOpen(true)} className="mt-4 text-xs font-bold text-neon-blue hover:underline">설정에서 추가하기</button>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </main>

      {/* 설정 모달 (통합 관리 인터페이스) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass w-full max-w-2xl p-8 rounded-3xl border border-white/10 space-y-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tighter uppercase">앱 <span className="text-neon-pink">설정 & 관리</span></h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar">
                {/* 1. 대상 추가 섹션 */}
                <section className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-neon-blue font-black flex items-center gap-2">
                    <Plus size={12} /> 새 대상 추가
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <input type="text" placeholder="이름 (예: 구글)" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-neon-blue/50" value={newTarget.Name} onChange={(e) => setNewTarget({...newTarget, Name: e.target.value})} />
                    <div className="flex gap-2">
                      <input type="text" placeholder="주소 (예: 8.8.8.8)" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-neon-blue/50" value={newTarget.Host} onChange={(e) => setNewTarget({...newTarget, Host: e.target.value})} />
                      <button onClick={handleAddTarget} className="bg-neon-blue/20 text-neon-blue p-2 rounded-xl border border-neon-blue/30 hover:bg-neon-blue/30 transition-all"><Plus size={20} /></button>
                    </div>
                  </div>
                </section>

                {/* 2. 기존 대상 관리 섹션 (수정 및 삭제) */}
                <section className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                    <Edit3 size={12} /> 모니터링 대상 리스트 관리
                  </label>
                  <div className="space-y-3">
                    {settings.Targets.length === 0 ? (
                      <p className="text-xs text-white/10 text-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/5">등록된 대상이 없습니다.</p>
                    ) : (
                      settings.Targets.map((target, idx) => (
                        <div key={target.Host} className="grid grid-cols-1 sm:grid-cols-[1fr,1.5fr,auto] gap-3 items-center p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                          <input 
                            type="text" 
                            className="bg-transparent border-b border-white/5 px-2 py-1 text-xs font-bold focus:border-neon-pink/50 outline-none"
                            value={target.Name}
                            onChange={(e) => updateTargetInfo(idx, 'Name', e.target.value)}
                            placeholder="이름"
                          />
                          <input 
                            type="text" 
                            className="bg-transparent border-b border-white/5 px-2 py-1 text-xs text-white/50 focus:border-neon-pink/50 outline-none"
                            value={target.Host}
                            onChange={(e) => updateTargetInfo(idx, 'Host', e.target.value)}
                            placeholder="주소"
                          />
                          <button 
                            onClick={() => removeTarget(target.Host)}
                            className="p-2 rounded-xl hover:bg-red-500/20 text-white/10 hover:text-red-500 transition-all"
                            title="삭제"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* 3. 시스템 설정 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">측정 주기 (초)</label>
                    <input type="number" min="1" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-neon-pink/50" value={settings.Interval} onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      const updated = { ...settings, Interval: val };
                      setSettings(updated);
                      invoke("update_settings", { newSettings: updated });
                    }} />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2"><Palette size={12} /> 테마 컬러</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <input type="color" value={settings.SuccessColor} onChange={(e) => {
                          const updated = { ...settings, SuccessColor: e.target.value };
                          setSettings(updated);
                          invoke("update_settings", { newSettings: updated });
                        }} className="w-full h-8 rounded-lg overflow-hidden bg-transparent cursor-pointer border-none" />
                        <span className="text-[8px] text-white/40 uppercase">Online</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <input type="color" value={settings.FailureColor} onChange={(e) => {
                          const updated = { ...settings, FailureColor: e.target.value };
                          setSettings(updated);
                          invoke("update_settings", { newSettings: updated });
                        }} className="w-full h-8 rounded-lg overflow-hidden bg-transparent cursor-pointer border-none" />
                        <span className="text-[8px] text-white/40 uppercase">Offline</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <input type="color" value={settings.BackgroundColor || "#050505"} onChange={(e) => {
                          const updated = { ...settings, BackgroundColor: e.target.value };
                          setSettings(updated);
                          invoke("update_settings", { newSettings: updated });
                        }} className="w-full h-8 rounded-lg overflow-hidden bg-transparent cursor-pointer border-none" />
                        <span className="text-[8px] text-white/40 uppercase">BG</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                  <button onClick={handleImport} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all">
                    <Download size={14} className="text-neon-blue" /> 설정 가져오기
                  </button>
                  <button onClick={handleExport} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all">
                    <Upload size={14} className="text-neon-pink" /> 설정 내보내기
                  </button>
                </div>
              </div>

              <button onClick={() => setIsSettingsOpen(false)} className="w-full px-6 py-4 rounded-2xl font-bold bg-white/10 text-white mt-4 border border-white/5 hover:bg-white/20 transition-all shrink-0">설정 닫기</button>
            </motion.div>
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
        <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">v0.5.0 • ANTIGRAVITY</div>
      </footer>
    </div>
  );
}
