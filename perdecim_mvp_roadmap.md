# Perdecim Digital Showroom - MVP Roadmap

## 1. Project Overview

Perdecim is a local-first curtain shop website for a curtain business in Zonguldak, Turkey. The MVP is a digital showroom and sales funnel: customers discover the shop, browse curtain models, filter products, view product details, and find the store's contact and location details.

The system should stay payment-ready, but the MVP does not need cart, checkout, online payment, or order management.

## 2. Current Stack

### Backend

- ASP.NET Core Web API
- Entity Framework Core
- SQL Server LocalDB for development
- JWT authentication for admin flows
- Generic product, lookup, image, and inquiry model

### Frontend

- React with Vite
- Landing page plus filtered products page
- Store contact and location details
- Responsive premium showroom styling

## 3. Product Domain

Use generic product records with curtain-specific lookup data.

Primary product categories:

- Fon Perde
- Tül Perde
- Zebra Perde
- Stor Perde
- Blackout Perde
- Kruvaze Perde

Useful filter groups:

- Category
- Color
- Size
- Style
- Material
- Discount status
- Availability
- Price sorting

Typical materials:

- Keten dokulu kumaş
- Vual tül
- Karartma kumaş
- Polyester dokuma
- Pamuk karışımlı kumaş

## 4. Customer Workflow

1. Customer lands on the Perdecim landing page.
2. Customer reviews new arrivals, best sellers, and featured product.
3. Customer opens all models.
4. Customer filters by category, size, color, style, material, discount, and stock.
5. Customer opens product detail.
6. Customer uses the contact page to find the store's phone number, address, or directions.

## 5. Admin Workflow

1. Admin logs in.
2. Admin creates or updates lookup values.
3. Admin creates curtain products.
4. Admin uploads product images.
5. Admin marks products as featured, discounted, or unavailable.

## 6. Frontend Direction

The frontend should feel modern, calm, premium, and easy to use.

Design principles:

- Light clean aesthetic
- Warm white and stone surfaces
- Indigo only for primary actions and focus states
- Manrope headings and Inter body text
- Minimal animation and refined hover states
- No generic stock-like visuals
- Curtain imagery should be immediately visible in the first viewport

## 7. MVP Pages

Required:

- Landing page
- Filtered products page
- Product detail view
- Campaigns view
- Contact view

Future:

- Admin dashboard
- SEO landing pages for curtain categories
- Blog or guide pages for measuring and choosing curtains

## 8. SEO Targets

Initial local SEO pages and topics:

- Zonguldak perde mağazası
- Fon perde modelleri
- Tül perde modelleri
- Zebra perde modelleri
- Stor perde modelleri
- Blackout perde nedir?
- Perde ölçüsü nasıl alınır?
- Salon için perde nasıl seçilir?

## 9. Next Cleanup Steps

1. Add or regenerate EF migration for curtain seed changes if existing databases must be upgraded.
2. Replace placeholder product imagery with real curtain product photos.
3. Remove stale ignored build folders after any external locks are released.
