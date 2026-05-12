-- ==========================================
-- AL REHMAN DAWAKHANA - FULL DATABASE SCHEMA
-- Consolidated Migration Script
-- ==========================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    stock_level INT DEFAULT 0,
    image_url TEXT,
    components JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Active'
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INT DEFAULT 1,
    total_price NUMERIC NOT NULL,
    payment_method TEXT NOT NULL, -- 'COD', 'JazzCash', 'EasyPaisa'
    payment_screenshot_url TEXT,
    order_status TEXT DEFAULT 'Pending', -- 'Pending', 'Shipped', 'Delivered', 'Cancelled'
    order_number TEXT UNIQUE NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. AI Semantic Cache Table
CREATE TABLE IF NOT EXISTS public.ai_cache (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_query TEXT UNIQUE NOT NULL,
    ai_response TEXT NOT NULL
);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Products Policies
DROP POLICY IF EXISTS "Allow public read access" ON public.products;
CREATE POLICY "Allow public read access" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin full access" ON public.products;
CREATE POLICY "Allow admin full access" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Orders Policies
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AI Cache Policies
DROP POLICY IF EXISTS "Public read cache" ON public.ai_cache;
CREATE POLICY "Public read cache" ON public.ai_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert cache" ON public.ai_cache;
CREATE POLICY "Public insert cache" ON public.ai_cache FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin manage cache" ON public.ai_cache;
CREATE POLICY "Admin manage cache" ON public.ai_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- STORAGE BUCKETS & POLICIES
-- ==========================================

-- Note: Run these in the SQL editor to ensure buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'product-images'
DROP POLICY IF EXISTS "Public View Product Images" ON storage.objects;
CREATE POLICY "Public View Product Images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin Manage Product Images" ON storage.objects;
CREATE POLICY "Admin Manage Product Images" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'product-images');

-- Storage Policies for 'payment-screenshots'
DROP POLICY IF EXISTS "Public Upload Screenshots" ON storage.objects;
CREATE POLICY "Public Upload Screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots');

DROP POLICY IF EXISTS "Admin View Screenshots" ON storage.objects;
CREATE POLICY "Admin View Screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'payment-screenshots');

-- ==========================================
-- INITIAL DATA SEED
-- ==========================================

INSERT INTO public.products (name, category, sub_category, description, price, stock_level, image_url, components)
VALUES 
('Safoof-e-Zayab', 'Weight Care', 'Weight Management', 'A specialized herbal powder focused on metabolic enhancement and natural weight regulation.', 2450, 142, 'https://images.unsplash.com/photo-1512428813824-f7139cb0939b?q=80&w=500&auto=format&fit=crop', '["Green Tea Extract", "Fennel Seeds", "Ginger Root", "Cinnamon"]'),
('Kulyani Shifa', 'Renal Health', 'Kidney Stones', 'Traditional Unani formulation designed to support renal function.', 1950, 89, 'https://images.unsplash.com/photo-1628771065518-0d82f1110503?q=80&w=500&auto=format&fit=crop', '["Gokhru", "Varuna Bark", "Kulthi Dal", "Pashanbhed"]'),
('Majoon-e-Khas', 'Vitality', 'Men''s Health', 'A premium herbal formulation designed for deep cellular restoration and vitality.', 3850, 45, 'https://images.unsplash.com/photo-1611080626919-7cf5a9dcab5b?q=80&w=500&auto=format&fit=crop', '["Ashwagandha Root", "Pure Shilajit", "Saffron Stigmas", "Honey Base"]'),
('Husn-e-Yousaf', 'Skin Care', 'Face Glow', 'A legendary herbal mask for natural radiance and deep skin purification.', 1250, 200, 'https://images.unsplash.com/photo-1596462502278-27bfad450216?q=80&w=500&auto=format&fit=crop', '["Sandalwood", "Turmeric", "Rose Petals", "Multani Mitti"]')
ON CONFLICT DO NOTHING;
