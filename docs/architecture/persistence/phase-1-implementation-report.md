# Persistence Phase 1 Implementation Report

## A. Specification Update

The old rule required raw TypeORM schema diff to be zero. That rule would
remove valid PostgreSQL constraints and current-query compatibility fields
which are not represented by entity decorators.

ADR 0004 replaces it with:

- canonical PostgreSQL catalog diff: `0`;
- unexpected TypeORM operations: `0`;
- stale compatibility entries: `0`;
- reviewed compatibility operations: exact manifest only.

The catalog is authoritative for v2. Raw TypeORM zero-diff is not claimed.

## B. Compatibility Objects

The exact machine definitions are in
`typeorm-compatibility-manifest.json`. Definitions retain column type and
nullability, FK columns/reference/delete rules, index definitions/predicates
and check expressions.

| Table                    | Object type       | Exact objects                                          | Owner    | Phase |
| ------------------------ | ----------------- | ------------------------------------------------------ | -------- | ----- |
| `cooperative_profiles`   | column            | `member_count`                                         | profiles | 4     |
| `farmer_profiles`        | column            | `experience_years`, `farm_name`                        | profiles | 4     |
| `cooperative_profiles`   | foreign key       | five Storage file-ID FKs                               | profiles | 4     |
| `enterprise_profiles`    | foreign key       | business-license file FK                               | profiles | 4     |
| `farmer_profiles`        | foreign key       | two CCCD file FKs                                      | profiles | 4     |
| `supplier_profiles`      | foreign key       | user and business-license file FKs                     | profiles | 4     |
| profile tables           | index             | nine Storage file-ID indexes                           | profiles | 4     |
| `stored_files`           | check             | `CHK_stored_files_status`                              | storage  | 4     |
| `product_certifications` | foreign key/index | stored-file FK and index                               | products | 5     |
| `wishlists`              | foreign key       | `FK_wishlists_user`                                    | products | 5     |
| `reviews`                | index/check       | reviewer/product partial unique index and rating check | reviews  | 5     |

Totals: 3 columns, 12 foreign keys, 11 indexes and 2 checks, for 28 exact
entries. Every entry expires on `2027-12-31`.

## C. Catalog Parity

The clean-v2 baseline has:

- 26 business tables;
- 499 catalog objects;
- fingerprint
  `b267c0189b42040b9bfd2920da36605a680d23b94ccbeb1eac9dfe31e782b029`;
- expected/actual object count `499/499`;
- catalog diff `0`.

Migration ledger tables and their owned sequences are verified separately and
are excluded from the business catalog fingerprint.

## D. TypeORM Compatibility Parity

- Raw statements: 28.
- Reviewed statements: 28.
- Unexpected statements: 0.
- Stale entries: 0.
- Catalog definition mismatches: 0.

Matching uses a SQL tokenizer and exact schema/table/object identity. It does
not use substring or broad regular-expression filtering.

## E. Remaining Environment Work

The read-only local fixture report is
`baselines/local-agrilink-db-reconciliation.json`.

- Database: `agrilink_db`, PostgreSQL 16.14.
- Classification: `reconciliation-required`.
- Catalog fingerprint:
  `2e8fee7ecf69c92a8ae7d8964d27be6a66957774758629fe1a289856bf5772e4`.
- Tables: 33; known preserved extras: 7; unknown tables: 0.
- Catalog mismatches: 143.
- Migration ledgers: none.
- Data blocker: 2 `users` rows have a null email.
- Wishlist evidence: both `wishlists` and legacy `product_wishlists` exist;
  both currently have zero rows.

No onboarding plan was generated for `agrilink_db`, and apply mode always
rejects that protected name. A disposable exact-baseline fixture proves
plan/apply behavior and unchanged business fingerprint.

## F. Runtime Baselines

The clean-v2 runtime gate uses real TypeORM repositories with local fakes for
external providers. All 16 smoke checks pass, including Product detail,
concurrent duplicate wishlist insertion, reviews, notifications, profiles,
ads, forum, admin tables, geography and Storage.

Query counts:

| Flow                             | Queries |
| -------------------------------- | ------: |
| Product list                     |       2 |
| Product detail                   |       5 |
| Public profile read              |       2 |
| Admin profile persistence queues |       4 |
| Review list and stats            |       3 |
| Notification list                |       1 |

OpenAPI baseline: 84 paths, 95 operations, fingerprint
`16dfdb72f5f489def07b41be7cb1d48c9017cb61409ee7812d685f4eacfc7c4b`.

`AdminService.getPendingProfiles()` currently asks TypeORM to hydrate a
`SupplierProfile.user` relation absent from the canonical entity. Phase 1 does
not alter that business metadata; the four underlying persistence queues are
verified here, and relation ownership is deferred to Phase 4.

## G. Operational Commands

```powershell
npm run test:persistence-phase-1
npm run migration:v2:verify-clean
npm run persistence:verify-existing
npm run persistence:schema-parity
npm run persistence:onboard-existing
```

The onboarding command is dry-run by default. Apply additionally requires
`--apply`, the reviewed plan, exact fingerprint, environment,
`APPROVE_V2_BASELINE_ONBOARDING`, and `--backup-confirmed=true`.
Non-disposable environments additionally require
`--shared-target-acknowledged=true`; `agrilink_db` remains forbidden.

Full repository gate results and the final protected-database fingerprint are
recorded below and in the pull request handoff.

## H. Quality Gate Evidence

| Gate                                         | Result                                       |
| -------------------------------------------- | -------------------------------------------- |
| Persistence architecture audit               | PASS, 66 mappings / 48 tables / 0 violations |
| Phase 0 architecture Jest                    | PASS, 2 tests                                |
| Phase 1 focused Jest                         | PASS, 27 tests                               |
| Clean-v2 up/second/down/up/parity/onboarding | PASS                                         |
| Lint                                         | PASS, 0 errors / 55 pre-existing warnings    |
| Build                                        | PASS                                         |
| Full unit                                    | PASS, 117 tests / 1 opt-in skipped           |
| Full E2E                                     | PASS, 90 tests                               |
| Storage unit                                 | PASS, 38 tests / 1 opt-in skipped            |
| Storage E2E                                  | PASS, 11 tests                               |
| Storage migration integration                | SKIPPED, existing opt-in gate                |
| Protected v2 CLI rejection                   | PASS                                         |
| `git diff --check`                           | PASS                                         |

The saved pre-Phase-1 dump and the final dump were decoded, stripped only of
the random `\restrict`/`\unrestrict` lines, normalized to CRLF and compared
exactly. Both hashes are
`cc9c1ec2cec9d1ad77402b061a2f71fbfa82389cf3c515364ec367a66028f9ba`;
the diff is zero. The older handoff hash beginning `b7ce` cannot be reproduced
without its missing normalization procedure, so this report does not claim
equality against that opaque value.
