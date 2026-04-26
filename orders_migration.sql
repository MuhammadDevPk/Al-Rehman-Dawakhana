-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity INT DEFAULT 1,
    total_amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL, -- 'COD', 'JazzCash', 'EasyPaisa'
    payment_screenshot_url TEXT,
    status TEXT DEFAULT 'Pending' -- 'Pending', 'Shipped', 'Delivered', 'Cancelled'
);

-- Enable RLS on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policies for orders
CREATE POLICY "Public can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view/manage orders" ON orders FOR ALL USING (auth.role() = 'authenticated');

-- Storage Bucket for Payment Screenshots
-- Note: Buckets are usually created via the dashboard or admin API, 
-- but we can add the policies here if the bucket is named 'payment-screenshots'.

-- 1. Public Insert (for customers to upload proof)
CREATE POLICY "Public Upload Screenshots" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'payment-screenshots' );

-- 2. Admin View Screenshots
CREATE POLICY "Admin View Screenshots" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'payment-screenshots' AND auth.role() = 'authenticated' );
