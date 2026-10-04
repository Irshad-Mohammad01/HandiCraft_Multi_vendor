import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Package, ShoppingBag, Plus, Search, Edit2, Trash2, 
  Store, AlertCircle, CheckCircle2, DollarSign, X, RefreshCw,
  CreditCard, Truck, Calendar, Eye, Filter, ShieldCheck, ChevronRight
} from 'lucide-react';
import { productsApi } from '../../api/products';
import { ordersApi } from '../../api/orders';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import MetricCard from '../../components/dashboard/MetricCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import OrderFulfillmentBreakdown from '../../components/dashboard/OrderFulfillmentBreakdown';
import CategoryStockDistribution from '../../components/dashboard/CategoryStockDistribution';
import LowStockWarnings from '../../components/dashboard/LowStockWarnings';

export default function SellerDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path
  const activeTab = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/seller/products')) return 'products';
    if (p.startsWith('/seller/orders')) return 'orders';
    if (p.startsWith('/seller/payments')) return 'payments';
    if (p.startsWith('/seller/profile')) return 'profile';
    return 'overview';
  }, [location.pathname]);

  // Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [paymentsData, setPaymentsData] = useState({ payments: [], total_sales: 0, total_units_sold: 0, total_transactions: 0 });
  const [fulfillmentData, setFulfillmentData] = useState({ total_orders: 0, total_sales: 0, total_units_sold: 0, breakdown: [] });
  const [categoryData, setCategoryData] = useState({ total_stock_value: 0, total_products: 0, total_stock_units: 0, categories: [] });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Status Update Modal
  const [orderToUpdate, setOrderToUpdate] = useState(null);
  const [newOrderStatus, setNewOrderStatus] = useState('');
  const [carrierInput, setCarrierInput] = useState('');
  const [trackingIdInput, setTrackingIdInput] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Form Data for Add / Edit Product
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '',
    stock: '10',
    category_id: '',
    artisan_name: user?.name || user?.username || 'Master Artisan',
    image_url: '',
    materials: '',
    origin: '',
    show_on_home: false
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadSellerData();
  }, [user]);

  // Handle direct navigation to /seller/products/add or /seller/products/new
  useEffect(() => {
    if (location.pathname.startsWith('/seller/products/add') || location.pathname.startsWith('/seller/products/new')) {
      openAddModal();
      navigate('/seller/products', { replace: true });
    }
  }, [location.pathname]);

  const loadSellerData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, fulfillRes, distRes, lowRes, ordersRes, paymentsRes] = await Promise.allSettled([
        productsApi.getAll({ seller_id: user?.id, my_products: 'true' }),
        productsApi.getCategories(),
        ordersApi.getFulfillmentStats(),
        productsApi.getCategoryStockDistribution(),
        productsApi.getLowStockWarnings(),
        ordersApi.getSellerOrders(),
        ordersApi.getSellerPayments()
      ]);

      if (prodRes.status === 'fulfilled') {
        const list = prodRes.value.products || prodRes.value || [];
        const myItems = Array.isArray(list) 
          ? list.filter(p => !user?.id || (p.seller_id && String(p.seller_id) === String(user.id)))
          : [];
        setProducts(myItems);
      }

      if (catRes.status === 'fulfilled') {
        const catList = catRes.value.categories || catRes.value || [];
        setCategories(Array.isArray(catList) ? catList : []);
        if (catList.length > 0 && !formData.category_id) {
          setFormData(prev => ({ ...prev, category_id: String(catList[0].id) }));
        }
      }

      if (fulfillRes.status === 'fulfilled' && fulfillRes.value?.success) {
        setFulfillmentData(fulfillRes.value);
      }

      if (distRes.status === 'fulfilled' && distRes.value?.success) {
        setCategoryData(distRes.value);
      }

      if (lowRes.status === 'fulfilled' && lowRes.value?.success) {
        setLowStockProducts(lowRes.value.products || []);
      }

      if (ordersRes.status === 'fulfilled') {
        const ordList = Array.isArray(ordersRes.value) ? ordersRes.value : (ordersRes.value?.orders || ordersRes.value?.items || []);
        setOrders(ordList);
      }

      if (paymentsRes.status === 'fulfilled' && paymentsRes.value?.success) {
        setPaymentsData(paymentsRes.value);
      }
    } catch (err) {
      console.error('Failed to load seller catalog & analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdated = (updatedProduct) => {
    if (updatedProduct) {
      const newStock = parseInt(updatedProduct.stock, 10);
      setLowStockProducts(prev => {
        if (newStock > 10) {
          return prev.filter(p => String(p.id || p._id) !== String(updatedProduct.id || updatedProduct._id));
        } else {
          return prev.map(p => {
            if (String(p.id || p._id) === String(updatedProduct.id || updatedProduct._id)) {
              return {
                ...p,
                stock: newStock,
                warning_type: newStock === 0 ? 'out_of_stock' : 'low_stock',
                warning_label: newStock === 0 ? 'Out of Stock' : `Low Stock (${newStock} units left)`
              };
            }
            return p;
          }).sort((a, b) => (parseInt(a.stock, 10) === 0 ? -1 : 1));
        }
      });

      setProducts(prev => prev.map(p => {
        if (String(p.id || p._id) === String(updatedProduct.id || updatedProduct._id)) {
          return { ...p, stock: newStock };
        }
        return p;
      }));
    }
    loadSellerData();
  };

  // Check if Add Product form has unsaved modifications
  const isAddFormDirty = useMemo(() => {
    return Boolean(
      formData.name.trim() ||
      formData.description.trim() ||
      formData.price ||
      formData.original_price ||
      formData.image_url.trim() ||
      formData.materials.trim() ||
      formData.origin.trim() ||
      (formData.stock && String(formData.stock).trim() !== '10')
    );
  }, [formData]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      original_price: '',
      stock: '10',
      category_id: categories.length > 0 ? String(categories[0].id) : '',
      artisan_name: user?.name || user?.username || 'Master Artisan',
      image_url: '',
      materials: '',
      origin: '',
      show_on_home: false
    });
    setErrorMsg('');
    setShowAddModal(true);
  };

  const closeAddModal = (force = false) => {
    if (!force && isAddFormDirty) {
      const discard = window.confirm(
        'You have unsaved changes in this handcrafted item form. Are you sure you want to discard them?'
      );
      if (!discard) return;
    }
    setShowAddModal(false);
    setErrorMsg('');
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name || '',
      description: prod.description || '',
      price: prod.price !== undefined ? String(prod.price) : '',
      original_price: prod.original_price ? String(prod.original_price) : '',
      stock: prod.stock !== undefined ? String(prod.stock) : '10',
      category_id: prod.category_id ? String(prod.category_id) : (prod.category?.id ? String(prod.category.id) : (categories[0]?.id ? String(categories[0].id) : '')),
      artisan_name: prod.artisan_name || user?.name || user?.username || '',
      image_url: prod.image_url || (prod.images && prod.images[0]) || '',
      materials: prod.materials || '',
      origin: prod.origin || '',
      show_on_home: Boolean(prod.show_on_home ?? prod.show_on_homepage ?? false)
    });
    setErrorMsg('');
    setShowEditModal(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        stock: parseInt(formData.stock, 10),
        category_id: parseInt(formData.category_id, 10),
        artisan_name: formData.artisan_name || user?.username,
        image_url: formData.image_url.trim(),
        materials: formData.materials.trim(),
        origin: formData.origin.trim(),
        show_on_home: Boolean(formData.show_on_home),
        show_on_homepage: Boolean(formData.show_on_home)
      };

      if (editingProduct) {
        await productsApi.update(editingProduct.id, payload);
        setShowEditModal(false);
        setSuccessMsg(`"${formData.name.trim()}" updated successfully!`);
      } else {
        await productsApi.create(payload);
        setShowAddModal(false);
        setSuccessMsg(`"${formData.name.trim()}" published successfully to your workshop catalog!`);
        // Reset form
        setFormData({
          name: '',
          description: '',
          price: '',
          original_price: '',
          stock: '10',
          category_id: categories[0]?.id ? String(categories[0].id) : '',
          artisan_name: user?.name || user?.username || '',
          image_url: '',
          materials: '',
          origin: '',
          show_on_home: false
        });
      }

      await loadSellerData();
    } catch (err) {
      console.error('Failed to save artisan product:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save handcrafted item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await productsApi.delete(productToDelete.id);
      setProductToDelete(null);
      setSuccessMsg('Handcrafted item removed successfully.');
      await loadSellerData();
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert(err.response?.data?.message || 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  const openStatusUpdateModal = (order) => {
    setOrderToUpdate(order);
    setNewOrderStatus(order.status || order.order_status || 'Pending');
    setCarrierInput(order.carrier || '');
    setTrackingIdInput(order.tracking_id || '');
    setShowEditModal(false);
  };

  const handleUpdateOrderStatus = async (e) => {
    e.preventDefault();
    if (!orderToUpdate) return;
    setUpdatingStatus(true);
    try {
      await ordersApi.updateStatus(orderToUpdate.id || orderToUpdate.order_id, {
        status: newOrderStatus,
        carrier: carrierInput,
        tracking_id: trackingIdInput
      });
      setOrderToUpdate(null);
      await loadSellerData();
    } catch (err) {
      console.error('Failed to update order fulfillment:', err);
      alert(err.response?.data?.message || 'Failed to update order fulfillment.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = (
        (o.order_id && String(o.order_id).toLowerCase().includes(orderSearch.toLowerCase())) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(orderSearch.toLowerCase())) ||
        (o.items && o.items.some(it => it.name?.toLowerCase().includes(orderSearch.toLowerCase())))
      );
      const matchStatus = orderStatusFilter === 'all' || 
        String(o.status || o.order_status).toLowerCase() === orderStatusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  // Compute Total Sales & Units Sold from actual orders
  const displayTotalSales = paymentsData.total_sales > 0 
    ? paymentsData.total_sales 
    : (fulfillmentData.total_sales || 0);

  const displayUnitsSold = paymentsData.total_units_sold > 0 
    ? paymentsData.total_units_sold 
    : (fulfillmentData.total_units_sold || 0);

  return (
    <DashboardLayout role="seller" activeNav={activeTab}>
      <div className="space-y-6">

        {/* Top Notification Alerts */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-[#3F7D5A] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Top Header & Tab Pills Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523]">
              {activeTab === 'overview' && 'Artisan Workshop Portal'}
              {activeTab === 'products' && 'Products'}
              {activeTab === 'orders' && 'Workshop Orders'}
              {activeTab === 'payments' && 'Earnings & Payment History'}
            </h1>
            <p className="text-xs sm:text-sm text-[#6F625D] mt-0.5">
              {activeTab === 'overview' && 'Overview of your handcrafted creations, sales, order milestones, and stock alerts'}
              {activeTab === 'products' && 'View, edit, and manage inventory exclusively for products added by your workshop'}
              {activeTab === 'orders' && 'Fulfill and track customer orders containing your handcrafted creations'}
              {activeTab === 'payments' && 'Verified sales summary and transaction records for your order items'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={loadSellerData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E6D8CC] text-[#2B2523] hover:border-[#A63D40] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Data</span>
            </button>
            <Button variant="primary" icon={Plus} onClick={openAddModal}>
              Add New Product
            </Button>
          </div>
        </div>

        {/* Tab Pills Navigation Bar */}
        <div className="flex items-center gap-2 border-b border-[#E6D8CC] pb-3 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', path: '/seller/dashboard' },
            { id: 'products', label: 'Products', path: '/seller/products' },
            { id: 'orders', label: 'Orders', path: '/seller/orders' },
            { id: 'payments', label: 'Payments', path: '/seller/payments' },
            { id: 'profile', label: 'Artisan Profile', path: '/seller/profile' },
          ].map(tab => {
            const isCurrent = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-[#A63D40] text-white shadow-xs'
                    : 'bg-white border border-[#E6D8CC] text-[#6F625D] hover:text-[#2B2523] hover:border-[#C69A5B]'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW                                                           */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 4 Overview Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="My Handcrafted Items"
                value={products.length}
                icon={Package}
                trend="Active in your catalog"
              />
              <MetricCard
                title="Workshop Orders"
                value={fulfillmentData.total_orders}
                icon={ShoppingBag}
                trend="Orders containing your items"
              />
              {/* Requirement 6: Replaces Inventory Valuation with Total Sales */}
              <MetricCard
                title="Total Sales"
                value={`₹${Math.round(displayTotalSales).toLocaleString('en-IN')}`}
                icon={DollarSign}
                trend={`${displayUnitsSold} ${displayUnitsSold === 1 ? 'unit' : 'units'} sold`}
              />
              {/* Requirement 7: Low Stock Alerts (threshold <= 10 units) */}
              <MetricCard
                title="Low Stock Alerts"
                value={lowStockProducts.length}
                icon={AlertCircle}
                trend={lowStockProducts.length > 0 ? "Requires replenishment" : "Inventory healthy"}
              />
            </div>

            {/* Middle Section: 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <OrderFulfillmentBreakdown
                breakdown={fulfillmentData.breakdown}
                totalOrders={fulfillmentData.total_orders}
                loading={loading}
                title="Order Fulfillment Status Breakdown"
                subtitle="Milestone status for orders containing your handcrafted creations"
              />

              <CategoryStockDistribution
                categories={categoryData.categories}
                totalStockValue={categoryData.total_stock_value}
                totalProducts={categoryData.total_products}
                totalStockUnits={categoryData.total_stock_units}
                loading={loading}
                title="Category Stock Value Distribution"
                subtitle="Stock valuation across craft categories: SUM(Price × Stock)"
              />
            </div>

            {/* Bottom Section: Low Stock Warnings */}
            <LowStockWarnings
              products={lowStockProducts}
              loading={loading}
              role="seller"
              onStockUpdated={handleStockUpdated}
              title="Low Stock & Depletion Warnings"
              subtitle="Real-time alerts for your craft creations requiring replenishment (Stock ≤ 10 units)"
            />

            {/* Quick Link to Products */}
            <div className="bg-white p-5 rounded-2xl border border-[#E6D8CC] flex items-center justify-between flex-wrap gap-4 shadow-xs">
              <div>
                <h3 className="font-serif font-bold text-[#2B2523] text-sm sm:text-base">
                  Looking to manage your product prices or descriptions?
                </h3>
                <p className="text-xs text-[#6F625D] mt-0.5">
                  View and edit only your workshop's products in the dedicated Products tab.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/seller/products')}>
                Go to Products &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PRODUCTS (SELLER-OWNED PRODUCTS ONLY)                              */}
        {/* ========================================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#E6D8CC] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="relative w-full sm:max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6F625D]" />
                <input
                  type="text"
                  placeholder="Search handcrafted products by title or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl text-xs text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-[#6F625D]">
                <span>Showing <strong className="text-[#2B2523]">{filteredProducts.length}</strong> of {products.length} products</span>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-[#E6D8CC] overflow-hidden shadow-xs">
              {loading ? (
                <div className="py-16">
                  <LoadingSpinner text="Retrieving your handcrafted catalog..." />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-16 px-6 text-center text-[#6F625D]">
                  <Store size={40} className="mx-auto mb-3 text-[#E6D8CC]" />
                  <h3 className="font-serif text-base font-bold text-[#2B2523] mb-1">
                    {search ? 'No matching products found' : 'No handcrafted items in your catalog'}
                  </h3>
                  <p className="text-xs mb-4">
                    {search ? 'Try clearing your search query' : 'Publish your first craft creation to start showcasing to patrons'}
                  </p>
                  {!search && (
                    <Button variant="primary" icon={Plus} size="sm" onClick={openAddModal}>
                      Add New Product
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523]">
                        <th className="py-3.5 px-4 font-semibold">Handicraft</th>
                        <th className="py-3.5 px-4 font-semibold">Category</th>
                        <th className="py-3.5 px-4 font-semibold">Selling Price</th>
                        <th className="py-3.5 px-4 font-semibold">Available Units</th>
                        <th className="py-3.5 px-4 font-semibold">Inventory Status</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6D8CC]">
                      {filteredProducts.map((p) => {
                        const img = p.image_url || (p.images && p.images[0]) || '/placeholder.png';
                        const isLow = Number(p.stock) <= 10;
                        const isOut = Number(p.stock) === 0;

                        return (
                          <tr key={p.id} className="hover:bg-[#FFF9F3]/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-[#F4E8DC] border border-[#E6D8CC] overflow-hidden flex items-center justify-center shrink-0">
                                  <img src={img} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <div className="font-bold text-[#2B2523] max-w-xs truncate">{p.name}</div>
                                  <div className="text-[11px] text-[#A63D40] font-mono">Craft ID: #{p.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[#6F625D]">
                              {p.category_name || (p.category?.name) || 'Handicrafts'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#A63D40]">
                              ₹{Number(p.price).toLocaleString('en-IN')}
                              {p.original_price && p.original_price > p.price && (
                                <span className="ml-1.5 text-[10px] text-[#6F625D] line-through font-normal">
                                  ₹{Number(p.original_price).toLocaleString('en-IN')}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#2B2523]">
                              {p.stock} units
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isOut 
                                  ? 'bg-rose-100 text-rose-700' 
                                  : isLow 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isOut ? 'Sold Out' : isLow ? `Low Stock (${p.stock})` : 'In Stock'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  to={`/products/${p.id}`}
                                  target="_blank"
                                  className="p-1.5 text-[#6F625D] hover:text-[#A63D40] rounded-lg hover:bg-[#F4E8DC]/50 transition-colors"
                                  title="View on Storefront"
                                >
                                  <Eye size={15} />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(p)}
                                  className="p-1.5 text-[#2B2523] hover:text-[#A63D40] rounded-lg hover:bg-[#F4E8DC]/50 transition-colors cursor-pointer"
                                  title="Edit Product"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setProductToDelete(p)}
                                  className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Product"
                                >
                                  <Trash2 size={15} />
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
            </div>
          </div>
        )}



        {/* ========================================================================= */}
        {/* TAB 4: ORDERS (SELLER-SPECIFIC ORDERS ONLY)                                */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#E6D8CC] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="relative w-full sm:max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6F625D]" />
                <input
                  type="text"
                  placeholder="Search orders by order ID, customer, or craft item..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl text-xs text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={14} className="text-[#6F625D]" />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-1.5 px-3 text-xs text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                >
                  <option value="all">All Fulfillment Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-[#E6D8CC] overflow-hidden shadow-xs">
              {loading ? (
                <div className="py-16">
                  <LoadingSpinner text="Retrieving orders for your handcrafted creations..." />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-16 px-6 text-center text-[#6F625D]">
                  <ShoppingBag size={40} className="mx-auto mb-3 text-[#E6D8CC]" />
                  <h3 className="font-serif text-base font-bold text-[#2B2523] mb-1">
                    No matching workshop orders found
                  </h3>
                  <p className="text-xs">
                    Customer orders containing items crafted by your workshop will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523]">
                        <th className="py-3.5 px-4 font-semibold">Order Details</th>
                        <th className="py-3.5 px-4 font-semibold">Customer & Destination</th>
                        <th className="py-3.5 px-4 font-semibold">Your Ordered Items</th>
                        <th className="py-3.5 px-4 font-semibold">Payment Details</th>
                        <th className="py-3.5 px-4 font-semibold">Fulfillment Status</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6D8CC]">
                      {filteredOrders.map((ord) => {
                        const statusVal = ord.status || ord.order_status || 'Pending';
                        const items = ord.items || [];
                        const subtotal = ord.seller_total_amount || ord.total_amount || 0;

                        return (
                          <tr key={ord.id} className="hover:bg-[#FFF9F3]/40 transition-colors">
                            <td className="py-3.5 px-4 align-top">
                              <div className="font-bold text-[#2B2523]">#{ord.order_id || ord.master_order_id}</div>
                              <div className="text-[11px] text-[#6F625D] mt-0.5 flex items-center gap-1">
                                <Calendar size={11} />
                                <span>{new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                              <div className="text-[10px] text-[#A63D40] mt-0.5 font-mono">DB Ref: #{ord.id}</div>
                            </td>

                            <td className="py-3.5 px-4 align-top">
                              <div className="font-semibold text-[#2B2523]">{ord.customer_name}</div>
                              <div className="text-[11px] text-[#6F625D] mt-0.5">
                                {[ord.city, ord.state].filter(Boolean).join(', ') || 'Standard Pan-India'}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 align-top">
                              <div className="space-y-1.5">
                                {items.map((it, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="font-semibold text-[#2B2523]">{it.quantity}x</span>
                                    <span className="text-[#6F625D] max-w-xs truncate">{it.name}</span>
                                    <span className="text-[#A63D40] font-mono">₹{it.price}</span>
                                  </div>
                                ))}
                                <div className="text-[11px] font-bold text-[#A63D40] pt-1">
                                  Your Subtotal: ₹{Number(subtotal).toLocaleString('en-IN')}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 align-top">
                              <div className="font-semibold text-[#2B2523] uppercase text-[11px]">
                                {ord.payment_method || 'Cash on Delivery'}
                              </div>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4E8DC] text-[#6F625D]">
                                {ord.payment_status || 'PENDING'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 align-top">
                              <Badge status={statusVal} />
                              {ord.carrier && (
                                <div className="text-[10px] text-[#6F625D] mt-1 flex items-center gap-1">
                                  <Truck size={10} />
                                  <span>{ord.carrier}: {ord.tracking_id}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 align-top text-right">
                              <button
                                type="button"
                                onClick={() => openStatusUpdateModal(ord)}
                                className="px-3 py-1.5 rounded-xl bg-white border border-[#E6D8CC] text-[#2B2523] hover:border-[#A63D40] hover:text-[#A63D40] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                Update Status
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PAYMENTS (SELLER PAYMENT & SALES HISTORY)                          */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* 3 Payment Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#E6D8CC] shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#6F625D] uppercase tracking-wider">Total Sales Volume</p>
                    <h3 className="font-serif text-2xl font-black text-[#2B2523] mt-0.5">
                      ₹{Math.round(displayTotalSales).toLocaleString('en-IN')}
                    </h3>
                  </div>
                </div>
                <p className="text-[11px] text-[#6F625D] mt-3 pt-3 border-t border-[#E6D8CC]">
                  Earned from non-cancelled patron orders
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E6D8CC] shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF9F3] text-[#A63D40] flex items-center justify-center font-bold">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#6F625D] uppercase tracking-wider">Handcrafted Items Sold</p>
                    <h3 className="font-serif text-2xl font-black text-[#2B2523] mt-0.5">
                      {displayUnitsSold} units
                    </h3>
                  </div>
                </div>
                <p className="text-[11px] text-[#6F625D] mt-3 pt-3 border-t border-[#E6D8CC]">
                  Delivered or active in fulfillment pipeline
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E6D8CC] shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F4E8DC] text-[#C69A5B] flex items-center justify-center font-bold">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#6F625D] uppercase tracking-wider">Total Orders Recorded</p>
                    <h3 className="font-serif text-2xl font-black text-[#2B2523] mt-0.5">
                      {paymentsData.total_transactions || orders.length}
                    </h3>
                  </div>
                </div>
                <p className="text-[11px] text-[#6F625D] mt-3 pt-3 border-t border-[#E6D8CC]">
                  Orders strictly isolated to your workshop items
                </p>
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-2xl border border-[#E6D8CC] overflow-hidden shadow-xs">
              <div className="p-4 border-b border-[#E6D8CC]">
                <h3 className="font-serif text-sm sm:text-base font-bold text-[#2B2523]">
                  Order Transactions & Earnings Ledger
                </h3>
                <p className="text-xs text-[#6F625D] mt-0.5">
                  Detailed payment records corresponding to your handcrafted items. Read-only.
                </p>
              </div>

              {loading ? (
                <div className="py-16">
                  <LoadingSpinner text="Loading payment records..." />
                </div>
              ) : paymentsData.payments.length === 0 ? (
                <div className="py-16 px-6 text-center text-[#6F625D]">
                  <CreditCard size={40} className="mx-auto mb-3 text-[#E6D8CC]" />
                  <h3 className="font-serif text-base font-bold text-[#2B2523] mb-1">
                    No payment records yet
                  </h3>
                  <p className="text-xs">
                    Payments corresponding to items ordered by patrons will display here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523]">
                        <th className="py-3.5 px-4 font-semibold">Order ID</th>
                        <th className="py-3.5 px-4 font-semibold">Payment Date</th>
                        <th className="py-3.5 px-4 font-semibold">Transaction / Ref ID</th>
                        <th className="py-3.5 px-4 font-semibold">Payment Method</th>
                        <th className="py-3.5 px-4 font-semibold">Payment Status</th>
                        <th className="py-3.5 px-4 font-semibold">Order Status</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Seller Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6D8CC]">
                      {paymentsData.payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-[#FFF9F3]/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#2B2523]">
                            #{pay.order_id}
                          </td>
                          <td className="py-3.5 px-4 text-[#6F625D]">
                            {new Date(pay.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-[#A63D40]">
                            {pay.transaction_id || `TXN-${pay.order_id}`}
                          </td>
                          <td className="py-3.5 px-4 uppercase text-[11px] text-[#2B2523] font-medium">
                            {pay.payment_method}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4E8DC] text-[#2B2523]">
                              {pay.payment_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge status={pay.order_status} />
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#A63D40] text-right text-sm">
                            ₹{Number(pay.amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW PRODUCT (POPUP ON PRODUCTS PAGE)                           */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeAddModal();
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-[#E6D8CC] overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-[#E6D8CC] flex items-center justify-between bg-[#FFF9F3]/90 backdrop-blur-xs shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#A63D40]/10 text-[#A63D40] flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2B2523]">
                    Add New Handcrafted Item
                  </h3>
                  <p className="text-[11px] text-[#6F625D]">
                    Publish a heritage creation directly into your workshop catalog
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => closeAddModal()} 
                className="text-[#6F625D] hover:text-[#2B2523] p-1.5 rounded-xl hover:bg-[#F4E8DC] transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Scrollable if form is taller than screen) */}
            <div className="p-6 overflow-y-auto space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-2xl flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              <form id="add-product-form" onSubmit={handleProductSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[#2B2523] mb-1.5">
                      Handicraft Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Authentic Hand-Carved Kashmiri Walnut Keepsake Box"
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#2B2523] mb-1.5">
                      Craft Category (Owner Managed) *
                    </label>
                    <select
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                    >
                      {categories.length === 0 && <option value="">Loading categories...</option>}
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-[#6F625D] mt-1 block">
                      Synced dynamically from Owner category management
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#2B2523] mb-1.5">
                      Available Stock Units *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="10"
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#2B2523] mb-1.5">
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="2850"
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#2B2523] mb-1.5">
                      Original / MRP Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.original_price}
                      onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                      placeholder="3400 (Optional for discount)"
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[#2B2523] mb-1.5">
                      Craft Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[#2B2523] mb-1.5">
                      Craft Process & Artisan Story
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detail the materials, hereditary techniques, and heritage origins of this craft..."
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#2B2523] mb-1.5">
                      Materials Used
                    </label>
                    <input
                      type="text"
                      value={formData.materials}
                      onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                      placeholder="e.g. Seasoned walnut wood, brass inlay"
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#2B2523] mb-1.5">
                      Craft Origin Region
                    </label>
                    <input
                      type="text"
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      placeholder="Srinagar, Kashmir"
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                    />
                  </div>

                  {/* Show on Home Page Option */}
                  <div className="flex items-center gap-3 p-3 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl">
                    <input
                      type="checkbox"
                      id="seller_add_show_on_home"
                      checked={Boolean(formData.show_on_home)}
                      onChange={(e) => setFormData({ ...formData, show_on_home: e.target.checked })}
                      className="w-4 h-4 cursor-pointer accent-[#A63D40]"
                    />
                    <div>
                      <label htmlFor="seller_add_show_on_home" className="block text-xs font-bold text-[#2B2523] cursor-pointer select-none">
                        Show on Home Page
                      </label>
                      <span className="text-[11px] text-[#6F625D] block mt-0.5">
                        Eligible to appear in the Featured/Curated products section on the main customer homepage.
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E6D8CC] flex items-center justify-end gap-3 bg-[#FFF9F3]/90 backdrop-blur-xs shrink-0">
              <button
                type="button"
                onClick={() => closeAddModal()}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6F625D] hover:bg-[#F4E8DC] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <Button 
                type="submit" 
                form="add-product-form"
                variant="primary" 
                loading={saving}
                disabled={saving}
              >
                {saving ? 'Adding Product...' : 'Add Product'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT PRODUCT                                                       */}
      {/* ========================================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E6D8CC] pb-3 mb-5">
              <h2 className="font-serif text-lg font-bold text-[#2B2523]">
                Edit Handcrafted Creation
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-[#6F625D] hover:text-[#2B2523]">
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#2B2523] mb-1">Handicraft Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2B2523] mb-1">Category (Owner Managed) *</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#2B2523] mb-1">Stock Units *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#2B2523] mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#2B2523] mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2B2523] mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2B2523] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2B2523] mb-1">Materials Used</label>
                  <input
                    type="text"
                    value={formData.materials}
                    onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                    placeholder="e.g. Walnut wood, brass"
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2B2523] mb-1">Craft Origin</label>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="e.g. Srinagar, Kashmir"
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                  />
                </div>
              </div>

              {/* Show on Home Page Option */}
              <div className="flex items-center gap-3 p-3 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl my-2">
                <input
                  type="checkbox"
                  id="seller_edit_show_on_home"
                  checked={Boolean(formData.show_on_home)}
                  onChange={(e) => setFormData({ ...formData, show_on_home: e.target.checked })}
                  className="w-4 h-4 cursor-pointer accent-[#A63D40]"
                />
                <div>
                  <label htmlFor="seller_edit_show_on_home" className="block text-xs font-bold text-[#2B2523] cursor-pointer select-none">
                    Show on Home Page
                  </label>
                  <span className="text-[11px] text-[#6F625D] block mt-0.5">
                    Eligible to appear in the Featured/Curated products section on the main customer homepage.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6D8CC]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6F625D] hover:bg-[#F4E8DC]/50"
                >
                  Cancel
                </button>
                <Button type="submit" variant="primary" loading={saving}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE PRODUCT CONFIRMATION                                        */}
      {/* ========================================================================= */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-[#2B2523]">Delete Handcrafted Creation?</h3>
            <p className="text-xs text-[#6F625D] mt-2 leading-relaxed">
              Are you sure you want to remove <strong className="text-[#2B2523]">"{productToDelete.name}"</strong>? This will remove the listing from your workshop catalog.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6F625D] hover:bg-[#F4E8DC]/50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Creation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UPDATE ORDER FULFILLMENT STATUS                                     */}
      {/* ========================================================================= */}
      {orderToUpdate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E6D8CC] pb-3 mb-4">
              <h3 className="font-serif text-lg font-bold text-[#2B2523]">Update Fulfillment Status</h3>
              <button onClick={() => setOrderToUpdate(null)} className="text-[#6F625D] hover:text-[#2B2523]">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[#6F625D] mb-4">
              Updating order <strong className="text-[#2B2523]">#{orderToUpdate.order_id || orderToUpdate.master_order_id}</strong> for patron {orderToUpdate.customer_name}.
            </p>

            <form onSubmit={handleUpdateOrderStatus} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#2B2523] mb-1.5">Fulfillment Status *</label>
                <select
                  value={newOrderStatus}
                  onChange={(e) => setNewOrderStatus(e.target.value)}
                  className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#2B2523] mb-1.5">Shipping Carrier</label>
                <input
                  type="text"
                  value={carrierInput}
                  onChange={(e) => setCarrierInput(e.target.value)}
                  placeholder="e.g. India Post Speed Post, Blue Dart, Delhivery"
                  className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2B2523] mb-1.5">Tracking Number / AWB</label>
                <input
                  type="text"
                  value={trackingIdInput}
                  onChange={(e) => setTrackingIdInput(e.target.value)}
                  placeholder="e.g. IN1928384920"
                  className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 px-3 text-[#2B2523] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6D8CC]">
                <button
                  type="button"
                  onClick={() => setOrderToUpdate(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6F625D] hover:bg-[#F4E8DC]/50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button type="submit" variant="primary" loading={updatingStatus}>
                  Save Fulfillment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
