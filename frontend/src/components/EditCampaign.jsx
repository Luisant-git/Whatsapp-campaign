import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getCampaignById, updateCampaign } from '../api/campaign';
import '../styles/EditCampaign.scss';

const EditCampaign = ({ campaignId, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({});
  const [newContact, setNewContact] = useState({ phone: '', name: '' });

  useEffect(() => {
    fetchCampaignDetails();
  }, [campaignId]);

  const fetchCampaignDetails = async () => {
    setLoading(true);
    try {
      const data = await getCampaignById(campaignId);
      
      setEditData({
        name: data.name,
        templateName: data.templateName,
        contacts: data.contacts || []
      });
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      toast.error('Failed to load campaign details');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const addContact = () => {
    if (newContact.phone.trim()) {
      const contactExists = editData.contacts.some(contact => 
        (typeof contact === 'string' ? contact : contact.phone) === newContact.phone.trim()
      );
      
      if (!contactExists) {
        const newContactObj = {
          phone: newContact.phone.trim(),
          name: newContact.name.trim() || newContact.phone.trim()
        };
        
        setEditData({
          ...editData,
          contacts: [...editData.contacts, newContactObj]
        });
        setNewContact({ phone: '', name: '' });
      }
    }
  };

  const removeContact = (index) => {
    setEditData({
      ...editData,
      contacts: editData.contacts.filter((_, i) => i !== index)
    });
  };

  const handleUpdateCampaign = async () => {
    setLoading(true);
    try {
      await updateCampaign(campaignId, editData);
      toast.success('Campaign updated successfully!');
      onBack();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !editData.name) {
    return (
      <div className="edit-campaign-container">
        <div className="loading">Loading campaign details...</div>
      </div>
    );
  }

  return (
    <div className="edit-campaign-container">
      <div className="edit-campaign-header">
        <h2>Edit Campaign</h2>
        <button onClick={onBack} className="back-btn">
          ← Back to Campaigns
        </button>
      </div>

      <div className="edit-campaign-form">
        <div className="form-group">
          <label>Campaign Name</label>
          <input
            type="text"
            value={editData.name || ''}
            onChange={(e) => setEditData({...editData, name: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>Template Name</label>
          <input
            type="text"
            value={editData.templateName || ''}
            onChange={(e) => setEditData({...editData, templateName: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>Contacts ({editData.contacts?.length || 0})</label>
          <div className="contact-input">
            <input
              type="text"
              placeholder="Phone number"
              value={newContact.phone}
              onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={newContact.name}
              onChange={(e) => setNewContact({...newContact, name: e.target.value})}
              onKeyPress={(e) => e.key === 'Enter' && addContact()}
            />
            <button type="button" onClick={addContact} className="add-contact-btn">
              Add
            </button>
          </div>
          <div className="contacts-list">
            {editData.contacts?.map((contact, index) => {
              const displayContact = typeof contact === 'string' 
                ? { phone: contact, name: contact }
                : contact;
              
              return (
                <div key={index} className="contact-item">
                  <div className="contact-info">
                    <span className="contact-name">{displayContact.name}</span>
                    <span className="contact-phone">{displayContact.phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="remove-contact-btn"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="form-actions">
          <button
            onClick={handleUpdateCampaign}
            disabled={loading}
            className="update-btn"
          >
            {loading ? 'Updating...' : 'Update Campaign'}
          </button>
          <button
            onClick={onBack}
            className="cancel-btn"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCampaign;