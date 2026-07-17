# Clean Architecture Rules

These rules are mandatory for backend work in AgriLink Vietnam. They apply to AI agents and developers working in the NestJS modular monolith.

## 1. Module Structure

New business modules should follow this structure:

```text
module/
├── presentation/
│   ├── controllers/
│   ├── gateways/
│   ├── dto/
│   └── schemas/
├── application/
│   ├── use-cases/
│   ├── services/
│   └── ports/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   ├── errors/
│   └── ports/
├── infrastructure/
│   ├── persistence/
│   ├── repositories/
│   ├── realtime/
│   └── external/
└── module.ts
```

Small convention adjustments are allowed, but dependency direction is not negotiable.

## 2. Dependency Rule

Allowed direction:

```text
presentation -> application -> domain
infrastructure -> application/domain
```

Do not violate these rules:

- Domain must not import NestJS.
- Domain must not import TypeORM.
- Domain must not import Socket.IO.
- Domain must not import controller DTOs.
- Domain must not depend on infrastructure.
- Application must not inject `Repository<T>` directly.
- Application must not inject `DataSource` directly.
- Application must not call gateways or Socket.IO directly.
- Controller must not call TypeORM repositories.
- Gateway must not contain business rules.
- Other modules must not inject a concrete service when a cross-module port exists.

## 3. Ports And Adapters

Ports describe business capability, not implementation.

Good:

```ts
export interface NotificationPublisherPort {
  publish(input: PublishNotificationInput): Promise<NotificationModel>;
}
```

Bad:

```ts
export interface TypeOrmNotificationPort {}
export interface SocketIoNotificationPort {}
export interface NotificationsServicePort {}
```

Injection tokens must be `Symbol`s:

```ts
export const NOTIFICATION_PUBLISHER = Symbol('NOTIFICATION_PUBLISHER');
```

Infrastructure adapters must implement ports:

```ts
@Injectable()
export class TypeOrmNotificationRepository
  implements NotificationRepositoryPort {}
```

Modules bind adapters through providers:

```ts
{
  provide: NOTIFICATION_REPOSITORY,
  useExisting: TypeOrmNotificationRepository,
}
```

## 4. Cross-Module Rules

Cross-module dependencies must use exported ports.

Do not inject concrete services from another module:

```ts
constructor(
  private readonly notificationsService: NotificationsService,
) {}
```

Use a capability port:

```ts
constructor(
  @Inject(NOTIFICATION_PUBLISHER)
  private readonly notificationPublisher: NotificationPublisherPort,
) {}
```

Variable names must describe capability. Do not use a `Service` suffix when the type is a port.

Modules should export only the capability token needed by other modules. Exporting a concrete service requires a clear legacy reason in code or docs.

Do not import another module's persistence entity, repository, or infrastructure adapter.

## 5. Domain Model And Persistence Model

Target architecture:

- Ports do not depend on TypeORM entities.
- REST responses do not return TypeORM entities directly.
- WebSocket payloads do not emit TypeORM entities directly.
- Domain/application use domain models or contract models.
- Infrastructure maps persistence entities to domain models.
- Presentation maps application results to response DTOs.

If an old module cannot be fully decoupled yet:

- Document it as technical debt.
- Do not add new persistence coupling.
- New code must use separated models/contracts.
- Add a migration path for removing the coupling later.

## 6. Use Case Rules

One use case should perform one main business behavior.

Examples:

```text
ListNotificationsUseCase
ListUnreadNotificationsUseCase
CountUnreadNotificationsUseCase
MarkNotificationReadUseCase
MarkAllNotificationsReadUseCase
PublishNotificationUseCase
```

Use cases must:

- Inject ports.
- Not know TypeORM.
- Not know HTTP.
- Not know Socket.IO.
- Have clear input/output types.
- Have independent unit tests.

Avoid huge application services that mix CRUD, realtime, mapping, and persistence.

## 7. Controller Rules

Controllers may only:

- Read params/query/body/current user.
- Validate request by DTO/schema.
- Call application use cases.
- Map results to response contracts.
- Set HTTP status.

Controllers must not:

- Contain business rules.
- Query repositories.
- Manage transactions.
- Call gateways.
- Create persistence entities.
- Decide notification side effects.

## 8. WebSocket Rules

Gateways are presentation/realtime adapters.

Gateways may only:

- Authenticate a connection.
- Join/leave user rooms.
- Receive application events through a realtime port.
- Emit events according to a contract.

Event names must be centralized:

```ts
export const NOTIFICATION_SOCKET_EVENTS = {
  NEW: 'new_notification',
  MARKED_READ: 'marked_read',
  ALL_READ: 'all_notifications_read',
} as const;
```

Each event payload must have a clear interface. Do not emit TypeORM entities.

## 9. REST Contract Rules

Every public endpoint must have a response DTO or interface.

Notification response contract:

```ts
interface NotificationResponseDto {
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

Paginated response contract:

```ts
interface NotificationListResponseDto {
  data: NotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
}
```

Do not expose ambiguous contracts such as:

```ts
Record<string, any>
```

Do not use `any` in new code.

## 10. Error Handling

Domain/application errors must have clear types.

Presentation maps domain/application errors to HTTP exceptions.

Do not catch and swallow errors without a reason. Do not return fake backend data to hide persistence failures.

Do not publish WebSocket events if persistence failed.

## 11. Transactions And Side Effects

Default order:

```text
Validate business rule
-> Persist successfully
-> Commit transaction
-> Publish side effect/event
```

Do not emit before data is saved.

For flows that require high reliability, design so an outbox pattern can be added later. Do not add a broker or outbox unless it is in scope.

## 12. Migration Rules

Migrations must:

- Have clear names.
- Be idempotent when reasonable.
- Not modify migrations that may have run in shared environments.
- Explain when `down()` cannot safely rollback.
- Avoid pretending rollback is possible.

For PostgreSQL enum values:

```ts
/**
 * Irreversible migration:
 * PostgreSQL enum values cannot be safely removed without rebuilding the enum.
 */
```

## 13. Testing Rules

Each use case needs unit tests.

Important REST contracts need integration/e2e tests when the repository has e2e infrastructure.

Important WebSocket contracts need integration tests when socket test infrastructure exists.

Minimum coverage for related scope:

- Happy path.
- Resource not found.
- User cannot access another user's data.
- Idempotency.
- No event when persistence fails.
- Payload matches contract.
- HTTP status is correct.
- Legacy endpoint compatibility when required.

## 14. Definition Of Done

Do not mark a phase done only because code was added.

A phase is DONE only when:

- Acceptance criteria are mapped to code/tests.
- Lint passes, or a repository-level lint blocker is documented.
- Build passes.
- Unit tests pass.
- Contract/e2e tests pass when infrastructure exists.
- No concrete cross-module dependency remains in scope.
- No `any` is introduced in new code.
- Application layer does not inject TypeORM repository or `DataSource` in the touched scope.
- REST/WebSocket payloads match contract.
- The final report lists changed files and command results.
