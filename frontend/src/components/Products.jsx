// Products.jsx
import { useState, useEffect } from 'react';
import { ecommerceApi } from '../api/ecommerce';
import { Pencil, Trash2, Upload, Search, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import '../styles/Ecommerce.css';

export default function Products() {
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMetaCatalogPermission, setHasMetaCatalogPermission] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [editingVariantIndex, setEditingVariantIndex] = useState(null);
  const [variantModalSource, setVariantModalSource] = useState('product'); // 'product' or 'meta'

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Expanded rows for showing variants in table
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Product form (with all Meta fields)
  const emptyProductForm = {
    name: '',
    description: '',
    price: '',
    salePrice: '',
    subCategoryId: '',
    image: null,
    link: '',
    contentId: '',
    availability: true,
    isActive: true,
    variants: [],
  };
  const [form, setForm] = useState(emptyProductForm);

  // Meta form
  const emptyMetaForm = {
    name: '',
    description: '',
    price: '',
    salePrice: '',
    subCategoryId: '',
    link: '',
    image: null,
    availability: true,
    isActive: true,
    contentId: '',
    variants: [],
  };
  const [metaForm, setMetaForm] = useState(emptyMetaForm);

  // Variant form
  const emptyVariantForm = {
    id: null,
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
    checkMetaCatalogPermission();
  }, []);

  const checkMetaCatalogPermission = async () => {
    try {
      const { getCurrentPlan } = await import('../api/subscription');
      const data = await getCurrentPlan();
      const permsArray = data?.subscription?.menuPermissions ?? data?.menuPermissions ?? [];
      
      if (Array.isArray(permsArray)) {
        setHasMetaCatalogPermission(permsArray.includes('ecommerce.meta-catalog'));
      }
    } catch (error) {
      console.error('Failed to check Meta Catalog permission:', error);
      setHasMetaCatalogPermission(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, prods] = await Promise.all([
        ecommerceApi.getSubCategories(),
        ecommerceApi.getProducts(),
      ]);
      setSubCategories(subs.data);
      setProducts(prods.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  // Helper function for image URLs
  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:3010${url}`;
  };

  // Toggle expanded row
  const toggleRowExpanded = (productId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // ==================== PRODUCT MODAL ====================
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

  // Products.jsx - REPLACE this function

  const handleEdit = async (prod) => {
    try {
      setLoading(true);

      const response = await ecommerceApi.getProduct(prod.id);
      const productWithVariants = response.data;

      console.log('Loaded product:', productWithVariants);

      setEditingProduct(productWithVariants);
      setForm({
        name: productWithVariants.name || '',
        description: productWithVariants.description || '',
        price: productWithVariants.price || '',
        salePrice: productWithVariants.salePrice || '',
        subCategoryId: productWithVariants.subCategoryId || '',
        image: null,
        link: productWithVariants.link || '',
        contentId: productWithVariants.contentId || '',
        // ✅ FIX: Force actual boolean (handles 1/0, "true"/"false", true/false)
        availability: Boolean(productWithVariants.availability),
        isActive: Boolean(productWithVariants.isActive),
        variants: (productWithVariants.variants || []).map((v) => ({
          id: v.id,
          name: v.name || '',
          description: v.description || '',
          price: v.price || '',
          salePrice: v.salePrice || '',
          link: v.link || '',
          contentId: v.contentId || '',
          // ✅ FIX: Force actual boolean for variants
          availability: Boolean(v.availability),
          isActive: Boolean(v.isActive),
          image: null,
          imageUrl: v.imageUrl || null,
        })),
      });

      setShowModal(true);
    } catch (error) {
      console.error('Failed to load product:', error);
      alert('❌ Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description || '');
    formData.append('price', form.price);
    formData.append('salePrice', form.salePrice || '');
    formData.append('subCategoryId', form.subCategoryId);
    formData.append('link', form.link || '');
    formData.append('contentId', form.contentId || '');
    // ✅ FIX: Explicitly convert to "true"/"false" string
    formData.append('availability', form.availability === true ? 'true' : 'false');
    formData.append('isActive', form.isActive === true ? 'true' : 'false');
    if (form.image) formData.append('image', form.image);

    try {
      setLoading(true);
      let productId;

      if (editingProduct) {
        await ecommerceApi.updateProduct(editingProduct.id, formData);
        productId = editingProduct.id;

        const existingVariantIds = (editingProduct.variants || []).map((v) => v.id);
        const currentVariantIds = form.variants.filter((v) => v.id).map((v) => v.id);

        for (const existingId of existingVariantIds) {
          if (!currentVariantIds.includes(existingId)) {
            try {
              await ecommerceApi.deleteVariant(existingId);
            } catch (err) {
              console.error('Failed to delete variant:', err);
            }
          }
        }
      } else {
        const created = await ecommerceApi.createProduct(formData);
        productId = created.data.id;
      }

      // Save/Update variants
      if (form.variants && form.variants.length > 0) {
        for (let i = 0; i < form.variants.length; i++) {
          const v = form.variants[i];
          const variantFormData = new FormData();
          variantFormData.append('name', v.name);
          variantFormData.append('description', v.description || '');
          variantFormData.append('price', v.price);
          variantFormData.append('salePrice', v.salePrice || '');
          variantFormData.append('link', v.link || '');
          variantFormData.append(
            'contentId',
            v.contentId || `${form.contentId || `product_${productId}`}_v${i + 1}`
          );
          // ✅ FIX: Variant booleans too
          variantFormData.append('availability', v.availability === true ? 'true' : 'false');
          variantFormData.append('isActive', v.isActive === true ? 'true' : 'false');
          if (v.image) variantFormData.append('image', v.image);

          if (v.id) {
            await ecommerceApi.updateVariant(v.id, variantFormData);
          } else {
            await ecommerceApi.createVariant(productId, variantFormData);
          }
        }
      }

      setForm(emptyProductForm);
      setEditingProduct(null);
      setShowModal(false);
      loadData();
      alert('✅ Product saved successfully!');
    } catch (error) {
      alert('❌ Failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this product and all its variants?')) {
      try {
        await ecommerceApi.deleteProduct(id);
        loadData();
      } catch (error) {
        alert('❌ Failed to delete product');
      }
    }
  };

  // ==================== VARIANT FUNCTIONS (FOR PRODUCT MODAL) ====================
  const openAddVariantForProduct = () => {
    setVariantModalSource('product');
    setEditingVariantIndex(null);

    // Pre-fill with product data
    setVariantForm({
      id: null,
      name: form.name ? `${form.name} - Variant` : '',  // Add suffix to differentiate
      description: form.description || '',
      price: form.price || '',
      salePrice: form.salePrice || '',
      link: form.link || '',
      contentId: '',  // Leave empty for auto-generation
      availability: form.availability ?? true,
      isActive: form.isActive ?? true,
      image: null,
      imageUrl: null,
    });

    setShowVariantModal(true);
  };

  const openEditVariantForProduct = (idx) => {
    setVariantModalSource('product');
    setEditingVariantIndex(idx);
    const v = form.variants[idx];
    setVariantForm({
      id: v.id,
      name: v.name,
      description: v.description || '',
      price: v.price,
      salePrice: v.salePrice || '',
      link: v.link || '',
      contentId: v.contentId || '',
      availability: v.availability ?? true,
      isActive: v.isActive ?? true,
      image: null,
      imageUrl: v.imageUrl || null,
    });
    setShowVariantModal(true);
  };

  const removeVariantFromProduct = async (idx) => {
    const variant = form.variants[idx];

    if (variant.id) {
      if (confirm(`Delete variant "${variant.name}"? This cannot be undone.`)) {
        try {
          await ecommerceApi.deleteVariant(variant.id);
          setForm((prev) => ({
            ...prev,
            variants: prev.variants.filter((_, i) => i !== idx),
          }));
        } catch (error) {
          alert('❌ Failed to delete variant');
        }
      }
    } else {
      setForm((prev) => ({
        ...prev,
        variants: prev.variants.filter((_, i) => i !== idx),
      }));
    }
  };

  // ==================== META MODAL ====================
  const openMetaModal = () => {
    setMetaForm(emptyMetaForm);
    setShowMetaModal(true);
  };

  const closeMetaModal = () => {
    setShowMetaModal(false);
    setMetaForm(emptyMetaForm);
  };

  // Products.jsx - REPLACE this function

  const openAddVariantForMeta = () => {
    setVariantModalSource('meta');
    setEditingVariantIndex(null);

    // Pre-fill with meta product data
    setVariantForm({
      id: null,
      name: metaForm.name ? `${metaForm.name} - Variant` : '',
      description: metaForm.description || '',
      price: metaForm.price || '',
      salePrice: metaForm.salePrice || '',
      link: metaForm.link || '',
      contentId: '',
      availability: metaForm.availability ?? true,
      isActive: metaForm.isActive ?? true,
      image: null,
      imageUrl: null,
    });

    setShowVariantModal(true);
  };

  const openEditVariantForMeta = (idx) => {
    setVariantModalSource('meta');
    setEditingVariantIndex(idx);
    const v = metaForm.variants[idx];
    setVariantForm({
      ...v,
      image: null,
    });
    setShowVariantModal(true);
  };

  const removeVariantFromMeta = (idx) => {
    setMetaForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  };

  const handleMetaSubmit = async (e) => {
    e.preventDefault();

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
          img.height
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
    const productFormData = new FormData();
    productFormData.append('name', metaForm.name);
    productFormData.append('description', metaForm.description || '');
    productFormData.append('price', metaForm.price);
    productFormData.append('salePrice', metaForm.salePrice || '');
    productFormData.append('subCategoryId', metaForm.subCategoryId);
    productFormData.append('link', metaForm.link || '');
    productFormData.append('contentId', metaForm.contentId || '');
    // ✅ FIX
    productFormData.append('availability', metaForm.availability === true ? 'true' : 'false');
    productFormData.append('isActive', metaForm.isActive === true ? 'true' : 'false');
    if (metaForm.image) productFormData.append('image', metaForm.image);

    try {
      setLoading(true);
      const created = await ecommerceApi.createProduct(productFormData);
      const productId = created.data.id;

      // Create variants in DB
      for (let i = 0; i < metaForm.variants.length; i++) {
        const v = metaForm.variants[i];
        const variantFormData = new FormData();
        variantFormData.append('name', v.name);
        variantFormData.append('description', v.description || '');
        variantFormData.append('price', v.price);
        variantFormData.append('salePrice', v.salePrice || '');
        variantFormData.append('link', v.link || '');
        variantFormData.append(
          'contentId',
          v.contentId || `${metaForm.contentId || `product_${productId}`}_v${i + 1}`
        );
        // ✅ FIX
        variantFormData.append('availability', v.availability === true ? 'true' : 'false');
        variantFormData.append('isActive', v.isActive === true ? 'true' : 'false');
        if (v.image) variantFormData.append('image', v.image);

        await ecommerceApi.createVariant(productId, variantFormData);
      }

      const baseRetailerId = metaForm.contentId?.trim() || `product_${productId}`;

      const metaPayload = {
        name: metaForm.name,
        description: metaForm.description,
        price: metaForm.price ? Number(metaForm.price) : undefined,
        link: metaForm.link || undefined,
        salePrice: metaForm.salePrice ? Number(metaForm.salePrice) : undefined,
        // ✅ FIX
        availability: metaForm.availability === true,
        isActive: metaForm.isActive === true,
        contentId: baseRetailerId,
        variants: (metaForm.variants || []).map((v, idx) => ({
          name: v.name,
          description: v.description || undefined,
          price: v.price ? Number(v.price) : undefined,
          salePrice: v.salePrice ? Number(v.salePrice) : undefined,
          link: v.link || undefined,
          contentId: v.contentId?.trim() || `${baseRetailerId}_v${idx + 1}`,
          // ✅ FIX
          availability: v.availability === true,
          isActive: v.isActive === true,
        })),
      };

      await ecommerceApi.syncProductToMeta(productId, metaPayload);

      alert('✅ Product created and synced to Meta Catalog!');
      setMetaForm(emptyMetaForm);
      setShowMetaModal(false);
      loadData();
    } catch (error) {
      alert('❌ Failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // ==================== VARIANT MODAL (SHARED) ====================
  const closeVariantModal = () => {
    setShowVariantModal(false);
    setVariantForm(emptyVariantForm);
    setEditingVariantIndex(null);
  };

  const saveVariant = (e) => {
    e.preventDefault();

    if (!variantForm.name?.trim()) {
      alert('❌ Variant name is required');
      return;
    }
    if (!variantForm.price) {
      alert('❌ Variant price is required');
      return;
    }

    const variantData = {
      ...variantForm,
      // ✅ FIX: Ensure booleans are actual booleans
      availability: Boolean(variantForm.availability),
      isActive: Boolean(variantForm.isActive),
      id:
        editingVariantIndex !== null
          ? variantModalSource === 'product'
            ? form.variants[editingVariantIndex]?.id
            : metaForm.variants[editingVariantIndex]?.id
          : null,
    };

    if (variantModalSource === 'meta') {
      setMetaForm((prev) => {
        const next = [...prev.variants];
        if (editingVariantIndex !== null) {
          next[editingVariantIndex] = variantData;
        } else {
          next.push(variantData);
        }
        return { ...prev, variants: next };
      });
    } else {
      setForm((prev) => {
        const next = [...prev.variants];
        if (editingVariantIndex !== null) {
          next[editingVariantIndex] = variantData;
        } else {
          next.push(variantData);
        }
        return { ...prev, variants: next };
      });
    }

    setShowVariantModal(false);
    setVariantForm(emptyVariantForm);
    setEditingVariantIndex(null);
  };

  // ==================== SYNC FUNCTIONS ====================
  const handleSyncToMeta = async (prod) => {
    try {
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

  // ==================== FILTERS ====================
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subCategory?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === 'normal') return matchesSearch && !p.metaProductId;
    if (filterType === 'uploaded') return matchesSearch && p.metaProductId && p.source !== 'meta';
    if (filterType === 'synced') return matchesSearch && p.source === 'meta';
    if (filterType === 'with-variants') return matchesSearch && p.variants?.length > 0;
    return matchesSearch;
  });

  const normalCount = products.filter((p) => !p.metaProductId).length;
  const uploadedCount = products.filter((p) => p.metaProductId && p.source !== 'meta').length;
  const syncedCount = products.filter((p) => p.source === 'meta').length;
  const withVariantsCount = products.filter((p) => p.variants?.length > 0).length;

  return (
    <div className="ecommerce-container">
      {/* Loading Overlay */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255,255,255,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div style={{ fontSize: 18, color: '#374151' }}>Loading...</div>
        </div>
      )}

      {/* Header */}
      <div className="ecommerce-header">
        <div className="header-left">
          <h2>Products</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={openAddProductModal} className="btn-primary">
            <Plus size={18} /> Add Product
          </button>
          {hasMetaCatalogPermission && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              background: '#f3f4f6',
              padding: '4px',
              borderRadius: '8px',
            }}
          >
            {[
              { key: 'all', label: `All (${products.length})`, color: '#1f2937' },
              { key: 'normal', label: `Normal (${normalCount})`, color: '#1f2937' },
              { key: 'uploaded', label: `Uploaded (${uploadedCount})`, color: '#25d366' },
              { key: 'synced', label: `Synced (${syncedCount})`, color: '#0084ff' },
              { key: 'with-variants', label: `With Variants (${withVariantsCount})`, color: '#8b5cf6' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  background: filterType === tab.key ? '#fff' : 'transparent',
                  color: filterType === tab.key ? tab.color : '#6b7280',
                  boxShadow: filterType === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
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

      {/* Products Table */}
      <div className="table-container">
        <table className="contacts-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Image</th>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Status</th>
              <th>Variants</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((prod) => (
              <>
                <tr key={prod.id}>
                  {/* Expand Button */}
                  <td>
                    {prod.variants?.length > 0 && (
                      <button
                        onClick={() => toggleRowExpanded(prod.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={expandedRows.has(prod.id) ? 'Collapse' : 'Expand'}
                      >
                        {expandedRows.has(prod.id) ? (
                          <ChevronUp size={18} color="#6b7280" />
                        ) : (
                          <ChevronDown size={18} color="#6b7280" />
                        )}
                      </button>
                    )}
                  </td>

                  {/* Image */}
                  <td>
                    {prod.imageUrl ? (
                      <img
                        src={getImageUrl(prod.imageUrl)}
                        alt={prod.name}
                        className="product-image"
                      />
                    ) : (
                      <div
                        style={{
                          width: 50,
                          height: 50,
                          background: '#f3f4f6',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#9ca3af',
                          fontSize: 10,
                        }}
                      >
                        No img
                      </div>
                    )}
                  </td>

                  {/* Name */}
                  <td>
                    <div style={{ fontWeight: 500 }}>{prod.name}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                      {prod.description?.substring(0, 50)}
                    </div>
                    {prod.contentId && (
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        ID: {prod.contentId}
                      </div>
                    )}
                  </td>

                  {/* Price */}
                  <td>
                    <div style={{ fontWeight: 600 }}>₹{prod.price}</div>
                    {prod.salePrice && (
                      <div style={{ fontSize: '12px', color: '#25d366' }}>
                        Sale: ₹{prod.salePrice}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td>{prod.subCategory?.name}</td>

                  {/* Status */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: prod.availability ? '#dcfce7' : '#fee2e2',
                          color: prod.availability ? '#166534' : '#991b1b',
                        }}
                      >
                        {prod.availability ? 'In Stock' : 'Out of Stock'}
                      </span>
                      {prod.metaProductId && (
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: prod.source === 'meta' ? '#dbeafe' : '#d1fae5',
                            color: prod.source === 'meta' ? '#1e40af' : '#065f46',
                          }}
                        >
                          {prod.source === 'meta' ? 'From Meta' : 'On Meta'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Variants */}


                  {/* In the tbody, update the Variants column */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          background: prod.variants?.length > 0 ? '#ede9fe' : '#f3f4f6',
                          color: prod.variants?.length > 0 ? '#7c3aed' : '#6b7280',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          minWidth: '30px',
                          textAlign: 'center',
                        }}
                      >
                        {prod.variants?.length || 0}
                      </span>
                      {prod.variants?.length > 0 && (
                        <button
                          onClick={() => toggleRowExpanded(prod.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            color: '#6b7280',
                            fontSize: '11px',
                          }}
                        >
                          {expandedRows.has(prod.id) ? 'Hide' : 'Show'}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
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


                    </div>
                  </td>
                </tr>

                {/* Expanded Variants Row */}
                {expandedRows.has(prod.id) && prod.variants?.length > 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ background: '#f9fafb', padding: '16px 24px' }}
                    >
                      <div style={{ marginBottom: '12px', fontWeight: 600, color: '#374151' }}>
                        Variants ({prod.variants.length})
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '12px',
                        }}
                      >
                        {prod.variants.map((variant) => (
                          <div
                            key={variant.id}
                            style={{
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '12px',
                              display: 'flex',
                              gap: '12px',
                            }}
                          >
                            {/* Variant Image */}
                            <div style={{ width: '60px', height: '60px', flexShrink: 0 }}>
                              {variant.imageUrl ? (
                                <img
                                  src={getImageUrl(variant.imageUrl)}
                                  alt={variant.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    background: '#f3f4f6',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#9ca3af',
                                    fontSize: 10,
                                  }}
                                >
                                  No img
                                </div>
                              )}
                            </div>

                            {/* Variant Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                                {variant.name}
                              </div>
                              <div style={{ fontSize: '13px', color: '#374151' }}>
                                ₹{variant.price}
                                {variant.salePrice && (
                                  <span style={{ color: '#25d366', marginLeft: '8px' }}>
                                    Sale: ₹{variant.salePrice}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                ID: {variant.contentId || 'Not set'}
                              </div>
                              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                <span
                                  style={{
                                    color: variant.availability ? '#22c55e' : '#ef4444',
                                  }}
                                >
                                  {variant.availability ? '● In Stock' : '● Out of Stock'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6b7280',
            }}
          >
            No products found
          </div>
        )}
      </div>

      {/* ==================== PRODUCT MODAL ==================== */}
      {showModal && (
        <div className="modal-overlay" onClick={closeProductModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}
          >
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit' : 'Add New'} Product</h3>
              <button className="modal-close" onClick={closeProductModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product Name *</label>
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
                  rows={3}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Price (₹) *</label>
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
                  <label>Sale Price (₹)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    placeholder="Optional"
                    value={form.salePrice}
                    onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>SubCategory *</label>
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
                <label>Product Link</label>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://example.com/product"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Content ID (Retailer ID)</label>
                <input
                  className="form-input"
                  placeholder="Optional (auto-generated if empty)"
                  value={form.contentId}
                  onChange={(e) => setForm({ ...form, contentId: e.target.value })}
                />
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                  Used as Meta <b>retailer_id</b> when syncing.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Availability</label>
                  <div className="toggle-row">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                      {form.availability ? 'In stock' : 'Out of stock'}
                    </span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={form.availability}
                        onChange={(e) => setForm({ ...form, availability: e.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <div className="toggle-row">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                      {form.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Variants Section */}
              <div className="form-group">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <label style={{ margin: 0 }}>Variants ({form.variants.length})</label>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={openAddVariantForProduct}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    + Add Variant
                  </button>
                </div>

                {form.variants.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#6b7280',
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}
                  >
                    No variants added. Click "Add Variant" to add product variants.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {form.variants.map((v, idx) => (
                      <div
                        key={v.id || idx}
                        style={{
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'center',
                          padding: '10px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        {/* Variant Image Thumbnail */}
                        {v.image || v.imageUrl ? (
                          <img
                            src={
                              v.image
                                ? URL.createObjectURL(v.image)
                                : getImageUrl(v.imageUrl)
                            }
                            alt={v.name}
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 6,
                              objectFit: 'cover',
                              border: '1px solid #e5e7eb',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 6,
                              background: '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#9ca3af',
                              fontSize: 10,
                            }}
                          >
                            No img
                          </div>
                        )}

                        {/* Variant Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '14px' }}>{v.name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            ₹{v.price}
                            {v.salePrice ? ` (Sale ₹${v.salePrice})` : ''} •{' '}
                            {v.availability ? 'In stock' : 'Out of stock'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                            ID: {v.contentId || 'Auto'}
                            {v.id && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  color: '#22c55e',
                                  fontWeight: 600,
                                }}
                              >
                                ✓ Saved
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Variant Actions */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => openEditVariantForProduct(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '4px',
                            }}
                            title="Edit"
                          >
                            <Pencil size={16} color="#6b7280" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeVariantFromProduct(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '4px',
                            }}
                            title="Delete"
                          >
                            <Trash2 size={16} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Image */}
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
                          : getImageUrl(editingProduct.imageUrl)
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
                        if (editingProduct) {
                          setEditingProduct({ ...editingProduct, imageUrl: null });
                        }
                      }}
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                {editingProduct ? 'Update' : 'Add'} Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== META MODAL ==================== */}
      {showMetaModal && (
        <div className="modal-overlay" onClick={closeMetaModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}
          >
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={20} color="#25d366" /> Add to Meta Catalog
              </h3>
              <button className="modal-close" onClick={closeMetaModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleMetaSubmit}>
              <div className="form-group">
                <label>Product Name *</label>
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
                  rows={3}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Price (₹) *</label>
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
              </div>

              <div className="form-group">
                <label>SubCategory *</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                        onChange={(e) =>
                          setMetaForm({ ...metaForm, availability: e.target.checked })
                        }
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
              </div>

              {/* Variants */}
              <div className="form-group">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <label style={{ margin: 0 }}>Variants ({metaForm.variants.length})</label>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={openAddVariantForMeta}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    + Add Variant
                  </button>
                </div>

                {metaForm.variants.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#6b7280',
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}
                  >
                    No variants added.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {metaForm.variants.map((v, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'center',
                          padding: '10px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        {/* Variant Image Thumbnail */}
                        {v.image || v.imageUrl ? (
                          <img
                            src={
                              v.image
                                ? URL.createObjectURL(v.image)
                                : getImageUrl(v.imageUrl)
                            }
                            alt={v.name}
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 6,
                              objectFit: 'cover',
                              border: '1px solid #e5e7eb',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 6,
                              background: '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#9ca3af',
                              fontSize: 10,
                            }}
                          >
                            No img
                          </div>
                        )}

                        {/* Variant Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '14px' }}>{v.name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            ₹{v.price}
                            {v.salePrice ? ` (Sale ₹${v.salePrice})` : ''} •{' '}
                            {v.availability ? 'In stock' : 'Out of stock'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                            ID: {v.contentId || 'Auto'}
                          </div>
                        </div>

                        {/* Variant Actions */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => openEditVariantForMeta(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px',
                            }}
                            title="Edit"
                          >
                            <Pencil size={16} color="#6b7280" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeVariantFromMeta(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px',
                            }}
                            title="Delete"
                          >
                            <Trash2 size={16} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Image */}
              <div className="form-group">
                <label>
                  Product Image <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#ef4444',
                    marginBottom: '8px',
                    fontWeight: '500',
                  }}
                >
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
                    <span style={{ fontSize: '12px', color: '#25d366' }}>
                      ✓ {metaForm.image.name}
                    </span>
                  )}
                </div>

                {metaForm.image && (
                  <div
                    style={{
                      marginTop: '10px',
                      position: 'relative',
                      display: 'inline-block',
                      width: '200px',
                    }}
                  >
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

      {/* ==================== VARIANT MODAL (SHARED) ==================== */}
      {showVariantModal && (
        <div className="modal-overlay" onClick={closeVariantModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}
          >
            <div className="modal-header">
              <h3>{editingVariantIndex !== null ? 'Edit Variant' : 'Add Variant'}</h3>
              <button className="modal-close" onClick={closeVariantModal}>
                ×
              </button>
            </div>

            <form onSubmit={saveVariant}>
              <div className="form-group">
                <label>Variant Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g., 128GB Black"
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Variant description..."
                  value={variantForm.description}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Price (₹) *</label>
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
                    onChange={(e) =>
                      setVariantForm({ ...variantForm, salePrice: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Link</label>
                <input
                  className="form-input"
                  placeholder="https://example.com/product/variant"
                  type="url"
                  value={variantForm.link}
                  onChange={(e) => setVariantForm({ ...variantForm, link: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Content ID (Retailer ID)</label>
                <input
                  className="form-input"
                  placeholder="Unique ID for this variant (optional)"
                  value={variantForm.contentId}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, contentId: e.target.value })
                  }
                />
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                  Auto-generated if empty. Must be unique across all products/variants.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                        onChange={(e) =>
                          setVariantForm({ ...variantForm, availability: e.target.checked })
                        }
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
                        onChange={(e) =>
                          setVariantForm({ ...variantForm, isActive: e.target.checked })
                        }
                      />
                      <span className="slider" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Variant Image */}
              <div className="form-group">
                <label>Variant Image</label>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
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

                        if (file.size > 5 * 1024 * 1024) {
                          alert('❌ Max file size is 5MB');
                          return;
                        }

                        setVariantForm((prev) => ({
                          ...prev,
                          image: file,
                          imageUrl: null,
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
                          : getImageUrl(variantForm.imageUrl)
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