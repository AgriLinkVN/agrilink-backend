# Auth Phone Login Hardening

## Scope

This change implements phone login for accounts that already have a phone
stored in `users.phone` (Scope A). It does not claim phone-first registration.

Persistence Phase 3 formally keeps phone-first registration deferred because:

- `users.email` is non-nullable in the canonical schema.
- `RegisterDto` still requires email.
- `RegisterUseCase` does not persist phone.
- The protected local snapshot contains legacy phone/Firebase identities, but
  that evidence does not approve a new phone-only registration contract.

No entity, database migration, persistence baseline, token contract, or
registration behavior changes in this patch.

Existing records and legacy seed fixtures that store `0`-prefixed numbers are
not rewritten. Phone login is guaranteed for accounts whose stored phone
already uses the canonical format. Phase 3 changes new seed fixtures to the
canonical format without mutating `agrilink_db`.

Phase 3 read-only reconciliation found two local users with null email. Both
have canonical phone and password identities; one is Firebase-linked and
active, while one is a pending phone/password account. They remain legacy
reconciliation records. Canonical v2 and new registration continue to require
email, and no placeholder email is generated.

## Phone Contract

The canonical Vietnamese mobile format is `+84` followed by nine subscriber
digits. The accepted login inputs are normalized at the application boundary:

| Input | Canonical lookup |
| --- | --- |
| `0901234567` | `+84901234567` |
| `84901234567` | `+84901234567` |
| `+84901234567` | `+84901234567` |
| `0901 234 567` | `+84901234567` |
| `0901-234-567` | `+84901234567` |

Invalid prefixes, lengths, extensions, letters, and non-Vietnamese country
codes are rejected before a repository query.

## Login Contract

`POST /api/v1/auth/login` requires exactly one identifier:

- `email` and `password`; or
- `phone` and `password`.

Supplying both identifiers or neither returns HTTP 400. Unknown accounts and
wrong passwords return the same HTTP 401 message to avoid account enumeration.
Each valid request performs exactly one user lookup.

## OpenAPI Evidence

The comparison uses the same preview-mode Swagger capture against source
commit `55421fbbc2fe765031f554a34a9df5552ce033fc`.

| Measurement | Before | After |
| --- | --- | --- |
| Paths | 88 | 88 |
| Operations | 99 | 99 |
| Fingerprint | `011d9b1062e416098aa2c89d644878224530fcfbab50a09745ab0f8e2061c7f6` | `5637fed8d1ae886ea9cb8fabc5b9f7813454990c5f52ac5c5cded8fcb0a0157f` |

The exact intentional changes are limited to:

- Login summary now names email or phone.
- `LoginDto.email` becomes optional.
- `LoginDto.phone` is added as optional.
- `LoginDto.password` remains required.
- The request body adds `oneOf` requirements for email or phone.
- HTTP 400 is documented for an invalid identifier contract.

The route, HTTP method, success status, access-token response, refresh cookie,
guards, and token semantics are unchanged. The Persistence Phase 1 OpenAPI
baseline is intentionally not rewritten by this Auth patch.

## Verification

| Gate | Result |
| --- | --- |
| Focused Auth unit tests | 28 passed |
| Focused Auth REST/OpenAPI tests | 8 passed |
| TypeScript | 0 errors |
| Scoped lint | 0 errors, 0 warnings |
| Full lint | 0 errors; 22 pre-existing warnings outside this patch |
| Build | Passed |
| Full unit tests | 145 passed; 1 existing opt-in skip |
| Full E2E tests | 98 passed |
| User lookups per login | 1 |
| Schema migration | None |
