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

  const exportAppointments = () => {
    const csvContent = [
      ['Name', 'Phone', 'Service', 'Company', 'Date', 'Time', 'Business Info', 'Status', 'Created At'],
      ...filteredAppointments.map(apt => [
        apt.name,
        apt.phone || apt.email,
        formatDepartment(apt.department),
        formatLocation(apt.location),
        apt.date,
        apt.time,
        apt.moreDetails || '',
        apt.status || 'confirmed',
        new Date(apt.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-business-appointments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.phone.includes(searchTerm) ||
      appointment.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || appointment.status === filterStatus;
    
    return matchesSearch && matchesFilter;
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
        <button className="flow-export-btn" onClick={exportAppointments}>
          <Download size={18} /> Export Report
        </button>
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
      <div className="flow-filters-section">
        <div className="flow-search-container">
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
        >
          <option value="all">All Status ({appointments.length})</option>
          <option value="confirmed">Confirmed ({appointments.filter(apt => apt.status === 'confirmed' || !apt.status).length})</option>
          <option value="pending">Pending ({appointments.filter(apt => apt.status === 'pending').length})</option>
          <option value="cancelled">Cancelled ({appointments.filter(apt => apt.status === 'cancelled').length})</option>
        </select>
        
        <div className="flow-total-count">
          Showing: {filteredAppointments.length} Appointment{filteredAppointments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="flow-table-container">
        <table className="flow-appointments-table">
          <thead>
            <tr>
              <th style={{ width: '200px' }}>Customer</th>
              <th style={{ width: '180px' }}>Service</th>
              <th style={{ width: '200px' }}>Company</th>
              <th style={{ width: '250px' }}>Business Details</th>
              <th style={{ width: '150px' }}>Date & Time</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan="7" className="flow-empty-state">
                  <Calendar className="flow-empty-icon" />
                  <p className="flow-empty-title">No appointments found</p>
                  <p className="flow-empty-subtitle">Appointments booked through WhatsApp Flows will appear here</p>
                </td>
              </tr>
            ) : (
              filteredAppointments.map((appointment) => {
                // Parse moreDetails
                const businessInfo = {};
                if (appointment.moreDetails) {
                  const parts = appointment.moreDetails.split(',');
                  parts.forEach(part => {
                    const [key, value] = part.split(':').map(s => s.trim());
                    if (key && value) {
                      businessInfo[key] = value;
                    }
                  });
                }
                
                return (
                  <tr key={appointment.id}>
                    <td>
                      <div className="flow-customer-info">
                        <div className="flow-customer-name" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                          {appointment.name}
                        </div>
                        <div className="flow-customer-detail" style={{ fontSize: '13px', color: '#6b7280' }}>
                          <Phone size={12} style={{ marginRight: '4px' }} />
                          {appointment.phone || appointment.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flow-department-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{formatDepartment(appointment.department)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flow-location-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{formatLocation(appointment.location)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flow-business-info" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                        {businessInfo.Place && (
                          <div style={{ marginBottom: '2px' }}>
                            <strong style={{ color: '#374151' }}>Place:</strong> <span style={{ color: '#6b7280' }}>{businessInfo.Place}</span>
                          </div>
                        )}
                        {businessInfo.Business && (
                          <div style={{ marginBottom: '2px' }}>
                            <strong style={{ color: '#374151' }}>Business:</strong> <span style={{ color: '#6b7280' }}>{businessInfo.Business}</span>
                          </div>
                        )}
                        {businessInfo.Type && (
                          <div style={{ marginBottom: '2px' }}>
                            <strong style={{ color: '#374151' }}>Type:</strong> <span style={{ color: '#6b7280' }}>{businessInfo.Type}</span>
                          </div>
                        )}
                        {businessInfo.Size && (
                          <div>
                            <strong style={{ color: '#374151' }}>Size:</strong> <span style={{ color: '#6b7280' }}>{businessInfo.Size}</span>
                          </div>
                        )}
                        {!appointment.moreDetails && (
                          <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No details</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flow-datetime-info">
                        <div className="flow-date-text" style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>
                          {appointment.date}
                        </div>
                        <div className="flow-time-text" style={{ fontSize: '12px', color: '#6b7280' }}>
                          {appointment.time}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`flow-status-badge flow-status-${appointment.status || 'confirmed'}`}>
                        {appointment.status || 'confirmed'}
                      </span>
                    </td>
                    <td>
                      <div className="flow-actions-container" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleViewDetails(appointment)}
                          className="flow-action-btn view"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          className="flow-action-btn delete"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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
                <label className="flow-detail-label">Preferred Company</label>
                <p className="flow-detail-value">{formatLocation(selectedAppointment.location)}</p>
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