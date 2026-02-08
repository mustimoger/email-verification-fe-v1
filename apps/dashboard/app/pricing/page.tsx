import { Suspense } from "react";

import PricingV2Client from "./pricing-client";

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-white" aria-label="Loading pricing" />}>
      <PricingV2Client />
    </Suspense>
  );
}
