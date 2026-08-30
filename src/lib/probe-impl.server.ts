import type { ProbeHit } from "./probe-domains";

const CONTACT = /contact|connect|get-in-touch|quote|enquire|inquiry/i;

function empty(domain: string, reason: string): ProbeHit {
  return { domain, live: false, status: null, finalUrl: null, title: null, contactUrl: null, mailto: null, reason };
}

async function probeOne(domain: string): Promise<ProbeHit> {
  const host = domain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (!host || host.includes(" ")) return empty(domain, "invalid host");
  for (const proto of ["https", "http"] as const) {
    try {
      const res = await fetch(`${proto}://${host}/`, {
        redirect: "follow",
        signal: AbortSignal.timeout(6000),
        headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; HIVOLTReacher/1.0)" },
      });
      const html = (await res.text()).slice(0, 200000);
      const live = res.status >= 200 && res.status < 400;
      const title = html.match(/<title[^>]*>([^<]{1,160})/i)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
      const mail = html.match(/mailto:([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})/i)?.[1]?.toLowerCase() ?? null;
      const href = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]).find((h) => CONTACT.test(h) && !/^mailto:/i.test(h));
      let contactUrl: string | null = null;
      if (href) {
        try { contactUrl = new URL(href, res.url).href; } catch { contactUrl = null; }
      }
      return { domain: host, live, status: res.status, finalUrl: res.url, title, contactUrl, mailto: mail, reason: live ? "ok" : `http ${res.status}` };
    } catch {
      continue;
    }
  }
  return empty(host, "no active website");
}

export async function runProbe(domains: string[]): Promise<ProbeHit[]> {
  const unique = [...new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean))].slice(0, 1000);
  const out: ProbeHit[] = [];
  const pool = 6;
  let i = 0;
  async function worker() {
    while (i < unique.length) {
      const idx = i++;
      out[idx] = await probeOne(unique[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(pool, unique.length) }, () => worker()));
  return out;
}
