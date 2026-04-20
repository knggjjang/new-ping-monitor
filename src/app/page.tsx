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
    // 초기 로드
    invoke("get_settings").then((s: any) => setSettings(s));
    invoke("get_ping_results").then((r: any) => setResults(r));
    
    // 엔진 오류 체크 (권한 문제 등)
    invoke("get_engine_error").then((err: any) => {
      if (err) setEngineError(err);
    });

    // 최신 릴리즈 정보 가져오기
    invoke("get_latest_release")
      .then((res: any) => setLatestRelease(res))
      .catch((err) => console.error("릴리즈 정보를 가져오지 못했습니다:", err));

    // Rust 백엔드로부터 실시간 업데이트 수신
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
      {/* 배경 장식 요소 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue rounded-full blur-[120px] opacity-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-pink rounded-full blur-[120px] opacity-10" />
      </div>

      {/* 헤더 */}
      <header data-tauri-drag-region className="flex justify-between items-center px-8 py-6 z-10 select-none">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Zap className="text-neon-blue fill-neon-blue/20" size={32} />
            뉴 핑 모니터 <span className="text-white/20">대시보드</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-1 font-bold">
            실시간 네트워크 지연시간 모니터링 • 크로스 플랫폼
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

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 z-10">
        {/* 오류 알림 */}
        {engineError && (
          <div className="p-4 rounded-xl bg-neon-red/10 border border-neon-red/30 flex items-center justify-between animate-pulse mb-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-neon-red" size={24} />
              <div>
                <p className="text-sm font-bold text-neon-red">시스템 오류</p>
                <p className="text-xs text-neon-red/80">{engineError}</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-neon-red/20 text-xs font-bold hover:bg-neon-red/30 transition-colors"
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
                online: settings.success_color,
                offline: settings.failure_color,
              }}
            />
          ))}
          
          {/* 새 타겟 추가 버튼 */}
          <button 
            onClick={() => setIsAddOpen(true)}
            className="glass border-dashed border-2 border-white/10 flex flex-col items-center justify-center p-8 rounded-2xl hover:border-neon-blue/40 hover:bg-neon-blue/5 transition-all group min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Plus size={24} className="text-white/40 group-hover:text-neon-blue" />
            </div>
            <span className="text-sm font-bold text-white/30 group-hover:text-white/60">새 모니터링 대상 추가</span>
          </button>
        </div>
      </main>

      {/* 타겟 추가 모달 */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="glass w-full max-w-md p-8 rounded-3xl border border-white/10 space-y-6 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black tracking-tighter uppercase">모니터링 <span className="text-neon-blue">대상 추가</span></h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">표시 이름</label>
                <input 
                  type="text" 
                  placeholder="예: 내 서버"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-blue/50 transition-colors"
                  value={newTarget.name}
                  onChange={(e) => setNewTarget({...newTarget, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">IP 또는 도메인 주소</label>
                <input 
                  type="text" 
                  placeholder="예: 192.168.0.1 또는 google.com"
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
                취소
              </button>
              <button 
                onClick={handleAddTarget}
                className="flex-1 px-6 py-3 rounded-xl font-bold bg-neon-blue text-black hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 설정 모달 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="glass w-full max-w-md p-8 rounded-3xl border border-white/10 space-y-6 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black tracking-tighter uppercase">앱 <span className="text-neon-pink">설정</span></h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">핑 측정 주기 (초)</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-pink/50 transition-colors"
                  value={settings.interval}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    const updated = { ...settings, interval: val };
                    setSettings(updated);
                    invoke("update_settings", { newSettings: updated });
                  }}
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">대상 리스트 관리</label>
                  <button 
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsAddOpen(true);
                    }}
                    className="text-[10px] font-black text-neon-blue hover:underline"
                  >
                    + 새 대상 추가
                  </button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {settings.targets.map(t => (
                    <div key={t.host} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-xs font-bold">{t.name} <span className="text-white/30 ml-2 font-mono">{t.host}</span></div>
                      <button 
                        onClick={() => removeTarget(t.host)}
                        className="text-[10px] font-black text-neon-red hover:underline"
                      >
                        삭제
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
              설정 닫기
            </button>
          </div>
        </div>
      )}

      {/* 푸터 / 상태바 */}
      <footer className="px-8 py-4 border-t border-white/5 flex justify-between items-center z-10 bg-black/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-[10px] font-bold text-white/40 uppercase">시스템 작동 중</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <span className="text-[10px] font-bold text-white/40 uppercase">
            {settings.targets.length}개 대상 모니터링 중
          </span>
        </div>
        <div className="flex items-center gap-4">
          {latestRelease && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-neon-blue/10 border border-neon-blue/20">
              <Activity size={10} className="text-neon-blue" />
              <span className="text-[10px] font-bold text-neon-blue uppercase">
                최신 버전: {latestRelease.tag_name}
              </span>
            </div>
          )}
          <div className="text-[10px] font-bold text-white/20 uppercase">
            v0.2.2 • Antigravity AI
          </div>
        </div>
      </footer>
    </div>
  );
}
