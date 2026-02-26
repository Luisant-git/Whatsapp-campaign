import React, { useEffect, useState } from "react";
import { MENU_CONFIG } from "../config/menuConfig";
import { getMenuPermission, saveMenuPermission } from "../api/menuPermission";
import "../styles/MenuPermission.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3010";

const MenuPermission = () => {
  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

  const [selectedTenant, setSelectedTenant] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoadingTenants(true);
      const res = await fetch(`${API_URL}/admin/users/all`, {
        credentials: "include",
      });
      if (!res.ok) {
        console.error("Failed to load tenants");
        return;
      }
      const data = await res.json();
      setTenants(data || []);
    } catch (err) {
      console.error("Error loading tenants:", err);
    } finally {
      setLoadingTenants(false);
    }
  };

  const openEditModal = async (tenant) => {
    setSelectedTenant(tenant);
    setPermissions({});
    setModalOpen(true);

    try {
      setLoadingPermissions(true);
      const data = await getMenuPermission(tenant.id);
      setPermissions(data?.permission || {});
    } catch (error) {
      console.error("fetchPermissions error:", error);
      alert(error.message);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedTenant(null);
    setPermissions({});
  };

  const togglePermission = (key, children = []) => {
    setPermissions((prev) => {
      const newValue = !prev[key];
      const updated = { ...prev, [key]: newValue };

      // If turning parent ON, enable children too
      if (newValue && children.length > 0) {
        children.forEach((child) => {
          updated[child.key] = true;
        });
      }

      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedTenant) {
      alert("No tenant selected");
      return;
    }
    const tenantId = selectedTenant.id;

    try {
      setSaving(true);
      await saveMenuPermission(tenantId, permissions);
      alert("Permissions updated successfully");
      closeModal();
    } catch (error) {
      console.error("saveMenuPermission error:", error);
      alert(error.message || "Error saving permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loadingTenants) {
    return (
      <div className="menu-page">
        <p>Loading tenants...</p>
      </div>
    );
  }

  return (
    <div className="menu-page">
      <div className="menu-header">
        <h1>Tenant Menu Permission</h1>
      </div>

      {/* Tenant list */}
      <div className="menu-tenant-table-wrapper">
        <table className="menu-tenant-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Tenant Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Menu Option</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t, index) => (
              <tr key={t.id}>
                <td>{index + 1}</td>
                <td>{t.companyName || t.name}</td>
                <td>{t.email}</td>
                <td>
                  <span
                    className={`status-badge ${
                      t.isActive ? "active" : "inactive"
                    }`}
                  >
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-small"
                    onClick={() => openEditModal(t)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center" }}>
                  No tenants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal like in screenshot */}
      {modalOpen && selectedTenant && (
        <div className="perm-modal-overlay" onClick={closeModal}>
          <div
            className="perm-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header row with title + tenant info */}
            <div className="perm-modal-header">
              <div>
                <div className="perm-modal-title">Menu Permission</div>
                <div className="perm-modal-subtitle">
                  {selectedTenant.companyName || selectedTenant.name} (ID:{" "}
                  {selectedTenant.id})
                </div>
              </div>
            </div>

            {/* Scrollable body with checkbox list */}
            <div className="perm-modal-body">
              {loadingPermissions ? (
                <p>Loading permissions...</p>
              ) : (
                <div className="perm-groups">
                  {MENU_CONFIG.map((menu) => (
                    <div key={menu.key} className="perm-group">
                      <label className="perm-group-parent">
                        <input
                          type="checkbox"
                          checked={permissions[menu.key] || false}
                          onChange={() =>
                            togglePermission(menu.key, menu.children || [])
                          }
                        />
                        <span>{menu.label}</span>
                      </label>

                      {menu.children && (
                        <div className="perm-group-children">
                          {menu.children.map((child) => (
                            <label
                              key={child.key}
                              className="perm-child-row"
                            >
                              <input
                                type="checkbox"
                                checked={permissions[child.key] || false}
                                onChange={() => togglePermission(child.key)}
                                disabled={!permissions[menu.key]}
                              />
                              <span>{child.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Cancel/Save */}
            <div className="perm-modal-footer">
              <button className="perm-btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="perm-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPermission;