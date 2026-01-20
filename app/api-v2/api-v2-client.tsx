"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import type { ApiKeySummary, IntegrationOption } from "../lib/api-client";
import { EXTERNAL_DATA_UNAVAILABLE } from "../lib/messages";
import { listPurposeOptions } from "../api/utils";
import {
  ApiCreateKeyModal,
  ApiHero,
  ApiKeysSection,
  ApiUsageSection,
} from "./api-v2-sections";
import styles from "./api-v2.module.css";

type UsageView = "per_key" | "per_purpose";

export default function ApiV2Client() {
  const { loading: authLoading } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [usageView, setUsageView] = useState<UsageView>("per_key");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectedPurpose, setSelectedPurpose] = useState<string>("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [usageRequested, setUsageRequested] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("");
  const [creating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastKey] = useState<string | null>(null);

  const keys = useMemo<ApiKeySummary[]>(() => [], []);
  const integrationOptions = useMemo<IntegrationOption[]>(() => [], []);
  const purposeOptions = useMemo(() => listPurposeOptions(null), []);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const transitionClass = isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6";
  const usageMessage = usageRequested
    ? "No usage data available for the selected range."
    : "Select a date range to preview usage.";
  const totalLabel = usageRequested ? EXTERNAL_DATA_UNAVAILABLE : "—";

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
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-48 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.25)_0%,_transparent_70%)]" />
            <div className="absolute right-[-120px] top-[120px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.12)_0%,_transparent_70%)]" />
          </div>
          <ApiHero transitionClass={transitionClass} />
          <div id="api-keys">
            <ApiKeysSection
              transitionClass={transitionClass}
              keys={keys}
              loading={false}
              error={error}
              lastKey={lastKey}
              onGenerate={() => setShowModal(true)}
              onRevoke={() => {
                setError(EXTERNAL_DATA_UNAVAILABLE);
                console.info("api_v2.revoke.preview");
              }}
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
              totalLabel={totalLabel}
              usageMessage={usageMessage}
              onUsageViewChange={(value) => {
                setUsageView(value);
                setSelectedPurpose("");
              }}
              onSelectedKeyChange={setSelectedKey}
              onSelectedPurposeChange={setSelectedPurpose}
              onDateRangeChange={setDateRange}
              onLoadUsage={() => setUsageRequested(true)}
              onDownload={() => window.print()}
            />
          </div>
          <ApiCreateKeyModal
            open={showModal}
            integrationOptions={integrationOptions}
            selectedIntegrationId={selectedIntegrationId}
            keyName={keyName}
            creating={creating}
            onClose={() => setShowModal(false)}
            onIntegrationChange={(id) => {
              setSelectedIntegrationId(id);
              setKeyName(id);
            }}
            onKeyNameChange={setKeyName}
            onCreate={() => setShowModal(false)}
          />
        </section>
      </RequireAuth>
    </DashboardShell>
  );
}
