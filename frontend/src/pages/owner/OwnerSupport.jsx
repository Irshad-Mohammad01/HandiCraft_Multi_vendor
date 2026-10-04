import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Headphones,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileQuestion,
  ShoppingBag,
  Mail,
  User,
  Calendar,
  X,
  ChevronDown,
  ArrowUpDown,
  ExternalLink,
  ShieldCheck,
  Check,
  CornerDownRight,
  Info
} from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { supportApi } from '../../api/support';

export default function OwnerSupport() {
  const { ticketId: paramTicketId } = useParams();
  const navigate = useNavigate();

  // State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Selected Ticket for Conversation View
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('Replied');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyFeedback, setReplyFeedback] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch Tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        date: dateFilter !== 'all' ? dateFilter : undefined,
        sort: sortOrder,
      };
      const data = await supportApi.getAllTickets(params);
      const list = Array.isArray(data) ? data : data?.items || [];
      setTickets(list);

      // Compute statistics based on full list or state
      const total = list.length;
      const open = list.filter(t => t.status === 'Open' || t.status === 'Pending').length;
      const in_progress = list.filter(t => t.status === 'In Progress').length;
      const resolved = list.filter(t => t.status === 'Resolved').length;
      setStats({ total, open, in_progress, resolved });
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, dateFilter, sortOrder]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Open ticket from URL param or on click
  const openTicketDetail = async (ticket) => {
    const tId = ticket?.id || ticket;
    setLoadingDetails(true);
    setReplyFeedback(null);
    setReplyText('');
    setReplyStatus('Replied');
    try {
      const details = await supportApi.getTicketDetails(tId);
      setSelectedTicket(details);
    } catch (err) {
      console.error('Failed to fetch ticket conversation:', err);
      // Fallback to local ticket object if API single-fetch fails
      if (typeof ticket === 'object') setSelectedTicket(ticket);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (paramTicketId) {
      openTicketDetail(paramTicketId);
    }
  }, [paramTicketId]);

  // Handle Send Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setSendingReply(true);
    setReplyFeedback(null);
    try {
      const res = await supportApi.replyToTicket(selectedTicket.id, {
        message: replyText.trim(),
        status: replyStatus,
      });

      const updatedTicket = res.ticket || {
        ...selectedTicket,
        status: replyStatus,
        replies: [...(selectedTicket.replies || []), res.reply],
      };

      setSelectedTicket(updatedTicket);
      setReplyText('');
      setReplyFeedback({
        type: 'success',
        message: 'Reply sent successfully!',
        emailSent: res.email_sent,
      });

      // Update in main list
      setTickets(prev =>
        prev.map(t => (t.id === selectedTicket.id ? { ...t, status: updatedTicket.status } : t))
      );
    } catch (err) {
      console.error('Failed to send reply:', err);
      setReplyFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit reply. Please try again.',
      });
    } finally {
      setSendingReply(false);
    }
  };

  // Handle Direct Status Update
  const handleQuickStatusChange = async (ticketId, newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await supportApi.updateTicketStatus(ticketId, newStatus);
      const updated = res.ticket || {};

      setTickets(prev =>
        prev.map(t => (t.id === ticketId ? { ...t, status: res.status || newStatus } : t))
      );

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: res.status || newStatus }));
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
      alert('Unable to update ticket status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Clear filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setDateFilter('all');
    setSortOrder('newest');
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'open':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Open
          </span>
        );
      case 'in progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            In Progress
          </span>
        );
      case 'replied':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Replied
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  // Category Badge Helper
  const getCategoryBadge = (category) => {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF9F3] text-[#A63D40] border border-[#E6D8CC]">
        {category || 'General'}
      </span>
    );
  };

  return (
    <DashboardLayout role="owner" activeNav="support">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40]">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#2B2523]">
                Customer Support Management
              </h1>
              <p className="text-xs text-[#6F625D]">
                Receive, review, manage, and reply to customer inquiries, complaints, and reports.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchTickets}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#2B2523] bg-white border border-[#E6D8CC] hover:bg-[#FFF9F3] transition-colors shadow-2xs cursor-pointer self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Inbox</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-[#E6D8CC] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6F625D]">Total Inquiries</p>
            <p className="text-2xl font-bold text-[#2B2523] mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40]">
            <MessageSquare size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6D8CC] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700">Open / Pending</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{stats.open}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6D8CC] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-700">In Progress</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.in_progress}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6D8CC] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-700">Resolved</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.resolved}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E6D8CC] shadow-2xs mb-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6F625D]" />
            <input
              type="text"
              placeholder="Search by Ticket ID, customer name, email, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E6D8CC] bg-white focus:outline-none focus:border-[#A63D40] text-[#2B2523]"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6D8CC] bg-white focus:outline-none focus:border-[#A63D40] text-[#2B2523]"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Replied">Replied</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6D8CC] bg-white focus:outline-none focus:border-[#A63D40] text-[#2B2523]"
            >
              <option value="all">All Categories</option>
              <option value="General Inquiry">General Inquiry</option>
              <option value="Order Issue">Order Issue</option>
              <option value="Payment Issue">Payment Issue</option>
              <option value="Product Issue">Product Issue</option>
              <option value="Complaint">Complaint</option>
              <option value="Report">Report</option>
              <option value="Custom Craft Request">Custom Craft Request</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="md:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6D8CC] bg-white focus:outline-none focus:border-[#A63D40] text-[#2B2523]"
            >
              <option value="all">Any Date</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="md:col-span-2 flex items-center gap-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6D8CC] bg-white focus:outline-none focus:border-[#A63D40] text-[#2B2523]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            {(search || statusFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all' || sortOrder !== 'newest') && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset filters"
                className="p-2 rounded-lg border border-[#E6D8CC] text-[#6F625D] hover:bg-[#FFF9F3] hover:text-[#A63D40] transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Inbox Table */}
      <div className="bg-white rounded-xl border border-[#E6D8CC] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading support tickets..." />
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] mx-auto mb-3">
              <Headphones size={24} />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#2B2523] mb-1">
              No Support Tickets Found
            </h3>
            <p className="text-xs text-[#6F625D] max-w-sm mx-auto">
              There are no customer inquiries matching your current filters. Tickets submitted through Customer Care will appear here automatically.
            </p>
            {(search || statusFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#A63D40] bg-[#FFF9F3] border border-[#E6D8CC] hover:bg-[#F4E8DC] transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523] font-semibold">
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Subject & Query</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D8CC]/60">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openTicketDetail(t)}
                    className="hover:bg-[#FFF9F3]/60 transition-colors cursor-pointer"
                  >
                    {/* Ticket ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[#A63D40]">
                      {t.ticket_id || `TKT-${String(t.id).padStart(4, '0')}`}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#A63D40] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {(t.name || 'C').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#2B2523] truncate max-w-[140px]">
                            {t.name || 'Customer'}
                          </p>
                          <p className="text-[11px] text-[#6F625D] truncate max-w-[140px]">
                            {t.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Subject & Snippet */}
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <p className="font-semibold text-[#2B2523] truncate">
                        {t.subject || 'Support Query'}
                      </p>
                      <p className="text-[11px] text-[#6F625D] truncate mt-0.5">
                        {t.message}
                      </p>
                      {t.replies && t.replies.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-purple-700 font-medium mt-1">
                          <CornerDownRight size={10} />
                          <span>{t.replies.length} {t.replies.length === 1 ? 'reply' : 'replies'}</span>
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      {getCategoryBadge(t.category)}
                    </td>

                    {/* Order Ref */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#6F625D]">
                      {t.order_id ? (
                        <span className="inline-flex items-center gap-1 text-[#2B2523] bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                          <ShoppingBag size={11} className="text-[#C69A5B]" />
                          {t.order_id}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Date / Time */}
                    <td className="py-3.5 px-4 text-[#6F625D] whitespace-nowrap">
                      <div>
                        {t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }) : '—'}
                      </div>
                      <div className="text-[10px] text-[#6F625D]/70">
                        {t.created_at ? new Date(t.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : ''}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(t.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTicketDetail(t);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#A63D40] bg-[#FFF9F3] border border-[#E6D8CC] hover:bg-[#A63D40] hover:text-white transition-colors cursor-pointer"
                      >
                        View & Reply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Conversation Detail Drawer / Modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex justify-end transition-opacity duration-300"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-2xl bg-white h-screen shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E6D8CC] bg-[#FFF9F3] shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-sm font-bold text-[#A63D40]">
                      {selectedTicket.ticket_id || `TKT-${String(selectedTicket.id).padStart(4, '0')}`}
                    </span>
                    {getStatusBadge(selectedTicket.status)}
                    {getCategoryBadge(selectedTicket.category)}
                  </div>
                  <h2 className="font-serif text-xl font-bold text-[#2B2523] leading-snug">
                    {selectedTicket.subject || 'Support Query'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded-lg text-[#6F625D] hover:bg-[#E6D8CC]/50 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Patron & Order Context Strip */}
              <div className="mt-4 pt-3 border-t border-[#E6D8CC]/70 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[#6F625D] block text-[10px] uppercase font-bold">Patron</span>
                  <span className="font-semibold text-[#2B2523] block">{selectedTicket.name}</span>
                  <span className="text-[#6F625D] text-[11px] block">{selectedTicket.email}</span>
                </div>
                <div>
                  <span className="text-[#6F625D] block text-[10px] uppercase font-bold">Related Order</span>
                  {selectedTicket.order_id ? (
                    <span className="font-mono font-semibold text-[#2B2523] flex items-center gap-1 mt-0.5">
                      <ShoppingBag size={12} className="text-[#C69A5B]" />
                      {selectedTicket.order_id}
                    </span>
                  ) : (
                    <span className="text-[#6F625D] italic">None specified</span>
                  )}
                </div>
                <div>
                  <span className="text-[#6F625D] block text-[10px] uppercase font-bold">Submitted At</span>
                  <span className="text-[#2B2523]">
                    {selectedTicket.created_at
                      ? new Date(selectedTicket.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Status Update Quick Toggles */}
              <div className="mt-3.5 pt-3 border-t border-[#E6D8CC]/70 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-[#6F625D]">Update Status:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={updatingStatus || selectedTicket.status === 'Open'}
                    onClick={() => handleQuickStatusChange(selectedTicket.id, 'Open')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      selectedTicket.status === 'Open'
                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                        : 'bg-white border-[#E6D8CC] text-[#2B2523] hover:bg-amber-50'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus || selectedTicket.status === 'In Progress'}
                    onClick={() => handleQuickStatusChange(selectedTicket.id, 'In Progress')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      selectedTicket.status === 'In Progress'
                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                        : 'bg-white border-[#E6D8CC] text-[#2B2523] hover:bg-blue-50'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus || selectedTicket.status === 'Resolved'}
                    onClick={() => handleQuickStatusChange(selectedTicket.id, 'Resolved')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      selectedTicket.status === 'Resolved'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                        : 'bg-white border-[#E6D8CC] text-[#2B2523] hover:bg-emerald-50'
                    }`}
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>

            {/* Conversation History Pane */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingDetails ? (
                <div className="py-12">
                  <LoadingSpinner text="Retrieving conversation..." />
                </div>
              ) : (
                <>
                  {/* Original Customer Message */}
                  <div className="bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#A63D40] text-white flex items-center justify-center font-bold text-[10px] uppercase">
                          {(selectedTicket.name || 'C').charAt(0)}
                        </div>
                        <span className="font-bold text-[#2B2523]">{selectedTicket.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">Customer Original Query</span>
                      </div>
                      <span className="text-[11px] text-[#6F625D]">
                        {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-[#2B2523] whitespace-pre-wrap leading-relaxed pl-8">
                      {selectedTicket.message}
                    </p>
                  </div>

                  {/* Replies Thread */}
                  {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#6F625D] uppercase tracking-wider">
                        <MessageSquare size={12} />
                        <span>Conversation History ({selectedTicket.replies.length})</span>
                      </div>

                      {selectedTicket.replies.map((reply, idx) => {
                        const isOwnerReply =
                          reply.sender?.toLowerCase().includes('support') ||
                          reply.sender?.toLowerCase().includes('admin') ||
                          reply.sender?.toLowerCase().includes('owner') ||
                          reply.sender?.toLowerCase().includes('craftnest');

                        return (
                          <div
                            key={reply.id || idx}
                            className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                              isOwnerReply
                                ? 'bg-amber-50/40 border-amber-200 ml-6'
                                : 'bg-white border-[#E6D8CC] mr-6'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${isOwnerReply ? 'text-[#A63D40]' : 'text-[#2B2523]'}`}>
                                  {reply.sender}
                                </span>
                                {isOwnerReply && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#A63D40] text-white font-semibold">
                                    Owner Support
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#6F625D]">
                                {reply.created_at ? new Date(reply.created_at).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : ''}
                              </span>
                            </div>
                            <p className="text-[#2B2523] whitespace-pre-wrap">
                              {reply.message}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center border border-dashed border-[#E6D8CC] rounded-xl text-xs text-[#6F625D]">
                      No replies have been sent yet. Write your response below.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Reply Composer Bar */}
            <div className="p-4 border-t border-[#E6D8CC] bg-[#FFF9F3]/40 shrink-0">
              {replyFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs mb-3 flex items-start gap-2 ${
                    replyFeedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {replyFeedback.type === 'success' ? (
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertTriangle size={16} className="shrink-0 text-red-600 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{replyFeedback.message}</p>
                    {replyFeedback.type === 'success' && (
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        {replyFeedback.emailSent
                          ? '✓ Email notification successfully dispatched to patron.'
                          : 'ℹ In-app notification updated for patron.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSendReply} className="space-y-3">
                <textarea
                  rows={3}
                  required
                  placeholder="Type your official response to the customer..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-[#E6D8CC] bg-white text-[#2B2523] focus:outline-none focus:border-[#A63D40] resize-none"
                />

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#6F625D]">Set Status to:</span>
                    <select
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-[#E6D8CC] bg-white text-[#2B2523] focus:outline-none"
                    >
                      <option value="Replied">Replied (Default)</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#A63D40] hover:bg-[#8F3437] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Send size={13} className={sendingReply ? 'animate-spin' : ''} />
                    <span>{sendingReply ? 'Sending Reply...' : 'Send Reply to Patron'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
