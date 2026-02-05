import { useState, useEffect, useRef } from "react";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  Edit2,
  Eye,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

import "../styles/Contact.css";
import { contactAPI } from "../api/contact";
import { groupAPI } from "../api/group";
import * as XLSX from "xlsx";
import { IoCheckmarkOutline, IoCloseOutline, IoCloudUploadOutline } from "react-icons/io5";
import { useToast } from "../contexts/ToastContext";

export default function Contact() {
  // ---------- UI state ----------
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  // ---------- modal state ----------
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [viewContact, setViewContact] = useState(null);
  // ---------- Bulk import state (required) ----------
const [uploadedData, setUploadedData] = useState([]);
const [fileName, setFileName] = useState("");      // 👈 defines fileName
const [selectedGroup, setSelectedGroup] = useState("");
const { showSuccess, showError } = useToast();

  // ---------- form data ----------
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    place: "",
    dob: "",
    anniversary: "",
    group: "",
  });
  const [groupName, setGroupName] = useState("");

  // ---------- debounce search ----------
  const debounceTimer = useRef(null);
  const debouncedSearch = (query) => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      fetchContacts(1, limit, query);
    }, 400);
  };

  // ---------- API calls ----------
  const fetchContacts = async (pg = page, lim = limit, search = searchQuery) => {
    setLoading(true);
    setError("");
    try {
      const resp = await contactAPI.getAll(pg, lim, search);
      const { data, pagination } = resp.data;
      setContacts(data || []);
      if (pagination) {
        setTotal(pagination.total || 0);
        setTotalPages(pagination.totalPages || 0);
      } else {
        setTotal(resp.data.total || 0);
        setTotalPages(Math.ceil((resp.data.total || 0) / limit));
      }
    } catch (err) {
      console.error("Failed to fetch contacts", err);
      setError("Unable to load contacts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const resp = await groupAPI.getAll();
      const groupsArray = Array.isArray(resp.data)
        ? resp.data
        : resp.data.data || [];
      setGroups(groupsArray.map((g) => g.name || g));
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  // ---------- effects ----------
  useEffect(() => {
    fetchContacts();
    fetchGroups();
  }, []);

  useEffect(() => {
    fetchContacts(page, limit, searchQuery);
    fetchGroups();
  }, [page, searchQuery]);

  // ---------- handlers ----------
  const handleAddGroup = async () => {
    if (!groupName.trim()) {
      showError("Please enter a group name");
      return;
    }
  
    try {
      await groupAPI.create({ name: groupName.trim() });
      await fetchGroups();
      showSuccess(`Successfully created group "${groupName.trim()}"`);
      setGroupName("");
      setShowGroupModal(false);
    } catch (err) {
      console.error("Error creating group", err);
      showError("Failed to create group. Please try again.");
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const phone = formData.phone.replace(/[^0-9]/g, "");
  
    // Validation
    if (!formData.name.trim()) {
      setValidationError("Please enter a valid name and 10‑digit phone number.");
      return;
    }
    if (!editingContact && phone.length !== 10) {
      setValidationError("Please enter a valid 10‑digit phone number.");
      return;
    }
    if (!formData.group) {
      setValidationError("Please select a group.");
      return;
    }
  
    setValidationError("");
    setLoading(true);
    setError("");
  
    try {
      if (editingContact) {
        await contactAPI.update(editingContact.id, formData);
        // ✅ success toast for update
        showSuccess(`Successfully updated contact "${formData.name}"`);
      } else {
        await contactAPI.create(formData);
        // ✅ success toast for create
        showSuccess(`Successfully created contact "${formData.name}"`);
      }
  
      await fetchContacts(page, limit, searchQuery);
      setShowAddModal(false);
      setEditingContact(null);
      resetForm();
    } catch (err) {
      console.error("Save error", err);
      // 🔴 error toast for failure
      showError(
        editingContact
          ? "Failed to update contact. Please try again."
          : "Failed to create contact. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) return;
    setLoading(true);
    setError("");
    try {
      await contactAPI.delete(id);
      await fetchContacts(page, limit, searchQuery);
    } catch (err) {
      console.error("Delete error", err);
      setError("Failed to delete contact.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () =>
    setFormData({
      name: "",
      phone: "",
      email: "",
      place: "",
      dob: "",
      anniversary: "",
      group: "",
    });

    
// ---------- working Bulk Import handlers ----------
const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setFileName(file.name);

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // ✅ now supports lowercase headers like your Excel
      const formatted = jsonData
        .map((row) => ({
          name:
            row["Name"] ||
            row["name"] ||
            row["Customer Name"] ||
            row["customer name"] ||
            "",
          phone: String(
            row["Phone"] ||
              row["phone"] ||
              row["Phone Number"] ||
              row["phone number"] ||
              ""
          ).trim(),
          group: row["Group"] || row["group"] || "",
          email: row["Email"] || row["email"] || "",
          place: row["Place"] || row["place"] || "",
          dob: row["DOB"] || row["dob"] || "",
          anniversary:
            row["Anniversary"] || row["anniversary"] || "",
        }))
        .filter((r) => r.phone);

      setUploadedData(formatted);
      showSuccess(`Loaded ${formatted.length} contacts from file`);
    } catch (err) {
      console.error("Error reading file:", err);
      showError("Error reading file. Please check the column names.");
    }
  };
  reader.readAsArrayBuffer(file);
};

const handleBulkImportSubmit = async () => {
  if (uploadedData.length === 0) {
    showError("Please upload a file first");
    return;
  }

  let successCount = 0;
  let failCount = 0;
  const duplicateNumbers = [];

  for (const c of uploadedData) {
    try {
      await contactAPI.create({
        name: c.name,
        phone: c.phone,
        email: c.email || undefined,
        place: c.place || undefined,
        dob: c.dob || undefined,
        anniversary: c.anniversary || undefined,
        group: c.group || selectedGroup || undefined,
      });
      successCount++;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "";
      if (/already exists/i.test(msg) || /duplicate/i.test(msg)) {
        duplicateNumbers.push(c.phone);
      }
      failCount++;
    }
  }

  // show summary
  if (successCount > 0)
    showSuccess(`Imported ${successCount} contact${successCount > 1 ? "s" : ""}`);
  if (duplicateNumbers.length > 0)
    showError(`Already registered numbers: ${duplicateNumbers.join(", ")}`);
  if (failCount > 0 && duplicateNumbers.length === 0)
    showError("Some contacts failed to import.");

  setUploadedData([]);
  setFileName("");
  setShowBulkModal(false);
  fetchContacts();
};
  // ---------- helper ----------
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB"); // e.g., 02/02/2026
    } catch {
      return "—";
    }
  };

  // ---------- render ----------
  return (
    <div className="contact-container">
      {/* Header */}
      <div className="contact-header">
        <div className="header-left">
          <Users size={24} />
          <h2>Contact Management</h2>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowGroupModal(true)}>
            + Add Group
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setEditingContact(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={18} /> Add Contact
          </button>
          <button className="btn-secondary" onClick={() => setShowBulkModal(true)}>
            <Upload size={18} /> Bulk Import
          </button>
        </div>
      </div>

      {/* Search + Count */}
      <div className="filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by contact, name or group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="total-count">
          Total: {total} Contact{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="error-banner"
          style={{
            background: "#fee",
            padding: "0.75rem",
            marginBottom: "1rem",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertCircle size={20} color="#d00" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      {loading && contacts.length === 0 ? (
        <div className="empty-state">
          <Loader2 size={48} className="spin" />
          <p>Loading contacts…</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>No contacts yet. Add or import contacts to start.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="contacts-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Group</th>
                <th>Email</th>
                <th>Place</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, i) => (
                <tr key={c.id}>
                  <td>{(page - 1) * limit + i + 1}</td>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.group?.name || "N/A"}</td>
                  <td>{c.email || "N/A"}</td>
                  <td>{c.place || "N/A"}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        whiteSpace: "nowrap",
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
                        title="Edit"
                        style={{ color: "#22c55e" }}
                        onClick={() => {
                          setShowAddModal(true);
                          setEditingContact(c);
                          setFormData({
                            ...c,
                            group: c.group?.name || "",
                          });
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="pagination-btn"
          >
            <ChevronLeft size={18} /> Prev
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="pagination-btn"
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ---- Modals ---- */}

      {/* View Contact */}
      {viewContact && (
        <div className="modal-overlay" onClick={() => setViewContact(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px" }}
          >
            <div className="modal-header">
              <h3>Contact Details</h3>
              <button className="close-btn" onClick={() => setViewContact(null)}>
                <X size={20} />
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px 24px",
                padding: "10px 0",
              }}
            >
              <p>
                <strong>Name:</strong> {viewContact.name}
              </p>
              <p>
                <strong>Mobile:</strong> {viewContact.phone}
              </p>
              <p>
                <strong>Group:</strong> {viewContact.group?.name || "N/A"}
              </p>
              <p>
                <strong>Email:</strong> {viewContact.email|| "N/A"}
              </p>
              <p>
                <strong>Place:</strong> {viewContact.place || "N/A"}
              </p>
              <p>
                <strong>DOB:</strong> {formatDate(viewContact.dob)|| "N/A"}
              </p>
              <p>
                <strong>Anniversary:</strong> {formatDate(viewContact.anniversary)|| "N/A"}
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingContact(viewContact);
                  setFormData({ ...viewContact });
                  setViewContact(null);
                  setShowAddModal(true);
                }}
              >
                Edit
              </button>
              <button className="btn-secondary" onClick={() => setViewContact(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Contact */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingContact ? "Edit Contact" : "Add New Contact"}</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            {validationError && (
              <div
                style={{
                  background: "#fef2f2",
                  color: "#991b1b",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "4px",
                  marginBottom: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <AlertCircle size={18} color="#dc2626" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    if (v.length <= 10) setFormData({ ...formData, phone: v });
                  }}
                  placeholder="10 digits only"
                  maxLength={10}
                  required
                  disabled={!!editingContact}
                />
              </div>

              <div className="form-group">
                <label>Group *</label>
                <select
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  required
                >
                  <option value="">Select Group</option>
                  {groups.map((g, i) => (
                    <option key={i} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Email ID</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email (optional)"
                />
              </div>

              <div className="form-group">
                <label>Place</label>
                <input
                  type="text"
                  value={formData.place}
                  onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                  placeholder="Enter place (optional)"
                />
              </div>

              <div className="form-group">
                <label>DOB</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Anniversary</label>
                <input
                  type="date"
                  value={formData.anniversary}
                  onChange={(e) =>
                    setFormData({ ...formData, anniversary: e.target.value })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                    setEditingContact(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />{" "}
                      {editingContact ? "Updating…" : "Adding…"}
                    </>
                  ) : (
                    <>{editingContact ? "Update" : "Add"} Contact</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Group */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Group</h3>
              <button className="close-btn" onClick={() => setShowGroupModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="form-group">
              <label>Group Name *</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowGroupModal(false)}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddGroup}>
                Add Group
              </button>
            </div>
          </div>
        </div>
      )}

      
     {/* Bulk Import */}
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
          <li>Email, Place, DOB, Anniversary (optional)</li>
        </ul>

        <div className="file-upload-container" style={{ marginTop: "12px" }}>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            id="contact-upload"
            className="file-input"
          />
          <label htmlFor="contact-upload" className="file-upload-btn">
            <IoCloudUploadOutline size={20} />
            <span style={{ marginLeft: "8px" }}>
              {fileName || "Choose File (Excel/CSV)"}
            </span>
          </label>

          {uploadedData.length > 0 && (
            <div
              className="file-success"
              style={{
                marginTop: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <IoCheckmarkOutline size={18} color="#16a34a" />
              <span>{uploadedData.length} contacts ready to import</span>
              <button
                onClick={() => {
                  setUploadedData([]);
                  setFileName("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <IoCloseOutline size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginTop: "12px" }}>
          <label>Select Group (optional)</label>
          <select
            className="form-input"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="">No Group</option>
            {groups.map((g, i) => (
              <option key={i} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-actions" style={{ marginTop: "16px" }}>
          <button
            className="btn-secondary"
            onClick={() => setShowBulkModal(false)}
          >
            Cancel
          </button>
          <button className="btn-primary" onClick={handleBulkImportSubmit}>
            Import Contacts
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}