import { createFileRoute } from "@tanstack/react-router";
import { LicenseGate } from "@/components/app/license-gate";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <LicenseGate>
      <main className="min-h-screen px-6 py-10">
        <h1 className="text-xl font-semibold">HIVOLT B2B Reacher</h1>
        <p className="mt-2 text-sm text-muted-foreground">License accepted. Panel files are loading in this public build.</p>
      </main>
    </LicenseGate>
  );
}
