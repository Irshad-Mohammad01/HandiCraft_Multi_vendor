import { Link } from 'react-router-dom';
import { Compass, Home, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 bg-[#FFF9F3]">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#F4E8DC] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40]">
          <Compass className="w-10 h-10 animate-spin-slow" />
        </div>

        <span className="text-xs uppercase font-bold tracking-widest text-[#C69A5B] block mb-1">
          404 Error
        </span>

        <h1 className="font-serif text-3xl font-bold text-[#2B2523] mb-3">
          Page Not Found
        </h1>

        <p className="text-xs sm:text-sm text-[#6F625D] mb-8 leading-relaxed">
          The handicraft, collection, or portal you are seeking appears to have moved or does not exist. Let us guide you back to our curated gallery.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </Link>

          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#F4E8DC] text-[#2B2523] hover:bg-[#E6D8CC] text-xs font-semibold transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-[#A63D40]" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
