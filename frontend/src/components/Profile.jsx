import React, { useState, useEffect } from 'react';
import { getProfile } from '../api/auth';
import { User, Mail, Shield, Calendar } from 'lucide-react';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data?.user);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
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
          <button className="edit-profile-btn">
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
    </div>
  );
};

export default Profile;