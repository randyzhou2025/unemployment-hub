export const embedded = location.pathname.startsWith("/padmin/unemployment/workbench/") && new URLSearchParams(location.search).get("embedded") === "1";
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch((embedded ? "/padmin/api/unemployment" : "/api/v1/admin") + path, {
    method,
    credentials: "same-origin",
    headers: { "X-UH-Admin": "1", ...(embedded ? {Authorization:"Bearer " + (localStorage.getItem("xuexidazi-auth-token") || localStorage.getItem("exam-auth-token") || "")} : {}), ...(body === undefined ? {} : {"Content-Type": "application/json"}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    const fields = data.fieldErrors
      ? Object.values(data.fieldErrors).flat().join("；")
      : "";
    throw new Error(fields || data.message || data.error || "请求失败");
  }
  return data.data;
}
