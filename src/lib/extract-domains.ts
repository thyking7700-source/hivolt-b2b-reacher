export type DomainRow = { domain: string; count: number; emails: string[] };
export type ExtractResult = { emails: string[]; domains: DomainRow[]; skipped: string[]; lineCount: number };

const EMAIL_RE = /[A-Za-z0-9](?:[A-Za-z0-9._%+\-]*[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}/g;
const BARE_AT_DOMAIN_RE = /(?:^[\s,;:<>|'"])@((?:[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,})\b/g;

function normalizeDomain(raw: string): string {
  return raw.replace(/\.+$/, "").replace(/^www\./i, "").toLowerCase();
}

export function extractDomains(raw: string): ExtractResult {
  const text = raw.replace(/\u00a0/g, " ").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const emailSet = new Map<string, string>();
  const domainMap = new Map<string, { count: number; emails: Set<string> }>();
  const skipped: string[] = [];
  const addDomain = (domain: string, email?: string) => {
    const key = normalizeDomain(domain);
    if (!key) return;
    let row = domainMap.get(key);
    if (!row) { row = { count: 0, emails: new Set() }; domainMap.set(key, row); }
    row.count += 1;
    if (email) row.emails.add(email);
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    EMAIL_RE.lastIndex = 0;
    const found: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = EMAIL_RE.exec(trimmed)) !== null) found.push(match[0]);
    if (found.length > 0) {
      for (const email of found) {
        const lower = email.toLowerCase();
        if (!emailSet.has(lower)) emailSet.set(lower, email);
        addDomain(lower.slice(lower.lastIndexOf("@") + 1), lower);
      }
      continue;
    }
    BARE_AT_DOMAIN_RE.lastIndex = 0;
    const bare: string[] = [];
    while ((match = BARE_AT_DOMAIN_RE.exec(trimmed)) !== null) bare.push(match[1]);
    if (bare.length > 0) { for (const domain of bare) addDomain(domain); continue; }
    if (trimmed.includes("@") && !/^\s*#/.test(trimmed)) skipped.push(trimmed);
  }
  const domains: DomainRow[] = [...domainMap.entries()]
    .map(([domain, row]) => ({ domain, count: row.count, emails: [...row.emails].sort() }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
  return { emails: [...emailSet.keys()].sort(), domains, skipped, lineCount: lines.filter((l) => l.trim()).length };
}

export function slugifyTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "leads";
}

export function buildLogFilename(date: Date, tag: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}_${hh}${mm}_${slugifyTag(tag)}_domains.txt`;
}

export function formatLogFile(opts: { filename: string; createdAt: string; tag: string; emailCount: number; domains: string[] }): string {
  return [`# Domain Log`, `# file: log/${opts.filename}`, `# saved: ${opts.createdAt}`, `# tag: ${opts.tag}`, `# emails: ${opts.emailCount}`, `# unique_domains: ${opts.domains.length}`, "", ...opts.domains, ""].join("\n");
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const SAMPLE_LEADS = `Name,Email,Company\nSarah Chen,sarah.chen@acme.co,Acme\nJames Okonkwo,james@globex.com,Globex\nPriya Nair,priya.nair@contoso.com,Contoso\nSales Team <sales@initech.net>\n`;
