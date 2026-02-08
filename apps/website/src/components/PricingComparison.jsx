"use client";

import { useState, useEffect } from "react";

const TIERS = ["10K", "100K", "1M"];

const COMPETITORS = [
  {
    name: "BoltRoute",
    highlight: true,
    logo: "⚡",
    prices: { "10K": 37, "100K": 141, "1M": 426 },
  },
  {
    name: "EmailListVerify",
    highlight: false,
    logo: null,
    prices: { "10K": 27, "100K": 169, "1M": 890 },
  },
  {
    name: "Clearout",
    highlight: false,
    logo: null,
    prices: { "10K": 35, "100K": 210, "1M": 1400 },
  },
  {
    name: "MillionVerifier",
    highlight: false,
    logo: null,
    prices: { "10K": 37, "100K": 289, "1M": 1890 },
  },
  {
    name: "NeverBounce",
    highlight: false,
    logo: null,
    prices: { "10K": 80, "100K": 400, "1M": null },
  },
  {
    name: "ZeroBounce",
    highlight: false,
    logo: null,
    prices: { "10K": 65, "100K": 390, "1M": 2250 },
  },
];

function getSorted(tier) {
  return [...COMPETITORS]
    .filter((c) => c.prices[tier] !== null)
    .sort((a, b) => a.prices[tier] - b.prices[tier]);
}

function calcSavings(boltPrice, competitorPrice) {
  if (!competitorPrice || !boltPrice) return null;
  return Math.round(((competitorPrice - boltPrice) / competitorPrice) * 100);
}

function BarRow({ item, maxPrice, boltPrice, index, tier, animate }) {
  const price = item.prices[tier];
  const isBolt = item.highlight;
  const pct = (price / maxPrice) * 100;
  const savings = !isBolt ? calcSavings(boltPrice, price) : null;
  const isMoreExpensive = savings && savings > 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(0);
    const t = setTimeout(() => setWidth(pct), 60 + index * 80);
    return () => clearTimeout(t);
  }, [tier, animate, index, pct]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0",
        marginBottom: isBolt ? "6px" : "0",
        paddingBottom: isBolt ? "10px" : "0",
        borderBottom: isBolt ? "1px solid rgba(249,115,22,0.15)" : "none",
      }}
    >
      {/* Tool name */}
      <div
        style={{
          width: "140px",
          minWidth: "140px",
          textAlign: "right",
          paddingRight: "16px",
          fontSize: "13px",
          fontWeight: isBolt ? "700" : "500",
          color: isBolt ? "#f97316" : "#94a3b8",
          letterSpacing: isBolt ? "0.02em" : "0",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "6px",
        }}
      >
        {isBolt && (
          <span style={{ fontSize: "14px" }}>⚡</span>
        )}
        {item.name}
      </div>

      {/* Bar area */}
      <div style={{ flex: 1, position: "relative", height: "36px" }}>
        <div
          style={{
            position: "absolute",
            top: "4px",
            left: "0",
            height: "28px",
            width: `${width}%`,
            borderRadius: "4px",
            background: isBolt
              ? "linear-gradient(90deg, #f97316 0%, #fb923c 100%)"
              : "linear-gradient(90deg, #334155 0%, #475569 100%)",
            transition: "width 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: isBolt
              ? "0 0 20px rgba(249,115,22,0.25)"
              : "none",
          }}
        />
        {/* Price label */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `calc(${Math.max(width, 8)}% + 10px)`,
            transform: "translateY(-50%)",
            fontSize: "14px",
            fontWeight: isBolt ? "800" : "600",
            color: isBolt ? "#fdba74" : "#cbd5e1",
            fontVariantNumeric: "tabular-nums",
            transition: "left 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ${price.toLocaleString()}
          {isMoreExpensive && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "#22c55e",
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)",
                padding: "2px 7px",
                borderRadius: "10px",
                letterSpacing: "0.03em",
              }}
            >
              Save {savings}%
            </span>
          )}
          {price === null && (
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Custom pricing
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PricingComparison() {
  const [activeTier, setActiveTier] = useState("100K");
  const [animKey, setAnimKey] = useState(0);

  const sorted = getSorted(activeTier);
  const maxPrice = Math.max(...sorted.map((c) => c.prices[activeTier] || 0));
  const boltPrice = COMPETITORS.find((c) => c.highlight).prices[activeTier];

  const handleTierChange = (tier) => {
    setActiveTier(tier);
    setAnimKey((k) => k + 1);
  };

  const tierDescriptions = {
    "10K": "Startups & small teams",
    "100K": "Most popular volume",
    "1M": "Enterprise & agencies",
  };

  return (
    <div
      style={{
        maxWidth: "780px",
        margin: "0 auto",
        padding: "40px 32px",
        background: "linear-gradient(180deg, #0a1628 0%, #0f1d32 100%)",
        borderRadius: "16px",
        border: "1px solid rgba(249,115,22,0.12)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "800",
            color: "#f8fafc",
            margin: "0 0 6px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Compare Email Verification Pricing
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            margin: "0",
          }}
        >
          Pay-as-you-go prices. No subscriptions required.
        </p>
      </div>

      {/* Tier tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        {TIERS.map((tier) => {
          const isActive = tier === activeTier;
          return (
            <button
              key={tier}
              onClick={() => handleTierChange(tier)}
              style={{
                padding: "10px 28px",
                borderRadius: "8px",
                border: isActive
                  ? "1px solid rgba(249,115,22,0.5)"
                  : "1px solid rgba(148,163,184,0.15)",
                background: isActive
                  ? "rgba(249,115,22,0.1)"
                  : "rgba(30,41,59,0.5)",
                color: isActive ? "#fb923c" : "#94a3b8",
                fontSize: "15px",
                fontWeight: isActive ? "700" : "500",
                cursor: "pointer",
                transition: "all 0.2s ease",
                letterSpacing: "0.01em",
              }}
            >
              {tier} emails
            </button>
          );
        })}
      </div>

      {/* Tier description */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "28px",
          fontSize: "12px",
          color: "#475569",
        }}
      >
        {tierDescriptions[activeTier]}
      </div>

      {/* Bars */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {sorted.map((item, i) => (
          <BarRow
            key={item.name + activeTier}
            item={item}
            maxPrice={maxPrice * 1.15}
            boltPrice={boltPrice}
            index={i}
            tier={activeTier}
            animate={animKey}
          />
        ))}
      </div>

      {/* Bottom note */}
      <div
        style={{
          marginTop: "28px",
          paddingTop: "16px",
          borderTop: "1px solid rgba(148,163,184,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: "11px", color: "#475569", maxWidth: "420px" }}>
          Prices verified Feb 2026 from official pricing pages. Snov.io excluded
          (shared credits for finding + verification).{" "}
          {activeTier === "1M" && "NeverBounce requires custom quote for 1M+."}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px rgba(34,197,94,0.4)",
            }}
          />
          <span
            style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}
          >
            Credits never expire
          </span>
          <span style={{ color: "#334155", margin: "0 2px" }}>•</span>
          <span
            style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}
          >
            No charge for unknowns
          </span>
        </div>
      </div>
    </div>
  );
}
