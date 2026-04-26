-- Create the Products Table
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

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to READ products
CREATE POLICY "Allow public read access" 
ON public.products 
FOR SELECT 
USING (true);

-- Policy: Allow authenticated admins to do everything
CREATE POLICY "Allow admin full access" 
ON public.products 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Seed initial data (optional)
INSERT INTO public.products (name, category, sub_category, description, price, stock_level, image_url, components)
VALUES 
('Safoof-e-Zayab', 'Weight Care', 'Weight Management', 'A specialized herbal powder focused on metabolic enhancement and natural weight regulation.', 2450, 142, 'https://images.unsplash.com/photo-1512428813824-f7139cb0939b?q=80&w=500&auto=format&fit=crop', '["Green Tea Extract", "Fennel Seeds", "Ginger Root", "Cinnamon"]'),
('Kulyani Shifa', 'Renal Health', 'Kidney Stones', 'Traditional Unani formulation designed to support renal function.', 1950, 89, 'https://images.unsplash.com/photo-1628771065518-0d82f1110503?q=80&w=500&auto=format&fit=crop', '["Gokhru", "Varuna Bark", "Kulthi Dal", "Pashanbhed"]'),
('Majoon-e-Khas', 'Vitality', 'Men''s Health', 'A premium herbal formulation designed for deep cellular restoration and vitality.', 3850, 45, 'https://images.unsplash.com/photo-1611080626919-7cf5a9dcab5b?q=80&w=500&auto=format&fit=crop', '["Ashwagandha Root", "Pure Shilajit", "Saffron Stigmas", "Honey Base"]');
