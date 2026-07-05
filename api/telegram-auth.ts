import { createHmac } from "node:crypto";
import process from "node:process";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const MAX_AGE_SECONDS = 86400;

const readInitData = (body: unknown): string | null => {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as { initData?: unknown }).initData;
  return typeof value === "string" && value.length > 0 ? value : null;
};

const validateInitData = (
  initData: string,
  botToken: string,
): URLSearchParams | null => {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (hash === null) return null;
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const computed = createHmac("sha256", secretKey)
    .update(pairs.join("\n"))
    .digest("hex");
  return computed === hash ? params : null;
};

const extractTelegramId = (params: URLSearchParams): number | null => {
  const userRaw = params.get("user");
  if (userRaw === null) return null;
  try {
    const parsed: unknown = JSON.parse(userRaw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { id?: unknown }).id === "number"
    ) {
      return (parsed as { id: number }).id;
    }
  } catch {
    return null;
  }
  return null;
};

const ensureAdmin = (): void => {
  if (getApps().length > 0) return;
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method-not-allowed" });
    return;
  }
  const botToken = process.env.CA_TG_BOT_TOKEN?.trim();
  if (!botToken) {
    res.status(500).json({ error: "server-misconfigured" });
    return;
  }
  const initData = readInitData(req.body);
  if (initData === null) {
    res.status(400).json({ error: "missing-init-data" });
    return;
  }
  const params = validateInitData(initData, botToken);
  if (params === null) {
    res.status(401).json({ error: "invalid-init-data" });
    return;
  }
  const authDate = Number(params.get("auth_date"));
  if (
    !Number.isFinite(authDate) ||
    Date.now() / 1000 - authDate > MAX_AGE_SECONDS
  ) {
    res.status(401).json({ error: "stale-init-data" });
    return;
  }
  const telegramId = extractTelegramId(params);
  if (telegramId === null) {
    res.status(401).json({ error: "no-user" });
    return;
  }
  try {
    ensureAdmin();
    const token = await getAuth().createCustomToken(`tg:${String(telegramId)}`);
    res.status(200).json({ token });
  } catch (error) {
    console.error("telegram-auth token-failed", error);
    res.status(500).json({ error: "token-failed" });
  }
}
