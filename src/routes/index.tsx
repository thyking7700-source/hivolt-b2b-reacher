import { createFileRoute } from "@tanstack/react-router";
import { ExtractorApp } from "@/components/app/extractor-app";
import { LicenseGate } from "@/components/app/license-gate";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <LicenseGate>
      <ExtractorApp />
    </LicenseGate>
  );
}
