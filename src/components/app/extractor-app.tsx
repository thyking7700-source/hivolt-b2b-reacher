"use client";

import { Archive, AtSign, Check, Copy, Download, FileCode2, FileInput, FolderClosed, Radar, Search, Send, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { OutreachEngine } from "@/components/app/outreach-engine";
import { TemplatePanel } from "@/components/app/template-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SAMPLE_LEADS, buildLogFilename, downloadText, extractDomains, formatLogFile, slugifyTag, type ExtractResult } from "@/lib/extract-domains";
import { useLogStore, type LogEntry } from "@/lib/log-store";
import { useOutreachStore } from "@/lib/outreach-store";
import { cn } from "@/lib/utils";

type SortMode = "az" | "count";
type AppTab = "extract" | "template" | "engine";

export function ExtractorApp() {
  const [raw, setRaw] = useState("");
  const [tag, setTag] = useState("leads");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("az");
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<AppTab>("extract");
  const fileRef = useRef<HTMLInputElement>(null);
  const entries = useLogStore((s) => s.entries);
  const addEntry = useLogStore((s) => s.add);
  const removeEntry = useLogStore((s) => s.remove);
  const clearEntries = useLogStore((s) => s.clear);
  const setOutreachSource = useOutreachStore((s) => s.setSource);
  useEffect(() => setHydrated(true), []);

  const runExtract = useCallback((source = raw) => {
    const next = extractDomains(source);
    setResult(next);
    setQuery("");
    if (next.domains.length === 0) {
      toast.message("No domains found", { description: "Paste emails like name@company.com or drop a .txt file." });
      return next;
    }
    toast.success(`${next.domains.length} unique domain${next.domains.length === 1 ? "" : "s"}`);
    return next;
  }, [raw]);

  const onDropFile = useCallback(async (file: File) => {
    const text = await file.text();
    setRaw(text);
    const name = file.name.replace(/\.[^.]+$/, "");
    if (name && tag === "leads") setTag(slugifyTag(name));
    runExtract(text);
  }, [runExtract, tag]);

  const filtered = useMemo(() => {
    if (!result) return [];
    const q = query.trim().toLowerCase();
    const rows = q ? result.domains.filter((d) => d.domain.includes(q) || d.emails.some((e) => e.includes(q))) : result.domains;
    return sort === "count" ? [...rows].sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)) : rows;
  }, [query, result, sort]);

  const saveToLog = useCallback((extracted = result) => {
    if (!extracted || extracted.domains.length === 0) { toast.error("Extract domains first"); return; }
    const now = new Date();
    const filename = buildLogFilename(now, tag);
    const domains = extracted.domains.map((d) => d.domain);
    const createdAt = now.toISOString();
    const body = formatLogFile({ filename, createdAt, tag: slugifyTag(tag), emailCount: extracted.emails.length, domains });
    const entry: LogEntry = { id: crypto.randomUUID(), createdAt, tag: slugifyTag(tag), filename, emailCount: extracted.emails.length, uniqueDomains: domains.length, skipped: extracted.skipped.length, domains, rows: extracted.domains, body };
    addEntry(entry);
    downloadText(filename, body);
    setLastSaved(`log/${filename}`);
    toast.success("Saved to log", { description: `log/${filename}` });
    return entry;
  }, [addEntry, result, tag]);

  const copyDomains = useCallback(async () => {
    if (!result || result.domains.length === 0) return;
    await navigator.clipboard.writeText(result.domains.map((d) => d.domain).join("\n"));
    setCopied(true);
    toast.success("Domains copied");
    window.setTimeout(() => setCopied(false), 1400);
  }, [result]);

  const queueReachOut = useCallback((entry: Pick<LogEntry, "id" | "filename" | "domains" | "rows">) => {
    setOutreachSource({ id: entry.id, label: `log/${entry.filename}`, domains: entry.domains, rows: entry.rows });
    setTab("engine");
    toast.success("Loaded into reach-out");
  }, [setOutreachSource]);

  const visibleEntries = hydrated ? entries : [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Toaster theme="dark" position="bottom-center" toastOptions={{ classNames: { toast: "bg-card text-foreground border-border font-sans" } }} />
      <div className="relative mx-auto flex min-h-dvh max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex items-start gap-3">
          <span className="mt-0.5 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><AtSign className="size-5" /></span>
          <div>
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Lead archive</p>
            <h1 className="text-3xl font-semibold tracking-tight">Domain Log</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">Extract unique domains, file them by date and tag, then scan live sites.</p>
          </div>
        </header>
        <nav className="mb-5 flex gap-1 rounded-xl bg-card p-1">
          {([["extract", "Extract", FolderClosed], ["template", "template/", FileCode2], ["engine", "Reach-out", Radar]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" className={cn("flex h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium", tab === id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => setTab(id)}>
              <Icon className="size-4" />{label}
            </button>
          ))}
        </nav>
        {tab === "template" ? <TemplatePanel /> : null}
        {tab === "engine" ? <OutreachEngine /> : null}
        {tab === "extract" ? (
          <>
            <div className="grid flex-1 gap-4 lg:grid-cols-12">
              <section className="rounded-2xl bg-card p-4 lg:col-span-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">leads.txt</h2>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setRaw(SAMPLE_LEADS); runExtract(SAMPLE_LEADS); }}>Load sample</Button>
                </div>
                <div className={cn("relative min-h-64 rounded-xl bg-input p-1", dragging && "ring-2 ring-ring")} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) void onDropFile(file); }}>
                  <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste emails here" className="min-h-64 border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0" spellCheck={false} />
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-40 flex-1 space-y-1.5"><Label htmlFor="tag">Tag</Label><Input id="tag" value={tag} onChange={(e) => setTag(e.target.value)} className="font-mono" /></div>
                  <input ref={fileRef} type="file" accept=".txt,.csv,.tsv,.md,text/plain" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void onDropFile(file); e.target.value = ""; }} />
                  <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}><Upload /> File</Button>
                  <Button type="button" onClick={() => runExtract()}><FileInput /> Extract</Button>
                </div>
              </section>
              <section className="rounded-2xl bg-card p-4 lg:col-span-7">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">Domains</h2>
                    {result ? <Badge variant="ok">{result.domains.length} unique</Badge> : <Badge variant="outline">waiting</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" disabled={!result?.domains.length} onClick={() => void copyDomains()}>{copied ? <Check /> : <Copy />} Copy</Button>
                    <Button type="button" size="sm" disabled={!result?.domains.length} onClick={() => saveToLog()}><Archive /> Save to log</Button>
                    <Button type="button" variant="secondary" size="sm" disabled={!result?.domains.length} onClick={() => { const entry = saveToLog(); if (entry) queueReachOut(entry); }}><Send /> Reach out</Button>
                  </div>
                </div>
                {result && result.domains.length > 0 ? (
                  <>
                    <div className="relative mb-2"><Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter domains" className="pl-9" /></div>
                    <ul className="max-h-80 overflow-auto rounded-xl bg-input px-2 py-1">
                      {filtered.map((row) => (
                        <li key={row.domain} className="flex justify-between gap-3 border-b border-border/60 px-2 py-2 last:border-0">
                          <span className="font-mono text-sm break-all">{row.domain}</span>
                          <span className="font-mono text-xs text-muted-foreground">{row.count}</span>
                        </li>
                      ))}
                    </ul>
                    {lastSaved ? <p className="mt-3 font-mono text-xs">Saved → {lastSaved}</p> : null}
                  </>
                ) : (
                  <div className="rounded-xl bg-input px-6 py-12 text-center text-sm text-muted-foreground">No domains yet. Extract a list or load the sample.</div>
                )}
              </section>
            </div>
            <section className="mt-4 rounded-2xl bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">log/</h2>
                {visibleEntries.length > 0 ? <Button type="button" variant="ghost" size="sm" onClick={() => { clearEntries(); setLastSaved(null); }}>Clear log</Button> : null}
              </div>
              {visibleEntries.length === 0 ? (
                <p className="rounded-xl bg-input px-4 py-8 text-center text-sm text-muted-foreground">Save to log after extract.</p>
              ) : (
                <ul className="divide-y divide-border rounded-xl bg-input">
                  {visibleEntries.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                      <div><p className="font-mono text-sm">log/{entry.filename}</p><p className="text-xs text-muted-foreground">{entry.uniqueDomains} domains</p></div>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => queueReachOut(entry)}><Send /></Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => downloadText(entry.filename, entry.body)}><Download /></Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => { void navigator.clipboard.writeText(entry.domains.join("\n")); toast.success("Copied"); }}><Copy /></Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEntry(entry.id)}><Trash2 /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
