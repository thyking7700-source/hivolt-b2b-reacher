export const LICENSE_SESSION_KEY = "hivolt:license:v1";

export type LicenseSession = {
  token: string;
  sub: string;
  plan: string;
  exp: number;
};

export function readLicenseSession(): LicenseSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LICENSE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LicenseSession;
    if (!parsed?.token || !Number.isFinite(parsed.exp)) return null;
    if (parsed.exp * 1000 <= Date.now()) {
      window.localStorage.removeItem(LICENSE_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeLicenseSession(session: LicenseSession) {
  window.localStorage.setItem(LICENSE_SESSION_KEY, JSON.stringify(session));
}

export function clearLicenseSession() {
  window.localStorage.removeItem(LICENSE_SESSION_KEY);
}

export function formatExpiry(exp: number) {
  try {
    return new Date(exp * 1000).toLocaleString();
  } catch {
    return "unknown";
  }
}
