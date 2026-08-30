"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { verifyAccessToken } from "@/lib/license";
import {
  clearLicenseSession,
  formatExpiry,
  readLicenseSession,
  writeLicenseSession,
  type LicenseSession,
} from "@/lib/license/session";

export function LicenseGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<LicenseSession | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSession(readLicenseSession());
    setReady(true);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = token.trim();
    if (!value) {
      setError("Enter your access key.");
      return;
    }
    setBusy(true);
    try {
      const result = await verifyAccessToken({ data: { token: value } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const next: LicenseSession = { token: value, sub: result.sub, plan: result.plan, exp: result.exp };
      writeLicenseSession(next);
      setSession(next);
      setToken("");
    } catch {
      setError("Could not verify the key. Is the app running?");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !session) {
    return (
      <div className="hivolt-login-root">
        <div className="glow-blob glow-blob-1" />
        <div className="glow-blob glow-blob-2" />
        <div className="card">
          <span className="corner tl" />
          <span className="corner tr" />
          <span className="corner bl" />
          <span className="corner br" />
          <div className="logo-area">
            <div className="logo-icon">⚡</div>
            <div className="brand-name">Hivolt</div>
            <div className="brand-sub">B2B Reacher</div>
          </div>
          <div className="divider" />
          {error ? <div className="error-box">⚠  {error}</div> : null}
          <form onSubmit={onSubmit}>
            <label className="field-label" htmlFor="pw">Access Key</label>
            <input id="pw" type="password" className="input" placeholder="HV1.••••••••" autoComplete="off" spellCheck={false} value={token} onChange={(e) => setToken(e.target.value)} />
            <button type="submit" className="btn" disabled={busy}>
              <span className="btn-fill" />
              <span className="btn-label">
                <span className="status-dot" />
                {busy ? "Checking" : "Authenticate"}
              </span>
            </button>
          </form>
          <p className="footer-note">hivoltage · protected zone</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {children}
      <div className="hivolt-session-chip">
        <span>{session.sub} · {session.plan} · until {formatExpiry(session.exp)}</span>
        <button type="button" onClick={() => { clearLicenseSession(); setSession(null); }}>Lock</button>
      </div>
    </div>
  );
}
