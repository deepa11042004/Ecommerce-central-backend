# Reusable Ecommerce Backend Starter (Generalized Product Engine)

Production-grade reusable ecommerce backend template for per-client deployments.

This backend is intentionally not SaaS and not multi-tenant.
Each ecommerce client runs:
- separate deployment
- separate backend
- separate database

## Tech Stack

- Node.js
- Express.js
- MySQL
- Sequelize ORM
- JWT authentication
- Swagger (OpenAPI)
- Joi validation

## Architecture

Strict flow per module:

Route -> Controller -> Service -> Repository -> Sequelize Model

Applied patterns:
- MVC (modular by domain)
- Service Layer Pattern
- Repository Pattern
- RBAC
- Migration-first DB workflow
- Thin controllers
- Centralized error + response handling

## Product Engine Goals

The product module is fully generalized and product-type agnostic.
No schema depends on domain-specific fields.

Supported out of the box:
- simple products
- configurable products
- variant products
- dynamic attributes and values
- optional combinations
- variant-level pricing
- variant-level inventory
- variant media
- extensible metadata
- many-to-many category assignment
- generalized search/filter/sort/pagination

## Cart and Wishlist Engine

The backend now includes reusable cart and wishlist modules designed for any ecommerce niche.

Core behaviors:
- guest cart and guest wishlist persistence through backend-managed `guestId`
- authenticated customer cart and wishlist persistence by `user_id`
- automatic guest-to-user merge on customer login
- manual merge endpoints for explicit client sync flows
- variant-aware item identity using `product_id + variant_id`
- quantity merge for duplicate cart lines
- duplicate prevention for wishlist lines
- live stock and latest-price drift flags on cart reads
- transaction-safe merge and mutation flows

Guest identity strategy:
- backend generates a UUID-based `guestId`
- guest identity is stored in a cookie by default
- clients may also forward the same identity in the `x-guest-id` header
- after customer login, guest cart and wishlist are merged into the user account and the guest cookie is cleared

## Database Design (Why Each Table Exists)

1. roles
- RBAC role master table.

2. permissions
- permission catalog for fine-grained access control.

3. role_permissions
- role-permission many-to-many mapping.

4. users
- authenticated users with role assignment.

5. brands
- optional reusable brand entity (not product-type specific).

6. products
- base product entity only.
- holds generic product identity and content fields.
- does not store sellable unit inventory/pricing directly.

7. categories
- reusable nested taxonomy with parent-child relation.
- supports unlimited depth.

8. product_categories
- product-category many-to-many mapping.
- allows multi-category assignment.

9. attributes
- global dynamic attribute definitions (Color, Size, Voltage, etc.).

10. attribute_values
- dynamic values per attribute (Red, XL, 220V, etc.).

11. product_attributes
- links which attributes are enabled for a product.
- marks required/variant-axis behavior per product.

12. product_variants
- actual sellable units (SKU, pricing, status, image, barcode).

13. inventory
- inventory separated from variant for scalability and extensibility.

14. variant_attribute_values
- dynamic combination mapping for each variant.

15. product_media
- reusable product and optional variant-level media.

16. product_meta
- generic extensibility key-value store for future needs without migrations.

17. wishlists
- owner container for guest or authenticated customer wishlist state.

18. wishlist_items
- unique wishlist entries per product or product variant.

19. carts
- owner container for guest or authenticated customer cart state.

20. cart_items
- quantity-bearing cart lines with stored unit price snapshots.

## Core Product Fields

products table contains:
- id
- title
- slug
- description
- short_description
- sku_prefix
- brand_id
- product_type
- status
- thumbnail
- seo_title
- seo_description
- created_at
- updated_at

## RBAC

Roles:
- developer
- super_admin
- admin
- customer

Permissions:
- admin.manage
- product.create
- product.update
- product.delete
- product.read

Middleware:
- auth()
- can(permission)

## API Endpoints

Base prefix: /api/v1

Auth:
- POST /auth/register
- POST /auth/login
- POST /auth/admin
- POST /auth/developer
- POST /auth/refresh-token

Cart:
- GET /cart
- POST /cart/items
- PATCH /cart/items/:id
- DELETE /cart/items/:id
- DELETE /cart/clear
- POST /cart/merge

Wishlist:
- GET /wishlist
- POST /wishlist/items
- DELETE /wishlist/items/:id
- POST /wishlist/merge

Products:
- POST /products
- POST /products/:id/variant-combinations/preview
- POST /products/:id/variants
- POST /products/:id/variant-resolve
- GET /products
- GET /products/search
- GET /products/:id
- PUT /products/:id
- DELETE /products/:id

Categories:
- GET /categories/tree

## Generalized Querying

Examples:

- Pagination:
  GET /api/v1/products?page=1&limit=20

- Search:
  GET /api/v1/products?search=wireless

- Sort:
  GET /api/v1/products?sort=price_desc

- Status filter:
  GET /api/v1/products?status=active

- Category slug filter:
  GET /api/v1/products?category=electronics

- Dynamic attribute filter:
  GET /api/v1/products?attribute=color:red
  GET /api/v1/products?attribute=color:red&attribute=storage:256gb

## Product Creation Flow

Stage 1: Create base product and dynamic attributes.

POST /api/v1/products

Example payload (base + attributes, no persisted variants yet):

```json
{
  "title": "Generic Product",
  "description": "Reusable catalog item",
  "shortDescription": "Short summary",
  "skuPrefix": "GP",
  "productType": "variant",
  "status": "active",
  "categoryIds": [1, 2],
  "attributes": [
    {
      "name": "Color",
      "values": ["Red", "Blue"],
      "isVariantAxis": true,
      "isRequired": true
    },
    {
      "name": "Storage",
      "values": ["128GB", "256GB"],
      "isVariantAxis": true,
      "isRequired": true
    }
  ],
  "media": [
    {
      "url": "https://cdn.example.com/products/generic-main.jpg",
      "mediaType": "image",
      "altText": "Main image"
    }
  ],
  "meta": {
    "customKey1": "value",
    "customKey2": "value"
  }
}
```

Stage 2: Preview generated combinations (not persisted).

POST /api/v1/products/:id/variant-combinations/preview

```json
{
  "maxCombinations": 500,
  "onlyMissing": true
}
```

Stage 3: Save only selected sellable variants.

POST /api/v1/products/:id/variants

```json
{
  "replaceExisting": true,
  "variants": [
    {
      "sku": "GP-RED-128",
      "price": 1100,
      "salePrice": 1000,
      "stock": 10,
      "attributeValues": ["color:red", "storage:128gb"]
    }
  ]
}
```

Stage 4: Resolve exact variant for user attribute selection.

POST /api/v1/products/:id/variant-resolve

```json
{
  "attributeValues": ["color:red", "storage:128gb"]
}
```

This keeps the system scalable:
- combinations are generated in memory
- only real sellable variants are persisted
- variant SKU/price/stock stay inventory-accurate

## Category Tree Logic

GET /api/v1/categories/tree:
- reads all categories
- builds in-memory parent-child map
- returns nested tree with unlimited depth
- supports optional status filter

## Guest Merge Flow

1. Anonymous shopper hits any cart or wishlist endpoint.
2. Backend assigns a `guestId` and persists guest state in MySQL.
3. Shopper logs in with `POST /api/v1/auth/login`.
4. Auth service merges guest cart and guest wishlist into the customer account inside a transaction.
5. Subsequent reads on any device use the user-owned cart and wishlist records.

Cart rules:
- add/update validates product existence, active status, variant validity, quantity, stock, and current price
- cart lines store `unit_price` snapshots
- `GET /cart` also returns `latestPrice`, `priceChanged`, and `outOfStock`

Wishlist rules:
- add validates product and variant state
- duplicates are ignored
- merge keeps unique entries only

## Swagger

- URL: /api-docs
- Includes:
  - auth APIs
  - cart APIs
  - wishlist APIs
  - product APIs
  - category API
  - attribute structures
  - variant structures
  - JWT bearer auth
  - guest identity header/cookie flow
  - request/response examples
  - role/permission descriptions

## Setup Guide

1. Install dependencies

```bash
npm install
```

2. Configure environment
- copy .env.example to .env
- update DB, JWT, runtime settings, and `DEFAULT_CURRENCY` if needed

3. Create database

```sql
CREATE DATABASE ecommerce_starter;
```

4. Run migrations (migration-first, no sequelize.sync)

```bash
npm run db:migrate
```

5. Seed initial data

```bash
npm run db:seed
```

6. Start server

```bash
npm run dev
```

7. Open docs
- http://localhost:5000/api-docs

## Scripts

- npm run dev
- npm start
- npm run db:migrate
- npm run db:migrate:undo
- npm run db:seed
- npm run db:seed:undo
