import React, { useState, useEffect } from 'react';
import { getCurrentPlan, getUserOrders } from '../api/subscription';
import { Check, Clock, CheckCircle, XCircle, AlertCircle, Users } from 'lucide-react';
import '../styles/Subscription.css';

const Subscription = () => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plans');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [currentData, ordersData] = await Promise.all([
        getCurrentPlan(),
        getUserOrders()
      ]);
      setCurrentPlan(currentData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
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
              <div className="info-item">
                <span className="label">User Limit</span>
                <span className="value">
                  {currentPlan.subscription.userLimit} Users
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="subscription-header">
        <h1>My Plan</h1>
        <p>View your current subscription details</p>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          My Plan
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
          {currentPlan?.subscription ? (
            <div className="plan-card current">
              <h3>{currentPlan.subscription.name}</h3>
              <div className="plan-price">
                <span className="currency">₹</span>
                <span className="amount">{currentPlan.subscription.price}</span>
                <span className="duration">/{currentPlan.subscription.duration} days</span>
              </div>

              <div className="plan-userLimitRow">
                <div className="plan-userLeft">
                  <span className="plan-userIcon">
                    <Users size={16} />
                  </span>
                  <span className="plan-userText">User limit</span>
                </div>

                <span className="plan-userPill">
                  Up to {currentPlan.subscription.userLimit} users
                </span>
              </div>

              <ul className="plan-features">
                {currentPlan.subscription.features?.map((feature, index) => (
                  <li key={index}>
                    <Check size={18} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button className="btn-subscribe" disabled>
                {currentPlan.isActive ? 'Current Plan' : 'Expired Plan'}
              </button>
            </div>
          ) : (
            <div className="empty-state">No current subscription found</div>
          )}
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Subscription;