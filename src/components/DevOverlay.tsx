import { tokens } from "@/app/theme";
import { axisLabel } from "@/game/run/axis";
import { useRunStore } from "@/stores/runStore";

const isDebug = (): boolean =>
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debug") === "1";

export const DevOverlay = () => {
  const active = useRunStore((s) => s.active);
  const axis = useRunStore((s) => s.axis);
  const flags = useRunStore((s) => s.flags);
  const seen = useRunStore((s) => s.seenEvents);

  if (!isDebug() || !active) return null;

  const ratio = (axis + 10) / 20;

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        bottom: 8,
        width: 210,
        zIndex: 500,
        padding: 8,
        borderRadius: 8,
        background: "rgba(8,12,20,0.92)",
        border: `1px solid ${tokens.line}`,
        color: tokens.dim,
        fontSize: 11,
        fontFamily: "monospace",
      }}
    >
      <div style={{ fontWeight: 700, color: tokens.text }}>dev · axis</div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>resonance</span>
        <span>
          {axis} · {axisLabel(axis)}
        </span>
        <span>stability</span>
      </div>
      <div
        style={{
          position: "relative",
          height: 8,
          borderRadius: 4,
          background: tokens.surface2,
          margin: "3px 0 6px",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `calc(${String(ratio * 100)}% - 3px)`,
            top: -1,
            width: 6,
            height: 10,
            borderRadius: 2,
            background: tokens.accent,
          }}
        />
      </div>
      <div style={{ fontWeight: 700, color: tokens.text }}>flags</div>
      {Object.keys(flags).length === 0 ? (
        <div>—</div>
      ) : (
        Object.entries(flags).map(([key, value]) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{key}</span>
            <span>{value === true ? "✓" : String(value)}</span>
          </div>
        ))
      )}
      <div style={{ fontWeight: 700, color: tokens.text, marginTop: 4 }}>
        seen ({seen.length})
      </div>
      <div style={{ wordBreak: "break-word" }}>{seen.join(", ") || "—"}</div>
    </div>
  );
};
