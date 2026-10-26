import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerAuthProvider, useCustomerAuth } from './context/CustomerAuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { RestaurantStatusProvider, useRestaurantStatus } from './context/RestaurantStatusContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { DailySpecialsBanner } from './components/DailySpecialsBanner';
import { SpecialtiesSection } from './components/SpecialtiesSection';
import { MenuSection } from './components/MenuSection';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { CustomerReviewsSection } from './components/CustomerReviewsSection';
import { CustomerReviewModal } from './components/CustomerReviewModal';
import { ItemSearchModal } from './components/ItemSearchModal';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CustomerAccountModal } from './components/CustomerAccountModal';
import { Footer } from './components/Footer';
import { FoodCategory, FoodItem, Order } from './types/restaurant';
import { X, AlertCircle } from 'lucide-react';

function MainApp() {
  const { isAuthenticated } = useAuth();
  const { isCartOpen, setIsCartOpen } = useCart();
  const { isClosedToday, statusData } = useRestaurantStatus();

  // Menu State
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // Modals & Drawers
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Review & Feedback State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewOrderNumber, setReviewOrderNumber] = useState('');
  const [reviewCustomerName, setReviewCustomerName] = useState('');
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);

  // Fetch Menu from Backend
  const fetchMenuData = async () => {
    try {
      const [catsRes, itemsRes] = await Promise.all([
        fetch('/api/menu/categories'),
        fetch('/api/menu/items'),
      ]);

      if (catsRes.ok) {
        const catsData = await catsRes.json();
        setCategories(catsData);
      }
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setFoodItems(itemsData);
      }
    } catch (err) {
      console.warn('Failed to fetch menu:', err);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const { openAuthModal, birthdayOffer, isBirthdayBannerDismissed, dismissBirthdayBanner, openAccountModal } = useCustomerAuth();

  // Check for password reset token in URL
  const [initialResetToken, setInitialResetToken] = useState<string | null>(null);

  useEffect(() => {
    fetchMenuData();

    // Automatically open Admin modal or Customer modal in reset mode if visited via reset link
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('reset_token');
    if (token) {
      setInitialResetToken(token);
      setIsAdminLoginOpen(true);
    }

    const customerResetToken = urlParams.get('customer_reset_token');
    if (customerResetToken) {
      openAuthModal('forgot');
    }
  }, [openAuthModal]);

  // Admin access handler
  const handleOpenAdmin = () => {
    if (isAuthenticated) {
      setIsAdminDashboardOpen(true);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleOpenTrackOrder = (orderId?: string) => {
    if (orderId) {
      setTrackingOrderId(orderId);
    }
    setIsTrackingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-artisanal-kitchen text-stone-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={handleOpenAdmin}
        onOpenTrackOrder={() => handleOpenTrackOrder()}
        onOpenSearch={() => setIsItemSearchOpen(true)}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          const el = document.getElementById('menu');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Prominent Restaurant Closed Today Announcement Banner (Homepage) */}
      {isClosedToday && (
        <aside className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-amber-50 border-b-2 border-amber-500 shadow-md px-4 py-3 sm:py-3.5 relative overflow-hidden animate-fade-in z-30">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="text-sm sm:text-base font-bold font-serif text-white tracking-wide">
                    Restaurant Will Be Closed Today
                  </h2>
                </div>
                <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                  Sorry for the inconvenience. We are not accepting orders today. Please visit us again soon!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider bg-stone-900 text-amber-400 px-3 py-1.5 rounded-lg border border-stone-800">
                Ordering Paused for Today
              </span>
            </div>
          </div>
        </aside>
      )}

      {/* Birthday Celebration Ribbon for Logged-In Customers */}
      {birthdayOffer?.has_birthday_offer && !isBirthdayBannerDismissed && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white px-4 py-2.5 shadow-md border-b border-amber-500/50 flex items-center justify-between text-xs animate-fade-in">
          <div className="max-w-7xl mx-auto flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl animate-bounce">🎂</span>
              <div>
                <span className="font-bold">{birthdayOffer.greeting_title}</span>
                <span className="hidden sm:inline text-amber-100 ml-2">
                  Use coupon code <strong className="font-mono text-white bg-amber-800/60 px-1.5 py-0.5 rounded border border-amber-400/40">{birthdayOffer.coupon?.code}</strong> at checkout!
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => openAccountModal('birthday')}
                className="px-3 py-1 bg-white text-amber-950 rounded-lg font-bold text-[11px] hover:bg-amber-50 transition shadow-xs"
              >
                View Offer
              </button>
              <button
                onClick={dismissBirthdayBanner}
                className="p-1 text-amber-200 hover:text-white transition"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection
          onExploreMenu={() => {
            const el = document.getElementById('menu');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Daily Specials & Offers Banner */}
        <DailySpecialsBanner
          foodItems={foodItems}
          onExploreMenu={() => {
            const el = document.getElementById('menu');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Featured Specialties */}
        <SpecialtiesSection
          foodItems={foodItems}
          onOrderNow={() => {
            const el = document.getElementById('menu');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Full Menu Section */}
        <MenuSection
          categories={categories}
          foodItems={foodItems}
          selectedCategory={selectedCategory}
          onSelectCategory={(catId) => setSelectedCategory(catId)}
          isLoading={isLoadingMenu}
        />

        {/* Customer Reviews & Feedback Section */}
        <CustomerReviewsSection
          onOpenReviewModal={() => {
            setReviewOrderNumber('');
            setReviewCustomerName('');
            setIsReviewModalOpen(true);
          }}
          refreshTrigger={reviewsRefreshKey}
        />
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={(order) => {
          setSuccessOrder(order);
        }}
      />

      {/* Order Confirmation Screen */}
      <OrderSuccessModal
        order={successOrder}
        onClose={() => setSuccessOrder(null)}
        onTrackOrder={(orderId) => {
          setSuccessOrder(null);
          handleOpenTrackOrder(orderId);
        }}
      />

      {/* Order Tracker Modal */}
      <OrderTrackerModal
        isOpen={isTrackingModalOpen}
        onClose={() => {
          setIsTrackingModalOpen(false);
          setTrackingOrderId(null);
        }}
        initialOrderId={trackingOrderId || undefined}
        onOpenReview={(orderNum, custName) => {
          setReviewOrderNumber(orderNum);
          setReviewCustomerName(custName);
          setIsReviewModalOpen(true);
        }}
      />

      {/* Customer Review / Feedback Modal */}
      <CustomerReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        initialOrderNumber={reviewOrderNumber}
        initialCustomerName={reviewCustomerName}
        onReviewSubmitted={() => {
          setReviewsRefreshKey((prev) => prev + 1);
        }}
      />

      {/* Find Items Search Modal */}
      <ItemSearchModal
        isOpen={isItemSearchOpen}
        onClose={() => setIsItemSearchOpen(false)}
        foodItems={foodItems}
        categories={categories}
        onScrollToMenu={() => {
          const el = document.getElementById('menu');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            const input = document.getElementById('menu-search-input');
            if (input) input.focus();
          }
        }}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => {
          setIsAdminLoginOpen(false);
          setInitialResetToken(null);
        }}
        onLoginSuccess={() => {
          setIsAdminDashboardOpen(true);
        }}
        initialResetToken={initialResetToken}
      />

      {/* Owner Admin Dashboard */}
      {isAdminDashboardOpen && (
        <AdminDashboard
          onClose={() => setIsAdminDashboardOpen(false)}
          categories={categories}
          foodItems={foodItems}
          onRefreshMenu={fetchMenuData}
        />
      )}

      {/* Customer Authentication Modal (Login, Register with DOB, Forgot Password) */}
      <CustomerAuthModal />

      {/* Customer Account Dashboard (Orders, 1-Click Reorder, Birthday Rewards, Profile) */}
      <CustomerAccountModal />

      {/* Footer */}
      <Footer
        onOpenAdmin={handleOpenAdmin}
        onOpenTrackOrder={() => handleOpenTrackOrder()}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RestaurantStatusProvider>
        <CustomerAuthProvider>
          <CartProvider>
            <MainApp />
          </CartProvider>
        </CustomerAuthProvider>
      </RestaurantStatusProvider>
    </AuthProvider>
  );
}
