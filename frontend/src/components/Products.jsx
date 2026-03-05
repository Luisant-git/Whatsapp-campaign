import { useState, useEffect } from 'react';
import { ecommerceApi } from '../api/ecommerce';
import { Pencil, Trash2, Upload, Search } from 'lucide-react';
import '../styles/Ecommerce.css';

export default function Products() {
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [productPreviewUrl, setProductPreviewUrl] = useState(null);

  // Variant modal
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariantIndex, setEditingVariantIndex] = useState(null);

  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const openAddProductModal = () => {
    setEditingProduct(null);
    setForm(emptyProductForm);
    setShowModal(true);
  };
  
  const closeProductModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setForm(emptyProductForm);
  };
  // Normal product form (DB product)
  const emptyProductForm = {
    name: '',
    description: '',
    price: '',
    subCategoryId: '',
    image: null,
    link: '',
  };
  const [form, setForm] = useState(emptyProductForm);

  // Meta form (meta-only fields + variants)
  const emptyMetaForm = {
    name: '',
    description: '',
    price: '',
    salePrice: '',
    subCategoryId: '',
    link: '',
    image: null,

    availability: true, // in stock toggle (boolean)
    isActive: true,     // active/inactive toggle (boolean)
    contentId: '',      // retailer_id override / group id

    variants: [],
  };
  const [metaForm, setMetaForm] = useState(emptyMetaForm);

  const emptyVariantForm = {
    name: '',
    description: '',
    price: '',
    salePrice: '',
    link: '',
    contentId: '',
    availability: true,
    isActive: true,
    image: null,        
    imageUrl: null,
  };
  const [variantForm, setVariantForm] = useState(emptyVariantForm);

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

  // ---------------- NORMAL PRODUCT CRUD ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description || '');
    formData.append('price', form.price);
    formData.append('subCategoryId', form.subCategoryId);
    formData.append('link', form.link || '');
    if (form.image) formData.append('image', form.image);

    if (editingProduct) {
      await ecommerceApi.updateProduct(editingProduct.id, formData);
      setEditingProduct(null);
    } else {
      await ecommerceApi.createProduct(formData);
    }

    setForm(emptyProductForm);
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
      link: prod.link || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) {
      await ecommerceApi.deleteProduct(id);
      loadData();
    }
  };

  // ---------------- META / VARIANTS ----------------
  const openMetaModal = () => {
    setMetaForm(emptyMetaForm);
    setShowMetaModal(true);
  };

  const openAddVariant = () => {
    setEditingVariantIndex(null);

    // Prefill variant with current Meta form values (so same fields are there)
    setVariantForm({
      name: metaForm.name,
      description: metaForm.description,
      price: metaForm.price,
      salePrice: metaForm.salePrice,
      link: metaForm.link,
      contentId: '',
      availability: metaForm.availability,
      isActive: metaForm.isActive,
    });

    setShowVariantModal(true);
  };

  const openEditVariant = (idx) => {
    setEditingVariantIndex(idx);
    setVariantForm(metaForm.variants[idx]);
    setShowVariantModal(true);
  };

  const removeVariant = (idx) => {
    setMetaForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  };

  const saveVariant = (e) => {
    e.preventDefault();

    // Basic validation
    if (!variantForm.name?.trim()) {
      alert('❌ Variant name is required');
      return;
    }
    if (!variantForm.price) {
      alert('❌ Variant price is required');
      return;
    }

    setMetaForm((prev) => {
      const next = [...prev.variants];

      if (editingVariantIndex !== null) next[editingVariantIndex] = variantForm;
      else next.push(variantForm);

      return { ...prev, variants: next };
    });

    setShowVariantModal(false);
    setVariantForm(emptyVariantForm);
    setEditingVariantIndex(null);
  };

  const handleMetaSubmit = async (e) => {
    e.preventDefault();

    // Validate image dimensions (Meta requires min 500x500)
    if (!metaForm.image) {
      alert('❌ Image is required for Meta Catalog');
      return;
    }

    const img = new Image();
    const imageUrl = URL.createObjectURL(metaForm.image);

    img.onload = async () => {
      URL.revokeObjectURL(imageUrl);

      if (img.width < 500 || img.height < 500) {
        alert(
          '❌ Image must be at least 500×500 pixels. Current size: ' +
            img.width +
            '×' +
            img.height,
        );
        return;
      }

      await submitMetaProduct();
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      alert('❌ Failed to load image');
    };

    img.src = imageUrl;
  };

  const submitMetaProduct = async () => {
    // 1) Create DB product (ONLY normal fields)
    const productFormData = new FormData();
    productFormData.append('name', metaForm.name);
    productFormData.append('description', metaForm.description || '');
    productFormData.append('price', metaForm.price);
    productFormData.append('subCategoryId', metaForm.subCategoryId);
    productFormData.append('link', metaForm.link || '');
    if (metaForm.image) productFormData.append('image', metaForm.image);

    try {
      const created = await ecommerceApi.createProduct(productFormData);
      const productId = created.data.id;

      const baseRetailerId = metaForm.contentId?.trim() || `product_${productId}`;

      const metaPayload = {
        name: metaForm.name,
        description: metaForm.description,
        price: metaForm.price ? Number(metaForm.price) : undefined,
        link: metaForm.link || undefined,
      
        salePrice: metaForm.salePrice ? Number(metaForm.salePrice) : undefined,
        availability: !!metaForm.availability,
        isActive: !!metaForm.isActive,
      
        // ✅ if user typed contentId use it, else product_{id}
        contentId: baseRetailerId,
      
        // ✅ if variant contentId missing, auto-generate product_{id}_v1...
        variants: (metaForm.variants || []).map((v, idx) => ({
          name: v.name,
          description: v.description || undefined,
          price: v.price ? Number(v.price) : undefined,
          salePrice: v.salePrice ? Number(v.salePrice) : undefined,
          link: v.link || undefined,
          contentId: v.contentId?.trim() || `${baseRetailerId}_v${idx + 1}`,
          availability: !!v.availability,
          isActive: !!v.isActive,
        })),
      };
      
      await ecommerceApi.syncProductToMeta(productId, metaPayload);

      alert('✅ Product created and synced to Meta Catalog!');
      setMetaForm(emptyMetaForm);
      setShowMetaModal(false);
      loadData();
    } catch (error) {
      alert('❌ Failed: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSyncToMeta = async (prod) => {
    try {
      // This sync uses existing product details only
      await ecommerceApi.syncProductToMeta(prod.id);
      alert(`✅ ${prod.name} synced to Meta Catalog successfully!`);
      loadData();
    } catch (error) {
      alert(`❌ Failed to sync: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleSyncFromMeta = async () => {
    try {
      const result = await ecommerceApi.syncFromMeta();
      alert(`✅ Synced ${result.data.syncedCount} products from Meta Catalog!`);
      loadData();
    } catch (error) {
      alert(`❌ Failed to sync: ${error.response?.data?.message || error.message}`);
    }
  };

  // ---------------- FILTERS ----------------
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subCategory?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === 'normal') return matchesSearch && !p.metaProductId;
    if (filterType === 'uploaded') return matchesSearch && p.metaProductId && p.source !== 'meta';
    if (filterType === 'synced') return matchesSearch && p.source === 'meta';
    return matchesSearch;
  });

  const normalCount = products.filter((p) => !p.metaProductId).length;
  const uploadedCount = products.filter((p) => p.metaProductId && p.source !== 'meta').length;
  const syncedCount = products.filter((p) => p.source === 'meta').length;

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <div className="header-left">
          <h2>Products</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={openAddProductModal} className="btn-primary">
  + Add Product
</button>
          <button
            onClick={openMetaModal}
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
              fontSize: '14px',
            }}
          >
            <Upload size={18} /> Add to Meta Catalog
          </button>

          <button
            onClick={handleSyncFromMeta}
            style={{
              background: '#0084ff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <Upload size={18} style={{ transform: 'rotate(180deg)' }} /> Sync from Meta
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              background: '#f3f4f6',
              padding: '4px',
              borderRadius: '8px',
            }}
          >
            <button
              onClick={() => setFilterType('all')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                background: filterType === 'all' ? '#fff' : 'transparent',
                color: filterType === 'all' ? '#1f2937' : '#6b7280',
                boxShadow: filterType === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              All ({products.length})
            </button>

            <button
              onClick={() => setFilterType('normal')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                background: filterType === 'normal' ? '#fff' : 'transparent',
                color: filterType === 'normal' ? '#1f2937' : '#6b7280',
                boxShadow:
                  filterType === 'normal' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Normal ({normalCount})
            </button>

            <button
              onClick={() => setFilterType('uploaded')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                background: filterType === 'uploaded' ? '#fff' : 'transparent',
                color: filterType === 'uploaded' ? '#25d366' : '#6b7280',
                boxShadow:
                  filterType === 'uploaded' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Uploaded to Meta ({uploadedCount})
            </button>

            <button
              onClick={() => setFilterType('synced')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                background: filterType === 'synced' ? '#fff' : 'transparent',
                color: filterType === 'synced' ? '#0084ff' : '#6b7280',
                boxShadow:
                  filterType === 'synced' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Synced from Meta ({syncedCount})
            </button>
          </div>

          <div style={{ position: 'relative', width: '300px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px', padding: '8px 12px 8px 40px' }}
            />
          </div>
        </div>

        <div className="total-count">Showing: {filteredProducts.length}</div>
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
            {filteredProducts.map((prod) => (
              <tr key={prod.id}>
                <td>
                  {prod.imageUrl && (
                    <img
                      src={
                        prod.imageUrl.startsWith('http')
                          ? prod.imageUrl
                          : `http://localhost:3010${prod.imageUrl}`
                      }
                      alt={prod.name}
                      className="product-image"
                    />
                  )}
                </td>

                <td>
                  <div style={{ fontWeight: 500 }}>{prod.name}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                    {prod.description?.substring(0, 50)}
                  </div>
                </td>

                <td style={{ fontWeight: 600 }}>₹{prod.price}</td>
                <td>{prod.subCategory?.name}</td>

                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEdit(prod)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(prod.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        color: '#ef4444',
                      }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>

                    <button
                      onClick={() => handleSyncToMeta(prod)}
                      style={{
                        background: 'none',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        color: '#25d366',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                      title="Sync to Meta"
                    >
                      Sync
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------------- NORMAL ADD/EDIT PRODUCT MODAL ---------------- */}
      {showModal && (
  <div className="modal-overlay" onClick={closeProductModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit' : 'Add New'} Product</h3>
              <button className="modal-close" onClick={closeProductModal}>×</button>
              
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
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
  <label>Product Image</label>
  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
    Supported formats: JPEG, PNG (Max 5MB)
  </p>

  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
    <label className="btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
      {form.image ? 'Change Image' : 'Upload Image'}
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
        style={{ display: 'none' }}
      />
    </label>
    {form.image && (
      <span style={{ fontSize: '12px', color: '#25d366' }}>
        ✓ {form.image.name}
      </span>
    )}
  </div>

  {(form.image || editingProduct?.imageUrl) && (
    <div
      style={{
        marginTop: '10px',
        position: 'relative',
        display: 'inline-block',
        width: '200px',
      }}
    >
      <img
        src={
          form.image
            ? URL.createObjectURL(form.image)
            : editingProduct.imageUrl?.startsWith('http')
            ? editingProduct.imageUrl
            : `http://localhost:3010${editingProduct.imageUrl}`
        }
        alt="Preview"
        style={{
          width: '100%',
          height: '150px',
          borderRadius: '4px',
          border: '2px solid #e2e8f0',
          objectFit: 'cover',
          display: 'block',
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
          lineHeight: '1',
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setForm({ ...form, image: null });
          setEditingProduct((prev) =>
            prev ? { ...prev, imageUrl: null } : null
          );
        }}
        title="Remove image"
      >
        ×
      </button>
    </div>
  )}
</div>

              <button type="submit" className="btn-primary">
                {editingProduct ? 'Update' : 'Add'} Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- META MODAL ---------------- */}
      {showMetaModal && (
        <div className="modal-overlay" onClick={() => setShowMetaModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={20} color="#25d366" /> Add to Meta Catalog
              </h3>
              <button className="modal-close" onClick={() => setShowMetaModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleMetaSubmit}>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  className="form-input"
                   placeholder="e.g., iPhone 15 Pro"
                  value={metaForm.name}
                  onChange={(e) => setMetaForm({ ...metaForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-textarea"
                   placeholder="Product description..."
                  value={metaForm.description}
                  onChange={(e) => setMetaForm({ ...metaForm, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Price (₹)</label>
                <input
                  className="form-input"
                  type="number"
                   placeholder="0.00"
                  step="0.01"
                  value={metaForm.price}
                  onChange={(e) => setMetaForm({ ...metaForm, price: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Sale Price (₹)</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={metaForm.salePrice}
                  onChange={(e) => setMetaForm({ ...metaForm, salePrice: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label>SubCategory</label>
                <select
                  className="form-select"
                  value={metaForm.subCategoryId}
                  onChange={(e) => setMetaForm({ ...metaForm, subCategoryId: e.target.value })}
                  required
                >
                  <option value="">Select subcategory...</option>
                  {subCategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Link</label>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://example.com/product"
                  value={metaForm.link}
                  onChange={(e) => setMetaForm({ ...metaForm, link: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Content ID (Retailer ID)</label>
                <input
                  className="form-input"
                  placeholder="Optional (if empty we use product_{id})"
                  value={metaForm.contentId}
                  onChange={(e) => setMetaForm({ ...metaForm, contentId: e.target.value })}
                />
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                  Used as Meta <b>retailer_id</b> (or group id when variants).
                </div>
              </div>

              <div className="form-group">
                <label>Availability</label>
                <div className="toggle-row">
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    {metaForm.availability ? 'In stock' : 'Out of stock'}
                  </span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={metaForm.availability}
                      onChange={(e) => setMetaForm({ ...metaForm, availability: e.target.checked })}
                    />
                    <span className="slider" />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="toggle-row">
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    {metaForm.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={metaForm.isActive}
                      onChange={(e) => setMetaForm({ ...metaForm, isActive: e.target.checked })}
                    />
                    <span className="slider" />
                  </label>
                </div>
              </div>

              {/* Variants */}
              <div className="form-group">
                <div className="variant-header">
                  <label style={{ margin: 0 }}>Variants</label>
                  <button type="button" className="btn-secondary" onClick={openAddVariant}>
                    + Add New Variant
                  </button>
                </div>

                {metaForm.variants.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                    No variants added.
                  </div>
                ) : (
                  <div className="variant-list">
                    {metaForm.variants.map((v, idx) => (
                      <div className="variant-card" key={idx}>
                        <div style={{ minWidth: 0 }}>
                          <div className="variant-title">{v.name}</div>
                          <div className="variant-meta">
                            ₹{v.price}
                            {v.salePrice ? ` (Sale ₹${v.salePrice})` : ''} •{' '}
                            {v.availability ? 'In stock' : 'Out of stock'} •{' '}
                            {v.isActive ? 'Active' : 'Inactive'}
                          </div>
                          <div className="variant-meta">
                            Content ID: <b>{v.contentId || '-'}</b>
                          </div>
                        </div>

                        <div className="variant-actions">
                          <button type="button" onClick={() => openEditVariant(idx)} title="Edit">
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => removeVariant(idx)} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>
                  Product Image <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px', fontWeight: '500' }}>
                  Required: Minimum 500×500 pixels | JPEG, PNG (Max 5MB)
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label className="btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                    {metaForm.image ? 'Change Image' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e) => setMetaForm({ ...metaForm, image: e.target.files[0] })}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {metaForm.image && (
                    <span style={{ fontSize: '12px', color: '#25d366' }}>✓ {metaForm.image.name}</span>
                  )}
                </div>

                {metaForm.image && (
                  <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block', width: '200px' }}>
                    <img
                      src={URL.createObjectURL(metaForm.image)}
                      alt="Preview"
                      style={{
                        width: '100%',
                        height: '150px',
                        borderRadius: '4px',
                        border: '2px solid #e2e8f0',
                        objectFit: 'cover',
                        display: 'block',
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
                        lineHeight: '1',
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMetaForm({ ...metaForm, image: null });
                      }}
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                style={{
                  background: '#25d366',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  width: '100%',
                }}
              >
                Add to Meta Catalog
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- VARIANT MODAL ---------------- */}
      {showVariantModal && (
        <div className="modal-overlay variant" onClick={() => setShowVariantModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingVariantIndex !== null ? 'Edit Variant' : 'Add Variant'}</h3>
              <button className="modal-close" onClick={() => setShowVariantModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={saveVariant}>
              <div className="form-group">
                <label>Name</label>
                <input
                  className="form-input"
                   placeholder="e.g., iPhone"
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-textarea"
                   placeholder="Varient description..."
                  value={variantForm.description}
                  onChange={(e) => setVariantForm({ ...variantForm, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Price (₹)</label>
                <input
                  className="form-input"
                  type="number"
                   placeholder="0.00"
                  step="0.01"
                  value={variantForm.price}
                  onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Sale Price (₹)</label>
                <input
                  className="form-input"
                  type="number"
                   placeholder="0.00"
                  step="0.01"
                  value={variantForm.salePrice}
                  onChange={(e) => setVariantForm({ ...variantForm, salePrice: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Link</label>
                <input
                  className="form-input"
                   placeholder="https://example.com/product"
                  type="url"
                  value={variantForm.link}
                  onChange={(e) => setVariantForm({ ...variantForm, link: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Content ID (Retailer ID)</label>
                <input
                  className="form-input"
                  placeholder="Recommended unique value (optional)"
                  value={variantForm.contentId}
                  onChange={(e) => setVariantForm({ ...variantForm, contentId: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Availability</label>
                <div className="toggle-row">
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    {variantForm.availability ? 'In stock' : 'Out of stock'}
                  </span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={variantForm.availability}
                      onChange={(e) => setVariantForm({ ...variantForm, availability: e.target.checked })}
                    />
                    <span className="slider" />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="toggle-row">
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    {variantForm.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={variantForm.isActive}
                      onChange={(e) => setVariantForm({ ...variantForm, isActive: e.target.checked })}
                    />
                    <span className="slider" />
                  </label>
                </div>
              </div>

              {/* Image upload for variant */}
<div className="form-group">
  <label>Variant Image</label>
  <p
    style={{
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '8px',
    }}
  >
    Optional. Supported: JPEG, PNG (Max 5MB)
  </p>

  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
    <label className="btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
      {variantForm.image ? 'Change Image' : 'Upload Image'}
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;

          // you can add simple 5MB validation if needed
          if (file.size > 5 * 1024 * 1024) {
            alert('❌ Max file size is 5MB');
            return;
          }

          setVariantForm((prev) => ({
            ...prev,
            image: file,
            imageUrl: null, // reset URL if you use both
          }));
        }}
        style={{ display: 'none' }}
      />
    </label>

    {variantForm.image && (
      <span style={{ fontSize: '12px', color: '#25d366' }}>
        ✓ {variantForm.image.name}
      </span>
    )}
  </div>

  {/* Preview for newly selected file OR existing URL */}
  {(variantForm.image || variantForm.imageUrl) && (
    <div
      style={{
        marginTop: '10px',
        position: 'relative',
        display: 'inline-block',
        width: '160px',
      }}
    >
      <img
        src={
          variantForm.image
            ? URL.createObjectURL(variantForm.image)
            : variantForm.imageUrl.startsWith('http')
            ? variantForm.imageUrl
            : `http://localhost:3010${variantForm.imageUrl}`
        }
        alt="Variant preview"
        style={{
          width: '100%',
          height: '120px',
          borderRadius: '4px',
          border: '2px solid #e2e8f0',
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {/* Remove image button */}
      <button
        type="button"
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          width: '24px',
          height: '24px',
          padding: 0,
          border: 'none',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          lineHeight: 1,
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setVariantForm((prev) => ({
            ...prev,
            image: null,
            imageUrl: null,
          }));
        }}
        title="Remove image"
      >
        ×
      </button>
    </div>
  )}
</div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                {editingVariantIndex !== null ? 'Update Variant' : 'Add Variant'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}