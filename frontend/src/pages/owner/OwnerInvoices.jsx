import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Search, Filter, Download, Eye, Calendar, 
  CreditCard, CheckCircle2, Clock, RefreshCw, AlertCircle, FileSpreadsheet, ArrowUpDown
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import MetricCard from '../../components/dashboard/MetricCard';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import InvoiceModal from '../../components/common/InvoiceModal';

export default function OwnerInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal & Download states
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {
        page,
        limit: 20,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.payment_status = statusFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await adminApi.getInvoices(params);
      if (res) {
        setInvoices(res.invoices || []);
        setStats(res.stats || null);
        setTotalPages(res.pages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setErrorMsg(err.response?.data?.message || 'Could not retrieve invoice records.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, startDate, endDate]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadInvoices();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleViewInvoice = (inv) => {
    setSelectedInvoice(inv);
    setIsModalOpen(true);
  };

  const handleDownloadPdf = async (inv) => {
    try {
      setDownloadingId(inv.id);
      await adminApi.downloadInvoicePdf(inv.order_id, inv.invoice_number);
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      alert('Could not download PDF. Please verify backend server status.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      await adminApi.exportInvoicesCsv();
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Could not export invoices CSV.');
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <DashboardLayout role="owner" activeNav="invoices">
      <div className="space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-7 h-7 text-[#A63D40]" />
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523]">
                Invoice Management & Billing Hub
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#6F625D]">
              Review database-generated GST tax invoices, audit patron payments, and download stamped PDF records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadInvoices}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E6D8CC] text-[#2B2523] hover:border-[#A63D40] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exportingCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#3F7D5A] text-white hover:bg-[#326447] transition-colors shadow-sm disabled:opacity-50"
            >
              <FileSpreadsheet size={15} />
              <span>{exportingCsv ? 'Exporting...' : 'Export Invoices CSV'}</span>
            </button>
          </div>
        </div>

        {/* Aggregate Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Invoices"
            value={totalCount || stats?.total_invoices || 0}
            icon={FileText}
            trend="Sequential CN-INV series"
          />
          <MetricCard
            title="Total Invoiced Value"
            value={`₹${Number(stats?.total_amount || 0).toLocaleString('en-IN')}`}
            icon={CreditCard}
            trend="All generated orders"
          />
          <MetricCard
            title="Settled Revenue (Paid)"
            value={`₹${Number(stats?.paid_amount || 0).toLocaleString('en-IN')}`}
            icon={CheckCircle2}
            trend="Gateway / COD Settled"
          />
          <MetricCard
            title="Pending Payment (COD)"
            value={`₹${Number(stats?.pending_amount || 0).toLocaleString('en-IN')}`}
            icon={Clock}
            trend="Due on Cash Delivery"
          />
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-[#E6D8CC] p-4 sm:p-5 craft-card-shadow space-y-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Keyword Search */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-[#6F625D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Invoice #, Order ID, Customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E6D8CC] bg-[#FFF9F3]/40 text-[#2B2523] placeholder-[#6F625D]/60 focus:outline-none focus:border-[#A63D40]"
              />
            </div>

            {/* Payment Status Dropdown */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6D8CC] bg-[#FFF9F3]/40 text-[#2B2523] focus:outline-none focus:border-[#A63D40]"
              >
                <option value="">All Payment Statuses</option>
                <option value="PAID">Paid / Completed</option>
                <option value="PENDING">Pending (COD/Gateway)</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6D8CC] bg-[#FFF9F3]/40 text-[#2B2523] focus:outline-none focus:border-[#A63D40]"
                title="Filter by Start Date"
              />
            </div>

            {/* End Date */}
            <div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6D8CC] bg-[#FFF9F3]/40 text-[#2B2523] focus:outline-none focus:border-[#A63D40]"
                title="Filter by End Date"
              />
            </div>
          </form>

          {/* Active Filter Pills & Reset */}
          {(search || statusFilter || startDate || endDate) && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E6D8CC]">
              <span className="text-[#6F625D]">
                Filters active &middot; Showing filtered results
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[#A63D40] font-semibold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#B84242] flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Invoices Table Card */}
        <div className="bg-white rounded-2xl border border-[#E6D8CC] craft-card-shadow overflow-hidden">
          {loading ? (
            <div className="py-16">
              <LoadingSpinner label="Querying Neon PostgreSQL invoice records..." />
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-16 px-6 text-center text-[#6F625D]">
              <FileText size={44} className="mx-auto text-[#E6D8CC] mb-3" />
              <h3 className="font-serif text-lg font-bold text-[#2B2523] mb-1">No Invoices Found</h3>
              <p className="text-xs max-w-sm mx-auto">
                {search || statusFilter || startDate || endDate
                  ? 'No invoice records matched your query filters. Try clearing filters.'
                  : 'Customer invoices are generated automatically whenever an order is successfully placed.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF6F0] border-b border-[#E6D8CC] text-[#2B2523] font-semibold">
                    <th className="py-3.5 px-4">Invoice Number</th>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Customer Details</th>
                    <th className="py-3.5 px-4">Invoice Date</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Payment Status</th>
                    <th className="py-3.5 px-4 text-right">Grand Total</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6D8CC]/60">
                  {invoices.map((inv) => {
                    const cust = inv.customer || {};
                    const ship = inv.shipping_address_snapshot || {};
                    const isCod = (inv.payment_method || '').toLowerCase() === 'cod';
                    const isPaid = (inv.payment_status || '').toUpperCase() === 'PAID';

                    return (
                      <tr key={inv.id} className="hover:bg-[#FFF9F3]/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#A63D40]">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#2B2523]">
                          {inv.order_id}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-[#2B2523]">{cust.name || ship.name || 'Patron'}</p>
                          <p className="text-[11px] text-[#6F625D]">{cust.email || 'patron@craftnest.in'}</p>
                          {(ship.city || ship.state) && (
                            <p className="text-[10px] text-[#6F625D]">
                              {[ship.city, ship.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#6F625D]">
                          {inv.invoice_date
                            ? new Date(inv.invoice_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2B2523]">
                            {inv.payment_method || 'Online'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-50 text-[#3F7D5A] border border-emerald-200'
                                : isCod
                                ? 'bg-amber-50 text-[#D97706] border border-amber-200'
                                : 'bg-gray-100 text-[#6F625D]'
                            }`}
                          >
                            {inv.payment_status || 'PENDING'}
                          </span>
                          {isCod && !isPaid && (
                            <span className="block text-[9px] text-[#D97706] font-medium mt-0.5">
                              Due on delivery
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-sm text-[#2B2523]">
                          ₹{Number(inv.grand_total || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewInvoice(inv)}
                              title="View Invoice"
                              className="p-1.5 rounded-lg border border-[#E6D8CC] text-[#2B2523] hover:bg-[#FAF6F0] hover:text-[#A63D40] hover:border-[#A63D40] transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(inv)}
                              disabled={downloadingId === inv.id}
                              title="Download PDF"
                              className="p-1.5 rounded-lg bg-[#A63D40] text-white hover:bg-[#8B3235] transition-colors disabled:opacity-50"
                            >
                              <Download size={14} className={downloadingId === inv.id ? 'animate-bounce' : ''} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#FAF6F0] border-t border-[#E6D8CC] text-xs">
              <span className="text-[#6F625D]">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total invoices)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded-lg border border-[#E6D8CC] bg-white text-[#2B2523] disabled:opacity-40 hover:bg-[#FFF9F3]"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded-lg border border-[#E6D8CC] bg-white text-[#2B2523] disabled:opacity-40 hover:bg-[#FFF9F3]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice View Modal */}
      <InvoiceModal
        invoice={selectedInvoice}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </DashboardLayout>
  );
}
