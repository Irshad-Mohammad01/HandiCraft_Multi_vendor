import { useState, useEffect, useCallback } from 'react';
import { Layers, Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { productsApi } from '../../api/products';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import MetricCard from '../../components/dashboard/MetricCard';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [stockInputs, setStockInputs] = useState({});

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getAll({ all: 'true' });
      const list = res.products || res.items || res || [];
      setProducts(list);
      const inputs = {};
      list.forEach((p) => {
        inputs[p.id] = p.stock !== undefined ? p.stock : 10;
      });
      setStockInputs(inputs);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadInventory();
    };
    run();
  }, [loadInventory]);

  const handleStockUpdate = async (productId) => {
    const newStock = parseInt(stockInputs[productId], 10);
    if (isNaN(newStock) || newStock < 0) {
      alert('Please enter a valid non-negative number for stock.');
      return;
    }

    setUpdatingId(productId);
    try {
      if (adminApi.updateStock) {
        await adminApi.updateStock(productId, newStock);
      } else {
        await productsApi.update(productId, { stock: newStock });
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
      );
    } catch (err) {
      console.error('Error updating stock:', err);
      alert('Unable to update inventory level. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalUnits = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const lowStockCount = products.filter((p) => (Number(p.stock) || 0) <= 5).length;
  const outOfStockCount = products.filter((p) => (Number(p.stock) || 0) === 0).length;

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.id).includes(search) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    if (filterLowStock) {
      return matchesSearch && (Number(p.stock) || 0) <= 5;
    }
    return matchesSearch;
  });

  return (
    <DashboardLayout title="Handicraft Inventory Ledger" subtitle="Manage workshop stock levels, safety stock alerts, and artisan allocations">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <MetricCard
          title="Total Catalog Units"
          value={totalUnits.toLocaleString('en-IN')}
          icon={Layers}
          trend={`${products.length} registered craft designs`}
        />
        <MetricCard
          title="Low Stock Alerts"
          value={lowStockCount}
          icon={AlertTriangle}
          trend="≤ 5 units remaining in workshop"
        />
        <MetricCard
          title="Sold Out Designs"
          value={outOfStockCount}
          icon={AlertTriangle}
          trend="Requires urgent artisan re-stock"
        />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow p-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by craft name, ID, category..."
              className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 pl-9 pr-4 text-xs text-[#2B2523] placeholder-[#6F625D]/60 focus:bg-white focus:border-[#A63D40]"
            />
            <Search className="w-4 h-4 text-[#6F625D] absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                filterLowStock
                  ? 'bg-rose-50 text-[#B84242] border border-rose-200'
                  : 'bg-[#FFF9F3] text-[#6F625D] border border-[#E6D8CC] hover:bg-[#F4E8DC]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Stock Only ({lowStockCount})</span>
            </button>

            <button
              type="button"
              onClick={loadInventory}
              className="p-2 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] text-[#6F625D] hover:text-[#A63D40] cursor-pointer"
              title="Refresh inventory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner label="Auditing warehouse & artisan stock..." />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-[#6F625D] text-xs">
            No handicraft products found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#6F625D] uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Craft Creation</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Stock On Hand</th>
                  <th className="py-3 px-4 text-right">Quick Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D8CC]/60">
                {filteredProducts.map((prod) => {
                  const currentStock = Number(prod.stock) || 0;
                  const isLow = currentStock <= 5 && currentStock > 0;
                  const isOut = currentStock === 0;

                  return (
                    <tr key={prod.id} className="hover:bg-[#FFF9F3]/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {prod.image_url || prod.images?.[0] ? (
                            <img
                              src={prod.image_url || prod.images?.[0]}
                              alt={prod.name}
                              className="w-10 h-10 rounded-xl object-cover border border-[#E6D8CC] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] shrink-0">
                              <Layers className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-[#2B2523] truncate max-w-[240px]">
                              {prod.name}
                            </p>
                            <p className="text-[10px] text-[#6F625D]">ID: #{prod.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#6F625D]">
                        {prod.category?.name || prod.category || 'General Craft'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#2B2523]">
                        ₹{Number(prod.price || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        {isOut ? (
                          <Badge variant="error">Sold Out</Badge>
                        ) : isLow ? (
                          <Badge variant="warning">Low Stock ({currentStock})</Badge>
                        ) : (
                          <Badge variant="success">In Stock</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="number"
                          min="0"
                          value={stockInputs[prod.id] !== undefined ? stockInputs[prod.id] : currentStock}
                          onChange={(e) =>
                            setStockInputs({ ...stockInputs, [prod.id]: e.target.value })
                          }
                          className="w-20 bg-[#FFF9F3] border border-[#E6D8CC] rounded-lg py-1 px-2 text-center text-xs font-bold text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={updatingId === prod.id}
                          onClick={() => handleStockUpdate(prod.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#A63D40] text-white hover:bg-[#8F3034] text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {updatingId === prod.id ? 'Saving...' : 'Save'}
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
    </DashboardLayout>
  );
}
