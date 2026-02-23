import { useState, useEffect, useRef, useMemo } from "react";
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
  const [tab, setTab] = useState("active"); // "active" | "trash"

  const [contacts, setContacts] = useState([]);
  const [trashContacts, setTrashContacts] = useState([]);

  // groups: [{id,name}]
  const [groups, setGroups] = useState([]);

  // IMPORTANT: filter by groupId (stable)
  const [selectedGroupFilterId, setSelectedGroupFilterId] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState(10);
  const limit = entries;

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);

  // modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [editingContact, setEditingContact] = useState(null);
  const [viewContact, setViewContact] = useState(null);

  // group modal state
  const [groupSearch, setGroupSearch] = useState("");
  const [newGroupName, setNewGroupName] = useState(""); // used for add + edit
  const [editingGroupId, setEditingGroupId] = useState(null); // which group is being edited

  // bulk import
  const [uploadedData, setUploadedData] = useState([]);
  const [fileName, setFileName] = useState("");
  const [selectedGroupIdForImport, setSelectedGroupIdForImport] = useState("");
  const [importing, setImporting] = useState(false);

  const { showSuccess, showError } = useToast();

  // form data: store groupId (not name)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    place: "",
    dob: "",
    anniversary: "",
    groupId: "",
  });

  // debounce
  const debounceTimer = useRef(null);
  const debouncedSearch = (val) => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      setSearchQuery(val.trim());
    }, 400);
  };

  // selection
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

  // fetch groups
  const fetchGroups = async () => {
    try {
      const resp = await groupAPI.getAll();
      const arr = Array.isArray(resp.data) ? resp.data : resp.data.data || [];
      setGroups(arr.map((g) => ({ id: g.id, name: g.name })));
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  // fetch contacts (send groupId)
  const fetchContacts = async (
    pg = page,
    lim = limit,
    search = searchQuery,
    groupId = selectedGroupFilterId
  ) => {
    setLoading(true);
    setError("");
    try {
      const resp = await contactAPI.getAll(pg, lim, search, groupId);

      const { data, pagination } = resp.data;
      setContacts(data || []);

      if (pagination) {
        setTotal(pagination.total || 0);
        setTotalPages(pagination.totalPages || 0);
      } else {
        const t = resp.data.total || 0;
        setTotal(t);
        setTotalPages(Math.ceil(t / lim));
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

  // Create or update group using same input
  const handleSaveGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      showError("Please enter group name");
      return;
    }

    try {
      if (editingGroupId) {
        await groupAPI.update(editingGroupId, { name });
        showSuccess("Group updated");
      } else {
        await groupAPI.create({ name });
        showSuccess("Group created");
      }

      setNewGroupName("");
      setEditingGroupId(null);
      await fetchGroups();
    } catch (e) {
      console.error(e);
      showError(
        editingGroupId ? "Failed to update group" : "Failed to create group"
      );
    }
  };

  const handleEditGroupClick = (group) => {
    setEditingGroupId(group.id);
    setNewGroupName(group.name); // fill the top input with group name
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setNewGroupName("");
  };

  const handleDeleteGroup = async (id, name) => {
    if (!window.confirm(`Delete group "${name}"?`)) return;
    try {
      await groupAPI.delete(id);
      showSuccess("Group deleted");
      await fetchGroups();

      // if deleted group was selected in filter, reset
      if (String(selectedGroupFilterId) === String(id)) {
        setSelectedGroupFilterId("");
        setPage(1);
      }
    } catch (e) {
      console.error(e);
      showError("Failed to delete group");
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    clearSelection();
    if (tab === "active") {
      fetchContacts(page, limit, searchQuery, selectedGroupFilterId);
    } else {
      fetchTrash();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, limit, searchQuery, selectedGroupFilterId]);

  // contact create/update
  const resetForm = () =>
    setFormData({
      name: "",
      phone: "",
      email: "",
      place: "",
      dob: "",
      anniversary: "",
      groupId: "",
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phone = formData.phone.replace(/[^0-9]/g, "");

    if (!formData.name.trim()) {
      setValidationError("Please enter a valid name.");
      return;
    }
    if (!editingContact && phone.length !== 10) {
      setValidationError("Please enter a valid 10‑digit phone number.");
      return;
    }
    if (!formData.groupId) {
      setValidationError("Please select a group.");
      return;
    }

    setValidationError("");
    setLoading(true);
    setError("");

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        place: formData.place || undefined,
        dob: formData.dob || undefined,
        anniversary: formData.anniversary || undefined,
        groupId: formData.groupId,
      };

      if (editingContact) {
        await contactAPI.update(editingContact.id, payload);
        showSuccess(`Successfully updated contact "${formData.name}"`);
      } else {
        await contactAPI.create(payload);
        showSuccess(`Successfully created contact "${formData.name}"`);
      }

      await fetchContacts(page, limit, searchQuery, selectedGroupFilterId);
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
      await fetchContacts(page, limit, searchQuery, selectedGroupFilterId);
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
    if (selectedIds.length === 0) return showError("Select contacts first");
    if (!window.confirm(`Delete ${selectedIds.length} contacts?`)) return;

    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => contactAPI.delete(id)));
      showSuccess(`Deleted ${selectedIds.length} contacts`);
      clearSelection();
      await fetchContacts(page, limit, searchQuery, selectedGroupFilterId);
    } catch (err) {
      console.error(err);
      showError("Failed to delete some contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleMultiRestore = async () => {
    if (selectedIds.length === 0) return showError("Select contacts first");
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

  // Bulk import
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
    if (uploadedData.length === 0)
      return showError("Please upload a file first");
    setImporting(true);

    let successCount = 0;
    let failCount = 0;
    const duplicateNumbers = [];

    // helper: map group name -> id
    const groupNameToId = new Map(
      groups.map((g) => [g.name.toLowerCase(), g.id])
    );

    try {
      for (const c of uploadedData) {
        try {
          const groupId =
            (c.group
              ? groupNameToId.get(String(c.group).toLowerCase())
              : null) || (selectedGroupIdForImport || null);

          await contactAPI.create({
            name: c.name,
            phone: c.phone,
            email: c.email || undefined,
            place: c.place || undefined,
            dob: c.dob || undefined,
            anniversary: c.anniversary || undefined,
            groupId: groupId || undefined,
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
      showSuccess(`Imported ${successCount} contact${successCount > 1 ? "s" : ""}`);
    if (duplicateNumbers.length > 0)
      showError(`Already registered numbers: ${duplicateNumbers.join(", ")}`);
    if (failCount > 0 && duplicateNumbers.length === 0)
      showError("Some contacts failed to import.");

    setUploadedData([]);
    setFileName("");
    setShowBulkModal(false);

    setTab("active");
    setPage(1);
    fetchContacts(1, limit, searchQuery, selectedGroupFilterId);
  };

  // helpers
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

  const controlStyle = useMemo(
    () => ({
      height: 40,
      padding: "0 10px",
      borderRadius: 8,
      border: "1px solid #e5e7eb",
      background: "#fff",
      outline: "none",
    }),
    []
  );

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, groupSearch]);

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
              onClick={() => setShowGroupsModal(true)}
            >
              Groups
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

      {/* Top controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* LEFT: entries / group / search */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}
        >
          {/* Show entries */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Show</span>
            <select
              value={entries}
              onChange={(e) => {
                setEntries(Number(e.target.value));
                setPage(1);
              }}
              disabled={tab === "trash"}
              style={controlStyle}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          {/* Group filter */}
          <select
            value={selectedGroupFilterId}
            onChange={(e) => {
              setSelectedGroupFilterId(e.target.value);
              setPage(1);
            }}
            disabled={tab === "trash"}
            style={{ ...controlStyle, minWidth: 180 }}
          >
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
            <Search size={20} />
            <input
              value={searchInput}
              onChange={(e) => {
                const v = e.target.value;
                setSearchInput(v);
                debouncedSearch(v);
              }}
              placeholder="Search name, contact..."
              disabled={tab === "trash"}
            />
          </div>
        </div>

        {/* RIGHT: count + buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "flex-end",
            whiteSpace: "nowrap",
          }}
        >
          {/* Count */}
          <div className="total-count">
            {tab === "active"
              ? `Total: ${total}`
              : `Trash: ${trashContacts.length}`}
          </div>

          {/* View Trash / View Contacts toggle */}
          <button
            className="btn-secondary btn-blue"
            onClick={() => {
              setTab((prev) => (prev === "active" ? "trash" : "active"));
              setPage(1);
              clearSelection();
            }}
          >
            {tab === "active" ? (
              // When on Contacts -> show "View Trash"
              <Trash2 size={18} />
            ) : (
              // When on Trash -> show "View Contacts"
              <Users size={18} />
            )}
            <span style={{ marginLeft: 6 }}>
              {tab === "active" ? "View Trash" : "View Contacts"}
            </span>
          </button>
          {/* Delete / Restore selected */}
          {tab === "active" ? (
            <button
              className="btn-secondary btn-red"
              onClick={handleMultiDelete}
              disabled={selectedIds.length === 0 || loading}
            >
              <Trash2 size={18} />
              <span style={{ marginLeft: 6 }}>Delete</span>
            </button>
          ) : (
            <button
              className="btn-secondary btn-green"
              onClick={handleMultiRestore}
              disabled={selectedIds.length === 0 || loading}
            >
              <RotateCcw size={18} />
              <span style={{ marginLeft: 6 }}>Restore</span>
            </button>
          )}
        </div>
      </div>

      {/* Error */}
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
          <p>
            {tab === "active"
              ? "No contacts found."
              : "No contacts in trash."}
          </p>
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
                ? contacts .filter((c) => c.group || c.groupId)    // ONLY grouped contacts
                .map((c, i) => (
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
                              name: c.name || "",
                              phone: c.phone || "",
                              email: c.email || "",
                              place: c.place || "",
                              dob: c.dob || "",
                              anniversary: c.anniversary || "",
                              groupId: c.group?.id || "",
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

      {/* Pagination */}
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

      {/* Groups Modal */}
      {showGroupsModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowGroupsModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 700 }}
          >
            <div className="modal-header">
              <h3>Groups</h3>
              <button
                className="close-btn"
                onClick={() => setShowGroupsModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search + Add / Update */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 12,
              }}
            >
              {/* Search bar on top */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  ...controlStyle,
                  padding: "0 10px",
                }}
              >
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search group..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    width: "100%",
                    height: 38,
                    background: "transparent",
                  }}
                />
              </div>

              {/* Add / Update Group row */}
              <div
                style={{ display: "flex", gap: 10, alignItems: "center" }}
              >
                <input
                  type="text"
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  style={{ ...controlStyle, flex: 1, minWidth: 220 }}
                />

                <button
                  className="btn-primary"
                  type="button"
                  onClick={handleSaveGroup}
                >
                  {editingGroupId ? "Update Group" : "Add Group"}
                </button>

                {editingGroupId && (
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={handleCancelEditGroup}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Groups table */}
            <div
              className="table-container"
              style={{ maxHeight: 320, overflowY: "auto" }}
            >
              <table className="contacts-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>S.No</th>
                    <th>Group Name</th>
                    <th style={{ width: 160, textAlign: "center" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        style={{ textAlign: "center", padding: 14 }}
                      >
                        No groups found
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((g, idx) => (
                      <tr key={g.id}>
                        <td>{idx + 1}</td>
                        <td>{g.name}</td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {/* Edit icon: fills top input and switches button to Update */}
                            <button
                              className="btn-icon"
                              title="Edit"
                              style={{ color: "#22c55e" }}
                              type="button"
                              onClick={() => handleEditGroupClick(g)}
                            >
                              <Edit2 size={16} />
                            </button>

                            {/* Delete icon */}
                            <button
                              className="btn-icon"
                              title="Delete"
                              style={{ color: "#ef4444" }}
                              type="button"
                              onClick={() =>
                                handleDeleteGroup(g.id, g.name)
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowGroupsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div
          className="modal-overlay"
          onClick={() => !importing && setShowBulkModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Bulk Import Contacts</h3>
              <button
                className="close-btn"
                onClick={() => !importing && setShowBulkModal(false)}
              >
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

              <div
                className="file-upload-container"
                style={{ marginTop: "12px" }}
              >
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
                    <span>
                      {uploadedData.length} contacts ready to import
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (importing) return;
                        setUploadedData([]);
                        setFileName("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
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
                  value={selectedGroupIdForImport}
                  onChange={(e) =>
                    setSelectedGroupIdForImport(e.target.value)
                  }
                  disabled={importing}
                >
                  <option value="">No Group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="modal-actions"
                style={{ marginTop: "16px" }}
              >
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
        <div
          className="modal-overlay"
          onClick={() => setViewContact(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600 }}
          >
            <div className="modal-header">
              <h3>Contact Details</h3>
              <button
                className="close-btn"
                onClick={() => setViewContact(null)}
              >
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
                <strong>Email:</strong> {viewContact.email || "N/A"}
              </p>
              <p>
                <strong>Place:</strong> {viewContact.place || "N/A"}
              </p>
              <p>
                <strong>DOB:</strong> {formatDate(viewContact.dob)}
              </p>
              <p>
                <strong>Anniversary:</strong>{" "}
                {formatDate(viewContact.anniversary)}
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingContact(viewContact);
                  setFormData({
                    name: viewContact.name || "",
                    phone: viewContact.phone || "",
                    email: viewContact.email || "",
                    place: viewContact.place || "",
                    dob: viewContact.dob || "",
                    anniversary: viewContact.anniversary || "",
                    groupId: viewContact.group?.id || "",
                  });
                  setViewContact(null);
                  setShowAddModal(true);
                }}
              >
                Edit
              </button>
              <button
                className="btn-secondary"
                onClick={() => setViewContact(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Contact Modal */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{editingContact ? "Edit Contact" : "Add New Contact"}</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {validationError && (
              <div
                style={{
                  background: "#fef2f2",
                  color: "#991b1b",
                  padding: "0.5rem 0.75rem",
                  borderRadius: 4,
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
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
                    if (v.length <= 10)
                      setFormData({ ...formData, phone: v });
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
                  value={formData.groupId}
                  onChange={(e) =>
                    setFormData({ ...formData, groupId: e.target.value })
                  }
                  required
                >
                  <option value="">Select Group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
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
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter email (optional)"
                />
              </div>

              <div className="form-group">
                <label>Place</label>
                <input
                  type="text"
                  value={formData.place}
                  onChange={(e) =>
                    setFormData({ ...formData, place: e.target.value })
                  }
                  placeholder="Enter place (optional)"
                />
              </div>

              <div className="form-group">
                <label>DOB</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) =>
                    setFormData({ ...formData, dob: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Anniversary</label>
                <input
                  type="date"
                  value={formData.anniversary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      anniversary: e.target.value,
                    })
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

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
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