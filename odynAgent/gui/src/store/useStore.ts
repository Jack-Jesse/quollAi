import { create } from "zustand";
import {
  ChatMessage,
  AgentStep,
  Provider,
  ChatSession,
  TodoItem,
  DEFAULT_PROVIDERS,
} from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────

let msgCounter = 0;
export function makeId() {
  return `msg_${Date.now()}_${++msgCounter}`;
}

// ─── Store State ──────────────────────────────────────────────────────

interface OdynStore {
  // Providers
  providers: Provider[];
  activeProviderId: string;
  setActiveProvider: (id: string) => void;
  addProvider: (p: Provider) => void;
  removeProvider: (id: string) => void;

  // Chat
  messages: ChatMessage[];
  steps: AgentStep[];
  isGenerating: boolean;
  error: string | null;
  agentMode: boolean;
  temperature: number;

  // Sessions
  sessions: ChatSession[];
  activeSessionId: string | null;

  // Actions
  sendMessage: (content: string) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistant: (content: string) => void;
  replaceLastAssistant: (content: string) => void;
  addStep: (step: AgentStep) => void;
  setGenerating: (v: boolean) => void;
  setError: (e: string | null) => void;
  clearChat: () => void;
  toggleAgentMode: () => void;
  setTemperature: (t: number) => void;
  newSession: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  modelPickerOpen: boolean;
  setModelPickerOpen: (v: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
}

function saveToLocalStorage(state: Partial<OdynStore>) {
  try {
    if (typeof window === "undefined") return;
    const data = {
      providers: state.providers,
      activeProviderId: state.activeProviderId,
      temperature: state.temperature,
      agentMode: state.agentMode,
      sessions: state.sessions?.map((s) => ({
        ...s,
        steps: [], // Don't persist steps to save space
      })),
      activeSessionId: state.activeSessionId,
    };
    localStorage.setItem("odyn-state", JSON.stringify(data));
  } catch {
    // ignore
  }
}

function loadFromLocalStorage(): Partial<OdynStore> | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("odyn-state");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const useStore = create<OdynStore>((set, get) => {
  const saved = loadFromLocalStorage();

  return {
    // ─── Providers ─────────────────────────────────────────────
    providers: saved?.providers ?? DEFAULT_PROVIDERS,
    activeProviderId: saved?.activeProviderId ?? "bonsai-mlx",

    setActiveProvider: (id) => {
      set({ activeProviderId: id });
      saveToLocalStorage({ ...get(), activeProviderId: id });
    },

    addProvider: (p) => {
      const providers = [...get().providers, p];
      set({ providers });
      saveToLocalStorage({ ...get(), providers });
    },

    removeProvider: (id) => {
      let { providers, activeProviderId } = get();
      providers = providers.filter((p) => p.id !== id);
      if (activeProviderId === id) {
        activeProviderId = providers[0]?.id ?? "";
      }
      set({ providers, activeProviderId });
      saveToLocalStorage({ ...get(), providers, activeProviderId });
    },

    // ─── Chat State ────────────────────────────────────────────
    messages: [],
    steps: [],
    isGenerating: false,
    error: null,
    agentMode: saved?.agentMode ?? true,
    temperature: saved?.temperature ?? 0.7,

    // ─── Sessions ──────────────────────────────────────────────
    sessions: saved?.sessions ?? [],
    activeSessionId: saved?.activeSessionId ?? null,

    // ─── Chat Actions ──────────────────────────────────────────
    sendMessage: (content) => {
      const userMsg: ChatMessage = {
        id: makeId(),
        role: "user",
        content,
        timestamp: Date.now(),
      };
      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      };
      set({
        messages: [...get().messages, userMsg, assistantMsg],
        steps: [],
        isGenerating: true,
        error: null,
      });
    },

    addMessage: (msg) => {
      set({ messages: [...get().messages, msg] });
    },

    updateLastAssistant: (content) => {
      const messages = [...get().messages];
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        messages[messages.length - 1] = { ...last, content };
        set({ messages });
      }
    },

    replaceLastAssistant: (content) => {
      const messages = [...get().messages];
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        messages[messages.length - 1] = { ...last, content };
        set({ messages });
      }
    },

    addStep: (step) => {
      set({ steps: [...get().steps, step] });
    },

    setGenerating: (v) => {
      const messages = [...get().messages];
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        messages[messages.length - 1] = {
          ...last,
          isStreaming: v,
        };
        set({ isGenerating: v, messages });
      } else {
        set({ isGenerating: v });
      }
    },

    setError: (e) => set({ error: e }),

    clearChat: () => {
      set({ messages: [], steps: [], error: null });
    },

    toggleAgentMode: () => {
      const agentMode = !get().agentMode;
      set({ agentMode });
      saveToLocalStorage({ ...get(), agentMode });
    },

    setTemperature: (t) => {
      set({ temperature: t });
      saveToLocalStorage({ ...get(), temperature: t });
    },

    // ─── Session Actions ───────────────────────────────────────
    newSession: () => {
      const { sessions, messages, steps } = get();
      // Auto-save current session
      if (messages.length > 0) {
        const firstUser = messages.find((m) => m.role === "user");
        const title =
          firstUser?.content.slice(0, 50) || "New Conversation";
        const session: ChatSession = {
          id: makeId(),
          title,
          providerId: get().activeProviderId,
          messages: [...messages],
          steps: [],
          createdAt: messages[0]?.timestamp || Date.now(),
          updatedAt: Date.now(),
        };
        set({
          sessions: [session, ...sessions],
          messages: [],
          steps: [],
          error: null,
          activeSessionId: null,
        });
      } else {
        set({ messages: [], steps: [], error: null, activeSessionId: null });
      }
      saveToLocalStorage({ ...get() });
    },

    loadSession: (id) => {
      const session = get().sessions.find((s) => s.id === id);
      if (session) {
        set({
          messages: session.messages,
          steps: [],
          activeSessionId: session.id,
          error: null,
        });
      }
    },

    deleteSession: (id) => {
      const sessions = get().sessions.filter((s) => s.id !== id);
      const activeSessionId =
        get().activeSessionId === id ? null : get().activeSessionId;
      set({ sessions, activeSessionId });
      saveToLocalStorage({ ...get(), sessions, activeSessionId });
    },

    // ─── UI State ──────────────────────────────────────────────
    sidebarOpen: true,
    setSidebarOpen: (v) => set({ sidebarOpen: v }),
    modelPickerOpen: false,
    setModelPickerOpen: (v) => set({ modelPickerOpen: v }),
    settingsOpen: false,
    setSettingsOpen: (v) => set({ settingsOpen: v }),
  };
});
