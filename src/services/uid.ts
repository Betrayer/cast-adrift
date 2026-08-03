// A separate module from `services/firebase` on purpose: account linking needs
// this predicate at boot, and importing the firebase service statically would
// drag the whole SDK into the initial chunk the code split exists to protect.
export const TELEGRAM_UID_PREFIX = "tg:";

export const isTelegramUid = (uid: string | null): boolean =>
  uid !== null && uid.startsWith(TELEGRAM_UID_PREFIX);
