export interface StoragePort {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  keys(): string[];
  remove(key: string): void;
}
export function readLocal<T>(
  port: StoragePort,
  key: string,
  valid: (v: unknown) => v is T,
): T | null {
  try {
    const v = port.get(key);
    return valid(v) ? v : null;
  } catch {
    return null;
  }
}
export function saveLocal(
  port: StoragePort,
  key: string,
  value: unknown,
): { saved: boolean } {
  try {
    port.set(key, value);
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
export function readRecords<T>(
  port: StoragePort,
  prefix: string,
  valid: (v: unknown) => v is T,
): T[] {
  let keys: string[];
  try {
    keys = port.keys();
  } catch {
    return [];
  }
  return keys
    .filter((k) => k.startsWith(prefix))
    .map((k) => readLocal(port, k, valid))
    .filter((v): v is T => v !== null);
}
