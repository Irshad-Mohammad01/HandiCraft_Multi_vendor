import React, { useState, useEffect } from 'react';
import { 
  Package, ShoppingBag, Users, DollarSign, 
  RefreshCw 
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { ordersApi } from '../../api/orders';
import { productsApi } from '../../api/products';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import MetricCard from '../../components/dashboard/MetricCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import OrderFulfillmentBreakdown from '../../components/dashboard/OrderFulfillmentBreakdown';
import CategoryStockDistribution from '../../components/dashboard/CategoryStockDistribution';
import LowStockWarnings from '../../components/dashboard/LowStockWarnings';

export default function OwnerDashboard() {
  const [stats, setStats] = useState(null);
  const [fulfillmentData, setFulfillmentData] = useState({ total_orders: 0, breakdown: [] });
  const [categoryData, setCategoryData] = useState({ total_stock_value: 0, total_products: 0, total_stock_units: 0, categories: [] });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, fulfillRes, catRes, lowRes] = await Promise.allSettled([
        adminApi.getStats(),
        ordersApi.getFulfillmentStats(),
        productsApi.getCategoryStockDistribution(),
        productsApi.getLowStockWarnings()
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }

      // 1. Order Fulfillment Status Breakdown
      if (fulfillRes.status === 'fulfilled' && fulfillRes.value?.success) {
        setFulfillmentData(fulfillRes.value);
      } else {
        // Fallback: calculate from all orders if endpoint has connection hiccup
        try {
          const ordList = await ordersApi.getAll();
          const allOrders = ordList.orders || ordList || [];
          const statusMap = {
            'pending': 'Pending', 'order placed': 'Pending',
            'confirmed': 'Confirmed', 'order confirmed': 'Confirmed',
            'packed': 'Packed', 'shipped': 'Shipped',
            'in transit': 'Shipped', 'out for delivery': 'Out for Delivery',
            'delivered': 'Delivered', 'cancelled': 'Cancelled'
          };
          const canonical = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
          const counts = { 'Pending': 0, 'Confirmed': 0, 'Packed': 0, 'Shipped': 0, 'Out for Delivery': 0, 'Delivered': 0, 'Cancelled': 0 };
          allOrders.forEach(o => {
            const raw = String(o.order_status || o.status || 'Pending').toLowerCase().trim();
            const norm = statusMap[raw] || 'Pending';
            counts[norm] = (counts[norm] || 0) + 1;
          });
          const total = allOrders.length;
          setFulfillmentData({
            total_orders: total,
            breakdown: canonical.map(st => ({
              status: st,
              count: counts[st],
              percentage: total > 0 ? Number(((counts[st] / total) * 100).toFixed(1)) : 0
            }))
          });
        } catch (e) {
          console.error('Fallback orders calculation error:', e);
        }
      }

      // 2. Category Stock Value Distribution
      if (catRes.status === 'fulfilled' && catRes.value?.success) {
        setCategoryData(catRes.value);
      } else {
        // Fallback: calculate from all products
        try {
          const prodListRes = await productsApi.getAll({ all: 'true' });
          const allProds = prodListRes.products || prodListRes || [];
          const catMap = {};
          let totalVal = 0;
          let totalUnits = 0;
          allProds.forEach(p => {
            const cname = p.category || (p.category_name) || 'Uncategorized';
            const price = parseFloat(p.price || 0);
            const stock = parseInt(p.stock || 0, 10);
            const val = price * stock;
            totalVal += val;
            totalUnits += stock;
            if (!catMap[cname]) catMap[cname] = { category_name: cname, products_count: 0, stock_value: 0, total_units: 0 };
            catMap[cname].products_count += 1;
            catMap[cname].stock_value += val;
            catMap[cname].total_units += stock;
          });
          const catArray = Object.values(catMap).map(c => ({
            ...c,
            percentage: totalVal > 0 ? Number(((c.stock_value / totalVal) * 100).toFixed(1)) : 0
          })).sort((a, b) => b.stock_value - a.stock_value);
          setCategoryData({
            total_stock_value: totalVal,
            total_products: allProds.length,
            total_stock_units: totalUnits,
            categories: catArray
          });
        } catch (e) {
          console.error('Fallback category calculation error:', e);
        }
      }

      // 3. Low Stock Warnings (Stock <= 10)
      if (lowRes.status === 'fulfilled' && lowRes.value?.success) {
        setLowStockProducts(lowRes.value.products || []);
      } else {
        // Fallback: filter products with stock <= 10
        try {
          const prodListRes = await productsApi.getAll({ all: 'true' });
          const allProds = prodListRes.products || prodListRes || [];
          const lowItems = allProds
            .filter(p => p.stock !== undefined && parseInt(p.stock, 10) <= 10)
            .map(p => ({
              ...p,
              image: (p.images && p.images[0]) || p.image_url || '',
              warning_type: parseInt(p.stock, 10) === 0 ? 'out_of_stock' : 'low_stock',
              warning_label: parseInt(p.stock, 10) === 0 ? 'Out of Stock' : `Low Stock (${p.stock} units left)`,
              can_manage: true
            }))
            .sort((a, b) => (parseInt(a.stock, 10) === 0 ? -1 : 1));
          setLowStockProducts(lowItems);
        } catch (e) {
          console.error('Fallback low stock calculation error:', e);
        }
      }

    } catch (err) {
      console.error('Error loading owner dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdated = (updatedProduct) => {
    // Dynamically update state without full reloading, then trigger background refresh
    if (updatedProduct) {
      const newStock = parseInt(updatedProduct.stock, 10);
      setLowStockProducts(prev => {
        if (newStock > 10) {
          // Stock > 10: remove from Low Stock Warnings list
          return prev.filter(p => String(p.id || p._id) !== String(updatedProduct.id || updatedProduct._id));
        } else {
          // Stock <= 10: update warning item in place
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
    }
    // Re-synchronize distribution and metrics from database
    loadDashboardData();
  };

  return (
    <DashboardLayout role="owner" activeNav="dashboard">
      <div className="space-y-6">
        {/* Top Section: Dashboard Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523]">
              CraftNest Command Center
            </h1>
            <p className="text-xs sm:text-sm text-[#6F625D] mt-0.5">
              Real-time enterprise overview of artisan crafts, patrons, fulfillment, and revenue
            </p>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E6D8CC] text-[#2B2523] hover:border-[#A63D40] transition-colors shadow-sm disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Analytics</span>
          </button>
        </div>

        {/* Top Section: Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Platform Revenue"
            value={`₹${Number(stats?.total_revenue || stats?.revenue || 0).toLocaleString('en-IN')}`}
            icon={DollarSign}
            trend="All-time verified payments"
          />
          <MetricCard
            title="Total Orders"
            value={stats?.total_orders || fulfillmentData.total_orders || 0}
            icon={ShoppingBag}
            trend="Orders across India"
          />
          <MetricCard
            title="Handicraft Catalog"
            value={stats?.total_products || stats?.products_count || categoryData.total_products || 0}
            icon={Package}
            trend="Active artisanal items"
          />
          <MetricCard
            title="Patrons & Artisans"
            value={stats?.total_users || stats?.users_count || 0}
            icon={Users}
            trend="Registered community"
          />
        </div>

        {/* Middle Section: 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left: Order Fulfillment Status Breakdown */}
          <OrderFulfillmentBreakdown
            breakdown={fulfillmentData.breakdown}
            totalOrders={fulfillmentData.total_orders}
            loading={loading}
            title="Order Fulfillment Status Breakdown"
            subtitle="Platform-wide patron orders categorized by delivery milestones"
          />

          {/* Right: Category Stock Value Distribution (Price × Stock) */}
          <CategoryStockDistribution
            categories={categoryData.categories}
            totalStockValue={categoryData.total_stock_value}
            totalProducts={categoryData.total_products}
            totalStockUnits={categoryData.total_stock_units}
            loading={loading}
            title="Category Stock Value Distribution"
            subtitle="Catalog valuation by category: SUM(Product Price × Available Stock Quantity)"
          />
        </div>

        {/* Bottom Section: Low Stock Warnings */}
        <LowStockWarnings
          products={lowStockProducts}
          loading={loading}
          role="owner"
          onStockUpdated={handleStockUpdated}
          title="Low Stock & Depletion Warnings"
          subtitle="Real-time alerts for handicrafts requiring urgent replenishment (Stock ≤ 10 units)"
        />
      </div>
    </DashboardLayout>
  );
}
