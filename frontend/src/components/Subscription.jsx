import React, { useState, useEffect } from 'react';
import { getSubscriptions, getCurrentPlan, subscribeToPlan, getUserOrders, setCurrentPlan as setCurrentPlanAPI } from '../api/subscription';
import { Check, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import '../styles/Subscription.css';

const Subscription = () => {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeTab, setActiveTab] = useState('plans');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansData, currentData, ordersData] = await Promise.all([
        getSubscriptions(),
        getCurrentPlan(),
        getUserOrders()
      ]);
      setPlans(plansData);
      setCurrentPlan(currentData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribeClick = (plan) => {
    setSelectedPlan(plan);
    setShowConfirmModal(true);
  };

  const confirmSubscription = async () => {
    try {
      await subscribeToPlan(selectedPlan.id);
      toast.success('Subscribed successfully!');
      setShowConfirmModal(false);
      setSelectedPlan(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to subscribe');
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return <CheckCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'expired': return <AlertCircle size={16} />;
      case 'cancelled': return <XCircle size={16} />;
      default: return null;
    }
  };

  const handleSetCurrentPlan = async (orderId) => {
    console.log('Clicking Use This Plan, orderId:', orderId);
    try {
      console.log('Calling setCurrentPlan API...');
      const result = await setCurrentPlanAPI(orderId);
      console.log('API Response:', result);
      toast.success('Current plan updated!');
      await fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update current plan');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="subscription-container">
      {currentPlan?.subscription && (
        <div className="current-plan-card">
          <div className="plan-badge">
            <span className={`badge ${currentPlan.isActive ? 'active' : 'expired'}`}>
              {currentPlan.isActive ? '✓ Active' : '✗ Expired'}
            </span>
          </div>
          <div className="plan-details">
            <h2>Current Plan</h2>
            <h3>{currentPlan.subscription.name}</h3>
            <div className="plan-info">
              <div className="info-item">
                <span className="label">Valid Until</span>
                <span className="value">{formatDate(currentPlan.endDate)}</span>
              </div>
              <div className="info-item">
                <span className="label">Price</span>
                <span className="value">₹{currentPlan.subscription.price}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="subscription-header">
        <h1>{currentPlan?.subscription ? 'Upgrade Your Plan' : 'Choose Your Plan'}</h1>
        <p>Select the perfect plan for your business needs</p>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          Available Plans
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          My Subscriptions
        </button>
      </div>

      {activeTab === 'plans' && (
        <div className="plans-grid">
          {plans.map((plan) => (
            <div key={plan.id} className={`plan-card ${currentPlan?.subscription?.id === plan.id ? 'current' : ''}`}>
              <h3>{plan.name}</h3>
              <div className="plan-price">
                <span className="currency">₹</span>
                <span className="amount">{plan.price}</span>
                <span className="duration">/{plan.duration} days</span>
              </div>
              <ul className="plan-features">
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <Check size={18} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button 
                className="btn-subscribe" 
                onClick={() => handleSubscribeClick(plan)}
                disabled={currentPlan?.subscription?.id === plan.id && currentPlan?.isActive}
              >
                {currentPlan?.subscription?.id === plan.id && currentPlan?.isActive ? 'Current Plan' : 'Subscribe Now'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="orders-history">
          {orders.length === 0 ? (
            <div className="empty-state">No subscription history found</div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <h3>{order.plan.name}</h3>
                    <div className="header-right">
                      <span className={`order-status ${order.status}`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                      {order.isCurrentPlan && <span className="current-badge">Current</span>}
                    </div>
                  </div>
                  <div className="order-details">
                    <div className="detail-item">
                      <span className="label">Amount</span>
                      <span className="value">₹{order.amount}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Duration</span>
                      <span className="value">{order.plan.duration} days</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Start Date</span>
                      <span className="value">{formatDate(order.startDate)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">End Date</span>
                      <span className="value">{formatDate(order.endDate)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Order Date</span>
                      <span className="value">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  {order.status === 'active' && !order.isCurrentPlan && (
                    <button className="btn-use-plan" onClick={() => handleSetCurrentPlan(order.id)}>
                      Use This Plan
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showConfirmModal && selectedPlan && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Subscription</h3>
            <div className="modal-plan-info">
              <p className="plan-name">{selectedPlan.name}</p>
              <p className="plan-price">₹{selectedPlan.price} for {selectedPlan.duration} days</p>
            </div>
            <p className="confirm-text">Are you sure you want to subscribe to this plan?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button className="btn-confirm" onClick={confirmSubscription}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;
