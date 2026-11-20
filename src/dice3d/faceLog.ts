const faces = new Map<string, number>();

export const recordFace = (uid: string, face: string): void => {
  const value = Number(face);
  if (Number.isFinite(value)) faces.set(uid, value);
};

export const faceOf = (uid: string): number | null => faces.get(uid) ?? null;

export const clearFaces = (): void => {
  faces.clear();
};
