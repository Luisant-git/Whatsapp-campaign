import React, { useState, useEffect } from "react";
import {
  IoCheckmarkOutline,
  IoCloseSharp,
  IoSendSharp,
} from "react-icons/io5";
import { sendBulkMessages } from "../api/whatsapp";
import { getSettings } from "../api/auth";
import { groupAPI } from "../api/group";
import { useToast } from "../contexts/ToastContext";
import "../styles/BulkWhatsApps.scss";

const BulkWhatsApp = () => {
  const { showSuccess, showError } = useToast();
  const [phoneNumbers, setPhoneNumbers] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [scheduleType, setScheduleType] = useState("one-time");
  const [scheduledDays, setScheduledDays] = useState([]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [campaignName, setCampaignName] = useState("");
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupContactsCount, setGroupContactsCount] = useState(0);

  const daysOfWeek = [
    { value: "sunday", label: "Sunday" },
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
  ];

  useEffect(() => {
    // Fetch WhatsApp template details
    const fetchSettings = async () => {
      try {
        const settings = await getSettings();
        if (settings?.templateName) setTemplateName(settings.templateName);
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();

    // Fetch all groups for dropdown
    const fetchGroups = async () => {
      try {
        const resp = await groupAPI.getAll();
        const allGroups = Array.isArray(resp.data)
          ? resp.data
          : resp.data.data || [];
        setGroups(allGroups);
      } catch (error) {
        console.error("Error loading groups", error);
        showError("Failed to load groups");
      }
    };
    fetchGroups();
  }, []);

  const handleDayToggle = (day) =>
    setScheduledDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );

  const handleSendBulkMessages = async () => {
    let dataToSend = [];

    // 1️⃣ Fetch group contacts if group is selected
    if (selectedGroup) {
      try {
        const resp = await groupAPI.getContacts(selectedGroup);
        if (resp.data && resp.data.length > 0) {
          dataToSend.push(
            ...resp.data.map((c) => ({
              name: c.name || "",
              phone: c.phone || "",
            }))
          );
        } else {
          showError("Selected group has no contacts");
        }
      } catch (error) {
        console.error("Error fetching group contacts:", error);
        showError("Failed to load group contacts");
      }
    }

    // 2️⃣ Add manually entered numbers
    if (phoneNumbers.trim()) {
      const lines = phoneNumbers
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);
      const manualContacts = lines
        .map((line) => {
          const [phone, name] = line.split(",").map((s) => s.trim());
          return { name: name || "", phone: phone || "" };
        })
        .filter((c) => c.phone);
      dataToSend.push(...manualContacts);
    }

    // 3️⃣ Validate combined set
    if (dataToSend.length === 0) {
      showError("Please enter phone numbers or select a group with contacts");
      return;
    }

    // 4️⃣ Other validations
    if (!campaignName.trim()) {
      showError("Please enter a campaign name");
      return;
    }
    if (!templateName.trim()) {
      showError("Template name is required. Check your settings.");
      return;
    }
    if (scheduleType === "time-based" && scheduledDays.length === 0) {
      showError("Please select at least one day for time-based scheduling");
      return;
    }

    // 5️⃣ Compose campaign payload
    const campaignData = {
      name: campaignName,
      contacts: dataToSend,
      templateName,
      scheduleType,
      groupId: Number(selectedGroup) || undefined,
      ...(scheduleType === "time-based" && {
        scheduledDays,
        scheduledTime,
      }),
    };

    // 6️⃣ Send campaign
    setLoading(true);
    try {
      const response = await sendBulkMessages(campaignData);
      console.log("API Response:", response);

      const resultsArray = Array.isArray(response?.results)
        ? response.results
        : Array.isArray(response)
        ? response
        : [];

      if (!Array.isArray(resultsArray)) {
        throw new Error("Invalid response from server");
      }

      setResults(resultsArray);
      const successCount = resultsArray.filter((r) => r.success).length;
      const failedCount = resultsArray.filter((r) => !r.success).length;

      if (scheduleType === "time-based") {
        showSuccess(
          `Campaign scheduled for ${scheduledDays.join(", ")} at ${scheduledTime}`
        );
      } else if (failedCount > 0) {
        showSuccess(`Sent: ${successCount} | Failed: ${failedCount}`);
        showError("Some contacts may not be valid on WhatsApp.");
      } else {
        showSuccess(`Successfully sent to all ${successCount} contacts!`);
      }
    } catch (error) {
      console.error("Error sending bulk messages:", error);
      showError(`Failed to send messages: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bulk-whatsapp">
      <div className="page-header">
        <div className="page-title">
          <h1>Campaign Messages</h1>
          <span className="page-subtitle">
            Send promotional messages to multiple customers
          </span>
        </div>
      </div>

      <div className="content-grid">
        {/* FORM SECTION */}
        <div className="form-section">
          {/* Campaign Name */}
          <div className="form-group">
            <label className="form-label">
              Campaign Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Enter campaign name (e.g., Black Friday Sale)"
            />
          </div>

          {/* Template Name */}
          <div className="form-group">
            <label className="form-label">
              Template Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={templateName}
              disabled
            />
          </div>

          {/* Schedule Type */}
          <div className="form-group">
            <label className="form-label">Scheduling Type</label>
            <div className="schedule-type-selector">
              <label className="radio-option">
                <input
                  type="radio"
                  value="one-time"
                  checked={scheduleType === "one-time"}
                  onChange={(e) => setScheduleType(e.target.value)}
                />
                <span>Send Now (One-time)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="time-based"
                  checked={scheduleType === "time-based"}
                  onChange={(e) => setScheduleType(e.target.value)}
                />
                <span>Time-based Scheduling</span>
              </label>
            </div>
          </div>

          {/* If Time-Based */}
          {scheduleType === "time-based" && (
            <>
              <div className="form-group">
                <label className="form-label">Select Days</label>
                <div className="days-selector">
                  {daysOfWeek.map((day) => (
                    <label key={day.value} className="day-option">
                      <input
                        type="checkbox"
                        checked={scheduledDays.includes(day.value)}
                        onChange={() => handleDayToggle(day.value)}
                      />
                      <span>{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Time (IST)</label>
                <input
                  type="time"
                  className="form-input time-input"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
                <small className="form-hint">
                  Time will be in Indian Standard Time (IST)
                </small>
              </div>
            </>
          )}

          {/* Group Selection */}
          <div className="form-group">
            <label className="form-label">Select Group (optional)</label>
            <select
  className="form-input"
  value={selectedGroup}
  onChange={async (e) => {
    const groupId = e.target.value;
    setSelectedGroup(groupId);
    if (!groupId) {
      setGroupContactsCount(0);
      return;
    }
    try {
      const resp = await groupAPI.getContacts(groupId);
      if (resp.data && resp.data.length > 0) {
        setGroupContactsCount(resp.data.length);   // ✅ store total contacts
      } else {
        setGroupContactsCount(0);
        showError("Selected group has no contacts");
      }
    } catch (err) {
      console.error("Error fetching group contacts:", err);
      showError("Failed to load group contacts");
      setGroupContactsCount(0);
    }
  }}
>
  <option value="">No Group</option>
  {groups.map((g) => (
    <option key={g.id} value={g.id}>
      {g.name}
    </option>
  ))}
</select>

{/* 👇  show count text here */}
{selectedGroup && (
  <small
    style={{
      color: groupContactsCount > 0 ? '#00b686' : '#e74c3c',
      fontWeight: 600,
      marginTop: 6,
      display: 'block',
    }}
  >
    {groupContactsCount > 0
      ? `${groupContactsCount} contact${groupContactsCount > 1 ? 's' : ''} in this group`
      : 'No contacts found in this group'}
  </small>
)}
          </div>
          

          {/* Manual Numbers */}
          <div className="manual-input-section">
            <div className="form-group">
              <label className="form-label">
                Phone Numbers with Customer Names (one per line)
              </label>
              <textarea
                rows="8"
                className="form-textarea"
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder="919876543210,John Doe&#10;919876543211,Jane Smith"
              />
              <small className="form-hint">
                Format: PhoneNumber,CustomerName
              </small>
            </div>
          </div>

          {/* SEND BUTTON */}
          <div className="form-actions">
            <button
              className={`send-btn ${loading ? "loading" : ""}`}
              onClick={handleSendBulkMessages}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Sending Messages...
                </>
              ) : (
                <>
                  <IoSendSharp size={20} /> Send Campaign Messages
                </>
              )}
            </button>
          </div>
        </div>

        {/* RESULTS SECTION */}
        {results && (
          <div className="results-section">
            <div className="results-header">
              <h2>Delivery Results</h2>
              <div className="results-summary">
                <span className="success-count">
                  {results.filter((r) => r.success).length} Sent
                </span>
                <span className="failed-count">
                  {results.filter((r) => !r.success).length} Failed
                </span>
              </div>
            </div>

            <div className="results-list">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`result-item ${r.success ? "success" : "error"}`}
                >
                  <div className="result-info">
                    <div className="result-phone">
                      {r.phoneNumber || r.phone || r.to}
                    </div>
                    {r.name && <div className="result-name">{r.name}</div>}
                    {!r.success && r.error && (
                      <div className="result-error-msg">{r.error}</div>
                    )}
                  </div>
                  <div className="result-status">
                    <span
                      className={`status-icon ${
                        r.success ? "success" : "error"
                      }`}
                    >
                      {r.success ? (
                        <IoCheckmarkOutline size={16} />
                      ) : (
                        <IoCloseSharp size={16} />
                      )}
                    </span>
                    <span className="status-text">
                      {r.success ? "Delivered" : "Failed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkWhatsApp;