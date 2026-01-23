import { Suspense } from "react";

import PricingEmbedClient from "./pricing-embed-client";

export default function PricingEmbedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-white" aria-label="Loading pricing" />}>
      <PricingEmbedClient />
    </Suspense>
  );
}
