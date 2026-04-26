# Al Rehman Dawakhana | Hakeem's Portal Documentation

This document provides a comprehensive guide to the **Admin Panel** (Hakeem's Portal) for the Al Rehman Dawakhana project, now powered by **Supabase**.

## 🏛 Overview
The Admin Panel is a secure portal designed for the Hakeem to manage the medicinal inventory, update product pricing, and track stock levels in real-time.

## 🚀 Key Features

### 1. Secure Authentication (Supabase Auth)
- **Login Screen**: Uses Supabase Authentication to verify identity.
- **Admin Credentials**: 
  - **Email**: `usman@gmail.com`
  - **Password**: `03006047058`
- **Route Guard**: Unauthorized users are automatically redirected from `admin.html` back to the login screen if no active session is found.

### 2. Live Inventory Management
- **Database Driven**: All products are fetched live from the Supabase `products` table.
- **Dynamic Table**: Interactive rows displaying live prices, stock levels, and status.
- **Delete Functionality**: Admins can now permanently remove products from the database using the trash icon.

### 3. Active Editing Dashboard
- **Live Sync**: Selecting a product fetches its latest data for the editing module.
- **Price Setting**: Updates are sent via `PATCH` requests to the Supabase database and reflected instantly on the public landing page.

### 4. Dynamic Product Addition
- **Database Insertion**: New products registered via the modal are saved directly to the cloud database.

## 🛠 Technical Implementation

### Database (Supabase)
- **Table**: `public.products`
- **Security (RLS)**: 
  - **Public Read**: Anyone can see products on the landing page.
  - **Admin Access**: Only authenticated users can Create, Update, or Delete products.

### Environment Setup
- **Supabase SDK**: Integrated via CDN.
- **Initialization**: Requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## 📖 Usage Instructions

### Running Migrations
1. Open your Supabase Dashboard.
2. Go to the **SQL Editor**.
3. Copy and run the contents of `supabase_migration.sql` to set up the table and RLS policies.

### Updating a Product Price
1. Log in to the Admin Portal.
2. Select the product from the inventory table.
3. Adjust the price in the "Set New Price" field.
4. Click **UPDATE PRICE**.

### Registering a New Product
1. Click **+ Add Product** in the header.
2. Fill the form and submit. The product will sync to the database and appear on the landing page immediately.

## 🗄 Data Schema
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT,
    description TEXT,
    price NUMERIC NOT NULL,
    stock_level INT,
    image_url TEXT,
    components JSONB,
    status TEXT DEFAULT 'Active'
);
```
