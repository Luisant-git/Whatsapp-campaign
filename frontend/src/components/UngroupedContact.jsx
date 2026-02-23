import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

import { contactAPI } from "../api/contact";
import { groupAPI } from "../api/group.js";
import { useToast } from "../contexts/ToastContext";

import "../styles/Ungrouped.css";

export default function UngroupedContact() {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkGroupId, setBulkGroupId] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState(10);
  const limit = entries;

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { showSuccess, showError } = useToast?.() || {
    showSuccess: () => {},
    showError: () => {},
  };

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

  // selection helpers
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

  const fetchGroups = async () => {
    try {
      const resp = await groupAPI.getAll();
      const arr = Array.isArray(resp.data) ? resp.data : resp.data.data || [];
      setGroups(arr.map((g) => ({ id: g.id, name: g.name })));
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  const fetchUngrouped = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await contactAPI.getAll(1, 5000, searchQuery, "");
      const list = resp.data?.data || resp.data || [];

      const ungroupedAll = list.filter((c) => !c.group && !c.groupId);

      const t = ungroupedAll.length;
      const tp = Math.max(1, Math.ceil(t / limit));
      const safePage = Math.min(page, tp);

      const start = (safePage - 1) * limit;
      const pageItems = ungroupedAll.slice(start, start + limit);

      setContacts(pageItems);
      setTotal(t);
      setTotalPages(tp);

      if (safePage !== page) setPage(safePage);
    } catch (err) {
      console.error("Failed to fetch ungrouped contacts", err);
      setError("Unable to load ungrouped contacts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    clearSelection();
    fetchUngrouped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, searchQuery]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const headerCheckboxChecked =
    contacts.length > 0 && contacts.every((c) => selectedIds.includes(c.id));

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) return showError("Select contacts first");
    if (!bulkGroupId) return showError("Please select a group");
    if (!window.confirm(`Assign group to ${selectedIds.length} contacts?`))
      return;

    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const c = contacts.find((x) => x.id === id);
          return contactAPI.update(id, {
            name: c?.name || c?.phone || "Unnamed",
            groupId: bulkGroupId,
          });
        })
      );

      showSuccess("Group assigned successfully");
      setBulkGroupId("");
      clearSelection();
      fetchUngrouped();
    } catch (err) {
      console.error(err);
      showError("Failed to assign group. Please try again.");
    }
  };

  const handleAssignSingle = async (contact) => {
    if (!bulkGroupId) return showError("Select a group (top dropdown) first");

    try {
      await contactAPI.update(contact.id, {
        name: contact.name || contact.phone || "Unnamed",
        groupId: bulkGroupId,
      });

      showSuccess("Contact moved to Contacts");
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      setSelectedIds((prev) => prev.filter((x) => x !== contact.id));
      fetchUngrouped();
    } catch (err) {
      console.error(err);
      showError("Failed to move contact. Please try again.");
    }
  };

  return (
    <div className="contact-container">
      {/* Header */}
      <div className="contact-header">
        <div className="header-left">
          <Users size={24} />
          <h2>Ungrouped Contacts</h2>
        </div>

        {/* bulk assign */}
        <div className="header-actions">
          <select
            value={bulkGroupId}
            onChange={(e) => setBulkGroupId(e.target.value)}
            style={{ ...controlStyle, minWidth: 220 }}
            disabled={loading}
          >
            <option value="">Select Group to Assign</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <button
            className="btn-primary"
            type="button"
            onClick={handleBulkAssign}
            disabled={loading || selectedIds.length === 0 || !bulkGroupId}
          >
            Assign to Selected
          </button>
        </div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          {/* entries */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Show</span>
            <select
              value={entries}
              onChange={(e) => {
                setEntries(Number(e.target.value));
                setPage(1);
              }}
              style={controlStyle}
              disabled={loading}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          {/* search */}
          <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
            <Search size={20} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or number..."
              disabled={loading}
            />
          </div>
        </div>

        <div className="total-count">Total: {total}</div>
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
      {loading && contacts.length === 0 ? (
        <div className="empty-state">
          <Loader2 size={48} className="spin" />
          <p>Loading…</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>No ungrouped contacts.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="contacts-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={headerCheckboxChecked}
                    onChange={() => selectAllCurrent(contacts)}
                  />
                </th>
                <th>S.No</th>
                <th>Name</th>
                <th>Mobile</th>
                <th style={{ width: 80, textAlign: "center" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {contacts.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </td>
                  <td>{(page - 1) * limit + i + 1}</td>
                  <td>{c.name || "Unnamed"}</td>
                  <td>{c.phone || "—"}</td>

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
                      <button
                        className="btn-icon"
                        title={
                          !bulkGroupId
                            ? "Select group at top first"
                            : "Move to Contacts"
                        }
                        type="button"
                        onClick={() => handleAssignSingle(c)}
                        disabled={loading || !bulkGroupId}
                        style={{ color: "#22c55e" }}
                      >
                        <ArrowRight size={16} />
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
    </div>
  );
}