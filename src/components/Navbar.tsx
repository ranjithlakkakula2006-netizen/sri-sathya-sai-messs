import React from 'react';
import { ShoppingBag, ShieldCheck, History, Search, User, Gift } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';

interface NavbarProps {
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onOpenTrackOrder: () => void;
  onOpenSearch: () => void;
  onSelectCategory: (categoryId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCart,
  onOpenAdmin,
  onOpenTrackOrder,
  onOpenSearch,
}) => {
  const { totalCount, finalTotal } = useCart();
  const { isAuthenticated: isOwnerAuthenticated } = useAuth();
  const {
    customer,
    isAuthenticated: isCustomerAuthenticated,
    birthdayOffer,
    openAuthModal,
    openAccountModal,
  } = useCustomerAuth();

  const handleOrderHistoryClick = () => {
    if (isCustomerAuthenticated) {
      openAccountModal('orders');
    } else {
      onOpenTrackOrder();
    }
  };

  const isBirthdayToday = birthdayOffer?.birthday_status?.isToday;
  const hasBirthdayOffer = birthdayOffer?.has_birthday_offer;

  return (
    <header className="sticky top-0 z-40 bg-stone-950/90 backdrop-blur-md border-b border-amber-900/40 text-stone-100 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <a
          href="/"
          className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
        >
          Sri Sathya Sai Mess
        </a>

        {/* Zone 2: Navigation Links (1-2 word labels, single-line) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-300">
          <a
            href="#menu"
            className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Menu
          </a>
          <a
            href="#specialties"
            className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Specialties
          </a>
          <a
            href="#reviews"
            className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Reviews
          </a>
          <a
            href="#about"
            className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Our Story
          </a>
          <button
            onClick={handleOrderHistoryClick}
            className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            title={isCustomerAuthenticated ? 'View your order history' : 'Track orders by phone or order ID'}
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Order History</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action & Badges */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Search Bar Button to find items */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-850 hover:border-amber-500/50 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
            title="Search dishes & find food items"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>Find Items</span>
          </button>

          {/* Customer Portal Button (Logged in vs Sign In) */}
          {isCustomerAuthenticated && customer ? (
            <button
              onClick={() => openAccountModal('orders')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isBirthdayToday || hasBirthdayOffer
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border border-amber-400 shadow-sm shadow-amber-600/30'
                  : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-900/60'
              }`}
              title="My Customer Account & Order History"
            >
              {isBirthdayToday ? (
                <span className="text-sm animate-bounce">🎂</span>
              ) : hasBirthdayOffer ? (
                <Gift className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <User className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="max-w-[100px] truncate">
                Hi, {customer.full_name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 hover:border-amber-500/40 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              title="Customer Sign In & Birthday Rewards"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In</span>
            </button>
          )}

          <button
            onClick={handleOrderHistoryClick}
            className="md:hidden flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Order History"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Orders</span>
          </button>

          <button
            onClick={onOpenAdmin}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Owner Admin Dashboard"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>{isOwnerAuthenticated ? 'Owner Dashboard' : 'Owner Login'}</span>
          </button>

          <button
            onClick={onOpenCart}
            aria-label="Shopping Cart"
            className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-all duration-150 shadow-sm active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Bag</span>
            {totalCount > 0 && (
              <span className="flex items-center gap-1 pl-1 border-l border-amber-600/40 tabular-nums">
                <span className="bg-stone-950 text-amber-400 text-xs px-1.5 py-0.2 rounded-full font-bold">
                  {totalCount}
                </span>
                <span className="hidden sm:inline text-xs font-bold">
                  ₹{finalTotal}
                </span>
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
