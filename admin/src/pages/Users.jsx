import { useState, useEffect } from 'react';
import '../styles/Users.css';
import { Edit2, Eye } from 'lucide-react';
import {
  createAdminUser,
  getActiveSubscriptions,
  getAdminUsers,
  updateAdminUser,
} from '../api/Company';
import { useToast } from '../contexts/ToastContext';
import { createUserSubscription } from '../api/subscription';


const initialFormData = {
  name: '',
  email: '',
  password: '',
  companyName: '',
  contactPersonName: '',
  phoneNumber: '',
  companyAddress: '',
  city: '',
  pincode: '',
  state: '',
  country: '',
  subscriptionId: '',
  isActive: true,
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [editingCompany, setEditingCompany] = useState(null);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewUser, setViewUser] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState(initialFormData);

  const { showToast } = useToast();

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, entriesPerPage, statusFilter]);

  const fetchInitial = async () => {
    try {
      setLoading(true);
      const [usersData, subsData] = await Promise.all([
        getAdminUsers(),
        getActiveSubscriptions(),
      ]);
      setUsers(usersData || []);
      setSubscriptions(subsData || []);
    } catch (err) {
      console.error('Error loading initial data:', err);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getAdminUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('Error fetching users', 'error');
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const openCreateModal = () => {
    setEditingCompany(null);
    setError('');
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingCompany(user);
    setError('');
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      companyName: user.companyName || '',
      contactPersonName: user.contactPersonName || '',
      phoneNumber: user.phoneNumber || '',
      companyAddress: user.companyAddress || '',
      city: user.city || '',
      pincode: user.pincode || '',
      state: user.state || '',
      country: user.country || '',
      subscriptionId: user.subscriptionId ? String(user.subscriptionId) : '',
      isActive: user.isActive ?? true,
    });
    setShowModal(true);
  };

  const closeFormModal = () => {
    setShowModal(false);
    setEditingCompany(null);
    setError('');
    resetForm();
  };
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const payload = {
        ...formData,
        subscriptionId: formData.subscriptionId
          ? Number(formData.subscriptionId)
          : null,
      };

      if (editingCompany) {
        await updateAdminUser(editingCompany.id, payload);

        const oldSubId = editingCompany.subscriptionId
          ? String(editingCompany.subscriptionId)
          : '';
        const newSubId = formData.subscriptionId;

        if (newSubId && newSubId !== oldSubId) {
          try {
            await createUserSubscription(editingCompany.id, {
              planId: parseInt(newSubId),
            });
            showToast('Company updated and subscription renewed successfully', 'success');
          } catch (subErr) {
            console.error('Subscription error:', subErr);
            showToast('Company updated but subscription renewal failed', 'warning');
          }
        } else {
          showToast('Company updated successfully', 'success');
        }
      } else {
        await createAdminUser(payload);
        showToast('Company created successfully', 'success');
      }

      closeFormModal();
      fetchUsers();
    } catch (err) {
      console.error(err);
      const msg =
        err?.message ||
        (editingCompany ? 'Error updating company' : 'Error creating company');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const openViewModal = (user) => {
    setViewUser(user);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewUser(null);
  };

  const getSubscriptionName = (user) => {
    if (user.subscription?.name) return user.subscription.name;
    const sub = subscriptions.find((s) => String(s.id) === String(user.subscriptionId));
    return sub ? sub.name : '-';
  };

  const isSubscriptionActive = (user) => {
    if (!user.subscriptionId) return false;

    // If subscription exists but dates are missing,
    // treat it as active based on company status
    if (!user.subscriptionStartDate || !user.subscriptionEndDate) {
      return true;
    }

    const today = new Date();
    const startDate = new Date(user.subscriptionStartDate);
    const endDate = new Date(user.subscriptionEndDate);

    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return today >= startDate && today <= endDate;
  };
  const getFinalStatus = (user) => {
    return !!user.isActive && isSubscriptionActive(user);
  };

  const getSelectedPlanDetails = () => {
    if (!formData.subscriptionId) return null;
    return subscriptions.find(s => String(s.id) === formData.subscriptionId);
  };

  const filteredUsers = users
    .filter((user) =>
      (user.companyName || user.name || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
    .filter((user) => {
      const active = getFinalStatus(user);

      if (statusFilter === 'active') return active;
      if (statusFilter === 'inactive') return !active;
      return true;
    });

  const totalPages = Math.ceil(filteredUsers.length / entriesPerPage) || 1;

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  if (loading) {
    return <div className="users-loading">Loading users...</div>;
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>Company Management</h1>
        <button className="btn-create" onClick={openCreateModal}>
          + Create Company
        </button>
      </div>

      <div className="users-toolbar">
        <div className="entries-control">
          <label>Show</label>
          <select
            value={entriesPerPage}
            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>

        <div className="search-control">
          <input
            type="text"
            placeholder="Search company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="entries-control">
          <label>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="desktop-users-table">
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th className="company-col">Company Name</th>
                <th className="email-col">Email</th>
                <th className="subscription-col">Subscription</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user, idx) => (
                <tr key={user.id}>
                  <td>{(currentPage - 1) * entriesPerPage + idx + 1}</td>
                  <td className="company-col">{user.companyName || user.name}</td>
                  <td className="email-col">{user.email}</td>
                  <td className="subscription-col">{getSubscriptionName(user)}</td>
                  <td>
                    <span
                      className={`status-badge ${getFinalStatus(user) ? 'active' : 'inactive'
                        }`}
                    >
                      {getFinalStatus(user) ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="action-icon view-icon"
                        onClick={() => openViewModal(user)}
                        title="View"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        className="action-icon edit-icon"
                        onClick={() => openEditModal(user)}
                        title="Edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>
                    No companies found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mobile-users-list">
        {paginatedUsers.map((user, idx) => (
          <div className="user-card" key={user.id}>
            <div className="user-card-top">
              <div>
                <h3>{user.companyName || user.name}</h3>
                <p>{user.email}</p>
              </div>

              <span
                className={`status-badge ${getFinalStatus(user) ? 'active' : 'inactive'
                  }`}
              >
                {getFinalStatus(user) ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="user-card-details">
              <div className="user-card-row">
                <span className="user-card-label">S.No</span>
                <span>{(currentPage - 1) * entriesPerPage + idx + 1}</span>
              </div>

              <div className="user-card-row">
                <span className="user-card-label">Subscription</span>
                <span>{getSubscriptionName(user)}</span>
              </div>

              <div className="user-card-row">
                <span className="user-card-label">Created At</span>
                <span>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : '-'}
                </span>
              </div>
            </div>

            <div className="user-card-actions">
              <button
                type="button"
                className="action-icon view-icon"
                onClick={() => openViewModal(user)}
                title="View"
              >
                <Eye size={16} />
              </button>

              <button
                type="button"
                className="action-icon edit-icon"
                onClick={() => openEditModal(user)}
                title="Edit"
              > <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="users-pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        >
          Prev
        </button>

        <span>
          Page {currentPage} of {totalPages}
        </span>

        <button
          disabled={currentPage === totalPages}
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
        >
          Next
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCompany ? 'Update Company' : 'Create New Company'}</h2>
              <button className="close-btn" onClick={closeFormModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              {error && <div className="error-message">{error}</div>}

              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Person Name</label>
                <input
                  type="text"
                  value={formData.contactPersonName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactPersonName: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  maxLength={10}
                  onChange={(e) => {
                    let value = e.target.value;

                    // Remove non-digits
                    value = value.replace(/\D/g, '');

                    // Allow only up to 10 digits
                    if (value.length <= 10) {
                      setFormData({ ...formData, phoneNumber: value });
                    }
                  }}

                />
              </div>

              <div className="form-group">
                <label>Company Address</label>
                <input
                  type="text"
                  value={formData.companyAddress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      companyAddress: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) =>
                    setFormData({ ...formData, pincode: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Subscription Plan {!editingCompany && '*'}</label>
                <select
                  value={formData.subscriptionId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subscriptionId: e.target.value,
                    })
                  }
                  required={!editingCompany}
                >
                  <option value="">Select Subscription</option>
                  {subscriptions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} - ₹{sub.price} ({sub.duration} days)
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Preview - Add this below the select */}
              {formData.subscriptionId && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                }}>
                  {(() => {
                    const plan = getSelectedPlanDetails();
                    if (!plan) return null;
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <strong style={{ color: '#0369a1' }}>{plan.name}</strong>
                          <strong style={{ color: '#0ea5e9' }}>₹{plan.price}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          Duration: {plan.duration} days | User Limit: {plan.userLimit || 'Unlimited'}
                        </div>
                        {!editingCompany && (
                          <div style={{
                            marginTop: '10px',
                            padding: '8px',
                            background: '#dcfce7',
                            color: '#166534',
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}>
                            ✓ Subscription will be auto-activated on creation
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="form-group">
                <label>Admin Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Admin Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Admin Password {editingCompany ? '(Optional)' : ''}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={editingCompany ? '••••••••' : 'Enter password'}
                  required={!editingCompany}
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label>Company Status</label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '6px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: !prev.isActive,
                      }))
                    }
                    style={{
                      width: '52px',
                      height: '28px',
                      borderRadius: '20px',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      background: formData.isActive ? '#2563eb' : '#d1d5db',
                      transition: '0.3s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '3px',
                        left: formData.isActive ? '27px' : '3px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#fff',
                        transition: '0.3s',
                      }}
                    />
                  </button>

                  <span style={{ fontWeight: 500 }}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>


              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={closeFormModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={creating}>
                  {creating
                    ? editingCompany
                      ? 'Updating...'
                      : 'Creating & Subscribing...'
                    : editingCompany
                      ? 'Update Company'
                      : 'Create & Subscribe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewModalOpen && viewUser && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Company Details</h2>
              <button className="close-btn" onClick={closeViewModal}>
                ×
              </button>
            </div>

            <div className="modal-body" style={{ padding: 24, fontSize: 14 }}>
              <h3 style={{ marginTop: 0, marginBottom: 10 }}>Company Info</h3>
              <p><strong>Company:</strong> {viewUser.companyName || viewUser.name}</p>
              <p><strong>Email:</strong> {viewUser.email}</p>
              <p><strong>Contact Person:</strong> {viewUser.contactPersonName || '-'}</p>
              <p><strong>Phone:</strong> {viewUser.phoneNumber || '-'}</p>
              <p><strong>Address:</strong> {viewUser.companyAddress || '-'}</p>
              <p><strong>City:</strong> {viewUser.city || '-'}</p>
              <p><strong>Pincode:</strong> {viewUser.pincode || '-'}</p>
              <p><strong>State:</strong> {viewUser.state || '-'}</p>
              <p><strong>Country:</strong> {viewUser.country || '-'}</p>
              <p>
                <strong> Status:</strong>{' '}
                {getFinalStatus(viewUser) ? 'Active' : 'Inactive'}
              </p>


              <hr style={{ margin: '16px 0' }} />

              <h3 style={{ marginTop: 0, marginBottom: 10 }}>Subscription</h3>
              <p><strong>Plan:</strong> {getSubscriptionName(viewUser)}</p>
              <p>
                <strong>Start Date:</strong>{' '}
                {viewUser.subscriptionStartDate
                  ? new Date(viewUser.subscriptionStartDate).toLocaleDateString()
                  : '-'}
              </p>
              <p>
                <strong>End Date:</strong>{' '}
                {viewUser.subscriptionEndDate
                  ? new Date(viewUser.subscriptionEndDate).toLocaleDateString()
                  : '-'}
              </p>


              {viewUser.subscription && (
                <>
                  <p><strong>User Limit:</strong> {viewUser.subscription.userLimit ?? '-'}</p>
                  <p>
                    <strong>Duration:</strong>{' '}
                    {viewUser.subscription.duration
                      ? `${viewUser.subscription.duration} days`
                      : '-'}
                  </p>
                  <p><strong>Price:</strong> {viewUser.subscription.price ?? '-'}</p>

                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}