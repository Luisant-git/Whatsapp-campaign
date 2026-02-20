import React, { useEffect, useMemo, useState } from 'react';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import {
  getAllSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription
} from '../api/subscription';
import '../styles/Subscriptions.css';
import Select from "react-select";

const FEATURE_MENU_MAP = {
  "WhatsApp Campaign": [
    "chats",
    "contacts",
    "bulk",
    "settings",
    "auto-reply",
    "campaigns",
    "labels",
    "blacklist",
    "quick-reply",
    "master-config",
    "createuser"
  ],
  "AI Chatbot": [
    "chats",
    "contacts",
    "chatbot",
    "labels",
    "blacklist"
  ],
  "Ecommerce": [
    "chats",
    "contacts",
    "categories",
    "products",
    "orders",
    "blacklist"
  ]
};

const TOP_FEATURES = ["WhatsApp Campaign", "AI Chatbot", "Ecommerce"];

const Subscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    userLimit: '',
    features: [],
    isActive: true
  });

  const featureOptions = useMemo(
    () => TOP_FEATURES.map(f => ({ value: f, label: f })),
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
      console.error('Failed to fetch plans:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      duration: '',
      userLimit: '',
      features: [],
      isActive: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Extract only top-level features from stored features
  const extractTopFeatures = (features = []) => {
    return TOP_FEATURES.filter(tf => features.includes(tf));
  };

  // Build final stored features = top features + mapped menus
  const buildStoredFeatures = (topFeatures = []) => {
    const mappedMenus = topFeatures.flatMap(tf => FEATURE_MENU_MAP[tf] || []);
    return Array.from(new Set([...topFeatures, ...mappedMenus]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: Number(formData.price),
        duration: Number(formData.duration),
        userLimit: Number(formData.userLimit),
        features: Array.from(new Set((formData.features || []).filter(Boolean))),
      };

      if (editingId) {
        await updateSubscription(editingId, data);
      } else {
        await createSubscription(data);
      }

      fetchPlans();
      resetForm();
    } catch (error) {
      console.error('Failed to save plan:', error);
    }
  };

  const handleEdit = (plan) => {
    setFormData({
      name: plan.name,
      price: String(plan.price ?? ''),
      duration: String(plan.duration ?? ''),
      userLimit: String(plan.userLimit ?? ''),
      features: plan.features || [],
      isActive: !!plan.isActive
    });
    setEditingId(plan.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this plan?')) {
      try {
        await deleteSubscription(id);
        fetchPlans();
      } catch (error) {
        console.error('Failed to delete plan:', error);
      }
    }
  };

  // Display only top features that are selected
  const getDisplayFeatures = (features = []) => {
    const topSelected = extractTopFeatures(features);
    if (topSelected.length > 0) {
      return topSelected;
    }
    // If no top features, show raw features (for backward compatibility)
    return features.slice(0, 5); // Show first 5 to avoid clutter
  };

  // react-select value should show ONLY top features
  const topSelectedValues = extractTopFeatures(formData.features).map(tf => ({
    value: tf,
    label: tf
  }));

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
            const displayFeatures = getDisplayFeatures(plan.features);
            return (
              <div key={plan.id} className="plan-item">
                <div className="plan-info">
                  <h3>{plan.name}</h3>
                  <p className="plan-price">₹{plan.price} / {plan.duration} days</p>
                  <p><strong>User Limit:</strong> {plan.userLimit}</p>

                  <p><strong>Features:</strong></p>
                  <ul className="plan-features-list">
                    {displayFeatures.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>

                  <span className={`status-badge ${plan.isActive ? 'active' : 'inactive'}`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="plan-actions">
                  <button onClick={() => handleEdit(plan)} className="btn-edit">
                    <MdEdit size={16} />
                  </button>
                  <button onClick={() => handleDelete(plan.id)} className="btn-delete">
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
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Plan' : 'Add Plan'}</h2>
              <button onClick={resetForm} className="close-btn">×</button>
            </div>

            <form onSubmit={handleSubmit} className="plan-form">
              <div className="form-group">
                <label>Plan Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Duration (days)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>User Limit</label>
                <input
                  type="number"
                  value={formData.userLimit}
                  onChange={(e) => setFormData({ ...formData, userLimit: e.target.value })}
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
                    const topFeatures = (selected || []).map(o => o.value);
                    // IMPORTANT: store top features + all mapped menus
                    const storedFeatures = buildStoredFeatures(topFeatures);
                    
                    setFormData(prev => ({
                      ...prev,
                      features: storedFeatures
                    }));
                  }}
                />

                <small style={{ display: "block", marginTop: 8, opacity: 0.8 }}>
                  Selecting a feature automatically includes all related menus
                </small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;