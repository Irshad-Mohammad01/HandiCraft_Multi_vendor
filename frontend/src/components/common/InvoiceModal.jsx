import React, { useState } from 'react';
import { 
  X, Download, Printer, FileText, CheckCircle2, 
  Clock, MapPin, Phone, Mail, Building, ShieldCheck, 
  ExternalLink, AlertCircle
} from 'lucide-react';
import { ordersApi } from '../../api/orders';

export default function InvoiceModal({ invoice, isOpen, onClose }) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !invoice) return null;

  const isCod = (invoice.payment_method || '').toUpperCase() === 'CASH_ON_DELIVERY';
  const isPaid = (invoice.payment_status || '').toUpperCase() === 'PAID';
  const orderNum = invoice.order_number || invoice.order_id;
  const items = invoice.items || [];
  const bill = invoice.billing_address || invoice.shipping_address || {};
  const ship = invoice.shipping_address || {};

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await ordersApi.downloadInvoicePdf(orderNum, invoice.invoice_number);
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      alert('Failed to download PDF invoice. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-[#E6D8CC] shadow-2xl overflow-hidden print:shadow-none print:border-none print:max-w-none">
        
        {/* Header Action Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#FFF9F3] border-b border-[#E6D8CC] print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#A63D40]/10 text-[#A63D40] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-sm sm:text-base font-bold text-[#2B2523]">
                Tax Invoice: {invoice.invoice_number}
              </h2>
              <p className="text-[11px] text-[#6F625D]">
                Order Reference: <span className="font-mono font-bold text-[#A63D40]">{orderNum}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#E6D8CC] bg-white text-[#2B2523] text-xs font-semibold hover:bg-[#F4E8DC] transition-colors cursor-pointer"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5 text-[#6F625D]" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#A63D40] text-white text-xs font-semibold hover:bg-[#8F3034] shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Preparing PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-xl text-[#6F625D] hover:text-[#2B2523] hover:bg-[#E6D8CC]/50 transition-colors ml-1 cursor-pointer"
              aria-label="Close invoice"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible text-slate-800">
          
          {/* Brand & Meta Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-[#A63D40]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-3xl font-extrabold tracking-tight text-[#A63D40]">
                  CRAFTNEST
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#C69A5B] block mt-0.5">
                Heritage Handicrafts & Artisan Emporium
              </span>
              <div className="mt-2 text-xs text-[#6F625D] space-y-0.5">
                <p className="font-bold text-[#2B2523]">CraftNest Artisan Technologies Pvt. Ltd.</p>
                <p>CraftNest Artisan Hub, Bapu Bazaar, Jaipur, Rajasthan 302001, India</p>
                <p><strong>GSTIN:</strong> 08AAACC1234F1Z8 | <strong>State:</strong> Rajasthan (08)</p>
                <p><strong>Customer Care:</strong> care@craftnest.in | +91 141 256 7890</p>
              </div>
            </div>

            <div className="sm:text-right space-y-1 self-stretch sm:self-auto bg-[#FFF9F3] p-4 sm:p-0 rounded-2xl sm:bg-transparent border border-[#E6D8CC] sm:border-none">
              <span className="inline-block px-3 py-1 rounded-full bg-[#A63D40]/10 text-[#A63D40] text-xs font-bold uppercase tracking-wider mb-1">
                Original Tax Invoice
              </span>
              <p className="font-mono text-sm sm:text-base font-bold text-[#2B2523]">
                {invoice.invoice_number}
              </p>
              <p className="text-xs text-[#6F625D]">
                Order ID: <span className="font-mono font-bold text-[#2B2523]">{orderNum}</span>
              </p>
              <p className="text-xs text-[#6F625D]">
                Invoice Date: <span className="font-medium text-[#2B2523]">{formatDate(invoice.invoice_date)}</span>
              </p>
              <p className="text-xs text-[#6F625D]">
                Order Date: <span className="font-medium text-[#2B2523]">{formatDate(invoice.order_date)}</span>
              </p>
            </div>
          </div>

          {/* Billing & Shipping Address Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Billing Address */}
            <div className="p-4 rounded-2xl bg-[#FFF9F3]/60 border border-[#E6D8CC] space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-[#C69A5B] tracking-wider block">
                Billing To
              </span>
              <p className="font-bold text-[#2B2523] text-sm">
                {invoice.customer_name || bill.name || 'Valued Customer'}
              </p>
              <p className="text-[#6F625D]">
                {[bill.house_number, bill.street || bill.address, bill.area].filter(Boolean).join(', ')}
              </p>
              <p className="text-[#6F625D]">
                {[bill.city, bill.state, bill.pincode || bill.postal_code].filter(Boolean).join(', ')}
              </p>
              <p className="text-[#6F625D]">{bill.country || 'India'}</p>
              {(invoice.customer_phone || bill.phone) && (
                <p className="text-[#2B2523] font-medium pt-1">
                  Phone: {invoice.customer_phone || bill.phone}
                </p>
              )}
              {(invoice.customer_email || bill.email) && (
                <p className="text-[#6F625D]">Email: {invoice.customer_email || bill.email}</p>
              )}
            </div>

            {/* Shipping Destination */}
            <div className="p-4 rounded-2xl bg-[#FFF9F3]/60 border border-[#E6D8CC] space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-[#C69A5B] tracking-wider block">
                Shipping Destination
              </span>
              <p className="font-bold text-[#2B2523] text-sm">
                {ship.name || ship.full_name || invoice.customer_name || 'Valued Customer'}
              </p>
              <p className="text-[#6F625D]">
                {[ship.house_number, ship.street || ship.address, ship.area].filter(Boolean).join(', ')}
              </p>
              <p className="text-[#6F625D]">
                {[ship.city, ship.state, ship.pincode || ship.postal_code].filter(Boolean).join(', ')}
              </p>
              <p className="text-[#6F625D]">{ship.country || 'India'}</p>
              {(ship.phone || ship.mobile_number) && (
                <p className="text-[#2B2523] font-medium pt-1">
                  Contact: {ship.phone || ship.mobile_number}
                </p>
              )}
            </div>
          </div>

          {/* Payment Method & Payment Status Banner */}
          <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isCod ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">
                  Payment Method: {isCod ? 'CASH ON DELIVERY (COD)' : (invoice.payment_method || 'ONLINE PAYMENT')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isCod ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-200/80 text-emerald-900'
                }`}>
                  {isCod ? 'PAYMENT PENDING' : (invoice.payment_status || 'PENDING')}
                </span>
              </div>
              {isCod && (
                <p className="text-[11px] text-amber-800">
                  Note: Payment is due in cash upon delivery to courier personnel. Not collected prior to delivery.
                </p>
              )}
            </div>

            <div className="font-mono text-xs font-bold shrink-0">
              Grand Total: ₹{Number(invoice.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Product Items Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#E6D8CC]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#A63D40] text-white">
                  <th className="py-2.5 px-3 font-semibold">Product & Artisan</th>
                  <th className="py-2.5 px-2 font-semibold">Product ID</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Qty</th>
                  <th className="py-2.5 px-2 text-right font-semibold">Unit Price</th>
                  <th className="py-2.5 px-2 text-right font-semibold">Taxable Amt</th>
                  <th className="py-2.5 px-2 text-center font-semibold">GST Rate</th>
                  <th className="py-2.5 px-2 text-right font-semibold">GST Amt</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D8CC]">
                {items.map((it, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-[#FFF9F3]/50' : 'bg-white'}>
                    <td className="py-3 px-3 min-w-[180px]">
                      <p className="font-bold text-[#2B2523]">{it.name}</p>
                      <p className="text-[10px] text-[#6F625D]">Artisan: {it.artisan_name || 'Craft Artisan'}</p>
                    </td>
                    <td className="py-3 px-2 font-mono text-[11px] text-[#6F625D]">
                      {it.product_id || 'CN-001'}
                    </td>
                    <td className="py-3 px-2 text-center font-semibold text-[#2B2523]">
                      {it.quantity}
                    </td>
                    <td className="py-3 px-2 text-right text-[#6F625D]">
                      ₹{Number(it.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-right text-[#6F625D]">
                      ₹{Number(it.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-center text-[#6F625D]">
                      {it.gst_rate || 5.0}%
                    </td>
                    <td className="py-3 px-2 text-right text-[#6F625D]">
                      ₹{Number(it.gst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#2B2523]">
                      ₹{Number(it.final_amount || (it.unit_price * it.quantity)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Terms and Authentic Guarantee */}
            <div className="space-y-2 text-[11px] text-[#6F625D]">
              <p className="font-bold text-[#2B2523] uppercase tracking-wider text-[10px]">
                Authenticity & Patron Guarantee
              </p>
              <p>• Every handcrafted item is certified 100% authentic and ethically sourced from verified master artisans.</p>
              <p>• Standard domestic return policy: Claims must be initiated within 7 days of package delivery.</p>
              <p>• For any inquiries, reach our dedicated artisan care team at <strong>care@craftnest.in</strong>.</p>
            </div>

            {/* Calculations Breakdown */}
            <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] space-y-2 text-xs">
              <div className="flex justify-between text-[#6F625D]">
                <span>Subtotal (Taxable Value):</span>
                <span className="font-semibold text-[#2B2523]">
                  ₹{Number(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {(invoice.cgst_amount > 0 || invoice.sgst_amount > 0) ? (
                <>
                  <div className="flex justify-between text-[#6F625D]">
                    <span>CGST (2.5%):</span>
                    <span className="font-semibold text-[#2B2523]">
                      ₹{Number(invoice.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#6F625D]">
                    <span>SGST (2.5%):</span>
                    <span className="font-semibold text-[#2B2523]">
                      ₹{Number(invoice.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[#6F625D]">
                  <span>IGST (5.0%):</span>
                  <span className="font-semibold text-[#2B2523]">
                    ₹{Number(invoice.igst_amount || invoice.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-[#6F625D]">
                <span>Shipping Charges:</span>
                <span className="font-semibold text-[#3F7D5A]">
                  {Number(invoice.shipping_charges || 0) === 0 ? 'FREE' : `₹${Number(invoice.shipping_charges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </span>
              </div>

              <div className="pt-2 border-t border-[#E6D8CC] flex justify-between items-center text-sm font-bold text-[#A63D40]">
                <span>Grand Total:</span>
                <span className="text-base sm:text-lg">
                  ₹{Number(invoice.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-1 flex justify-between items-center text-xs font-semibold">
                <span className="text-[#6F625D]">
                  {isCod ? 'Amount Payable (COD):' : 'Amount Paid (Online Verified):'}
                </span>
                <span className={isCod ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                  ₹{Number(invoice.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Computer Generated Disclaimer */}
          <div className="pt-4 border-t border-[#E6D8CC] text-center text-[10px] text-[#6F625D] italic">
            This is a computer-generated tax invoice issued by CRAFTNEST. No physical signature is required under Information Technology Act, 2000.
          </div>
        </div>

      </div>
    </div>
  );
}
