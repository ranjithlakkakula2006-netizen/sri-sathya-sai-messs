-- ==============================================================================
-- SRI SATHYA SAI MESS - SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Owner Profiles Table
CREATE TABLE IF NOT EXISTS public.owner_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Food Categories Table
CREATE TABLE IF NOT EXISTS public.food_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Food Items Table
CREATE TABLE IF NOT EXISTS public.food_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.food_categories(id) ON DELETE RESTRICT,
    category_name TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_veg BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Customer Profiles Table (Optional guest & registered profiles)
CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    last_delivery_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE, -- e.g. SSM-20261016-001
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    delivery_address TEXT NOT NULL,
    customer_latitude NUMERIC(10, 7),
    customer_longitude NUMERIC(10, 7),
    google_maps_url TEXT,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
    final_total NUMERIC(10, 2) NOT NULL CHECK (final_total >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash_on_delivery', 'razorpay_online', 'upi')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    order_status TEXT NOT NULL DEFAULT 'new' CHECK (order_status IN ('new', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    food_item_id UUID REFERENCES public.food_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    category_name TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Payment Records Table
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_gateway TEXT NOT NULL DEFAULT 'razorpay',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL CHECK (status IN ('initiated', 'success', 'failed', 'verification_pending')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Notification Records Table
CREATE TABLE IF NOT EXISTS public.notification_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    recipient_phone TEXT NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'queued', 'fallback_manual')),
    provider_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Customer Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    food_taste_rating INT CHECK (food_taste_rating >= 1 AND food_taste_rating <= 5),
    delivery_rating INT CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending', 'rejected')),
    owner_reply TEXT,
    owner_replied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_records ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an authorized owner
CREATE OR REPLACE FUNCTION public.is_authorized_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.owner_profiles
    WHERE id = auth.uid() AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for Food Categories
CREATE POLICY "Public can view active categories" 
ON public.food_categories FOR SELECT 
USING (is_active = TRUE OR public.is_authorized_owner());

CREATE POLICY "Only authorized owners can insert categories" 
ON public.food_categories FOR INSERT 
WITH CHECK (public.is_authorized_owner());

CREATE POLICY "Only authorized owners can update categories" 
ON public.food_categories FOR UPDATE 
USING (public.is_authorized_owner());

CREATE POLICY "Only authorized owners can delete categories" 
ON public.food_categories FOR DELETE 
USING (public.is_authorized_owner());

-- Policies for Food Items
CREATE POLICY "Public can view food items" 
ON public.food_items FOR SELECT 
USING (TRUE);

CREATE POLICY "Only authorized owners can insert food items" 
ON public.food_items FOR INSERT 
WITH CHECK (public.is_authorized_owner());

CREATE POLICY "Only authorized owners can update food items" 
ON public.food_items FOR UPDATE 
USING (public.is_authorized_owner());

CREATE POLICY "Only authorized owners can delete food items" 
ON public.food_items FOR DELETE 
USING (public.is_authorized_owner());

-- Policies for Orders
-- Customers can insert new orders
CREATE POLICY "Customers can create new orders" 
ON public.orders FOR INSERT 
WITH CHECK (TRUE);

-- Owners can read all orders
CREATE POLICY "Owners can view all orders" 
ON public.orders FOR SELECT 
USING (public.is_authorized_owner());

-- Owners can update order status
CREATE POLICY "Owners can update orders" 
ON public.orders FOR UPDATE 
USING (public.is_authorized_owner());

-- Order Items Policies
CREATE POLICY "Customers can create order items" 
ON public.order_items FOR INSERT 
WITH CHECK (TRUE);

CREATE POLICY "Owners can view all order items" 
ON public.order_items FOR SELECT 
USING (public.is_authorized_owner());

-- Payment Records Policies
CREATE POLICY "Owners can view payment records" 
ON public.payment_records FOR SELECT 
USING (public.is_authorized_owner());

-- Notification Records Policies
CREATE POLICY "Owners can view notification records" 
ON public.notification_records FOR SELECT 
USING (public.is_authorized_owner());

-- Reviews Policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published reviews" 
ON public.reviews FOR SELECT 
USING (status = 'published' OR public.is_authorized_owner());

CREATE POLICY "Customers can insert reviews" 
ON public.reviews FOR INSERT 
WITH CHECK (TRUE);

CREATE POLICY "Owners can update reviews" 
ON public.reviews FOR UPDATE 
USING (public.is_authorized_owner());

CREATE POLICY "Owners can delete reviews" 
ON public.reviews FOR DELETE 
USING (public.is_authorized_owner());


-- Storage Bucket Setup for food images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Public can view food images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'food-images');

CREATE POLICY "Authenticated owners can upload food images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'food-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated owners can update food images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'food-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated owners can delete food images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'food-images' AND auth.role() = 'authenticated');
