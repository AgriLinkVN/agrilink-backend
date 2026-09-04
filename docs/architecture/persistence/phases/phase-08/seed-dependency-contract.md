# Phase 8 Seed Dependency Output Contract

## Status

`IMPLEMENTED_BY_MERGED_PR_108`

## Context

Owner-local seed groups sometimes need generated identifiers from prerequisite
groups. For example, `products.dev.products` needs User UUIDs while Products
must not import or query Users persistence. The original Phase 8 contract
returned `Promise<void>`, so the dependency DAG could order groups but could not
carry owner-neutral identifiers between them.

## Decision

```text
APPROVED_ARCHITECTURE=SEEDGROUP_SCALAR_DEPENDENCY_OUTPUTS_WITH_DEPENDENCY_SCOPED_LOOKUP
SEED_DEPENDENCY_OUTPUT_MODEL=SCALAR_DEPENDENCY_SCOPED
OUTPUT_SCOPE=PRODUCER_GROUP_ID_PLUS_KIND_PLUS_STABLE_KEY
UNDECLARED_DEPENDENCY_ACCESS=FAIL_CLOSED
MISSING_REQUIRED_OUTPUT=FAIL_CLOSED
OUTPUT_TYPE_MISMATCH=FAIL_CLOSED
OUTPUT_COLLISION=FAIL_CLOSED_PER_PRODUCER_KIND_KEY
PERSISTENCE=IN_MEMORY_EXECUTION_ONLY
ENTITY_TRANSPORT=PROHIBITED
REPOSITORY_TRANSPORT=PROHIBITED
SECRET_TRANSPORT=PROHIBITED
```

A `SeedGroup` returns a deterministic `SeedGroupResult`. Each output binding
contains a machine-readable `kind`, a stable string `key`, and one scalar
`value`. The only allowed value types are `string`, `number`, and `boolean`.
Groups with no outputs return `EMPTY_SEED_GROUP_RESULT`.

The orchestrator validates and stores results in memory under the producer
group ID. Before executing a consumer, it creates a read-only snapshot that
contains only outputs from IDs in that consumer's declared
`metadata.dependencies`. Lookups always specify producer ID, kind, and key.
Required lookups fail when missing, typed lookups fail on type mismatch, and
undeclared producer access fails before registry lookup.

The same kind and key may be published by different producers because the
producer group ID scopes the binding. A duplicate kind and key inside one
producer result is rejected.

## Published Owner Outputs

| Producer group                  | Kind                  | Stable key          | Scalar value                    | Count |
| ------------------------------- | --------------------- | ------------------- | ------------------------------- | ----: |
| `users.dev.users`               | `user.id.by-email`    | declared user email | reconciled User UUID            |     7 |
| `geography.reference.provinces` | `province.id.by-code` | canonical code      | reconciled Province UUID        |    34 |
| `products.reference.categories` | `category.id.by-slug` | canonical slug      | reconciled ProductCategory UUID |    37 |

Users outputs contain identifiers only. Passwords, password hashes,
credentials, tokens, API keys, and secrets are not output bindings. Geography
publishes only the 34 canonical numeric codes; historical aliases are not
published. Product Categories preserve deterministic parent-before-child
reconciliation and publish the ID returned by the same find/update/create flow.

## Alternatives Considered

| Option                                        | Outcome                                                               | Decision |
| --------------------------------------------- | --------------------------------------------------------------------- | -------- |
| Products queries Users/Geography repositories | Couples bounded contexts and exposes persistence details              | Rejected |
| Deterministic foreign UUID constants          | Invents identity ownership outside the producer                       | Rejected |
| Persist an output registry in a table/cache   | Adds schema and lifecycle complexity for execution-local data         | Rejected |
| Scalar, dependency-scoped in-memory outputs   | Preserves ownership and supports generated IDs with a narrow contract | Chosen   |

## Trade-offs And Consequences

- Consumers must declare real DAG dependencies and use explicit producer,
  kind, and stable key triples.
- Results exist only for the current orchestration run; they are not a general
  cross-module runtime service.
- Producers must retain reconciled IDs for both update and create paths.
- Scalar-only transport deliberately excludes structured payloads. A future
  need for richer transport requires a separate reviewed architecture decision.
- Snapshot views prevent a group from observing future or unrelated results.

## Scope Boundary

This decision does not create `products.dev.products`, choose Product/Product
Image stable keys, retire legacy Product or Seller seed sources, change Product
reset behavior, or change startup Product DEV behavior. Those remain P8-05B
work after this architecture contract is merged.
