"use client";

import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X, Minus, Square } from "lucide-react";

export default function TitleBar() {
  const [appWindow, setAppWindow] = useState<any>(null);

  useEffect(() => {
    setAppWindow(getCurrentWindow());
  }, []);

  return (
    <div data-tauri-drag-region className="titlebar select-none">
      <div className="flex-1 pl-4 text-xs font-semibold text-white/50 pointer-events-none">
        네트워크 핑 모니터 시스템
      </div>
      <div className="flex">
        <div
          className="titlebar-button"
          onClick={() => appWindow?.minimize()}
        >
          <Minus size={14} />
        </div>
        <div
          className="titlebar-button"
          onClick={() => appWindow?.toggleMaximize()}
        >
          <Square size={12} />
        </div>
        <div
          className="titlebar-button hover:bg-red-500"
          id="titlebar-close"
          onClick={() => appWindow?.close()}
        >
          <X size={14} />
        </div>
      </div>
    </div>
  );
}
