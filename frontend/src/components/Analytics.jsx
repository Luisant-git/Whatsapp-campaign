import React, { useState, useEffect } from 'react';
import { getAnalytics, getAllSettings } from '../api/auth';
import {
  BarChart3,
  MessageSquare,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Radio,
  FileText,
  Layers,
  Calendar,
  Filter,
  RotateCcw
} from 'lucide-react';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedSettingsName, setSelectedSettingsName] = useState('');
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedSettingsName, selectedTemplateName, datePreset, startDate, endDate]);

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
      setLoading(true);
      const params = {
        settingsName: selectedSettingsName || undefined,
        templateName: selectedTemplateName || undefined,
        datePreset: datePreset !== 'custom' ? datePreset : undefined,
        startDate: datePreset === 'custom' && startDate ? startDate : undefined,
        endDate: datePreset === 'custom' && endDate ? endDate : undefined,
      };
      const data = await getAnalytics(params);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedSettingsName('');
    setSelectedTemplateName('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    Boolean(selectedSettingsName) ||
    Boolean(selectedTemplateName) ||
    datePreset !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate);

  const getPeriodLabel = () => {
    switch (datePreset) {
      case 'today':
        return "Today's Messages";
      case 'yesterday':
        return "Yesterday's Messages";
      case 'last_7_days':
        return 'Messages (Last 7 Days)';
      case 'last_30_days':
        return 'Messages (Last 30 Days)';
      case 'this_month':
        return 'Messages (This Month)';
      case 'custom':
        return startDate && endDate
          ? `Messages (${startDate} to ${endDate})`
          : 'Period Messages';
      default:
        return 'Total Messages';
    }
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div className="analytics-title">
          <h1>Analytics Dashboard</h1>
          <p>WhatsApp campaign performance overview</p>
        </div>

        {/* Filters Section */}
        <div className="analytics-filters-bar">
          {/* Phone Number Filter */}
          <div className="filter-item">
            <label className="filter-label">Phone Number:</label>
            <select
              value={selectedSettingsName}
              onChange={(e) => setSelectedSettingsName(e.target.value)}
              className="analytics-select"
            >
              <option value="">All Phone Numbers</option>
              {phoneNumbers.map((phone, index) => (
                <option key={`phone-${phone.id}-${index}`} value={phone.name}>
                  {phone.name} ({phone.phoneNumberId})
                </option>
              ))}
            </select>
          </div>

          {/* Template Filter */}
          <div className="filter-item">
            <label className="filter-label">Template:</label>
            <select
              value={selectedTemplateName}
              onChange={(e) => setSelectedTemplateName(e.target.value)}
              className="analytics-select"
            >
              <option value="">All Templates</option>
              {(analytics?.availableTemplates || []).map((tName, idx) => (
                <option key={`tmpl-${idx}`} value={tName}>
                  {tName}
                </option>
              ))}
            </select>
          </div>

          {/* Date Preset Filter */}
          <div className="filter-item">
            <label className="filter-label">Date Range:</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="analytics-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="custom-date-group">
              <div className="filter-item">
                <label className="filter-label">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="analytics-date-input"
                />
              </div>
              <div className="filter-item">
                <label className="filter-label">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="analytics-date-input"
                />
              </div>
            </div>
          )}

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="reset-filters-btn"
              title="Reset all filters"
            >
              <RotateCcw size={15} />
              Reset
            </button>
          )}
        </div>
      </div>

      {loading && !analytics ? (
        <div className="loading">Loading analytics...</div>
      ) : (
        <>
          {/* Active Filter Notice */}
          {hasActiveFilters && (
            <div className="active-filter-banner">
              <Filter size={15} color="#008069" />
              <span>
                Filtered by:{' '}
                {selectedSettingsName ? `Phone: "${selectedSettingsName}" | ` : ''}
                {selectedTemplateName ? `Template: "${selectedTemplateName}" | ` : ''}
                {datePreset !== 'all' ? `Period: ${datePreset.replace(/_/g, ' ')}` : ''}
                {datePreset === 'custom' && startDate ? ` (from ${startDate} to ${endDate || 'now'})` : ''}
              </span>
            </div>
          )}

          <div className="analytics-grid">
            <div className="stat-card">
              <div className="stat-icon templates">
                <FileText size={24} />
              </div>
              <div className="stat-content">
                <h3>Templates</h3>
                <p className="stat-number">{analytics?.totalMessageTemplates || 0}</p>
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
              <div className="stat-icon groups">
                <Layers size={24} />
              </div>
              <div className="stat-content">
                <h3>Audience Groups</h3>
                <p className="stat-number">{analytics?.totalGroups || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon broadcasts">
                <Radio size={24} />
              </div>
              <div className="stat-content">
                <h3>Broadcasts</h3>
                <p className="stat-number">{analytics?.totalBroadcasts || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon messages">
                <MessageSquare size={24} />
              </div>
              <div className="stat-content">
                <h3>{getPeriodLabel()}</h3>
                <p className="stat-number">
                  {datePreset !== 'all'
                    ? analytics?.periodMessages || 0
                    : analytics?.totalMessages || 0}
                </p>
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
                <h3>Successfully Dispatched</h3>
                <p className="stat-number">{analytics?.successfulDeliveries || 0}</p>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  Accepted by Meta (Sent + Delivered + Read)
                </span>
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
              <div className="stat-icon rate">
                <BarChart3 size={24} />
              </div>
              <div className="stat-content">
                <h3>Delivery Rate</h3>
                <p className="stat-number">{analytics?.deliveryRate || 0}%</p>
              </div>
            </div>
          </div>

          {/* Delivery Status Breakdown Bar */}
          {analytics?.messagesByStatus && (
            <div className="status-breakdown-card">
              <div className="breakdown-header">
                <h3>Status Breakdown</h3>
                <span className="breakdown-total">
                  Total in view: {(analytics?.periodMessages != null && datePreset !== 'all') ? analytics.periodMessages : (analytics?.totalMessages || 0)} messages
                </span>
              </div>
              <div className="breakdown-bar">
                <div
                  className="bar-segment read"
                  style={{
                    width: `${
                      analytics.totalMessages > 0
                        ? ((analytics.messagesByStatus.read || 0) / (analytics.periodMessages || analytics.totalMessages)) * 100
                        : 0
                    }%`,
                  }}
                  title={`Read: ${analytics.messagesByStatus.read || 0}`}
                />
                <div
                  className="bar-segment delivered"
                  style={{
                    width: `${
                      analytics.totalMessages > 0
                        ? ((analytics.messagesByStatus.delivered || 0) / (analytics.periodMessages || analytics.totalMessages)) * 100
                        : 0
                    }%`,
                  }}
                  title={`Delivered: ${analytics.messagesByStatus.delivered || 0}`}
                />
                <div
                  className="bar-segment sent"
                  style={{
                    width: `${
                      analytics.totalMessages > 0
                        ? ((analytics.messagesByStatus.sent || 0) / (analytics.periodMessages || analytics.totalMessages)) * 100
                        : 0
                    }%`,
                  }}
                  title={`Sent: ${analytics.messagesByStatus.sent || 0}`}
                />
                <div
                  className="bar-segment failed"
                  style={{
                    width: `${
                      analytics.totalMessages > 0
                        ? ((analytics.messagesByStatus.failed || 0) / (analytics.periodMessages || analytics.totalMessages)) * 100
                        : 0
                    }%`,
                  }}
                  title={`Failed: ${analytics.messagesByStatus.failed || 0}`}
                />
              </div>
              <div className="breakdown-legend">
                <div className="legend-item">
                  <span className="dot read"></span>
                  <span>Read: {analytics.messagesByStatus.read || 0}</span>
                </div>
                <div className="legend-item">
                  <span className="dot delivered"></span>
                  <span>Delivered: {analytics.messagesByStatus.delivered || 0}</span>
                </div>
                <div className="legend-item">
                  <span className="dot sent"></span>
                  <span>Sent: {analytics.messagesByStatus.sent || 0}</span>
                </div>
                <div className="legend-item">
                  <span className="dot failed"></span>
                  <span>Failed: {analytics.messagesByStatus.failed || 0}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;