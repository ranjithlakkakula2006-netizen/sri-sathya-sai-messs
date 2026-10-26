import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Plus, Check, ShoppingBag, Sparkles, ArrowRight } from 'lucide-react';
import { FoodItem, FoodCategory } from '../types/restaurant';
import { useCart } from '../context/CartContext';

interface ItemSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  foodItems: FoodItem[];
  categories: FoodCategory[];
  onScrollToMenu?: () => void;
}

export const ItemSearchModal: React.FC<ItemSearchModalProps> = ({
  isOpen,
  onClose,
  foodItems,
  categories,
  onScrollToMenu,
}) => {
  const { addToCart, setIsCartOpen } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVegFilter, setSelectedVegFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const POPULAR_SEARCHES = [
    'Biryani',
    'Full Meals',
    'Mutton Curry',
    'Chicken Curry',
    'Boti',
    'Omelette',
    'Egg Curry',
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchTerm('');
      setSelectedVegFilter('all');
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    return foodItems.filter((item) => {
      // Veg/Non-veg filter
      if (selectedVegFilter === 'veg' && !item.is_veg) return false;
      if (selectedVegFilter === 'non-veg' && item.is_veg) return false;

      // Query filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesCat = (item.category_name || '').toLowerCase().includes(q);
        return matchesName || matchesDesc || matchesCat;
      }

      return true;
    });
  }, [foodItems, searchTerm, selectedVegFilter]);

  if (!isOpen) return null;

  const handleAddItem = (item: FoodItem) => {
    addToCart(item);
    setAddedItemIds((prev) => new Set(prev).add(item.id));
    setTimeout(() => {
      setAddedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-start justify-center p-4 sm:pt-16">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Search Bar */}
        <div className="p-4 sm:p-5 bg-stone-900 border-b border-stone-800 text-stone-100 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Find Dishes & Curries</span>
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-3.5 text-amber-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search chicken biryani, leaf meals, mutton curry..."
              className="w-full pl-11 pr-10 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-400 text-sm focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 text-stone-400 hover:text-white p-1 rounded-md text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Tags & Popular Searches */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            {/* Dietary Filter */}
            <div className="flex items-center gap-1 bg-stone-800/90 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedVegFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium text-xs cursor-pointer ${
                  selectedVegFilter === 'all'
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedVegFilter('non-veg')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium text-xs flex items-center gap-1 cursor-pointer ${
                  selectedVegFilter === 'non-veg'
                    ? 'bg-red-700 text-white font-bold'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span>Non-Veg</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedVegFilter('veg')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium text-xs flex items-center gap-1 cursor-pointer ${
                  selectedVegFilter === 'veg'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Veg</span>
              </button>
            </div>

            {/* Quick Popular Searches */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full">
              <span className="text-[10px] text-stone-400 uppercase tracking-wide shrink-0 hidden sm:inline">
                Popular:
              </span>
              {POPULAR_SEARCHES.map((pop) => (
                <button
                  key={pop}
                  type="button"
                  onClick={() => setSearchTerm(pop)}
                  className="px-2 py-0.5 rounded-md text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 border border-stone-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {pop}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 bg-stone-50/50">
          <div className="flex items-center justify-between text-xs text-stone-500 pb-1 border-b border-stone-200">
            <span>
              {searchTerm
                ? `Results for "${searchTerm}" (${filteredItems.length})`
                : `Showing all dishes (${filteredItems.length})`}
            </span>
            {onScrollToMenu && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onScrollToMenu();
                }}
                className="text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Menu Section</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {filteredItems.map((item) => {
                const isAdded = addedItemIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all flex items-start gap-3 relative group"
                  >
                    {/* Thumbnail */}
                    <div className="w-18 h-18 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200 relative">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span
                        className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs ${
                          item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                        title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-stone-900 text-xs sm:text-sm line-clamp-1 leading-snug">
                            {item.name}
                          </h4>
                        </div>
                        <span className="text-[10px] text-amber-800 font-medium uppercase tracking-wide block">
                          {item.category_name}
                        </span>
                        <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Price & Add button */}
                      <div className="flex items-center justify-between pt-2 mt-1 border-t border-stone-100">
                        <span className="text-sm font-bold text-stone-900 tabular-nums">
                          ₹{item.price}
                        </span>

                        <button
                          type="button"
                          disabled={!item.is_available}
                          onClick={() => handleAddItem(item)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                            !item.is_available
                              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                              : isAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-xs'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : !item.is_available ? (
                            <span>Sold Out</span>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-stone-900 text-sm">
                No food items match "{searchTerm}"
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                Try searching for keywords like "meals", "dum biryani", "mutton", "chicken", or "curry".
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedVegFilter('all');
                }}
                className="text-xs font-semibold text-amber-800 hover:underline pt-1 cursor-pointer"
              >
                Clear search and view all items
              </button>
            </div>
          )}
        </div>

        {/* Footer with View Bag button */}
        <div className="p-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600 shrink-0">
          <span>Fresh traditional spices & wood-fire cooking</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              setIsCartOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-semibold transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Bag</span>
          </button>
        </div>

      </div>
    </div>
  );
};
