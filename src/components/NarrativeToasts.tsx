import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { useNarrativeStore } from "@/stores/narrativeStore";

const CONSEQUENCE_MS = 4000;
const BARK_MS = 3500;

const ConsequenceToast = () => {
  const { t } = useTranslation(["run", "content"]);
  const consequence = useNarrativeStore((s) => s.consequence);
  const dismiss = useNarrativeStore((s) => s.dismissConsequence);

  useEffect(() => {
    if (consequence === null) return;
    const id = window.setTimeout(dismiss, CONSEQUENCE_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [consequence, dismiss]);

  if (consequence === null) return null;
  return (
    <div
      role="status"
      onClick={dismiss}
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: 420,
        width: "calc(100% - 24px)",
        zIndex: 900,
        padding: "10px 14px",
        borderRadius: 10,
        background: tokens.surface2,
        border: `1px solid ${tokens.accent}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        color: tokens.text,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {t("run:consequenceToast", {
        text: t(consequence.origin),
      })}
    </div>
  );
};

const BarkToast = () => {
  const { t } = useTranslation(["content"]);
  const bark = useNarrativeStore((s) => s.bark);
  const dismiss = useNarrativeStore((s) => s.dismissBark);

  useEffect(() => {
    if (bark === null) return;
    const id = window.setTimeout(dismiss, BARK_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [bark, dismiss]);

  if (bark === null) return null;
  return (
    <div
      role="status"
      onClick={dismiss}
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: 460,
        width: "calc(100% - 24px)",
        zIndex: 850,
        padding: "8px 14px",
        borderRadius: 999,
        background: "rgba(16,24,42,0.92)",
        borderLeft: `3px solid ${tokens.accent}`,
        color: tokens.dim,
        fontSize: 13,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ color: tokens.accent, fontWeight: 700 }}>◆</span>
      <span>{t(bark.line)}</span>
    </div>
  );
};

export const NarrativeToasts = () => (
  <>
    <ConsequenceToast />
    <BarkToast />
  </>
);
