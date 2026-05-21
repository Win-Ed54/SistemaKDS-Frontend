const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const isAbsoluteUrl = (value = "") => /^https?:\/\//i.test(value);

const deriveBackendUrl = (apiUrl) => {
  if (!isAbsoluteUrl(apiUrl)) return "";
  if (apiUrl.endsWith("/api")) return apiUrl.slice(0, -4);
  return apiUrl;
};

export const apiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_URL || "/api") || "/api";

export const backendBaseUrl = trimTrailingSlash(
  import.meta.env.VITE_BACKEND_URL || deriveBackendUrl(apiBaseUrl),
);

export const hubUrl =
  trimTrailingSlash(import.meta.env.VITE_HUB_URL || "") ||
  (backendBaseUrl ? `${backendBaseUrl}/ordersHub` : "/ordersHub");

export const buildApiUrl = (endpoint = "") => {
  const cleanEndpoint = String(endpoint).replace(/^\/+/, "");
  return cleanEndpoint ? `${apiBaseUrl}/${cleanEndpoint}` : apiBaseUrl;
};

export const resolveAssetUrl = (value = "") => {
  if (!value) return "";
  if (isAbsoluteUrl(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return backendBaseUrl ? `${backendBaseUrl}${normalizedPath}` : normalizedPath;
};
