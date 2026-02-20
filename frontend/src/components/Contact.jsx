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
  Trash2,
  RotateCcw,
} from "lucide-react";

import "../styles/Contact.css";
import { contactAPI } from "../api/contact";
import { groupAPI } from "../api/group";
import * as XLSX from "xlsx";
import {
  IoCheckmarkOutline,
  IoCloseOutline,
  IoCloudUploadOutline,
} from "react-icons/io5";
import { useToast } from "../contexts/ToastContext";

export default function Contact() {
  // ---------- UI state ----------
  const [tab, setTab] = useState("active"); // "active" | "trash"

  const [contacts, setContacts] = useState([]);
  const [trashContacts, setTrashContacts] = useState([]);

  // groups as objects: [{id,name}]
  const [groups, setGroups] = useState([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Entries dropdown
  const [entries, setEntries] = useState(10);
  const limit = entries;

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false); // list loading
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  // multi-select
  const [selectedIds, setSelectedIds] = useState([]);

  // ---------- modals ----------
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [editingContact, setEditingContact] = useState(null);
  const [viewContact, setViewContact] = useState(null);

  // group edit in manage modal
  const [editingGroup, setEditingGroup] = useState(null); // {id,name}
  const [editingGroupName, setEditingGroupName] = useState("");

  // ---------- Bulk import ----------
  const [uploadedData, setUploadedData] = useState([]);
  const [fileName, setFileName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [importing, setImporting] = useState(false);

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
      setSearchQuery(query);
    }, 400);
  };

  // ---------- selection helpers ----------
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllCurrent = (list) => {
    const ids = list.map((x) => x.id);
    const allSelected =
      ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : ids);
  };

  const clearSelection = () => setSelectedIds([]);

  // ---------- API calls ----------
  const fetchContacts = async (
    pg = page,
    lim = limit,
    search = searchQuery,
    group = selectedGroupFilter
  ) => {
    setLoading(true);
    setError("");
    try {
      // NOTE: contactAPI.getAll must accept group param
      const resp = await contactAPI.getAll(pg, lim, search, group);
      const { data, pagination } = resp.data;

      setContacts(data || []);

      if (pagination) {
        setTotal(pagination.total || 0);
        setTotalPages(pagination.totalPages || 0);
      } else {
        setTotal(resp.data.total || 0);
        setTotalPages(Math.ceil((resp.data.total || 0) / lim));
      }
    } catch (err) {
      console.error("Failed to fetch contacts", err);
      setError("Unable to load contacts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrash = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await contactAPI.getTrash();
      const list = resp.data?.data || resp.data || [];
      setTrashContacts(list);
    } catch (err) {
      console.error("Failed to fetch trash", err);
      setError("Unable to load trash contacts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const resp = await groupAPI.getAll();
      const arr = Array.isArray(resp.data) ? resp.data : resp.data.data || [];

      // expecting [{id,name}] from backend
      setGroups(arr.map((g) => ({ id: g.id, name: g.name })));
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  // ---------- effects ----------
  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    clearSelection();

    if (tab === "active") {
      fetchContacts(page, limit, searchQuery, selectedGroupFilter);
    } else {
      fetchTrash();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, limit, searchQuery, selectedGroupFilter]);

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
        showSuccess(`Successfully updated contact "${formData.name}"`);
      } else {
        await contactAPI.create(formData);
        showSuccess(`Successfully created contact "${formData.name}"`);
      }

      await fetchContacts(page, limit, searchQuery, selectedGroupFilter);
      setShowAddModal(false);
      setEditingContact(null);
      resetForm();
    } catch (err) {
      console.error("Save error", err);
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
    if (!window.confirm("Move this contact to Trash?")) return;
    setLoading(true);
    setError("");

    try {
      await contactAPI.delete(id);
      showSuccess("Moved to Trash");

      await fetchContacts(page, limit, searchQuery, selectedGroupFilter);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (err) {
      console.error("Delete error", err);
      showError("Failed to delete contact.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    setLoading(true);
    setError("");
    try {
      await contactAPI.restore(id);
      showSuccess("Restored successfully");
      await fetchTrash();
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (err) {
      console.error("Restore error", err);
      showError("Failed to restore contact.");
    } finally {
      setLoading(false);
    }
  };

  const handleMultiDelete = async () => {
    if (selectedIds.length === 0) {
      showError("Select contacts first");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedIds.length} contacts?`
      )
    )
      return;

    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => contactAPI.delete(id)));
      showSuccess(`Deleted ${selectedIds.length} contacts`);
      clearSelection();
      await fetchContacts(page, limit, searchQuery, selectedGroupFilter);
    } catch (err) {
      console.error(err);
      showError("Failed to delete some contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleMultiRestore = async () => {
    if (selectedIds.length === 0) {
      showError("Select contacts first");
      return;
    }

    if (!window.confirm(`Restore ${selectedIds.length} contacts?`)) return;

    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => contactAPI.restore(id)));
      showSuccess(`Restored ${selectedIds.length} contacts`);
      clearSelection();
      await fetchTrash();
    } catch (err) {
      console.error(err);
      showError("Failed to restore some contacts");
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

  // ---------- Bulk Import ----------
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
            anniversary: row["Anniversary"] || row["anniversary"] || "",
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

    setImporting(true);

    let successCount = 0;
    let failCount = 0;
    const duplicateNumbers = [];

    try {
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
    } finally {
      setImporting(false);
    }

    if (successCount > 0)
      showSuccess(
        `Imported ${successCount} contact${successCount > 1 ? "s" : ""}`
      );
    if (duplicateNumbers.length > 0)
      showError(`Already registered numbers: ${duplicateNumbers.join(", ")}`);
    if (failCount > 0 && duplicateNumbers.length === 0)
      showError("Some contacts failed to import.");

    setUploadedData([]);
    setFileName("");
    setShowBulkModal(false);

    // refresh list
    setTab("active");
    setPage(1);
    fetchContacts(1, limit, searchQuery, selectedGroupFilter);
  };

  // ---------- helper ----------
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB");
    } catch {
      return "—";
    }
  };

  const currentList = tab === "active" ? contacts : trashContacts;

  return (
    <div className="contact-container">
      {/* Header */}
      <div className="contact-header">
        <div className="header-left">
          <Users size={24} />
          <h2>{tab === "active" ? "Contact Management" : "Trash Contacts"}</h2>
        </div>

        {tab === "active" && (
          <div className="header-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowManageGroups(true)}
            >
              Manage Groups
            </button>

            <button
              className="btn-secondary"
              onClick={() => setShowGroupModal(true)}
            >
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

            <button
              className="btn-secondary"
              onClick={() => setShowBulkModal(true)}
            >
              <Upload size={18} /> Bulk Import
            </button>
          </div>
        )}
      </div>

      {/* Entries + Trash toggle + Bulk action bar (BEFORE Search Bar) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Show</span>
          <select
            value={entries}
            onChange={(e) => {
              setEntries(Number(e.target.value));
              setPage(1);
            }}
            disabled={tab === "trash"} // trash not paginated in this sample
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>entries</span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={() => {
              setTab((prev) => (prev === "active" ? "trash" : "active"));
              setPage(1);
              clearSelection();
            }}
          >
            <Trash2 size={18} />
            <span style={{ marginLeft: 6 }}>
              {tab === "active" ? "Trash" : "Contacts"}
            </span>
          </button>

          {tab === "active" ? (
            <button
              className="btn-secondary"
              onClick={handleMultiDelete}
              disabled={selectedIds.length === 0 || loading}
            >
              <Trash2 size={18} />
              <span style={{ marginLeft: 6 }}>Delete Selected</span>
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={handleMultiRestore}
              disabled={selectedIds.length === 0 || loading}
            >
              <RotateCcw size={18} />
              <span style={{ marginLeft: 6 }}>Restore Selected</span>
            </button>
          )}
        </div>
      </div>

      {/* Group dropdown + Search + Count */}
      <div className="filters-section" style={{ gap: 10 }}>
        {/* Group filter dropdown BEFORE Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={selectedGroupFilter}
            onChange={(e) => {
              setSelectedGroupFilter(e.target.value);
              setPage(1);
            }}
            disabled={tab === "trash"} // implement trash group filtering later if needed
            style={{ padding: "8px", borderRadius: 6 }}
          >
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder={
              tab === "active"
                ? "Search by contact, name or group..."
                : "Search disabled in trash"
            }
            defaultValue={searchQuery}
            onChange={(e) => debouncedSearch(e.target.value)}
            disabled={tab === "trash"}
          />
        </div>

        <div className="total-count">
          {tab === "active"
            ? `Total: ${total} Contact${total !== 1 ? "s" : ""}`
            : `Trash: ${trashContacts.length} Contact${
                trashContacts.length !== 1 ? "s" : ""
              }`}
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
      {loading && currentList.length === 0 ? (
        <div className="empty-state">
          <Loader2 size={48} className="spin" />
          <p>Loading…</p>
        </div>
      ) : currentList.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>{tab === "active" ? "No contacts yet." : "No contacts in trash."}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="contacts-table">
            <thead>
              {tab === "active" ? (
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        contacts.length > 0 &&
                        contacts.every((c) => selectedIds.includes(c.id))
                      }
                      onChange={() => selectAllCurrent(contacts)}
                    />
                  </th>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Group</th>
                  <th>Email</th>
                  <th>Place</th>
                  <th>Actions</th>
                </tr>
              ) : (
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        trashContacts.length > 0 &&
                        trashContacts.every((c) => selectedIds.includes(c.id))
                      }
                      onChange={() => selectAllCurrent(trashContacts)}
                    />
                  </th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Group</th>
                  <th>Actions</th>
                </tr>
              )}
            </thead>

            <tbody>
              {tab === "active"
                ? contacts.map((c, i) => (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
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

                          <button
                            className="btn-icon"
                            title="Delete"
                            style={{ color: "#ef4444" }}
                            onClick={() => handleDelete(c.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : trashContacts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
                      <td>{c.name}</td>
                      <td>{c.phone}</td>
                      <td>{c.group?.name || "N/A"}</td>
                      <td>
                        <button
                          className="btn-icon"
                          title="Restore"
                          style={{ color: "#22c55e" }}
                          onClick={() => handleRestore(c.id)}
                        >
                          <RotateCcw size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination (only active tab) */}
      {tab === "active" && totalPages > 1 && (
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

      {/* -------------------- MODALS -------------------- */}

      {/* Manage Groups Modal */}
      {showManageGroups && (
        <div className="modal-overlay" onClick={() => setShowManageGroups(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manage Groups</h3>
              <button className="close-btn" onClick={() => setShowManageGroups(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {groups.length === 0 ? (
                <div>No groups</div>
              ) : (
                groups.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 10,
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      gap: 10,
                    }}
                  >
                    {editingGroup?.id === g.id ? (
                      <input
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        style={{ flex: 1, padding: 8 }}
                      />
                    ) : (
                      <div style={{ fontWeight: 600, flex: 1 }}>{g.name}</div>
                    )}

                    <div style={{ display: "flex", gap: 8 }}>
                      {editingGroup?.id === g.id ? (
                        <>
                          <button
                            className="btn-primary"
                            onClick={async () => {
                              if (!editingGroupName.trim()) return showError("Enter group name");
                              try {
                                await groupAPI.update(g.id, { name: editingGroupName.trim() });
                                showSuccess("Group updated");
                                setEditingGroup(null);
                                setEditingGroupName("");
                                fetchGroups();
                              } catch (e) {
                                showError("Failed to update group");
                              }
                            }}
                          >
                            Save
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => {
                              setEditingGroup(null);
                              setEditingGroupName("");
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-secondary"
                            onClick={() => {
                              setEditingGroup(g);
                              setEditingGroupName(g.name);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ color: "#ef4444" }}
                            onClick={async () => {
                              if (!window.confirm(`Delete group "${g.name}"?`)) return;
                              try {
                                await groupAPI.delete(g.id);
                                showSuccess("Group deleted");
                                fetchGroups();
                              } catch (e) {
                                showError("Failed to delete group");
                              }
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
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
              <button className="btn-secondary" onClick={() => setShowGroupModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddGroup}>
                Add Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => !importing && setShowBulkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bulk Import Contacts</h3>
              <button className="close-btn" onClick={() => !importing && setShowBulkModal(false)}>
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
                  disabled={importing}
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
                        if (importing) return;
                        setUploadedData([]);
                        setFileName("");
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                      type="button"
                      disabled={importing}
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
                  disabled={importing}
                >
                  <option value="">No Group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions" style={{ marginTop: "16px" }}>
                <button
                  className="btn-secondary"
                  onClick={() => setShowBulkModal(false)}
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleBulkImportSubmit}
                  disabled={importing || uploadedData.length === 0}
                >
                  {importing ? "Importing..." : "Import Contacts"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Contact Modal */}
      {viewContact && (
        <div className="modal-overlay" onClick={() => setViewContact(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
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
              <p><strong>Name:</strong> {viewContact.name}</p>
              <p><strong>Mobile:</strong> {viewContact.phone}</p>
              <p><strong>Group:</strong> {viewContact.group?.name || "N/A"}</p>
              <p><strong>Email:</strong> {viewContact.email || "N/A"}</p>
              <p><strong>Place:</strong> {viewContact.place || "N/A"}</p>
              <p><strong>DOB:</strong> {formatDate(viewContact.dob) || "N/A"}</p>
              <p><strong>Anniversary:</strong> {formatDate(viewContact.anniversary) || "N/A"}</p>
            </div>

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingContact(viewContact);
                  setFormData({ ...viewContact, group: viewContact.group?.name || "" });
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

      {/* Add/Edit Contact Modal */}
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
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
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
                  onChange={(e) => setFormData({ ...formData, anniversary: e.target.value })}
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
    </div>
  );
}