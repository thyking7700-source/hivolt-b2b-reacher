import { useTemplateStore } from "@/lib/template-store";
export type FormFieldKey = "fullName" | "firstName" | "lastName" | "senderCompany" | "jobTitle" | "businessEmail" | "phone" | "streetAddress" | "fullAddress" | "country" | "state" | "city" | "postalCode" | "subject" | "message";
export function formatFullAddress(t: { streetAddress?: string; city?: string; state?: string; postalCode?: string; country?: string }): string {
  const street = (t.streetAddress ?? "").trim().replace(/,+$/, "");
  const city = (t.city ?? "").trim().replace(/,+$/, "");
  const region = (t.state ?? "").trim();
  const zip = (t.postalCode ?? "").trim();
  const country = (t.country ?? "").trim();
  const cityLine = [city, [region, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [street, cityLine, country].filter(Boolean).join(", ");
}
export const FORM_FIELDS: Array<{ key: FormFieldKey; label: string }> = [
  { key: "fullName", label: "Full name" }, { key: "firstName", label: "First" }, { key: "lastName", label: "Last" },
  { key: "senderCompany", label: "Company" }, { key: "jobTitle", label: "Title" }, { key: "businessEmail", label: "Email" },
  { key: "phone", label: "Phone" }, { key: "streetAddress", label: "Address" }, { key: "fullAddress", label: "Full address" },
  { key: "country", label: "Country" }, { key: "state", label: "State" }, { key: "city", label: "City" }, { key: "postalCode", label: "ZIP" },
  { key: "subject", label: "Subject" }, { key: "message", label: "Message" },
];
export function readFormField(key: FormFieldKey, messagePlain = ""): string {
  const t = useTemplateStore.getState();
  if (key === "message") return messagePlain.trim();
  if (key === "fullName") return (t.fromName || `${t.firstName} ${t.lastName}`).replace(/\s+/g, " ").trim();
  if (key === "fullAddress") return formatFullAddress(t);
  const value = t[key as "firstName"];
  return typeof value === "string" ? value.trim() : "";
}
