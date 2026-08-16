export const TELEGRAM_UID_PREFIX = "tg:";

export const isTelegramUid = (uid: string | null): boolean =>
  uid !== null && uid.startsWith(TELEGRAM_UID_PREFIX);
