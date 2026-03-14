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
  Shield,
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
import { MENU_CONFIG } from "../config/menuconfig";

function toBoolMap(obj) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === true;
  return out;
}

export default function CreateUser({ tenantId: tenantIdProp }) {
  const tenantIdStr = tenantIdProp ?? localStorage.getItem("tenantId");
  const tenantId = Number(tenantIdStr);
  const hasTenantId = Number.isInteger(tenantId) && tenantId > 0;

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewUser, setViewUser] = useState(null);

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuUser, setMenuUser] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);
  const [tenantMenu, setTenantMenu] = useState({});
  const [menuForm, setMenuForm] = useState({});

  const { showSuccess, showError } = useToast();

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

  const openMenuPermissionModal = async (user) => {
    setMenuUser(user);
    setShowMenuModal(true);
    setMenuLoading(true);
    setError("");

    try {
      const tenantRes = await getCurrentMenuPermission();
      const tMenu = toBoolMap(tenantRes?.permission);
      setTenantMenu(tMenu);

      const subRes = await getSubUserMenuPermission(user.id);
      const subPerm = toBoolMap(subRes?.permission);

      const init = {};

      MENU_CONFIG.forEach((menu) => {
        if (menu.children?.length) {
          menu.children.forEach((child) => {
            init[child.key] = subPerm[child.key] === true;
          });
        } else {
          init[menu.key] = subPerm[menu.key] === true;
        }
      });

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
      const payload = {};

      MENU_CONFIG.forEach((menu) => {
        if (menu.children?.length) {
          if (tenantMenu[menu.key] === true) {
            menu.children.forEach((child) => {
              payload[child.key] = menuForm[child.key] === true;
            });
          }
        } else if (tenantMenu[menu.key] === true) {
          payload[menu.key] = menuForm[menu.key] === true;
        }
      });

      await saveSubUserMenuPermission(menuUser.id, payload);
      showSuccess("Menu permissions saved");
      closeMenuPermissionModal();
    } catch (e) {
      showError(e.message || "Failed to save menu permissions");
    } finally {
      setMenuSaving(false);
    }
  };

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
              <p><strong>Email:</strong> {viewUser.email}</p>
              <p><strong>Mobile:</strong> {viewUser.mobileNumber}</p>
              <p><strong>Designation:</strong> {viewUser.designation || "-"}</p>
              <p><strong>Status:</strong> {viewUser.isActive ? "Active" : "Inactive"}</p>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setViewUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="validation-error" style={{ margin: "0.75rem 24px 0" }}>
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

      {showMenuModal && (
        <div className="modal-overlay" onClick={closeMenuPermissionModal}>
          <div
            className="modal-content menu-permission-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Menu Permissions</h3>
              <button className="close-btn" onClick={closeMenuPermissionModal}>
                <X size={20} />
              </button>
            </div>

            <div className="menu-permission-wrapper">
              <div className="menu-permission-user">
                {menuUser?.email ? (
                  <>
                    <strong>User:</strong> {menuUser.email}
                  </>
                ) : null}
              </div>

              {menuLoading ? (
                <div className="menu-loading-row">
                  <Loader2 size={16} className="spin" />
                  <span>Loading menu permissions…</span>
                </div>
              ) : Object.keys(tenantMenu).length === 0 ? (
                <div className="menu-empty-state">
                  No menus found in current subscription.
                </div>
              ) : (
                <div className="menu-permission-list">
                  {MENU_CONFIG.map((menu) => {
                    const hasChildren =
                      menu.children && menu.children.length > 0;

                    if (hasChildren) {
                      if (tenantMenu[menu.key] !== true) return null;

                      return (
                        <div key={menu.key} className="menu-group-card">
                          <div className="menu-group-title">{menu.label}</div>

                          <div className="menu-group-children">
                            {menu.children.map((child) => (
                              <label
                                key={child.key}
                                className="menu-checkbox-row"
                              >
                                <input
                                  type="checkbox"
                                  checked={menuForm[child.key] === true}
                                  onChange={(e) =>
                                    setMenuForm((prev) => ({
                                      ...prev,
                                      [child.key]: e.target.checked,
                                    }))
                                  }
                                />
                                <span>{child.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (tenantMenu[menu.key] !== true) return null;

                    return (
                      <label key={menu.key} className="menu-checkbox-row single">
                        <input
                          type="checkbox"
                          checked={menuForm[menu.key] === true}
                          onChange={(e) =>
                            setMenuForm((prev) => ({
                              ...prev,
                              [menu.key]: e.target.checked,
                            }))
                          }
                        />
                        <span>{menu.label}</span>
                      </label>
                    );
                  })}
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