import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Target {
  Name: string;
  Host: string;
}

interface AppSettings {
  Targets: Target[];
  Interval: number;
  SuccessColor: string;
  FailureColor: string;
}

interface PingResult {
  Host: string;
  Latency: number | null;
  Status: boolean;
  Timestamp: string;
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
        Targets: [
          { Name: "구글 DNS", Host: "8.8.8.8" },
          { Name: "클라우드플레어 DNS", Host: "1.1.1.1" },
        ],
        Interval: 2,
        SuccessColor: "#4ade80",
        FailureColor: "#f87171",
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
