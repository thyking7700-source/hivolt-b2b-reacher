export function companyFromDomain(domain: string): string {
  const parts = domain.toLowerCase().split(".").filter(Boolean);
  const skip = new Set(["www", "com", "net", "org", "io", "co", "uk", "us", "ai", "app"]);
  const name = parts.find((p) => !skip.has(p)) ?? parts[0] ?? domain;
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function mergeTemplate(source: string, vars: Record<string, string>): string {
  return source.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => vars[key.toLowerCase()] ?? "");
}

export function htmlToPlain(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildMailto(opts: { to: string; subject: string; body: string; from?: string; cc?: string }): string {
  const params = new URLSearchParams();
  if (opts.subject) params.set("subject", opts.subject);
  if (opts.body) params.set("body", opts.body.slice(0, 1800));
  if (opts.cc) params.set("cc", opts.cc);
  const qs = params.toString();
  return `mailto:${encodeURIComponent(opts.to)}${qs ? `?${qs}` : ""}`;
}

export const MERGE_FIELDS = [
  "company", "domain", "from_name", "first_name", "last_name", "sender_company", "job_title",
  "business_email", "from_email", "reply_to", "phone", "address", "city", "state", "postal", "country", "date",
] as const;
