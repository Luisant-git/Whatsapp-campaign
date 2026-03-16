import { useEffect, useState } from 'react';
import {
  MdCalendarToday,
  MdSearch,
  MdPeopleAlt,
  MdSubscriptions,
  MdPersonOff,
  MdHowToReg,
  MdNotes,
} from 'react-icons/md';

import '../styles/Dashboard.css';
import {
  getAdminAnalytics,
  getTenantSubscriptionAnalytics,
} from '../api/adminAnalytics';
import {
  getTenantNotes,
  createTenantNote,
  updateTenantNote,
  deleteTenantNote,
} from '../api/tenantNote';

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [companyNotes, setCompanyNotes] = useState({});
  const [notesLoading, setNotesLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const results = await Promise.allSettled([
          getAdminAnalytics(),
          getTenantSubscriptionAnalytics(),
        ]);

        const messageAnalytics =
          results[0].status === 'fulfilled' ? results[0].value : {};

        const subscriptionAnalytics =
          results[1].status === 'fulfilled' ? results[1].value : {};

        if (
          results[0].status === 'rejected' &&
          results[1].status === 'rejected'
        ) {
          throw new Error('Both analytics APIs failed');
        }

        setAnalytics({
          ...messageAnalytics,
          ...subscriptionAnalytics,
        });
      } catch (error) {
        console.error('Failed to load analytics:', error);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadCompanyNotes = async (tenantId) => {
    try {
      setNotesLoading(true);
      const notes = await getTenantNotes(tenantId);

      setCompanyNotes((prev) => ({
        ...prev,
        [tenantId]: Array.isArray(notes) ? notes : [],
      }));
    } catch (error) {
      console.error('Failed to fetch tenant notes:', error);
      setCompanyNotes((prev) => ({
        ...prev,
        [tenantId]: [],
      }));
    } finally {
      setNotesLoading(false);
    }
  };

  const openNotesDrawer = async (company) => {
    setSelectedCompany(company);
    setNoteTitle('');
    setNoteDescription('');
    setEditingNoteId(null);
    setShowNotesDrawer(true);
    await loadCompanyNotes(company.id);
  };

  const closeNotesDrawer = () => {
    setShowNotesDrawer(false);
    setSelectedCompany(null);
    setNoteTitle('');
    setNoteDescription('');
    setEditingNoteId(null);
  };

  const updateSelectedCompanyNotesCount = (delta) => {
    if (!selectedCompany) return;

    setAnalytics((prev) => {
      if (!prev?.expiringSoonList) return prev;

      return {
        ...prev,
        expiringSoonList: prev.expiringSoonList.map((company) =>
          company.id === selectedCompany.id
            ? {
                ...company,
                notesCount: Math.max((company.notesCount ?? 0) + delta, 0),
              }
            : company
        ),
      };
    });
  };

  const handleAddOrUpdateNote = async () => {
    if (!selectedCompany || !noteTitle.trim() || !noteDescription.trim()) return;

    try {
      setSavingNote(true);

      if (editingNoteId) {
        const updated = await updateTenantNote(editingNoteId, {
          title: noteTitle.trim(),
          description: noteDescription.trim(),
        });

        setCompanyNotes((prev) => ({
          ...prev,
          [selectedCompany.id]: (prev[selectedCompany.id] || []).map((note) =>
            note.id === editingNoteId ? updated : note
          ),
        }));
      } else {
        const created = await createTenantNote({
          tenantId: selectedCompany.id,
          title: noteTitle.trim(),
          description: noteDescription.trim(),
        });

        setCompanyNotes((prev) => ({
          ...prev,
          [selectedCompany.id]: [created, ...(prev[selectedCompany.id] || [])],
        }));

        updateSelectedCompanyNotesCount(1);
      }

      setNoteTitle('');
      setNoteDescription('');
      setEditingNoteId(null);
    } catch (error) {
      console.error('Failed to save tenant note:', error);
    } finally {
      setSavingNote(false);
    }
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title || '');
    setNoteDescription(note.description || '');
  };

  const handleDeleteNote = async (noteId) => {
    if (!selectedCompany) return;

    try {
      await deleteTenantNote(noteId);

      setCompanyNotes((prev) => ({
        ...prev,
        [selectedCompany.id]: (prev[selectedCompany.id] || []).filter(
          (note) => note.id !== noteId
        ),
      }));

      updateSelectedCompanyNotesCount(-1);

      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setNoteTitle('');
        setNoteDescription('');
      }
    } catch (error) {
      console.error('Failed to delete tenant note:', error);
    }
  };

  const formatNoteDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  };

  if (loading) {
    return <div className="dashboard">Loading dashboard...</div>;
  }

  if (!analytics) {
    return <div className="dashboard">Failed to load dashboard data.</div>;
  }

  const stats = [
    {
      label: 'Total Companies',
      value: analytics.totalTenants ?? 0,
      icon: MdPeopleAlt,
      color: '#0ea5e9',
    },
    {
      label: 'Active Companies',
      value: analytics.activeTenants ?? 0,
      icon: MdHowToReg,
      color: '#22c55e',
    },
    {
      label: 'Inactive Companies',
      value: (analytics.totalTenants ?? 0) - (analytics.activeTenants ?? 0),
      icon: MdPersonOff,
      color: '#ef4444',
    },
    {
      label: 'Active Subscriptions',
      value: analytics.activeTenants ?? 0,
      icon: MdSubscriptions,
      color: '#8b5cf6',
    },
  ];

  const getComputedStatus = (company) => {
    if (company.isActive === false) {
      return { label: 'Inactive', daysText: '' };
    }

    if ((company.daysLeft ?? 0) < 0) {
      return { label: 'Expired', daysText: '' };
    }

    if ((company.daysLeft ?? 0) <= 2) {
      return {
        label: 'Critical',
        daysText: `(${company.daysLeft} days left)`,
      };
    }

    if ((company.daysLeft ?? 0) <= 7) {
      return {
        label: 'Expiring Soon',
        daysText: `(${company.daysLeft} days left)`,
      };
    }

    return {
      label: 'Active',
      daysText: `(${company.daysLeft} days left)`,
    };
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Active':
        return 'status-pill--active';
      case 'Inactive':
        return 'status-pill--inactive';
      case 'Expiring Soon':
        return 'status-pill--warning';
      case 'Critical':
        return 'status-pill--critical';
      case 'Expired':
        return 'status-pill--expired';
      default:
        return 'status-pill--default';
    }
  };

  const subscriptionList = analytics.expiringSoonList || [];

  const filteredList = subscriptionList.filter((company) =>
    company.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;

  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const currentCompanyNotes = selectedCompany
    ? companyNotes[selectedCompany.id] || []
    : [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p className="dashboard-subtitle">
            Company and subscription summary
          </p>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="stat-card"
              style={{ '--accent-color': stat.color }}
            >
              <div
                className="stat-icon"
                style={{ backgroundColor: `${stat.color}18` }}
              >
                <Icon size={24} color={stat.color} />
              </div>

              <div className="stat-info">
                <p className="stat-label">{stat.label}</p>
                <h3 className="stat-value">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="content-card expiring-card">
        <div className="expiring-header">
          <div>
            <h2>Expiring Soon</h2>
            <p className="expiring-subtitle">
              Companies whose plans will expire soon.
            </p>
          </div>

          <div className="expiring-search">
            <MdSearch size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="expiring-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Contact Person</th>
                <th>Phone Number</th>
                <th>Current Plan</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Follow up</th>
              </tr>
            </thead>

            <tbody>
              {paginatedList.map((company) => {
                const statusData = getComputedStatus(company);
                const notesCount = company.notesCount ?? 0;

                return (
                  <tr key={company.id}>
                    <td>
                      <div className="company-name">{company.companyName}</div>
                      <div className="company-id">ID: {company.id}</div>
                    </td>

                    <td>{company.contactPersonName || '-'}</td>
                    <td>{company.phoneNumber || '-'}</td>
                    <td>{company.currentPlan || '-'}</td>

                    <td>
                      <div className="expiry-date-cell">
                        <MdCalendarToday size={14} className="expiry-icon" />
                        <span>
                          {company.expiryDate
                            ? new Date(company.expiryDate).toLocaleDateString()
                            : '-'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`status-pill ${getStatusClass(
                          statusData.label
                        )}`}
                      >
                        <span className="status-dot" />
                        {statusData.label} {statusData.daysText}
                      </span>
                    </td>

                    <td>
                      <button
                        className="note-icon-btn notes-btn-with-count"
                        onClick={() => openNotesDrawer(company)}
                        title="Open notes"
                      >
                        <MdNotes size={20} />
                        {notesCount > 0 && (
                          <span className="notes-count-badge">
                            {notesCount > 99 ? '99+' : notesCount}
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {paginatedList.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center' }}>
                    No companies found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="pagination">
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
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showNotesDrawer && selectedCompany && (
        <div className="notes-drawer-overlay" onClick={closeNotesDrawer}>
          <div className="notes-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="notes-drawer-header">
              <div>
                <h3>Notes</h3>
                <p>{selectedCompany.companyName}</p>
                <p>{selectedCompany.phoneNumber || '-'}</p>
              </div>
              <button
                type="button"
                className="notes-drawer-close"
                onClick={closeNotesDrawer}
              >
                ×
              </button>
            </div>

            <div className="notes-drawer-add">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Title"
              />
              <textarea
                value={noteDescription}
                onChange={(e) => setNoteDescription(e.target.value)}
                placeholder="Take a note..."
                rows={3}
              />
              <button
                type="button"
                onClick={handleAddOrUpdateNote}
                disabled={savingNote}
              >
                {savingNote ? 'Saving...' : editingNoteId ? 'Update' : 'Add Note'}
              </button>
            </div>

            <div className="notes-drawer-list">
              {notesLoading ? (
                <div className="notes-empty">Loading notes...</div>
              ) : currentCompanyNotes.length === 0 ? (
                <div className="notes-empty">No notes yet</div>
              ) : (
                currentCompanyNotes.map((note) => (
                  <div key={note.id} className="note-card">
                    <div className="note-card-date">
                      {formatNoteDate(note.createdAt)}
                    </div>

                    {note.title && (
                      <div className="note-card-title">{note.title}</div>
                    )}

                    <div className="note-card-text">{note.description}</div>

                    <div className="note-card-actions">
                      <button type="button" onClick={() => handleEditNote(note)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}