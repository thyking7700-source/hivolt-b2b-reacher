import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DomainRow } from "./extract-domains";

export type LogEntry = {
  id: string;
  createdAt: string;
  tag: string;
  filename: string;
  emailCount: number;
  uniqueDomains: number;
  skipped: number;
  domains: string[];
  rows: DomainRow[];
  body: string;
};

type LogState = {
  entries: LogEntry[];
  add: (entry: LogEntry) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useLogStore = create<LogState>()(
  persist(
    (set) => ({
      entries: [],
      add: (entry) => set((state) => ({ entries: [entry, ...state.entries].slice(0, 80) })),
      remove: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      clear: () => set({ entries: [] }),
    }),
    { name: "domain-log:v1" },
  ),
);
