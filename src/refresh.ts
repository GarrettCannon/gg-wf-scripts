type RefreshCallback = (key: string) => void;

const subscribers: RefreshCallback[] = [];

export function onRefresh(callback: RefreshCallback): () => void {
  subscribers.push(callback);
  return () => {
    const idx = subscribers.indexOf(callback);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
}

export function invalidate(...keys: string[]): void {
  keys.forEach((key) => subscribers.forEach((cb) => cb(key)));
}
