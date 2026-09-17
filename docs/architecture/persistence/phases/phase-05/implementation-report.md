# Persistence Phase 5 Implementation Report

## A. Synchronization

- Phase 4 PR `#84`: merged with successful CI.
- Phase 4 merge commit:
  `72cfd645087efd1f9aa24a0d0c8f111810e1765c`.
- Source develop:
  `72cfd645087efd1f9aa24a0d0c8f111810e1765c`.
- Branch: `refactor/persistence-phase-5-products-reviews`.
- Initial worktree: clean.

## B. Evidence Boundary

The evidence inventory covers `products`, `product_categories`,
`product_images`, `product_certifications`, `wishlists`, `reviews`, and the
legacy candidates `product_wishlist` and `product_wishlists`.

Canonical baseline v2 and active runtime are authoritative for the code
mapping decision. The protected `agrilink_db` snapshot is read-only local
reconciliation evidence, not production truth. Deployed row evidence remains
unavailable.

## C. Product Ownership

| Table | Writable mappings before/after | Canonical owner |
| --- | ---: | --- |
| `products` | 2 / 1 | Products |
| `product_categories` | 2 / 1 | Products |
| `product_images` | 2 / 1 | Products |
| `product_certifications` | 2 / 1 | Products |
| `wishlists` | 1 / 1 | Products |
| `reviews` | 1 / 1 | Reviews |

The Products-local classes remain canonical. Five central Product-related
files are decorator-free compatibility re-exports. The entity generator
overrides its legacy templates with the same re-exports.

Central-only `price`, `stock_quantity`, integer geography IDs,
`expires_date`, and image `url` fields were not unioned into canonical
entities. They lack canonical baseline and active runtime evidence.

## D. Category And Image Boundaries

Products owns Category persistence and its existing seed. Slug uniqueness and
the reviewed baseline foreign-key behavior are unchanged. Admin had no direct
Category repository access, and none was introduced.

Product Images continue to use the existing public `image_url` flow. Phase 5
does not invent a StoredFile workflow, delete a legacy URL field, or change
public/private semantics. Existing atomic Product image persistence and
compensation tests remain green.

## E. Wishlist Reconciliation

| Candidate | Baseline | Runtime | Protected local DB | Rows |
| --- | --- | --- | --- | ---: |
| `wishlists` | yes | yes | exists | 0 |
| `product_wishlist` | no | no | absent | n/a |
| `product_wishlists` | no | no | exists | 0 |

`public.wishlists` remains the canonical code and baseline contract. The
central singular declaration is retired as a compatibility alias. The local
plural extra table is preserved.

Decision: `WISHLIST_SCHEMA_RECONCILIATION_REQUIRED`. No rename, copy, drop,
dual-read, dual-write, or migration was performed. Deployed row inventory is
still required before physical reconciliation.

The canonical table retains unique `(user_id, product_id)`. Repository insert
uses conflict-safe `INSERT ... ON CONFLICT DO NOTHING` behavior followed by
the owner-scoped read, so concurrent duplicate adds converge on one row.

## F. Certification Lifecycle

The source-defined lifecycle is exactly `pending | verified | rejected`.
Verification and rejection are allowed only from pending. The repository uses
a conditional update, giving concurrent reviewers one winner. A Storage
review failure triggers a conditional state restore; failure to prove
ownership of that transition raises a consistency error.

Both legacy `document_url` and private `stored_file_id` remain persistence
fields. StoredFile FK/index metadata is now represented by the canonical
entity and removed from the compatibility manifest. Public Product detail
models expose neither field. Verified evidence is not hard-deleted by this
phase.

## G. Reviews Boundary

Reviews keeps scalar `reviewerId`, `revieweeId`, and `productId`. Private
string-target relation metadata preserves the reviewed User/Product foreign
keys without importing either capability's persistence classes.

| Boundary | Before | After |
| --- | ---: | ---: |
| Product persistence imports in Reviews | 3 | 0 |
| User persistence imports in Reviews | 1 | 0 |
| Product/User foreign `forFeature` registrations | 1 | 0 |
| Product/User repository injections | 1 | 0 |

Creation uses typed Product context and User eligibility readers. Missing or
inactive users are rejected, self-review remains rejected, and purchase
verification remains deferred to Phase 6. The existing partial unique
reviewer/product index and rating check are represented in entity metadata.
Database unique conflicts produce a deterministic application conflict.

List read models batch distinct Product and User IDs. N review rows cause at
most one Products lookup and one Users lookup, independent of list size.

## H. Admin Boundary

Admin Product registration, Product repository injection, and Products
infrastructure imports are all reduced from one to zero. Admin now uses typed
Product admin-read and conditional moderation capabilities. Concurrent
moderation gives one update winner and one stale conflict.

Admin still registers and injects IncidentReport. That reviewed exception
belongs to Phase 7B and is unchanged.

## I. Schema And Migration

- Migration: `NONE`.
- Historical and baseline migrations: unchanged.
- Canonical baseline: 26 tables.
- Catalog: 499 expected / 499 actual / diff 0.
- TypeORM raw/reviewed compatibility: 1 / 1.
- Unexpected/stale/catalog mismatch: 0 / 0 / 0.
- Retired Phase 5 compatibility entries: 5.
- OpenAPI: 88 paths, 99 operations, unchanged fingerprint
  `5637fed8d1ae886ea9cb8fabc5b9f7813454990c5f52ac5c5cded8fcb0a0157f`.

Clean-v2 completed first up, no-op second run, down to zero business tables,
and up again. The runtime smoke baseline remains green. Product list/detail
remain 2/5 queries; Review list improves from 3 to 2 queries.

## J. Protected Database Safety

- Database: `agrilink_db`, accessed read-only.
- Public tables: 33.
- Migration ledgers: none.
- Existing mismatch count: 143.
- Catalog fingerprint before/after:
  `2e8fee7ecf69c92a8ae7d8964d27be6a66957774758629fe1a289856bf5772e4`.
- Normalized schema SHA-256 before/after:
  `17024b6c42e0bc04ffee0e809cf705da93a3c957c4dda479eb3d05b64c579f95`.
- Exact equality: yes.
- Remaining disposable databases: 0.

No DDL, DML, migration, seed, or onboarding apply targeted the protected
database.

## K. Validation

| Gate | Result |
| --- | --- |
| Persistence audit | pass, 49 mappings / 47 tables / 0 violations |
| Architecture regression | pass, 2 tests |
| Persistence Phase 1-5 | pass, 104 tests |
| TypeScript | pass |
| Lint | pass, 0 errors / 16 existing warnings |
| Build | pass |
| Full unit, serial | pass, 148 plus 1 existing opt-in skip |
| Full E2E, serial | pass, 100 |
| Storage unit | pass, 38 plus 1 existing opt-in skip |
| Storage E2E | pass, 11 |
| Storage migration integration | existing opt-in skip; no new skip |
| Clean-v2 | pass |
| Protected DB equality | pass |

## L. Deferred Work

- Phase 6 Commerce and purchase-completed review eligibility.
- Deployed wishlist row inventory and physical-table reconciliation.
- Legacy Product image/certification URL retirement.
- Existing protected database onboarding/reconciliation.

No Phase 6 entity, repository, migration, or business flow was changed.
