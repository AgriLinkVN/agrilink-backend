# Phase 7B Environment Scope Worksheet

Status: `OWNER_CONFIRMATION_AND_ACCESS_REQUIRED`

This worksheet prepares operational decisions without granting access. Repository
documentation proves a local protected topology and describes a Railway production
topology, but it does not prove that staging or production is currently deployed or
included in the approved Phase 7B rollout.

## Allowed Statuses

- `REQUIRED_READY`
- `REQUIRED_AUTHORIZATION_MISSING`
- `REQUIRED_READ_ONLY_CREDENTIAL_MISSING`
- `REQUIRED_OPERATOR_OUTPUT_MISSING`
- `NOT_APPLICABLE_APPROVAL_REQUIRED`
- `NOT_APPLICABLE_APPROVED`
- `UNKNOWN_TOPOLOGY`

## Worksheet

| Environment alias | Exists  | Part of approved rollout | Operational owner            | Operational authorization | Dedicated read-only credential | Alternative operator-run inventory | Required for P7B-11 | Required for P7B-15 | Status                                  | Blocker                                                                 |
| ----------------- | ------- | ------------------------ | ---------------------------- | ------------------------- | ------------------------------ | ---------------------------------- | ------------------- | ------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| `local-protected` | YES     | YES                      | Database Owner               | P7B-19 policy only        | NO                             | Available; output missing          | YES                 | YES                 | `REQUIRED_READ_ONLY_CREDENTIAL_MISSING` | Dedicated credential or approved operator-run sanitized output missing  |
| `staging`         | UNKNOWN | UNKNOWN                  | Unassigned                   | NO                        | NO                             | Not arranged                       | UNKNOWN             | UNKNOWN             | `UNKNOWN_TOPOLOGY`                      | Existence, rollout applicability and operational owner unconfirmed      |
| `production`      | UNKNOWN | UNKNOWN                  | Railway/DB owner unconfirmed | NO                        | NO                             | Not arranged                       | UNKNOWN             | UNKNOWN             | `UNKNOWN_TOPOLOGY`                      | Deployment, rollout applicability, authorization and credential unknown |

No additional rollout environment is proven by current repository or deployment
documentation. A newly identified environment must be added by safe alias before an
inventory request is approved.

## Interpretation

- P7B-19 authorizes read-only inventory as a policy outcome; it does not supply
  environment-specific operational authorization.
- `local-protected` remains required because the merged inventory evidence already
  treats it as the protected local evidence environment for P7B-11 and P7B-15.
- Railway documentation is a deployment runbook, not proof that a production
  database exists or may be accessed.
- Staging must remain `UNKNOWN_TOPOLOGY` until an owner confirms whether it exists
  and whether it is part of the rollout.
- `NOT_APPLICABLE_APPROVED` may be recorded only after the owner decision below is
  completed. Absence of credentials is not proof that an environment is not
  applicable.

## Owner Decision Entries

Complete one entry per environment whose topology or rollout applicability is
unknown. Do not replace an unknown with an assumption.

| Field                    | Required value                                      |
| ------------------------ | --------------------------------------------------- |
| Environment alias        | Safe alias only                                     |
| Exists                   | `YES` or `NO`                                       |
| Part of approved rollout | `YES` or `NO`                                       |
| Decision                 | `REQUIRED` or `NOT_APPLICABLE_APPROVED`             |
| Operational owner        | Named accountable role                              |
| Approver                 | Authorized owner                                    |
| Approval capacity        | Project/Architecture/Database/Environment authority |
| Approval date            | ISO date                                            |
| Evidence/rationale       | Non-sensitive deployment or scope evidence          |
| P7B-11 impact            | Required inventory or excluded by approval          |
| P7B-15 impact            | Required inventory or excluded by approval          |

### Pending Staging Decision

- Environment alias: `staging`
- Exists: `UNKNOWN`
- Part of approved rollout: `UNKNOWN`
- Decision: pending owner confirmation
- Status until decision: `UNKNOWN_TOPOLOGY`

### Pending Production Decision

- Environment alias: `production`
- Exists: `UNKNOWN`
- Part of approved rollout: `UNKNOWN`
- Decision: pending owner confirmation
- Status until decision: `UNKNOWN_TOPOLOGY`

## Exit Conditions

An environment may become `REQUIRED_READY` only when its existence and rollout
scope are approved, an operational owner is assigned, explicit authorization is
recorded, and either a dedicated read-only credential or an approved database
operator is ready to return sanitized output using the linked pack.
