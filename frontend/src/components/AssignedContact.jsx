import { useEffect, useMemo, useState } from "react";
import { Users, Search, Loader2, AlertCircle } from "lucide-react";
import Select from "react-select";

import { getTenantSubUsers } from "../api/subuser";
import { getAllChatAssignments } from "../api/whatsapp";
import "../styles/AssignedContact.css";

export default function AssignedContacts() {
  const [assignments, setAssignments] = useState([]);
  const [subUsers, setSubUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const tenantId = Number(localStorage.getItem("tenantId"));

      const [assignmentList, userList] = await Promise.all([
        getAllChatAssignments(),
        getTenantSubUsers(tenantId),
      ]);

      setAssignments(Array.isArray(assignmentList) ? assignmentList : []);
      setSubUsers(Array.isArray(userList) ? userList : []);
    } catch (err) {
      console.error("Failed to load assigned contacts", err);
      setError("Failed to load assigned contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const userOptions = useMemo(
    () => [
      { value: "", label: "All Users" },
      ...subUsers.map((u) => ({
        value: String(u.id),
        label: u.email,
      })),
    ],
    [subUsers]
  );

  const groupOptions = useMemo(() => {
    const uniqueGroups = Array.from(
      new Map(
        assignments
          .filter((a) => a.groupName)
          .map((a) => [a.groupName, { value: a.groupName, label: a.groupName }])
      ).values()
    );

    return [{ value: "", label: "All Groups" }, ...uniqueGroups];
  }, [assignments]);

  const selectedUserOption =
    userOptions.find((opt) => opt.value === selectedUserId) || userOptions[0];

  const selectedGroupOption =
    groupOptions.find((opt) => opt.value === selectedGroup) || groupOptions[0];

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return assignments.filter((item) => {
      const matchUser = selectedUserId
        ? String(item.subUserId) === String(selectedUserId)
        : true;

      const matchGroup = selectedGroup
        ? String(item.groupName || "") === String(selectedGroup)
        : true;

      const matchSearch =
        !q ||
        (item.phone || "").toLowerCase().includes(q) ||
        (item.contactName || "").toLowerCase().includes(q) ||
        (item.subUserEmail || "").toLowerCase().includes(q) ||
        (item.groupName || "").toLowerCase().includes(q);

      return matchUser && matchGroup && matchSearch;
    });
  }, [assignments, selectedUserId, selectedGroup, searchQuery]);

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 42,
      borderRadius: 8,
      borderColor: state.isFocused ? "#25d366" : "#e5e7eb",
      boxShadow: state.isFocused
        ? "0 0 0 3px rgba(37, 211, 102, 0.10)"
        : "none",
      "&:hover": {
        borderColor: "#25d366",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 10px",
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#25d366"
        : state.isFocused
        ? "#f0fdf4"
        : "#fff",
      color: state.isSelected ? "#fff" : "#111827",
      cursor: "pointer",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
  };

  return (
    <div className="assigned-container">
      <div className="assigned-header">
        <div className="header-left">
          <Users size={24} />
          <h2>Assigned Contacts</h2>
        </div>
      </div>

      <div className="assigned-filters">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search phone, contact, user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="assigned-select-wrap">
          <Select
            options={userOptions}
            value={selectedUserOption}
            onChange={(selected) => setSelectedUserId(selected?.value ?? "")}
            isSearchable
            placeholder="Search user..."
            styles={selectStyles}
          />
        </div>

        <div className="assigned-select-wrap">
          <Select
            options={groupOptions}
            value={selectedGroupOption}
            onChange={(selected) => setSelectedGroup(selected?.value ?? "")}
            isSearchable
            placeholder="Search group..."
            styles={selectStyles}
          />
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <Loader2 size={42} className="spin" />
          <p>Loading assigned contacts...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="empty-state">
          <Users size={42} />
          <p>No assigned contacts found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="assigned-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Assigned User</th>
                <th>Group</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.contactName || "Unknown"}</td>
                  <td>{item.phone}</td>
                  <td>{item.subUserEmail || "-"}</td>
                  <td>{item.groupName || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}