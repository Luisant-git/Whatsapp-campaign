import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import './FlowAppointments.css';

const FlowAppointments = ({ isStandardPlan = false }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/flow-appointments`, {
        withCredentials: true
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentLabel = (dept) => {
    const labels = {
      beauty: 'Beauty',
      shopping: 'Shopping',
      consultation: 'Consultation'
    };
    return labels[dept] || dept;
  };

  const filteredAppointments = appointments.filter(appointment =>
    appointment.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    appointment.phone?.includes(searchQuery) ||
    appointment.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getDepartmentLabel(appointment.department)?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="appointments-container"><div style={{textAlign: 'center', padding: '50px'}}>Loading...</div></div>;
  }

  return (
    <div className="appointments-container">
      <div className="page-header">
        <h2>{isStandardPlan ? 'Standard Plan' : 'Flow Appointments'}</h2>
        <p>{isStandardPlan ? 'Standard Plan appointments from WhatsApp flows' : 'Manage appointments from WhatsApp flows'}</p>
      </div>

      <div className="table-container">
        <table className="contacts-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Date</th>
              <th>Time</th>
              <th>Location</th>
              <th>Details</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.id}>
                <td>
                  <span className="status-badge active">
                    {getDepartmentLabel(appointment.department)}
                  </span>
                </td>
                <td style={{fontWeight: 500}}>{appointment.name}</td>
                <td>{appointment.phone}</td>
                <td style={{fontSize: '13px'}}>{appointment.email}</td>
                <td style={{fontWeight: 500}}>{appointment.date}</td>
                <td>{appointment.time}</td>
                <td>Location {appointment.location}</td>
                <td style={{fontSize: '13px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                  {appointment.moreDetails || 'N/A'}
                </td>
                <td>{new Date(appointment.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FlowAppointments;
