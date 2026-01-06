import React, { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import { getAllSubscriptions, getUserSubscriptions, createSubscription, updateSubscription, deleteSubscription } from '../api/subscription';
import '../styles/Subscriptions.css';

const Subscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    features: [''],
    isActive: true
  });

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
    setFormData({ name: '', price: '', duration: '', features: [''], isActive: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        features: formData.features.filter(f => f.trim())
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
      price: plan.price.toString(),
      duration: plan.duration.toString(),
      features: plan.features.length ? plan.features : [''],
      isActive: plan.isActive
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

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const updateFeature = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const removeFeature = (index) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });
  };

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
          {plans.map((plan) => (
            <div key={plan.id} className="plan-item">
              <div className="plan-info">
                <h3>{plan.name}</h3>
                <p className="plan-price">₹{plan.price} / {plan.duration} days</p>
                <ul className="plan-features-list">
                  {plan.features.map((feature, i) => (
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
          ))}
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
                <label>Features</label>
                {formData.features.map((feature, index) => (
                  <div key={index} className="feature-input">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      placeholder="Enter feature"
                    />
                    {formData.features.length > 1 && (
                      <button type="button" onClick={() => removeFeature(index)} className="btn-remove">
                        <MdDelete size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addFeature} className="btn-add-feature">
                  <MdAdd size={16} /> Add Feature
                </button>
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
                <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

  );
};

export default Subscriptions;
