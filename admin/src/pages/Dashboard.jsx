import { useEffect, useState } from 'react';
import {
  MdPeople,
  MdCheckCircle,
  MdHighlightOff,
  MdHourglassBottom,
  MdCalendarToday,
  MdSearch,
  MdContacts,
  MdPeopleAlt,
  MdSubscriptions,
  MdShowChart,
  MdSmsFailed,
  MdMarkEmailRead,
  MdSms,
  MdPersonOff,
  MdHowToReg,
} from 'react-icons/md';

import '../styles/Dashboard.css';
import {
  getAdminAnalytics,
  getTenantSubscriptionAnalytics,
} from '../api/adminAnalytics';

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    async function load() {
      try {
        // 🔹 Call both APIs in parallel
        const [messageAnalytics, subscriptionAnalytics] =
          await Promise.all([
            getAdminAnalytics(),
            getTenantSubscriptionAnalytics(),
          ]);

        // 🔹 Merge both responses
        setAnalytics({
          ...messageAnalytics,
          ...subscriptionAnalytics,
        });
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);


  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  if (loading) {
    return <div className="dashboard">Loading dashboard...</div>;
  }

  if (!analytics) {
    return <div className="dashboard">Failed to load dashboard data.</div>;
  }

  // =============================
  // STATS SECTION
  // =============================
  const stats = [
    {
      label: 'Total Companies',
      value: analytics.totalTenants ?? 0,
      icon: MdPeopleAlt,
      color: '#0ea5e9',
    },
    {
      label: 'Active Companies',
      value: analytics.activeTenants ?? 0,
      icon: MdHowToReg,
      color: '#22c55e',
    },
    {
      label: 'Inactive Companies',
      // safer: handle undefined totals/actives
      value:
        (analytics.totalTenants ?? 0) - (analytics.activeTenants ?? 0),
      icon: MdPersonOff,
      color: '#ef4444',
    },
    {
      label: 'Active Subscriptions',
      value: analytics.activeTenants ?? 0,
      icon: MdSubscriptions,
      color: '#22c55e',
    },
    {
      label: 'Total Contacts',
      value: analytics.totalContacts ?? 0,
      icon: MdContacts,
      color: '#7c3aed',
    },
    {
      label: 'Total Messages',
      value: analytics.totalMessages ?? 0,
      icon: MdSms,
      color: '#2563eb',
    },
    {
      label: 'Successful Deliveries',
      value: analytics.successfulDeliveries ?? 0,
      icon: MdMarkEmailRead,
      color: '#10b981',
    },
    {
      label: 'Failed Messages',
      value: analytics.failedMessages ?? 0,
      icon: MdSmsFailed,
      color: '#ef4444',
    },
    {
      label: 'Delivery Rate (%)',
      value: `${analytics.deliveryRate ?? 0}%`,
      icon: MdShowChart,
      color: '#f59e0b',
    },

  ];


  const getComputedStatus = (company) => {
    if (company.isActive === false) {
      return { label: 'Inactive', daysText: '' };
    }

    if (company.daysLeft < 0) {
      return { label: 'Expired', daysText: '' };
    }

    if (company.daysLeft <= 2) {
      return {
        label: 'Critical',
        daysText: `(${company.daysLeft} days left)`,
      };
    }

    if (company.daysLeft <= 7) {
      return {
        label: 'Expiring Soon',
        daysText: `(${company.daysLeft} days left)`,
      };
    }

    return {
      label: 'Active',
      daysText: `(${company.daysLeft} days left)`,
    };
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Active':
        return 'status-pill--active';
      case 'Inactive':
        return 'status-pill--inactive';
      case 'Expiring Soon':
        return 'status-pill--warning';
      case 'Critical':
        return 'status-pill--critical';
      case 'Expired':
        return 'status-pill--expired';
      default:
        return 'status-pill--default';
    }
  };

  // =============================
  // EXPIRING SOON SECTION
  // =============================

  const subscriptionList = analytics.expiringSoonList || [];
  const filteredList = subscriptionList.filter((company) =>
    company.companyName
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const totalPages =
    Math.ceil(filteredList.length / itemsPerPage) || 1;

  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="dashboard">
      {/* HEADER */}
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div
                className="stat-icon"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <Icon size={24} color={stat.color} />
              </div>
              <div className="stat-info">
                <p className="stat-label">{stat.label}</p>
                <h3 className="stat-value">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* EXPIRING SOON TABLE */}
      <div className="content-card expiring-card">
        <div className="expiring-header">
          <div>
            <h2>Expiring Soon</h2>
            <p className="expiring-subtitle">
              Companies whose plans will expire soon.
            </p>
          </div>

          <div className="expiring-search">
            <MdSearch size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="expiring-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Current Plan</th>
                <th>Expiry Date</th>
                <th>Status</th>

              </tr>
            </thead>
            <tbody>
              {paginatedList.map((company) => {
                const statusData = getComputedStatus(company);

                return (
                  <tr key={company.id}>
                    <td>
                      <div className="company-name">
                        {company.companyName}
                      </div>
                      <div className="company-id">
                        ID: {company.id}
                      </div>
                    </td>

                    <td>{company.currentPlan}</td>

                    <td>
                      <MdCalendarToday size={14} />{' '}
                      {new Date(company.expiryDate).toLocaleDateString()}
                    </td>

                    <td>
                      <span
                        className={`status-pill ${getStatusClass(statusData.label)}`}
                      >
                        <span className="status-dot" />
                        {statusData.label} {statusData.daysText}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {paginatedList.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }}>
                    No companies found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((prev) => Math.max(prev - 1, 1))
              }
            >
              Prev
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(prev + 1, totalPages)
                )
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}