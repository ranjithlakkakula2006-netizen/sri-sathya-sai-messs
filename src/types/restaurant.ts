export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cash_on_delivery' | 'razorpay_online' | 'upi';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface FoodCategory {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export interface FoodItem {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  is_veg: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  food_item: FoodItem;
  quantity: number;
}

export interface CustomerLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  google_maps_url: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  food_item_id: string;
  item_name: string;
  category_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  customer_latitude?: number | null;
  customer_longitude?: number | null;
  google_maps_url?: string | null;
  subtotal: number;
  delivery_fee: number;
  final_total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  customer_id?: string;
  coupon_code?: string;
  discount_amount?: number;
}

export interface CustomerProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string; // YYYY-MM-DD
  created_at: string;
  updated_at?: string;
}

export interface BirthdayOfferConfig {
  id: string;
  is_active: boolean;
  offer_type: 'percentage' | 'fixed' | 'free_item';
  discount_percentage?: number; // e.g. 20
  fixed_discount_amount?: number; // e.g. 100
  free_item_name?: string; // e.g. 'Military Mess Special Sweet'
  free_food_item_id?: string;
  min_order_value: number; // e.g. 300
  max_discount_cap?: number; // e.g. 150
  validity_days_before: number; // e.g. 0
  validity_days_after: number; // e.g. 7
  description: string;
  terms?: string;
}

export interface BirthdayCoupon {
  id: string;
  code: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_dob: string;
  year: number;
  offer_type: 'percentage' | 'fixed' | 'free_item';
  discount_value: number;
  free_item_name?: string;
  min_order_value: number;
  max_discount_cap?: number;
  status: 'active' | 'redeemed' | 'expired';
  valid_from: string;
  valid_until: string;
  redeemed_at?: string;
  redeemed_order_id?: string;
  redeemed_order_number?: string;
}

export interface AdminNotification {
  id: string;
  type: 'birthday_upcoming' | 'birthday_today' | 'coupon_redeemed' | 'new_order';
  title: string;
  message: string;
  customer_name?: string;
  customer_phone?: string;
  customer_dob?: string;
  coupon_code?: string;
  order_number?: string;
  is_read: boolean;
  created_at: string;
  delivery_channels?: {
    in_app: boolean;
    whatsapp_sent?: boolean;
    email_sent?: boolean;
  };
}

export interface OwnerProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: 'owner' | 'manager';
  is_active: boolean;
}

export interface SystemConfig {
  supabase_configured: boolean;
  razorpay_configured: boolean;
  razorpay_key_id?: string;
  whatsapp_configured: boolean;
  owner_whatsapp_configured: boolean;
  restaurant_name: string;
  restaurant_phone: string;
  restaurant_address: string;
}

export interface OrderReview {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  rating: number; // 1 to 5
  comment: string;
  food_taste_rating?: number;
  delivery_rating?: number;
  status: 'published' | 'pending' | 'rejected';
  created_at: string;
  owner_reply?: string;
  owner_replied_at?: string;
}

export interface RestaurantClosureStatus {
  is_closed_today: boolean;
  today_ist: string;
  closed_date: string | null;
  closed_at: string | null;
  announcement_title: string;
  announcement_message: string;
  status_updated_at?: string;
}

export type ApiProviderKey = 'razorpay' | 'whatsapp' | 'smtp' | 'supabase' | 'google_maps';

export interface MaskedApiConfig {
  provider: ApiProviderKey;
  is_enabled: boolean;
  masked_credentials: Record<string, string>;
  has_credentials: Record<string, boolean>;
  updated_at: string;
  last_tested_at?: string;
  test_status?: 'success' | 'failed' | 'untested';
  test_message?: string;
}


