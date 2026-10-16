import React, { useState, useEffect, useMemo } from "react";
import {
  IoCheckmarkOutline,
  IoCloseSharp,
  IoSendSharp,
  IoCloudUploadOutline,
} from "react-icons/io5";
import {
  Users,
  FileSpreadsheet,
  Plus,
  Trash2,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  X,
  Layers,
} from "lucide-react";
import * as XLSX from "xlsx";
import { sendBulkMessages } from "../api/whatsapp";
import { getAllSettings } from "../api/auth";
import { groupAPI } from "../api/group";
import { useToast } from "../contexts/ToastContext";
import MetaSendingWindowBar from "./MetaSendingWindowBar";
import "../styles/BulkWhatsApps.scss";

const BulkWhatsApp = () => {
  const { showSuccess, showError, showConfirm } = useToast();

  // Campaign settings state
  const [campaignName, setCampaignName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [scheduleType, setScheduleType] = useState("one-time");
  const [scheduledDays, setScheduledDays] = useState([]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  // Groups and settings from backend
  const [settings, setSettings] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupContactsCount, setGroupContactsCount] = useState(0);

  // Audience Manager State
  const [audienceContacts, setAudienceContacts] = useState([]);
  const [audienceTab, setAudienceTab] = useState("file"); // "file" | "group" | "manual"
  const [campaignFileName, setCampaignFileName] = useState("");
  const [fileStats, setFileStats] = useState(null);
  const [manualText, setManualText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [rightPanelTab, setRightPanelTab] = useState("audience"); // "audience" | "results"

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
    const fetchSettings = async () => {
      try {
        const data = await getAllSettings();
        const settingsList = Array.isArray(data) ? data : [];
        setSettings(settingsList);
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();

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

  // Listen to composeCampaignData or resendFailedData from other pages
  useEffect(() => {
    if (window.composeCampaignData) {
      if (window.composeCampaignData.campaignName) {
        setCampaignName(window.composeCampaignData.campaignName);
      }
      if (window.composeCampaignData.contacts) {
        const lines = String(window.composeCampaignData.contacts).split("\n").filter(Boolean);
        const parsed = lines.map((line, idx) => {
          const [phone, name] = line.split(",").map((s) => s.trim());
          const clean = formatPhone(phone);
          return { id: `ext-${Date.now()}-${idx}`, name: name || "", phone: clean, source: "External" };
        }).filter(c => c.phone);
        setAudienceContacts(parsed);
      }
      if (window.composeCampaignData.groupId) {
        const gid = String(window.composeCampaignData.groupId);
        setSelectedGroup(gid);
        groupAPI.getContacts(gid).then((resp) => {
          if (resp.data && resp.data.length > 0) {
            setGroupContactsCount(resp.data.length);
          }
        }).catch(() => {});
      }
      delete window.composeCampaignData;
    }

    if (window.resendFailedData) {
      if (Array.isArray(window.resendFailedData)) {
        const failedContacts = window.resendFailedData
          .filter((c) => c.phone)
          .map((c, idx) => ({
            id: `resend-${Date.now()}-${idx}`,
            name: c.name || "",
            phone: formatPhone(c.phone),
            source: "Resend Failed",
          }))
          .filter(c => c.phone);
        setAudienceContacts(failedContacts);
      }
      delete window.resendFailedData;
    }
  }, []);

  const uniqueTemplateNames = useMemo(() => {
    return [...new Set(settings.map((item) => item.templateName).filter(Boolean))];
  }, [settings]);

  // Clean and format phone number for WhatsApp
  const formatPhone = (val) => {
    if (!val) return "";
    let s = typeof val === "number" ? val.toFixed(0) : String(val);
    s = s.replace(/[^0-9+]/g, "").trim();
    if (s.startsWith("+")) s = s.substring(1);
    // If 10 digits and starts with 6,7,8,9, prepend 91 (standard Indian mobile)
    if (/^[6-9]\d{9}$/.test(s)) {
      s = "91" + s;
    }
    return s;
  };

  // Robust column detector that correctly handles exported reports
  const detectColumns = (sampleRows) => {
    if (!sampleRows || sampleRows.length === 0) return { phoneCol: null, nameCol: null };
    const firstRow = sampleRows[0];
    const keys = Object.keys(firstRow);

    let phoneCol = null;
    let nameCol = null;

    // 1. Check for unambiguous phone headers
    const phoneRegex = /^(phone|mobile|cell|whatsapp|wa_id|msisdn|tel|number)$/i;
    const phoneSubRegex = /(phone_number|mobile_number|contact_no|contact_number|cell_number|phone_no|mobile_no|whatsapp_no)/i;
    
    phoneCol = keys.find((k) => phoneRegex.test(k.trim().toLowerCase())) ||
               keys.find((k) => phoneSubRegex.test(k.trim().toLowerCase()));

    // 2. Check for unambiguous name headers
    const nameRegex = /^(name|customer|customer_name|contact_name|client|fullname|full_name|user|contact)$/i;
    const candidates = keys.filter((k) => nameRegex.test(k.trim().toLowerCase()));

    // If 'contact' is one of the candidates: check if its values are names or numbers
    for (const cand of candidates) {
      if (/^contact$/i.test(cand.trim())) {
        const sampleVal = String(firstRow[cand] || "").trim();
        const isNumeric = sampleVal.replace(/\D/g, "").length >= 8 && !/[a-zA-Z]/.test(sampleVal);
        if (isNumeric && !phoneCol) {
          phoneCol = cand;
        } else if (!isNumeric && !nameCol) {
          nameCol = cand;
        }
      } else if (!nameCol) {
        nameCol = cand;
      }
    }

    // 3. Fallback: If phone column is still not found, inspect row values
    if (!phoneCol) {
      for (const k of keys) {
        const hasPhoneValues = sampleRows.some((row) => {
          const clean = String(row[k] || "").replace(/\D/g, "");
          return clean.length >= 10 && clean.length <= 15;
        });
        if (hasPhoneValues && k !== nameCol) {
          phoneCol = k;
          break;
        }
      }
    }

    return { phoneCol, nameCol };
  };

  // Handle Excel or CSV file upload with smart parsing
  const handleFileUpload = (file) => {
    if (!file) return;

    setCampaignFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!rows || rows.length === 0) {
          showError("Uploaded file is empty");
          return;
        }

        const { phoneCol, nameCol } = detectColumns(rows);

        if (!phoneCol) {
          showError(
            "Could not identify a Phone Number column. Please ensure a column is titled 'Phone' or 'Mobile'."
          );
          return;
        }

        const newContacts = [];
        const seenPhones = new Set();
        let invalidCount = 0;

        rows.forEach((row, idx) => {
          const rawPhone = row[phoneCol];
          const rawName = nameCol ? row[nameCol] : "";
          const cleanPhone = formatPhone(rawPhone);

          if (cleanPhone && cleanPhone.length >= 10 && cleanPhone.length <= 15) {
            if (!seenPhones.has(cleanPhone)) {
              seenPhones.add(cleanPhone);
              newContacts.push({
                id: `file-${Date.now()}-${idx}`,
                name: String(rawName || "").trim(),
                phone: cleanPhone,
                source: "Excel File",
              });
            }
          } else if (rawPhone) {
            invalidCount++;
          }
        });

        if (newContacts.length === 0) {
          showError("No valid phone numbers found in file. Ensure phone numbers have 10-15 digits.");
          return;
        }

        setAudienceContacts(newContacts);
        setFileStats({
          fileName: file.name,
          total: rows.length,
          valid: newContacts.length,
          duplicates: rows.length - newContacts.length - invalidCount,
          invalid: invalidCount,
        });
        setCurrentPage(1);

        let msg = `Loaded ${newContacts.length} valid contacts from ${file.name}`;
        if (invalidCount > 0) {
          msg += ` (${invalidCount} invalid rows ignored)`;
        }
        showSuccess(msg);
      } catch (err) {
        console.error("Error reading file:", err);
        showError("Failed to parse file. Please verify format.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Download sample template for user
  const handleDownloadSample = () => {
    try {
      const data = [
        ["Name", "Phone"],
        ["John Doe", "919876543210"],
        ["Jane Smith", "919876543211"],
        ["Rajesh Kumar", "919876543212"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contacts");
      XLSX.writeFile(wb, "Sample_Campaign_Contacts.xlsx");
      showSuccess("Sample template downloaded");
    } catch (err) {
      console.error(err);
      showError("Failed to generate sample template");
    }
  };

  // Add contacts from selected group
  const handleAddGroupContacts = async () => {
    if (!selectedGroup) {
      showError("Please select a group first");
      return;
    }

    try {
      setLoading(true);
      const resp = await groupAPI.getContacts(selectedGroup);
      const groupData = resp.data || [];
      const groupObj = groups.find((g) => String(g.id) === String(selectedGroup));
      const groupName = groupObj ? groupObj.name : "Group";

      if (groupData.length === 0) {
        showError(`Group "${groupName}" has no contacts`);
        return;
      }

      const existingPhones = new Set(audienceContacts.map((c) => c.phone));
      const newContacts = [];

      groupData.forEach((c, idx) => {
        const clean = formatPhone(c.phone);
        if (clean && !existingPhones.has(clean)) {
          existingPhones.add(clean);
          newContacts.push({
            id: `grp-${Date.now()}-${idx}`,
            name: c.name || "",
            phone: clean,
            source: `Group: ${groupName}`,
          });
        }
      });

      if (newContacts.length === 0) {
        showSuccess(`All ${groupData.length} contacts from "${groupName}" are already in audience`);
        return;
      }

      setAudienceContacts((prev) => [...prev, ...newContacts]);
      showSuccess(`Added ${newContacts.length} contacts from "${groupName}" to audience`);
    } catch (err) {
      console.error(err);
      showError("Failed to load group contacts");
    } finally {
      setLoading(false);
    }
  };

  // Parse and add manual text
  const handleAddManualContacts = () => {
    if (!manualText.trim()) {
      showError("Please enter at least one phone number");
      return;
    }

    const lines = manualText.split("\n").map((s) => s.trim()).filter(Boolean);
    const existingPhones = new Set(audienceContacts.map((c) => c.phone));
    const newContacts = [];

    lines.forEach((line, idx) => {
      const parts = line.split(/[,\t-]/).map((s) => s.trim());
      let phone = "";
      let name = "";

      if (parts.length >= 2) {
        if (/^\+?\d+$/.test(parts[0].replace(/\D/g, ""))) {
          phone = parts[0];
          name = parts.slice(1).join(" ");
        } else {
          name = parts[0];
          phone = parts[1];
        }
      } else {
        phone = parts[0];
      }

      const clean = formatPhone(phone);
      if (clean && clean.length >= 10 && clean.length <= 15) {
        if (!existingPhones.has(clean)) {
          existingPhones.add(clean);
          newContacts.push({
            id: `man-${Date.now()}-${idx}`,
            name: name || "",
            phone: clean,
            source: "Manual",
          });
        }
      }
    });

    if (newContacts.length === 0) {
      showError("No valid new phone numbers parsed (must be 10-15 digits)");
      return;
    }

    setAudienceContacts((prev) => [...prev, ...newContacts]);
    setManualText("");
    showSuccess(`Added ${newContacts.length} contacts to audience`);
  };

  // Remove individual contact
  const handleRemoveContact = (id) => {
    setAudienceContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // Clear all audience
  const handleClearAudience = async () => {
    if (audienceContacts.length === 0) return;
    const confirmed = await showConfirm(
      `Clear all ${audienceContacts.length} contacts from current audience?`
    );
    if (!confirmed) return;
    setAudienceContacts([]);
    setCampaignFileName("");
    setFileStats(null);
    setCurrentPage(1);
    showSuccess("Audience cleared");
  };

  // Filtered contacts based on search query
  const filteredAudience = useMemo(() => {
    if (!searchQuery.trim()) return audienceContacts;
    const q = searchQuery.toLowerCase().trim();
    return audienceContacts.filter(
      (c) =>
        c.phone.toLowerCase().includes(q) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.source && c.source.toLowerCase().includes(q))
    );
  }, [audienceContacts, searchQuery]);

  // Pagination for audience preview table
  const totalPages = Math.ceil(filteredAudience.length / itemsPerPage) || 1;
  const paginatedAudience = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAudience.slice(start, start + itemsPerPage);
  }, [filteredAudience, currentPage, itemsPerPage]);

  const handleDayToggle = (day) => {
    setScheduledDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const parseScheduledTime = (timeStr) => {
    if (!timeStr) return { h: 9, m: 0, ampm: "AM" };
    let [h, m] = timeStr.split(":").map(Number);
    return { h: h % 12 || 12, m, ampm: h >= 12 ? "PM" : "AM" };
  };

  const handleTimeChange = (type, val) => {
    let { h, m, ampm } = parseScheduledTime(scheduledTime);
    if (type === "h") h = val;
    if (type === "m") m = val;
    if (type === "ampm") ampm = val;
    let h24 = (h % 12) + (ampm === "PM" ? 12 : 0);
    setScheduledTime(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  // Send Bulk Messages
  const handleSendBulkMessages = async () => {
    setResults(null);

    // Validate campaign parameters
    if (!campaignName.trim()) {
      showError("Please enter a campaign name");
      return;
    }
    if (!templateName) {
      showError("Please select a template");
      return;
    }
    if (scheduleType === "time-based" && scheduledDays.length === 0) {
      showError("Please select at least one day for time-based scheduling");
      return;
    }

    // Build contacts payload
    let dataToSend = audienceContacts.map((c) => ({
      name: c.name || "",
      phone: c.phone || "",
    }));

    // If audience list is empty but a group was selected, auto-load that group
    if (dataToSend.length === 0 && selectedGroup) {
      try {
        const resp = await groupAPI.getContacts(selectedGroup);
        if (resp.data && resp.data.length > 0) {
          dataToSend = resp.data.map((c) => ({
            name: c.name || "",
            phone: formatPhone(c.phone),
          })).filter(c => c.phone);
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (dataToSend.length === 0) {
      showError("Please load contacts via Excel/CSV, select a group, or enter numbers");
      return;
    }

    // Confirm launch
    let confirmMsg = `Start campaign "${campaignName}" for ${dataToSend.length} contact${dataToSend.length > 1 ? "s" : ""}? It will run in the background. Continue?`;
    if (dataToSend.length > 2000) {
      confirmMsg = `⚠️ Sending to ${dataToSend.length} contacts. Batches under 2000 contacts are recommended. Continue?`;
    }

    const confirmed = await showConfirm(confirmMsg);
    if (!confirmed) return;

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

    setLoading(true);
    try {
      const response = await sendBulkMessages(campaignData);
      if (response.success) {
        showSuccess(
          response.message ||
            `Campaign started! Dispatching to ${dataToSend.length} contacts in background.`
        );
        // Clear campaign configuration
        setCampaignName("");
        setTemplateName("");
        setScheduledDays([]);
        setScheduledTime("09:00");
        setScheduleType("one-time");
      } else {
        throw new Error(response.message || "Failed to start campaign");
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
            Compose and launch targeted WhatsApp campaigns with ease
          </span>
        </div>
      </div>

      <MetaSendingWindowBar />

      <div className="content-grid">
        {/* COLUMN 1: CAMPAIGN CONFIGURATION */}
        <div className="form-section">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <FileText size={20} color="#059669" />
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              1. Campaign Details
            </h2>
          </div>

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
              placeholder="e.g. Deepavali Mega Sale 2026"
            />
          </div>

          {/* Template Selector */}
          <div className="form-group">
            <label className="form-label">
              Template <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            >
              <option value="">Select an Approved Meta Template</option>
              {uniqueTemplateNames.map((name, index) => (
                <option key={`template-${index}`} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Scheduling Options */}
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

          {/* Time-Based Scheduling Controls */}
          {scheduleType === "time-based" && (
            <>
              <div className="form-group">
                <label className="form-label">Select Days</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {daysOfWeek.map((day) => {
                    const isSelected = scheduledDays.includes(day.value);
                    return (
                      <label
                        key={day.value}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          fontSize: "13px",
                          padding: "8px 14px",
                          border: `1px solid ${isSelected ? "#1877f2" : "#ced0d4"}`,
                          borderRadius: "8px",
                          backgroundColor: isSelected ? "#e7f3ff" : "white",
                          color: isSelected ? "#1877f2" : "#1c1e21",
                          fontWeight: isSelected ? "600" : "500",
                          transition: "all 0.2s ease",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleDayToggle(day.value)}
                          style={{ accentColor: "#1877f2", margin: 0, width: "16px", height: "16px" }}
                        />
                        {day.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Time (IST)</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {(() => {
                    const { h, m, ampm } = parseScheduledTime(scheduledTime);
                    return (
                      <>
                        <select
                          value={h}
                          onChange={(e) => handleTimeChange("h", Number(e.target.value))}
                          style={{
                            width: "auto",
                            padding: "8px 12px",
                            border: "1px solid #ced0d4",
                            borderRadius: "6px",
                            backgroundColor: "white",
                          }}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                            <option key={hour} value={hour}>
                              {String(hour).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                        <span style={{ fontWeight: "600", color: "#1c1e21" }}>:</span>
                        <select
                          value={m}
                          onChange={(e) => handleTimeChange("m", Number(e.target.value))}
                          style={{
                            width: "auto",
                            padding: "8px 12px",
                            border: "1px solid #ced0d4",
                            borderRadius: "6px",
                            backgroundColor: "white",
                          }}
                        >
                          {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                            <option key={minute} value={minute}>
                              {String(minute).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                        <div style={{ display: "flex", borderRadius: "6px", background: "#f0f2f5", padding: "2px" }}>
                          <button
                            type="button"
                            onClick={() => handleTimeChange("ampm", "AM")}
                            style={{
                              padding: "6px 12px",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "600",
                              backgroundColor: ampm === "AM" ? "white" : "transparent",
                              color: ampm === "AM" ? "#1877f2" : "#65676b",
                              cursor: "pointer",
                            }}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTimeChange("ampm", "PM")}
                            style={{
                              padding: "6px 12px",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "600",
                              backgroundColor: ampm === "PM" ? "white" : "transparent",
                              color: ampm === "PM" ? "#1877f2" : "#65676b",
                              cursor: "pointer",
                            }}
                          >
                            PM
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          )}

          {/* Quick Summary Pill before Launch */}
          <div
            style={{
              padding: "14px 18px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              margin: "24px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Target Audience
              </div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                {audienceContacts.length} Contacts Ready
              </div>
            </div>
            {audienceContacts.length > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  color: "#059669",
                  background: "#ecfdf5",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontWeight: "600",
                }}
              >
                <CheckCircle2 size={14} /> Ready to dispatch
              </span>
            )}
          </div>

          {/* SEND BUTTON */}
          <div className="form-actions" style={{ marginTop: "16px" }}>
            <button
              className={`send-btn ${loading ? "loading" : ""}`}
              onClick={handleSendBulkMessages}
              disabled={loading || audienceContacts.length === 0}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Starting Campaign...
                </>
              ) : (
                <>
                  <IoSendSharp size={20} /> Launch Campaign ({audienceContacts.length} Contacts)
                </>
              )}
            </button>
          </div>
        </div>

        {/* COLUMN 2: AUDIENCE MANAGER (CONTACT MANAGER STYLE) */}
        <div className="audience-section">
          {/* Header */}
          <div className="audience-header">
            <div className="audience-title-wrap">
              <Users size={20} color="#059669" />
              <h2>2. Audience Contacts</h2>
              <span className="audience-count-badge">
                {audienceContacts.length} contacts
              </span>
            </div>

            <div className="audience-header-actions">
              <button
                type="button"
                className="btn-sample-download"
                onClick={handleDownloadSample}
                title="Download sample template"
              >
                <Download size={14} /> Sample Template
              </button>
              {audienceContacts.length > 0 && (
                <button
                  type="button"
                  className="btn-clear-all"
                  onClick={handleClearAudience}
                >
                  <Trash2 size={13} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Source Tabs */}
          <div className="audience-source-tabs">
            <button
              type="button"
              className={`source-tab-btn ${audienceTab === "file" ? "active" : ""}`}
              onClick={() => setAudienceTab("file")}
            >
              <FileSpreadsheet size={16} /> Excel / CSV File
            </button>
            <button
              type="button"
              className={`source-tab-btn ${audienceTab === "group" ? "active" : ""}`}
              onClick={() => setAudienceTab("group")}
            >
              <Layers size={16} /> From Group
            </button>
            <button
              type="button"
              className={`source-tab-btn ${audienceTab === "manual" ? "active" : ""}`}
              onClick={() => setAudienceTab("manual")}
            >
              <Plus size={16} /> Quick Paste
            </button>
          </div>

          {/* TAB 1: FILE UPLOAD */}
          {audienceTab === "file" && (
            <div className="file-upload-box">
              <input
                type="file"
                id="audience-file-input"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                  e.target.value = "";
                }}
              />
              <label htmlFor="audience-file-input" className="dropzone-card">
                <IoCloudUploadOutline size={36} className="dropzone-icon" />
                <span className="dropzone-title">
                  Click or drag & drop customer file here
                </span>
                <span className="dropzone-subtitle">
                  Supports standard customer sheets and downloaded campaign reports
                </span>
                <span className="dropzone-formats">
                  .xlsx, .xls, .csv
                </span>
              </label>

              {fileStats && (
                <div className="loaded-file-pill">
                  <div className="file-pill-left">
                    <FileSpreadsheet size={20} className="file-pill-icon" />
                    <div className="file-pill-info">
                      <span className="file-name">{fileStats.fileName}</span>
                      <span className="file-count">
                        {fileStats.valid} contacts imported
                        {fileStats.duplicates > 0 && ` (${fileStats.duplicates} duplicates removed)`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="file-remove-btn"
                    onClick={() => {
                      setFileStats(null);
                      setCampaignFileName("");
                      setAudienceContacts([]);
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SELECT GROUP */}
          {audienceTab === "group" && (
            <div className="group-selector-box">
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px", display: "block" }}>
                Select Contact Group
              </label>
              <div className="group-input-row">
                <select
                  value={selectedGroup}
                  onChange={async (e) => {
                    const gid = e.target.value;
                    setSelectedGroup(gid);
                    if (!gid) {
                      setGroupContactsCount(0);
                      return;
                    }
                    try {
                      const resp = await groupAPI.getContacts(gid);
                      setGroupContactsCount(resp.data ? resp.data.length : 0);
                    } catch {
                      setGroupContactsCount(0);
                    }
                  }}
                >
                  <option value="">Choose a Group...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn-add-group"
                  onClick={handleAddGroupContacts}
                  disabled={!selectedGroup}
                >
                  <Plus size={15} /> Import Group
                </button>
              </div>

              {selectedGroup && (
                <div className="group-count-msg">
                  {groupContactsCount > 0
                    ? `Found ${groupContactsCount} contact${groupContactsCount > 1 ? "s" : ""} in this group`
                    : "No contacts found in selected group"}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANUAL PASTE */}
          {audienceTab === "manual" && (
            <div className="manual-paste-box">
              <textarea
                placeholder="Enter numbers (one per line):&#10;919876543210, John Doe&#10;919876543211, Jane Smith"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
              />
              <div className="manual-paste-actions">
                <span className="manual-hint">Format: Phone, Name or 10-digit number</span>
                <button
                  type="button"
                  className="btn-add-manual"
                  onClick={handleAddManualContacts}
                >
                  <Plus size={15} /> Add to Audience
                </button>
              </div>
            </div>
          )}

          {/* LIVE AUDIENCE TABLE PREVIEW */}
          <div className="audience-table-section">
            <div className="table-toolbar">
              <div className="table-search">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search audience..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <span className="showing-text">
                {filteredAudience.length > 0
                  ? `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(
                      currentPage * itemsPerPage,
                      filteredAudience.length
                    )} of ${filteredAudience.length}`
                  : "0 contacts"}
              </span>
            </div>

            {filteredAudience.length === 0 ? (
              <div className="audience-empty-state">
                <Users size={32} className="empty-icon" />
                <h4>No Audience Loaded Yet</h4>
                <p>
                  Upload an Excel/CSV file, import a saved group, or paste phone numbers to prepare your campaign.
                </p>
              </div>
            ) : (
              <>
                <div className="audience-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "40px" }}>#</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Source</th>
                        <th style={{ width: "40px", textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAudience.map((contact, idx) => {
                        const serial = (currentPage - 1) * itemsPerPage + idx + 1;
                        return (
                          <tr key={contact.id}>
                            <td className="col-idx">{serial}</td>
                            <td>{contact.name || "—"}</td>
                            <td className="col-phone">{contact.phone}</td>
                            <td>
                              <span
                                className={`source-pill ${
                                  contact.source.startsWith("Group")
                                    ? "source-group"
                                    : contact.source.includes("File")
                                    ? "source-file"
                                    : "source-manual"
                                }`}
                              >
                                {contact.source}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="btn-row-delete"
                                onClick={() => handleRemoveContact(contact.id)}
                                title="Remove contact"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="pagination-controls">
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="page-buttons">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkWhatsApp;