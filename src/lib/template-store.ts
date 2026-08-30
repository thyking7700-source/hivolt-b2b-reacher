import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_BODY_HTML = `<p>Hello,</p>\n<p>Could you please provide a quote for your products/services?</p>\n<p>{{from_name}}<br>{{business_email}}<br>{{phone}}</p>\n`;
function fullName(first: string, last: string) { return `${first} ${last}`.replace(/\s+/g, " ").trim(); }
export type TemplateSnapshot = {
  html: string; subject: string; fromName: string; fromEmail: string; businessEmail: string; replyTo: string; phone: string;
  smartHint: string; firstName: string; lastName: string; senderCompany: string; jobTitle: string; streetAddress: string;
  country: string; state: string; city: string; postalCode: string;
};
export type SavedTemplate = TemplateSnapshot & { id: string; name: string; savedAt: string };
const SNAP_KEYS: Array<keyof TemplateSnapshot> = ["html","subject","fromName","fromEmail","businessEmail","replyTo","phone","smartHint","firstName","lastName","senderCompany","jobTitle","streetAddress","country","state","city","postalCode"];
function takeSnapshot(state: Partial<TemplateSnapshot>): TemplateSnapshot {
  const snap = {} as TemplateSnapshot;
  for (const key of SNAP_KEYS) snap[key] = String(state[key] ?? "");
  return snap;
}
export const useTemplateStore = create<TemplateSnapshot & {
  saved: SavedTemplate[]; activeSavedId: string;
  setHtml: (v: string) => void; setSubject: (v: string) => void; setFromName: (v: string) => void; setFromEmail: (v: string) => void;
  setBusinessEmail: (v: string) => void; setReplyTo: (v: string) => void; setPhone: (v: string) => void; setSmartHint: (v: string) => void;
  setFirstName: (v: string) => void; setLastName: (v: string) => void; setSenderCompany: (v: string) => void; setJobTitle: (v: string) => void;
  setStreetAddress: (v: string) => void; setCountry: (v: string) => void; setState: (v: string) => void; setCity: (v: string) => void; setPostalCode: (v: string) => void;
  saveAs: (name: string) => SavedTemplate; loadSaved: (id: string) => boolean; deleteSaved: (id: string) => void;
}>()(
  persist((set, get) => ({
    html: DEFAULT_BODY_HTML, subject: "Request for Commercial Proposal", fromName: "", fromEmail: "", businessEmail: "", replyTo: "", phone: "", smartHint: "",
    firstName: "", lastName: "", senderCompany: "", jobTitle: "", streetAddress: "", country: "", state: "", city: "", postalCode: "", saved: [], activeSavedId: "",
    setHtml: (html) => set({ html }), setSubject: (subject) => set({ subject }), setFromName: (fromName) => set({ fromName }),
    setFromEmail: (fromEmail) => set({ fromEmail }), setBusinessEmail: (businessEmail) => set({ businessEmail }), setReplyTo: (replyTo) => set({ replyTo }),
    setPhone: (phone) => set({ phone }), setSmartHint: (smartHint) => set({ smartHint }),
    setFirstName: (firstName) => set({ firstName, fromName: fullName(firstName, get().lastName) }),
    setLastName: (lastName) => set({ lastName, fromName: fullName(get().firstName, lastName) }),
    setSenderCompany: (senderCompany) => set({ senderCompany }), setJobTitle: (jobTitle) => set({ jobTitle }),
    setStreetAddress: (streetAddress) => set({ streetAddress }), setCountry: (country) => set({ country }), setState: (state) => set({ state }),
    setCity: (city) => set({ city }), setPostalCode: (postalCode) => set({ postalCode }),
    saveAs: (name) => {
      const label = name.trim() || get().subject.trim() || "Untitled template";
      const current = get();
      const existing = current.saved.find((row) => row.id === current.activeSavedId || row.name.toLowerCase() === label.toLowerCase());
      const record: SavedTemplate = { ...takeSnapshot(current), id: existing?.id ?? `tpl-${Date.now()}`, name: label, savedAt: new Date().toISOString() };
      const saved = existing ? current.saved.map((row) => (row.id === record.id ? record : row)) : [record, ...current.saved];
      set({ saved, activeSavedId: record.id });
      return record;
    },
    loadSaved: (id) => { const row = get().saved.find((item) => item.id === id); if (!row) return false; set({ ...takeSnapshot(row), activeSavedId: row.id }); return true; },
    deleteSaved: (id) => { const saved = get().saved.filter((row) => row.id !== id); set({ saved, activeSavedId: get().activeSavedId === id ? "" : get().activeSavedId }); },
  }), { name: "domain-log:template:v3" }),
);
