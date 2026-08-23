/**
 * Safe JSON fetch helper.
 * Handles non-JSON responses (e.g. Vercel 413 plain text "Request Entity Too Large")
 * without crashing on JSON.parse.
 */
export async function safeFetch(
  url: string,
  options?: RequestInit,
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(url, options);
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text || `HTTP ${res.status}` };
  }
  return { ok: res.ok, status: res.status, data };
}
