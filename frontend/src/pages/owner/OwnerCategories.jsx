import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { productsApi } from '../../api/products';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: ''
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await productsApi.getCategories();
      setCategories(res.categories || res || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', image_url: '' });
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      description: cat.description || '',
      image_url: cat.image_url || ''
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      if (editingCategory) {
        await productsApi.updateCategory(editingCategory.id, formData);
      } else {
        await productsApi.createCategory(formData);
      }
      setShowModal(false);
      await loadCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save craft category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this craft category?')) return;
    try {
      await productsApi.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert('Unable to delete category. It may contain active handicrafts.');
    }
  };

  return (
    <DashboardLayout role="owner" activeNav="categories">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
            Craft Categories & Guilds
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Organize handicrafts into regional disciplines, materials, and artisan traditions
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAddModal}>
          Add New Category
        </Button>
      </div>

      <div style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {loading ? (
          <div style={{ padding: '48px 0' }}>
            <LoadingSpinner text="Loading craft categories..." />
          </div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <Layers size={40} color="var(--color-border)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>No categories created</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Add your first traditional craft category.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-warm-cream)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Category</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Description</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Crafts Count</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-soft-beige)',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--color-border)',
                          flexShrink: 0
                        }}>
                          {c.image_url ? (
                            <img src={c.image_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Layers size={20} color="var(--color-primary-terracotta)" />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Slug: {c.slug || c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)', maxWidth: '360px' }}>
                      {c.description || 'Traditional artisanal handicraft category.'}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {c.products_count !== undefined ? `${c.products_count} crafts` : 'Active'}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(c)}
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
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
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
            maxWidth: '500px',
            padding: '32px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', margin: 0, color: 'var(--color-text-primary)' }}>
                {editingCategory ? 'Edit Category' : 'Create Craft Category'}
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
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Category Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Terracotta & Clay Crafts"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Image URL</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Overview of this handicraft tradition..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={saving}>
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
