import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const verifyAccessToken = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(8).max(2000) }))
  .handler(async ({ data }) => {
    const { loadLicenseSecret } = await import("./secret.mjs");
    const { verifyToken } = await import("./codec.mjs");
    try {
      const claims = verifyToken(data.token, loadLicenseSecret());
      return { ok: true as const, sub: claims.sub, plan: claims.plan, exp: claims.exp, note: claims.note };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Invalid access token" };
    }
  });
