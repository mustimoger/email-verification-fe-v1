import { notFound } from "next/navigation";

import PricingV2Client from "./pricing-v2-client";

const PRICING_V2_ENABLED = process.env.PRICING_V2 === "true";

export default function PricingV2Page() {
  if (!PRICING_V2_ENABLED) {
    notFound();
  }
  return <PricingV2Client />;
}
