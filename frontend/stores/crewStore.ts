import { create } from 'zustand';
import { Crew, ChatMessage } from '../types';

interface CrewState {
  crews: Crew[];
  activeCrewId: string | null;
  messages: Record<string, ChatMessage[]>;
  setCrews: (crews: Crew[]) => void;
  setActiveCrewId: (id: string | null) => void;
  setMessages: (crewId: string, msgs: ChatMessage[]) => void;
  addMessage: (crewId: string, msg: ChatMessage) => void;
}

export const useCrewStore = create<CrewState>((set) => ({
  crews: [],
  activeCrewId: null,
  messages: {},

  setCrews: (crews) => set({ crews }),
  setActiveCrewId: (id) => set({ activeCrewId: id }),
  setMessages: (crewId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [crewId]: msgs } })),
  addMessage: (crewId, msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [crewId]: [...(s.messages[crewId] || []), msg],
      },
    })),
}));
