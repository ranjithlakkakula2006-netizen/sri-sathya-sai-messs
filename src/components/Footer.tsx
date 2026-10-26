import React from 'react';
import { Phone, MapPin, Clock, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenTrackOrder: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin, onOpenTrackOrder }) => {
  return (
    <footer id="about" className="bg-stone-950 text-stone-300 border-t border-amber-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Bio */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xl font-serif font-bold text-amber-400">
              Sri Sathya Sai Mess
            </h3>
            <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
              Serving unmatched South Indian military & homestyle food with uncompromising tradition. Fresh stone-ground masalas, fiery curries, tender meats, and unlimited banana leaf meal service.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-stone-400">
              <span className="font-semibold text-stone-200">FSSAI Certified</span>
              <span aria-hidden="true">·</span>
              <span>100% Halal Meats</span>
              <span aria-hidden="true">·</span>
              <span>Pure Cold-Pressed Oils</span>
            </div>
          </div>

          {/* Col 2: Mess Timings & Location */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Kitchen Timings & Location
            </h4>
            <div className="space-y-2.5 text-stone-400">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-stone-200 font-semibold">Lunch Time</p>
                  <p className="text-amber-400 font-bold text-xs sm:text-sm">
                    11:00 AM – 7:00 PM
                    <span className="sr-only">11:00 PM-7:00PM</span>
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">Continuous daytime lunch service</p>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-stone-300 leading-relaxed">
                  Hyderabad to Warangal High Road, Bhuvanagiri, Aler, Pincode: 508101
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a
                  href="tel:+919701576804"
                  className="hover:text-amber-400 transition-colors font-semibold text-stone-200 tracking-wide"
                >
                  +91 97015 76804
                </a>
              </div>
            </div>
          </div>

          {/* Col 3: Quick Navigation */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Quick Links
            </h4>
            <ul className="space-y-2 text-stone-400">
              <li>
                <a href="#menu" className="hover:text-amber-400 transition-colors">
                  Order Food Online
                </a>
              </li>
              <li>
                <a href="#specialties" className="hover:text-amber-400 transition-colors">
                  Today's Mess Specials
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenTrackOrder}
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  Order History & Tracking
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenAdmin}
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left flex items-center gap-1 text-stone-300 font-medium"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Restaurant Owner Portal</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Sri Sathya Sai Mess. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Prices in Indian Rupees (₹)</span>
            <span aria-hidden="true">·</span>
            <span>Razorpay Secure Payments</span>
            <span aria-hidden="true">·</span>
            <span>WhatsApp Notifications</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
