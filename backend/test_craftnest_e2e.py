import os
import sys
import unittest
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app

class CraftNestE2ETest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    def test_01_owner_login(self):
        """Unified login with Main Owner credentials"""
        res = self.client.post('/api/auth/login', json={
            'email': 'owner@craftnest.com',
            'password': 'Admin@123'
        })
        self.assertEqual(res.status_code, 200, f"Owner login failed: {res.data}")
        data = res.get_json()
        self.assertIn('token', data)
        role = (data.get('role') or data.get('user', {}).get('role') or '').lower()
        self.assertIn(role, ['owner', 'admin'])
        print(f"✓ Main Owner login verified! Role: {role}")

    def test_02_sub_owner_login(self):
        """Unified login with Sub-Owner credentials"""
        res = self.client.post('/api/auth/login', json={
            'email': 'subowner@craftnest.com',
            'password': 'SubOwner@123'
        })
        self.assertEqual(res.status_code, 200, f"Sub-owner login failed: {res.data}")
        data = res.get_json()
        self.assertIn('token', data)
        role = (data.get('role') or data.get('user', {}).get('role') or '').lower()
        self.assertEqual(role, 'sub_owner')
        print(f"✓ Sub Owner login verified! Role: {role}")

    def test_03_seller_login(self):
        """Unified login with Artisan Seller credentials"""
        res = self.client.post('/api/auth/login', json={
            'email': 'artisan@craftnest.com',
            'password': 'Seller@123'
        })
        self.assertEqual(res.status_code, 200, f"Seller login failed: {res.data}")
        data = res.get_json()
        self.assertIn('token', data)
        role = (data.get('role') or data.get('user', {}).get('role') or '').lower()
        self.assertEqual(role, 'seller')
        print(f"✓ Seller login verified! Role: {role}")

    def test_04_customer_login(self):
        """Unified login with Customer credentials"""
        res = self.client.post('/api/auth/login', json={
            'email': 'customer@craftnest.com',
            'password': 'Customer@123'
        })
        self.assertEqual(res.status_code, 200, f"Customer login failed: {res.data}")
        data = res.get_json()
        self.assertIn('token', data)
        role = (data.get('role') or data.get('user', {}).get('role') or '').lower()
        self.assertEqual(role, 'customer')
        print(f"✓ Customer login verified! Role: {role}")

    def test_05_products_and_categories_api(self):
        """Verify dynamic handicraft categories and products from backend API"""
        cat_res = self.client.get('/api/products/categories')
        self.assertEqual(cat_res.status_code, 200)
        cat_json = cat_res.get_json()
        categories = cat_json if isinstance(cat_json, list) else cat_json.get('categories', [])
        self.assertGreater(len(categories), 0, "No categories returned from API")

        prod_res = self.client.get('/api/products')
        self.assertEqual(prod_res.status_code, 200)
        prod_json = prod_res.get_json()
        products = prod_json if isinstance(prod_json, list) else prod_json.get('products', [])
        self.assertGreater(len(products), 0, "No products returned from API")
        print(f"✓ Products API verified! {len(products)} crafts, {len(categories)} categories")

    def test_06_customer_blocked_from_admin_api(self):
        """Security check: customer token must receive 403 on admin-only endpoints"""
        login_res = self.client.post('/api/auth/login', json={
            'email': 'customer@craftnest.com',
            'password': 'Customer@123'
        })
        token = login_res.get_json().get('token')
        admin_res = self.client.get('/api/admin/stats', headers={
            'Authorization': f'Bearer {token}'
        })
        self.assertIn(admin_res.status_code, [401, 403], f"Expected 401/403 for customer accessing admin, got {admin_res.status_code}")
        print("✓ Authorization guard verified! Customer blocked from admin APIs.")

    def test_07_owner_allowed_on_admin_api(self):
        """Security check: owner token has access to admin stats"""
        login_res = self.client.post('/api/auth/login', json={
            'email': 'owner@craftnest.com',
            'password': 'Admin@123'
        })
        token = login_res.get_json().get('token')
        admin_res = self.client.get('/api/admin/stats', headers={
            'Authorization': f'Bearer {token}'
        })
        self.assertEqual(admin_res.status_code, 200)
        print("✓ Owner access verified on admin statistics API.")

if __name__ == '__main__':
    unittest.main()
