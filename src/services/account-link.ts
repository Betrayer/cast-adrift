import { now } from "@/services/clock";
import {
  firestoreMetaDocs,
  isEmptyProfile,
  profileSummary,
  type MetaDoc,
  type MetaDocPort,
  type ProfileSummary,
} from "@/services/metaDoc";
import { deviceStorage } from "@/services/profile";
import { isTelegramUid, type AccountInfo, type AuthProviderId } from "@/services/uid";

export type LinkOutcome =
  | "skipped"
  | "already-linked"
  | "nothing-to-claim"
  | "copied"
  | "kept-target"
  | "replaced-target"
  | "prompted"
  | "pending"
  | "failed";

export const resolveLink = (
  source: MetaDoc | null,
  target: MetaDoc | null,
): "copied" | "kept-target" | "replaced-target" => {
  if (source === null) return "kept-target";
  if (target === null) return "copied";
  return target.updatedAt >= source.updatedAt ? "kept-target" : "replaced-target";
};

export type ProviderAttachPlan = "sign-in" | "link" | "already-linked";

export const planProviderAttach = (
  account: AccountInfo | null,
  provider: AuthProviderId,
): ProviderAttachPlan => {
  if (account === null) return "sign-in";
  if (account.providers.includes(provider)) return "already-linked";
  return "link";
};

export const switchAbandonsProfile = (
  sourceUid: string | null,
  targetUid: string,
): boolean => sourceUid !== null && sourceUid !== targetUid;

export const shouldHandOver = (previousUid: string | null): boolean =>
  previousUid !== null && !isTelegramUid(previousUid);

export type ClaimDecision =
  | { kind: "nothing-to-claim" }
  | { kind: "copy" }
  | { kind: "prompt"; recommended: "source" | "target" };

export const decideClaim = (
  source: MetaDoc | null,
  target: MetaDoc | null,
): ClaimDecision => {
  if (source === null || isEmptyProfile(profileSummary(source))) {
    return { kind: "nothing-to-claim" };
  }
  if (target === null || isEmptyProfile(profileSummary(target))) {
    return { kind: "copy" };
  }
  return {
    kind: "prompt",
    recommended: resolveLink(source, target) === "kept-target" ? "target" : "source",
  };
};

export interface MergePrompt {
  sourceUid: string;
  targetUid: string;
  source: ProfileSummary;
  target: ProfileSummary;
  recommended: "source" | "target";
}

export const mergePromptFor = (
  sourceUid: string,
  targetUid: string,
  source: MetaDoc | null,
  target: MetaDoc | null,
  recommended: "source" | "target",
): MergePrompt => ({
  sourceUid,
  targetUid,
  source: profileSummary(source),
  target: profileSummary(target),
  recommended,
});

export interface PendingClaim {
  sourceUid: string;
  meta: MetaDoc | null;
  boards: string[];
}

const CLAIM_KEY = "ca.claim";

export const stashClaim = (claim: PendingClaim): void => {
  deviceStorage.setItem(CLAIM_KEY, JSON.stringify(claim));
};

export const readClaim = (): PendingClaim | null => {
  const raw = deviceStorage.getItem(CLAIM_KEY);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const claim = parsed as Partial<PendingClaim>;
  if (typeof claim.sourceUid !== "string") return null;
  return {
    sourceUid: claim.sourceUid,
    meta: claim.meta ?? null,
    boards: Array.isArray(claim.boards)
      ? claim.boards.filter((board): board is string => typeof board === "string")
      : [],
  };
};

export const clearClaim = (): void => {
  deviceStorage.removeItem(CLAIM_KEY);
};

export const linkMarkerKey = (fromUid: string, toUid: string): string =>
  `ca.link.${fromUid}.${toUid}`;

export const hasLinkMarker = (fromUid: string, toUid: string): boolean =>
  deviceStorage.getItem(linkMarkerKey(fromUid, toUid)) !== null;

export const writeLinkMarker = (fromUid: string, toUid: string): void => {
  deviceStorage.setItem(linkMarkerKey(fromUid, toUid), String(now()));
};

export interface ClaimResult {
  outcome: Extract<LinkOutcome, "copied" | "replaced-target" | "failed">;
  written: MetaDoc | null;
}

export const claimProfile = async (
  claim: PendingClaim,
  targetUid: string,
  port: MetaDocPort = firestoreMetaDocs,
): Promise<ClaimResult> => {
  const source = claim.meta;
  if (source === null) return { outcome: "failed", written: null };
  try {
    const existing = await port.read(targetUid);
    if (existing !== null) await port.archive(targetUid, existing, now());
    const written: MetaDoc = {
      v: source.v,
      updatedAt: now(),
      data: source.data,
      linkedFrom: claim.sourceUid,
    };
    await port.write(targetUid, written);
    writeLinkMarker(claim.sourceUid, targetUid);
    clearClaim();
    return { outcome: existing === null ? "copied" : "replaced-target", written };
  } catch (error) {
    console.warn("account-link: claim failed", error);
    return { outcome: "failed", written: null };
  }
};

export const abandonClaim = (claim: PendingClaim, targetUid: string): void => {
  writeLinkMarker(claim.sourceUid, targetUid);
  clearClaim();
};
