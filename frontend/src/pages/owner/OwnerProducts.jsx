import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, Plus, Search, Edit2, Trash2, 
  AlertCircle, Check, Eye, X, Filter 
} from 'lucide-react';
import { productsApi } from '../../api/products';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '',
    stock: '',
    category_id: '',
    artisan_name: '',
    image_url: '',
    materials: '',
    origin: '',
    show_on_home: false
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        productsApi.getAll({ all: 'true' }),
        productsApi.getCategories()
      ]);
      setProducts(prodRes.products || prodRes || []);
      const loadedCats = Array.isArray(catRes) ? catRes : (catRes.categories || []);
      setCategories(loadedCats);
    } catch (err) {
      console.error('Failed to load products/categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    const defaultCatId = categories.length > 0 ? String(categories[0].id || categories[0]._id || '') : '';
    setFormData({
      name: '',
      description: '',
      price: '',
      original_price: '',
      stock: '10',
      category_id: defaultCatId,
      artisan_name: '',
      image_url: '',
      materials: '',
      origin: '',
      show_on_home: false
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    const prodCatId = prod.category_id || (prod.category && (prod.category.id || prod.category._id)) || '';
    setFormData({
      name: prod.name || prod.title || '',
      description: prod.description || prod.description_en || '',
      price: prod.price !== undefined ? String(prod.price) : '',
      original_price: prod.original_price || prod.original_mrp || '',
      stock: prod.stock !== undefined ? String(prod.stock) : (prod.available_stock !== undefined ? String(prod.available_stock) : ''),
      category_id: prodCatId ? String(prodCatId) : (categories.length > 0 ? String(categories[0].id || categories[0]._id) : ''),
      artisan_name: prod.artisan_name || prod.created_by || '',
      image_url: prod.image_url || (prod.images && prod.images[0]) || '',
      materials: prod.materials || prod.features_en || prod.features || '',
      origin: prod.origin || prod.craft_origin || prod.specifications_en || prod.specifications || '',
      show_on_home: Boolean(prod.show_on_home ?? prod.show_on_homepage ?? false)
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    const nameVal = formData.name.trim();
    if (!nameVal) {
      setErrorMsg('Craft Title is required.');
      setSaving(false);
      return;
    }

    const priceVal = parseFloat(formData.price);
    if (isNaN(priceVal) || priceVal <= 0) {
      setErrorMsg('Selling price must be a valid number greater than 0.');
      setSaving(false);
      return;
    }

    const stockVal = parseInt(formData.stock, 10);
    if (isNaN(stockVal) || stockVal < 0) {
      setErrorMsg('Available stock units must be a non-negative integer.');
      setSaving(false);
      return;
    }

    // Resolve category safely
    let chosenCatId = formData.category_id;
    if (!chosenCatId && categories.length > 0) {
      chosenCatId = String(categories[0].id || categories[0]._id);
    }
    const catObj = categories.find(c => String(c.id) === String(chosenCatId) || String(c._id) === String(chosenCatId));
    const catName = catObj ? catObj.name : 'Handicrafts';

    try {
      const origMrpVal = formData.original_price ? parseFloat(formData.original_price) : null;
      const imageUrlVal = formData.image_url.trim();

      const payload = {
        name: nameVal,
        title: nameVal,
        description: formData.description.trim(),
        price: priceVal,
        selling_price: priceVal,
        original_price: origMrpVal,
        original_mrp: origMrpVal,
        stock: stockVal,
        available_stock: stockVal,
        category_id: chosenCatId ? parseInt(chosenCatId, 10) : undefined,
        category: catName,
        artisan_name: formData.artisan_name.trim(),
        image_url: imageUrlVal,
        images: imageUrlVal ? [imageUrlVal, imageUrlVal] : [],
        materials: formData.materials.trim(),
        origin: formData.origin.trim(),
        craft_origin: formData.origin.trim(),
        show_on_home: Boolean(formData.show_on_home),
        show_on_homepage: Boolean(formData.show_on_home)
      };

      if (editingProduct) {
        await productsApi.update(editingProduct.id, payload);
        setSuccessMsg(`"${nameVal}" updated successfully!`);
      } else {
        await productsApi.create(payload);
        setSuccessMsg(`"${nameVal}" added to handicraft catalog successfully!`);
      }

      setShowModal(false);
      await loadData();
    } catch (err) {
      console.error('Error saving product:', err);
      const serverErr = err.response?.data?.message || err.response?.data?.error;
      setErrorMsg(serverErr || 'Failed to save handicraft. Please verify all required fields.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this handicraft from the catalog?')) return;
    try {
      await productsApi.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setSuccessMsg('Handicraft deleted successfully.');
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Unable to delete craft. It may be linked to active patron orders.');
    }
  };

  const filteredProducts = products.filter(p => {
    const pCatId = p.category_id || (p.category && (p.category.id || p.category._id)) || '';
    const pCatName = typeof p.category === 'string' ? p.category : (p.category?.name || '');
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      ((p.artisan_name || p.created_by || '').toLowerCase().includes(search.toLowerCase()));
    const matchesCat = !selectedCategory || String(pCatId) === String(selectedCategory) || (pCatName.toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  return (
    <DashboardLayout role="owner" activeNav="products">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
            Handicraft Inventory Catalog
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Curate, price, and monitor artisan crafts across all regional categories
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAddModal}>
          Add New Handicraft
        </Button>
      </div>

      {/* Success Alert Banner */}
      {successMsg && (
        <div 
          id="owner-product-success-alert"
          style={{
            backgroundColor: '#E8F5E9',
          color: '#2E7D32',
          border: '1px solid #A5D6A7',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2E7D32' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        backgroundColor: 'var(--color-white)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Search size={18} color="var(--color-text-secondary)" />
          <input
            type="text"
            placeholder="Search by craft title or artisan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--color-text-secondary)" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '0.85rem',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-white)'
            }}
          >
            <option value="">All Craft Categories</option>
            {categories.map(c => (
              <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {loading ? (
          <div style={{ padding: '48px 0' }}>
            <LoadingSpinner text="Loading craft catalog..." />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <Package size={40} color="var(--color-border)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>No handicrafts found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Try adjusting your search filter or add a new craft to the catalog.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-warm-cream)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Craft Item</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Category</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Price</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Stock Units</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Artisan / Guild</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const cat = categories.find(c => String(c.id) === String(p.category_id || (p.category && (p.category.id || p.category._id))) || String(c._id) === String(p.category_id));
                  const catName = cat ? cat.name : (typeof p.category === 'string' ? p.category : (p.category?.name || 'Handicraft'));
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <Link to={`/products/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-soft-beige)',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--color-border)',
                            flexShrink: 0
                          }}>
                            <img 
                              src={p.image_url || (p.images && p.images[0]) || '/placeholder.png'} 
                              alt={p.name} 
                              onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=200&auto=format&fit=crop&q=80'; }}
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-terracotta)' }}>ID: #{p.id} · Manage &rarr;</div>
                          </div>
                        </Link>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)' }}>
                        {catName}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--color-primary-terracotta)' }}>
                        ₹{Number(p.price).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontWeight: 600,
                          color: p.stock > 5 ? 'var(--color-success)' : p.stock > 0 ? 'var(--color-warning)' : 'var(--color-error)'
                        }}>
                          {p.stock} units
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {p.artisan_name || p.created_by || 'Platform Owner'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: p.database_id === 'DB1' || !p.seller_id ? '#E8F5E9' : '#EDE7F6',
                            color: p.database_id === 'DB1' || !p.seller_id ? '#2E7D32' : '#5E35B1',
                            fontWeight: 700
                          }}>
                            {p.database_id || (p.seller_id ? `DB${p.seller_id}` : 'DB1')}
                          </span>
                          {p.seller_id ? (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                              Seller #{p.seller_id}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#2E7D32', fontWeight: 600 }}>
                              Owner Platform
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <Link
                            to={`/products/${p.id}`}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-border)',
                              backgroundColor: 'var(--color-warm-cream)',
                              textDecoration: 'none',
                              color: 'var(--color-text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}
                          >
                            <Eye size={14} />
                            <span>Manage</span>
                          </Link>
                          <button
                            onClick={() => openEditModal(p)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-border)',
                              backgroundColor: 'var(--color-white)',
                              cursor: 'pointer',
                              color: 'var(--color-text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid #FFCDD2',
                              backgroundColor: '#FFF5F5',
                              cursor: 'pointer',
                              color: 'var(--color-error)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
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

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', margin: 0, color: 'var(--color-text-primary)' }}>
                {editingProduct ? 'Edit Handicraft' : 'Add New Handicraft to Catalog'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ padding: '12px', backgroundColor: '#FFEBEE', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Craft Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Handcrafted Terracotta Water Urn"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Category *</label>
                  <select
                    required
                    value={formData.category_id || (categories.length > 0 ? String(categories[0].id || categories[0]._id) : '')}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-white)' }}
                  >
                    {categories.length === 0 && <option value="">Select Category</option>}
                    {categories.map(c => (
                      <option key={c.id || c._id} value={String(c.id || c._id)}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="1299"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Original MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    placeholder="1699"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Available Stock Units *</label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="15"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Artisan / Guild Name</label>
                  <input
                    type="text"
                    value={formData.artisan_name}
                    onChange={(e) => setFormData({ ...formData, artisan_name: e.target.value })}
                    placeholder="e.g. Master Kumhar Mohan Lal"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Image URL</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Artisanal Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the craft techniques, materials, and significance..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Materials</label>
                  <input
                    type="text"
                    value={formData.materials}
                    onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                    placeholder="Terracotta clay, mineral colors"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Craft Origin</label>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="Jaipur, Rajasthan"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                  />
                </div>
              </div>

              {/* Show on Home Page Option */}
              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', backgroundColor: 'var(--color-bg-secondary, #FFF9F3)', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--color-border, #E6D8CC)' }}>
                <input
                  type="checkbox"
                  id="owner_show_on_home"
                  checked={Boolean(formData.show_on_home)}
                  onChange={(e) => setFormData({ ...formData, show_on_home: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary, #C86D51)' }}
                />
                <div>
                  <label htmlFor="owner_show_on_home" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none', color: 'var(--color-text, #2B2523)' }}>
                    Show on Home Page
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light, #8C7E77)', display: 'block', marginTop: '2px' }}>
                    Eligible to appear in the Featured/Curated products section on the main customer homepage.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={saving}>
                  {editingProduct ? 'Save Updates' : 'Add Handicraft'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
