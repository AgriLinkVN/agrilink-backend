# Persistence Baselines

These machine-readable artifacts describe the canonical state used across
multiple persistence phases:

- `canonical-baseline-v2-catalog.json`: PostgreSQL catalog contract.
- `clean-v2-openapi-baseline.json`: API path and operation fingerprint.
- `clean-v2-runtime-baseline.json`: runtime smoke and query-count contract.
- `local-agrilink-db-reconciliation.json`: read-only local reconciliation
  snapshot; it is not production truth.

The `migration` field in a canonical catalog artifact identifies the latest
ordered v2 migration whose applied schema is represented by that snapshot. It
is lineage metadata, not the lineage-root identifier and not an instruction to
execute migrations.

Baseline data is not rewritten during documentation reorganization.
