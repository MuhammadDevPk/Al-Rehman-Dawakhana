-- Add human-readable order_number column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;

-- Generate order numbers for existing orders (if any)
UPDATE public.orders 
SET order_number = 'ARB-' || upper(substring(id::text from 1 for 6))
WHERE order_number IS NULL;

-- Make it NOT NULL for future orders
ALTER TABLE public.orders ALTER COLUMN order_number SET NOT NULL;
