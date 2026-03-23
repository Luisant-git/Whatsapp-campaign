import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, MapPin, Building, Search, Filter, Download, Eye, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { getFlowAppointments, deleteFlowAppointment } from '../api/flowAppointments';
import '../styles/FlowAppointments.css';

const FlowAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const { showToast } = useToast();
  const [fromDate, setFromDate] = useState('');  //date filter for export 
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await getFlowAppointments();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      showToast('Failed to load appointments', 'error');
      // Mock data for development
      setAppointments([
        {
          id: 1,
          department: 'sales',
          location: 'new_york',
          date: '2026-03-17',
          time: '11:30',
          name: 'Ragul V',
          email: 'ragul@example.com',
          phone: '09360999351',
          moreDetails: null,
          createdAt: new Date().toISOString(),
          status: 'confirmed'
        },
        {
          id: 2,
          department: 'support',
          location: 'london',
          date: '2026-03-18',
          time: '14:30',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          moreDetails: 'Need help with integration',
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await deleteFlowAppointment(id);
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      showToast('Appointment deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      showToast('Failed to delete appointment', 'error');
    }
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetails(true);
  };

  const clearDateFilters = () => {
    setFromDate('');
    setToDate('');
  };

  const exportAppointments = () => {
    if (filteredAppointments.length === 0) {
      showToast('No appointments to export', 'error');
      return;
    }
    const csvContent = [
      ['Name', 'Phone', 'Service', 'Date', 'Time', 'Business Info', 'Status', 'Created At'],
      ...filteredAppointments.map(apt => [
        `"${apt.name || ''}"`,
        `"${apt.phone || apt.email || ''}"`,
        `"${formatDepartment(apt.department) || ''}"`,
        `"${apt.date || ''}"`,
        `"${apt.time || ''}"`,
        `"${(apt.moreDetails || '').replace(/"/g, '""')}"`,
        `"${apt.status || 'confirmed'}"`,
        `"${apt.createdAt ? new Date(apt.createdAt).toLocaleDateString() : ''}"`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-business-appointments-${fromDate || 'all'}-to-${toDate || 'all'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.phone?.includes(searchTerm) ||
      appointment.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || appointment.status === filterStatus;
    const appointmentDate = appointment.date;
    const matchesFromDate = fromDate ? appointmentDate >= fromDate : true;
    const matchesToDate = toDate ? appointmentDate <= toDate : true;
    
    return matchesSearch && matchesFilter && matchesFromDate && matchesToDate;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'status-confirmed';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-confirmed';
    }
  };

  const formatDepartment = (dept) => {
    const deptMap = {
      'all': 'All',
      'whatsapp_marketing': 'WhatsApp Marketing',
      'whatsapp_ecommerce': 'WhatsApp Ecommerce',
      'ai_chatbot': 'AI Chat Bot',
      'sales': 'Sales',
      'support': 'Support',
      'technical': 'Technical',
      'billing': 'Billing',
      'hr': 'HR'
    };
    return deptMap[dept] || dept;
  };

  const formatLocation = (loc) => {
    const locMap = {
      'meta': 'Meta (WhatsApp Official)',
      'partner': 'WhatsApp Business Partner',
      'independent': 'Independent Consultant',
      'new_york': 'New York Office',
      'london': 'London Office',
      'singapore': 'Singapore Office',
      'mumbai': 'Mumbai Office',
      'remote': 'Remote/Online'
    };
    return locMap[loc] || loc;
  };

  if (loading) {
    return (
      <div className="flow-loading-container">
        <div className="flow-loading-spinner"></div>
        <span>Loading appointments...</span>
      </div>
    );
  }

  return (
    <div className="flow-appointments-container">
      <div className="flow-appointments-header">
        <div className="header-left">
          <h2>WhatsApp Business Appointments</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Manage demo requests and service inquiries</p>
        </div>
        {/* <button className="flow-export-btn" onClick={exportAppointments}>
          <Download size={18} /> Export Report
        </button> */}
      </div>

      {/* Stats Cards */}
      <div className="flow-stats-grid">
        <div className="flow-stat-card">
          <div className="flow-stat-icon total">
            <Calendar size={24} />
          </div>
          <div className="flow-stat-content">
            <h3>Total</h3>
            <p className="flow-stat-number">{appointments.length}</p>
          </div>
        </div>
        
        <div className="flow-stat-card">
          <div className="flow-stat-icon confirmed">
            <Clock size={24} />
          </div>
          <div className="flow-stat-content">
            <h3>Confirmed</h3>
            <p className="flow-stat-number">
              {appointments.filter(apt => apt.status === 'confirmed' || !apt.status).length}
            </p>
          </div>
        </div>
        
        <div className="flow-stat-card">
          <div className="flow-stat-icon pending">
            <User size={24} />
          </div>
          <div className="flow-stat-content">
            <h3>Pending</h3>
            <p className="flow-stat-number">
              {appointments.filter(apt => apt.status === 'pending').length}
            </p>
          </div>
        </div>
        
        <div className="flow-stat-card">
          <div className="flow-stat-icon today">
            <Calendar size={24} />
          </div>
          <div className="flow-stat-content">
            <h3>Today</h3>
            <p className="flow-stat-number">
              {appointments.filter(apt => apt.date === new Date().toISOString().split('T')[0]).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div
  className="flow-filters-section"
  style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%' }}
>
  <div className="flow-search-container" style={{ minWidth: '220px', flex: '1' }}>
    <Search className="flow-search-icon" size={18} />
    <input
      type="text"
      placeholder="Search appointments..."
      className="flow-search-input"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>

  <select
    className="flow-filter-select"
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value)}
    style={{ minWidth: '170px' }}
  >
    <option value="all">All Status ({appointments.length})</option>
    <option value="confirmed">
      Confirmed ({appointments.filter(apt => apt.status === 'confirmed' || !apt.status).length})
    </option>
    <option value="pending">
      Pending ({appointments.filter(apt => apt.status === 'pending').length})
    </option>
    <option value="cancelled">
      Cancelled ({appointments.filter(apt => apt.status === 'cancelled').length})
    </option>
  </select>

  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <label style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
      From:
    </label>
    <input
      type="date"
      className="flow-filter-select"
      value={fromDate}
      onChange={(e) => setFromDate(e.target.value)}
      style={{ minWidth: '150px' }}
    />
  </div>

  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <label style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
      To:
    </label>
    <input
      type="date"
      className="flow-filter-select"
      value={toDate}
      onChange={(e) => setToDate(e.target.value)}
      style={{ minWidth: '150px' }}
    />
  </div>

  <button
    className="flow-export-btn"
    onClick={exportAppointments}
    style={{ height: '40px', padding: '0 14px' }}
  >
    <Download size={18} /> Export
  </button>

  <button
    type="button"
    className="flow-export-btn"
    onClick={clearDateFilters}
    style={{ height: '40px', padding: '0 14px' }}
  >
    Clear
  </button>

  <div className="flow-total-count" style={{ whiteSpace: 'nowrap' }}>
    Showing: {filteredAppointments.length} Appointment{filteredAppointments.length !== 1 ? 's' : ''}
  </div>
</div>

      {/* Appointments Table */}
      <div className="flow-table-container">
        <table className="flow-appointments-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th style={{ minWidth: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan="6" className="flow-empty-state">
                  <Calendar className="flow-empty-icon" />
                  <p className="flow-empty-title">No appointments found</p>
                  <p className="flow-empty-subtitle">Appointments booked through WhatsApp Flows will appear here</p>
                </td>
              </tr>
            ) : (
              filteredAppointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{appointment.name}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                      {appointment.phone || appointment.email}
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {formatDepartment(appointment.department)}
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {appointment.date}
                  </td>
                  <td style={{ fontSize: '13px', fontWeight: 500 }}>
                    {appointment.time}
                  </td>
                  <td>
                    <span className={`flow-status-badge flow-status-${appointment.status || 'confirmed'}`}>
                      {appointment.status || 'confirmed'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="flow-action-btn view"
                        onClick={() => handleViewDetails(appointment)}
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="flow-action-btn delete"
                        onClick={() => handleDeleteAppointment(appointment.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {showDetails && selectedAppointment && (
        <div className="flow-modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="flow-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flow-modal-header">
              <h3>Appointment Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="flow-modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="flow-modal-body">
              <div className="flow-detail-item">
                <label className="flow-detail-label">Customer Name</label>
                <p className="flow-detail-value">{selectedAppointment.name}</p>
              </div>
              
              <div className="flow-detail-item">
                <label className="flow-detail-label">Mobile Number</label>
                <p className="flow-detail-value">{selectedAppointment.phone || selectedAppointment.email}</p>
              </div>
              
              <div className="flow-detail-item">
                <label className="flow-detail-label">Service Requested</label>
                <p className="flow-detail-value">{formatDepartment(selectedAppointment.department)}</p>
              </div>
              
              <div className="flow-detail-item">
                <label className="flow-detail-label">Appointment Date & Time</label>
                <p className="flow-detail-value">{selectedAppointment.date} at {selectedAppointment.time}</p>
              </div>
              
              {selectedAppointment.moreDetails && (
                <div className="flow-detail-item">
                  <label className="flow-detail-label">Business Information</label>
                  <p className="flow-detail-value" style={{ whiteSpace: 'pre-line' }}>
                    {selectedAppointment.moreDetails.split(',').join('\n')}
                  </p>
                </div>
              )}
              
              <div className="flow-detail-item">
                <label className="flow-detail-label">Booked On</label>
                <p className="flow-detail-value">
                  {new Date(selectedAppointment.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="flow-modal-footer">
              <button
                onClick={() => setShowDetails(false)}
                className="flow-modal-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowAppointments;