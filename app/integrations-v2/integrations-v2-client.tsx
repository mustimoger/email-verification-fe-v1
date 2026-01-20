"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import { apiClient, ApiError, IntegrationOption } from "../lib/api-client";
import { IntegrationsCatalog, IntegrationsHero, IntegrationsHighlights } from "./integrations-v2-sections";
import styles from "./integrations-v2.module.css";

export default function IntegrationsV2Client() {
  const { session, loading: authLoading } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (authLoading || !session) {
      setIntegrations([]);
      setError(null);
      return;
    }
    const loadIntegrations = async () => {
      setLoading(true);
      setError(null);
      try {
        const options = await apiClient.listIntegrations();
        setIntegrations(options);
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load integrations";
        console.warn("integrations.list_failed", { error: message });
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    void loadIntegrations();
  }, [authLoading, session]);

  const transitionClass = isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6";

  return (
    <DashboardShell>
      <RequireAuth>
        <section className={`${styles.root} relative flex flex-col gap-8 pb-8 lg:px-8`}>
          <IntegrationsHero transitionClass={transitionClass} />
          <IntegrationsCatalog
            transitionClass={transitionClass}
            integrations={integrations}
            loading={loading}
            error={error}
          />
          <IntegrationsHighlights transitionClass={transitionClass} />
        </section>
      </RequireAuth>
    </DashboardShell>
  );
}
