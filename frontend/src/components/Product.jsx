// src/pages/Product.jsx
import { useState, useEffect } from "react";
import {
  Package2,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Eye,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

import '../styles/Product.css';

const LS_PRODUCTS_KEY = "products";
const LS_CATEGORIES_KEY = "categories";

export default function Product() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    imageUrl: "",
    description: "",
    price: "",
    active: true,
    categoryId: "",
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const catStored = localStorage.getItem(LS_CATEGORIES_KEY);
      if (catStored) {
        setCategories(JSON.parse(catStored));
      } else {
        const initialCats = [
          { id: 1, name: "Electronics", description: "", active: true },
          { id: 2, name: "Clothing", description: "", active: true },
        ];
        setCategories(initialCats);
        localStorage.setItem(LS_CATEGORIES_KEY, JSON.stringify(initialCats));
      }

      const prodStored = localStorage.getItem(LS_PRODUCTS_KEY);
      if (prodStored) {
        setProducts(JSON.parse(prodStored));
      } else {
        const initialProds = [
          {
            id: 1,
            name: "iPhone 15",
            imageUrl: "",
            description: "Latest Apple smartphone",
            price: 999,
            active: true,
            categoryId: 1,
          },
        ];
        setProducts(initialProds);
        localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(initialProds));
      }
    } catch (err) {
      console.error("Failed to read from localStorage", err);
    }
  }, []);

  // Save products to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(products));
    } catch (err) {
      console.error("Failed to write products to localStorage", err);
    }
  }, [products]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageData = filtered.slice((page - 1) * limit, page * limit);

  const resetForm = () =>
    setFormData({
      name: "",
      imageUrl: "",
      description: "",
      price: "",
      active: true,
      categoryId: "",
    });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setValidationError("Please enter a product name.");
      return;
    }
    if (!formData.price || isNaN(Number(formData.price))) {
      setValidationError("Please enter a valid numeric price.");
      return;
    }
    if (!formData.categoryId) {
      setValidationError("Please select a category.");
      return;
    }

    setValidationError("");
    setError("");
    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      imageUrl: formData.imageUrl || "",
      description: formData.description || "",
      price: Number(formData.price),
      active: !!formData.active,
      categoryId: Number(formData.categoryId),
    };

    setTimeout(() => {
      if (editingProduct) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? { ...p, ...payload } : p))
        );
      } else {
        const newId = products.length
          ? Math.max(...products.map((p) => p.id)) + 1
          : 1;
        setProducts((prev) => [...prev, { id: newId, ...payload }]);
      }

      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
      setLoading(false);
    }, 300);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const findCategoryName = (id) => {
    const c = categories.find((cat) => String(cat.id) === String(id));
    return c ? c.name : "N/A";
  };

  return (
    <div className="product-container">
      {/* Header */}
      <div className="product-header">
        <div className="header-left">
          <Package2 size={24} />
          <h2>Product Management</h2>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setEditingProduct(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* Search + Count */}
      <div className="filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search product..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="total-count">
          Total: {total} Product{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={20} color="#d00" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      {loading && pageData.length === 0 ? (
        <div className="empty-state">
          <Loader2 size={48} className="spin" />
          <p>Loading products…</p>
        </div>
      ) : pageData.length === 0 ? (
        <div className="empty-state">
          <Package2 size={48} />
          <p>No products yet. Add products to start.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Description</th>
                <th>Price</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((p, i) => (
                <tr key={p.id}>
                  <td>{(page - 1) * limit + i + 1}</td>
                  <td>
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="product-image"
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{p.name}</td>
                  <td>{findCategoryName(p.categoryId)}</td>
                  <td>{p.description || "—"}</td>
                  <td>{p.price}</td>
                  <td>{p.active ? "Yes" : "No"}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon view"
                        title="View"
                        onClick={() => setViewProduct(p)}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="btn-icon edit"
                        title="Edit"
                        onClick={() => {
                          setShowAddModal(true);
                          setEditingProduct(p);
                          setFormData({
                            name: p.name,
                            imageUrl: p.imageUrl || "",
                            description: p.description || "",
                            price: String(p.price || ""),
                            active: !!p.active,
                            categoryId: String(p.categoryId || ""),
                          });
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon danger"
                        title="Delete"
                        onClick={() => handleDelete(p.id)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="pagination-btn"
          >
            <ChevronLeft size={18} /> Prev
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="pagination-btn"
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* View Product */}
      {viewProduct && (
        <div className="modal-overlay" onClick={() => setViewProduct(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Product Details</h3>
              <button className="close-btn" onClick={() => setViewProduct(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {viewProduct.imageUrl && (
                <div className="product-image-wrapper">
                  <img
                    src={viewProduct.imageUrl}
                    alt={viewProduct.name}
                    className="product-image-large"
                  />
                </div>
              )}
              <p>
                <strong>Name:</strong> {viewProduct.name}
              </p>
              <p>
                <strong>Category:</strong> {findCategoryName(viewProduct.categoryId)}
              </p>
              <p>
                <strong>Description:</strong> {viewProduct.description || "—"}
              </p>
              <p>
                <strong>Price:</strong> {viewProduct.price}
              </p>
              <p>
                <strong>Active:</strong> {viewProduct.active ? "Yes" : "No"}
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingProduct(viewProduct);
                  setFormData({
                    name: viewProduct.name,
                    imageUrl: viewProduct.imageUrl || "",
                    description: viewProduct.description || "",
                    price: String(viewProduct.price || ""),
                    active: !!viewProduct.active,
                    categoryId: String(viewProduct.categoryId || ""),
                  });
                  setViewProduct(null);
                  setShowAddModal(true);
                }}
              >
                Edit
              </button>
              <button className="btn-secondary" onClick={() => setViewProduct(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Product */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? "Edit Product" : "Add New Product"}</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            {validationError && (
              <div className="validation-error">
                <AlertCircle size={18} color="#dc2626" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                  placeholder="http://example.com/image.jpg"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter description (optional)"
                />
              </div>

              <div className="form-group">
                <label>Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Active</label>
                <select
                  value={formData.active ? "true" : "false"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      active: e.target.value === "true",
                    })
                  }
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                    setEditingProduct(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />{" "}
                      {editingProduct ? "Updating…" : "Adding…"}
                    </>
                  ) : (
                    <>{editingProduct ? "Update" : "Add"} Product</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}