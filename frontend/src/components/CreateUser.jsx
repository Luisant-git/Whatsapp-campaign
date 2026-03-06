import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  X,
  Loader2,
  AlertCircle,
  Edit2,
  Shield, // for Menu Permission button
} from "lucide-react";

import "../styles/CreateUser.css";
import { useToast } from "../contexts/ToastContext";
import {
  createSubUser,
  getTenantSubUsers,
  updateSubUser,
  deactivateSubUser,
} from "../api/subuser";

import {
  getSubUserMenuPermission,
  saveSubUserMenuPermission,
} from "../api/subuserMenuPermission";

import { getCurrentMenuPermission } from "../api/menu";

function toBoolMap(obj) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === true;
  return out;
}

function formatMenuKey(key = "") {
  // "contacts.blacklist" -> "Contacts Blacklist"
  return key
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CreateUser({ tenantId: tenantIdProp }) {
  const tenantIdStr = tenantIdProp ?? localStorage.getItem("tenantId");
  const tenantId = Number(tenantIdStr);
  const hasTenantId = Number.isInteger(tenantId) && tenantId > 0;

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

  // ---------- menu permission modal state ----------
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuUser, setMenuUser] = useState(null); // user for which modal is opened
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);
  const [tenantMenu, setTenantMenu] = useState({}); // allowed menus map {key:true}
  const [menuForm, setMenuForm] = useState({}); // subuser permission map {key:boolean}

  const { showSuccess, showError } = useToast();

  // ---------- form data ----------
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    mobileNumber: "",
    designation: "",
  });

  const resetForm = () =>
    setFormData({
      email: "",
      password: "",
      mobileNumber: "",
      designation: "",
    });

  // ---------- Fetch users ----------
  const fetchSubUsers = async () => {
    setError("");

    if (!hasTenantId) {
      setUsers([]);
      setError("Missing tenantId in localStorage. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const list = await getTenantSubUsers(tenantId);
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || "Failed to load users");
      showError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantIdStr]);

  // ---------- Filter + paginate ----------
  const filteredUsers = useMemo(() => {
    const s = searchQuery.toLowerCase();
    return users.filter((u) => {
      if (!s) return true;
      return (
        (u.email || "").toLowerCase().includes(s) ||
        (u.mobileNumber || "").toLowerCase().includes(s) ||
        (u.designation || "").toLowerCase().includes(s)
      );
    });
  }, [users, searchQuery]);

  useEffect(() => {
    const t = filteredUsers.length;
    setTotal(t);
    const pages = Math.max(1, Math.ceil(t / limit));
    setTotalPages(pages);
    if (page > pages) setPage(1);
  }, [filteredUsers.length, limit, page]);

  const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit);

  // ---------- Create/Update user (ONLY user details) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const phone = (formData.mobileNumber || "").replace(/[^0-9]/g, "");

    if (!hasTenantId) return setValidationError("Missing tenantId.");
    if (!formData.email.trim()) return setValidationError("Please enter email.");
    if (!editingUser && !formData.password.trim())
      return setValidationError("Please enter password.");
    if (phone.length !== 10)
      return setValidationError("Please enter a valid 10‑digit mobile number.");

    setValidationError("");
    setError("");
    setLoading(true);

    try {
      if (editingUser) {
        const payload = {
          email: formData.email.trim(),
          mobileNumber: phone,
          designation: formData.designation?.trim() || null,
        };

        const res = await updateSubUser(editingUser.id, payload);
        showSuccess(res?.message || "Sub-user updated successfully");
      } else {
        const payload = {
          tenantId,
          email: formData.email.trim(),
          password: formData.password,
          mobileNumber: phone,
          designation: formData.designation?.trim() || undefined,
        };

        const res = await createSubUser(payload);
        showSuccess(res?.message || "Sub-user registered successfully");
      }

      setShowAddModal(false);
      setEditingUser(null);
      resetForm();
      await fetchSubUsers();
    } catch (err) {
      const msg = err.message || "Failed to save user";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Deactivate ----------
  const handleDeactivate = async (id) => {
    const ok = window.confirm("Deactivate this user?");
    if (!ok) return;

    setLoading(true);
    setError("");
    try {
      await deactivateSubUser(id);
      showSuccess("User deactivated");
      await fetchSubUsers();
    } catch (e) {
      const msg = e.message || "Failed to deactivate user";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Open Menu Permission Modal ----------
  const openMenuPermissionModal = async (user) => {
    setMenuUser(user);
    setShowMenuModal(true);
    setMenuLoading(true);
    setError("");

    try {
      // tenant allowed menus (from subscription/current)
      const tenantRes = await getCurrentMenuPermission(); // { permission: {...} }
      const tMenu = toBoolMap(tenantRes?.permission);
      setTenantMenu(tMenu);

      // subuser saved permission
      const subRes = await getSubUserMenuPermission(user.id);
      const subPerm = toBoolMap(subRes?.permission);

      // init: only allowed tenant keys
      const init = {};
      for (const k of Object.keys(tMenu)) init[k] = subPerm[k] === true;
      setMenuForm(init);
    } catch (e) {
      const msg = e.message || "Failed to load menu permissions";
      setError(msg);
      showError(msg);
    } finally {
      setMenuLoading(false);
    }
  };

  const closeMenuPermissionModal = () => {
    setShowMenuModal(false);
    setMenuUser(null);
    setTenantMenu({});
    setMenuForm({});
    setMenuLoading(false);
    setMenuSaving(false);
  };

  const saveMenuPermissions = async () => {
    if (!menuUser?.id) return;

    setMenuSaving(true);
    try {
      // only allow keys from tenantMenu
      const payload = {};
      for (const [k, allowed] of Object.entries(tenantMenu)) {
        payload[k] = allowed === true ? menuForm[k] === true : false;
      }

      await saveSubUserMenuPermission(menuUser.id, payload);
      showSuccess("Menu permissions saved");
      closeMenuPermissionModal();
    } catch (e) {
      showError(e.message || "Failed to save menu permissions");
    } finally {
      setMenuSaving(false);
    }
  };

  // ---------- render ----------
  return (
    <div className="user-container">
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
              setValidationError("");
              setShowAddModal(true);
            }}
            disabled={loading || !hasTenantId}
          >
            <Plus size={18} /> Add User
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by email, mobile, designation..."
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

      {error && (
        <div className="error-banner">
          <AlertCircle size={20} color="#d00" />
          <span>{error}</span>
        </div>
      )}

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
                <th>Email</th>
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
                  <td>{u.email}</td>
                  <td>{u.mobileNumber}</td>
                  <td>{u.designation || "-"}</td>
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
                          setEditingUser(u);
                          setValidationError("");
                          setFormData({
                            email: u.email || "",
                            password: "",
                            mobileNumber: u.mobileNumber || "",
                            designation: u.designation || "",
                          });
                          setShowAddModal(true);
                        }}
                        disabled={loading}
                      >
                        <Edit2 size={16} />
                      </button>

                      {/* MENU PERMISSION BUTTON */}
                      <button
                        className="btn-icon"
                        title="Menu Permission"
                        style={{ color: "#7c3aed" }}
                        onClick={() => openMenuPermissionModal(u)}
                        disabled={loading}
                      >
                        <Shield size={16} />
                      </button>

                      <button
                        className="btn-icon"
                        title="Deactivate"
                        style={{ color: "#ef4444" }}
                        onClick={() => handleDeactivate(u.id)}
                        disabled={loading || !u.isActive}
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

      {/* View Modal */}
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
                <strong>Email:</strong> {viewUser.email}
              </p>
              <p>
                <strong>Mobile:</strong> {viewUser.mobileNumber}
              </p>
              <p>
                <strong>Designation:</strong> {viewUser.designation || "-"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {viewUser.isActive ? "Active" : "Inactive"}
              </p>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setViewUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal (no menu permissions here) */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setEditingUser(null);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? "Edit User" : "Add New User"}</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {validationError && (
              <div
                className="validation-error"
                style={{ margin: "0.75rem 24px 0" }}
              >
                <AlertCircle size={18} color="#dc2626" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter email"
                  required
                />
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter password"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="text"
                  value={formData.mobileNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    if (v.length <= 10)
                      setFormData({ ...formData, mobileNumber: v });
                  }}
                  placeholder="10 digits only"
                  maxLength={10}
                  required
                />
              </div>

              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) =>
                    setFormData({ ...formData, designation: e.target.value })
                  }
                  placeholder="e.g., Sales Executive"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                    resetForm();
                    setValidationError("");
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

      {/* MENU PERMISSION MODAL */}
      {showMenuModal && (
        <div className="modal-overlay" onClick={closeMenuPermissionModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Menu Permissions</h3>
              <button className="close-btn" onClick={closeMenuPermissionModal}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 10, fontSize: 13, opacity: 0.8 }}>
                {menuUser?.email ? (
                  <>
                    <strong>User:</strong> {menuUser.email}
                  </>
                ) : null}
              </div>

              {menuLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 size={16} className="spin" />
                  <span>Loading menu permissions…</span>
                </div>
              ) : Object.keys(tenantMenu).length === 0 ? (
                <div style={{ color: "#991b1b", fontSize: 13 }}>
                  No menus found in current subscription.
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: 420,
                    overflowY: "auto",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  {Object.keys(tenantMenu).map((key) => (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 8px",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={menuForm[key] === true}
                        onChange={(e) =>
                          setMenuForm((prev) => ({
                            ...prev,
                            [key]: e.target.checked,
                          }))
                        }
                      />
                      <span>{formatMenuKey(key)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                type="button"
                onClick={closeMenuPermissionModal}
                disabled={menuSaving}
              >
                Close
              </button>

              <button
                className="btn-primary"
                type="button"
                onClick={saveMenuPermissions}
                disabled={menuLoading || menuSaving}
              >
                {menuSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}