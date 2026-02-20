import { useState, useEffect } from "react";
import {
  Users,
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

import "../styles/CreateUser.css";
import { useToast } from "../contexts/ToastContext";
import { createSubUser, getSubUsers, updateSubUser } from "../api/subuser";
export default function CreateUser() {
  // ---------- UI state ----------
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  // ---------- modal state ----------
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewUser, setViewUser] = useState(null);

  const { showSuccess, showError } = useToast();

  // ---------- form data ----------
  const [formData, setFormData] = useState({
    username: "",
    mobileNumber: "",
    designation: "",
    isActive: true,
  });

  const resetForm = () =>
    setFormData({
      username: "",
      mobileNumber: "",
      designation: "",
      isActive: true,
    });

  // ---------- Fetch from API ----------
  const fetchSubUsers = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await getSubUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load users");
      showError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Derived: filtered + paginated users ----------
  const filteredUsers = users.filter((u) => {
    const s = searchQuery.toLowerCase();
    if (!s) return true;

    return (
      (u.username || "").toLowerCase().includes(s) ||
      (u.mobileNumber || "").toLowerCase().includes(s) ||
      (u.designation || "").toLowerCase().includes(s)
    );
  });

  useEffect(() => {
    const t = filteredUsers.length;
    setTotal(t);
    const pages = Math.max(1, Math.ceil(t / limit));
    setTotalPages(pages);
    if (page > pages) setPage(1);
  }, [filteredUsers.length, limit, page]);

  const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit);

  // ---------- Submit (Create / Update) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const phone = formData.mobileNumber.replace(/[^0-9]/g, "");

    // Validation
    if (!formData.username.trim()) {
      setValidationError("Please enter a username.");
      return;
    }
    if (phone.length !== 10) {
      setValidationError("Please enter a valid 10‑digit mobile number.");
      return;
    }
    if (!formData.designation.trim()) {
      setValidationError("Please enter a designation.");
      return;
    }

    setValidationError("");
    setError("");
    setLoading(true);

    try {
      const payload = {
        username: formData.username.trim(),
        mobileNumber: phone,
        designation: formData.designation.trim(),
        isActive: !!formData.isActive,
      };

      if (editingUser) {
        await updateSubUser(editingUser.id, payload);
        showSuccess(`Successfully updated user "${payload.username}"`);
      } else {
        await createSubUser(payload);
        showSuccess(`Successfully created user "${payload.username}"`);
      }

      setShowAddModal(false);
      setEditingUser(null);
      resetForm();

      await fetchSubUsers();
    } catch (err) {
      console.error("Save error", err);
      const msg = err.message || "Failed to save user";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---------- render ----------
  return (
    <div className="user-container">
      {/* Header */}
      <div className="user-header">
        <div className="header-left">
          <Users size={24} />
          <h2>User Management</h2>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setEditingUser(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={18} /> Add User
          </button>
        </div>
      </div>

      {/* Search + Count */}
      <div className="filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by username, mobile, or designation..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="total-count">
          Total: {total} User{total !== 1 ? "s" : ""}
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
      {loading && users.length === 0 ? (
        <div className="empty-state">
          <Loader2 size={48} className="spin" />
          <p>Loading users…</p>
        </div>
      ) : paginatedUsers.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>No users yet. Add users to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Username</th>
                <th>Mobile</th>
                <th>Designation</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u, i) => (
                <tr key={u.id}>
                  <td>{(page - 1) * limit + i + 1}</td>
                  <td>{u.username}</td>
                  <td>{u.mobileNumber}</td>
                  <td>{u.designation}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: u.isActive ? "#166534" : "#991b1b",
                        backgroundColor: u.isActive ? "#dcfce7" : "#fee2e2",
                      }}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <button
                        className="btn-icon"
                        title="View"
                        style={{ color: "#0ea5e9" }}
                        onClick={() => setViewUser(u)}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        className="btn-icon"
                        title="Edit"
                        style={{ color: "#22c55e" }}
                        onClick={() => {
                          setShowAddModal(true);
                          setEditingUser(u);
                          setFormData({
                            username: u.username || "",
                            mobileNumber: u.mobileNumber || "",
                            designation: u.designation || "",
                            isActive: !!u.isActive,
                          });
                        }}
                      >
                        <Edit2 size={16} />
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
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="pagination-btn"
          >
            <ChevronLeft size={18} /> Prev
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="pagination-btn"
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* View User Modal */}
      {viewUser && (
        <div className="modal-overlay" onClick={() => setViewUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details</h3>
              <button className="close-btn" onClick={() => setViewUser(null)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "16px" }}>
              <p>
                <strong>Username:</strong> {viewUser.username}
              </p>
              <p>
                <strong>Mobile:</strong> {viewUser.mobileNumber}
              </p>
              <p>
                <strong>Designation:</strong> {viewUser.designation}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {viewUser.isActive ? "Active" : "Inactive"}
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingUser(viewUser);
                  setFormData({
                    username: viewUser.username || "",
                    mobileNumber: viewUser.mobileNumber || "",
                    designation: viewUser.designation || "",
                    isActive: !!viewUser.isActive,
                  });
                  setViewUser(null);
                  setShowAddModal(true);
                }}
              >
                Edit
              </button>
              <button className="btn-secondary" onClick={() => setViewUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? "Edit User" : "Add New User"}</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            {validationError && (
              <div className="validation-error" style={{ margin: "0.75rem 24px 0" }}>
                <AlertCircle size={18} color="#dc2626" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="text"
                  value={formData.mobileNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    if (v.length <= 10) {
                      setFormData({ ...formData, mobileNumber: v });
                    }
                  }}
                  placeholder="10 digits only"
                  maxLength={10}
                  required
                />
              </div>

              <div className="form-group">
                <label>Designation *</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) =>
                    setFormData({ ...formData, designation: e.target.value })
                  }
                  placeholder="e.g., Manager, Staff"
                  required
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <div
                  className="toggle-label"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))
                  }
                >
                  <div
                    className={`toggle-switch ${formData.isActive ? "active" : ""}`}
                  >
                    <div className="toggle-thumb" />
                  </div>
                  <span>{formData.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                    setEditingUser(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />{" "}
                      {editingUser ? "Updating…" : "Adding…"}
                    </>
                  ) : (
                    <>{editingUser ? "Update" : "Add"} User</>
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