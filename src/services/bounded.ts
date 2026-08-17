export const boundedTask = <T,>(
  task: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const guarded = task.catch((error: unknown) => {
    console.warn("bounded: task failed", error);
    return fallback;
  });
  const expiry = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      resolve(fallback);
    }, ms);
  });
  return Promise.race([guarded, expiry]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
};
