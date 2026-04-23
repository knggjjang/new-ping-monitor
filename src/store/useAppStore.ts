import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Target {
  Name: string;
  Host: string;
}

export interface AppSettings {
  Targets: Target[];
  Interval: number;
  SuccessColor: string;
  FailureColor: string;
  BackgroundColor: string;
}

export interface PingResult {
  Host: string;
  Latency: number | null;
  Status: boolean;
  Timestamp: string;
}

export interface DisconnectLog {
  id: string;
  host: string;
  name: string;
  startTime: number;
  endTime: number | null;
}

interface AppState {
  settings: AppSettings;
  results: Record<string, PingResult[]>;
  logs: DisconnectLog[];
  setSettings: (settings: AppSettings) => void;
  setResults: (results: Record<string, PingResult[]>) => void;
  updateResults: (newResults: Record<string, PingResult[]>) => void;
  addLog: (log: DisconnectLog) => void;
  updateLogEndTime: (id: string, endTime: number) => void;
  clearLogs: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: {
        Targets: [
          { Name: "구글 DNS", Host: "8.8.8.8" },
          { Name: "클라우드플레어 DNS", Host: "1.1.1.1" },
        ],
        Interval: 2,
        SuccessColor: "#4ade80",
        FailureColor: "#f87171",
        BackgroundColor: "#050505",
      },
      results: {},
      logs: [],
      setSettings: (settings) => set({ settings }),
      setResults: (results) => set({ results }),
      updateResults: (newResults) => 
        set((state) => ({
          results: { ...state.results, ...newResults }
        })),
      addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
      updateLogEndTime: (id, endTime) => set((state) => ({
        logs: state.logs.map(log => log.id === id ? { ...log, endTime } : log)
      })),
      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: "ping-monitor-storage",
    }
  )
);
