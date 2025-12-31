import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, X, Tag, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { contactAPI } from '../api/contact';
import { useToast } from '../contexts/ToastContext';
import '../styles/Contact.css';

export default function Contact() {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    tags: [],
    notes: ''
  });
  const [showDeliveryFilter, setShowDeliveryFilter] = useState('all');
  const [deliveryStats, setDeliveryStats] = useState({ delivered: 0, failed: 0, pending: 0 });
  const [tagInput, setTagInput] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    loadContacts();
    loadDeliveryStats();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await contactAPI.getAll();
      setContacts(response.data);
    } catch (error) {
      showToast('Failed to load contacts', 'error');
    }
  };

  const loadDeliveryStats = async () => {
    try {
      const response = await contactAPI.getDeliveryStats();
      setDeliveryStats(response.data);
    } catch (error) {
      console.error('Failed to load delivery stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await contactAPI.update(editingContact.id, formData);
        showToast('Contact updated successfully', 'success');
      } else {
        await contactAPI.create(formData);
        showToast('Contact created successfully', 'success');
      }
      loadContacts();
      closeModal();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to save contact', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      try {
        await contactAPI.delete(id);
        showToast('Contact deleted successfully', 'success');
        loadContacts();
      } catch (error) {
        showToast('Failed to delete contact', 'error');
      }
    }
  };

  const openModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        phone: contact.phone,
        email: contact.email || '',
        company: contact.company || '',
        tags: contact.tags || [],
        notes: contact.notes || ''
      });
    } else {
      setEditingContact(null);
      setFormData({ name: '', phone: '', email: '', company: '', tags: [], notes: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingContact(null);
    setFormData({ name: '', phone: '', email: '', company: '', tags: [], notes: '' });
    setTagInput('');
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (showDeliveryFilter === 'all') return matchesSearch;
    if (showDeliveryFilter === 'delivered') return matchesSearch && contact.lastDeliveryStatus === 'delivered';
    if (showDeliveryFilter === 'failed') return matchesSearch && contact.lastDeliveryStatus === 'failed';
    if (showDeliveryFilter === 'pending') return matchesSearch && contact.lastDeliveryStatus === 'pending';
    return matchesSearch;
  });

  const getDeliveryStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={16} className="status-delivered" />;
      case 'failed': return <XCircle size={16} className="status-failed" />;
      case 'pending': return <Clock size={16} className="status-pending" />;
      default: return null;
    }
  };

  return (
    <div className="contact-container">
      <div className="contact-header">
        <div className="header-left">
          <Users size={24} />
          <h2>Contact Management</h2>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={18} />
          Add Contact
        </button>
      </div>

      <div className="filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="delivery-stats">
          <div className="stat-item delivered">
            <CheckCircle size={16} />
            <span>{deliveryStats.delivered} Delivered</span>
          </div>
          <div className="stat-item failed">
            <XCircle size={16} />
            <span>{deliveryStats.failed} Failed</span>
          </div>
          <div className="stat-item pending">
            <Clock size={16} />
            <span>{deliveryStats.pending} Pending</span>
          </div>
        </div>
        
        <div className="delivery-filter">
          <select 
            value={showDeliveryFilter} 
            onChange={(e) => setShowDeliveryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Contacts</option>
            <option value="delivered">Delivered Messages</option>
            <option value="failed">Failed Messages</option>
            <option value="pending">Pending Messages</option>
          </select>
        </div>
      </div>

      <div className="contacts-grid">
        {filteredContacts.map(contact => (
          <div key={contact.id} className="contact-card">
            <div className="contact-avatar">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div className="contact-info">
              <h3>{contact.name}</h3>
              <p className="phone">{contact.phone}</p>
              {contact.email && <p className="email">{contact.email}</p>}
              {contact.company && <p className="company">{contact.company}</p>}
              {contact.tags?.length > 0 && (
                <div className="tags">
                  {contact.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              {contact.lastDeliveryStatus && (
                <div className="delivery-info">
                  <div className="delivery-status">
                    {getDeliveryStatusIcon(contact.lastDeliveryStatus)}
                    <span className={`status-text ${contact.lastDeliveryStatus}`}>
                      {contact.lastDeliveryStatus.charAt(0).toUpperCase() + contact.lastDeliveryStatus.slice(1)}
                    </span>
                  </div>
                  {contact.lastCampaignName && (
                    <div className="campaign-info">
                      <MessageSquare size={14} />
                      <span>{contact.lastCampaignName}</span>
                    </div>
                  )}
                  {contact.lastDeliveryTime && (
                    <div className="delivery-time">
                      {new Date(contact.lastDeliveryTime).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="contact-actions">
              <button onClick={() => openModal(contact)} className="btn-icon" title="Edit Contact">
                <Edit2 size={16} />
              </button>
              <button onClick={() => handleDelete(contact.id)} className="btn-icon btn-danger" title="Delete Contact">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="empty-state">
          <Users size={48} />
          <p>No contacts found</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingContact ? 'Edit Contact' : 'Add New Contact'}</h3>
              <button onClick={closeModal} className="btn-close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Tags</label>
                <div className="tag-input-container">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag and press Enter"
                  />
                  <button type="button" onClick={addTag} className="btn-add-tag">
                    <Tag size={16} />
                  </button>
                </div>
                <div className="tags-list">
                  {formData.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingContact ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
