import React, { useState, useMemo } from 'react';
import { Search, Filter, Sparkles, AlertCircle } from 'lucide-react';
import { FoodCategory, FoodItem } from '../types/restaurant';
import { FoodCard } from './FoodCard';
import { useRestaurantStatus } from '../context/RestaurantStatusContext';

interface MenuSectionProps {
  categories: FoodCategory[];
  foodItems: FoodItem[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  isLoading: boolean;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  categories,
  foodItems,
  selectedCategory,
  onSelectCategory,
  isLoading,
}) => {
  const { isClosedToday } = useRestaurantStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg'>('all');

  const filteredItems = useMemo(() => {
    return foodItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const matchesCat =
          item.category_id === selectedCategory ||
          item.category_name.toLowerCase() === selectedCategory.toLowerCase();
        if (!matchesCat) return false;
      }

      // Veg filter
      if (vegFilter === 'veg' && !item.is_veg) return false;
      if (vegFilter === 'non-veg' && item.is_veg) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesCat = item.category_name.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      return true;
    });
  }, [foodItems, selectedCategory, vegFilter, searchQuery]);

  return (
    <section id="menu" className="py-12 sm:py-16 bg-transparent text-stone-900 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Prominent Closed Today Announcement on Menu */}
        {isClosedToday && (
          <div className="bg-amber-50 border-2 border-amber-500/80 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
                <h3 className="text-lg font-bold font-serif text-stone-900">
                  Restaurant Will Be Closed Today
                </h3>
              </div>
              <p className="text-sm text-stone-700 mt-1 font-medium">
                Sorry for the inconvenience. We are not accepting orders today. Please visit us again soon!
              </p>
            </div>
            <div className="shrink-0 bg-white border border-amber-300 rounded-lg px-3.5 py-2 text-xs font-bold text-amber-900 shadow-2xs">
              Ordering Paused for Today
            </div>
          </div>
        )}

        {/* Header & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 tracking-wider uppercase mb-1">
              <span>Authentic Kitchen</span>
              <span aria-hidden="true">·</span>
              <span>Cooked Fresh Daily</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight">
              Our Mess Menu
            </h2>
            <p className="text-sm text-stone-600 mt-1 max-w-xl">
              From our famous Unlimited Banana Leaf Meals to rich bone-in Mutton & Boti Curries. All prices inclusive of taxes.
            </p>
          </div>

          {/* Search bar & Veg toggle */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="menu-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search biryani, curries, meals..."
                    className="w-full pl-9 pr-7 py-2.5 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-colors shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  title="Find items in menu"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Items</span>
                </button>
              </form>

              {/* Veg / Non-Veg Toggle Buttons */}
              <div className="flex items-center bg-stone-200/80 p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
                <button
                  onClick={() => setVegFilter('all')}
                  className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    vegFilter === 'all'
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setVegFilter('non-veg')}
                  className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    vegFilter === 'non-veg'
                      ? 'bg-white text-red-800 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  <span>Non-Veg</span>
                </button>
                <button
                  onClick={() => setVegFilter('veg')}
                  className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    vegFilter === 'veg'
                      ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Veg</span>
                </button>
              </div>
            </div>

            {/* Quick search keywords */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px] text-stone-500">
              <span className="font-semibold text-stone-600 shrink-0">Popular:</span>
              {['Biryani', 'Meals', 'Mutton', 'Chicken', 'Boti', 'Egg'].map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => setSearchQuery(keyword)}
                  className={`px-2 py-0.5 rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                    searchQuery.toLowerCase() === keyword.toLowerCase()
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                      : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                  }`}
                >
                  {keyword}
                </button>
              ))}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-amber-800 hover:underline font-semibold ml-1 cursor-pointer shrink-0"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Category Segmented Tabs */}
        <div className="overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => onSelectCategory('all')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-stone-900 text-amber-400 shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              All Categories ({foodItems.length})
            </button>
            {categories.map((cat) => {
              const count = foodItems.filter(
                (i) => i.category_id === cat.id || i.category_name === cat.name
              ).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat.id || selectedCategory === cat.name
                      ? 'bg-stone-900 text-amber-400 shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  {cat.name} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-stone-500 font-medium">Loading Sri Sathya Sai Mess menu...</p>
          </div>
        )}

        {/* Items Grid */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <FoodCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Empty Search Results */}
        {!isLoading && filteredItems.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-stone-200/80 p-8 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-800">No dishes match your filter</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Try searching for different keywords or reset the category and dietary filters.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setVegFilter('all');
                onSelectCategory('all');
              }}
              className="px-4 py-2 bg-stone-900 text-stone-100 text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
