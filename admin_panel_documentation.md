# Al Rehman Dawakhana | Hakeem's Portal Documentation

This document provides a comprehensive guide to the **Admin Panel** (Hakeem's Portal) for the Al Rehman Dawakhana project.

## 🏛 Overview
The Admin Panel is a secure, single-page application designed for the Hakeem (Administrator) to manage the medicinal inventory, update product pricing based on market rates, and track stock levels.

## 🚀 Key Features

### 1. Secure Authentication
- **Login Screen**: A premium, glassmorphism-inspired login interface.
- **Access Control**: Currently handles authentication via a client-side transition to ensure only authorized personnel access the medicinal records.

### 2. Product Inventory Management
- **Dynamic Table**: A fully interactive table displaying product details, categories, stock units, prices, and status.
- **Status Indicators**: Visual badges (Active, Selected) to indicate the current state of a product.
- **Real-time Search**: (UI Ready) Designed to allow quick filtering of the herbal collection.

### 3. Active Editing Dashboard
- **Product Selection**: Clicking any product in the inventory updates the central dashboard with that product's specific profile.
- **Detailed Profiles**: Displays high-quality imagery, descriptions preserved from Unani scrolls, and specific herbal components (e.g., Ashwagandha, Shilajit).
- **Price Setting**: A dedicated module for adjusting product values.

### 4. Dynamic Product Addition
- **Registration Form**: A modal-based form to register new medicinal formulations into the system.
- **Fields**: Name, Category, Initial Price, Stock, and Herbal Components.

## 🛠 Technical Implementation

### State Management
- **LocalStorage Persistence**: The application uses `localStorage` (key: `alRehmanProducts`) to store data. This allows the system to function without a backend database while maintaining data persistence across browser refreshes.
- **Automatic Seeding**: On the first launch, the system automatically seeds itself with 5 flagship products:
  1. **Safoof-e-Zayab** (Weight Management)
  2. **Kulyani Shifa** (Kidney Stones)
  3. **Majoon-e-Khas** (Vitality Tonic)
  4. **Husn-e-Yousaf** (Skin Care)
  5. **Arq-e-Gulab** (Pure Rose Water)

### UI/UX Design System
- **Framework**: Tailwind CSS for responsive and modern styling.
- **Typography**: `Cormorant Garamond` (Serif) for a traditional feel and `Inter` (Sans) for modern legibility.
- **Iconography**: Lucide Icons for clean, thin-stroke geometric symbols.
- **Aesthetics**: Emerald-based color palette (`primary: #064e3b`), gold accents, and glassmorphism cards.

## 📖 Usage Instructions

### Updating a Product Price
1. Locate the product in the **Full Product Inventory** table.
2. Click the **Edit** icon (pencil) in the actions column.
3. The **Active Editing** section will update. Enter the new price in the "Set New Price" input field.
4. Click **UPDATE PRICE**. A toast notification will appear confirming the change.

### Adding a New Product
1. Click the **+ Add Product** button in the top header.
2. Fill out the registration form in the modal.
3. Click **Register Product**. The new entry will immediately appear in the inventory table.

## 🗄 Data Schema
Each product object in the system follows this structure:
```json
{
    "id": 123456789,
    "name": "Product Name",
    "category": "Main Category",
    "subCategory": "Specific Use",
    "stock": 100,
    "price": 2500,
    "status": "Active",
    "description": "Herbal description...",
    "image": "image_url",
    "components": ["Herb A", "Herb B"]
}
```
