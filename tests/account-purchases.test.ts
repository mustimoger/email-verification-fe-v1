import assert from "node:assert/strict";

type Purchase = {
  transaction_id: string;
  purchased_at?: string;
  created_at?: string;
  checkout_email?: string;
  amount?: number;
  currency?: string;
  credits_granted?: number;
  invoice_number?: string;
  invoice_id?: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatAmount = (amount?: number | null, currency?: string | null) => {
  if (amount === undefined || amount === null) return "";
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / 100);
    } catch {
      // fall through
    }
  }
  return amount.toLocaleString();
};

const formatCount = (value?: number | null) => {
  if (value === undefined || value === null) return "";
  return value.toLocaleString();
};

const mapRow = (row: Purchase) => ({
  date: formatDate(row.purchased_at || row.created_at),
  email: row.checkout_email || "",
  amount: formatAmount(row.amount, row.currency),
  credits: formatCount(row.credits_granted),
  invoice: row.invoice_number || row.invoice_id || "",
});

const mapped = mapRow({
  transaction_id: "txn_1",
  purchased_at: "2025-12-21T11:55:34.191306Z",
  checkout_email: "buyer@example.com",
  amount: 2900,
  currency: "USD",
  credits_granted: 10000,
  invoice_number: "1234",
});

assert.equal(mapped.email, "buyer@example.com");
assert.equal(mapped.amount, "$29.00");
assert.equal(mapped.credits, "10,000");
assert.equal(mapped.invoice, "1234");

const empty = mapRow({ transaction_id: "txn_2" });
assert.equal(empty.email, "");
assert.equal(empty.amount, "");
assert.equal(empty.credits, "");
assert.equal(empty.invoice, "");
