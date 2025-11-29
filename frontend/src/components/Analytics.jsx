import React, { useState, useEffect } from 'react';
import { getAnalytics, getAllSettings } from '../api/auth';
import { BarChart3, MessageSquare, CheckCircle, XCircle, Users, TrendingUp } from 'lucide-react';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedSettingsName, setSelectedSettingsName] = useState('');

  useEffect(() => {
    fetchPhoneNumbers();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedSettingsName]);

  const fetchPhoneNumbers = async () => {
    try {
      const data = await getAllSettings();
      setPhoneNumbers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await getAnalytics(selectedSettingsName || null);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div className="analytics-title">
          <h1>Analytics Dashboard</h1>
          <p>WhatsApp campaign performance overview</p>
        </div>
        <div className="analytics-controls">
          <select 
            value={selectedSettingsName} 
            onChange={(e) => setSelectedSettingsName(e.target.value)}
            className="phone-filter"
          >
            <option value="">All Phone Numbers</option>
            {phoneNumbers.map((phone, index) => (
              <option key={`phone-${phone.id}-${index}`} value={phone.name}>
                {phone.name} ({phone.phoneNumberId})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <MessageSquare size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Messages</h3>
            <p className="stat-number">{analytics?.totalMessages || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon today">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Today's Messages</h3>
            <p className="stat-number">{analytics?.todayMessages || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Successful Deliveries</h3>
            <p className="stat-number">{analytics?.successfulDeliveries || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon failed">
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Failed Messages</h3>
            <p className="stat-number">{analytics?.failedMessages || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon contacts">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Contacts</h3>
            <p className="stat-number">{analytics?.totalContacts || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon rate">
            <BarChart3 size={24} />
          </div>
          <div className="stat-content">
            <h3>Delivery Rate</h3>
            <p className="stat-number">{analytics?.deliveryRate || 0}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;