import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DomainRow } from "./extract-domains";
import type { ProbeHit } from "./probe-domains";

export type OutreachStatus = "queued" | "live" | "dead" | "sent" | "skipped";
export type OutreachRecord = {
  domain: string; status: OutreachStatus; emails: string[]; statusCode: number | null;
  finalUrl: string | null; title: string | null; contactUrl: string | null; mailto: string | null;
  reason: string; probedAt: string | null; sentAt: string | null;
};
export type OutreachSource = { id: string; label: string; domains: string[]; rows: DomainRow[] };

export const useOutreachStore = create<{
  source: OutreachSource | null; batchSize: number; cursor: number;
  records: Record<string, OutreachRecord>; dnc: string[]; skipSent: boolean;
  setSource: (source: OutreachSource) => void; setBatchSize: (n: number) => void;
  setSkipSent: (v: boolean) => void; applyHits: (hits: ProbeHit[]) => void;
  mark: (domain: string, status: "sent" | "skipped") => void;
  markMany: (domains: string[], status: "sent" | "skipped") => void;
  removeDomains: (domains: string[]) => void; addDnc: (domain: string) => void;
  removeDnc: (domain: string) => void; advance: (count: number) => void;
}>()(
  persist(
    (set, get) => ({
      source: null, batchSize: 10, cursor: 0, records: {}, dnc: [], skipSent: true,
      setSource: (source) => {
        const emails = new Map(source.rows.map((r) => [r.domain, r.emails]));
        const records = { ...get().records };
        for (const domain of source.domains) {
          if (!records[domain]) {
            records[domain] = { domain, status: "queued", emails: emails.get(domain) ?? [], statusCode: null, finalUrl: null, title: null, contactUrl: null, mailto: null, reason: "", probedAt: null, sentAt: null };
          }
        }
        set({ source, cursor: 0, records });
      },
      setBatchSize: (n) => set({ batchSize: Math.min(1000, Math.max(1, Math.round(n) || 1)) }),
      setSkipSent: (skipSent) => set({ skipSent }),
      applyHits: (hits) => {
        const now = new Date().toISOString();
        const records = { ...get().records };
        for (const hit of hits) {
          const prev = records[hit.domain];
          const dnc = get().dnc.includes(hit.domain);
          records[hit.domain] = {
            domain: hit.domain, status: dnc ? "skipped" : hit.live ? "live" : "dead",
            emails: prev?.emails ?? [], statusCode: hit.status, finalUrl: hit.finalUrl, title: hit.title,
            contactUrl: hit.contactUrl, mailto: hit.mailto, reason: dnc ? "do-not-contact" : hit.reason,
            probedAt: now, sentAt: prev?.sentAt ?? null,
          };
          if (prev?.status === "sent") records[hit.domain] = { ...records[hit.domain], status: "sent" };
        }
        set({ records });
      },
      mark: (domain, status) => {
        const prev = get().records[domain];
        if (!prev) return;
        set({ records: { ...get().records, [domain]: { ...prev, status, sentAt: status === "sent" ? new Date().toISOString() : prev.sentAt } } });
      },
      markMany: (domains, status) => {
        const now = new Date().toISOString();
        const records = { ...get().records };
        for (const domain of domains) {
          const prev = records[domain];
          if (!prev) continue;
          records[domain] = { ...prev, status, sentAt: status === "sent" ? now : prev.sentAt };
        }
        set({ records });
      },
      removeDomains: (domains) => {
        const drop = new Set(domains);
        const source = get().source;
        const records = { ...get().records };
        for (const domain of drop) delete records[domain];
        set({ records, source: source ? { ...source, domains: source.domains.filter((d) => !drop.has(d)), rows: source.rows.filter((r) => !drop.has(r.domain)) } : source });
      },
      addDnc: (domain) => {
        const dnc = get().dnc.includes(domain) ? get().dnc : [...get().dnc, domain];
        const prev = get().records[domain];
        set({ dnc, records: prev ? { ...get().records, [domain]: { ...prev, status: "skipped", reason: "do-not-contact" } } : get().records });
      },
      removeDnc: (domain) => set({ dnc: get().dnc.filter((d) => d !== domain) }),
      advance: (count) => set({ cursor: get().cursor + count }),
    }),
    { name: "domain-log:outreach:v1" },
  ),
);
