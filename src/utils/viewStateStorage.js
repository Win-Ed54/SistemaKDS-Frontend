const buildViewStateKey = (scope, userName, key) =>
  `kds.view.${String(scope || "global").trim().toLowerCase()}.${String(userName || "default").trim().toLowerCase()}.${String(key || "state").trim().toLowerCase()}`;

export const readViewState = (scope, userName, key, fallbackValue) => {
  try {
    const rawValue = localStorage.getItem(buildViewStateKey(scope, userName, key));
    if (rawValue === null) return fallbackValue;
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
};

export const writeViewState = (scope, userName, key, value) => {
  try {
    localStorage.setItem(
      buildViewStateKey(scope, userName, key),
      JSON.stringify(value),
    );
  } catch {
    // Si el navegador no permite persistencia, el modulo sigue funcionando.
  }
};
