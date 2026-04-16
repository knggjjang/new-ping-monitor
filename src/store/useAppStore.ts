import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Target {
  name: string;
  host: string;
}

interface AppSettings {
  targets: Target[];
  interval_ms: number;
  colors: Record<string, string>;
}

interface PingResult {
  ip: string;
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
          { name: "Google DNS", host: "8.8.8.8" },
          { name: "Cloudflare DNS", host: "1.1.1.1" },
        ],
        interval_ms: 2000,
        colors: {
          online: "#00E676",
          offline: "#FF1744",
        },
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
