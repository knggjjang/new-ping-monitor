import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Target {
  name: string;
  host: string;
}

interface AppSettings {
  targets: Target[];
  interval: number;
  success_color: string;
  failure_color: string;
}

interface PingResult {
  host: string;
  latency: number | null;
  status: boolean;
  timestamp: string;
}

interface AppState {
  settings: AppSettings;
  results: Record<string, PingResult[]>;
  setSettings: (settings: AppSettings) => void;
  setResults: (results: Record<string, PingResult[]>) => void;
  updateResults: (newResults: Record<string, PingResult[]>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: {
        targets: [
          { name: "구글 DNS", host: "8.8.8.8" },
          { name: "클라우드플레어 DNS", host: "1.1.1.1" },
        ],
        interval: 2,
        success_color: "#4ade80",
        failure_color: "#f87171",
      },
      results: {},
      setSettings: (settings) => set({ settings }),
      setResults: (results) => set({ results }),
      updateResults: (newResults) => 
        set((state) => ({
          results: { ...state.results, ...newResults }
        })),
    }),
    {
      name: "ping-monitor-storage",
    }
  )
);
