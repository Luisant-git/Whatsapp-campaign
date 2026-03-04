import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, User, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { API_BASE_URL } from '../api/config';
import './FlowAppointments.css';

const FlowAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="appointments-container">
      <div className="page-header">
        <div>
          <h1 className="appointments-title">Flow Appointments</h1>
          <p className="page-subtitle">Manage appointments from WhatsApp flows</p>
        </div>
      </div>
      
      <div className="appointments-wrapper">
        {appointments.length === 0 ? (
          <div className="no-appointments">
            <p>No appointments found</p>
          </div>
        ) : (
          <div className="appointments-grid">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="appointment-card">
                <div className="card-header">
                  <span className="department-badge">
                    {getDepartmentLabel(appointment.department)}
                  </span>
                  <span className="date-created">
                    {new Date(appointment.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="card-content">
                  <div className="info-row">
                    <User className="icon" />
                    <span className="name">{appointment.name}</span>
                  </div>

                  <div className="info-row">
                    <Phone className="icon" />
                    <span>{appointment.phone}</span>
                  </div>

                  <div className="info-row">
                    <Mail className="icon" />
                    <span className="email">{appointment.email}</span>
                  </div>

                  <div className="info-row">
                    <Calendar className="icon" />
                    <span>{appointment.date}</span>
                  </div>

                  <div className="info-row">
                    <Clock className="icon" />
                    <span>{appointment.time}</span>
                  </div>

                  <div className="info-row">
                    <MapPin className="icon" />
                    <span>Location {appointment.location}</span>
                  </div>

                  {appointment.moreDetails && (
                    <div className="info-row details">
                      <FileText className="icon" />
                      <span>{appointment.moreDetails}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowAppointments;
