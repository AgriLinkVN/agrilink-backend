# Business Flow and Consistency Map

All flows below are derived from source commit
`0e0af99c251190939bf4c3882a73ae2b97f8009d`. Labels are **Observed**,
**Inferred**, **Proposed**, and **Unverified**.

## Authentication

**Register, observed**

`POST /auth/register`
→ `RegisterUseCase`
→ Users port creates `users`
→ bcrypt hashes password
→ final user is returned.

No OTP send is part of this transaction. There is no dedicated password reset
endpoint/use case.

**Login, observed**

`POST /auth/login`
→ read `users`
→ bcrypt verify
→ write `refresh_tokens`
→ sign access/refresh JWTs
→ return tokens.

**OTP, observed and currently inconsistent**

`POST /auth/send-otp`
→ read `users` according to OTP purpose
→ write `otp_verifications`
→ Nodemailer adapter sends email, or logs OTP in development
→ delivery failure does not remove the saved OTP.

`POST /auth/verify-otp`
→ read/consume `otp_verifications`
→ for registration, mark an existing `users` row verified.

The registration send path rejects an already-existing user while verification
expects an existing user. This is a source-visible workflow inconsistency, not
a Phase 1 schema change.

**Firebase sync, observed**

`POST /auth/firebase/sync`
→ Firebase Admin verifies token
→ create/update `users`
→ write `refresh_tokens`
→ sign JWTs.

Firebase credentials come from explicit Firebase env fields or application
default credentials, including `GOOGLE_APPLICATION_CREDENTIALS`.

**Refresh/logout, observed**

Refresh reads user/token, revokes the old token, then creates a replacement.
Logout revokes all active refresh tokens for the user. Neither multi-step flow
has an enclosing transaction. Current state is **non-atomic**.

## User and profile onboarding

**Farmer/B2B profile upsert, observed manual saga**

Authenticated profile request
→ read each private file through Storage ownership/capability checks
→ FPT Vision KYC port for farmer identity (current adapter behavior is mock)
→ attach new `stored_files`
→ write one of `farmer_profiles`, `cooperative_profiles`,
`enterprise_profiles`, `supplier_profiles`
→ retire replaced files
→ detach newly attached files when profile save fails.

Legacy URL fields are cleared when a new file ID is accepted. Database and
provider operations are **eventually consistent with manual compensation**, not
one transaction.

**Admin verification, observed manual saga**

`PATCH /admin/profiles/:type/:profileId/verify`
→ Admin directly loads/writes the profile table
→ transition referenced `stored_files` to approved/rejected state
→ compensate Storage and profile state on failure
→ append `audit_logs`.

The audit append is not in the same transaction as profile/Storage state.
Account activation beyond profile verification is not demonstrated as a
separate atomic workflow.

## Product lifecycle

**Read/search, observed**

Category/list/detail/search endpoints
→ Product repository/query builder
→ `products`, `product_categories`, `product_images`,
`product_certifications`
→ raw seller-detail SQL reads `users`, profile tables, `provinces`,
`districts`.

The raw SQL expects profile fields that differ from local schema evidence,
including farmer and cooperative seller metadata. Group B compatibility must
protect current response behavior until the Products owner replaces this query.

**Create, observed atomic database transaction**

`POST /products`
→ validate category/seller input
→ `DataSource.transaction`
→ insert `products`
→ insert `product_images`
→ commit.

Image URLs are inputs; this endpoint does not upload image objects itself.

**Status transition, observed non-atomic side effect**

Admin/seller status request
→ update `products`
→ publish persisted notification
→ active WebSocket gateway emits.

There is no outbox coupling product state to notification publication.

**Certification, observed manual saga**

Create:
read private `stored_files`
→ attach file to product
→ insert `product_certifications`
→ detach file if DB write fails.

Verify:
update certification state
→ Storage review transition
→ restore DB state if Storage transition fails.

Remove:
delete certification
→ retire file
→ reconciliation is required if provider retirement fails after deletion.

**Wishlist, observed**

`POST /products/:id/wishlist`
→ validate product
→ insert `wishlists` with conflict-ignore semantics.

List/check/delete read or delete `wishlists`. Source and local evidence both
show a unique user/product pair for this canonical table.

## Reviews

**Create, observed**

Authenticated request
→ read `products`
→ reject reviewer equal to seller
→ insert `reviews`
→ unique-violation handling prevents a second active review only when the DB
partial unique index exists.

The code does not consult orders or purchases. `isVerifiedPurchase` is always
false, so verified purchase is **not implemented**. The local schema snapshot
lacks the source-required partial unique index, leaving a race/duplicate risk.

Moderation, seller reply and aggregate reads use `reviews`; moderation roles
are enforced at API level. Reviews directly register Product and relate to User,
which is a cross-module persistence boundary.

## Notifications and messaging

**Notifications, observed**

Application publisher
→ insert `notifications`
→ Socket.IO emit on the active gateway
→ REST list/read endpoints update/read the same table.

Persistence and delivery are **eventually consistent** with no outbox. A second
gateway file exists but is not registered.

**Messaging, not connected**

`conversations` and `messages` have central entity mappings only. No mounted
module, repository, API, event handler, gateway consumer, or test proves a
messaging flow.

## Ads, forum and admin

Ads CRUD/event tracking reads and writes `ad_packages`, `ad_campaigns` and
`ad_events`. Moderation can publish a notification after DB state changes; no
transaction/outbox joins these effects.

Forum endpoints read/write `forum_posts`, `forum_comments` and `forum_likes`.
No explicit transaction is observed for multi-step counter/like behavior.

Admin config, incident/dispute-named endpoints, user/profile/product moderation
and reports directly query multiple capability tables. “Dispute” endpoints use
`incident_reports`; the `disputes` table/entity is not their persistence
contract. Audit appends are separate writes.

## Commerce, logistics and compliance

**Commerce, not connected:** `purchase_requests`, `contracts`, `orders`,
`order_items`, `order_status_history` and `payments` have no mounted
capability, repository or API. No payment callback, refund, cancel, order
creation or contract flow is proven.

**Logistics, not connected:** `logistics_profiles`, `shipments` and
`shipment_tracking_events` have no mounted capability. Admin incident handling
is active through `incident_reports`, but it is not a shipment workflow.

**Traceability, currently partial:** its controller is mounted, but service
methods throw TODO. `traceability_records` is not a working flow.

**Quality compliance, not connected:** `quality_certificates` and `disputes`
are central entities without an active owner flow. Product certifications are a
different, active Products capability.

## Storage lifecycle

**Upload intent**

REST intent
→ insert `stored_files` as `PENDING`
→ request signed provider upload
→ client uploads
→ completion verifies provider object/content
→ `QUARANTINED`
→ owner attaches resource
→ review activates or fails the file.

If signed URL creation fails after the insert, the expired pending row is left
for cleanup. This is intentional eventual consistency.

**Deletion**

Owner retires file
→ provider delete
→ `DELETED`, or `DELETE_RETRY`
→ five-minute cron retries and updates attempts/error state.

No outbox is present. Retry count is recorded, but the source does not prove a
bounded exponential backoff policy.

### Owner-table compatibility

| Table                    | Legacy URL columns                                 | File-ID columns expected by active/migration flow | Source runtime                   | Local snapshot                                         | Decision                           |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------- | -------------------------------- | ------------------------------------------------------ | ---------------------------------- |
| `farmer_profiles`        | `cccd_front_url`, `cccd_back_url`                  | `cccd_front_file_id`, `cccd_back_file_id`         | central runtime mapping has both | file IDs absent                                        | Group B, dual columns              |
| `cooperative_profiles`   | cert, license, representative ID, member-list URLs | five matching `*_file_id` columns                 | central runtime mapping has both | file IDs absent; member-count drift also exists        | Group B, dual columns              |
| `enterprise_profiles`    | `business_license_url`                             | `business_license_file_id`                        | central runtime mapping has both | file ID absent                                         | Group B, dual columns              |
| `supplier_profiles`      | `business_license_url`                             | `business_license_file_id`                        | central runtime mapping has both | file ID absent                                         | Group B, dual columns              |
| `product_certifications` | `document_url`                                     | `stored_file_id`                                  | module runtime mapping has both  | migration/local rollout evidence requires verification | Group B, dual columns              |
| `quality_certificates`   | `document_url`                                     | `stored_file_id`                                  | central mapping only             | table absent locally                                   | Group C; wait for compliance owner |

**Proposed:** baseline v2 creates both legacy and file-ID columns for active
Group B tables. It does not create `quality_certificates` merely because the
Storage migration can conditionally alter it. Existing environments require
fingerprint-gated, idempotent backfill; external HTTP URLs must not be converted
to provider object keys without owner evidence.

## Transaction and failure map

| Workflow                           | Tables/external effect     | Current consistency           | Failure/retry behavior              | Phase 1 impact                  |
| ---------------------------------- | -------------------------- | ----------------------------- | ----------------------------------- | ------------------------------- |
| Product create                     | products + images          | atomic DB transaction         | rollback                            | preserve transaction metadata   |
| Cooperative UoW                    | cooperative tables         | transaction adapter exists    | no production consumer              | do not baseline capability      |
| Profile upsert                     | profile + Storage          | manual saga                   | detach/retire compensation          | include compatible columns only |
| Admin profile review               | profile + Storage + audit  | manual saga, audit non-atomic | state compensation                  | preserve behavior               |
| Certification create/review/delete | certification + Storage    | manual saga                   | partial compensation/reconciliation | include compatible columns/FKs  |
| Refresh rotation                   | users + refresh tokens     | non-atomic                    | no idempotent rotation transaction  | preserve, flag owner fix        |
| Notification publish               | notification + WebSocket   | eventual                      | no durable outbox retry             | preserve                        |
| Ads/product moderation             | owner table + notification | eventual                      | no outbox                           | preserve                        |
| Storage intent/completion/delete   | stored_files + provider    | eventual                      | cron cleanup/delete retry           | baseline exact state columns    |
| Forum multi-step actions           | forum tables               | unknown/non-transactional     | source-specific errors only         | preserve                        |

## Sixteen source-only tables

“Source-only” means absent from the recorded local PostgreSQL snapshot, not
absent from every deployment.

| Table                             | Source owner/evidence                      | Runtime/API/test/migration                                                         | Classification                     | Baseline recommendation         |
| --------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------- |
| `contracts`                       | central entity; contracts                  | no runtime/API/test; no migration                                                  | future commerce                    | exclude until owner phase       |
| `conversations`                   | central entity; messaging                  | no runtime/API/test; no migration                                                  | future messaging                   | exclude until owner phase       |
| `cooperative_province_references` | module-local cooperative entity/repository | runtime metadata + repository tests; no controller/use case; cooperative migration | scaffold, missing local schema     | exclude until production flow   |
| `disputes`                        | central entity; compliance                 | no runtime/API/test/migration; admin uses incidents instead                        | unimplemented feature              | exclude until owner phase       |
| `logistics_profiles`              | central entity; logistics                  | optional dev seed reference only; no migration                                     | future logistics/environment drift | exclude until owner phase       |
| `messages`                        | central entity; messaging                  | no runtime/API/test/migration                                                      | future messaging                   | exclude until owner phase       |
| `order_items`                     | central entity; orders                     | relation to orders; no runtime/API/test/migration                                  | future commerce                    | exclude until owner phase       |
| `order_status_history`            | central entity; orders                     | no runtime/API/test/migration                                                      | future commerce                    | exclude until owner phase       |
| `orders`                          | central entity; orders                     | relation target; no runtime/API/test/migration                                     | future commerce                    | exclude until owner phase       |
| `payments`                        | central entity; payments                   | no runtime/API/test/migration                                                      | future payments                    | exclude until owner phase       |
| `product_wishlist`                | central entity; products                   | CLI-only, no repository/API/test/migration                                         | dead/renamed mapping candidate     | reconcile with `wishlists`      |
| `purchase_requests`               | central entity; contracts                  | no runtime/API/test/migration                                                      | future commerce                    | exclude until owner phase       |
| `quality_certificates`            | central entity; compliance                 | conditional Storage migration reference; no owner flow                             | future compliance                  | exclude until owner phase       |
| `shipment_tracking_events`        | central entity; logistics                  | relation target only; no migration                                                 | future logistics                   | exclude until owner phase       |
| `shipments`                       | central entity; logistics                  | relation target only; no migration                                                 | future logistics                   | exclude until owner phase       |
| `user_addresses`                  | central entity; users                      | optional dev seed reference; no API/repository/migration                           | unimplemented feature              | exclude until Users owner phase |

The optional development seed obtains some central entities through
`DataSource.getRepository`, while runtime `autoLoadEntities` depends on module
registration. **Inferred:** enabling that seed can expose metadata/schema drift
for unmapped future entities; it is not evidence for baseline inclusion.

## Wishlist naming decision

| Name                | Evidence                                                                                        | Decision                         |
| ------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| `wishlists`         | active Products entity/repository/controller/tests; source and local table; unique user/product | proposed canonical table         |
| `product_wishlist`  | central CLI-only mapping; no runtime consumer or migration                                      | legacy rename candidate, Group D |
| `product_wishlists` | local-only table; no source mapping; different ID/constraint shape                              | environment drift, Group D       |

These are not three proven capabilities. The evidence supports one active
wishlist capability plus two legacy/drift artifacts. Before retirement or data
migration, collect row counts, duplicate keys, FKs, timestamps and deployed
consumer evidence from every environment.
