import { useState, useEffect } from 'react';
import { Users, Search, ChevronLeft, ChevronRight, Plus, Upload, X, Edit2, Trash2 } from 'lucide-react';
import { contactAPI } from '../api/contact';
import { useToast } from '../contexts/ToastContext';
import * as XLSX from 'xlsx';
import '../styles/Contact.css';

export default function Contact() {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', group: '' });
  const { showToast } = useToast();
  const limit = 10;

  useEffect(() => {
    loadContacts();
  }, [page, searchQuery]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const response = await contactAPI.getAll(page, limit, searchQuery);
      const result = response.data;
      setContacts(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      showToast('Failed to load contacts', 'error');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleAddContact = () => {
    setFormData({ name: '', phone: '', group: '' });
    setEditingContact(null);
    setShowAddModal(true);
  };

  const handleEditContact = (contact) => {
    setFormData({ name: contact.name, phone: contact.phone, group: contact.group || '' });
    setEditingContact(contact);
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      showToast('Name and phone are required', 'error');
      return;
    }

    // Validate phone number is exactly 10 digits
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      showToast('Phone number must be exactly 10 digits', 'error');
      return;
    }

    const dataToSubmit = {
      name: formData.name,
      phone: cleanPhone,
      group: formData.group || ''
    };

    try {
      if (editingContact) {
        await contactAPI.update(editingContact.id, dataToSubmit);
        showToast('Contact updated successfully', 'success');
      } else {
        await contactAPI.create(dataToSubmit);
        showToast('Contact added successfully', 'success');
      }
      
      // Close modal and reset form
      setShowAddModal(false);
      setEditingContact(null);
      setFormData({ name: '', phone: '', group: '' });
      await loadContacts();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to save contact';
      showToast(errorMsg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      await contactAPI.delete(id);
      showToast('Contact deleted successfully', 'success');
      loadContacts();
    } catch (error) {
      showToast('Failed to delete contact', 'error');
    }
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    // Check if it's an Excel file
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          if (jsonData.length === 0) {
            showToast('Excel file is empty', 'error');
            return;
          }

          let successCount = 0;
          let failCount = 0;
          const errors = [];

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Try to find name field with various possible column names
            const name = row.Name || row.name || row.NAME || row['Name'] || row['name'] || 
                        Object.keys(row).find(k => k.toLowerCase().includes('name')) && 
                        row[Object.keys(row).find(k => k.toLowerCase().includes('name'))];
            
            // Try to find phone field with various possible column names
            const phoneRaw = row.Phone || row.phone || row.PHONE || row['Phone'] || row['phone'] ||
                            Object.keys(row).find(k => k.toLowerCase().includes('phone')) && 
                            row[Object.keys(row).find(k => k.toLowerCase().includes('phone'))];
            
            // Try to find group field
            const group = row.Group || row.group || row.GROUP || row['Group'] || row['group'] ||
                         (Object.keys(row).find(k => k.toLowerCase().includes('group')) && 
                         row[Object.keys(row).find(k => k.toLowerCase().includes('group'))]) || '';
            
            const phone = String(phoneRaw || '').replace(/[^0-9]/g, '');

            if (!name || !phone) {
              errors.push(`Row ${i + 2}: Missing name or phone`);
              failCount++;
              continue;
            }

            if (phone.length !== 10) {
              errors.push(`Row ${i + 2}: Phone must be 10 digits`);
              failCount++;
              continue;
            }

            try {
              await contactAPI.create({ name, phone, group });
              successCount++;
            } catch (error) {
              errors.push(`Row ${i + 2}: ${error.response?.data?.message || 'Failed'}`);
              failCount++;
            }
          }

          if (errors.length > 0 && errors.length <= 5) {
            showToast(`Imported ${successCount} contacts. Failed: ${failCount}. ${errors.join(', ')}`, errors.length === failCount ? 'error' : 'success');
          } else if (errors.length > 5) {
            showToast(`Imported ${successCount} contacts. Failed: ${failCount}`, 'success');
          } else {
            showToast(`Imported ${successCount} contacts successfully!`, 'success');
          }

          setShowBulkModal(false);
          loadContacts();
        } catch (error) {
          showToast('Failed to parse Excel file', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV file handling
      reader.onload = async (event) => {
        try {
          const text = event.target.result;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            showToast('File must have headers and at least one contact', 'error');
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const nameIndex = headers.findIndex(h => h.includes('name'));
          const phoneIndex = headers.findIndex(h => h.includes('phone'));
          const groupIndex = headers.findIndex(h => h.includes('group'));

          if (nameIndex === -1 || phoneIndex === -1) {
            showToast('File must have Name and Phone columns', 'error');
            return;
          }

          let successCount = 0;
          let failCount = 0;
          const errors = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const phone = values[phoneIndex]?.replace(/[^0-9]/g, '');
            
            if (!phone || phone.length !== 10) {
              errors.push(`Row ${i + 1}: Phone must be 10 digits`);
              failCount++;
              continue;
            }

            const contactData = {
              name: values[nameIndex],
              phone: phone,
              group: groupIndex !== -1 ? values[groupIndex] : ''
            };

            if (contactData.name && contactData.phone) {
              try {
                await contactAPI.create(contactData);
                successCount++;
              } catch (error) {
                errors.push(`Row ${i + 1}: ${error.response?.data?.message || 'Failed'}`);
                failCount++;
              }
            } else {
              failCount++;
            }
          }

          if (errors.length > 0 && errors.length <= 5) {
            showToast(`Imported ${successCount} contacts. Failed: ${failCount}. ${errors.join(', ')}`, errors.length === failCount ? 'error' : 'success');
          } else if (errors.length > 5) {
            showToast(`Imported ${successCount} contacts. Failed: ${failCount}`, 'success');
          } else {
            showToast(`Imported ${successCount} contacts successfully!`, 'success');
          }
          
          setShowBulkModal(false);
          loadContacts();
        } catch (error) {
          showToast('Failed to parse file', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="contact-container">
      <div className="contact-header">
        <div className="header-left">
          <Users size={24} />
          <h2>Contact Management</h2>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleAddContact}>
            <Plus size={20} />
            Add Contact
          </button>
          <button className="btn-secondary" onClick={() => setShowBulkModal(true)}>
            <Upload size={20} />
            Bulk Import
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="total-count">
          Total: {total} contacts
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="contacts-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Group</th>
                  <th>Last Message</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact, index) => (
                  <tr key={contact.id}>
                    <td>{(page - 1) * limit + index + 1}</td>
                    <td>{contact.name}</td>
                    <td>{contact.phone}</td>
                    <td>{contact.group || 'N/A'}</td>
                    <td>
                      {contact.lastMessageDate 
                        ? new Date(contact.lastMessageDate).toLocaleDateString('en-GB')
                        : 'N/A'
                      }
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon" 
                          onClick={() => handleEditContact(contact)}
                          title="Edit"
                          style={{ color: '#22c55e' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        {/* <button 
                          className="btn-icon btn-danger" 
                          onClick={() => handleDelete(contact.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {contacts.length === 0 && (
            <div className="empty-state">
              <Users size={48} />
              <p>No contacts found. Add contacts manually or import from CSV.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                <ChevronLeft size={20} />
                Previous
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="pagination-btn"
              >
                Next
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Contact Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingContact ? 'Edit Contact' : 'Add New Contact'}</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
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
                  placeholder="Enter contact name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length <= 10) {
                      setFormData({ ...formData, phone: value });
                    }
                  }}
                  placeholder="Enter 10 digit phone number"
                  maxLength={10}
                  required
                  disabled={!!editingContact}
                />
                <small style={{ color: '#64748b', fontSize: '12px' }}>Enter 10 digit number (91 will be added automatically)</small>
              </div>
              <div className="form-group">
                <label>Group</label>
                <input
                  type="text"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  placeholder="Enter group name (optional)"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingContact ? 'Update' : 'Add'} Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bulk Import Contacts</h3>
              <button className="close-btn" onClick={() => setShowBulkModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="bulk-import-content">
              <p>Upload a CSV or Excel file with the following columns:</p>
              <ul>
                <li>Name (required)</li>
                <li>Phone (required)</li>
                <li>Group (optional)</li>
              </ul>
              <div className="csv-example">
                <strong>Example format:</strong>
                <pre>Name,Phone,Group
John Doe,9876543210,Sales
Jane Smith,8765432109,Marketing</pre>
                <small style={{ color: '#dc2626', marginTop: '8px', display: 'block' }}>Note: Phone numbers must be exactly 10 digits</small>
              </div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleBulkImport}
                style={{ marginTop: '20px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
