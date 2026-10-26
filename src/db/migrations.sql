-- Sri Sathya Sai Mess - High-Traffic Database Optimization & Indexing Schema
-- Designed for handling 1,000 to 5,000 concurrent customers with < 10ms query times

-- 1. Orders Table & Indexes
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_address TEXT NOT NULL,
  customer_latitude DOUBLE PRECISION,
  customer_longitude DOUBLE PRECISION,
  google_maps_url TEXT,
  subtotal NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) DEFAULT 0,
  final_total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast Index: Customer phone lookup (used by Order History portal)
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone 
ON orders (customer_phone);

-- Composite Index: Customer phone with timestamp for instant sorted history
CREATE INDEX IF NOT EXISTS idx_orders_phone_created_desc 
ON orders (customer_phone, created_at DESC);

-- Fast Unique Index: Order number lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number 
ON orders (order_number);

-- Fast Index: Order status & payment status (used by Kitchen Admin Dashboard filters)
CREATE INDEX IF NOT EXISTS idx_orders_status_created 
ON orders (order_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
ON orders (payment_status);

-- Idempotency key lookup index (prevents duplicate orders during concurrent clicks)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key 
ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL;


-- 2. Order Items Table & Indexes
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  food_item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON order_items (order_id);


-- 3. Food Categories & Items Indexes
CREATE TABLE IF NOT EXISTS food_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_categories_display_order 
ON food_categories (display_order) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS food_items (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES food_categories(id),
  category_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_veg BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_items_category_available 
ON food_items (category_id, is_available, display_order);

CREATE INDEX IF NOT EXISTS idx_food_items_search 
ON food_items USING gin(to_tsvector('english', name || ' ' || coalesce(description, '') || ' ' || category_name));


-- 4. Customer Reviews Table & Indexes
CREATE TABLE IF NOT EXISTS order_reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  order_number TEXT,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  food_taste_rating INTEGER,
  delivery_rating INTEGER,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  owner_reply TEXT,
  owner_replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_reviews_status_created 
ON order_reviews (status, created_at DESC);


-- 5. Customers, Birthday Offers, Coupons & Notifications Schema
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_dob ON customers (date_of_birth);

-- Alter orders table to link to customer & record discounts
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);

-- Birthday Offer Rules Table
CREATE TABLE IF NOT EXISTS birthday_offer_config (
  id TEXT PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT true,
  offer_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed', 'free_item'
  discount_percentage INTEGER DEFAULT 20,
  fixed_discount_amount NUMERIC(10, 2) DEFAULT 100,
  free_item_name TEXT DEFAULT 'Military Mess Special Sweet',
  free_food_item_id TEXT,
  min_order_value NUMERIC(10, 2) DEFAULT 300,
  max_discount_cap NUMERIC(10, 2) DEFAULT 150,
  validity_days_before INTEGER DEFAULT 0,
  validity_days_after INTEGER DEFAULT 7,
  description TEXT NOT NULL,
  terms TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Birthday Coupons Table (Single-use per customer per year)
CREATE TABLE IF NOT EXISTS birthday_coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_dob DATE NOT NULL,
  year INTEGER NOT NULL,
  offer_type TEXT NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL,
  free_item_name TEXT,
  min_order_value NUMERIC(10, 2) NOT NULL,
  max_discount_cap NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'redeemed', 'expired'
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_order_id TEXT,
  redeemed_order_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_customer_birthday_year UNIQUE (customer_id, year)
);

CREATE INDEX IF NOT EXISTS idx_birthday_coupons_code ON birthday_coupons (code);
CREATE INDEX IF NOT EXISTS idx_birthday_coupons_customer ON birthday_coupons (customer_id, status);

-- Admin Notifications Table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'birthday_upcoming', 'birthday_today', 'coupon_redeemed', 'new_order'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_dob DATE,
  coupon_code TEXT,
  order_number TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  delivery_channels JSONB DEFAULT '{"in_app": true}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications (is_read, created_at DESC);

-- 6. Connection Pooling & Performance Tuning (PostgreSQL / Supabase)
-- Recommended Pool Configuration:
-- max_connections = 100
-- shared_buffers = 256MB (or 25% of RAM)
-- work_mem = 4MB
-- maintenance_work_mem = 64MB
-- effective_cache_size = 768MB
-- For Supabase: Use Port 6543 (Transaction Mode PgBouncer) for high concurrent client workloads.
