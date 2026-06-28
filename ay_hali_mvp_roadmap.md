# Ay Halı Digital Showroom — MVP Roadmap

## 1. Project Overview

Ay Halı Digital Showroom is a local-first carpet shop website for a carpet business in Zonguldak, Turkey. The MVP version is designed as a digital product catalog and sales funnel rather than a full e-commerce system.

The first version should allow customers to discover the shop online, browse carpets, filter products, view product details, and contact the shop through WhatsApp for purchase inquiries.

The system should be built in a payment-ready way so that shopping cart, checkout, online payment, and order management can be added later without rewriting the whole project.

---

## 2. Tech Stack

### Backend

- ASP.NET Core Web API
- Entity Framework Core
- SQL Server
- JWT Authentication
- Swagger / OpenAPI
- FluentValidation or manual validation
- Optional: AutoMapper

### Frontend

- React
- React Router
- Axios
- Tailwind CSS
- React Hook Form
- Zod or Yup for validation
- TanStack Query for API state management

### Database

- SQL Server

### Image Storage for MVP

Start with local image upload under:

```text
wwwroot/uploads/products
```

Later, this can be migrated to:

- Azure Blob Storage
- Cloudinary
- AWS S3
- Supabase Storage

---

## 3. MVP Goal

The MVP should provide a digital showroom experience.

Customers should be able to:

1. Visit the website.
2. Browse available carpet models.
3. Filter carpets by category, size, color, style, material, price, discount status, and availability.
4. Open a product detail page.
5. View product images and details.
6. Click a WhatsApp button to ask about the exact product.
7. Find the shop address, phone number, Instagram account, and Google Maps location.

Admins should be able to:

1. Log in.
2. Add products.
3. Edit products.
4. Delete products.
5. Upload product images.
6. Mark products as available, sold out, featured, or discounted.
7. Manage product attributes such as category, size, color, style, and material.

---

## 4. MVP Scope

### Included in MVP

#### Public Website

- Home page
- Product listing page
- Product detail page
- Campaigns / discounted products page
- About page
- Contact page
- WhatsApp inquiry button
- Google Maps embed or directions link
- Instagram link
- Responsive mobile-first design

#### Admin Panel

- Admin login
- Admin dashboard
- Product management table
- Add product form
- Edit product form
- Delete product function
- Product image upload
- Attribute management for categories, colors, sizes, styles, and materials

#### Backend

- Product CRUD API
- Category CRUD API
- Color CRUD API
- Size CRUD API
- Style CRUD API
- Material CRUD API
- Admin authentication API
- Image upload API
- Filtering, search, sorting, and pagination for products

---

### Excluded from MVP

These features should be postponed until after the MVP is live:

- Online payment
- Shopping cart
- Customer accounts
- Order tracking
- AI room preview
- Automatic invoice creation
- Advanced analytics dashboard
- Marketplace integrations
- Email notifications
- SMS notifications
- Full WhatsApp Business API automation

---

## 5. Product Positioning

The website should be positioned as:

> Zonguldak's digital carpet showroom. Customers can browse carpet models before visiting the store and contact the shop directly through WhatsApp.

Suggested public-facing Turkish positioning:

```text
Zonguldak’ta kaliteli ve şık halı modelleri.
Salon, yolluk, çocuk odası ve modern halı çeşitlerini mağazamıza gelmeden inceleyin.
```

Suggested buttons:

```text
Modelleri İncele
WhatsApp’tan Yaz
Yol Tarifi Al
```

---

## 6. Database Design

The database should be designed to support the MVP now and e-commerce/payment features later.

### 6.1 Products Table

```sql
Products
- Id int primary key identity
- Name nvarchar(200) not null
- Code nvarchar(100) not null unique
- Description nvarchar(max) null
- CategoryId int not null
- StyleId int null
- MaterialId int null
- Price decimal(18,2) not null
- DiscountPrice decimal(18,2) null
- IsDiscounted bit not null default 0
- IsAvailable bit not null default 1
- IsFeatured bit not null default 0
- CreatedAt datetime2 not null
- UpdatedAt datetime2 null
```

### 6.2 ProductImages Table

```sql
ProductImages
- Id int primary key identity
- ProductId int not null
- ImageUrl nvarchar(500) not null
- IsMainImage bit not null default 0
- DisplayOrder int not null default 0
```

### 6.3 Categories Table

```sql
Categories
- Id int primary key identity
- Name nvarchar(100) not null
```

Example categories:

```text
Salon Halısı
Yolluk
Çocuk Odası Halısı
Mutfak Halısı
Klasik Halı
Modern Halı
```

### 6.4 Sizes Table

```sql
Sizes
- Id int primary key identity
- Name nvarchar(50) not null
```

Example sizes:

```text
80x150
120x180
160x230
200x300
```

### 6.5 ProductSizes Table

```sql
ProductSizes
- ProductId int not null
- SizeId int not null
- StockQuantity int not null default 0
```

This table allows one carpet model to have multiple available sizes.

### 6.6 Colors Table

```sql
Colors
- Id int primary key identity
- Name nvarchar(100) not null
```

Example colors:

```text
Bej
Gri
Krem
Lacivert
Kahverengi
Yeşil
Siyah
```

### 6.7 ProductColors Table

```sql
ProductColors
- ProductId int not null
- ColorId int not null
```

### 6.8 Styles Table

```sql
Styles
- Id int primary key identity
- Name nvarchar(100) not null
```

Example styles:

```text
Modern
Klasik
Minimal
Vintage
Bohem
Çeyizlik
```

### 6.9 Materials Table

```sql
Materials
- Id int primary key identity
- Name nvarchar(100) not null
```

Example materials:

```text
Akrilik
Yün
Polyester
Bambu
Viskon
Pamuk
```

### 6.10 AdminUsers Table

```sql
AdminUsers
- Id int primary key identity
- Email nvarchar(200) not null unique
- PasswordHash nvarchar(max) not null
- Role nvarchar(50) not null default 'Admin'
- CreatedAt datetime2 not null
```

### 6.11 Inquiries Table — Optional for MVP

This table can track WhatsApp interest clicks or customer inquiries.

```sql
Inquiries
- Id int primary key identity
- ProductId int not null
- CustomerName nvarchar(150) null
- CustomerPhone nvarchar(50) null
- Message nvarchar(max) null
- Source nvarchar(100) null
- CreatedAt datetime2 not null
```

For the first MVP, it is acceptable to only track:

```text
ProductId
ClickedAt
Source
```

---

## 7. Backend Architecture

Suggested backend folder structure:

```text
AyHali.Api
│
├── Controllers
│   ├── ProductsController.cs
│   ├── CategoriesController.cs
│   ├── ColorsController.cs
│   ├── SizesController.cs
│   ├── MaterialsController.cs
│   ├── StylesController.cs
│   └── AuthController.cs
│
├── Data
│   ├── AppDbContext.cs
│   └── SeedData.cs
│
├── Entities
│   ├── Product.cs
│   ├── ProductImage.cs
│   ├── Category.cs
│   ├── Color.cs
│   ├── Size.cs
│   ├── Style.cs
│   ├── Material.cs
│   ├── ProductSize.cs
│   ├── ProductColor.cs
│   └── AdminUser.cs
│
├── DTOs
│   ├── ProductListDto.cs
│   ├── ProductDetailDto.cs
│   ├── CreateProductDto.cs
│   ├── UpdateProductDto.cs
│   ├── LoginDto.cs
│   └── AuthResponseDto.cs
│
├── Services
│   ├── ProductService.cs
│   ├── ImageService.cs
│   └── AuthService.cs
│
├── Helpers
│   ├── JwtHelper.cs
│   ├── PaginationParams.cs
│   └── QueryParams.cs
│
└── Program.cs
```

For the MVP, a clean service-based architecture is enough. A repository pattern is optional.

---

## 8. Backend API Requirements

### 8.1 Product Endpoints

#### Get products

```http
GET /api/products
```

Should support:

```http
GET /api/products?categoryId=1&colorId=2&sizeId=3&styleId=1&materialId=2&minPrice=1000&maxPrice=10000&isDiscounted=true&isAvailable=true&search=bej&page=1&pageSize=12&sortBy=newest
```

Supported filters:

- categoryId
- colorId
- sizeId
- styleId
- materialId
- minPrice
- maxPrice
- isDiscounted
- isAvailable
- isFeatured
- search

Supported sorting:

- newest
- priceAsc
- priceDesc
- discounted
- featured

Supported pagination:

- page
- pageSize

#### Get product by id

```http
GET /api/products/{id}
```

#### Create product — admin only

```http
POST /api/products
```

#### Update product — admin only

```http
PUT /api/products/{id}
```

#### Delete product — admin only

```http
DELETE /api/products/{id}
```

#### Upload product image — admin only

```http
POST /api/products/{id}/images
```

#### Delete product image — admin only

```http
DELETE /api/products/{productId}/images/{imageId}
```

---

### 8.2 Attribute Endpoints

Each attribute should support public GET and admin-only create/update/delete.

#### Categories

```http
GET /api/categories
POST /api/categories
PUT /api/categories/{id}
DELETE /api/categories/{id}
```

#### Colors

```http
GET /api/colors
POST /api/colors
PUT /api/colors/{id}
DELETE /api/colors/{id}
```

#### Sizes

```http
GET /api/sizes
POST /api/sizes
PUT /api/sizes/{id}
DELETE /api/sizes/{id}
```

#### Styles

```http
GET /api/styles
POST /api/styles
PUT /api/styles/{id}
DELETE /api/styles/{id}
```

#### Materials

```http
GET /api/materials
POST /api/materials
PUT /api/materials/{id}
DELETE /api/materials/{id}
```

---

### 8.3 Auth Endpoints

#### Admin login

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "admin@ayhali.com",
  "password": "password"
}
```

Response:

```json
{
  "token": "jwt-token-here",
  "email": "admin@ayhali.com",
  "role": "Admin"
}
```

---

## 9. API Response Examples

### 9.1 Product List Response

```json
{
  "items": [
    {
      "id": 1,
      "name": "Modern Bej Salon Halısı",
      "code": "AH-1024",
      "price": 8500,
      "discountPrice": 7200,
      "isDiscounted": true,
      "isAvailable": true,
      "mainImageUrl": "/uploads/products/ah-1024-main.jpg",
      "category": "Salon Halısı",
      "colors": ["Bej", "Krem"],
      "sizes": ["160x230", "200x300"]
    }
  ],
  "page": 1,
  "pageSize": 12,
  "totalCount": 64
}
```

### 9.2 Product Detail Response

```json
{
  "id": 1,
  "name": "Modern Bej Salon Halısı",
  "code": "AH-1024",
  "description": "Modern salon dekorasyonuna uygun, yumuşak dokulu bej halı.",
  "price": 8500,
  "discountPrice": 7200,
  "isDiscounted": true,
  "isAvailable": true,
  "category": "Salon Halısı",
  "style": "Modern",
  "material": "Akrilik",
  "colors": ["Bej", "Krem"],
  "sizes": [
    {
      "name": "160x230",
      "stockQuantity": 2
    },
    {
      "name": "200x300",
      "stockQuantity": 1
    }
  ],
  "images": [
    {
      "url": "/uploads/products/ah-1024-main.jpg",
      "isMainImage": true
    },
    {
      "url": "/uploads/products/ah-1024-detail.jpg",
      "isMainImage": false
    }
  ]
}
```

---

## 10. Frontend Architecture

Suggested React folder structure:

```text
ayhali-client
│
├── src
│   ├── api
│   │   ├── axiosClient.js
│   │   ├── productApi.js
│   │   ├── authApi.js
│   │   └── attributeApi.js
│   │
│   ├── components
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── ProductCard.jsx
│   │   ├── ProductFilters.jsx
│   │   ├── WhatsAppButton.jsx
│   │   ├── ImageGallery.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── EmptyState.jsx
│   │
│   ├── pages
│   │   ├── Home.jsx
│   │   ├── Products.jsx
│   │   ├── ProductDetail.jsx
│   │   ├── Campaigns.jsx
│   │   ├── About.jsx
│   │   ├── Contact.jsx
│   │   └── NotFound.jsx
│   │
│   ├── admin
│   │   ├── AdminLogin.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── ProductManagement.jsx
│   │   ├── AddProduct.jsx
│   │   ├── EditProduct.jsx
│   │   └── AttributeManagement.jsx
│   │
│   ├── hooks
│   │   ├── useProducts.js
│   │   ├── useProduct.js
│   │   ├── useAuth.js
│   │   └── useAttributes.js
│   │
│   ├── utils
│   │   ├── whatsapp.js
│   │   ├── formatPrice.js
│   │   └── slugify.js
│   │
│   ├── App.jsx
│   └── main.jsx
```

---

## 11. Frontend Pages

### 11.1 Home Page

Purpose: make the shop look trustworthy, local, and visually appealing.

Sections:

- Hero section
- Featured carpets
- Discounted products
- Why choose us?
- Shop location
- Instagram and WhatsApp buttons

Hero copy example:

```text
Zonguldak’ta kaliteli ve şık halı modelleri
Salon, yolluk, çocuk odası ve modern halı çeşitlerini mağazamıza gelmeden inceleyin.
```

### 11.2 Product Listing Page

This is the most important customer-facing page.

Features:

- Product grid
- Search bar
- Category filter
- Color filter
- Size filter
- Style filter
- Material filter
- Price range filter
- Discounted-only toggle
- Available-only toggle
- Sorting
- Pagination

Product card should display:

- Main image
- Name
- Product code
- Price
- Discount price if available
- Available or sold out status
- WhatsApp inquiry button

### 11.3 Product Detail Page

Features:

- Image gallery
- Product name
- Product code
- Description
- Price
- Discount price
- Available sizes
- Colors
- Material
- Style
- Availability
- WhatsApp inquiry button
- Share button
- Similar products

WhatsApp message example:

```text
Merhaba, web sitenizde gördüğüm AH-1024 kodlu Modern Bej Salon Halısı hakkında bilgi almak istiyorum.
```

WhatsApp URL format:

```text
https://wa.me/90XXXXXXXXXX?text=Merhaba...
```

### 11.4 Campaigns Page

Show products where:

```text
IsDiscounted = true
```

Possible campaign headings:

```text
Yeni sezon ürünleri
Çeyizlik halı fırsatları
Salon halılarında indirim
Yolluk kampanyası
```

### 11.5 About Page

Content should mention:

- Family business
- Zonguldak location
- Years of experience
- Product quality
- Customer satisfaction

### 11.6 Contact Page

Should include:

- Address
- Phone number
- WhatsApp button
- Instagram link
- Working hours
- Google Maps embed
- Get directions button

---

## 12. Admin Panel Pages

### 12.1 Admin Login

Fields:

- Email
- Password
- Login button

After login, store the JWT token.

For MVP development, localStorage is acceptable. For production, consider a more secure auth strategy.

### 12.2 Admin Dashboard

Show basic stats:

- Total products
- Available products
- Sold out products
- Discounted products
- Featured products

Optional:

- Most clicked products
- Latest added products

### 12.3 Product Management

A table with:

- Product image
- Name
- Code
- Category
- Price
- Availability
- Discount status
- Featured status
- Edit button
- Delete button

Admin actions:

- Add new product
- Edit product
- Delete product
- Mark as sold out
- Mark as featured
- Mark as discounted

### 12.4 Add/Edit Product Form

Fields:

- Name
- Code
- Description
- Category
- Style
- Material
- Colors
- Sizes
- Stock quantity per size
- Price
- Discount price
- Is available
- Is discounted
- Is featured
- Images

Use React Hook Form for form state management.

---

## 13. WhatsApp Sales Flow

The website should not just display products. It should turn browsing into sales conversations.

Each product should include a WhatsApp button.

Example generated message:

```text
Merhaba, Ay Halı web sitenizde gördüğüm AH-1024 kodlu Modern Bej Salon Halısı hakkında bilgi almak istiyorum.
```

Utility function idea:

```javascript
export function createWhatsAppLink(phoneNumber, product) {
  const message = `Merhaba, Ay Halı web sitenizde gördüğüm ${product.code} kodlu ${product.name} hakkında bilgi almak istiyorum.`;
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}
```

---

## 14. UI and Design Direction

The design should feel:

- Clean
- Warm
- Local
- Trustworthy
- Premium but simple
- Mobile-first

Suggested colors:

- Cream
- Beige
- Brown
- Dark green
- Gold accent
- White background

Important design notes:

- Product photos should be large and clear.
- Filters should be easy to use on mobile.
- WhatsApp and directions buttons should be visible.
- Avoid making the site look like a generic software demo.
- The site should feel like a real carpet showroom.

---

## 15. Development Roadmap

### Week 1 — Backend Foundation

Tasks:

- Create ASP.NET Core Web API project.
- Connect SQL Server.
- Install Entity Framework Core.
- Create entities.
- Create DbContext.
- Create migrations.
- Create database.
- Seed categories, colors, sizes, styles, and materials.
- Set up Swagger.

Deliverable:

> Database and API foundation are ready.

---

### Week 2 — Product APIs

Tasks:

- Create Product entity relationships.
- Create Product DTOs.
- Create product CRUD endpoints.
- Add filtering.
- Add search.
- Add pagination.
- Add sorting.
- Add image upload.
- Test endpoints with Swagger or Postman.

Deliverable:

> Products can be added, listed, filtered, viewed in detail, edited, deleted, and assigned images.

---

### Week 3 — React Public Website

Tasks:

- Create React project.
- Set up routing.
- Create layout, navbar, and footer.
- Create home page.
- Create product listing page.
- Create product detail page.
- Connect React to backend API.
- Add filters.
- Add search.
- Add WhatsApp button.
- Add contact page.

Deliverable:

> Customers can browse products and contact the shop through WhatsApp.

---

### Week 4 — Admin Panel

Tasks:

- Create admin login page.
- Create JWT auth backend.
- Protect admin endpoints.
- Create admin dashboard.
- Create product management table.
- Create add product form.
- Create edit product form.
- Create image upload UI.
- Create delete product function.

Deliverable:

> Shop owner/admin can manage products without touching code.

---

### Week 5 — Polish and Launch Preparation

Tasks:

- Improve mobile design.
- Optimize images.
- Add loading states.
- Add error messages.
- Add SEO titles and descriptions.
- Add Google Maps embed.
- Add Google Business Profile link.
- Test WhatsApp links.
- Deploy backend.
- Deploy frontend.
- Buy and connect domain.

Deliverable:

> MVP is ready to launch publicly.

---

## 16. MVP Acceptance Criteria

The MVP is complete when:

### Customer Side

- User can open the website on desktop and mobile.
- User can view the homepage.
- User can browse products.
- User can filter products.
- User can search products.
- User can open a product detail page.
- User can see product images, price, size, color, style, material, and availability.
- User can click a WhatsApp button that includes the selected product information.
- User can access the contact page.
- User can open Google Maps directions.

### Admin Side

- Admin can log in.
- Admin can add a product.
- Admin can edit a product.
- Admin can delete a product.
- Admin can upload product images.
- Admin can mark a product as sold out.
- Admin can mark a product as discounted.
- Admin can mark a product as featured.

### Backend

- Product API works with filtering, sorting, search, and pagination.
- Admin endpoints are protected.
- Images can be uploaded and displayed.
- SQL Server database is correctly connected.
- Swagger is available for testing.

---

## 17. Future Payment-Ready Expansion

The MVP should be designed so that payment features can be added later.

Future features:

### 17.1 Cart

```text
Cart
- Add to cart
- Remove from cart
- Update quantity
- Cart total
```

### 17.2 Customer Information

```text
Customer
- Full name
- Phone
- Email
- Address
- City
- District
```

### 17.3 Orders

```sql
Orders
- Id
- CustomerName
- CustomerPhone
- CustomerEmail
- Address
- TotalPrice
- PaymentStatus
- DeliveryStatus
- CreatedAt
```

### 17.4 Order Items

```sql
OrderItems
- Id
- OrderId
- ProductId
- Quantity
- Size
- PriceAtPurchase
```

### 17.5 Payment Providers for Turkey

Possible providers:

- iyzico
- PayTR
- Shopier

### 17.6 Order Management

Possible statuses:

```text
Pending
Paid
Preparing
Shipped
Delivered
Cancelled
Refunded
```

---

## 18. Future Feature Ideas After MVP

Add these after the first public version:

1. Shopping cart
2. Online card payment
3. Order management dashboard
4. Customer accounts
5. Favorite products
6. Recently viewed products
7. AI room preview tool
8. SEO blog
9. Product recommendation system
10. Google Analytics dashboard
11. Instagram catalog integration
12. Marketplace export for Trendyol / Hepsiburada / n11
13. WhatsApp Business API chatbot

---

## 19. SEO Roadmap

The MVP should include basic SEO from the start.

Important pages:

```text
/zonguldak-hali-magazasi
/salon-halisi-zonguldak
/yolluk-hali-zonguldak
/modern-hali-modelleri
/cocuk-odasi-halisi
/ceyizlik-hali-paketleri
```

Recommended blog topics later:

```text
Salon halısı nasıl seçilir?
Zonguldak’ta halı alırken nelere dikkat edilmeli?
Modern halı mı klasik halı mı?
Çeyizlik halı alışveriş rehberi
Yolluk halı ölçüsü nasıl alınır?
Halı rengi koltukla nasıl uyumlu seçilir?
```

---

## 20. MVP Success Metrics

Track these after launch:

- Website visitors
- Product page views
- Most viewed products
- WhatsApp button clicks
- Direction button clicks
- Instagram clicks
- Most searched product terms
- Most used filters
- Discounted product clicks

For MVP, simple tracking with Google Analytics and optional backend inquiry records is enough.

---

## 21. Agent Coding Notes

When passing this file to a coding agent, the agent should prioritize the following build order:

1. Set up backend project.
2. Create database schema.
3. Implement entities and DbContext.
4. Add seed data.
5. Implement product APIs.
6. Implement attribute APIs.
7. Implement image upload.
8. Implement admin authentication.
9. Build React public pages.
10. Build React admin panel.
11. Connect frontend to backend.
12. Polish UI.
13. Test full user flow.
14. Prepare deployment.

The agent should not start with payment, cart, or AI features. Those are future phases.

---

## 22. Final MVP Definition

The MVP is:

> A digital carpet showroom with product catalog, filters, admin panel, image upload, local SEO pages, and WhatsApp sales flow.

The MVP is not:

> A full e-commerce system with payment, cart, customer accounts, and order tracking.

However, the database and backend should be structured so that the system can become a full e-commerce website later.
