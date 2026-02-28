import { useState, useEffect } from 'react';
import '../styles/Users.css';
import { Eye } from 'lucide-react';
import {
  createAdminUser,
  getActiveSubscriptions,
  getAdminUsers,
  toggleCompanyStatus,
} from '../api/Company';
import { useToast } from '../contexts/ToastContext'

export default function Users() {
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Company modal
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Create form data
  const [formData, setFormData] = useState({
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
  });

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewUser, setViewUser] = useState(null);

  const { showToast } = useToast();

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    try {
      setLoading(true);
      const [usersData, subsData] = await Promise.all([
        getAdminUsers(),
        getActiveSubscriptions(),
      ]);
      setUsers(usersData);
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
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('Error fetching users', 'error');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await createAdminUser(formData);
      setShowModal(false);
      setFormData({
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
      });
      showToast('Company created successfully', 'success');
      fetchUsers();
    } catch (err) {
      console.error(err);
      const msg = err.message || 'Error creating company';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const newStatus = !user.isActive;
      await toggleCompanyStatus(user.id, newStatus);
      showToast(
        `Company ${newStatus ? 'activated' : 'deactivated'} successfully`,
        'success',
      );
      fetchUsers();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error updating status', 'error');
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
    if (user.subscription) return user.subscription.name;
    const sub = subscriptions.find((s) => s.id === user.subscriptionId);
    return sub ? sub.name : '-';
  };

  if (loading) {
    return <div className="users-loading">Loading users...</div>;
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>Company Management</h1>
        <button className="btn-create" onClick={() => setShowModal(true)}>
          + Create Company
        </button>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Company Name</th>
              <th>Email</th>
              <th>Subscription</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.id}>
                <td>{idx + 1}</td>
                <td>{user.companyName || user.name}</td>
                <td>{user.email}</td>
                <td>{getSubscriptionName(user)}</td>
                <td>
                  <span
                    className={`status-badge ${
                      user.isActive ? 'active' : 'inactive'
                    }`}
                    onClick={() => handleToggleActive(user)}
                    style={{ cursor: 'pointer' }}
                    title="Click to toggle status"
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => openViewModal(user)}
                    title="View"
                  >
                    <Eye size={18} />
                  </button>
                  {/* Edit removed */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Company Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Create New Company</h2>
              <button
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              {error && <div className="error-message">{error}</div>}

              {/* Company info */}
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      companyName: e.target.value,
                    })
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phoneNumber: e.target.value,
                    })
                  }
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
                    setFormData({
                      ...formData,
                      city: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pincode: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      state: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      country: e.target.value,
                    })
                  }
                />
              </div>

              {/* Subscription */}
              <div className="form-group">
                <label>Subscription Plan</label>
                <select
                  value={formData.subscriptionId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subscriptionId: e.target.value,
                    })
                  }
                >
                  <option value="">Select Subscription</option>
                  {subscriptions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Owner login */}
              <div className="form-group">
                <label>Admin Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
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
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Admin Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password: e.target.value,
                    })
                  }
                  required
                  minLength="6"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModalOpen && viewUser && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Company Details</h2>
              <button className="close-btn" onClick={closeViewModal}>
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: 24, fontSize: 14 }}>
              <h3 style={{ marginTop: 0, marginBottom: 10 }}>Company Info</h3>
              <p>
                <strong>Company:</strong>{' '}
                {viewUser.companyName || viewUser.name}
              </p>
              <p>
                <strong>Email:</strong> {viewUser.email}
              </p>
              <p>
                <strong>Contact Person:</strong>{' '}
                {viewUser.contactPersonName || '-'}
              </p>
              <p>
                <strong>Phone:</strong> {viewUser.phoneNumber || '-'}
              </p>
              <p>
                <strong>Address:</strong>{' '}
                {viewUser.companyAddress || '-'}
              </p>
              <p>
                <strong>City:</strong> {viewUser.city || '-'}
              </p>
              <p>
                <strong>Pincode:</strong> {viewUser.pincode || '-'}
              </p>
              <p>
                <strong>State:</strong> {viewUser.state || '-'}
              </p>
              <p>
                <strong>Country:</strong> {viewUser.country || '-'}
              </p>

              <hr style={{ margin: '16px 0' }} />

              <h3 style={{ marginTop: 0, marginBottom: 10 }}>Subscription</h3>
              <p>
                <strong>Plan:</strong> {getSubscriptionName(viewUser)}
              </p>
              <p>
                <strong>Start Date:</strong>{' '}
                {viewUser.subscriptionStartDate
                  ? new Date(
                      viewUser.subscriptionStartDate,
                    ).toLocaleDateString()
                  : '-'}
              </p>
              <p>
                <strong>End Date:</strong>{' '}
                {viewUser.subscriptionEndDate
                  ? new Date(
                      viewUser.subscriptionEndDate,
                    ).toLocaleDateString()
                  : '-'}
              </p>
              {viewUser.subscription && (
                <>
                  <p>
                    <strong>User Limit:</strong>{' '}
                    {viewUser.subscription.userLimit ?? '-'}
                  </p>
                  <p>
                    <strong>Duration:</strong>{' '}
                    {viewUser.subscription.duration
                      ? `${viewUser.subscription.duration} days`
                      : '-'}
                  </p>
                  <p>
                    <strong>Price:</strong>{' '}
                    {viewUser.subscription.price ?? '-'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}