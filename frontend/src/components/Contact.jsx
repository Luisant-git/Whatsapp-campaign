import { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import { contactAPI } from '../api/contact';
import { useToast } from '../contexts/ToastContext';
import '../styles/Contact.css';

export default function Contact() {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await contactAPI.getAll();
      setContacts(response.data);
    } catch (error) {
      showToast('Failed to load contacts', 'error');
    }
  };

  const filteredContacts = contacts.filter(contact => {
    return contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery);
  });

  return (
    <div className="contact-container">
      <div className="contact-header">
        <div className="header-left">
          <Users size={24} />
          <h2>Contact Management</h2>
        </div>
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
              {contact.lastCampaignName && (
                <p className="campaign">Campaign: {contact.lastCampaignName}</p>
              )}
              {contact.lastMessageDate && (
                <p className="last-message">
                  Last message: {new Date(contact.lastMessageDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="empty-state">
          <Users size={48} />
          <p>No contacts found. Contacts are automatically added when you run campaigns.</p>
        </div>
      )}
    </div>
  );
}
