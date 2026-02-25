import React, { useEffect, useState } from "react";
import { MENU_CONFIG } from "../config/menuConfig";

import "../styles/MenuPermission.css";
import { getMenuPermission, saveMenuPermission } from "../api/menuPermission";

const MenuPermission = ({ companyId }) => {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchPermissions();
    }
  }, [companyId]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const data = await getMenuPermission(companyId);
      setPermissions(data?.permission || {});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (key, children = []) => {
    setPermissions((prev) => {
      const updated = {
        ...prev,
        [key]: !prev[key],
      };

      if (!prev[key] && children.length > 0) {
        children.forEach((child) => {
          updated[child.key] = true;
        });
      }

      return updated;
    });
  };

  const handleSave = async () => {
    try {
      await saveMenuPermission({
        companyId,
        permission: permissions,
      });

      alert("Permissions Updated Successfully");
    } catch (error) {
      console.error(error);
      alert("Error saving permissions");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="menu-page">
      <div className="menu-container">
        <h1 className="page-title">Menu Permission Management</h1>

        {MENU_CONFIG.map((menu) => (
          <div key={menu.key} className="menu-card">
            <div className="menu-header">
              <span className="menu-title">{menu.label}</span>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={permissions[menu.key] || false}
                  onChange={() =>
                    togglePermission(menu.key, menu.children || [])
                  }
                />
                <span className="slider"></span>
              </label>
            </div>

            {menu.children && permissions[menu.key] && (
              <div className="submenu">
                {menu.children.map((child) => (
                  <div key={child.key} className="submenu-item">
                    <span>{child.label}</span>

                    <label className="switch small">
                      <input
                        type="checkbox"
                        checked={permissions[child.key] || false}
                        onChange={() => togglePermission(child.key)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="save-section">
          <button className="save-btn" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuPermission;