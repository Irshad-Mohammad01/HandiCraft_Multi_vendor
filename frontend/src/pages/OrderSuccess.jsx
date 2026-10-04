import { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, Package, Truck, ArrowRight, ShoppingBag, 
  MapPin, Sparkles, FileText, Download, Eye, Clock, 
  ShieldCheck, Phone, Mail, Building
} from 'lucide-react';
import { ordersApi } from '../api/orders';
import LoadingSpinner from '../components/common/LoadingSpinner';
import InvoiceModal from '../components/common/InvoiceModal';

export default function OrderSuccess() {
  const location = useLocation();
  const { orderId } = useParams();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order && !!orderId);
  const [invoice, setInvoice] = useState(location.state?.order?.invoice || null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!order && orderId) {
      let isMounted = true;
      async function fetchOrder() {
        try {
          const res = await ordersApi.getAll();
          const list = res.orders || res || [];
          const found = list.find(
            (o) => String(o.id) === String(orderId) || String(o.order_id) === String(orderId)
          );
          if (isMounted && found) {
            setOrder(found);
            if (found.invoice) {
              setInvoice(found.invoice);
            }
          }
        } catch (err) {
          console.error('Failed to load order:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
      fetchOrder();
      return () => { isMounted = false; };
    }
  }, [order, orderId]);

  // Load invoice if not already attached to order
  useEffect(() => {
    let isMounted = true;
    if (order && !invoice) {
      async function loadInvoice() {
        setInvoiceLoading(true);
        try {
          const ordRef = order.order_id || order.id;
          const res = await ordersApi.getInvoice(ordRef);
          if (isMounted && res.invoice) {
            setInvoice(res.invoice);
          }
        } catch (err) {
          console.error('Failed to load invoice details:', err);
        } finally {
          if (isMounted) setInvoiceLoading(false);
        }
      }
      loadInvoice();
    }
    return () => { isMounted = false; };
  }, [order, invoice]);

  const handleDownloadPdf = async () => {
    if (!order) return;
    try {
      setDownloadingPdf(true);
      const ordRef = order.order_id || order.id;
      const invNum = invoice?.invoice_number || '';
      await ordersApi.downloadInvoicePdf(ordRef, invNum);
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      alert('Failed to download PDF invoice. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FFF9F3]">
        <LoadingSpinner label="Retrieving order confirmation..." />
      </div>
    );
  }

  // Fallback if accessed directly without an order
  if (!order && !loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#FFF9F3]">
        <div className="max-w-md w-full text-center p-8 bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow">
          <Package className="w-12 h-12 text-[#C69A5B] mx-auto mb-3" />
          <h2 className="font-serif text-2xl font-bold text-[#2B2523] mb-2">Order Confirmed</h2>
          <p className="text-xs text-[#6F625D] mb-6">
            Your patron order has been dispatched into our artisans' workshop queue. You can review all details in your order history.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/account/orders"
              className="py-2.5 px-5 rounded-xl bg-[#A63D40] text-white text-xs font-semibold text-center"
            >
              View My Orders
            </Link>
            <Link
              to="/products"
              className="py-2.5 px-5 rounded-xl bg-[#F4E8DC] text-[#2B2523] text-xs font-semibold text-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = order.items || [];
  const displayId = order.order_id || `#CN-${order.id}`;
  const address = order.shipping_address || {};
  const billingAddr = invoice?.billing_address || address;

  const isCod = (order.payment_method || invoice?.payment_method || '').toUpperCase() === 'CASH_ON_DELIVERY';
  const paymentMethodDisplay = isCod ? 'CASH ON DELIVERY' : (order.payment_method || invoice?.payment_method || 'ONLINE');
  const paymentStatusDisplay = isCod ? 'PAYMENT PENDING' : (order.payment_status || invoice?.payment_status || 'PENDING');

  const customerName = invoice?.customer_name || address.full_name || address.name || order.customer_name || 'Valued Patron';
  const customerPhone = invoice?.customer_phone || address.mobile_number || address.phone || order.customer_phone || 'Not Provided';
  const customerEmail = invoice?.customer_email || address.email || order.user_email || 'Not Provided';

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Pending Generation';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const invoiceNumber = invoice?.invoice_number || (invoiceLoading ? 'Generating...' : `CN-INV-2026-${String(order.id || 1).padStart(6, '0')}`);
  const invoiceDateStr = invoice?.invoice_date ? formatDateTime(invoice.invoice_date) : formatDateTime(order.created_at);
  const orderDateStr = formatDateTime(order.created_at || invoice?.order_date);

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 bg-[#FFF9F3]">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Success Header */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[#3F7D5A] shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#C69A5B] block mb-1">
            Order Confirmed & Verified
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B2523] mb-2">
            Thank You for Supporting Master Artisans!
          </h1>
          <p className="text-xs sm:text-sm text-[#6F625D]">
            Order ID: <span className="font-mono font-bold text-[#2B2523]">{displayId}</span>
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-3xl border border-[#E6D8CC] p-6 sm:p-8 craft-card-shadow space-y-6">
          {/* Estimated Delivery & Status Banner */}
          <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F4E8DC] text-[#A63D40] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6F625D] tracking-wider block">
                  Estimated Delivery
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#2B2523]">
                  3–5 Business Days (Standard Domestic Express)
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#3F7D5A] text-xs font-bold self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-[#3F7D5A] animate-pulse" />
              <span>{order.status || 'Confirmed'}</span>
            </div>
          </div>

          {/* Items Summary */}
          <div>
            <h3 className="font-serif text-base font-bold text-[#2B2523] mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C69A5B]" />
              <span>Commissioned Handcrafted Items ({items.length})</span>
            </h3>
            <div className="divide-y divide-[#E6D8CC]/60 border-y border-[#E6D8CC]/60">
              {items.map((item, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name || 'Craft item'}
                        className="w-12 h-12 rounded-xl object-cover border border-[#E6D8CC] shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-[#2B2523] truncate">
                        {item.name || `Craft Item #${item.product_id}`}
                      </p>
                      <p className="text-[11px] text-[#6F625D]">
                        Qty: {item.quantity} × ₹{Number(item.price || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-[#2B2523] shrink-0">
                    ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Delivery Destination */}
            <div className="p-4 rounded-2xl bg-[#FFF9F3]/60 border border-[#E6D8CC] space-y-1.5 text-xs text-[#6F625D]">
              <div className="flex items-center gap-1.5 font-bold text-[#2B2523] mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#A63D40]" />
                <span>Shipping Destination</span>
              </div>
              <p className="text-[#2B2523] font-medium">
                {address.street || address.address || 'Standard Registered Address'}
              </p>
              {(address.city || address.state) && (
                <p>{[address.city, address.state, address.pincode].filter(Boolean).join(', ')}</p>
              )}
              {address.phone && <p>Contact: {address.phone}</p>}
            </div>

            {/* Total Paid */}
            <div className="p-4 rounded-2xl bg-[#FFF9F3]/60 border border-[#E6D8CC] space-y-2 text-xs">
              <div className="flex justify-between text-[#6F625D]">
                <span>Total Amount:</span>
                <span className="font-bold text-[#2B2523] text-sm sm:text-base">
                  ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-[#6F625D]">
                <span>Payment Method:</span>
                <span className="font-semibold uppercase text-[11px] text-[#A63D40]">
                  {paymentMethodDisplay}
                </span>
              </div>
              <div className="flex justify-between text-[#6F625D]">
                <span>Payment Status:</span>
                <span className={`font-bold text-[11px] ${isCod ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {paymentStatusDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* ================================================================
              NEW SECTION: INVOICE & BILLING DETAILS (REQUIREMENT 1)
              ================================================================ */}
          <div className="pt-4 border-t border-[#E6D8CC] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#A63D40]/10 text-[#A63D40] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#2B2523]">
                    Invoice & Billing Details
                  </h3>
                  <p className="text-[11px] text-[#6F625D]">
                    Authenticated database-backed GST invoice generated for this order
                  </p>
                </div>
              </div>

              {/* Action Buttons: View Invoice & Download Invoice (PDF) */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F4E8DC] hover:bg-[#E6D8CC] text-[#2B2523] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5 text-[#A63D40]" />
                  <span>View Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#A63D40] hover:bg-[#8F3034] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingPdf ? 'Downloading...' : 'Download Invoice (PDF)'}</span>
                </button>
              </div>
            </div>

            {/* COD Clear Notice (Section 2 requirement) */}
            {isCod && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    PAYMENT METHOD: CASH ON DELIVERY
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-extrabold text-[10px]">
                    PAYMENT STATUS: PAYMENT PENDING
                  </span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Please keep exact cash ready upon delivery. The courier representative will issue your delivery receipt upon collection.
                </p>
              </div>
            )}

            {/* Display Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F625D] block mb-0.5">
                  Invoice Number
                </span>
                <span className="font-mono font-bold text-[#A63D40] text-xs sm:text-sm">
                  {invoiceNumber}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F625D] block mb-0.5">
                  Order ID
                </span>
                <span className="font-mono font-bold text-[#2B2523] text-xs sm:text-sm">
                  {displayId}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F625D] block mb-0.5">
                  Invoice Date
                </span>
                <span className="font-semibold text-[#2B2523]">
                  {invoiceDateStr}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F625D] block mb-0.5">
                  Order Date
                </span>
                <span className="font-semibold text-[#2B2523]">
                  {orderDateStr}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F625D] block mb-0.5">
                  Payment Method
                </span>
                <span className="font-bold text-[#2B2523] uppercase">
                  {paymentMethodDisplay}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F625D] block mb-0.5">
                  Payment Status
                </span>
                <span className={`font-bold uppercase ${isCod ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {paymentStatusDisplay}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F625D] block mb-0.5">
                  Customer Name
                </span>
                <span className="font-semibold text-[#2B2523]">
                  {customerName}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F625D] block mb-0.5">
                  Customer Phone
                </span>
                <span className="font-semibold text-[#2B2523]">
                  {customerPhone}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F625D] block mb-0.5">
                  Customer Email
                </span>
                <span className="font-semibold text-[#2B2523] truncate block">
                  {customerEmail}
                </span>
              </div>
            </div>

            {/* Addresses Display Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Billing Address */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6D8CC] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C69A5B] block">
                  Billing Address
                </span>
                <p className="font-bold text-[#2B2523]">
                  {billingAddr.name || customerName}
                </p>
                <p className="text-[#6F625D]">
                  {[billingAddr.house_number, billingAddr.street || billingAddr.address, billingAddr.area].filter(Boolean).join(', ')}
                </p>
                <p className="text-[#6F625D]">
                  {[billingAddr.city, billingAddr.state, billingAddr.pincode || billingAddr.postal_code].filter(Boolean).join(', ')}
                </p>
                <p className="text-[#6F625D]">{billingAddr.country || 'India'}</p>
              </div>

              {/* Shipping Address */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6D8CC] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C69A5B] block">
                  Shipping Address
                </span>
                <p className="font-bold text-[#2B2523]">
                  {address.name || address.full_name || customerName}
                </p>
                <p className="text-[#6F625D]">
                  {[address.house_number, address.street || address.address, address.area].filter(Boolean).join(', ')}
                </p>
                <p className="text-[#6F625D]">
                  {[address.city, address.state, address.pincode || address.postal_code].filter(Boolean).join(', ')}
                </p>
                <p className="text-[#6F625D]">{address.country || 'India'}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link
              to={`/account/orders/${order.id || order.order_id}`}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-sm transition-all text-center"
            >
              <span>Track Order & Delivery Status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#F4E8DC] text-[#2B2523] hover:bg-[#E6D8CC] text-xs font-semibold transition-all text-center"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#A63D40]" />
              <span>Explore More Crafts</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Invoice Modal for Screen View & Print */}
      {invoice && (
        <InvoiceModal
          invoice={invoice}
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
}
