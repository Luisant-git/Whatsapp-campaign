import React, { useState, useEffect } from 'react';
import {
  getSubscriptionOrders,
  updateOrderStatus,
  getAllSubscriptions,
  createUserSubscription
} from '../api/subscription';
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

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');


  const { showToast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, entriesPerPage, statusFilter]);

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
      showToast(
        `Order ${status === 'active' ? 'approved' : 'cancelled'} successfully`,
        'success'
      );
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
    return status === 'active'
      ? 'active'
      : status === 'expired'
        ? 'expired'
        : status === 'pending'
          ? 'pending'
          : 'cancelled';
  };

  const getEffectiveStatus = (order) => {
    if (order.status !== 'active') return order.status;

    const today = new Date();
    const endDate = new Date(order.endDate);

    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return endDate < today ? 'expired' : 'active';
  };

const filteredOrders = orders
  .filter((order) => {
    const company = order.tenant?.companyName || '';
    const email = order.tenant?.email || '';

    return (
      company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  })
    .filter((order) => {
      const effectiveStatus = getEffectiveStatus(order);

      if (statusFilter === 'active') return effectiveStatus === 'active';
      if (statusFilter === 'inactive') {
        return effectiveStatus === 'expired' || effectiveStatus === 'cancelled';
      }
      return true;
    });

  const totalPages = Math.ceil(filteredOrders.length / entriesPerPage) || 1;

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <h1>Subscription Orders</h1>

        </div>
        {/* <button className="btn-create" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Create Subscription
        </button> */}
      </div>

      <div className="orders-toolbar">
        <div className="entries-control">
          <label>Show</label>
          <select
            value={entriesPerPage}
            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>

        <div className="search-control">
         <input
  type="text"
  placeholder="Search company or email..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
        </div>
        <div className="entries-control">
          <label>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="desktop-orders-table">
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th className="user-col">Company Name</th>
                <th className="plan-col">Plan</th>
                <th>Amount</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Order Date</th>
                {/* <th>Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td className="user-col">
                    <div className="user-info">
                      <div className="user-name">
  {order.tenant?.companyName || 'N/A'}
</div>
                      <div className="user-email">{order.tenant?.email || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="plan-col"><strong>{order.plan?.name || 'N/A'}</strong></td>
                  <td className="amount">₹{order.amount}</td>
                  <td>{formatDate(order.startDate)}</td>
                  <td>{formatDate(order.endDate)}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(getEffectiveStatus(order))}`}>
                      {getEffectiveStatus(order)}
                    </span>
                  </td>
                  <td>{formatDate(order.createdAt)}</td>
                  {/* <td>
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
                  </td> */}
                </tr>
              ))}

              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center' }}>
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mobile-orders-list">
        {paginatedOrders.map((order) => (
          <div className="order-card" key={order.id}>
            <div className="order-card-top">
              <div>
                <h3>Order #{order.id}</h3>
              <p>{order.tenant?.companyName || 'N/A'}</p>
                <span className="user-email">{order.tenant?.email || 'N/A'}</span>
              </div>

              <span className={`status-badge ${getStatusClass(getEffectiveStatus(order))}`}>
                {getEffectiveStatus(order)}
              </span>
            </div>

            <div className="order-card-details">
              <div className="order-card-row">
                <span className="order-label">Plan</span>
                <span>{order.plan?.name || 'N/A'}</span>
              </div>

              <div className="order-card-row">
                <span className="order-label">Amount</span>
                <span className="amount">₹{order.amount}</span>
              </div>

              <div className="order-card-row">
                <span className="order-label">Start Date</span>
                <span>{formatDate(order.startDate)}</span>
              </div>

              <div className="order-card-row">
                <span className="order-label">End Date</span>
                <span>{formatDate(order.endDate)}</span>
              </div>

              <div className="order-card-row">
                <span className="order-label">Order Date</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
            </div>

            {/* {order.status === 'pending' && (
              <div className="order-card-actions">
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
            )} */}
          </div>
        ))}
      </div>

      <div className="orders-pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        >
          Prev
        </button>

        <span>
          Page {currentPage} of {totalPages}
        </span>

        <button
          disabled={currentPage === totalPages}
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
        >
          Next
        </button>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Subscription</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
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
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
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