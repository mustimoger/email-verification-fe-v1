"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import styles from "./verify-v2.module.css";
import {
  ManualVerificationCard,
  ResultsCard,
  UploadSection,
  VerifyHero,
  WorkflowSection,
} from "./verify-v2-sections";

export default function VerifyV2Client() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const transitionClass = isLoaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0";

  return (
    <DashboardShell>
      <section className={`${styles.root} flex flex-col gap-8`}>
        <VerifyHero transitionClass={transitionClass} />
        <div
          className={`grid gap-6 lg:grid-cols-[1.3fr_1fr] ${transitionClass}`}
          style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.05s" }}
        >
          <ManualVerificationCard transitionClass={transitionClass} />
          <ResultsCard transitionClass={transitionClass} />
        </div>
        <UploadSection transitionClass={transitionClass} />
        <WorkflowSection transitionClass={transitionClass} />
      </section>
    </DashboardShell>
  );
}
