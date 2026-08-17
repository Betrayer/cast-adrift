export const TELEGRAM_UID_PREFIX = "tg:";

export const isTelegramUid = (uid: string | null): boolean =>
  uid !== null && uid.startsWith(TELEGRAM_UID_PREFIX);

export type AuthProviderId = "google" | "password" | "telegram";

export const GOOGLE_PROVIDER_ID = "google.com";
export const PASSWORD_PROVIDER_ID = "password";

export interface AccountInfo {
  uid: string;
  isAnonymous: boolean;
  providers: AuthProviderId[];
  email: string | null;
}

const PROVIDER_BY_FIREBASE_ID: Partial<Record<string, AuthProviderId>> = {
  [GOOGLE_PROVIDER_ID]: "google",
  [PASSWORD_PROVIDER_ID]: "password",
};

export const providersOf = (
  uid: string,
  firebaseProviderIds: readonly string[],
): AuthProviderId[] => {
  const out: AuthProviderId[] = [];
  if (isTelegramUid(uid)) out.push("telegram");
  for (const id of firebaseProviderIds) {
    const mapped = PROVIDER_BY_FIREBASE_ID[id];
    if (mapped !== undefined && !out.includes(mapped)) out.push(mapped);
  }
  return out;
};

export const isGuestAccount = (account: AccountInfo | null): boolean =>
  account === null || account.providers.length === 0;

export const SUPPORT_ID_LENGTH = 6;
export const SUPPORT_ID_PENDING = "——————";

export const supportId = (uid: string | null): string =>
  uid === null
    ? SUPPORT_ID_PENDING
    : uid.slice(-SUPPORT_ID_LENGTH).toUpperCase();
