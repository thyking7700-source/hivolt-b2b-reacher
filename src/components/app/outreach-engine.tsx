"use client";
import { Copy, ExternalLink, Radar, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogStore } from "@/lib/log-store";
import { htmlToPlain, mergeTemplate } from "@/lib/merge-template";
import { probeDomains } from "@/lib/probe-domains";
import { useOutreachStore, type OutreachRecord } from "@/lib/outreach-store";
import { useTemplateStore } from "@/lib/template-store";

function merged(domain: string) {
  const t = useTemplateStore.getState();
  const vars = { company: domain.split(".")[0] ?? domain, domain, from_name: t.fromName, business_email: t.businessEmail, from_email: t.fromEmail, phone: t.phone, date: new Date().toLocaleDateString() };
  return { subject: mergeTemplate(t.subject, vars), html: mergeTemplate(t.html, vars), plain: htmlToPlain(mergeTemplate(t.html, vars)) };
}

export function OutreachEngine() {
  const source = useOutreachStore((s) => s.source);
  const batchSize = useOutreachStore((s) => s.batchSize);
  const records = useOutreachStore((s) => s.records);
  const setSource = useOutreachStore((s) => s.setSource);
  const setBatchSize = useOutreachStore((s) => s.setBatchSize);
  const applyHits = useOutreachStore((s) => s.applyHits);
  const mark = useOutreachStore((s) => s.mark);
  const markMany = useOutreachStore((s) => s.markMany);
  const removeDomains = useOutreachStore((s) => s.removeDomains);
  const entries = useLogStore((s) => s.entries);
  const [scanning, setScanning] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const queue = source?.domains ?? [];
  const remaining = queue.filter((d) => !records[d] || records[d].status === "queued");
  const batch = useMemo(() => queue.map((d) => records[d]).filter((r): r is OutreachRecord => !!r && r.status === "live").slice(0, batchSize), [batchSize, queue, records]);

  async function scanNext() {
    const next = remaining.slice(0, batchSize);
    if (!next.length) { toast.message("Nothing left to scan"); return; }
    setScanning(true);
    try {
      const hits = await probeDomains({ data: { domains: next } });
      applyHits(hits);
      toast.success(`${hits.filter((h) => h.live).length} live`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <section className="rounded-2xl bg-card p-4 lg:col-span-4">
        <h2 className="text-sm font-semibold">Reach-out engine</h2>
        <div className="mt-4 space-y-1.5">
          <Label>Source from log/</Label>
          <select className="h-11 w-full rounded-lg border border-border bg-input px-3 text-sm" value={source?.id ?? ""} onChange={(e) => {
            const entry = entries.find((x) => x.id === e.target.value);
            if (!entry) return;
            setPicked([]);
            setSource({ id: entry.id, label: `log/${entry.filename}`, domains: entry.domains, rows: entry.rows });
          }}>
            <option value="">Select a dated log file</option>
            {entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.filename}</option>)}
          </select>
        </div>
        <div className="mt-3 space-y-1.5"><Label>Batch size (1–1000)</Label><Input type="number" min={1} max={1000} value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} /></div>
        <Button type="button" className="mt-4 w-full" disabled={!source || scanning} onClick={() => void scanNext()}><Radar />{scanning ? "Scanning…" : `Scan next ${Math.min(batchSize, remaining.length || batchSize)}`}</Button>
      </section>
      <section className="rounded-2xl bg-card p-4 lg:col-span-8">
        <h2 className="text-sm font-semibold">Live batch</h2>
        {picked.length > 0 ? (
          <div className="my-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => { for (const rec of batch.filter((r) => picked.includes(r.domain))) { const url = rec.contactUrl || rec.finalUrl; if (url) window.open(url, "_blank", "noopener,noreferrer"); } }}>Open contacts</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => { markMany(picked, "sent"); toast.success("Marked sent"); }}>Mark sent</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { removeDomains(picked); setPicked([]); }}>Delete selected</Button>
          </div>
        ) : null}
        {!source ? <p className="mt-6 text-sm text-muted-foreground">Extract, save to log, then select that file.</p> : batch.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Scan the next batch to find live sites.</p> : (
          <ul className="mt-3 space-y-2">
            {batch.map((rec) => (
              <li key={rec.domain} className="rounded-xl bg-input p-3">
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={picked.includes(rec.domain)} onChange={() => setPicked((cur) => cur.includes(rec.domain) ? cur.filter((d) => d !== rec.domain) : [...cur, rec.domain])} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2"><p className="font-mono text-sm break-all">{rec.domain}</p><Badge variant="ok">{rec.status}</Badge></div>
                    <p className="truncate text-xs text-muted-foreground">{rec.title || rec.finalUrl || rec.reason}</p>
                  </div>
                </label>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button type="button" variant="secondary" size="sm" disabled={!rec.finalUrl} onClick={() => rec.finalUrl && window.open(rec.finalUrl, "_blank")}><ExternalLink /> Site</Button>
                  <Button type="button" variant="secondary" size="sm" disabled={!rec.contactUrl} onClick={() => rec.contactUrl && window.open(rec.contactUrl, "_blank")}>Contact</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { void navigator.clipboard.writeText(merged(rec.domain).plain); toast.success("Copied"); }}><Copy /> Copy</Button>
                  <Button type="button" size="sm" onClick={() => { mark(rec.domain, "sent"); toast.success("Sent"); }}><Send /> Sent</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
