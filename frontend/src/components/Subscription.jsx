import React, { useState, useEffect } from 'react';
import { getSubscriptions } from '../api/subscription';
import { Check } from 'lucide-react';
import '../styles/Subscription.css';

const Subscription = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await getSubscriptions();
      setPlans(data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading plans...</div>;

  return (
    <div className="subscription-container">
      <div className="subscription-header">
        <h1>Choose Your Plan</h1>
        <p>Select the perfect plan for your business needs</p>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.id} className="plan-card">
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
            <button className="btn-subscribe">Subscribe Now</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Subscription;
