export type ShareOutcome = "shared" | "saved" | "cancelled";

const SAVE_REVOKE_MS = 1000;

const canShareFile = (file: File): boolean =>
  typeof navigator !== "undefined" &&
  typeof navigator.share === "function" &&
  typeof navigator.canShare === "function" &&
  navigator.canShare({ files: [file] });

const saveBlob = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, SAVE_REVOKE_MS);
};

export const shareImage = async (blob: Blob, name: string, title: string): Promise<ShareOutcome> => {
  const file = new File([blob], name, { type: blob.type === "" ? "image/png" : blob.type });
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  saveBlob(blob, name);
  return "saved";
};
