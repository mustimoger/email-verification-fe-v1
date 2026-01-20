"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import {
  apiClient,
  ApiError,
  ApiKeySummary,
  IntegrationOption,
  ListApiKeysResponse,
  UsagePurposeResponse,
  UsageSummaryResponse,
} from "../lib/api-client";
import { EXTERNAL_DATA_UNAVAILABLE } from "../lib/messages";
import {
  listPurposeOptions,
  mapPurposeSeries,
  resolveDateRange,
  summarizeKeyUsage,
  summarizePurposeUsage,
} from "../api/utils";
import {
  ApiCreateKeyModal,
  ApiHero,
  ApiKeysSection,
  ApiUsageSection,
} from "./api-v2-sections";
import styles from "./api-v2.module.css";

type UsageView = "per_key" | "per_purpose";

const isDashboardKey = (key: ApiKeySummary) => (key.name ?? "").toLowerCase() === "dashboard_api";

const getDefaultName = (option?: IntegrationOption) => {
  if (!option) return "";
  if (option.default_name && option.default_name.trim().length > 0) return option.default_name;
  return option.label;
};

export default function ApiV2Client() {
  const { session, loading: authLoading } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [usageView, setUsageView] = useState<UsageView>("per_key");
  const [selectedPurpose, setSelectedPurpose] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [keyUsageKeys, setKeyUsageKeys] = useState<ApiKeySummary[] | null>(null);
  const [purposeUsage, setPurposeUsage] = useState<UsagePurposeResponse | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [integrationOptions, setIntegrationOptions] = useState<IntegrationOption[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("");
  const [keyName, setKeyName] = useState("");
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [lastPlainKey, setLastPlainKey] = useState<string | null>(null);
  const [fullKeysById, setFullKeysById] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const keyUsage = useMemo(
    () => summarizeKeyUsage(keyUsageKeys ?? [], selectedKey || undefined),
    [keyUsageKeys, selectedKey],
  );
  const purposeUsageSummary = useMemo(
    () => summarizePurposeUsage(purposeUsage, selectedPurpose || undefined),
    [purposeUsage, selectedPurpose],
  );
  const usageTotal = usageView === "per_key" ? keyUsage.total : purposeUsageSummary.total;
  const hasUsageData = usageView === "per_key" ? keyUsage.hasData : purposeUsageSummary.hasData;
  const chartData = useMemo(() => {
    if (usageView === "per_purpose") {
      return mapPurposeSeries(purposeUsage?.series, selectedPurpose || undefined);
    }
    return usageSummary?.series ?? [];
  }, [usageView, usageSummary, purposeUsage, selectedPurpose]);
  const totalUsageLabel = useMemo(() => {
    if (!usageLoaded) return "—";
    if (hasUsageData && usageTotal !== null) return usageTotal.toLocaleString();
    return "—";
  }, [hasUsageData, usageLoaded, usageTotal]);
  const purposeOptions = useMemo(() => listPurposeOptions(purposeUsage), [purposeUsage]);
  const usageSummaryUnavailable =
    usageView === "per_key" && usageLoaded && (!usageSummary || usageSummary.source === "unavailable");
  const purposeUsageUnavailable = usageView === "per_purpose" && usageLoaded && !purposeUsage;
  const totalUnavailable =
    usageLoaded && !hasUsageData && (usageView === "per_key" ? usageSummaryUnavailable : purposeUsageUnavailable);
  const chartUnavailable =
    usageLoaded &&
    !isLoadingUsage &&
    (usageView === "per_key" ? usageSummaryUnavailable : purposeUsageUnavailable);
  const totalDisplay = totalUnavailable ? EXTERNAL_DATA_UNAVAILABLE : totalUsageLabel;

  const resolveFullKey = (key: ApiKeySummary) => {
    if (key.key && key.key.trim()) return key.key;
    if (key.id && fullKeysById[key.id]) return fullKeysById[key.id];
    return null;
  };

  const syncKeyState = (list: ApiKeySummary[]) => {
    const ids = new Set(list.map((key) => key.id).filter(Boolean) as string[]);
    setRevealedKeys((prev) => {
      const next: Record<string, boolean> = {};
      ids.forEach((id) => {
        if (prev[id]) next[id] = prev[id];
      });
      return next;
    });
    setFullKeysById((prev) => {
      const next: Record<string, string> = {};
      list.forEach((key) => {
        if (!key.id) return;
        if (key.key && key.key.trim()) {
          next[key.id] = key.key;
          return;
        }
        if (prev[key.id]) {
          next[key.id] = prev[key.id];
        }
      });
      return next;
    });
  };

  const toggleReveal = (key: ApiKeySummary) => {
    if (!key.id) {
      console.warn("api.keys.reveal_missing_id");
      return;
    }
    const hasFullKey = Boolean(resolveFullKey(key));
    if (!hasFullKey) {
      console.warn("api.keys.full_key.unavailable", { key_id: key.id });
    }
    setRevealedKeys((prev) => ({ ...prev, [key.id as string]: !prev[key.id as string] }));
  };

  const copyKey = async (key: ApiKeySummary) => {
    if (!key.id) {
      console.warn("api.keys.copy_missing_id");
      return;
    }
    const fullKey = resolveFullKey(key);
    if (!fullKey) {
      console.warn("api.keys.copy_unavailable", { key_id: key.id });
      return;
    }
    if (!navigator?.clipboard?.writeText) {
      console.warn("api.keys.copy_unsupported", { key_id: key.id });
      return;
    }
    try {
      await navigator.clipboard.writeText(fullKey);
    } catch (error) {
      console.warn("api.keys.copy_failed", { key_id: key.id, error });
    }
  };

  useEffect(() => {
    if (!session) {
      setKeys([]);
      setSelectedKey("");
      setSelectedPurpose("");
      setKeyUsageKeys(null);
      setPurposeUsage(null);
      setUsageSummary(null);
      setUsageLoaded(false);
      setIntegrationOptions([]);
      setSelectedIntegrationId("");
      setKeyName("");
      setError(null);
      return;
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      setIsLoadingKeys(true);
      setError(null);
      try {
        const response: ListApiKeysResponse = await apiClient.listApiKeys();
        const list = (response.keys ?? []).filter((key) => !isDashboardKey(key));
        setKeys(list);
        syncKeyState(list);
        setSelectedKey("");
        setSelectedPurpose("");
        setKeyUsageKeys(null);
        setPurposeUsage(null);
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load API keys";
        setError(message);
      } finally {
        setIsLoadingKeys(false);
      }
    };
    void load();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const loadIntegrations = async () => {
      setLoadingIntegrations(true);
      setError(null);
      try {
        const options = await apiClient.listIntegrations();
        setIntegrationOptions(options);
        if (options.length > 0) {
          setSelectedIntegrationId(options[0].id);
          setKeyName(getDefaultName(options[0]));
        }
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load integrations";
        setError(message);
      } finally {
        setLoadingIntegrations(false);
      }
    };
    void loadIntegrations();
  }, [session]);

  useEffect(() => {
    setKeyUsageKeys(null);
    setPurposeUsage(null);
    setUsageSummary(null);
    setUsageLoaded(false);
    if (usageView === "per_purpose") {
      setSelectedPurpose("");
    }
  }, [usageView]);

  const loadUsage = async () => {
    if (!session) return;
    setIsLoadingUsage(true);
    setError(null);
    const resolvedRange = resolveDateRange(dateRange);
    if (resolvedRange.error) {
      setError(resolvedRange.error);
      console.warn("api.usage.range.invalid", {
        error: resolvedRange.error,
        from: dateRange.from,
        to: dateRange.to,
      });
      setIsLoadingUsage(false);
      return;
    }
    const rangeStart = resolvedRange.start;
    const rangeEnd = resolvedRange.end;
    console.info("api.usage.load", {
      view: usageView,
      api_key_id: selectedKey || "all",
      purpose: selectedPurpose || "all",
      from: rangeStart,
      to: rangeEnd,
    });
    try {
      if (usageView === "per_key") {
        const response: ListApiKeysResponse = await apiClient.listApiKeys(false, rangeStart, rangeEnd);
        const list = (response.keys ?? []).filter((key) => !isDashboardKey(key));
        setKeyUsageKeys(list);
        setPurposeUsage(null);
        console.debug("api.usage.per_key.loaded", { count: list.length });
      } else {
        const response = await apiClient.getUsagePurpose(rangeStart, rangeEnd);
        setPurposeUsage(response);
        setKeyUsageKeys(null);
        console.debug("api.usage.per_purpose.loaded", {
          total_requests: response.total_requests,
          purposes: Object.keys(response.requests_by_purpose ?? {}).length,
        });
      }
      if (usageView === "per_key") {
        try {
          const summary = await apiClient.getUsageSummary(rangeStart, rangeEnd, selectedKey || undefined);
          setUsageSummary(summary);
          console.debug("api.usage.summary.loaded", {
            source: summary.source,
            points: summary.series.length,
            api_key_id: summary.api_key_id ?? null,
          });
        } catch (err: unknown) {
          const message = err instanceof ApiError ? err.message : "Failed to load usage chart";
          console.error("api.usage.summary.failed", { error: message });
          setUsageSummary({
            source: "unavailable",
            total: null,
            series: [],
            api_key_id: selectedKey || null,
          });
          setError(message);
        }
      } else {
        setUsageSummary(null);
      }
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to load usage";
      setError(message);
    } finally {
      setIsLoadingUsage(false);
      setUsageLoaded(true);
    }
  };

  const handleCreateKey = async () => {
    if (!selectedIntegrationId) {
      setError("Please choose an integration.");
      return;
    }
    const resolvedName = keyName.trim() || selectedIntegrationId;
    setCreating(true);
    setError(null);
    try {
      const created = await apiClient.createApiKey(resolvedName, selectedIntegrationId);
      setLastPlainKey(created.key || null);
      if (created.id && created.key) {
        setFullKeysById((prev) => ({ ...prev, [created.id as string]: created.key as string }));
      }
      const refreshed = await apiClient.listApiKeys();
      const list = (refreshed.keys ?? []).filter((key) => !isDashboardKey(key));
      setKeys(list);
      syncKeyState(list);
      setSelectedKey(created.id ?? "");
      setKeyName(resolvedName);
      setShowModal(false);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to create API key";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleIntegrationChange = (id: string) => {
    setSelectedIntegrationId(id);
    const next = integrationOptions.find((opt) => opt.id === id);
    setKeyName(getDefaultName(next));
  };

  const handleRevoke = async (id: string) => {
    if (!id) {
      console.warn("api.keys.revoke_missing_id");
      return;
    }
    setError(null);
    try {
      await apiClient.revokeApiKey(id);
      const refreshed = await apiClient.listApiKeys();
      const list = (refreshed.keys ?? []).filter((key) => !isDashboardKey(key));
      setKeys(list);
      syncKeyState(list);
      setSelectedKey(list[0]?.id ?? "");
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to revoke API key";
      setError(message);
    }
  };

  const transitionClass = isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6";

  if (authLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[240px] items-center justify-center text-sm font-semibold text-[var(--text-secondary)]">
          Checking session...
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <RequireAuth>
        <section className={`${styles.root} relative flex flex-col gap-8 pb-8 lg:px-8`}>
          <ApiHero transitionClass={transitionClass} />
          <div id="api-keys">
            <ApiKeysSection
              transitionClass={transitionClass}
              keys={keys}
              loading={isLoadingKeys}
              error={error}
              lastKey={lastPlainKey}
              revealedKeys={revealedKeys}
              resolveFullKey={resolveFullKey}
              onGenerate={() => setShowModal(true)}
              onRevoke={handleRevoke}
              onToggleReveal={toggleReveal}
              onCopy={copyKey}
            />
          </div>
          <div id="api-usage">
            <ApiUsageSection
              transitionClass={transitionClass}
              usageView={usageView}
              selectedKey={selectedKey}
              selectedPurpose={selectedPurpose}
              keys={keys}
              purposeOptions={purposeOptions}
              dateRange={dateRange}
              totalLabel={totalDisplay}
              isLoadingUsage={isLoadingUsage}
              chartData={chartData}
              chartUnavailable={chartUnavailable}
              hasUsageData={hasUsageData}
              usageTotal={usageTotal}
              usageLoaded={usageLoaded}
              onUsageViewChange={(value) => {
                setUsageView(value);
                setSelectedPurpose("");
              }}
              onSelectedKeyChange={setSelectedKey}
              onSelectedPurposeChange={setSelectedPurpose}
              onDateRangeChange={setDateRange}
              onLoadUsage={loadUsage}
              onDownload={() => window.print()}
            />
          </div>
          <ApiCreateKeyModal
            open={showModal}
            integrationOptions={integrationOptions}
            selectedIntegrationId={selectedIntegrationId}
            keyName={keyName}
            creating={creating}
            loadingIntegrations={loadingIntegrations}
            onClose={() => setShowModal(false)}
            onIntegrationChange={handleIntegrationChange}
            onKeyNameChange={setKeyName}
            onCreate={handleCreateKey}
          />
        </section>
      </RequireAuth>
    </DashboardShell>
  );
}
