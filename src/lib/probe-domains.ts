export type ProbeHit = {
  domain: string;
  live: boolean;
  status: number | null;
  finalUrl: string | null;
  title: string | null;
  contactUrl: string | null;
  mailto: string | null;
  reason: string;
};
