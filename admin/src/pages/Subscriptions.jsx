import React, { useEffect, useMemo, useState } from "react";
import { MdAdd, MdEdit, MdDelete } from "react-icons/md";
import Select from "react-select";

import {
  getAllSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "../api/subscription";

import { MENU_CONFIG } from "../config/menuConfig"; // NEW
import "../styles/Subscriptions.css";

// Top-level plans → module keys
const FEATURE_MENU_MAP = {
  "WhatsApp Campaign": [
    "analytics",    // Dashboard
    "chats",        // WhatsApp Chats
    "contacts",     // Contacts
    "campaigns",    // Campaigns
    "settings",     // Settings
    "quick-reply",  // Quick Reply
  ],
  "AI Chatbot": [
    "chats",
    "contacts",
    "chatbot",
    "settings",
  ],
  Ecommerce: [
    "chats",
    "contacts",
    "ecommerce",
  ],
};

const TOP_FEATURES = ["WhatsApp Campaign", "AI Chatbot", "Ecommerce"];

// Extract plan names from stored features
const extractTopFeatures = (features = []) =>
  TOP_FEATURES.filter((tf) => features.includes(tf));

// Build stored features: plan names + module keys
const buildStoredFeatures = (topFeatures = []) => {
  const moduleKeys = topFeatures.flatMap((tf) => FEATURE_MENU_MAP[tf] || []);
  return Array.from(new Set([...topFeatures, ...moduleKeys]));
};

const Subscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration: "",
    userLimit: "",
    features: [],           // existing plan features (top-level + module keys)
    menuPermissions: [],    // NEW: extra data for menu keys
    isActive: true,
  });

  const [showMenuModal, setShowMenuModal] = useState(false); // NEW

  const featureOptions = useMemo(
    () => TOP_FEATURES.map((f) => ({ value: f, label: f })),
    []
  );

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await getAllSubscriptions();
      setPlans(data);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      duration: "",
      userLimit: "",
      features: [],
      menuPermissions: [],
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
    setShowMenuModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        duration: Number(formData.duration),
        userLimit: Number(formData.userLimit),
        features: Array.from(
          new Set((formData.features || []).filter(Boolean))
        ),
        menuPermissions: Array.from(
          new Set((formData.menuPermissions || []).filter(Boolean))
        ),
      };

      if (editingId) {
        await updateSubscription(editingId, payload);
      } else {
        await createSubscription(payload);
      }

      await fetchPlans();
      resetForm();
    } catch (error) {
      console.error("Failed to save plan:", error);
    }
  };

  const handleEdit = (plan) => {
    setFormData({
      name: plan.name || "",
      price: plan.price != null ? String(plan.price) : "",
      duration: plan.duration != null ? String(plan.duration) : "",
      userLimit: plan.userLimit != null ? String(plan.userLimit) : "",
      features: plan.features || [],
      menuPermissions: plan.menuPermissions || [], // NEW: load if present
      isActive: !!plan.isActive,
    });
    setEditingId(plan.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this plan?")) return;
    try {
      await deleteSubscription(id);
      await fetchPlans();
    } catch (error) {
      console.error("Failed to delete plan:", error);
    }
  };

  const getDisplayFeatures = (features = []) => {
    const topSelected = extractTopFeatures(features);
    if (topSelected.length > 0) return topSelected;
    return features.slice(0, 5);
  };

  const topSelectedValues = extractTopFeatures(formData.features).map(
    (tf) => ({
      value: tf,
      label: tf,
    })
  );

  // ---------- MENU PERMISSION CHECKBOX LOGIC ----------

  const hasMenuPerm = (key) =>
    (formData.menuPermissions || []).includes(key);

  const toggleMenuPermParent = (key, children = []) => {
    setFormData((prev) => {
      const set = new Set(prev.menuPermissions || []);
      const on = set.has(key);

      if (on) {
        set.delete(key);
        // Optionally also remove children:
        // children.forEach((c) => set.delete(c.key));
      } else {
        set.add(key);
        // if parent on, also on children
        children.forEach((c) => set.add(c.key));
      }

      return {
        ...prev,
        menuPermissions: Array.from(set),
      };
    });
  };

  const toggleMenuPermChild = (parentKey, childKey) => {
    setFormData((prev) => {
      const set = new Set(prev.menuPermissions || []);
      const on = set.has(childKey);

      if (on) {
        set.delete(childKey);
      } else {
        set.add(childKey);
        set.add(parentKey); // ensure parent on if any child on
      }

      return {
        ...prev,
        menuPermissions: Array.from(set),
      };
    });
  };

  const renderMenuPermissionCheckboxes = () => (
    <div className="subs-perm-groups">
      {MENU_CONFIG.map((menu) => {
        const parentChecked = hasMenuPerm(menu.key);
        const children = menu.children || [];

        return (
          <div key={menu.key} className="subs-perm-group">
            <label className="subs-perm-group-parent">
              <input
                type="checkbox"
                checked={parentChecked}
                onChange={() => toggleMenuPermParent(menu.key, children)}
              />
              <span>{menu.label}</span>
            </label>

            {children.length > 0 && (
              <div className="subs-perm-group-children">
                {children.map((child) => (
                  <label key={child.key} className="subs-perm-child-row">
                    <input
                      type="checkbox"
                      checked={hasMenuPerm(child.key)}
                      onChange={() =>
                        toggleMenuPermChild(menu.key, child.key)
                      }
                      disabled={!parentChecked}
                    />
                    <span>{child.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ----------------------------------------------------

  return (
    <div className="subscriptions-page">
      <div className="page-header">
        <h1>Subscription Plans</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <MdAdd size={18} /> Add Plan
        </button>
      </div>

      <div className="plans-list">
        <div className="plans-grid">
          {plans.map((plan) => {
            const displayFeatures = getDisplayFeatures(plan.features || []);
            return (
              <div key={plan.id} className="plan-item">
                <div className="plan-info">
                  <h3>{plan.name}</h3>
                  <p className="plan-price">
                    ₹{plan.price} / {plan.duration} days
                  </p>
                  <p>
                    <strong>User Limit:</strong> {plan.userLimit}
                  </p>

                  <p>
                    <strong>Features:</strong>
                  </p>
                  <ul className="plan-features-list">
                    {displayFeatures.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>

                  <span
                    className={`status-badge ${
                      plan.isActive ? "active" : "inactive"
                    }`}
                  >
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="plan-actions">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="btn-edit"
                  >
                    <MdEdit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="btn-delete"
                  >
                    <MdDelete size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content subs-modal">
            <div className="modal-header">
              <h2>{editingId ? "Edit Plan" : "Add Plan"}</h2>
              <button onClick={resetForm} className="close-btn">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="plan-form">
              <div className="form-group">
                <label>Plan Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Duration (days)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>User Limit</label>
                <input
                  type="number"
                  value={formData.userLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, userLimit: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Plan Features</label>

                <Select
                  isMulti
                  classNamePrefix="rs"
                  options={featureOptions}
                  placeholder="Select plan features..."
                  closeMenuOnSelect={false}
                  value={topSelectedValues}
                  onChange={(selected) => {
                    const topFeatures = (selected || []).map((o) => o.value);
                    const storedFeatures = buildStoredFeatures(topFeatures);
                    setFormData((prev) => ({
                      ...prev,
                      features: storedFeatures,
                    }));
                  }}
                />

                <small style={{ display: "block", marginTop: 8, opacity: 0.8 }}>
                  Selecting a feature automatically includes all related menus.
                </small>
              </div>

              {/* NEW: Menu Permission button */}
             

              {/* Menu Permissions header + Plan Status card (screenshot style) */}
<div className="perm-section">
  <div className="perm-section-header">
    <div>
      <div className="perm-section-title">Menu Permissions</div>
      <div className="perm-section-subtitle">
        Fine-tune access control for this plan.
      </div>
    </div>

    <button
      type="button"
      className="perm-section-action"
      onClick={() => setShowMenuModal(true)}
    >
      Configure Access
    </button>
  </div>

  <div className="status-tile">
    <div className="status-tile-left">
      <div className="status-icon-wrap" aria-hidden="true">
        {/* simple shield svg */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L20 5.5V12.2C20 17 16.6 20.9 12 22C7.4 20.9 4 17 4 12.2V5.5L12 2Z"
            stroke="#16A34A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div>
        <div className="status-tile-title">Plan Status</div>
        <div className="status-tile-sub">
          Plan is currently {formData.isActive ? "active" : "inactive"}
        </div>
      </div>
    </div>

    <button
      type="button"
      className={`status-toggle ${formData.isActive ? "on" : ""}`}
      onClick={() =>
        setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))
      }
      aria-pressed={formData.isActive}
      aria-label="Toggle plan active status"
    >
      <span className="status-toggle-knob" />
    </button>
  </div>
</div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>

          {/* SECOND MODAL: Menu permissions */}
          {showMenuModal && (
            <div
              className="perm-modal-overlay"
              onClick={() => setShowMenuModal(false)}
            >
              <div
                className="perm-modal-box"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="perm-modal-header">
                  <div>
                    <div className="perm-modal-title">
                      Plan Menu Permission
                    </div>
                    <div className="perm-modal-subtitle">
                      {formData.name || "New Plan"}
                    </div>
                  </div>
                  <button
                    className="close-btn"
                    onClick={() => setShowMenuModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="perm-modal-body">
                  {renderMenuPermissionCheckboxes()}
                </div>

                <div className="perm-modal-footer">
                  <button
                    className="perm-btn-secondary"
                    onClick={() => setShowMenuModal(false)}
                  >
                    Close
                  </button>
                  {/* No extra save: changes already in formData.menuPermissions */}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Subscriptions;