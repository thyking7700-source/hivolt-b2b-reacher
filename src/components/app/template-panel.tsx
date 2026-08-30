"use client";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatFullAddress } from "@/lib/form-profile";
import { MERGE_FIELDS, mergeTemplate } from "@/lib/merge-template";
import { DEFAULT_BODY_HTML, useTemplateStore } from "@/lib/template-store";

export function TemplatePanel() {
  const t = useTemplateStore();
  const fullAddress = formatFullAddress(t);
  const preview = mergeTemplate(t.html, {
    company: "", domain: "", from_name: t.fromName, first_name: t.firstName, last_name: t.lastName,
    sender_company: t.senderCompany, job_title: t.jobTitle, business_email: t.businessEmail, from_email: t.fromEmail,
    reply_to: t.replyTo || t.businessEmail, phone: t.phone, address: t.streetAddress, city: t.city, state: t.state,
    postal: t.postalCode, country: t.country, date: new Date().toLocaleDateString(),
  });
  async function copy(value: string, label: string) {
    if (!value.trim()) { toast.message(`No ${label} yet`); return; }
    await navigator.clipboard.writeText(value.trim());
    toast.success(`Copied ${label}`);
  }
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <section className="rounded-2xl bg-card p-4 lg:col-span-7">
        <h2 className="mb-3 text-sm font-semibold">template/bodymsg.html</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Subject</Label><Input value={t.subject} onChange={(e) => t.setSubject(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>First name</Label><Input value={t.firstName} onChange={(e) => t.setFirstName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Last name</Label><div className="flex gap-2"><Input value={t.lastName} onChange={(e) => t.setLastName(e.target.value)} /><Button type="button" variant="secondary" size="sm" onClick={() => void copy(t.fromName || `${t.firstName} ${t.lastName}`, "full name")}><Copy /> Full name</Button></div></div>
          <div className="space-y-1.5"><Label>Company</Label><Input value={t.senderCompany} onChange={(e) => t.setSenderCompany(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Title</Label><Input value={t.jobTitle} onChange={(e) => t.setJobTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Business email</Label><Input value={t.businessEmail} onChange={(e) => t.setBusinessEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>From email</Label><Input value={t.fromEmail} onChange={(e) => t.setFromEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><div className="flex gap-2"><Input value={t.phone} onChange={(e) => t.setPhone(e.target.value)} /><Button type="button" variant="secondary" size="sm" onClick={() => void copy(t.phone, "phone")}><Copy /></Button></div></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Address</Label><div className="flex gap-2"><Input value={t.streetAddress} onChange={(e) => t.setStreetAddress(e.target.value)} /><Button type="button" variant="secondary" size="sm" onClick={() => void copy(fullAddress, "address")}><Copy /> Full address</Button></div></div>
          <div className="space-y-1.5"><Label>Country</Label><Input value={t.country} onChange={(e) => t.setCountry(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>State</Label><Input value={t.state} onChange={(e) => t.setState(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>City</Label><Input value={t.city} onChange={(e) => t.setCity(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Postal</Label><Input value={t.postalCode} onChange={(e) => t.setPostalCode(e.target.value)} /></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{MERGE_FIELDS.map((field) => (<button key={field} type="button" className="h-8 rounded-md bg-muted px-2 font-mono text-xs" onClick={() => t.setHtml(`${t.html}{{${field}}}`)}>{`{{${field}}}`}</button>))}</div>
        <Label className="mt-3 mb-1.5 block">Message body</Label>
        <Textarea value={t.html} onChange={(e) => t.setHtml(e.target.value)} className="min-h-56 font-mono text-sm" />
        <div className="mt-3 flex gap-2">
          <Button type="button" size="sm" onClick={() => { t.setHtml(`<p>Hello,</p><p>${t.subject || "Could you please provide a quote?"}</p><p>{{from_name}}<br>{{business_email}}<br>{{phone}}</p>`); toast.success("Volt SmartMsg drafted from subject"); }}><Sparkles /> Volt SmartMsg</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => t.setHtml(DEFAULT_BODY_HTML)}>Reset body</Button>
        </div>
      </section>
      <section className="rounded-2xl bg-card p-4 lg:col-span-5">
        <h2 className="text-sm font-semibold">Preview</h2>
        <iframe title="preview" sandbox="" srcDoc={`<!doctype html><html><body style="font:15px/1.5 Arial;padding:16px">${preview}</body></html>`} className="mt-3 h-80 w-full rounded-xl bg-white" />
      </section>
    </div>
  );
}
