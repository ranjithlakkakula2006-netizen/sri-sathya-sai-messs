import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle, ChevronRight, ShieldCheck, Heart } from 'lucide-react';
import { OrderReview } from '../types/restaurant';

interface CustomerReviewsSectionProps {
  onOpenReviewModal: () => void;
  refreshTrigger?: number;
}

export const CustomerReviewsSection: React.FC<CustomerReviewsSectionProps> = ({
  onOpenReviewModal,
  refreshTrigger,
}) => {
  const [reviews, setReviews] = useState<OrderReview[]>([]);
  const [averageRating, setAverageRating] = useState<number>(5.0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setAverageRating(data.average_rating || 5.0);
        setTotalCount(data.total_count || 0);
      }
    } catch (e) {
      console.warn('Failed to load reviews', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [refreshTrigger]);

  const filtered = filterRating === 'all'
    ? reviews
    : reviews.filter((r) => r.rating === filterRating);

  return (
    <section id="reviews" className="py-14 sm:py-20 bg-stone-100/60 border-t border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 tracking-wider uppercase mb-1">
              <span>Customer Satisfaction</span>
              <span aria-hidden="true">·</span>
              <span>Authentic Foodies</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight">
              Customer Love & Reviews
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl">
              Real reviews from patrons who enjoyed our wood-fired military curries, spicy boti, leaf meals, and dum biryani.
            </p>
          </div>

          {/* Rating Summary Card & Write Review Button */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-stone-200 shadow-xs">
              <div className="flex items-center text-amber-500">
                <Star className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-stone-900 tabular-nums">
                    {averageRating}
                  </span>
                  <span className="text-xs text-stone-400">/ 5.0</span>
                </div>
                <span className="text-[10px] text-stone-500 block">
                  {totalCount} Verified Reviews
                </span>
              </div>
            </div>

            <button
              onClick={onOpenReviewModal}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Leave a Review</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterRating('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterRating === 'all'
                ? 'bg-stone-900 text-amber-400'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            All Ratings ({reviews.length})
          </button>
          {[5, 4, 3].map((star) => {
            const count = reviews.filter((r) => r.rating === star).length;
            return (
              <button
                key={star}
                onClick={() => setFilterRating(star)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  filterRating === star
                    ? 'bg-stone-900 text-amber-400'
                    : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span>{star}</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-stone-400">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Reviews Grid */}
        {isLoading ? (
          <div className="py-12 flex justify-center text-xs text-stone-500">
            Loading reviews...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-xl border border-stone-200 p-6 space-y-2">
            <p className="text-xs text-stone-500">No reviews found in this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-xl border border-stone-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Star Rating & Verified Tag */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-stone-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verified Order #{rev.order_number}</span>
                    </span>
                  </div>

                  {/* Comment */}
                  <p className="text-xs text-stone-700 leading-relaxed font-normal italic">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-stone-100">
                  {/* Customer Info */}
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-bold text-stone-900 not-italic">
                      {rev.customer_name}
                    </span>
                    <span className="text-[11px]">
                      {new Date(rev.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Owner Reply if present */}
                  {rev.owner_reply && (
                    <div className="p-2.5 bg-amber-50/70 rounded-lg border border-amber-200/60 text-[11px] text-stone-800 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-amber-900">
                        <span>Response from Sri Sathya Sai Mess:</span>
                      </div>
                      <p className="text-stone-600 leading-relaxed">
                        {rev.owner_reply}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
