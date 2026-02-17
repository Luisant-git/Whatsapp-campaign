import { useState, useEffect } from 'react';
import { ecommerceApi } from '../api/ecommerce';
import { Pencil, Trash2 } from 'lucide-react';
import '../styles/Ecommerce.css';

export default function Products() {
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', price: '', subCategoryId: '', image: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [subs, prods] = await Promise.all([
      ecommerceApi.getSubCategories(),
      ecommerceApi.getProducts(),
    ]);
    setSubCategories(subs.data);
    setProducts(prods.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description);
    formData.append('price', form.price);
    formData.append('subCategoryId', form.subCategoryId);
    if (form.image) formData.append('image', form.image);

    if (editingProduct) {
      await ecommerceApi.updateProduct(editingProduct.id, formData);
      setEditingProduct(null);
    } else {
      await ecommerceApi.createProduct(formData);
    }
    setForm({ name: '', description: '', price: '', subCategoryId: '', image: null });
    setShowModal(false);
    loadData();
  };

  const handleEdit = (prod) => {
    setEditingProduct(prod);
    setForm({
      name: prod.name,
      description: prod.description || '',
      price: prod.price,
      subCategoryId: prod.subCategoryId,
      image: null
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) {
      await ecommerceApi.deleteProduct(id);
      loadData();
    }
  };

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <div className="header-left">
          <h2>Products</h2>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Product</button>
      </div>

      <div className="filters-section">
        <div className="total-count">
          Total: {products.length} Product{products.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="table-container">
        <table className="contacts-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((prod) => (
              <tr key={prod.id}>
                <td>
                  {prod.imageUrl && <img src={`http://localhost:3010${prod.imageUrl}`} alt={prod.name} className="product-image" />}
                </td>
                <td>
                  <div style={{fontWeight: 500}}>{prod.name}</div>
                  <div style={{fontSize: '12px', color: '#9ca3af', marginTop: '2px'}}>{prod.description?.substring(0, 50)}</div>
                </td>
                <td style={{fontWeight: 600}}>₹{prod.price}</td>
                <td>{prod.subCategory?.name}</td>
                <td>
                  <div style={{display: 'flex', gap: '8px'}}>
                    <button onClick={() => handleEdit(prod)} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', transition: 'all 0.2s'}}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(prod.id)} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', transition: 'all 0.2s', color: '#ef4444'}}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit' : 'Add New'} Product</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingProduct(null); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product Name</label>
            <input
              className="form-input"
              placeholder="e.g., iPhone 15 Pro"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-textarea"
              placeholder="Product description..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Price (₹)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>SubCategory</label>
            <select
              className="form-select"
              value={form.subCategoryId}
              onChange={(e) => setForm({ ...form, subCategoryId: e.target.value })}
              required
            >
              <option value="">Select subcategory...</option>
              {subCategories.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Product Image</label>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              <label className="btn-secondary" style={{cursor: 'pointer', margin: 0}}>
                {form.image ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
                  style={{display: 'none'}}
                />
              </label>
              {form.image && (
                <span style={{fontSize: '12px', color: '#25d366'}}>✓ {form.image.name}</span>
              )}
            </div>
            {(form.image || editingProduct?.imageUrl) && (
              <div style={{marginTop: '10px', position: 'relative', display: 'inline-block', width: '200px'}}>
                <img 
                  src={form.image ? URL.createObjectURL(form.image) : `http://localhost:3010${editingProduct.imageUrl}`}
                  alt="Preview" 
                  style={{
                    width: '100%',
                    height: '150px',
                    borderRadius: '4px',
                    border: '2px solid #e2e8f0',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                <button 
                  type="button"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '28px',
                    height: '28px',
                    padding: '0',
                    border: 'none',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    lineHeight: '1'
                  }}
                  onClick={() => setForm({ ...form, image: null })}
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            )}
          </div>
              <button type="submit" className="btn-primary">{editingProduct ? 'Update' : 'Add'} Product</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
