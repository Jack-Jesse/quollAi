"use client";

import { Sidebar } from "@/components/Sidebar";
import { ChatView } from "@/components/ChatView";
import { ModelPicker } from "@/components/ModelPicker";
import { SettingsModal } from "@/components/SettingsModal";
import { useStore } from "@/store/useStore";

export default function Home() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const modelPickerOpen = useStore((s) => s.modelPickerOpen);
  const settingsOpen = useStore((s) => s.settingsOpen);

  return (
    <div className="h-screen w-screen flex overflow-hidden noise-bg">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-[280px] min-w-[280px]" : "w-0 min-w-0"
        } transition-all duration-300 ease-in-out overflow-hidden`}
      >
        <Sidebar />
      </div>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        <ChatView />
      </main>

      {/* Modals */}
      {modelPickerOpen && <ModelPicker />}
      {settingsOpen && <SettingsModal />}
    </div>
  );
}
