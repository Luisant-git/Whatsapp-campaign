import React, { useState, useEffect } from 'react';
import { getProfile } from '../api/auth';
import { User, Mail, Shield, Calendar, Edit } from 'lucide-react';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
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
        <div className="profile-card">
          <div className="profile-avatar">
            <User size={48} />
          </div>
          <div className="profile-info">
            <h2>{profile?.name || 'User'}</h2>
            <p className="profile-role">{profile?.Role || 'Admin'}</p>
          </div>
          <button className="edit-btn">
            <Edit size={16} />
            Edit
          </button>
        </div>

        <div className="profile-details">
          <div className="detail-card">
            <div className="detail-icon">
              <Mail size={24} />
            </div>
            <div className="detail-info">
              <h3>Email Address</h3>
              <p>{profile?.email || 'Not provided'}</p>
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-icon">
              <Shield size={24} />
            </div>
            <div className="detail-info">
              <h3>Role</h3>
              <p>{profile?.Role || 'Admin'}</p>
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-icon">
              <Calendar size={24} />
            </div>
            <div className="detail-info">
              <h3>Member Since</h3>
              <p>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;