export type Result<T> = { ok: true; value: T } | { ok: false; code: string; message: string };
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T>(code: string, message: string): Result<T> => ({ ok: false, code, message });
