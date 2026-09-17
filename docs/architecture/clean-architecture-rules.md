# Backend Clean Architecture Rules

These rules are the official backend architecture standard for AgriLink Vietnam. They apply to NestJS, TypeScript, TypeORM and PostgreSQL code in the current modular monolith.

The goal is not to create layers, ports, or files mechanically. The goal is to protect dependency direction, business boundaries, stable REST/WebSocket contracts, testability, and incremental maintainability.

## 1. Architecture Direction

AgriLink remains a modular monolith unless a separate architecture decision explicitly changes that.

Each business module should have:

- A clear module boundary.
- A clear dependency direction.
- A clear public capability.
- Stable REST and WebSocket contracts.
- Isolated infrastructure concerns.
- Business behavior that can be unit tested without a real database, socket server, or external provider.

Default flow:

```text
HTTP / WebSocket / Scheduled Job
              ↓
         Presentation
              ↓
         Application
              ↓
            Domain

Infrastructure implements outbound ports required by Application/Domain.
```

Dependencies must point inward.

## 2. Default Module Structure

Default structure for new business modules:

```text
module/
├── presentation/
│   ├── controllers/
│   ├── gateways/
│   ├── dto/
│   ├── schemas/
│   └── mappers/
├── application/
│   ├── use-cases/
│   ├── services/
│   ├── models/
│   ├── errors/
│   └── ports/
│       ├── inbound/
│       └── outbound/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   ├── services/
│   ├── policies/
│   └── errors/
├── infrastructure/
│   ├── persistence/
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── mappers/
│   ├── queries/
│   ├── realtime/
│   └── external/
└── module.ts
```

Do not create empty folders just to match this tree. Create a folder or abstraction only when it protects a real boundary, improves clarity, or improves testability.

Small convention adjustments are allowed for legacy modules, but dependency direction is not negotiable for new or touched code.

## 3. Dependency Rules

Allowed direction:

```text
presentation -> application -> domain

infrastructure -> application
infrastructure -> domain
```

### Domain

Domain must not import:

- NestJS.
- TypeORM.
- Socket.IO.
- Axios.
- HTTP DTOs.
- WebSocket payload DTOs.
- Controllers.
- Gateways.
- Infrastructure adapters.
- Database entities.
- Repository implementations.

Domain may contain:

- Business entities.
- Value objects.
- Domain rules.
- Domain policies.
- Domain services.
- Domain events.
- Domain errors.

### Application

Application must not:

- Inject `Repository<T>` directly.
- Inject `DataSource` directly.
- Import `EntityManager` or `QueryRunner`.
- Import TypeORM persistence entities.
- Call controllers or gateways.
- Call Socket.IO directly.
- Import REST response DTOs.
- Import Swagger decorators.
- Know HTTP status codes.
- Know database or external provider details.

Application may:

- Orchestrate use cases.
- Call domain behavior.
- Inject inbound and outbound ports.
- Orchestrate transactions through a transaction port or Unit of Work.
- Return application result models.

### Presentation

Presentation may:

- Read params, query, body, and authenticated user.
- Validate input.
- Use guards and decorators for identity.
- Call application use cases.
- Map application results to REST/WebSocket contracts.
- Map application/domain errors to HTTP exceptions.
- Attach Swagger metadata.

Presentation must not:

- Contain business rules.
- Query repositories.
- Create persistence entities.
- Open transactions.
- Call infrastructure adapters directly.
- Decide business side effects.
- Call another module's concrete service when a capability port exists.

### Infrastructure

Infrastructure owns:

- TypeORM repositories.
- Persistence entities.
- Raw SQL.
- Query adapters.
- Cache adapters.
- File storage.
- Realtime adapters.
- External API adapters.
- Message broker adapters.
- Mapping persistence models to domain/application models.

Infrastructure must not contain core business rules.

## 4. Inbound And Outbound Ports

Use this project-wide convention:

```text
application/ports/inbound
application/ports/outbound
```

### Inbound Ports

An inbound port describes a capability that presentation or another module may call.

Example:

```ts
export interface PublishNotificationUseCase {
  execute(
    input: PublishNotificationInput,
  ): Promise<PublishedNotificationResult>;
}
```

### Outbound Ports

An outbound port describes a dependency the application needs from outside the application layer.

Example:

```ts
export interface NotificationRepositoryPort {
  create(input: CreateNotificationRecord): Promise<NotificationModel>;
}
```

```ts
export interface NotificationRealtimePublisherPort {
  publishCreated(event: NotificationCreatedEvent): Promise<void> | void;
}
```

Port names must describe business capability, not technology.

Good names:

```text
NotificationRepositoryPort
NotificationPublisherPort
PaymentGatewayPort
FileStoragePort
CampaignQueryPort
UnitOfWorkPort
```

Bad names:

```text
TypeOrmNotificationPort
SocketIoPort
AxiosPaymentPort
NotificationsServicePort
PostgresCampaignPort
```

Do not place the same repository port in both `domain/ports` and `application/ports`. The default location is `application/ports/outbound`. Put an abstraction in `domain` only when it is truly a domain concept, not application orchestration.

## 5. Dependency Injection Tokens

Injection tokens must be `Symbol`s:

```ts
export const NOTIFICATION_REPOSITORY =
  Symbol('NOTIFICATION_REPOSITORY');
```

Adapters must implement ports:

```ts
@Injectable()
export class TypeOrmNotificationRepository
  implements NotificationRepositoryPort {}
```

Use `useClass` when the adapter is only created through the token:

```ts
{
  provide: NOTIFICATION_REPOSITORY,
  useClass: TypeOrmNotificationRepository,
}
```

Use `useExisting` only when the adapter is already registered as a provider and the token should reuse that same instance:

```ts
providers: [
  TypeOrmNotificationRepository,
  {
    provide: NOTIFICATION_REPOSITORY,
    useExisting: TypeOrmNotificationRepository,
  },
]
```

Do not use `useExisting` if the target provider is not registered. Do not accidentally create multiple instances of the same adapter.

## 6. Cross-Module Boundaries

Another module must not inject a concrete service of a business module when a capability port exists.

Do not do this:

```ts
constructor(
  private readonly notificationsService: NotificationsService,
) {}
```

Do this:

```ts
constructor(
  @Inject(NOTIFICATION_PUBLISHER)
  private readonly notificationPublisher: NotificationPublisherPort,
) {}
```

Variable names must describe capabilities:

```text
notificationPublisher
paymentGateway
campaignReader
fileStorage
```

Avoid names like `notificationsService`, `paymentService`, or `campaignService` when the type is a port.

Modules should export only the capability tokens needed by other modules:

```ts
exports: [NOTIFICATION_PUBLISHER]
```

Do not export by default:

- Concrete application services.
- Repository implementations.
- Persistence entities.
- Infrastructure adapters.
- Realtime adapters.
- Internal repository ports.

Concrete services may be exported only for a real legacy dependency, and the reason must be documented:

```ts
// TODO(architecture): legacy export.
// Remove after OrdersModule migrates to ORDER_READER.
```

Never import another module's persistence entity, repository implementation, or infrastructure adapter directly.

## 7. Circular Dependencies

The module dependency graph should not contain cycles.

Do not use `forwardRef()` as the default solution. When two modules depend on each other, evaluate:

1. Can one dependency be replaced by an outbound capability port?
2. Can the interaction be represented by a domain/application event?
3. Can a small shared capability be extracted with clear ownership?
4. Are responsibilities assigned to the wrong module?

Every new `forwardRef()` must include:

- Architectural reason.
- Description of the dependency cycle.
- Removal plan.
- Tests protecting the behavior.

Do not turn a shared module into a dumping ground for many domains' business logic.

## 8. Domain, Application, And Persistence Models

Keep these model types distinct.

### Domain Model

A domain model represents a business concept and its invariants. It must not have TypeORM, Swagger, or class-validator decorators.

### Application Model

An application model represents use case input/output. It must not depend on HTTP or WebSocket.

### Persistence Model

A persistence model represents database shape. It may use TypeORM decorators.

Example mapping path:

```text
NotificationEntity
    ↓ infrastructure mapper
NotificationModel
    ↓ application result
NotificationResult
    ↓ presentation mapper
NotificationResponseDto
```

Ports must not return TypeORM entities. REST responses must not return TypeORM entities. WebSocket events must not emit TypeORM entities. Database entities must not be shared cross-module contracts.

Mapper classes are not mandatory. Private mapping functions inside an adapter are acceptable when mapping is simple. Create a mapper file/class when mapping is reused, persistence shape differs significantly, normalization is non-trivial, or the mapping needs independent tests.

## 9. DTOs And Runtime Validation

Public NestJS request/response contracts should use classes or runtime schemas when metadata, parsing, validation, serialization, or Swagger output matters:

- `class-validator`.
- `class-transformer`.
- Swagger decorators.
- Zod or another runtime schema where the repository already uses it.

Example:

```ts
export class NotificationResponseDto {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
```

Use TypeScript interfaces for internal domain/application types that do not need runtime metadata.

Application and domain must not import:

```text
presentation/dto
presentation/schemas
```

## 10. Use Case Rules

One use case should perform one main business behavior.

Examples:

```text
CreateCampaignUseCase
ApproveCampaignUseCase
RejectCampaignUseCase
CreateReviewUseCase
ReplyReviewUseCase
MarkNotificationReadUseCase
PublishNotificationUseCase
```

Use cases must:

- Have clear input types.
- Have clear result types.
- Inject ports.
- Not know HTTP.
- Not know TypeORM.
- Not know Socket.IO.
- Not know controller DTOs.
- Have independent unit tests.
- Handle authorization or ownership that belongs to business behavior.
- Run side effects only after persistence succeeds.

Do not create a use case only to wrap one line of code unless it improves clarity, protects a boundary, or improves testability.

Do not create a large application service that mixes CRUD, querying, mapping, file handling, realtime, transactions, notifications, seed data, and external APIs. Split it incrementally when touched behavior has a separate reason to change.

## 11. Controller Rules

Controllers may only:

- Read params, query, body, and authenticated user.
- Validate input by DTO/schema.
- Call use cases.
- Map results to response DTOs.
- Set HTTP status.
- Attach Swagger metadata.

Controllers must not:

- Contain business rules.
- Query repositories.
- Inject TypeORM repositories.
- Inject `DataSource`.
- Open transactions.
- Create persistence entities.
- Emit WebSocket events.
- Call external providers.
- Decide notification side effects.
- Access another module through infrastructure.

Controllers should stay short and easy to scan.

## 12. Authentication, Authorization, And Ownership

Authentication belongs at presentation:

- Guards.
- JWT validation.
- Current user decorators.

Authorization and ownership belong in application/domain behavior.

Do not trust these request body fields when authenticated identity already provides them:

```text
userId
ownerId
sellerId
buyerId
createdBy
tenantId
role
```

Use cases must use authenticated identity. Repository ports should support ownership-aware queries:

```ts
findByIdForUser(
  id: string,
  userId: string,
): Promise<NotificationModel | null>;
```

Prefer:

```text
query by id + ownerId
```

instead of:

```text
query by id
-> load record
-> check owner too late in application memory
```

Add tests proving User A cannot read or mutate User B's data.

## 13. Queries And Read Models

Not every read-only query must go through an aggregate repository.

Complex queries may use a query port:

```ts
export interface CampaignDashboardQueryPort {
  execute(
    filter: CampaignDashboardFilter,
  ): Promise<CampaignDashboardReadModel>;
}
```

Infrastructure may implement query ports with:

- TypeORM QueryBuilder.
- Raw SQL.
- Database views.
- Materialized views.
- Projections.

Raw SQL belongs only in infrastructure. Application must not inject `DataSource` just to run raw SQL.

Read models can be optimized separately and do not need to hydrate full domain entities.

Separate commands and queries when it improves clarity or efficiency. Do not apply CQRS mechanically to simple CRUD.

## 14. Transactions And Unit Of Work

Controllers must not open transactions.

Application must not import:

```text
DataSource
EntityManager
QueryRunner
```

When a use case needs atomicity across multiple operations, use a transaction abstraction:

```ts
export interface UnitOfWorkPort {
  execute<T>(
    work: (context: UnitOfWorkContext) => Promise<T>,
  ): Promise<T>;
}
```

Infrastructure implements the abstraction with TypeORM transactions.

Do not create a Unit of Work for every simple CRUD path. Use it when:

- Multiple repository writes must be atomic.
- A business invariant depends on multiple operations.
- Persistence and status transition must stay synchronized.
- A partial failure must rollback all related changes.

## 15. Side Effects And Events

Default order:

```text
Validate business rule
-> Persist successfully
-> Commit transaction
-> Publish side effect/event
```

Do not emit or call external services before persistence succeeds. Do not publish a WebSocket event when a repository throws. Do not pretend notification delivery succeeded if the transaction rolled back.

For high reliability flows, design so the outbox pattern can be added later. Do not introduce message brokers, Kafka, RabbitMQ, outbox tables, or distributed transactions unless they are explicitly in scope.

## 16. WebSocket Rules

Gateways are presentation/realtime adapters.

Gateways may:

- Authenticate connections.
- Join and leave rooms.
- Receive events from application through a realtime port.
- Emit events according to a contract.
- Handle transport-level concerns.

Gateways must not:

- Contain business rules.
- Query the database.
- Inject repositories.
- Perform status transitions.
- Decide whether a user may mutate a resource.
- Emit persistence entities.

Event names must be centralized:

```ts
export const NOTIFICATION_SOCKET_EVENTS = {
  NEW: 'new_notification',
  MARKED_READ: 'marked_read',
  ALL_READ: 'all_notifications_read',
} as const;
```

Each event needs a clear payload contract. Do not use repeated magic strings. Do not change event names or payload shapes without checking frontend consumers and updating tests.

## 17. REST Contract Rules

Every new or changed public endpoint must have:

- Request DTO/schema.
- Response DTO/schema.
- Clear HTTP status.
- Clear error contract.
- Swagger metadata when the repository uses Swagger.
- Contract or e2e test when the public contract changes.

Do not return:

```ts
Record<string, any>
```

Do not use `any` in new code.

Do not expose internal database fields only because they exist on an entity.

Pagination contract should be consistent:

```ts
export class PaginatedResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

If generic DTOs do not work well with Swagger, use concrete DTOs or a Swagger helper. Do not drop metadata silently.

## 18. Error Handling

Domain and application errors should have clear types:

```text
NotificationNotFoundError
CampaignAlreadyApprovedError
ReviewAlreadyExistsError
ForbiddenResourceAccessError
InvalidStatusTransitionError
```

Presentation maps those errors to HTTP exceptions/status codes.

Application should not throw `BadRequestException`, `NotFoundException`, or other HTTP-specific exceptions when a domain/application error would preserve the boundary. Legacy Nest exceptions can remain in untouched legacy code, but new touched code should prefer typed errors.

Do not catch and then:

- Swallow errors.
- Return fake success.
- Return fake data to hide persistence failure.
- Log and continue as if the operation succeeded.

Catch only when you can handle the error, translate a boundary, cleanup, or add context before rethrowing.

## 19. Concurrency And Idempotency

Every mutating use case should consider:

- Repeated requests.
- Concurrent requests.
- Client retries.
- Queue retries.
- Duplicate events.
- Invalid status transitions.

Do not rely only on:

```text
read
-> check in application
-> write
```

when the database can protect an invariant.

Use the right protection when needed:

- Unique constraints.
- Conditional updates.
- Optimistic locking.
- Pessimistic locking.
- Transactions.
- Idempotency keys.
- Version fields.

Examples:

```text
One buyer can review one product once
-> unique(buyer_id, product_id)
```

```text
Campaign can be approved only from pending
-> conditional update WHERE status = 'pending'
```

Idempotent behavior must have tests when the business flow requires it.

## 20. Migration Rules

Migrations must:

- Have clear names.
- Have valid timestamps.
- Be idempotent when reasonable.
- Not modify migrations likely already run in shared environments.
- Have an accurate `down()` when rollback is safe.
- Clearly document irreversible changes.
- Not fake rollback with `Promise.resolve()` without explanation.

For PostgreSQL enum changes:

```ts
/**
 * Irreversible migration:
 * PostgreSQL enum values cannot be safely removed without rebuilding the enum.
 */
```

If an old migration has already run, create a new migration instead of editing the old one.

When migrations are in scope, run them or at least compile/validate them in verification.

## 21. Testing Rules

Every new or changed use case needs unit tests.

Application unit tests must not require:

- Real database.
- Real TypeORM repository.
- Real socket server.
- Real external API.

Mock outbound ports.

Minimum useful coverage:

- Happy path.
- Invalid input/business rule.
- Resource not found.
- Ownership.
- Authorization.
- Idempotency.
- Concurrent-sensitive invariants when relevant.
- No event when persistence fails.
- Correct result contract.
- Correct interaction with ports.

New or changed public REST contracts need integration/e2e tests.

New or changed WebSocket contracts need integration tests when socket test infrastructure exists.

If test infrastructure does not exist:

- Do not claim tests passed.
- Record technical debt.
- Mark the phase `PARTIAL`.
- Add a test plan or minimal infrastructure if it is in scope.

## 22. Avoid Over-Engineering

Do not create a port only because a class exists.

Create a port when at least one condition is true:

1. The dependency points to infrastructure.
2. The dependency crosses a business module boundary.
3. The dependency must be mocked in unit tests.
4. There is a realistic implementation swap.
5. The capability has clear business meaning.
6. The current dependency causes coupling or blocks testing.

Do not create:

- A generic repository for every entity.
- `BaseService` for all CRUD.
- `BaseUseCase`.
- `BaseController`.
- Abstractions that wrap one method without improving boundaries.
- Mapper classes for trivial one-line mapping that is not reused.
- Domain events for every small field change.
- CQRS for simple CRUD.
- Fake microservice boundaries inside the monolith.

Prefer clear code over more layers.

## 23. Legacy Code And Incremental Refactor

Do not rewrite an entire old module during a small task.

When touching legacy code:

- Do not add new coupling.
- Refactor the behavior inside the task scope.
- Record technical debt outside the scope.
- Keep backward compatibility for contracts already used.
- Do not use architecture cleanup to change unrelated business behavior.
- Do not move many files when the benefit does not justify the risk.

Module/boundary status labels:

```text
COMPLIANT
PARTIAL
LEGACY
```

## 24. Definition Of Done

Do not mark a phase or task done only because code was added.

### DONE

Use `DONE` only when:

- Acceptance criteria map to code or tests.
- Lint succeeds.
- Build succeeds.
- Unit tests succeed.
- Contract/integration/e2e tests succeed for changed public contracts.
- Migration is verified when database changes are in scope.
- No concrete cross-module dependency remains in the touched scope.
- No new `any` is introduced.
- Application does not inject TypeORM repositories or `DataSource` in the touched scope.
- REST/WebSocket payloads match the contract.
- Ownership and authorization are tested.
- Side effects do not run before persistence success.
- The final report lists changed files and real command results.

### PARTIAL

Use `PARTIAL` when:

- Main behavior exists but test infrastructure is missing.
- Migration was not verified.
- A legacy boundary remains in the touched scope.
- Contract was not integration tested.
- Build or lint is blocked by a repository-level issue outside scope and this is proven.

### BLOCKED

Use `BLOCKED` when:

- Required dependency or access is missing.
- External contract is not defined.
- Migration cannot be done safely.
- Requirements conflict and cannot be resolved in scope.

Missing test commands do not mean tests passed. Do not report a command as successful unless it actually ran.

## 25. AI Agent Workflow

Before modifying a backend business module, an AI agent must:

1. Read this file.
2. Read the module plan or acceptance criteria.
3. Audit current dependencies.
4. Search for concrete cross-module imports.
5. Search for TypeORM usage in application.
6. Search for entities returned directly through REST/WebSocket.
7. Identify use cases.
8. Identify inbound/outbound ports needed.
9. Check circular dependencies.
10. Check ownership and authorization.
11. Check transactions, concurrency, and idempotency.
12. Implement only after the audit.

Do not create a new convention when the repository already has an equivalent one.

If a task requests a rule violation, the agent must:

- State the conflict.
- Explain the risk.
- Propose the least-violating solution.
- Avoid silently breaking boundaries.

## 26. Compatibility Expectations

These rules apply to:

- Notifications.
- Ads.
- Reviews.
- Products.
- Orders.
- Payments.
- Logistics.
- New backend modules.

Existing modules may be `PARTIAL` or `LEGACY`. New code and touched scope should move toward `COMPLIANT` without risky rewrites outside the task.
