import React, { useState, useEffect } from 'react';
import { getProfile } from '../api/auth';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const Profile = () => {
  const { showSuccess, showError } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data?.user);
      setEditName(data?.user?.name || '');
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditName = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3010'}/user/update-name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editName }),
      });
      if (response.ok) {
        showSuccess('Name updated successfully!');
        setShowEditModal(false);
        fetchProfile();
      } else {
        showError('Failed to update name');
      }
    } catch (error) {
      showError('Error updating name');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your account information</p>
      </div>

      <div className="profile-content">
        <div className="profile-user-section">
          <div className="profile-user-info">
            <div className="profile-avatar">
              <User size={28} />
            </div>
            <div className="profile-user-details">
              <h2>{profile?.name || 'User'}</h2>
              <span className="profile-badge">{profile?.Role || 'Admin'}</span>
            </div>
          </div>
          <button className="edit-profile-btn" onClick={() => setShowEditModal(true)}>
            <span>✏️</span> Edit
          </button>
        </div>

        <div className="profile-info-list">
          <div className="profile-info-item">
            <div className="profile-info-icon">
              <Mail size={20} />
            </div>
            <div className="profile-info-text">
              <label>Email Address</label>
              <p>{profile?.email || 'Not provided'}</p>
            </div>
          </div>

          <div className="profile-info-item">
            <div className="profile-info-icon">
              <Shield size={20} />
            </div>
            <div className="profile-info-text">
              <label>Role</label>
              <p>{profile?.Role || 'Admin'}</p>
            </div>
          </div>

          <div className="profile-info-item">
            <div className="profile-info-icon">
              <Calendar size={20} />
            </div>
            <div className="profile-info-text">
              <label>Member Since</label>
              <p>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}</p>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditName} className="settings-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  placeholder="Enter your name"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;