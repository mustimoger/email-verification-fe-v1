# Marketing Mock Data Guide

## Purpose
This folder contains artifacts-only mock datasets for marketing screenshots.
They are not runtime fixtures and are not consumed by production code.

## Files
- `mock_overview.json`: Overview card totals (credits, verification totals, invalid breakdown).
- `mock_history.json`: Verification history rows and summary totals.
- `mock_api_usage.json`: API usage totals, key-level stats, and 30-day usage series.

## Snapshot (As Of 2026-02-02)
- Credits remaining: `22400`
- Verification totals:
  - Total: `17700`
  - Valid: `13400`
  - Invalid: `3000`
  - Catch-all: `1300`
- History task counts:
  - Total tasks: `17`
  - Completed: `15`
  - Processing: `1`
  - Failed: `1`
- API usage:
  - Total requests (30 days): `9480`
  - Requests by purpose:
    - Zapier: `4120`
    - N8N: `2860`
    - Custom: `2500`
  - API keys: `3`

## Usage Guidance
- Overview screenshots:
  - Use `mock_overview.json` for credits and verification tiles.
  - Keep invalid breakdown values aligned with total invalid count.
- History screenshots:
  - Use `mock_history.json.rows` for table content.
  - Show one processing row and one failed row, but keep Overview totals based on completed rows only.
- API screenshots:
  - Use `mock_api_usage.json.requests_by_purpose` and `series` for charts.
  - Keep 30-day series sum equal to `total_requests`.

## Consistency Rules
- `mock_history.summary.completed_verifications` must match:
  - `mock_overview.verification_totals.total`
  - Sum of completed `rows[].total` in `mock_history.json`
- `mock_api_usage.total_requests` must match:
  - Sum of `series[].total_requests`
  - Sum of top-level `requests_by_purpose` values
