import React, { useState, useEffect } from 'react';
import { getSubscriptionOrders, updateOrderStatus, getAllSubscriptions, createUserSubscription } from '../api/subscription';
import { getAdminUsers } from '../api/Company';
import { Plus } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import '../styles/SubscriptionOrders.css';

const SubscriptionOrders = () => {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ userId: '', planId: '' });
  const { showToast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [ordersData, usersData, plansData] = await Promise.all([
        getSubscriptionOrders(),
        getAdminUsers(),
        getAllSubscriptions()
      ]);
      setOrders(ordersData);
      setUsers(usersData);
      setPlans(plansData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await getSubscriptionOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createUserSubscription(formData.userId, {
        planId: parseInt(formData.planId)
      });
      showToast('Subscription created successfully', 'success');
      setShowCreateModal(false);
      setFormData({ userId: '', planId: '' });
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create subscription:', error);
      showToast(error.message || 'Failed to create subscription', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      showToast(`Order ${status === 'active' ? 'approved' : 'cancelled'} successfully`, 'success');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('Failed to update order status', 'error');
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB');
  };

  const getStatusClass = (status) => {
    return status === 'active' ? 'active' : status === 'expired' ? 'expired' : status === 'pending' ? 'pending' : 'cancelled';
  };

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <h1>Subscription Orders</h1>
          <p className="subtitle">All subscription purchases and renewals</p>
        </div>
        <button className="btn-create" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Create Subscription
        </button>
      </div>

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>User</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Order Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>
                  <div className="user-info">
                    <div className="user-name">{order.tenant?.name || 'N/A'}</div>
                    <div className="user-email">{order.tenant?.email || 'N/A'}</div>
                  </div>
                </td>
                <td><strong>{order.plan?.name || 'N/A'}</strong></td>
                <td className="amount">₹{order.amount}</td>
                <td>{formatDate(order.startDate)}</td>
                <td>{formatDate(order.endDate)}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td>{formatDate(order.createdAt)}</td>
                <td>
                  {order.status === 'pending' && (
                    <div className="action-buttons">
                      <button 
                        className="btn-approve"
                        onClick={() => handleStatusUpdate(order.id, 'active')}
                      >
                        Approve
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Subscription</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubscription}>
              <div className="form-group">
                <label>Select User *</label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                >
                  <option value="">Select User</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.companyName || user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subscription Plan *</label>
                <select
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                  required
                >
                  <option value="">Select Plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price} ({plan.duration} days)
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionOrders;
