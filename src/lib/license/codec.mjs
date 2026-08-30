import { createHmac, timingSafeEqual } from "node:crypto";

export const TOKEN_PREFIX = "HV1";

export function b64url(buf) {
  return Buffer.from(buf).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

export function fromB64url(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replaceAll("-", "+").replaceAll("_", "/") + pad, "base64");
}

export function signPayload(payload, secret) {
  const body = b64urlJson(payload);
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${TOKEN_PREFIX}.${body}.${sig}`;
}

export function parseToken(raw) {
  const token = String(raw ?? "").trim();
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    throw new Error("Not a HIVOLT access token");
  }
  return { body: parts[1], sig: parts[2], token };
}

export function verifyToken(raw, secret) {
  const { body, sig } = parseToken(raw);
  const expected = b64url(createHmac("sha256", secret).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid access token");
  }
  let payload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8"));
  } catch {
    throw new Error("Corrupt access token");
  }
  if (!payload || typeof payload !== "object") throw new Error("Corrupt access token");
  const exp = Number(payload.exp);
  if (!Number.isFinite(exp)) throw new Error("Token has no expiry");
  if (exp * 1000 <= Date.now()) throw new Error("Access token expired");
  return {
    sub: String(payload.sub || "license"),
    plan: payload.plan ? String(payload.plan) : "standard",
    exp,
    iat: Number(payload.iat) || 0,
    note: payload.note ? String(payload.note) : "",
  };
}
