# AgriLink Vietnam — Backend API

> REST API cho nền tảng nông sản AgriLink Vietnam — NestJS + TypeORM + PostgreSQL.

[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://postgresql.org)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.x-FE0803)](https://typeorm.io)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI_3-85EA2D?logo=swagger)](https://swagger.io)
[![License](https://img.shields.io/badge/License-UNLICENSED-red)](LICENSE)

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cài đặt & Chạy](#cài-đặt--chạy)
- [Biến môi trường](#biến-môi-trường)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Auth Flow](#auth-flow)
- [Quy trình làm việc với Git](#quy-trình-làm-việc-với-git)
- [Hướng dẫn implement module](#hướng-dẫn-implement-module)

---

## Tổng quan

AgriLink Backend cung cấp REST API cho toàn bộ hệ sinh thái AgriLink, phục vụ **7 vai trò người dùng** với phân quyền riêng biệt:

```
farmer → cooperative → buyer → enterprise → supplier → state_agency → admin
```

**Trạng thái hiện tại**: Scaffold đầy đủ — tất cả modules, entities, controllers, DTOs đã có. Service methods được stub với `TODO` để team phân công implement.

---

## Công nghệ sử dụng

| Thư viện | Phiên bản | Mục đích |
|---|---|---|
| [NestJS](https://nestjs.com) | 10.x | Framework chính |
| [TypeORM](https://typeorm.io) | 0.3.20 | ORM + migrations |
| [PostgreSQL](https://postgresql.org) | 16 | Database |
| [@nestjs/jwt](https://github.com/nestjs/jwt) | 10.x | JWT access + refresh tokens |
| [passport-jwt](http://www.passportjs.org) | 4.x | JWT strategy |
| [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction) | 7.x | OpenAPI docs |
| [class-validator](https://github.com/typestack/class-validator) | 0.14.x | DTO validation |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 2.x | Password hashing |
| [Docker](https://docker.com) | — | PostgreSQL + pgAdmin local |

---

## Cấu trúc dự án

```
agrilink-backend/
├── src/
│   ├── main.ts                    # Bootstrap: Swagger, ValidationPipe, global prefix /api/v1
│   ├── app.module.ts              # Root module
│   ├── app.controller.ts          # GET / — health check
│   │
│   ├── config/
│   │   ├── database.config.ts     # TypeORM config factory (đọc từ env)
│   │   ├── jwt.config.ts          # JWT access + refresh options
│   │   └── app.config.ts          # Port, CORS origins
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts   # @CurrentUser()
│   │   │   ├── roles.decorator.ts          # @Roles(UserRole.admin)
│   │   │   └── public.decorator.ts         # @Public() — bỏ qua JWT guard
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts           # Global JWT guard
│   │   │   └── roles.guard.ts             # Role-based access
│   │   ├── interceptors/
│   │   │   ├── response.interceptor.ts     # Wrap response: { statusCode, message, data, timestamp }
│   │   │   └── audit-log.interceptor.ts    # Ghi audit log tự động
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts    # Chuẩn hóa error response
│   │   ├── pipes/
│   │   │   └── parse-uuid.pipe.ts
│   │   ├── dto/
│   │   │   └── pagination.dto.ts           # page, limit, sortBy, sortOrder
│   │   └── enums/
│   │       └── index.ts                    # Tất cả enums từ DB schema
│   │
│   ├── database/
│   │   ├── migrations/            # TypeORM migrations (generate khi cần)
│   │   └── seeds/seed.ts          # Seed script placeholder
│   │
│   └── modules/
│       ├── auth/                  # Đăng nhập, đăng ký, OTP, refresh token
│       ├── users/                 # User profile, CRUD
│       ├── profiles/              # Farmer / Cooperative / Enterprise / Supplier profiles
│       ├── geography/             # Tỉnh thành, quận huyện
│       ├── products/              # Sản phẩm, hình ảnh, chứng nhận
│       ├── wishlist/              # Danh sách yêu thích
│       ├── cooperatives/          # Thành viên HTX, lô hàng tập thể, lịch thu hoạch
│       ├── market-prices/         # Giá thị trường nông sản
│       ├── traceability/          # Truy xuất nguồn gốc QR
│       ├── reviews/               # Đánh giá sản phẩm / người bán
│       ├── notifications/         # Thông báo real-time
│       ├── ads/                   # Gói quảng cáo, chiến dịch, tracking
│       └── admin/                 # System config, audit logs
│
├── docker-compose.yml             # PostgreSQL 16 + pgAdmin 4
├── .env.example                   # Template biến môi trường
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### Cấu trúc mỗi module

```
modules/products/
├── products.module.ts
├── products.controller.ts    # Endpoints + Swagger decorators
├── products.service.ts       # Business logic (TODO stubs)
├── entities/
│   ├── product.entity.ts     # TypeORM entity
│   ├── product-image.entity.ts
│   └── product-certification.entity.ts
└── dto/
    ├── create-product.dto.ts
    ├── update-product.dto.ts
    └── product-filter.dto.ts
```

---

## Cài đặt & Chạy

### Yêu cầu

- Node.js **18+**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Lần đầu (mọi thành viên)

```bash
# 1. Clone repo
git clone https://github.com/AgriLinkVN/agrilink-backend.git
cd agrilink-backend

# 2. Copy env template
cp .env.example .env        # Linux/Mac
copy .env.example .env      # Windows

# 3. Khởi động PostgreSQL + pgAdmin
docker compose up -d

# 4. Kiểm tra DB healthy
docker compose ps
# agrilink_db phải có status: healthy

# 5. Cài dependencies
npm install

# 6. Start dev server
npm run start:dev
```

### Các lệnh

```bash
npm run start:dev         # Dev server với hot-reload
npm run start:debug       # Debug mode
npm run build             # Build production
npm run start:prod        # Chạy production build
npm run lint              # ESLint
npm run test              # Unit tests
npm run test:e2e          # E2E tests

# Database
npm run migration:generate -- -n TenMigration   # Tạo migration mới
npm run migration:run                            # Chạy migrations
npm run migration:revert                         # Revert migration cuối
npm run seed                                     # Seed dữ liệu mẫu
```

### Kiểm tra hoạt động

```bash
# Health check
curl http://localhost:3001/api/v1

# Swagger UI
open http://localhost:3001/api/docs

# pgAdmin (xem DB trực quan)
open http://localhost:5050
# Email: admin@agrilink.vn | Password: admin123
# Server: host=postgres, port=5432, db=agrilink_db, user=agrilink
```

---

## Biến môi trường

Copy `.env.example` thành `.env` và chỉnh giá trị:

```env
# Application
APP_PORT=3001
NODE_ENV=development

# CORS — Frontend URL
CORS_ORIGINS=http://localhost:3000

# Database — khớp với docker-compose.yml
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agrilink_db
DB_USER=agrilink
DB_PASS=agrilink_dev_2025
DB_SYNCHRONIZE=true       # true cho dev (tự tạo bảng), false cho production
DB_LOGGING=true           # Log SQL queries

# JWT Access Token (ngắn hạn)
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=15m

# JWT Refresh Token (dài hạn)
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=7d
```

> **Quan trọng**: `DB_SYNCHRONIZE=true` chỉ dùng cho development. Production phải dùng migrations.

---

## API Endpoints

Base URL: `http://localhost:3001/api/v1`

Xem đầy đủ tại Swagger: `http://localhost:3001/api/docs`

### Auth

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/auth/register` | Đăng ký tài khoản mới | Public |
| POST | `/auth/login` | Đăng nhập, nhận access + refresh token | Public |
| POST | `/auth/refresh` | Làm mới token pair | Refresh Token |
| POST | `/auth/logout` | Thu hồi refresh token | Bearer |
| POST | `/auth/send-otp` | Gửi OTP qua SMS/Email | Public |
| POST | `/auth/verify-otp` | Xác minh mã OTP | Public |

### Users

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/users/me` | Lấy thông tin user hiện tại | Bearer |
| PATCH | `/users/me` | Cập nhật thông tin cá nhân | Bearer |
| GET | `/users/:id` | Lấy thông tin user (admin) | Bearer + Admin |

### Profiles

| Method | Endpoint | Mô tả |
|---|---|---|
| GET/PATCH | `/profiles/farmer` | Hồ sơ nông dân |
| GET/PATCH | `/profiles/cooperative` | Hồ sơ HTX |
| GET/PATCH | `/profiles/enterprise` | Hồ sơ doanh nghiệp |
| GET/PATCH | `/profiles/supplier` | Hồ sơ nhà cung cấp |

### Products

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/products` | Danh sách sản phẩm (filter, pagination) |
| POST | `/products` | Tạo sản phẩm mới |
| GET | `/products/:id` | Chi tiết sản phẩm |
| PATCH | `/products/:id` | Cập nhật sản phẩm |
| DELETE | `/products/:id` | Xóa sản phẩm |
| POST | `/products/:id/images` | Upload ảnh sản phẩm |
| POST | `/products/:id/certifications` | Thêm chứng nhận |

### Cooperatives

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/cooperatives/members` | Danh sách thành viên |
| POST | `/cooperatives/members/:farmerId/invite` | Mời nông dân vào HTX |
| PATCH | `/cooperatives/members/:memberId/status` | Duyệt/từ chối thành viên |
| POST/GET | `/cooperatives/bulk-listings` | Lô hàng tập thể |
| POST/GET | `/cooperatives/harvest-schedules` | Lịch thu hoạch |

### Market Prices

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/market-prices` | Bảng giá (filter theo tỉnh, danh mục, ngày) |
| POST | `/market-prices` | Cập nhật giá (admin/state_agency) |

### Traceability

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/trace/:qrCode` | Tra cứu nguồn gốc theo mã QR |
| GET | `/trace/product/:productId` | Xem lịch sử truy xuất của sản phẩm |
| POST | `/trace` | Tạo bản ghi truy xuất (admin) |

### Khác

- `GET/POST /geography/provinces` — Danh sách tỉnh thành
- `GET /geography/provinces/:id/districts` — Quận huyện
- `GET/POST/DELETE /wishlist/:productId` — Danh sách yêu thích
- `GET/POST /reviews` — Đánh giá sản phẩm
- `PATCH /reviews/:id/reply` — Phản hồi của người bán
- `GET/PATCH /notifications` — Thông báo
- `GET/POST /ads/packages` — Gói quảng cáo
- `CRUD /ads/campaigns` — Chiến dịch quảng cáo
- `GET/PATCH /admin/system-configs` — Cấu hình hệ thống
- `GET /admin/audit-logs` — Nhật ký hoạt động

---

## Database Schema

Gồm **11 nhóm bảng**, tổng **~25 bảng** (MVP):

| Nhóm | Bảng chính |
|---|---|
| Người dùng & Xác thực | `users`, `otp_verifications`, `refresh_tokens` |
| Hồ sơ theo vai trò | `farmer_profiles`, `cooperative_profiles`, `enterprise_profiles`, `supplier_profiles` |
| Địa lý | `provinces`, `districts` |
| Sản phẩm | `products`, `product_images`, `product_certifications`, `product_wishlist` |
| HTX | `cooperative_members`, `bulk_listings`, `bulk_listing_contributions`, `harvest_schedules` |
| Giá thị trường | `market_prices` |
| Truy xuất nguồn gốc | `traceability_records` |
| Đánh giá | `reviews` |
| Thông báo | `notifications` |
| Quảng cáo | `ad_packages`, `ad_campaigns`, `ad_events` |
| Hệ thống | `system_configs`, `audit_logs` |

Xem chi tiết tại [DB Schema (dbdiagram)](https://dbdiagram.io) hoặc `src/modules/*/entities/`.

---

## Auth Flow

```
┌─────────┐     POST /auth/login      ┌─────────┐
│ Client  │ ─────────────────────────▶│  API    │
│         │ ◀─────────────────────────│         │
│         │   { accessToken (15m),    │         │
│         │     refreshToken (7d) }   │         │
└─────────┘                           └─────────┘

Mỗi request:
Authorization: Bearer <accessToken>

Khi accessToken hết hạn:
POST /auth/refresh
Body: { refreshToken }
→ Nhận cặp token mới (rotation)
```

### Response format chuẩn

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2025-06-01T10:00:00.000Z"
}
```

### Error format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["phone must be a string"],
  "timestamp": "2025-06-01T10:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

---

## Quy trình làm việc với Git

### Nhánh

| Nhánh | Mục đích |
|---|---|
| `main` | Production |
| `develop` | Integration — merge PR vào đây |
| `trungle2605` | Nhánh cá nhân Trung Lê |

### Workflow phân công module

```bash
# Mỗi thành viên tạo nhánh từ develop
git checkout develop && git pull origin develop
git checkout -b feature/module-products

# Implement service methods (thay TODO bằng logic thật)
# Viết unit test

git add .
git commit -m "feat(products): implement CRUD service methods"
git push origin feature/module-products

# Tạo PR → develop, assign reviewer
```

### Commit convention

```
feat(module):     Tính năng mới
fix(module):      Sửa bug
chore:            Dependencies, config
test(module):     Thêm/sửa tests
docs:             Cập nhật tài liệu
```

---

## Hướng dẫn implement module

Mỗi service method hiện có dạng:

```typescript
async findAll(): Promise<Product[]> {
  throw new Error('TODO: implement findAll products');
}
```

### Các bước implement

**1. Inject repository trong constructor:**

```typescript
constructor(
  @InjectRepository(Product)
  private readonly productRepository: Repository<Product>,
) {}
```

**2. Implement method:**

```typescript
async findAll(filterDto: ProductFilterDto): Promise<[Product[], number]> {
  const { page = 1, limit = 20, categoryId, provinceId } = filterDto;

  const qb = this.productRepository.createQueryBuilder('p')
    .where('p.status = :status', { status: ProductStatus.active });

  if (categoryId) qb.andWhere('p.category_id = :categoryId', { categoryId });
  if (provinceId) qb.andWhere('p.province_id = :provinceId', { provinceId });

  return qb
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();
}
```

**3. Xử lý password trong auth:**

```typescript
import * as bcrypt from 'bcryptjs';

const passwordHash = await bcrypt.hash(dto.password, 10);
const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
```

**4. Phát JWT:**

```typescript
constructor(private readonly jwtService: JwtService) {}

const accessToken = this.jwtService.sign(
  { sub: user.id, role: user.role },
  { secret: process.env.JWT_SECRET, expiresIn: '15m' }
);
```

---

## Liên hệ

- Email: hello@agrilink.vn
- Địa chỉ: Đà Nẵng, Việt Nam
- GitHub Org: [AgriLinkVN](https://github.com/AgriLinkVN)

---

> © 2025 AgriLink Vietnam. Dự án khởi nghiệp sinh viên.
