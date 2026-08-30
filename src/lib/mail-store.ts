import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MailSecurity = "starttls" | "ssl" | "none";
export type MailPreset = "gmail" | "outlook" | "fastmail" | "custom";
export type TransportSettings = { host: string; port: number; security: MailSecurity; user: string; pass: string };

export const MAIL_PRESETS: Record<Exclude<MailPreset, "custom">, { smtp: Pick<TransportSettings, "host" | "port" | "security">; imap: Pick<TransportSettings, "host" | "port" | "security"> }> = {
  gmail: { smtp: { host: "smtp.gmail.com", port: 587, security: "starttls" }, imap: { host: "imap.gmail.com", port: 993, security: "ssl" } },
  outlook: { smtp: { host: "smtp.office365.com", port: 587, security: "starttls" }, imap: { host: "outlook.office365.com", port: 993, security: "ssl" } },
  fastmail: { smtp: { host: "smtp.fastmail.com", port: 465, security: "ssl" }, imap: { host: "imap.fastmail.com", port: 993, security: "ssl" } },
};

const empty: TransportSettings = { host: "", port: 587, security: "starttls", user: "", pass: "" };

export const useMailStore = create<
  {
    preset: MailPreset;
    smtp: TransportSettings;
    imap: TransportSettings;
    setPreset: (preset: MailPreset) => void;
    setSmtp: (patch: Partial<TransportSettings>) => void;
    setImap: (patch: Partial<TransportSettings>) => void;
  }
>()(
  persist(
    (set, get) => ({
      preset: "custom",
      smtp: { ...empty, port: 587, security: "starttls" },
      imap: { ...empty, port: 993, security: "ssl" },
      setPreset: (preset) => {
        if (preset === "custom") { set({ preset }); return; }
        const next = MAIL_PRESETS[preset];
        set({ preset, smtp: { ...get().smtp, ...next.smtp }, imap: { ...get().imap, ...next.imap } });
      },
      setSmtp: (patch) => set({ preset: "custom", smtp: { ...get().smtp, ...patch } }),
      setImap: (patch) => set({ preset: "custom", imap: { ...get().imap, ...patch } }),
    }),
    { name: "domain-log:mail:v1" },
  ),
);

export function smtpReady(smtp: TransportSettings): boolean {
  return Boolean(smtp.host && smtp.user && smtp.pass && smtp.port);
}
export function imapReady(imap: TransportSettings): boolean {
  return Boolean(imap.host && imap.user && imap.pass && imap.port);
}
