export const AUTH_ERROR_CODES = [
  "cancelled",
  "popupBlocked",
  "network",
  "invalidEmail",
  "weakPassword",
  "wrongPassword",
  "userNotFound",
  "emailInUse",
  "credentialInUse",
  "providerLinked",
  "tooManyRequests",
  "recentLoginRequired",
  "providerDisabled",
  "unknown",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

const BY_FIREBASE_CODE: Partial<Record<string, AuthErrorCode>> = {
  "auth/popup-closed-by-user": "cancelled",
  "auth/cancelled-popup-request": "cancelled",
  "auth/user-cancelled": "cancelled",
  "auth/popup-blocked": "popupBlocked",
  "auth/operation-not-supported-in-this-environment": "popupBlocked",
  "auth/network-request-failed": "network",
  "auth/invalid-email": "invalidEmail",
  "auth/missing-email": "invalidEmail",
  "auth/weak-password": "weakPassword",
  "auth/wrong-password": "wrongPassword",
  "auth/invalid-credential": "wrongPassword",
  "auth/invalid-login-credentials": "wrongPassword",
  "auth/user-not-found": "userNotFound",
  "auth/user-disabled": "userNotFound",
  "auth/email-already-in-use": "emailInUse",
  "auth/credential-already-in-use": "credentialInUse",
  "auth/account-exists-with-different-credential": "credentialInUse",
  "auth/provider-already-linked": "providerLinked",
  "auth/too-many-requests": "tooManyRequests",
  "auth/requires-recent-login": "recentLoginRequired",
  "auth/operation-not-allowed": "providerDisabled",
  "auth/admin-restricted-operation": "providerDisabled",
};

export const firebaseErrorCode = (error: unknown): string | null => {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
};

export const authErrorCode = (error: unknown): AuthErrorCode => {
  const code = firebaseErrorCode(error);
  if (code === null) return "unknown";
  return BY_FIREBASE_CODE[code] ?? "unknown";
};

export const takesOverIdentity = (code: AuthErrorCode): boolean =>
  code === "credentialInUse" || code === "emailInUse";

export const isSilentAuthError = (code: AuthErrorCode): boolean =>
  code === "cancelled";
