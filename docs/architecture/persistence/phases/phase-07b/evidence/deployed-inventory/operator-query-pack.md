# Phase 7B Operator Read-Only Query Pack

Status: `PREPARED_NOT_AUTHORIZED`

This pack is documentation, not permission to connect. Use it only after the
[operator instructions](operator-instructions.md),
[environment worksheet](environment-scope-worksheet.md) and
[access checklist](access-request-checklist.md) are approved for one environment.

## Command Policy

Every executable statement in this document begins with `SELECT`, `SHOW`, `BEGIN`,
`SET LOCAL` or `ROLLBACK`. The pack contains no write, schema, privilege, file-copy,
migration, seed or synchronization operation.

Do not execute the whole document as one script. Run one numbered step at a time.
Metadata queries are safe for a missing target table. Each aggregate has a paired
preflight; execute its aggregate only when the preflight returns `may_run = true`.
A false preflight is evidence of schema divergence, not permission to improvise a
query.

Expected output is sanitized metadata, status labels, timestamps and aggregate
counts only. Never include connection details, raw rows, URLs, private identifiers,
descriptions, notes, JSON values, network values or personal data.

## 1. Open And Verify The Snapshot

Run the transaction opener first:

```sql
BEGIN TRANSACTION
ISOLATION LEVEL REPEATABLE READ
READ ONLY;
```

Verify enforcement. Stop and run the rollback in section 12 unless both settings
match the required values.

```sql
SHOW transaction_read_only;
```

```sql
SHOW transaction_isolation;
```

Apply bounded transaction-local limits:

```sql
SET LOCAL statement_timeout = '30s';
```

```sql
SET LOCAL lock_timeout = '5s';
```

```sql
SET LOCAL idle_in_transaction_session_timeout = '60s';
```

Collect non-sensitive session metadata without returning the real database name:

```sql
SELECT
  current_setting('server_version_num')::integer / 10000 AS postgres_major_version,
  current_schema() AS schema_alias,
  current_setting('transaction_read_only') AS transaction_read_only,
  current_setting('transaction_isolation') AS isolation_level;
```

Expected sanitized output: PostgreSQL major version, schema alias, `on`, and
`repeatable read`.

## 2. Discover Target And Related Tables

The first query covers required targets. Missing targets simply do not return a row.

```sql
SELECT
  t.table_name AS table_alias,
  t.table_type
FROM information_schema.tables AS t
WHERE t.table_schema = current_schema()
  AND t.table_name IN (
    'quality_certificates',
    'product_certifications',
    'traceability_records',
    'incident_reports',
    'audit_logs'
  )
ORDER BY t.table_name;
```

Discover related names without treating them as the same capability:

```sql
SELECT
  t.table_name AS related_table_alias,
  t.table_type
FROM information_schema.tables AS t
WHERE t.table_schema = current_schema()
  AND (
    t.table_name LIKE '%trace%'
    OR t.table_name LIKE '%certif%'
    OR t.table_name LIKE '%certificate%'
    OR t.table_name LIKE '%compliance%'
    OR t.table_name LIKE '%incident%'
    OR t.table_name LIKE '%audit%'
  )
ORDER BY t.table_name;
```

Expected sanitized output: table aliases and table types only.

## 3. Collect Schema Metadata

Columns, types, nullability and sanitized default evidence:

```sql
SELECT
  c.table_name AS table_alias,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default IS NOT NULL AS has_default,
  CASE
    WHEN c.column_default IS NULL THEN NULL
    WHEN c.column_default LIKE 'nextval(%' THEN 'sequence'
    WHEN c.column_default ILIKE '%now(%'
      OR c.column_default ILIKE '%current_timestamp%' THEN 'current-time'
    WHEN c.column_default ILIKE '%uuid%' THEN 'generated-uuid'
    ELSE 'literal-or-expression-redacted'
  END AS default_class,
  CASE
    WHEN c.column_default IS NULL THEN NULL
    ELSE md5(c.column_default)
  END AS default_hash
FROM information_schema.columns AS c
WHERE c.table_schema = current_schema()
  AND c.table_name IN (
    'quality_certificates',
    'product_certifications',
    'traceability_records',
    'incident_reports',
    'audit_logs'
  )
ORDER BY c.table_name, c.ordinal_position;
```

Primary, unique, foreign-key and check constraints:

```sql
SELECT
  rel.relname AS table_alias,
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY_KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN_KEY'
    WHEN 'c' THEN 'CHECK'
    ELSE 'OTHER'
  END AS constraint_type,
  pg_get_constraintdef(con.oid, true) AS sanitized_definition
FROM pg_constraint AS con
JOIN pg_class AS rel ON rel.oid = con.conrelid
JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = current_schema()
  AND rel.relname IN (
    'quality_certificates',
    'product_certifications',
    'traceability_records',
    'incident_reports',
    'audit_logs'
  )
ORDER BY rel.relname, con.conname;
```

Indexes:

```sql
SELECT
  tbl.relname AS table_alias,
  idx.relname AS index_name,
  access_method.amname AS access_method,
  i.indisprimary AS is_primary,
  i.indisunique AS is_unique,
  pg_get_indexdef(i.indexrelid) AS sanitized_definition
FROM pg_index AS i
JOIN pg_class AS tbl ON tbl.oid = i.indrelid
JOIN pg_class AS idx ON idx.oid = i.indexrelid
JOIN pg_am AS access_method ON access_method.oid = idx.relam
JOIN pg_namespace AS ns ON ns.oid = tbl.relnamespace
WHERE ns.nspname = current_schema()
  AND tbl.relname IN (
    'quality_certificates',
    'product_certifications',
    'traceability_records',
    'incident_reports',
    'audit_logs'
  )
ORDER BY tbl.relname, idx.relname;
```

Non-internal triggers, without executing or reading row payloads:

```sql
SELECT
  rel.relname AS table_alias,
  trg.tgname AS trigger_name,
  trg.tgenabled AS enabled_mode,
  (trg.tgtype::integer & 1) <> 0 AS is_row_level,
  (trg.tgtype::integer & 2) <> 0 AS fires_before,
  (trg.tgtype::integer & 4) <> 0 AS fires_on_insert,
  (trg.tgtype::integer & 8) <> 0 AS fires_on_delete,
  (trg.tgtype::integer & 16) <> 0 AS fires_on_update,
  (trg.tgtype::integer & 32) <> 0 AS fires_on_truncate,
  md5(pg_get_triggerdef(trg.oid, true)) AS trigger_definition_hash
FROM pg_trigger AS trg
JOIN pg_class AS rel ON rel.oid = trg.tgrelid
JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = current_schema()
  AND NOT trg.tgisinternal
  AND rel.relname IN (
    'quality_certificates',
    'product_certifications',
    'traceability_records',
    'incident_reports',
    'audit_logs'
  )
ORDER BY rel.relname, trg.tgname;
```

Row-level security flags:

```sql
SELECT
  rel.relname AS table_alias,
  rel.relrowsecurity AS row_level_security_enabled,
  rel.relforcerowsecurity AS row_level_security_forced
FROM pg_class AS rel
JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = current_schema()
  AND rel.relkind IN ('r', 'p')
  AND rel.relname IN (
    'quality_certificates',
    'product_certifications',
    'traceability_records',
    'incident_reports',
    'audit_logs'
  )
ORDER BY rel.relname;
```

Sanitized schema hash for comparison between evidence captures:

```sql
SELECT md5(
  COALESCE(
    string_agg(
      concat_ws(
        '|',
        c.table_name,
        c.ordinal_position::text,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        (c.column_default IS NOT NULL)::text
      ),
      E'\n' ORDER BY c.table_name, c.ordinal_position
    ),
    ''
  )
) AS sanitized_schema_hash
FROM information_schema.columns AS c
WHERE c.table_schema = current_schema()
  AND c.table_name IN (
    'quality_certificates',
    'product_certifications',
    'traceability_records',
    'incident_reports',
    'audit_logs'
  );
```

## 4. Estimate Table Sizes First

This catalog estimate does not scan table rows. Record its values as `ESTIMATED`.

```sql
SELECT
  rel.relname AS table_alias,
  'ESTIMATED' AS row_count_type,
  GREATEST(rel.reltuples, 0)::bigint AS row_count
FROM pg_class AS rel
JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = current_schema()
  AND rel.relkind IN ('r', 'p')
  AND rel.relname IN (
    'quality_certificates',
    'product_certifications',
    'traceability_records',
    'incident_reports',
    'audit_logs'
  )
ORDER BY rel.relname;
```

Use exact counts only during the approved window when the operator confirms the
scan is safe. Each count has its own existence preflight.

### Quality Certificate Exact Count

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'quality_certificates')) IS NOT NULL
    AS may_run;
```

```sql
SELECT 'quality_certificates' AS table_alias, 'EXACT' AS row_count_type, count(*)::bigint AS row_count
FROM quality_certificates;
```

### Product Certification Exact Count

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'product_certifications')) IS NOT NULL
    AS may_run;
```

```sql
SELECT 'product_certifications' AS table_alias, 'EXACT' AS row_count_type, count(*)::bigint AS row_count
FROM product_certifications;
```

### Traceability Exact Count

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'traceability_records')) IS NOT NULL
    AS may_run;
```

```sql
SELECT 'traceability_records' AS table_alias, 'EXACT' AS row_count_type, count(*)::bigint AS row_count
FROM traceability_records;
```

### Incident Exact Count

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'incident_reports')) IS NOT NULL
    AS may_run;
```

```sql
SELECT 'incident_reports' AS table_alias, 'EXACT' AS row_count_type, count(*)::bigint AS row_count
FROM incident_reports;
```

### Audit Exact Count

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'audit_logs')) IS NOT NULL
    AS may_run;
```

```sql
SELECT 'audit_logs' AS table_alias, 'EXACT' AS row_count_type, count(*)::bigint AS row_count
FROM audit_logs;
```

## 5. Quality Certificate Aggregates

Preflight the legacy mapping columns used by the next two queries:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'quality_certificates')) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('id'),
        ('issued_to'),
        ('cert_type'),
        ('cert_number'),
        ('product_id'),
        ('issued_by'),
        ('stored_file_id'),
        ('document_url'),
        ('created_at')
    ) AS expected(column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns AS c
      WHERE c.table_schema = current_schema()
        AND c.table_name = 'quality_certificates'
        AND c.column_name = expected.column_name
    )
  ) AS may_run;
```

```sql
SELECT
  count(*) FILTER (WHERE id IS NULL)::bigint AS null_id_count,
  count(*) FILTER (WHERE issued_to IS NULL)::bigint AS null_issued_to_count,
  count(*) FILTER (WHERE cert_type IS NULL)::bigint AS null_cert_type_count,
  count(*) FILTER (WHERE cert_number IS NULL)::bigint AS null_cert_number_count,
  count(*) FILTER (WHERE issued_by IS NULL)::bigint AS null_issued_by_count,
  count(*) FILTER (WHERE product_id IS NOT NULL)::bigint AS product_scoped_count,
  count(*) FILTER (WHERE stored_file_id IS NULL)::bigint AS null_stored_file_reference_count,
  count(*) FILTER (WHERE document_url IS NOT NULL)::bigint AS legacy_document_reference_count,
  min(created_at) AS earliest_created_at,
  max(created_at) AS latest_created_at
FROM quality_certificates;
```

```sql
SELECT count(*)::bigint AS duplicate_certificate_number_groups
FROM (
  SELECT cert_number
  FROM quality_certificates
  WHERE cert_number IS NOT NULL
  GROUP BY cert_number
  HAVING count(*) > 1
) AS duplicate_groups;
```

Preflight and collect certificate-type distribution without returning identifiers:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'quality_certificates')) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns AS c
    WHERE c.table_schema = current_schema()
      AND c.table_name = 'quality_certificates'
      AND c.column_name = 'cert_type'
  ) AS may_run;
```

```sql
SELECT cert_type::text AS category, count(*)::bigint AS row_count
FROM quality_certificates
GROUP BY cert_type::text
ORDER BY cert_type::text;
```

If metadata reveals a distinct `subject_type` column, use this separately guarded
query; otherwise record `NOT_RUN_COLUMN_ABSENT`.

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'quality_certificates')) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns AS c
    WHERE c.table_schema = current_schema()
      AND c.table_name = 'quality_certificates'
      AND c.column_name = 'subject_type'
  ) AS may_run;
```

```sql
SELECT subject_type::text AS subject_type, count(*)::bigint AS row_count
FROM quality_certificates
GROUP BY subject_type::text
ORDER BY subject_type::text;
```

## 6. Product Certification Aggregates

Preflight all referenced columns:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'product_certifications')) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('id'),
        ('product_id'),
        ('cert_type'),
        ('cert_number'),
        ('status'),
        ('stored_file_id'),
        ('document_url')
    ) AS expected(column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns AS c
      WHERE c.table_schema = current_schema()
        AND c.table_name = 'product_certifications'
        AND c.column_name = expected.column_name
    )
  ) AS may_run;
```

```sql
SELECT
  count(*) FILTER (WHERE id IS NULL)::bigint AS null_id_count,
  count(*) FILTER (WHERE product_id IS NULL)::bigint AS null_product_id_count,
  count(*) FILTER (WHERE cert_type IS NULL)::bigint AS null_cert_type_count,
  count(*) FILTER (WHERE stored_file_id IS NULL)::bigint AS null_private_file_reference_count,
  count(*) FILTER (WHERE document_url IS NOT NULL)::bigint AS legacy_document_reference_count
FROM product_certifications;
```

```sql
SELECT status::text AS status, count(*)::bigint AS row_count
FROM product_certifications
GROUP BY status::text
ORDER BY status::text;
```

```sql
SELECT count(*)::bigint AS duplicate_certificate_scope_groups
FROM (
  SELECT product_id, cert_type, cert_number
  FROM product_certifications
  GROUP BY product_id, cert_type, cert_number
  HAVING count(*) > 1
) AS duplicate_groups;
```

## 7. Traceability Aggregates

Preflight common mapping-A fields:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'traceability_records')) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM (
      VALUES ('id'), ('product_id'), ('producer_id'), ('qr_code'), ('created_at'), ('updated_at')
    ) AS expected(column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns AS c
      WHERE c.table_schema = current_schema()
        AND c.table_name = 'traceability_records'
        AND c.column_name = expected.column_name
    )
  ) AS may_run;
```

```sql
SELECT
  count(*) FILTER (WHERE id IS NULL)::bigint AS null_id_count,
  count(*) FILTER (WHERE product_id IS NULL)::bigint AS null_product_id_count,
  count(*) FILTER (WHERE producer_id IS NULL)::bigint AS null_producer_id_count,
  count(*) FILTER (WHERE qr_code IS NULL)::bigint AS null_qr_code_count,
  count(*) FILTER (WHERE updated_at > created_at)::bigint AS rows_updated_after_creation
FROM traceability_records;
```

```sql
SELECT count(*)::bigint AS duplicate_qr_code_groups
FROM (
  SELECT qr_code
  FROM traceability_records
  WHERE qr_code IS NOT NULL
  GROUP BY qr_code
  HAVING count(*) > 1
) AS duplicate_groups;
```

Preflight the conflicting mapping-B batch and order-item fields:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'traceability_records')) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM (VALUES ('batch_code'), ('order_item_id')) AS expected(column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns AS c
      WHERE c.table_schema = current_schema()
        AND c.table_name = 'traceability_records'
        AND c.column_name = expected.column_name
    )
  ) AS may_run;
```

```sql
SELECT
  count(*) FILTER (WHERE batch_code IS NULL)::bigint AS null_batch_code_count,
  count(*) FILTER (WHERE order_item_id IS NULL)::bigint AS null_order_item_id_count
FROM traceability_records;
```

Preflight product orphan checks:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'traceability_records')) IS NOT NULL
  AND to_regclass(format('%I.%I', current_schema(), 'products')) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns AS c
    WHERE c.table_schema = current_schema()
      AND c.table_name = 'traceability_records'
      AND c.column_name = 'product_id'
  ) AS may_run;
```

```sql
SELECT count(*)::bigint AS orphan_product_count
FROM traceability_records AS tr
WHERE tr.product_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM products AS p WHERE p.id = tr.product_id
  );
```

Preflight producer orphan checks:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'traceability_records')) IS NOT NULL
  AND to_regclass(format('%I.%I', current_schema(), 'users')) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns AS c
    WHERE c.table_schema = current_schema()
      AND c.table_name = 'traceability_records'
      AND c.column_name = 'producer_id'
  ) AS may_run;
```

```sql
SELECT count(*)::bigint AS orphan_producer_count
FROM traceability_records AS tr
WHERE tr.producer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM users AS u WHERE u.id = tr.producer_id
  );
```

Preflight order-item orphan checks:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'traceability_records')) IS NOT NULL
  AND to_regclass(format('%I.%I', current_schema(), 'order_items')) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns AS c
    WHERE c.table_schema = current_schema()
      AND c.table_name = 'traceability_records'
      AND c.column_name = 'order_item_id'
  ) AS may_run;
```

```sql
SELECT count(*)::bigint AS orphan_order_item_count
FROM traceability_records AS tr
WHERE tr.order_item_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM order_items AS oi WHERE oi.id = tr.order_item_id
  );
```

Do not query agronomy, location, laboratory, note or document fields. Their presence,
types and nullability are captured by metadata only.

## 8. Incident Aggregates

Preflight current mapping fields and the array type required for cardinality:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'incident_reports')) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM (
      VALUES ('id'), ('shipment_id'), ('reported_by'), ('status'), ('evidence_urls'), ('resolved_at')
    ) AS expected(column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns AS c
      WHERE c.table_schema = current_schema()
        AND c.table_name = 'incident_reports'
        AND c.column_name = expected.column_name
    )
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns AS c
    WHERE c.table_schema = current_schema()
      AND c.table_name = 'incident_reports'
      AND c.column_name = 'evidence_urls'
      AND c.data_type = 'ARRAY'
  ) AS may_run;
```

```sql
SELECT
  count(*) FILTER (WHERE id IS NULL)::bigint AS null_id_count,
  count(*) FILTER (WHERE shipment_id IS NULL)::bigint AS null_shipment_count,
  count(*) FILTER (WHERE reported_by IS NULL)::bigint AS null_reporter_count,
  count(*) FILTER (WHERE status IS NULL)::bigint AS null_status_count,
  count(*) FILTER (WHERE COALESCE(cardinality(evidence_urls), 0) > 0)::bigint
    AS rows_with_evidence_references,
  count(*) FILTER (
    WHERE status::text IN ('resolved', 'closed') AND resolved_at IS NULL
  )::bigint AS terminal_without_resolved_time_count,
  count(*) FILTER (
    WHERE status::text NOT IN ('resolved', 'closed') AND resolved_at IS NOT NULL
  )::bigint AS nonterminal_with_resolved_time_count,
  count(*) FILTER (
    WHERE status::text NOT IN ('open', 'in_review', 'resolved', 'closed')
  )::bigint AS status_outside_approved_lifecycle_count
FROM incident_reports;
```

```sql
SELECT status::text AS status, count(*)::bigint AS row_count
FROM incident_reports
GROUP BY status::text
ORDER BY status::text;
```

No evidence URL or description value is selected.

## 9. Audit Aggregates

Preflight the current technical-audit mapping fields:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'audit_logs')) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM (
      VALUES ('id'), ('user_id'), ('action'), ('entity_type'), ('entity_id'), ('created_at')
    ) AS expected(column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns AS c
      WHERE c.table_schema = current_schema()
        AND c.table_name = 'audit_logs'
        AND c.column_name = expected.column_name
    )
  ) AS may_run;
```

```sql
SELECT
  count(*) FILTER (WHERE id IS NULL)::bigint AS null_id_count,
  count(*) FILTER (WHERE user_id IS NULL)::bigint AS null_actor_count,
  count(*) FILTER (WHERE action IS NULL)::bigint AS null_action_count,
  count(*) FILTER (WHERE entity_type IS NULL)::bigint AS null_target_type_count,
  count(*) FILTER (WHERE entity_id IS NULL)::bigint AS null_target_id_count,
  count(*) FILTER (WHERE created_at IS NULL)::bigint AS null_created_at_count
FROM audit_logs;
```

Preflight optional compliance-ledger columns. The result itself records presence;
do not run a data aggregate for an absent field.

```sql
SELECT
  expected.column_name,
  EXISTS (
    SELECT 1
    FROM information_schema.columns AS c
    WHERE c.table_schema = current_schema()
      AND c.table_name = 'audit_logs'
      AND c.column_name = expected.column_name
  ) AS column_present
FROM (
  VALUES
    ('correlation_id'),
    ('operation_key'),
    ('retention_class'),
    ('retain_until'),
    ('legal_hold')
) AS expected(column_name)
ORDER BY expected.column_name;
```

If `correlation_id` exists, preflight it again before the aggregate:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'audit_logs')) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns AS c
    WHERE c.table_schema = current_schema()
      AND c.table_name = 'audit_logs'
      AND c.column_name = 'correlation_id'
  ) AS may_run;
```

```sql
SELECT count(*) FILTER (WHERE correlation_id IS NULL)::bigint AS null_correlation_count
FROM audit_logs;
```

If `operation_key` exists, preflight it again before the aggregate:

```sql
SELECT
  to_regclass(format('%I.%I', current_schema(), 'audit_logs')) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns AS c
    WHERE c.table_schema = current_schema()
      AND c.table_name = 'audit_logs'
      AND c.column_name = 'operation_key'
  ) AS may_run;
```

```sql
SELECT count(*) FILTER (WHERE operation_key IS NULL)::bigint AS null_operation_key_count
FROM audit_logs;
```

Trigger and constraint results from section 3 are the only update/delete prevention
evidence in this pack. Do not read change documents, paths, network fields or user
values.

## 10. Output Classification

Record each statement as one of:

- `EXECUTED_SANITIZED`
- `NOT_RUN_PREFLIGHT_FALSE`
- `NOT_RUN_EXACT_COUNT_UNSAFE`
- `ROLLED_BACK_READ_ONLY_NOT_ENFORCED`
- `ROLLED_BACK_TIMEOUT`
- `BLOCKED_AUTHORIZATION`

For every table, distinguish `EXACT`, `ESTIMATED` and `NOT_RUN`. Do not convert a
missing row in a catalog result into an assumed empty table. Copy results only into
the [sanitized JSON template](operator-output-template.json).

## 11. Operator Safety Totals

Before closing the evidence package, record:

- schema-changing statement count: zero;
- row-changing statement count: zero;
- migration/seed/synchronization count: zero;
- raw-row export count: zero;
- secret exposure count: zero.

## 12. End The Snapshot

Use rollback for both successful and stopped inventory sessions:

```sql
ROLLBACK;
```

Record the safe environment alias, start/end timestamps, rollback result and any
blocker in the output template. Do not record transaction identifiers or connection
details.
