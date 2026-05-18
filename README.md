# Reusable Ecommerce Backend Starter (Phase 1)

Production-grade reusable ecommerce backend template for per-client deployments.

This starter is designed for copy-paste reuse across projects where each client has:
- Separate backend deployment
- Separate database
- Separate frontend

It is intentionally **not** SaaS and **not** multi-tenant.

## Tech Stack

- Node.js
- Express.js
- MySQL
- Sequelize ORM
- JWT authentication
- Swagger (OpenAPI) documentation
- Joi validation

## Architecture

This project follows clean modular architecture with strict layer boundaries:

`Route -> Controller -> Service -> Repository -> Sequelize Model`

### Design Principles Applied

- MVC (feature modules)
- Service Layer Pattern
- Repository Pattern
- RBAC (Role Based Access Control)
- Thin controllers
- Reusable middleware
- Centralized error handling
- Migration-first database workflow (no `sequelize.sync()`)

## Folder Structure

```text
.
|-- .env.example
|-- .sequelizerc
|-- package.json
|-- README.md
`-- src
    |-- app.js
    |-- server.js
    |-- config
    |   `-- env.js
    |-- constants
    |   |-- permissions.js
    |   `-- roles.js
    |-- core
    |   |-- errors
    |   |   `-- ApiError.js
    |   `-- http
    |       `-- response.js
    |-- database
    |   |-- config
    |   |   `-- config.js
    |   |-- migrations
    |   |   |-- 20260518000100-create-roles.js
    |   |   |-- 20260518000200-create-permissions.js
    |   |   |-- 20260518000300-create-role-permissions.js
    |   |   |-- 20260518000400-create-users.js
    |   |   `-- 20260518000500-create-products.js
    |   |-- models
    |   |   `-- index.js
    |   |-- seeders
    |   |   |-- 20260518000600-seed-rbac.js
    |   |   |-- 20260518000700-seed-users.js
    |   |   `-- 20260518000800-seed-products.js
    |   `-- sequelize.js
    |-- middleware
    |   |-- auth.middleware.js
    |   |-- error.middleware.js
    |   |-- notFound.middleware.js
    |   |-- permission.middleware.js
    |   `-- validate.middleware.js
    |-- modules
    |   |-- auth
    |   |   |-- controllers
    |   |   |   `-- auth.controller.js
    |   |   |-- models
    |   |   |   `-- user.model.js
    |   |   |-- repositories
    |   |   |   `-- user.repository.js
    |   |   |-- routes
    |   |   |   `-- auth.routes.js
    |   |   |-- services
    |   |   |   `-- auth.service.js
    |   |   `-- validators
    |   |       `-- auth.validator.js
    |   |-- product
    |   |   |-- controllers
    |   |   |   `-- product.controller.js
    |   |   |-- models
    |   |   |   `-- product.model.js
    |   |   |-- repositories
    |   |   |   `-- product.repository.js
    |   |   |-- routes
    |   |   |   `-- product.routes.js
    |   |   |-- services
    |   |   |   `-- product.service.js
    |   |   `-- validators
    |   |       `-- product.validator.js
    |   `-- rbac
    |       |-- index.js
    |       |-- models
    |       |   |-- permission.model.js
    |       |   |-- role.model.js
    |       |   `-- rolePermission.model.js
    |       |-- repositories
    |       |   `-- rbac.repository.js
    |       `-- services
    |           `-- rbac.service.js
    |-- routes
    |   `-- index.js
    |-- swagger
    |   `-- swagger.js
    `-- utils
        |-- asyncHandler.js
        |-- jwt.js
        `-- pagination.js
```

## Database Schema (Migration-Only)

Tables:

1. `roles`
- `id` (PK)
- `name` (unique)
- `created_at`, `updated_at`

2. `permissions`
- `id` (PK)
- `key` (unique)
- `description`
- `created_at`, `updated_at`

3. `role_permissions`
- `id` (PK)
- `role_id` (FK -> roles.id)
- `permission_id` (FK -> permissions.id)
- unique composite index (`role_id`, `permission_id`)
- `created_at`, `updated_at`

4. `users`
- `id` (PK)
- `full_name`
- `email` (unique)
- `password_hash`
- `role_id` (FK -> roles.id)
- `created_at`, `updated_at`

5. `products`
- `id` (PK)
- `title`
- `slug` (unique)
- `description`
- `sku` (unique)
- `price`
- `stock`
- `status` (`active` | `inactive`)
- `thumbnail`
- `created_at`, `updated_at`

Associations:
- Role `1:N` Users
- Role `N:M` Permissions (through role_permissions)
- Product is standalone for Phase 1

## RBAC Matrix

Roles:
- `developer`
- `super_admin`
- `admin`
- `customer`

Permissions:
- `admin.manage`
- `product.create`
- `product.update`
- `product.delete`
- `product.read`

Access mapping:
- `developer` -> `*` (full access)
- `super_admin` -> `admin.manage`, `product.create`, `product.update`, `product.delete`, `product.read`
- `admin` -> `product.create`, `product.update`, `product.delete`, `product.read`
- `customer` -> `product.read`

## Authentication

### Implemented

- `POST /api/v1/auth/login`
- `POST /api/v1/admin` (admin panel login: admin, super_admin)
- `POST /api/v1/developer` (developer panel login: developer)
- `POST /api/v1/auth/refresh-token`
- JWT access + refresh token generation
- Password hashing via bcrypt
- Access token middleware: `auth()`
- Permission middleware: `can(permission)`

### Flow

1. Login with email/password.
2. Receive `accessToken` + `refreshToken`.
3. Use access token in `Authorization: Bearer <token>`.
4. Use refresh endpoint when access token expires.

Refresh token architecture is prepared in a scalable way (separate token utilities and refresh endpoint) and can be extended with token persistence/rotation tables in next phases.

## Product Module APIs

All product routes are protected by `auth()` and RBAC via `can(...)`.

- `POST /api/v1/products` -> `product.create`
- `GET /api/v1/products` -> `product.read`
- `GET /api/v1/products/:id` -> `product.read`
- `PUT /api/v1/products/:id` -> `product.update`
- `DELETE /api/v1/products/:id` -> `product.delete`

### Query Features (Frontend Ready)

- Pagination: `GET /api/v1/products?page=1&limit=10`
- Search: `GET /api/v1/products?search=iphone`
- Filter: `GET /api/v1/products?status=active`
- Sort: `GET /api/v1/products?sort=price_desc`

Supported sort format:
- `price_asc`, `price_desc`
- `stock_asc`, `stock_desc`
- `title_asc`, `title_desc`
- `createdAt_asc`, `createdAt_desc`

## Swagger Documentation

- URL: `/api-docs`
- Includes:
  - Auth APIs
  - Product APIs
  - Request/response examples
  - JWT bearer security schema
  - Role-based access descriptions per endpoint

## API Response Format

Success:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "...",
  "errors": []
}
```

## Security

- `helmet`
- `cors`
- `express-rate-limit`
- `bcryptjs` password hashing
- JWT expiration configuration
- `.env` driven secrets and runtime config

## Setup Instructions

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and update values:
- DB credentials
- JWT secrets
- port and rate-limit settings

3. Create MySQL database (example):

```sql
CREATE DATABASE ecommerce_starter;
```

4. Run migrations:

```bash
npm run db:migrate
```

5. Seed initial data:

```bash
npm run db:seed
```

6. Start development server:

```bash
npm run dev
```

7. Open API docs:
- `http://localhost:5000/api-docs`

## Seeder Test Accounts

Default seeded password for all users:
- `Password@123`

Accounts:
- `developer@starter.local`
- `superadmin@starter.local`
- `admin@starter.local`
- `customer@starter.local`

## Scripts

- `npm run dev` -> Run server in watch mode
- `npm start` -> Run server
- `npm run db:migrate` -> Run migrations
- `npm run db:migrate:undo` -> Undo last migration
- `npm run db:seed` -> Run all seeders
- `npm run db:seed:undo` -> Undo all seeders

## Notes for Next Phases

Recommended Phase 2 additions:
- Refresh token persistence and rotation table
- Logout + token revocation
- Admin management module (`admin.manage` usage)
- Category and inventory modules
- Orders, carts, payments, shipping modules
- Unit and integration tests (Jest + Supertest)
- Audit logs and observability
