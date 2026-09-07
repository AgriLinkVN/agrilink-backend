# Persistence Phase 5: Products, Wishlist, Certifications And Reviews

- Status: Complete
- Source PR: #85
- Implementation commit: `7d59e0e`
- Merge commit: `b9013935bab4eb62caf9a0fa281ef8c576835537`
- Source develop commit:
  `72cfd645087efd1f9aa24a0d0c8f111810e1765c`
- Scope: `products`, `product_categories`, `product_images`,
  `product_certifications`, `wishlists`, legacy wishlist candidates,
  `reviews`, and the Admin Product boundary.

## Canonical Owners

Products owns Product, Category, Image, Certification, Wishlist persistence,
read projections, review eligibility, and product moderation capabilities.
Reviews owns Review persistence, creation rules, listing, moderation, and its
read-model composition.

## Key Decisions

- Products-local entities are canonical; central scoped files are
  decorator-free compatibility re-exports.
- Canonical baseline and active runtime continue to use `public.wishlists`.
- The physical lineage of `product_wishlist` and local
  `product_wishlists` is `WISHLIST_SCHEMA_RECONCILIATION_REQUIRED` until a
  deployed row inventory is available.
- No wishlist rename, copy, drop, dual-read, or dual-write is approved.
- Reviews stores scalar Product/User identifiers and uses typed Products and
  Users capabilities for eligibility and batched summaries.
- Admin uses typed Products read and moderation capabilities.
- Certification verification preserves the existing states and uses a
  conditional one-winner transition.
- Migration: `NONE`.

## References

- [Implementation report](implementation-report.md)
- [Evidence inventory](evidence/products-reviews-evidence.json)
- [ADR 0002](../../../adr/0002-entity-ownership-and-persistence-boundaries.md)
- [ADR 0003](../../../adr/0003-cross-module-transaction-policy.md)
- [ADR 0004](../../../adr/0004-canonical-schema-baseline-and-onboarding.md)
- [ADR 0007](../../../adr/0007-products-wishlist-certifications-and-reviews.md)

## Deferred Work

Phase 6 owns Commerce and any purchase-completion review eligibility. Deployed
wishlist row reconciliation, legacy public URL retirement, and protected
existing-database onboarding remain explicit follow-up work.

Phase 6 must not start until the Phase 5 pull request is merged into
`develop`.
