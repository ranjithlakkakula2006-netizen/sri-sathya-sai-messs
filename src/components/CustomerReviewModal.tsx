import React, { useState } from 'react';
import { X, Star, Utensils, Bike, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { OrderReview } from '../types/restaurant';

interface CustomerReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderNumber?: string;
  initialCustomerName?: string;
  onReviewSubmitted?: (review: OrderReview) => void;
}

const RATING_LABELS = ['', 'Needs Improvement', 'Fair', 'Good', 'Very Good', 'Outstanding!'];

export const CustomerReviewModal: React.FC<CustomerReviewModalProps> = ({
  isOpen,
  onClose,
  initialOrderNumber = '',
  initialCustomerName = '',
  onReviewSubmitted,
}) => {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [foodTasteRating, setFoodTasteRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [comment, setComment] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!orderNumber.trim()) {
      setErrorMessage('Please enter your Order ID (e.g. SSM-1001)');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    if (!comment.trim()) {
      setErrorMessage('Please share a few words about your meal experience');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber.trim(),
          customer_name: customerName.trim(),
          rating,
          comment: comment.trim(),
          food_taste_rating: foodTasteRating,
          delivery_rating: deliveryRating,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setIsSuccess(true);
      if (onReviewSubmitted && data.review) {
        onReviewSubmitted(data.review);
      }

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-stone-100 flex items-center justify-between border-b border-stone-800">
          <div>
            <span className="text-xs text-amber-400 font-semibold tracking-wider uppercase">
              Sri Sathya Sai Mess
            </span>
            <h2 className="text-lg font-serif font-bold text-stone-50">
              Customer Feedback & Rating
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Thank You for Your Review!</h3>
            <p className="text-xs text-stone-600 leading-relaxed max-w-xs mx-auto">
              Your feedback has been received. It helps our kitchen maintain authentic military & homestyle standards every day.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-stone-700">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Order & Customer Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Order ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SSM-1002"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 font-mono text-xs focus:bg-white focus:outline-hidden focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Reddy"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 text-xs focus:bg-white focus:outline-hidden focus:border-amber-600"
                />
              </div>
            </div>

            {/* Overall Star Rating */}
            <div className="space-y-1.5 p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 text-center">
              <span className="text-xs font-bold text-stone-800 block">
                Overall Meal Satisfaction <span className="text-red-500">*</span>
              </span>

              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-115 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          isFilled
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <span className="text-xs font-bold text-amber-900 block min-h-[1rem]">
                {RATING_LABELS[hoverRating || rating]}
              </span>
            </div>

            {/* Sub-ratings */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                <span className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-amber-600" />
                  Food & Spices
                </span>
                <select
                  value={foodTasteRating}
                  onChange={(e) => setFoodTasteRating(parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded text-xs text-stone-800"
                >
                  <option value={5}>5 ★ - Authentic & Tasty</option>
                  <option value={4}>4 ★ - Very Good</option>
                  <option value={3}>3 ★ - Average</option>
                  <option value={2}>2 ★ - Needs Spices</option>
                  <option value={1}>1 ★ - Unsatisfied</option>
                </select>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                <span className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                  <Bike className="w-3.5 h-3.5 text-amber-600" />
                  Delivery & Packaging
                </span>
                <select
                  value={deliveryRating}
                  onChange={(e) => setDeliveryRating(parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded text-xs text-stone-800"
                >
                  <option value={5}>5 ★ - Hot & Fast</option>
                  <option value={4}>4 ★ - Good Time</option>
                  <option value={3}>3 ★ - Average</option>
                  <option value={2}>2 ★ - Slight Delay</option>
                  <option value={1}>1 ★ - Packaging Issue</option>
                </select>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Your Review & Dish Comments <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="How was the mutton tenderness, biryani aroma, leaf meal sides, or boti fry? What did you love?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 text-xs focus:bg-white focus:outline-hidden focus:border-amber-600"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Review</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
