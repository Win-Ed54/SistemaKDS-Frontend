import { useCallback, useEffect, useState } from "react";
import { getKdsSettings } from "../services/api.service";
import useKdsSettingsStore from "../store/kdsSettingsStore";
import connection, { subscribeConnectionStatus } from "../services/signalrService";

export default function useKdsSettings() {
  const settings = useKdsSettingsStore((state) => state.settings);
  const setSettings = useKdsSettingsStore((state) => state.setSettings);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const refreshSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const incoming = await getKdsSettings();
      setSettings(incoming);
    } catch (error) {
      console.error("Error cargando configuracion KDS:", error);
    } finally {
      setLoadingSettings(false);
    }
  }, [setSettings]);

  useEffect(() => {
    void refreshSettings();

    const handleSettingsUpdated = (incoming) => {
      if (incoming) setSettings(incoming);
      else void refreshSettings();
    };

    connection.on("settingsupdated", handleSettingsUpdated);
    connection.on("SettingsUpdated", handleSettingsUpdated);

    const unsubscribeConnection = subscribeConnectionStatus((connected) => {
      if (connected) void refreshSettings();
    });

    return () => {
      connection.off("settingsupdated", handleSettingsUpdated);
      connection.off("SettingsUpdated", handleSettingsUpdated);
      unsubscribeConnection?.();
    };
  }, [refreshSettings, setSettings]);

  return { settings, loadingSettings, refreshSettings };
}
