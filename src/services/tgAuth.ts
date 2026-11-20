export type TgAuthFailure = "missingConfig" | "badSignature" | "network";

export interface TgAuthResult {
  uid: string | null;
  reason: TgAuthFailure | null;
}

export const readServerError = (body: unknown): string | null => {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as { error?: unknown }).error;
  return typeof value === "string" ? value : null;
};

export const tgFailureFor = (
  status: number,
  serverError: string | null,
): TgAuthFailure => {
  if (serverError === "server-misconfigured") return "missingConfig";
  if (serverError === "token-failed") return "missingConfig";
  if (status === 401 || status === 400) return "badSignature";
  return "network";
};
