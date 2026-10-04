import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

// Layout & Common Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import MobileBottomNav from './components/common/MobileBottomNav';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Public & Customer Pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import OrderDetails from './pages/OrderDetails';
import Orders from './pages/Orders';
import Wishlist from './pages/Wishlist';
import Account from './pages/Account';
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOtp from './pages/VerifyOtp';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';

// Owner Dashboard Pages
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerProducts from './pages/owner/OwnerProducts';
import OwnerCategories from './pages/owner/OwnerCategories';
import OwnerOrders from './pages/owner/OwnerOrders';
import OwnerCustomers from './pages/owner/OwnerCustomers';
import OwnerSellers from './pages/owner/OwnerSellers';
import OwnerSubOwners from './pages/owner/OwnerSubOwners';
import OwnerPayments from './pages/owner/OwnerPayments';
import OwnerInventory from './pages/owner/OwnerInventory';
import OwnerReports from './pages/owner/OwnerReports';
import OwnerSettings from './pages/owner/OwnerSettings';
import OwnerBanners from './pages/owner/OwnerBanners';
import OwnerControl from './pages/owner/OwnerControl';
import OwnerDatabases from './pages/owner/OwnerDatabases';
import SellerDetails from './pages/owner/SellerDetails';
import OwnerInvoices from './pages/owner/OwnerInvoices';
import OwnerSupport from './pages/owner/OwnerSupport';

// Sub Owner Dashboard Page
import SubOwnerDashboard from './pages/sub-owner/SubOwnerDashboard';

// Seller Dashboard Pages
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerProfile from './pages/seller/SellerProfile';
import SellerReviews from './pages/seller/SellerReviews';
import SellerSettings from './pages/seller/SellerSettings';

export default function App() {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Determine if current route is an authenticated administration dashboard route
  const isDashboardRoute = 
    location.pathname.startsWith('/owner') || 
    location.pathname.startsWith('/sub-owner') || 
    location.pathname.startsWith('/seller') ||
    location.pathname.startsWith('/admin');

  // Shared application layout: Global Header & Footer rendered across all public pages (including /login, /register, etc.)
  const showHeaderFooter = !isDashboardRoute;

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        height: isDashboardRoute ? '100vh' : 'auto',
        overflow: isDashboardRoute ? 'hidden' : 'visible',
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: 'var(--color-warm-cream)' 
      }}
    >
      {showHeaderFooter && <Navbar />}

      <main 
        style={{ 
          flex: 1, 
          minHeight: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: isDashboardRoute ? 'hidden' : 'visible' 
        }}
      >
        <ErrorBoundary>
          <Routes>
            {/* ==========================================================
                1. PUBLIC STOREFRONT ROUTES
                ========================================================== */}
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/search" element={<Products />} />
            <Route path="/category/:categorySlug" element={<Products />} />
            <Route path="/categories" element={<Products />} />
            <Route path="/customer-care" element={<Contact />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/products/:productId" element={<ProductDetails />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/support" element={<FAQ />} />

            {/* ==========================================================
                2. AUTHENTICATION & RECOVERY ROUTES
                ========================================================== */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ==========================================================
                3. CUSTOMER AUTHENTICATED ROUTES
                ========================================================== */}
            <Route path="/checkout" element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } />
            <Route path="/checkout/address" element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } />
            <Route path="/checkout/payment" element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } />
            <Route path="/order-success" element={
              <ProtectedRoute>
                <OrderSuccess />
              </ProtectedRoute>
            } />
            <Route path="/order-success/:orderId" element={
              <ProtectedRoute>
                <OrderSuccess />
              </ProtectedRoute>
            } />
            
            {/* Account & Sub-routes */}
            <Route path="/account" element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            } />
            <Route path="/account/profile" element={
              <ProtectedRoute>
                <Account defaultTab="profile" />
              </ProtectedRoute>
            } />
            <Route path="/account/orders" element={
              <ProtectedRoute>
                <Account defaultTab="orders" />
              </ProtectedRoute>
            } />
            <Route path="/account/orders/:orderId" element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            } />
            <Route path="/orders/:orderId" element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            } />
            <Route path="/account/wishlist" element={
              <ProtectedRoute>
                <Account defaultTab="wishlist" />
              </ProtectedRoute>
            } />
            <Route path="/account/addresses" element={
              <ProtectedRoute>
                <Account defaultTab="addresses" />
              </ProtectedRoute>
            } />
            <Route path="/account/reviews" element={
              <ProtectedRoute>
                <Account defaultTab="reviews" />
              </ProtectedRoute>
            } />
            <Route path="/account/settings" element={
              <ProtectedRoute>
                <Account defaultTab="settings" />
              </ProtectedRoute>
            } />
            <Route path="/account/support" element={
              <ProtectedRoute>
                <Account defaultTab="support" />
              </ProtectedRoute>
            } />
            <Route path="/account/support/:ticketId" element={
              <ProtectedRoute>
                <Account defaultTab="support" />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            } />

            {/* ==========================================================
                4. MAIN OWNER APPLICATION AREA
                ========================================================== */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/owner/dashboard" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/owner/products" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerProducts />
              </ProtectedRoute>
            } />
            <Route path="/owner/products/new" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerProducts />
              </ProtectedRoute>
            } />
            <Route path="/owner/products/:productId" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <ProductDetails />
              </ProtectedRoute>
            } />
            <Route path="/owner/products/:productId/edit" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerProducts />
              </ProtectedRoute>
            } />
            <Route path="/owner/categories" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerCategories />
              </ProtectedRoute>
            } />
            <Route path="/owner/orders" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerOrders />
              </ProtectedRoute>
            } />
            <Route path="/owner/orders/:orderId" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerOrders />
              </ProtectedRoute>
            } />
            <Route path="/owner/users" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerCustomers />
              </ProtectedRoute>
            } />
            <Route path="/owner/customers" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerCustomers />
              </ProtectedRoute>
            } />
            <Route path="/owner/sellers" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerSellers />
              </ProtectedRoute>
            } />
            <Route path="/owner/sellers/:sellerId" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <SellerDetails />
              </ProtectedRoute>
            } />
            <Route path="/owner/control" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerControl />
              </ProtectedRoute>
            } />
            <Route path="/owner/databases" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerDatabases />
              </ProtectedRoute>
            } />
            <Route path="/owner/analytics" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerReports />
              </ProtectedRoute>
            } />
            <Route path="/owner/sub-owners" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerSubOwners />
              </ProtectedRoute>
            } />
            <Route path="/owner/inventory" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerInventory />
              </ProtectedRoute>
            } />
            <Route path="/owner/payments" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerPayments />
              </ProtectedRoute>
            } />
            <Route path="/owner/invoices" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerInvoices />
              </ProtectedRoute>
            } />
            <Route path="/owner/reports" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerReports />
              </ProtectedRoute>
            } />
            <Route path="/owner/banners" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerBanners />
              </ProtectedRoute>
            } />
            <Route path="/owner/settings" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerSettings />
              </ProtectedRoute>
            } />
            <Route path="/owner/support" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerSupport />
              </ProtectedRoute>
            } />
            <Route path="/owner/support/:ticketId" element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerSupport />
              </ProtectedRoute>
            } />

            {/* ==========================================================
                5. SUB OWNER OPERATIONAL WORKSPACE
                ========================================================== */}
            <Route path="/sub-owner/dashboard" element={
              <ProtectedRoute allowedRoles={['sub_owner', 'owner', 'admin']}>
                <SubOwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/sub-owner/products" element={
              <ProtectedRoute allowedRoles={['sub_owner', 'owner', 'admin']}>
                <OwnerProducts isSubOwner={true} />
              </ProtectedRoute>
            } />
            <Route path="/sub-owner/orders" element={
              <ProtectedRoute allowedRoles={['sub_owner', 'owner', 'admin']}>
                <OwnerOrders isSubOwner={true} />
              </ProtectedRoute>
            } />
            <Route path="/sub-owner/invoices" element={
              <ProtectedRoute allowedRoles={['sub_owner', 'owner', 'admin']}>
                <OwnerInvoices />
              </ProtectedRoute>
            } />
            <Route path="/sub-owner/inventory" element={
              <ProtectedRoute allowedRoles={['sub_owner', 'owner', 'admin']}>
                <OwnerInventory />
              </ProtectedRoute>
            } />
            <Route path="/sub-owner/sellers" element={
              <ProtectedRoute allowedRoles={['sub_owner', 'owner', 'admin']}>
                <OwnerSellers />
              </ProtectedRoute>
            } />
            <Route path="/sub-owner/reports" element={
              <ProtectedRoute allowedRoles={['sub_owner', 'owner', 'admin']}>
                <OwnerReports />
              </ProtectedRoute>
            } />
            <Route path="/sub-owner/settings" element={
              <ProtectedRoute allowedRoles={['sub_owner', 'owner', 'admin']}>
                <OwnerSettings />
              </ProtectedRoute>
            } />

            {/* ==========================================================
                6. ARTISAN SELLER PORTAL
                ========================================================== */}
            <Route path="/seller/dashboard" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/seller/products" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/seller/products/new" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/seller/products/add" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/seller/products/:productId" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <ProductDetails />
              </ProtectedRoute>
            } />
            <Route path="/seller/products/:productId/edit" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/seller/orders" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/seller/orders/:orderId" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <OrderDetails />
              </ProtectedRoute>
            } />
            <Route path="/seller/payments" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/seller/inventory" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/seller/reviews" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <SellerReviews />
              </ProtectedRoute>
            } />
            <Route path="/seller/profile" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <SellerProfile />
              </ProtectedRoute>
            } />
            <Route path="/seller/settings" element={
              <ProtectedRoute allowedRoles={['seller', 'owner', 'admin']}>
                <SellerSettings />
              </ProtectedRoute>
            } />

            {/* ==========================================================
                7. 404 & CATCH-ALL ROUTE (NO BLANK SCREEN)
                ========================================================== */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {showHeaderFooter && <Footer />}
      {showHeaderFooter && <MobileBottomNav />}
    </div>
  );
}
