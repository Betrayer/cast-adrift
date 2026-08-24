import {
  abandonClaim,
  claimProfile,
  clearClaim,
  decideClaim,
  hasLinkMarker,
  mergePromptFor,
  planProviderAttach,
  readClaim,
  stashClaim,
  type LinkOutcome,
  type PendingClaim,
} from "@/services/account-link";
import {
  authErrorCode,
  isSilentAuthError,
  takesOverIdentity,
} from "@/services/authErrors";
import { boundedTask } from "@/services/bounded";
import { ownBoardIds, supersedeOwnRows } from "@/services/leaderboards";
import { applyMetaDoc, flushMetaSync, metaDocSnapshot } from "@/services/meta-sync";
import {
  firestoreMetaDocs,
  isEmptyProfile,
  profileSummary,
  type MetaDoc,
} from "@/services/metaDoc";
import { activeUid } from "@/services/profile";
import { bootProfileSync, refreshAccount } from "@/services/profileSwitch";
import { openExternalLink } from "@/services/tma";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";

const BOARD_FLIP_TIMEOUT = 6000;
const CLAIM_TIMEOUT = 30_000;

let promptedTarget: MetaDoc | null = null;
let lastOutcome: LinkOutcome | null = null;

export const lastClaimOutcome = (): LinkOutcome | null => lastOutcome;

const runAuthAction = async (action: () => Promise<void>): Promise<void> => {
  const app = useAppStore.getState();
  app.setAuthBusy(true);
  app.setAuthError(null);
  try {
    await action();
  } catch (error) {
    const code = authErrorCode(error);
    if (!isSilentAuthError(code)) useAppStore.getState().setAuthError(code);
    console.warn("account: action failed", error);
  } finally {
    useAppStore.getState().setAuthBusy(false);
  }
};

const localClaim = async (): Promise<PendingClaim | null> => {
  const uid = activeUid();
  if (uid === null) return null;
  await flushMetaSync();
  const state = useMetaStore.getState();
  return {
    sourceUid: uid,
    meta: metaDocSnapshot(),
    boards: ownBoardIds({
      driftBest: state.best.drift,
      driftWeek: state.best.driftWeek,
      dailyDates: Object.keys(state.dailyPlayed),
    }),
  };
};

export const beginIdentityHandover = async (
  targetUid: string | null = null,
): Promise<boolean> => {
  const claim = await localClaim();
  if (claim === null) return false;
  if (targetUid !== null && targetUid === claim.sourceUid) return false;
  if (targetUid !== null && hasLinkMarker(claim.sourceUid, targetUid)) {
    return false;
  }
  if (isEmptyProfile(profileSummary(claim.meta))) return false;
  stashClaim(claim);
  await boundedTask(
    supersedeOwnRows(claim.sourceUid, claim.boards),
    BOARD_FLIP_TIMEOUT,
    0,
  );
  return true;
};

const runClaim = async (
  claim: PendingClaim,
  targetUid: string,
): Promise<LinkOutcome> => {
  const result = await claimProfile(claim, targetUid);
  if (result.written !== null) applyMetaDoc(result.written);
  return result.outcome;
};

const resolveClaim = async (): Promise<LinkOutcome> => {
  const claim = readClaim();
  if (claim === null) return "skipped";
  const targetUid = activeUid();
  if (targetUid === null) return "skipped";
  if (claim.sourceUid === targetUid) {
    clearClaim();
    return "skipped";
  }
  if (hasLinkMarker(claim.sourceUid, targetUid)) {
    clearClaim();
    return "already-linked";
  }
  if (isEmptyProfile(profileSummary(claim.meta))) {
    abandonClaim(claim, targetUid);
    return "nothing-to-claim";
  }
  let targetDoc: MetaDoc | null;
  try {
    targetDoc = await firestoreMetaDocs.read(targetUid);
  } catch (error) {
    console.warn("account: target profile unreadable, claim kept", error);
    return "failed";
  }
  const decision = decideClaim(claim.meta, targetDoc);
  if (decision.kind === "nothing-to-claim") {
    abandonClaim(claim, targetUid);
    return "nothing-to-claim";
  }
  if (decision.kind === "copy") return await runClaim(claim, targetUid);
  promptedTarget = targetDoc;
  useAppStore
    .getState()
    .setMerge(
      mergePromptFor(
        claim.sourceUid,
        targetUid,
        claim.meta,
        targetDoc,
        decision.recommended,
      ),
    );
  return "prompted";
};

export const resolvePendingClaim = async (): Promise<LinkOutcome> => {
  const outcome = await resolveClaim();
  lastOutcome = outcome;
  return outcome;
};

export const resolveMergeChoice = async (
  keep: "source" | "target",
): Promise<LinkOutcome> => {
  const prompt = useAppStore.getState().merge;
  if (prompt === null) return "skipped";
  const claim = readClaim();
  const app = useAppStore.getState();
  app.setAuthBusy(true);
  app.setAuthError(null);
  try {
    if (claim === null) return "skipped";
    if (keep === "target") {
      if (promptedTarget !== null) applyMetaDoc(promptedTarget);
      abandonClaim(claim, prompt.targetUid);
      return "kept-target";
    }
    const outcome = await runClaim(claim, prompt.targetUid);
    if (outcome === "failed") {
      useAppStore.getState().setAuthError("network");
      return outcome;
    }
    return outcome;
  } finally {
    if (useAppStore.getState().authError === null) {
      promptedTarget = null;
      useAppStore.getState().setMerge(null);
      void bootProfileSync();
    }
    useAppStore.getState().setAuthBusy(false);
  }
};

const settleIdentity = async (): Promise<void> => {
  await refreshAccount();
  const outcome = await boundedTask(
    resolvePendingClaim(),
    CLAIM_TIMEOUT,
    "pending",
  );
  if (outcome === "prompted" || outcome === "pending") return;
  if (readClaim() !== null) return;
  void bootProfileSync();
};

export const openAccountInBrowser = (): boolean =>
  openExternalLink(window.location.href);

export const continueWithGoogle = async (): Promise<void> => {
  if (useAppStore.getState().isTelegram) {
    if (!openAccountInBrowser()) {
      useAppStore.getState().setAuthError("popupBlocked");
    }
    return;
  }
  await runAuthAction(async () => {
    const {
      googleCredentialFromError,
      linkGoogle,
      signInGoogle,
      signInWithSavedCredential,
    } = await import("@/services/firebase");
    const plan = planProviderAttach(useAppStore.getState().account, "google");
    if (plan === "already-linked") return;
    if (plan === "sign-in") {
      await signInGoogle();
      await settleIdentity();
      return;
    }
    try {
      await linkGoogle();
    } catch (error) {
      if (!takesOverIdentity(authErrorCode(error))) throw error;
      const credential = googleCredentialFromError(error);
      if (credential === null) throw error;
      await beginIdentityHandover();
      await signInWithSavedCredential(credential);
    }
    await settleIdentity();
  });
};

export const registerWithEmail = async (
  email: string,
  password: string,
): Promise<void> => {
  await runAuthAction(async () => {
    const { linkEmail, registerEmail } = await import("@/services/firebase");
    if (useAppStore.getState().account === null) {
      await registerEmail(email, password);
    } else {
      await linkEmail(email, password);
    }
    await settleIdentity();
  });
};

export const signInWithEmailAccount = async (
  email: string,
  password: string,
): Promise<void> => {
  await runAuthAction(async () => {
    const { probeEmailAccount, signInEmail } = await import(
      "@/services/firebase"
    );
    const targetUid = await probeEmailAccount(email, password);
    if (targetUid !== activeUid()) await beginIdentityHandover(targetUid);
    await signInEmail(email, password);
    await settleIdentity();
  });
};

export const sendResetEmail = async (email: string): Promise<void> => {
  await runAuthAction(async () => {
    const { resetEmail } = await import("@/services/firebase");
    await resetEmail(email);
  });
};

export const leaveAccount = async (): Promise<void> => {
  await runAuthAction(async () => {
    const { ensureAnonAuth, signOutUser } = await import(
      "@/services/firebase"
    );
    await flushMetaSync();
    clearClaim();
    await signOutUser();
    const uid = await ensureAnonAuth();
    if (uid === null) throw new Error("account: guest sign-in unavailable");
    await refreshAccount();
    useAppStore.getState().go("menu");
  });
};

