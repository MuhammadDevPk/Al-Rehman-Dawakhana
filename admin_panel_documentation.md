# Al Rehman Dawakhana - Administrator Guide 🌿

Welcome to the digital management portal for Al Rehman Dawakhana. This system is now fully powered by **Supabase Cloud**, providing secure authentication, a real-time database, and cloud storage for medicinal images and payment proofs.

---

## 🔐 1. Accessing the Portal
*   **Admin Panel URL**: Open `admin.html` in your browser.
*   **Security**: Access is restricted to authorized users only. If you are not logged in, you will be automatically redirected to the secure login screen.
*   **Credentials**: Use the registered email and password provided in your project configuration.
*   **Logout**: Always use the "Logout" button in the bottom-left corner of the sidebar when finished to secure the portal.

---

## 📦 2. Product Inventory Management
Managed via the **Products** tab in the sidebar.

### Adding New Products
1.  Click the **"Add Product"** button in the top header.
2.  **Product Image**: You can click the upload area to select a photo from your computer/mobile gallery, or simply **Copy & Paste** an image directly into the window.
3.  Fill in the Name, Category, Price, and Stock level.
4.  The system automatically uploads the image to Supabase Storage and lists the product instantly.

### Updating Prices
1.  Select any product from the "Full Product Inventory" table.
2.  The product details will appear in the **Active Editing** section.
3.  Enter the new price and click **"Update Price"**. The change is saved to the cloud immediately.

---

## 🛒 3. Order Management System
Managed via the **Orders** tab in the sidebar (`orders.html`).

### Tracking Customer Orders
The Orders table displays:
*   **Order ID**: The unique tracking number (e.g., `ARB-XJ92KA`).
*   **Customer Info**: Name, Phone, and Delivery Address.
*   **Payment Details**: Method (COD, JazzCash, EasyPaisa) and Total Amount.
*   **Payment Verification**: For digital payments, click **"View Proof"** to see the screenshot uploaded by the customer.

### Updating Order Status
Use the status dropdown for each order:
*   **Pending**: Default state for new orders.
*   **Shipped**: Update to this once you have dispatched the medicine.
*   **Delivered/Cancelled**: Final states for record-keeping.
*   *Note: Updating the status here instantly updates the tracking info for the customer.*

---

## 🚚 4. Customer Order Tracking
Customers can track their orders directly from the landing page (`index.html`):
1.  Click **"Track Order"** in the top navigation.
2.  Enter the **Order ID** provided at checkout.
3.  View live status and product verification.

---

## ⚙️ 5. Technical Maintenance (Supabase)
The system relies on three core Supabase components:
1.  **Authentication**: Manages Hakeem's login.
2.  **Database**: Stores `products` and `orders` tables.
3.  **Storage**: 
    *   `product-images`: Stores photos of medicines.
    *   `payment-screenshots`: Stores proofs of transfer from customers.

> [!IMPORTANT]
> Ensure both storage buckets are set to **Public** in the Supabase Dashboard to allow images to be displayed correctly on the website.
