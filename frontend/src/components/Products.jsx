import { useState, useEffect } from 'react';
import { ecommerceApi } from '../api/ecommerce';
import { Pencil, Trash2, Upload } from 'lucide-react';
import '../styles/Ecommerce.css';

export default function Products() {
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', price: '', subCategoryId: '', image: null, link: ''
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
      image: null,
      link: prod.link || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) {
      await ecommerceApi.deleteProduct(id);
      loadData();
    }
  };

  const handleMetaSubmit = async (e) => {
    e.preventDefault();
    
    // Validate image dimensions
    if (form.image) {
      const img = new Image();
      const imageUrl = URL.createObjectURL(form.image);
      
      img.onload = async () => {
        URL.revokeObjectURL(imageUrl);
        
        if (img.width < 500 || img.height < 500) {
          alert('❌ Image must be at least 500×500 pixels. Current size: ' + img.width + '×' + img.height);
          return;
        }
        
        await submitMetaProduct();
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        alert('❌ Failed to load image');
      };
      
      img.src = imageUrl;
    } else {
      alert('❌ Image is required for Meta Catalog');
    }
  };
  
  const submitMetaProduct = async () => {
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description);
    formData.append('price', form.price);
    formData.append('subCategoryId', form.subCategoryId);
    formData.append('link', form.link);
    if (form.image) formData.append('image', form.image);

    try {
      const result = await ecommerceApi.createProduct(formData);
      await ecommerceApi.syncProductToMeta(result.data.id);
      alert('✅ Product added to database and Meta Catalog!');
    } catch (error) {
      alert('❌ Failed: ' + (error.response?.data?.message || error.message));
    }
    
    setForm({ name: '', description: '', price: '', subCategoryId: '', image: null, link: '' });
    setShowMetaModal(false);
    loadData();
  };

  const handleSyncToMeta = async (prod) => {
    try {
      await ecommerceApi.syncProductToMeta(prod.id);
      alert(`✅ ${prod.name} synced to Meta Catalog successfully!`);
    } catch (error) {
      alert(`❌ Failed to sync: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <div className="header-left">
          <h2>Products</h2>
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Product</button>
          <button 
            onClick={() => setShowMetaModal(true)} 
            style={{
              background: '#25d366',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <Upload size={18} /> Add to Meta Catalog
          </button>
        </div>
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
                  {prod.imageUrl && <img src={prod.imageUrl.startsWith('http') ? prod.imageUrl : `http://localhost:3010${prod.imageUrl}`} alt={prod.name} className="product-image" />}
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
            <p style={{fontSize: '12px', color: '#6b7280', marginBottom: '8px'}}>Supported formats: JPEG, PNG (Max 5MB)</p>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              <label className="btn-secondary" style={{cursor: 'pointer', margin: 0}}>
                {form.image ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
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
                  src={form.image ? URL.createObjectURL(form.image) : (editingProduct.imageUrl.startsWith('http') ? editingProduct.imageUrl : `http://localhost:3010${editingProduct.imageUrl}`)}
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setForm({ ...form, image: null });
                    setEditingProduct(editingProduct ? { ...editingProduct, imageUrl: null } : null);
                  }}
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

      {showMetaModal && (
        <div className="modal-overlay" onClick={() => setShowMetaModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Upload size={20} color="#25d366" /> Add to Meta Catalog
              </h3>
              <button className="modal-close" onClick={() => setShowMetaModal(false)}>×</button>
            </div>
            <form onSubmit={handleMetaSubmit}>
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
            <label>Link</label>
            <input
              className="form-input"
              type="url"
              placeholder="https://example.com/product"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Product Image <span style={{color: '#ef4444'}}>*</span></label>
            <p style={{fontSize: '12px', color: '#ef4444', marginBottom: '8px', fontWeight: '500'}}>Required: Minimum 500×500 pixels | JPEG, PNG (Max 5MB)</p>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              <label className="btn-secondary" style={{cursor: 'pointer', margin: 0}}>
                {form.image ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
                  style={{display: 'none'}}
                />
              </label>
              {form.image && (
                <span style={{fontSize: '12px', color: '#25d366'}}>✓ {form.image.name}</span>
              )}
            </div>
            {form.image && (
              <div style={{marginTop: '10px', position: 'relative', display: 'inline-block', width: '200px'}}>
                <img 
                  src={URL.createObjectURL(form.image)}
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setForm({ ...form, image: null });
                  }}
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            )}
          </div>
              <button type="submit" style={{
                background: '#25d366',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                width: '100%'
              }}>Add to Meta Catalog</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
