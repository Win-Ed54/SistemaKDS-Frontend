const normalizeBasePath = (value = "/") => {
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "/") return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

export const appBasePath = normalizeBasePath(import.meta.env.BASE_URL);

export const getAppPath = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return appBasePath ? `${appBasePath}${normalizedPath}` : normalizedPath;
};

export const getCurrentAppPath = () => {
  const pathname = window.location.pathname || "/";

  if (appBasePath && pathname.startsWith(appBasePath)) {
    const trimmedPath = pathname.slice(appBasePath.length);
    return trimmedPath || "/";
  }

  return pathname;
};
