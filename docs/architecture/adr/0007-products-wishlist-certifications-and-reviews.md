# ADR 0007: Products, Wishlist, Certifications And Reviews

- Status: Accepted
- Date: 2026-07-30
- Owners: Products and Reviews capabilities
- Scope: Persistence Phase 5

## Context

Products had module-local runtime mappings and incompatible central writable
duplicates. Reviews registered Product persistence and hydrated Product and
User relations. Admin registered and injected the Product repository.

Wishlist names were also ambiguous. Canonical baseline v2 and active runtime
use `public.wishlists`; a legacy source declaration used
`public.product_wishlist`, while the protected local reconciliation snapshot
also records `public.product_wishlists`. No deployed row inventory is
available.

## Decision

1. Products owns the writable mappings and repositories for `products`,
   `product_categories`, `product_images`, `product_certifications`, and
   `wishlists`.
2. The Products-local mappings are canonical. Central Product-related files
   are decorator-free compatibility re-exports and cannot recreate mappings.
3. `public.wishlists` remains the canonical runtime and baseline contract.
   `product_wishlist` is a retired source declaration, not an approved
   physical migration source.
4. The physical lineage of `product_wishlist` and `product_wishlists` remains
   `WISHLIST_SCHEMA_RECONCILIATION_REQUIRED`. No rename, copy, drop,
   dual-read, or dual-write is approved without deployed row evidence.
5. Wishlist insertion relies on the reviewed unique
   `(user_id, product_id)` constraint and conflict-safe insert behavior.
6. Reviews owns `reviews` and exposes scalar `reviewerId`, `revieweeId`, and
   `productId`. Private string-target relation metadata may preserve reviewed
   foreign keys, but Reviews cannot import Product or User persistence.
7. Reviews obtains eligibility and summary data through typed Products and
   Users ports. Batching is mandatory for list enrichment.
8. Admin obtains Product reads and moderation through typed Products ports.
   Admin cannot register Product entities or inject Product repositories.
9. Certification verification preserves the existing
   `pending | verified | rejected` lifecycle. A conditional update permits one
   concurrent reviewer to win. Private file evidence remains governed by the
   Storage policy.
10. Purchase-verified review eligibility is deferred until Commerce exposes an
    approved capability in Phase 6.

## Schema And Migration

Phase 5 does not change physical schema. Canonical baseline v2 remains the
reviewed contract, and no historical migration is modified.

The protected local database is reconciliation evidence, not production
truth. Its extra `product_wishlists` table cannot be copied or retired from
local row counts alone.

## Consequences

- Scoped Product and Review tables have one writable mapping each.
- Reviews and Admin no longer depend on Products persistence infrastructure.
- Product and User summaries remain available without ORM boundary leakage or
  list-size-dependent query counts.
- Wishlist physical cleanup remains an explicit deployment-evidence blocker.
- Phase 6 may add purchase eligibility through a port, but cannot reverse the
  scalar Reviews boundary.

## Rejected Alternatives

- Union central and module-local entity fields without evidence.
- Export `TypeOrmModule` or repositories from Products.
- Keep Product/User relations in the public Review entity model.
- Rename or merge wishlist tables from the protected local snapshot.
- Add dual-write as a temporary compatibility mechanism.
