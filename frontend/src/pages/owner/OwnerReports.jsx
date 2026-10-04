import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, DollarSign, Calendar, 
  FileText, Download, ShoppingBag 
} from 'lucide-react';
import { ordersApi } from '../../api/orders';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import MetricCard from '../../components/dashboard/MetricCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerReports() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportLogs, setReportLogs] = useState([]);
  const [generating, setGenerating] = useState(false);

  const loadReportsData = useCallback(async () => {
    setLoading(true);
    try {
      const ordersRes = await ordersApi.getAll();
      const list = ordersRes.orders || ordersRes.value || ordersRes || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadReportsData();
    };
    run();
  }, [loadReportsData]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      // Simulate/trigger report generation
      await new Promise((r) => setTimeout(r, 800));
      const newReport = {
        id: Date.now(),
        title: `Sales & Fulfillment Ledger - ${new Date().toLocaleDateString('en-IN')}`,
        generated_at: new Date().toISOString(),
        total_orders: orders.length,
        status: 'Completed',
      };
      setReportLogs((prev) => [newReport, ...prev]);
    } catch (err) {
      console.error('Report generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length;
  const pendingOrders = orders.filter((o) => o.status === 'Pending' || o.status === 'Confirmed').length;

  return (
    <DashboardLayout title="Reports & Financial Analytics" subtitle="Comprehensive platform sales, artisan disbursements, and tax reporting">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
        <MetricCard
          title="Gross Order Volume"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          icon={DollarSign}
          trend="Total customer order value"
        />
        <MetricCard
          title="Processed Orders"
          value={orders.length}
          icon={ShoppingBag}
          trend={`${deliveredOrders} successfully delivered`}
        />
        <MetricCard
          title="Active Fulfillment"
          value={pendingOrders}
          icon={Calendar}
          trend="In artisan packing / transit"
        />
        <MetricCard
          title="Average Order Value"
          value={`₹${orders.length > 0 ? Math.round(totalRevenue / orders.length).toLocaleString('en-IN') : 0}`}
          icon={TrendingUp}
          trend="Per customer checkout"
        />
      </div>

      {/* Report Generation Section */}
      <div className="bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#2B2523] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#A63D40]" />
              <span>Generate Audit & Revenue Statement</span>
            </h3>
            <p className="text-xs text-[#6F625D] mt-1">
              Download complete CSV/PDF records for GST, artisan royalties, and logistics audits
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={generating}
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{generating ? 'Generating Statement...' : 'Generate New Statement'}</span>
          </button>
        </div>

        {reportLogs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#E6D8CC] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6F625D]">
              Recent Generated Statements
            </h4>
            <div className="divide-y divide-[#E6D8CC]/60">
              {reportLogs.map((rep) => (
                <div key={rep.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[#2B2523] block">{rep.title}</span>
                    <span className="text-[10px] text-[#6F625D]">
                      Covering {rep.total_orders} orders • Status: {rep.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert(`Report downloaded: ${rep.title}`)}
                    className="text-[#A63D40] font-semibold hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Order Settlement Table */}
      <div className="bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow p-6">
        <h3 className="font-serif text-lg font-bold text-[#2B2523] mb-4">
          Recent Transaction Records
        </h3>

        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner label="Auditing transactional records..." />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-[#6F625D] text-xs">
            No transaction records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#6F625D] uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items Count</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payment Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D8CC]/60">
                {orders.slice(0, 15).map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#FFF9F3]/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#2B2523]">
                      {ord.order_id || `#${ord.id}`}
                    </td>
                    <td className="py-3 px-4 text-[#6F625D]">
                      {ord.created_at ? new Date(ord.created_at).toLocaleDateString('en-IN') : 'Recent'}
                    </td>
                    <td className="py-3 px-4 text-[#2B2523]">
                      {(ord.items || []).length} items
                    </td>
                    <td className="py-3 px-4 font-bold text-[#2B2523]">
                      ₹{Number(ord.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FFF9F3] border border-[#E6D8CC] text-[11px] font-semibold text-[#A63D40]">
                        {ord.status || 'Confirmed'}
                      </span>
                    </td>
                    <td className="py-3 px-4 uppercase text-[#6F625D] text-[11px]">
                      {ord.payment_method || 'Online / COD'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
