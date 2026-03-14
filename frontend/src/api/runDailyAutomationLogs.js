import { API_BASE_URL } from "./config";

async function fetchJson(url, { signal } = {}) {
  const resp = await fetch(url, { credentials: "include", signal });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.message || `Request failed (${resp.status})`);
  return json;
}

export async function getRunAutomationLogs({
  page = 1,
  limit = 10,
  status = "all",
  type = "all",
  signal,
} = {}) {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status !== "all") qs.set("status", status);
  if (type !== "all") qs.set("type", type); // works only if backend supports type

  const url = `${API_BASE_URL}/run-daily-automation/logs?${qs.toString()}`;
  return fetchJson(url, { signal });
}

/**
 * ✅ This replaces /logs/total endpoint.
 * Uses existing /logs and reads pagination.total
 */
export async function getRunAutomationLogsTotal({
  status = "all",
  type = "all",
  signal,
} = {}) {
  const qs = new URLSearchParams({
    page: "1",
    limit: "1",
  });

  if (status !== "all") qs.set("status", status);
  if (type !== "all") qs.set("type", type); // works only if backend supports type

  const url = `${API_BASE_URL}/run-daily-automation/logs?${qs.toString()}`;
  const json = await fetchJson(url, { signal });

  return { total: Number(json?.pagination?.total ?? 0) };
}