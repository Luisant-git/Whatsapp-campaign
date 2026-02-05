import { useState, useEffect } from "react";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  X,
  ArrowLeftCircle,
} from "lucide-react";
import "../styles/Contact.css";
import { contactAPI } from "../api/contact";
import { useToast } from "../contexts/ToastContext";

/**
 * Blacklist Management Page
 * Shows users labeled 'blocklist' (in chatLabel).
 * Allows re‑activating (remove 'blocklist') or deleting contact.
 */
export default function Blacklist() {
  const { showSuccess, showError } = useToast();

  const [blockedContacts, setBlockedContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewContact, setViewContact] = useState(null);

  // Pagination (you can extend this later)
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);

  // 🔹 Fetch only blocklisted contacts
  const fetchBlocked = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await contactAPI.getBlocked(); // <-- uses /contact/blocklist
      setBlockedContacts(resp.data || []);
      setTotalPages(1); // adjust if you add real pagination later
    } catch (err) {
      console.error("Failed to fetch blocklist", err);
      setError("Unable to load blocked contacts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocked();
  }, []);

  // 🔹 Remove from blocklist (restore contact)
  const handleRestore = async (contact) => {
    try {
      await contactAPI.removeLabel(contact.phone, "blocklist");
      showSuccess(`Restored ${contact.name || contact.phone} to contact list.`);
      fetchBlocked();
    } catch (err) {
      console.error("Restore error:", err);
      showError("Failed to restore contact.");
    }
  };

  // 🔹 Delete permanently
  const handleDelete = async (contact) => {
    if (!window.confirm(`Delete ${contact.name || contact.phone} permanently?`)) return;
    try {
      await contactAPI.delete(contact.id);
      showSuccess(`Deleted ${contact.name || contact.phone}`);
      fetchBlocked();
    } catch (err) {
      console.error("Delete error", err);
      showError("Failed to delete contact.");
    }
  };

  return (
    <div className="contact-container">
      <div className="contact-header">
        <div className="header-left">
          <Users size={24} />
          <h2>Blocked Contacts</h2>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search blocked contacts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="empty-state">
          <Loader2 size={48} className="spin" />
          <p>Loading blacklisted contacts…</p>
        </div>
      )}

      {!loading && blockedContacts.length === 0 && (
        <div className="empty-state">
          <Users size={48} />
          <p>No contacts in blocklist.</p>
        </div>
      )}

      {!loading && blockedContacts.length > 0 && (
        <div className="table-container">
          <table className="contacts-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Group</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {blockedContacts
                .filter(
                  (c) =>
                    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.phone?.includes(searchQuery)
                )
                .map((c, i) => (
                  <tr key={c.id}>
                    <td>{i + 1}</td>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.email || "N/A"}</td>
                    <td>{c.group?.name || "—"}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          className="btn-icon"
                          title="View"
                          style={{ color: "#0ea5e9" }}
                          onClick={() => setViewContact(c)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          title="Restore to Contacts"
                          style={{ color: "#22c55e" }}
                          onClick={() => handleRestore(c)}
                        >
                          <ArrowLeftCircle size={18} />
                        </button>
                        <button
                          className="btn-icon"
                          title="Delete Permanently"
                          style={{ color: "#dc2626" }}
                          onClick={() => handleDelete(c)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Optional: Pagination if you add it later */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="pagination-btn"
          >
            <ChevronLeft size={18} /> Prev
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="pagination-btn"
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* View Modal */}
      {viewContact && (
        <div className="modal-overlay" onClick={() => setViewContact(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px" }}
          >
            <div className="modal-header">
              <h3>Blocked Contact</h3>
              <button className="close-btn" onClick={() => setViewContact(null)}>
                <X size={20} />
              </button>
            </div>
            <p><strong>Name:</strong> {viewContact.name}</p>
            <p><strong>Phone:</strong> {viewContact.phone}</p>
            <p><strong>Email:</strong> {viewContact.email || "N/A"}</p>
            <p><strong>Group:</strong> {viewContact.group?.name || "N/A"}</p>

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  handleRestore(viewContact);
                  setViewContact(null);
                }}
              >
                Restore
              </button>
              <button className="btn-secondary" onClick={() => setViewContact(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}