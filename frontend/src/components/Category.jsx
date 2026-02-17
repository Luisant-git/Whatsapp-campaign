// src/pages/Category.jsx
import { useState, useEffect } from "react";
import {
  FolderTree,
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

import "../styles/Category.css";
import { categoryAPI } from "../api/category";

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewCategory, setViewCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true, // UI field for active toggle
  });

  // -------- Fetch from backend (no pagination/search on API) --------
  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await categoryAPI.getAll();
      // Assume resp.data is an array of categories
      const data = Array.isArray(resp.data) ? resp.data : resp.data.data || [];
      setCategories(data);
    } catch (err) {
      console.error("Failed to fetch categories", err);
      setError(
        err.response?.data?.message ||
          "Unable to load categories. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ---- derive filtered & paginated data on frontend ----
  const normalized = categories.map((c) => ({
    ...c,
    active: c.isactive ?? c.active ?? true,
  }));

  const filtered = normalized.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    // when search changes, reset to page 1
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const totalCount = filtered.length;
    setTotal(totalCount);
    setTotalPages(Math.max(1, Math.ceil(totalCount / limit)));
  }, [filtered]);

  const pageData = filtered.slice((page - 1) * limit, page * limit);

  const resetForm = () =>
    setFormData({
      name: "",
      description: "",
      active: true,
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setValidationError("Please enter a valid category name.");
      return;
    }

    setValidationError("");
    setError("");
    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      description: formData.description || "",
      isactive: formData.active, // backend expects isactive
    };

    try {
      if (editingCategory) {
        await categoryAPI.update(editingCategory.id, payload);
      } else {
        await categoryAPI.create(payload);
      }

      setShowAddModal(false);
      setEditingCategory(null);
      resetForm();
      await fetchCategories();
    } catch (err) {
      console.error("Save category error", err);
      setError(
        err.response?.data?.message ||
          (editingCategory
            ? "Failed to update category. Please try again."
            : "Failed to create category. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    setLoading(true);
    setError("");
    try {
      await categoryAPI.delete(id); // soft delete endpoint
      await fetchCategories();
    } catch (err) {
      console.error("Delete category error", err);
      setError(
        err.response?.data?.message ||
          "Failed to delete category. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="category-container">
      {/* Header */}
      <div className="category-header">
        <div className="header-left">
          <FolderTree size={24} />
          <h2>Category Management</h2>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setEditingCategory(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      {/* Search + Count */}
      <div className="filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="total-count">
          Total: {total} Category{total !== 1 ? "ies" : "y"}
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
      {loading && categories.length === 0 ? (
        <div className="empty-state">
          <Loader2 size={48} className="spin" />
          <p>Loading categories…</p>
        </div>
      ) : pageData.length === 0 ? (
        <div className="empty-state">
          <FolderTree size={48} />
          <p>No categories yet. Add categories to start.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((c, i) => (
                <tr key={c.id}>
                  <td>{(page - 1) * limit + i + 1}</td>
                  <td>{c.name}</td>
                  <td>{c.description || "—"}</td>
                  <td>
                    <span
                      className={
                        c.active
                          ? "status-pill status-active"
                          : "status-pill status-inactive"
                      }
                    >
                      {c.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon view"
                        title="View"
                        onClick={() => setViewCategory(c)}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="btn-icon edit"
                        title="Edit"
                        onClick={() => {
                          setShowAddModal(true);
                          setEditingCategory(c);
                          setFormData({
                            name: c.name,
                            description: c.description || "",
                            active: !!c.active,
                          });
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon danger"
                        title="Delete"
                        onClick={() => handleDelete(c.id)}
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

      {/* Frontend pagination */}
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

      {/* View Category */}
      {viewCategory && (
        <div className="modal-overlay" onClick={() => setViewCategory(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Category Details</h3>
              <button className="close-btn" onClick={() => setViewCategory(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                <strong>Name:</strong> {viewCategory.name}
              </p>
              <p>
                <strong>Description:</strong> {viewCategory.description || "—"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {viewCategory.active ? "Active" : "Inactive"}
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingCategory(viewCategory);
                  setFormData({
                    name: viewCategory.name,
                    description: viewCategory.description || "",
                    active: !!viewCategory.active,
                  });
                  setViewCategory(null);
                  setShowAddModal(true);
                }}
              >
                Edit
              </button>
              <button className="btn-secondary" onClick={() => setViewCategory(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Category */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? "Edit Category" : "Add New Category"}</h3>
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
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter category name"
                  required
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
                <label>Status</label>
                <div
                  className="toggle-wrapper"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, active: !prev.active }))
                  }
                >
                  <div
                    className={
                      "toggle-switch " +
                      (formData.active ? "toggle-on" : "toggle-off")
                    }
                  >
                    <div className="toggle-knob" />
                  </div>
                  <span className="toggle-label">
                    {formData.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                    setEditingCategory(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />{" "}
                      {editingCategory ? "Updating…" : "Adding…"}
                    </>
                  ) : (
                    <>{editingCategory ? "Update" : "Add"} Category</>
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