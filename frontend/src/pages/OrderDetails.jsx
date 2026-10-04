import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Package, Truck, CheckCircle2, AlertCircle, 
  MapPin, ShieldCheck, ChevronRight, FileText, Download 
} from 'lucide-react';
import { ordersApi } from '../api/orders';
import LoadingSpinner from '../components/common/LoadingSpinner';
import InvoiceModal from '../components/common/InvoiceModal';

const TRACKING_STEPS = [
  { key: 'Placed', label: 'Order Placed', desc: 'Artisan order placed' },
  { key: 'Confirmed', label: 'Order Confirmed', desc: 'Artisan order verified' },
  { key: 'Packed', label: 'Artisan Packed', desc: 'Securely packaged' },
  { key: 'Shipped', label: 'Dispatched in Transit', desc: 'Shipped via carrier' },
  { key: 'Delivered', label: 'Delivered', desc: 'Safely handed over to patron' },
];

export default function OrderDetails() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadOrder() {
      try {
        let orderData = null;
        try {
          orderData = await ordersApi.getById(orderId);
        } catch (apiErr) {
          console.warn('Direct getById failed, attempting fallback to getAll:', apiErr);
          const res = await ordersApi.getAll();
          const list = res.orders || res || [];
          orderData = list.find(
            (o) => String(o.id) === String(orderId) || String(o.order_id) === String(orderId)
          );
        }

        if (isMounted) {
          if (orderData) {
            setOrder(orderData);
            // Pre-fetch invoice details if available
            try {
              const invRes = await ordersApi.getInvoice(orderData.order_id || orderData.id);
              if (invRes && invRes.invoice && isMounted) {
                setInvoice(invRes.invoice);
              }
            } catch (invErr) {
              console.log('Invoice pre-fetch notice:', invErr);
            }
          } else {
            setError(`Order #${orderId} was not found in your account records.`);
          }
        }
      } catch (err) {
        console.error('Failed to load order details:', err);
        if (isMounted) setError('Unable to retrieve order details from the server.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (orderId) {
      loadOrder();
    }
    return () => { isMounted = false; };
  }, [orderId]);

  const handleViewInvoice = async () => {
    if (invoice) {
      setIsInvoiceModalOpen(true);
      return;
    }
    const ordRef = order?.order_id || order?.id || orderId;
    try {
      setLoadingInvoice(true);
      const res = await ordersApi.getInvoice(ordRef);
      if (res && res.invoice) {
        setInvoice(res.invoice);
        setIsInvoiceModalOpen(true);
      } else {
        alert('Invoice details not found.');
      }
    } catch (err) {
      console.error('Failed to view invoice:', err);
      alert(err.response?.data?.message || 'Could not load invoice.');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleDownloadInvoice = async () => {
    const ordRef = order?.order_id || order?.id || orderId;
    try {
      setDownloadingPdf(true);
      await ordersApi.downloadInvoicePdf(ordRef, invoice?.invoice_number || order?.invoice_number);
    } catch (err) {
      console.error('Failed to download invoice:', err);
      alert(err.response?.data?.message || 'Could not download invoice PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FFF9F3]">
        <LoadingSpinner label="Retrieving handicraft order details..." />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#FFF9F3]">
        <div className="max-w-md w-full text-center p-8 bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow">
          <AlertCircle className="w-12 h-12 text-[#B84242] mx-auto mb-3" />
          <h2 className="font-serif text-2xl font-bold text-[#2B2523] mb-2">Order Not Found</h2>
          <p className="text-xs sm:text-sm text-[#6F625D] mb-6 leading-relaxed">
            {error || 'We could not locate this order in your purchase history.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/account/orders"
              className="py-2.5 px-5 rounded-xl bg-[#A63D40] text-white text-xs font-semibold text-center"
            >
              Return to My Orders
            </Link>
            <Link
              to="/"
              className="py-2.5 px-5 rounded-xl bg-[#F4E8DC] text-[#2B2523] text-xs font-semibold text-center"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = order.items || [];
  const status = order.status || 'Confirmed';
  const isCancelled = status.toLowerCase() === 'cancelled';
  const address = order.shipping_address || {};

  // Compute active step index for the progress timeline
  const getStepIndex = (currStatus) => {
    const s = (currStatus || '').toLowerCase();
    if (s.includes('deliver')) return 4;
    if (s.includes('ship') || s.includes('out')) return 3;
    if (s.includes('pack')) return 2;
    if (s.includes('confirm')) return 1;
    return 0; // Placed / Pending
  };

  const currentStepIdx = getStepIndex(status);

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 bg-[#FFF9F3]">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#6F625D]">
          <Link to="/account/orders" className="hover:text-[#A63D40] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Orders</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-[#E6D8CC]" />
          <span className="font-semibold text-[#2B2523]">{order.order_id || `#${order.id}`}</span>
        </div>

        {/* Order Header Summary */}
        <div className="bg-white rounded-3xl border border-[#E6D8CC] p-6 sm:p-8 craft-card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523]">
                Order {order.order_id || `#${order.id}`}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isCancelled
                    ? 'bg-rose-50 text-[#B84242] border border-rose-200'
                    : status === 'Delivered'
                    ? 'bg-emerald-50 text-[#3F7D5A] border border-emerald-200'
                    : 'bg-[#FFF9F3] text-[#A63D40] border border-[#E6D8CC]'
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-[#6F625D]">
              Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#6F625D] tracking-wider block sm:text-right">
                Total Order Value
              </span>
              <span className="font-bold text-xl sm:text-2xl text-[#2B2523] block sm:text-right">
                ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleViewInvoice}
                disabled={loadingInvoice}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E6D8CC] text-[#2B2523] hover:border-[#A63D40] hover:text-[#A63D40] transition-colors shadow-sm disabled:opacity-50"
              >
                <FileText size={14} className="text-[#A63D40]" />
                <span>{loadingInvoice ? 'Loading...' : 'View Invoice'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={downloadingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#A63D40] text-white hover:bg-[#8B3235] transition-colors shadow-sm disabled:opacity-50"
              >
                <Download size={14} />
                <span>{downloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Visual Tracking Timeline */}
        <div className="bg-white rounded-3xl border border-[#E6D8CC] p-6 sm:p-8 craft-card-shadow">
          <h2 className="font-serif text-lg font-bold text-[#2B2523] mb-6 flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#A63D40]" />
            <span>Delivery Tracking Timeline</span>
          </h2>

          {isCancelled ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-[#B84242] flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>This handcrafted commission was cancelled. If you were debited, refunds reflect within 3–5 business days.</span>
            </div>
          ) : (
            <div className="relative">
              {/* Stepper Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
                {TRACKING_STEPS.map((st, idx) => {
                  const isCompleted = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div key={st.key} className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                          isCompleted
                            ? 'bg-[#A63D40] text-white shadow-sm'
                            : 'bg-[#FFF9F3] text-[#6F625D] border border-[#E6D8CC]'
                        } ${isCurrent ? 'ring-4 ring-[#A63D40]/20' : ''}`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <span className={`text-xs font-bold block ${isCompleted ? 'text-[#2B2523]' : 'text-[#6F625D]'}`}>
                          {st.label}
                        </span>
                        <span className="text-[10px] text-[#6F625D] leading-tight block">
                          {st.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Carrier & Tracking Number / AWB Display */}
              {(order.tracking_id || order.tracking_number) && (
                <div className="mt-6 p-4 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-between flex-wrap gap-3 text-xs text-[#0369A1]">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#0284C7]" />
                    <span>Fulfillment Carrier: <strong className="text-[#0C4A6E]">{order.carrier || 'Indian Postal / Courier'}</strong></span>
                  </div>
                  <div>
                    <span>Tracking / AWB Number: <strong className="text-[#0C4A6E] tracking-wider">{order.tracking_id || order.tracking_number}</strong></span>
                  </div>
                </div>
              )}

              {/* Milestone History Journey */}
              {order.tracking_history && order.tracking_history.length > 0 && (
                <div className="mt-6 pt-5 border-t border-[#E6D8CC]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A63D40] mb-3">
                    Fulfillment Milestones & Audit Trail
                  </h3>
                  <div className="space-y-2.5">
                    {order.tracking_history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between flex-wrap gap-2 text-xs text-[#6F625D]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#3F7D5A]" />
                          <strong className="text-[#2B2523]">{h.status}</strong>
                          <span>— {h.message || 'Milestone recorded'}</span>
                        </div>
                        <span className="text-[11px] text-[#6F625D]">
                          {h.updated_at ? new Date(h.updated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items List Card */}
        <div className="bg-white rounded-3xl border border-[#E6D8CC] p-6 sm:p-8 craft-card-shadow">
          <h2 className="font-serif text-lg font-bold text-[#2B2523] mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#C69A5B]" />
            <span>Commissioned Items ({items.length})</span>
          </h2>

          <div className="divide-y divide-[#E6D8CC]/60">
            {items.map((item, idx) => (
              <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-[#E6D8CC] shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] shrink-0">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link
                      to={`/products/${item.product_id || item.id}`}
                      className="text-sm font-bold text-[#2B2523] hover:text-[#A63D40] transition-colors truncate block"
                    >
                      {item.name || `Handcrafted Item #${item.product_id}`}
                    </Link>
                    <p className="text-xs text-[#6F625D] mt-0.5">
                      Quantity: {item.quantity} × ₹{Number(item.price || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-sm font-bold text-[#2B2523]">
                    ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('en-IN')}
                  </span>
                  <Link
                    to={`/products/${item.product_id || item.id}`}
                    className="text-xs font-semibold text-[#A63D40] hover:underline"
                  >
                    View Craft
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping Destination & Payment Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-[#E6D8CC] p-6 craft-card-shadow space-y-2 text-xs">
            <h3 className="font-serif text-base font-bold text-[#2B2523] flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-[#A63D40]" />
              <span>Delivery Destination</span>
            </h3>
            <p className="font-semibold text-[#2B2523] text-sm">
              {address.street || address.address || 'Registered Address'}
            </p>
            {(address.city || address.state) && (
              <p className="text-[#6F625D]">
                {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
              </p>
            )}
            {address.phone && <p className="text-[#6F625D]">Contact: {address.phone}</p>}
          </div>

          <div className="bg-white rounded-3xl border border-[#E6D8CC] p-6 craft-card-shadow space-y-2.5 text-xs">
            <h3 className="font-serif text-base font-bold text-[#2B2523] flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-[#C69A5B]" />
              <span>Payment Details</span>
            </h3>
            <div className="flex justify-between text-[#6F625D]">
              <span>Payment Method:</span>
              <span className="font-bold uppercase text-[#2B2523]">{order.payment_method || 'Online / COD'}</span>
            </div>
            <div className="flex justify-between text-[#6F625D]">
              <span>Payment Status:</span>
              <span className={`font-bold ${order.payment_status?.toUpperCase() === 'PAID' ? 'text-[#3F7D5A]' : 'text-[#D97706]'}`}>
                {order.payment_status || 'PENDING'}
              </span>
            </div>
            <div className="flex justify-between text-[#6F625D] pt-2 border-t border-[#E6D8CC]">
              <span className="font-bold text-[#2B2523]">Grand Total:</span>
              <span className="font-bold text-[#A63D40] text-base">
                ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice & Billing Details Section */}
        <div className="bg-white rounded-3xl border border-[#E6D8CC] p-6 sm:p-8 craft-card-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E6D8CC]">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#A63D40]" />
                <h2 className="font-serif text-lg font-bold text-[#2B2523]">Invoice & Billing Details</h2>
              </div>
              <p className="text-xs text-[#6F625D] mt-0.5">
                Official tax invoice record generated under GST legislation for your handcrafted purchase.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleViewInvoice}
                disabled={loadingInvoice}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E6D8CC] text-[#2B2523] hover:border-[#A63D40] hover:text-[#A63D40] transition-colors shadow-sm disabled:opacity-50"
              >
                <FileText size={14} className="text-[#A63D40]" />
                <span>{loadingInvoice ? 'Loading...' : 'View Invoice'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={downloadingPdf}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#A63D40] text-white hover:bg-[#8B3235] transition-colors shadow-sm disabled:opacity-50"
              >
                <Download size={14} />
                <span>{downloadingPdf ? 'Downloading...' : 'Download Invoice (PDF)'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-5 text-xs">
            {/* Column 1: Order & Invoice Numbers */}
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-[#6F625D] uppercase tracking-wider block">Invoice Number</span>
                <span className="font-mono font-bold text-[#A63D40] text-sm mt-0.5 block">
                  {invoice?.invoice_number || order?.invoice_number || 'Generated on placement'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#6F625D] uppercase tracking-wider block">Order ID</span>
                <span className="font-bold text-[#2B2523] mt-0.5 block">
                  {order.order_id || `#${order.id}`}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#6F625D] uppercase tracking-wider block">Invoice Date</span>
                <span className="text-[#2B2523] mt-0.5 block">
                  {invoice?.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today')}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#6F625D] uppercase tracking-wider block">Order Date</span>
                <span className="text-[#2B2523] mt-0.5 block">
                  {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                </span>
              </div>
            </div>

            {/* Column 2: Payment & Customer Details */}
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-[#6F625D] uppercase tracking-wider block">Payment Method</span>
                <span className="font-bold uppercase text-[#2B2523] mt-0.5 block">
                  {order.payment_method || 'Online / COD'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#6F625D] uppercase tracking-wider block">Payment Status</span>
                <span className={`font-bold uppercase mt-0.5 block ${order.payment_status?.toUpperCase() === 'PAID' ? 'text-[#3F7D5A]' : 'text-[#D97706]'}`}>
                  {order.payment_status || 'PENDING'}
                </span>
                {order.payment_method?.toLowerCase() === 'cod' && (
                  <p className="text-[10px] text-[#A63D40] mt-1 italic font-medium">
                    PAYMENT STATUS: PAYMENT PENDING (Due on Cash on Delivery)
                  </p>
                )}
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#6F625D] uppercase tracking-wider block">Customer Details</span>
                <span className="font-semibold text-[#2B2523] mt-0.5 block">
                  {order.customer_name || address.name || address.recipient_name || 'Valued Patron'}
                </span>
                <span className="text-[#6F625D] block">
                  {order.customer_phone || address.phone || 'Phone on file'}
                </span>
                <span className="text-[#6F625D] block">
                  {order.customer_email || 'patron@craftnest.in'}
                </span>
              </div>
            </div>

            {/* Column 3: Addresses */}
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-[#6F625D] uppercase tracking-wider block">Billing Address</span>
                <p className="text-[#2B2523] mt-0.5 leading-relaxed">
                  {order.billing_address?.street || address.street || address.address || 'Same as shipping destination'}<br />
                  {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#6F625D] uppercase tracking-wider block">Shipping Address</span>
                <p className="text-[#2B2523] mt-0.5 leading-relaxed">
                  {address.street || address.address || 'Designated Address'}<br />
                  {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice View Modal */}
      <InvoiceModal
        invoice={invoice}
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />
    </div>
  );
}
