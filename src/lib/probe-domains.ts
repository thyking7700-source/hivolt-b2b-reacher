import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ProbeHit = {
  domain: string; live: boolean; status: number | null; finalUrl: string | null;
  title: string | null; contactUrl: string | null; mailto: string | null; reason: string;
};

export const probeDomains = createServerFn({ method: "POST" })
  .validator(z.object({ domains: z.array(z.string().min(1).max(253)).min(1).max(1000) }))
  .handler(async ({ data }): Promise<ProbeHit[]> => {
    const { runProbe } = await import("./probe-impl.server");
    return runProbe(data.domains);
  });
