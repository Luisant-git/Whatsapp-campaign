import React, { useState, useEffect, useMemo } from "react";
import {
  IoCheckmarkOutline,
  IoCloseSharp,
  IoSendSharp,
  IoCloudUploadOutline,
} from "react-icons/io5";
import * as XLSX from "xlsx";
import { sendBulkMessages } from "../api/whatsapp";
import { getAllSettings, getSettings } from "../api/auth";
import { groupAPI } from "../api/group";
import { useToast } from "../contexts/ToastContext";
import MetaSendingWindowBar from "./MetaSendingWindowBar";
import "../styles/BulkWhatsApps.scss";

const BulkWhatsApp = () => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [phoneNumbers, setPhoneNumbers] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [scheduleType, setScheduleType] = useState("one-time");
  const [scheduledDays, setScheduledDays] = useState([]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [scheduledDate, setScheduledDate] = useState("");
  const [quickPick, setQuickPick] = useState(""); // tracks which quick-pick chip is selected
  const [campaignName, setCampaignName] = useState("");
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupContactsCount, setGroupContactsCount] = useState(0);
  const [settings, setSettings] = useState([]);
  const [campaignFileName, setCampaignFileName] = useState("");
  const [excelLoadedCount, setExcelLoadedCount] = useState(0);
  const [previewContacts, setPreviewContacts] = useState([]);
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewSearch, setPreviewSearch] = useState("");
  const [showExcelPreviewModal, setShowExcelPreviewModal] = useState(false);

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
        const data = await getAllSettings();
        const settingsList = Array.isArray(data) ? data : [];
        setSettings(settingsList);

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

  useEffect(() => {
    if (window.composeCampaignData) {
      setPhoneNumbers(window.composeCampaignData.contacts || "");
      if (window.composeCampaignData.campaignName) {
        setCampaignName(window.composeCampaignData.campaignName);
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
          .filter(c => c.phone)
          .map(c => `${c.phone},${c.name || ''}`)
          .join('\n');
        setPhoneNumbers(failedContacts);
      }
      delete window.resendFailedData;
    }
  }, []);
  const uniqueTemplateNames = useMemo(() => {
    return [...new Set(settings.map((item) => item.templateName).filter(Boolean))];
  }, [settings]);

  const handleDayToggle = (day) => {
    setScheduledDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
  };

  const parseScheduledTime = (timeStr) => {
    if (!timeStr) return { h: 9, m: 0, ampm: 'AM' };
    let [h, m] = timeStr.split(':').map(Number);
    return { h: h % 12 || 12, m, ampm: h >= 12 ? 'PM' : 'AM' };
  };

  const handleTimeChange = (type, val) => {
    let { h, m, ampm } = parseScheduledTime(scheduledTime);
    if (type === 'h') h = val;
    if (type === 'm') m = val;
    if (type === 'ampm') ampm = val;
    let h24 = (h % 12) + (ampm === 'PM' ? 12 : 0);
    setScheduledTime(`${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  // Returns quick-pick options relative to now (IST)
  const getQuickPickOptions = () => {
    const now = new Date();
    // IST = UTC+5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    const makeLocal = (istDate) => {
      // Convert IST datetime back to a local datetime-local string
      // by subtracting the IST offset and adding local offset
      const utc = istDate.getTime() - istOffset;
      const local = new Date(utc);
      return local.toISOString().slice(0, 16);
    };

    const setHour = (baseIst, hour, minute = 0) => {
      const d = new Date(baseIst);
      d.setUTCHours(hour, minute, 0, 0);
      return d;
    };

    const tomorrow = new Date(istNow);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const dayAfter = new Date(istNow);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 2);

    const opts = [];

    // Today Evening 6 PM — only show if it's before 5 PM IST
    if (istNow.getUTCHours() < 17) {
      opts.push({ label: 'Today Evening', sublabel: '6:00 PM', id: 'today-eve', value: makeLocal(setHour(istNow, 12, 30)) }); // 18:00 IST = 12:30 UTC
    }

    // Tomorrow Morning 9 AM
    opts.push({ label: 'Tomorrow', sublabel: '9:00 AM', id: 'tom-morn', value: makeLocal(setHour(tomorrow, 3, 30)) }); // 9 IST = 3:30 UTC

    // Tomorrow Afternoon 2 PM
    opts.push({ label: 'Tomorrow', sublabel: '2:00 PM', id: 'tom-noon', value: makeLocal(setHour(tomorrow, 8, 30)) }); // 14 IST = 8:30 UTC

    // Tomorrow Evening 6 PM
    opts.push({ label: 'Tomorrow', sublabel: '6:00 PM', id: 'tom-eve', value: makeLocal(setHour(tomorrow, 12, 30)) }); // 18 IST = 12:30 UTC

    // Day After 9 AM
    opts.push({ label: 'Day After', sublabel: '9:00 AM', id: 'dayafter', value: makeLocal(setHour(dayAfter, 3, 30)) });

    return opts;
  };

  const handleCampaignExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target.result;
        const wb = XLSX.read(buffer, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!data || data.length === 0) {
          setCampaignFileName("");
          setExcelLoadedCount(0);
          showError("Uploaded file is empty");
          return;
        }

        const parsedContacts = [];
        const seenPhones = new Set();

        // Sample first row to detect columns
        const firstRow = data[0] || {};
        const allKeys = Object.keys(firstRow);

        // 1. Detect phone key with strict priority (avoid matching 'Contact' column when 'Phone' exists)
        let phoneKey = allKeys.find((k) =>
          /^(phone|mobile|phone\s*number|mobile\s*number|whatsapp|wa_number|cell)$/i.test(k.trim())
        );

        if (!phoneKey) {
          phoneKey = allKeys.find((k) =>
            /phone|mobile|whatsapp|cell/i.test(k.trim())
          );
        }

        if (!phoneKey) {
          phoneKey = allKeys.find((k) =>
            /contact\s*(no|number)?/i.test(k.trim())
          );
        }

        // If still not found, search rows for any column whose values look like phone numbers (7+ digits)
        if (!phoneKey) {
          for (const k of allKeys) {
            const val = String(firstRow[k] || "").replace(/\D/g, "");
            if (val.length >= 7 && val.length <= 15) {
              phoneKey = k;
              break;
            }
          }
        }

        // 2. Detect name key
        let nameKey = allKeys.find((k) =>
          k !== phoneKey && /^(name|customer|customer\s*name|client|fullname|full\s*name|contact\s*name)$/i.test(k.trim())
        );

        if (!nameKey) {
          nameKey = allKeys.find((k) =>
            k !== phoneKey && /name|customer|client/i.test(k.trim())
          );
        }

        // In exported reports like 'campaign-*-all-results.xlsx', the headers are 'Contact' and 'Phone'
        // If phoneKey is 'Phone', 'Contact' is the customer name!
        if (!nameKey && allKeys.some((k) => k !== phoneKey && /^contact$/i.test(k.trim()))) {
          nameKey = allKeys.find((k) => k !== phoneKey && /^contact$/i.test(k.trim()));
        }

        data.forEach((row) => {
          let rawPhone = phoneKey ? row[phoneKey] : "";
          if (typeof rawPhone === "number") {
            rawPhone = rawPhone.toFixed(0);
          } else {
            rawPhone = String(rawPhone || "").trim();
          }

          let name = nameKey ? String(row[nameKey] || "").trim() : "";

          // Clean phone number (keep digits and optional leading +)
          const cleanPhone = rawPhone.replace(/[^0-9+]/g, "");
          if (cleanPhone && cleanPhone.length >= 7 && !seenPhones.has(cleanPhone)) {
            seenPhones.add(cleanPhone);
            parsedContacts.push({ phone: cleanPhone, name: name.replace(/,/g, " ") });
          }
        });

        if (parsedContacts.length === 0) {
          setCampaignFileName("");
          setExcelLoadedCount(0);
          showError("No valid phone numbers found in file. Please ensure the file has a 'Phone' or 'Mobile' column.");
          return;
        }

        // Open Confirmation Preview Modal
        setPreviewContacts(parsedContacts);
        setPreviewFileName(file.name);
        setPreviewSearch("");
        setShowExcelPreviewModal(true);
      } catch (err) {
        console.error("Error reading campaign Excel:", err);
        setCampaignFileName("");
        setExcelLoadedCount(0);
        showError("Failed to parse Excel file. Please check format.");
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleConfirmExcelContacts = () => {
    const lines = previewContacts
      .map((c) => (c.name ? `${c.phone},${c.name}` : c.phone))
      .join("\n");
    setPhoneNumbers(lines);
    setCampaignFileName(previewFileName);
    setExcelLoadedCount(previewContacts.length);
    setShowExcelPreviewModal(false);
    showSuccess(`Successfully loaded ${previewContacts.length} contacts from ${previewFileName}`);
  };

  const handleCancelExcelPreview = () => {
    setShowExcelPreviewModal(false);
    setPreviewContacts([]);
    setPreviewFileName("");
    setPreviewSearch("");
  };

  const handleSendBulkMessages = async () => {
    setResults(null);
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
          return;
        }
      } catch (error) {
        console.error("Error fetching group contacts:", error);
        showError("Failed to load group contacts");
        return;
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
    if (!templateName) {
      showError("Please select a template");
      return;
    }
    if (scheduleType === "time-based" && scheduledDays.length === 0) {
      showError("Please select at least one day for time-based scheduling");
      return;
    }
    if (scheduleType === "scheduled" && !scheduledDate) {
      showError("Please pick a date and time to schedule the campaign");
      return;
    }
    if (scheduleType === "scheduled" && new Date(scheduledDate) <= new Date()) {
      showError("Scheduled date must be in the future");
      return;
    }

    // Show confirmation popup after all validations
    let confirmMsg = `Campaign will run in the background and send to ${dataToSend.length} contact${dataToSend.length > 1 ? 's' : ''}.`;
    if (scheduleType === "scheduled") {
      const dt = new Date(scheduledDate);
      confirmMsg = `Campaign will be scheduled and sent automatically on ${dt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST to ${dataToSend.length} contact${dataToSend.length > 1 ? 's' : ''}.`;
    } else if (scheduleType === "time-based") {
      confirmMsg = `Recurring campaign will send every week on selected days to ${dataToSend.length} contact${dataToSend.length > 1 ? 's' : ''}.`;
    } else {
      confirmMsg += ` You can check progress in the Campaigns Reports. Continue?`;
    }
    if (dataToSend.length > 2000) {
      confirmMsg = `⚠️ WARNING: You are sending to ${dataToSend.length} contacts. Keeping campaigns below 2000 contacts at a time is recommended. ${confirmMsg}`;
    } else if (scheduleType === "one-time" && dataToSend.length > 200) {
      confirmMsg = `You are about to send to ${dataToSend.length} contacts. (Note: keeping batches below 200-2000 at a time is recommended). ${confirmMsg}`;
    }

    const confirmed = await showConfirm(confirmMsg);
    if (!confirmed) return;

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
      ...(scheduleType === "scheduled" && {
        scheduledDate: new Date(scheduledDate).toISOString(),
      }),
    };

    // 6️⃣ Send campaign
    setLoading(true);
    try {
      const response = await sendBulkMessages(campaignData);
      console.log("API Response:", response);

      // Backend now returns simple success response for async campaigns
      if (response.success) {
        showSuccess(response.message || `Campaign started! Sending to ${dataToSend.length} contacts in the background.`);
        
        // Clear form
        setPhoneNumbers("");
        setSelectedGroup("");
        setGroupContactsCount(0);
        setCampaignName("");
        setTemplateName("");
        setScheduledDays([]);
        setScheduledTime("09:00");
        setScheduledDate("");
        setQuickPick("");
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
            Send promotional messages to multiple customers
          </span>
        </div>
      </div>

      {/* Meta WhatsApp Sending Window Bar (Short, Bold, WhatsApp Style) */}
      <MetaSendingWindowBar />


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
            <select
              className="form-input"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            >
              <option value="">Select a Template</option>
              {uniqueTemplateNames.map((name, index) => (
                <option key={`template-${index}`} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* ── Scheduling ── */}
          <div className="form-group">
            <label className="form-label">When to Send</label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

              {/* Send Now */}
              <label onClick={() => setScheduleType('one-time')} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '13px 16px', borderRadius: '12px', cursor: 'pointer',
                border: `2px solid ${scheduleType === 'one-time' ? '#25d366' : '#e5e7eb'}`,
                background: scheduleType === 'one-time' ? '#f0fff7' : '#fff',
                transition: 'all 0.15s',
              }}>
                {/* Lightning bolt icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                  background: scheduleType === 'one-time' ? '#25d366' : '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z"
                      fill={scheduleType === 'one-time' ? '#fff' : '#9ca3af'}
                      stroke={scheduleType === 'one-time' ? '#fff' : '#9ca3af'}
                      strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>Send Now</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>Campaign starts immediately in the background</div>
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', border: `2px solid ${scheduleType === 'one-time' ? '#25d366' : '#d1d5db'}`,
                  background: scheduleType === 'one-time' ? '#25d366' : '#fff', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {scheduleType === 'one-time' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </label>

              {/* Schedule for Later */}
              <label onClick={() => setScheduleType('scheduled')} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '13px 16px', borderRadius: '12px', cursor: 'pointer',
                border: `2px solid ${scheduleType === 'scheduled' ? '#1877f2' : '#e5e7eb'}`,
                background: scheduleType === 'scheduled' ? '#eff6ff' : '#fff',
                transition: 'all 0.15s',
              }}>
                {/* Calendar icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                  background: scheduleType === 'scheduled' ? '#1877f2' : '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="17" rx="3"
                      stroke={scheduleType === 'scheduled' ? '#fff' : '#9ca3af'} strokeWidth="1.8"/>
                    <path d="M3 9H21" stroke={scheduleType === 'scheduled' ? '#fff' : '#9ca3af'} strokeWidth="1.8"/>
                    <path d="M8 2V5M16 2V5" stroke={scheduleType === 'scheduled' ? '#fff' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                    <circle cx="12" cy="15" r="1.2" fill={scheduleType === 'scheduled' ? '#fff' : '#9ca3af'}/>
                    <circle cx="7.5" cy="15" r="1.2" fill={scheduleType === 'scheduled' ? '#fff' : '#9ca3af'}/>
                    <circle cx="16.5" cy="15" r="1.2" fill={scheduleType === 'scheduled' ? '#fff' : '#9ca3af'}/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>Schedule for Later</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>Pick a date &amp; time — sent once automatically</div>
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', border: `2px solid ${scheduleType === 'scheduled' ? '#1877f2' : '#d1d5db'}`,
                  background: scheduleType === 'scheduled' ? '#1877f2' : '#fff', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {scheduleType === 'scheduled' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </label>

              {/* Weekly Recurring */}
              <label onClick={() => setScheduleType('time-based')} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '13px 16px', borderRadius: '12px', cursor: 'pointer',
                border: `2px solid ${scheduleType === 'time-based' ? '#7c3aed' : '#e5e7eb'}`,
                background: scheduleType === 'time-based' ? '#f5f3ff' : '#fff',
                transition: 'all 0.15s',
              }}>
                {/* Repeat / cycle icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                  background: scheduleType === 'time-based' ? '#7c3aed' : '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12C4 7.58 7.58 4 12 4C14.76 4 17.2 5.36 18.7 7.46"
                      stroke={scheduleType === 'time-based' ? '#fff' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M20 12C20 16.42 16.42 20 12 20C9.24 20 6.8 18.64 5.3 16.54"
                      stroke={scheduleType === 'time-based' ? '#fff' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M16 7L18.7 7.46L19.5 5"
                      stroke={scheduleType === 'time-based' ? '#fff' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 17L5.3 16.54L4.5 19"
                      stroke={scheduleType === 'time-based' ? '#fff' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>Weekly Recurring</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>Repeat every week on selected days at a fixed time</div>
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', border: `2px solid ${scheduleType === 'time-based' ? '#7c3aed' : '#d1d5db'}`,
                  background: scheduleType === 'time-based' ? '#7c3aed' : '#fff', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {scheduleType === 'time-based' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </label>
            </div>
          </div>

          {/* ── Schedule for Later: date-time picker ── */}
          {scheduleType === 'scheduled' && (
            <div className="form-group">
              <label className="form-label">Pick a Date &amp; Time</label>

              {/* Quick-pick chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {getQuickPickOptions().map((opt) => {
                  const isActive = quickPick === opt.id;
                  return (
                    <button key={opt.id} type="button"
                      onClick={() => { setQuickPick(opt.id); setScheduledDate(opt.value); }}
                      style={{
                        padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                        border: `1.5px solid ${isActive ? '#1877f2' : '#e5e7eb'}`,
                        background: isActive ? '#eff6ff' : '#f9fafb',
                        color: isActive ? '#1d4ed8' : '#374151',
                        fontSize: '12px', fontWeight: isActive ? '600' : '500',
                        transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                        minWidth: '80px',
                      }}>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{opt.label}</span>
                      <span style={{ fontSize: '11px', color: isActive ? '#3b82f6' : '#6b7280' }}>{opt.sublabel}</span>
                    </button>
                  );
                })}
                {/* Custom chip */}
                <button type="button"
                  onClick={() => { setQuickPick('custom'); }}
                  style={{
                    padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                    border: `1.5px solid ${quickPick === 'custom' ? '#1877f2' : '#e5e7eb'}`,
                    background: quickPick === 'custom' ? '#eff6ff' : '#f9fafb',
                    color: quickPick === 'custom' ? '#1d4ed8' : '#374151',
                    fontSize: '12px', fontWeight: quickPick === 'custom' ? '600' : '500',
                    transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                    minWidth: '80px',
                  }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Custom</span>
                  <span style={{ fontSize: '11px', color: quickPick === 'custom' ? '#3b82f6' : '#6b7280' }}>Choose date</span>
                </button>
              </div>

              {/* Custom date-time input — shown only when Custom is selected */}
              {quickPick === 'custom' && (
                <input
                  type="datetime-local"
                  className="form-input"
                  value={scheduledDate}
                  min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  style={{ fontSize: '14px', cursor: 'pointer', marginBottom: '8px' }}
                  autoFocus
                />
              )}

              {/* Preview of selected time */}
              {scheduledDate && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px', borderRadius: '8px',
                  background: '#f0f9ff', border: '1px solid #bae6fd',
                  fontSize: '13px', color: '#0369a1',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#0369a1" strokeWidth="1.8"/>
                    <path d="M12 7V12L15 15" stroke="#0369a1" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  <span>
                    Sending on <strong>{new Date(scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}</strong> at <strong>{new Date(scheduledDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).toUpperCase()}</strong> IST
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Weekly Recurring: day + time pickers ── */}
          {scheduleType === 'time-based' && (
            <>
              <div className="form-group">
                <label className="form-label">Select Days</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {daysOfWeek.map((day) => {
                    const isSel = scheduledDays.includes(day.value);
                    return (
                      <button key={day.value} type="button"
                        onClick={() => handleDayToggle(day.value)}
                        style={{
                          padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                          fontWeight: isSel ? '600' : '500', cursor: 'pointer',
                          border: `1.5px solid ${isSel ? '#7c3aed' : '#d1d5db'}`,
                          background: isSel ? '#ede9fe' : '#fff',
                          color: isSel ? '#6d28d9' : '#374151',
                          transition: 'all 0.15s',
                        }}>
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Time (IST)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {(() => {
                    const { h, m, ampm } = parseScheduledTime(scheduledTime);
                    return (
                      <>
                        <select value={h} onChange={(e) => handleTimeChange('h', Number(e.target.value))}
                          style={{ padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', outline: 'none' }}>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(hr => (
                            <option key={hr} value={hr}>{String(hr).padStart(2, '0')}</option>
                          ))}
                        </select>
                        <span style={{ fontWeight: '700', color: '#374151' }}>:</span>
                        <select value={m} onChange={(e) => handleTimeChange('m', Number(e.target.value))}
                          style={{ padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', outline: 'none' }}>
                          {[0, 15, 30, 45].map(min => (
                            <option key={min} value={min}>{String(min).padStart(2, '0')}</option>
                          ))}
                        </select>
                        <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
                          {['AM', 'PM'].map(ap => (
                            <button key={ap} type="button"
                              onClick={(e) => { e.preventDefault(); handleTimeChange('ampm', ap); }}
                              style={{
                                padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                fontSize: '13px', fontWeight: '600',
                                background: ampm === ap ? '#fff' : 'transparent',
                                color: ampm === ap ? '#7c3aed' : '#6b7280',
                                boxShadow: ampm === ap ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.15s',
                              }}>{ap}</button>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
                <small className="form-hint" style={{ marginTop: '6px', display: 'block' }}>Indian Standard Time (IST) · 8 AM – 8 PM window</small>
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


          {/* Filtered Excel / CSV Upload or Manual Numbers */}
          <div className="manual-input-section">
            {/* Quick Excel Upload Card */}
            <div style={{ marginBottom: '14px', padding: '14px', border: '2px dashed #00b686', borderRadius: '10px', backgroundColor: '#f0fdf4', textAlign: 'center' }}>
              <input
                type="file"
                id="campaign-excel-upload"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={handleCampaignExcelUpload}
              />
              <label htmlFor="campaign-excel-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <IoCloudUploadOutline size={28} color="#00b686" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#008069' }}>
                  {campaignFileName ? `Loaded: ${campaignFileName} (${excelLoadedCount} contacts)` : 'Upload Filtered Customer Excel / CSV File'}
                </span>
                <span style={{ fontSize: '12px', color: '#65676b' }}>
                  Easily load specific dress shop customers (.xlsx, .xls, .csv) directly into this campaign
                </span>
              </label>
              {campaignFileName && (
                <button
                  type="button"
                  onClick={() => {
                    setCampaignFileName('');
                    setExcelLoadedCount(0);
                    setPhoneNumbers('');
                  }}
                  style={{ marginTop: '8px', padding: '4px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', color: '#ef4444' }}
                >
                  Clear uploaded file
                </button>
              )}
            </div>

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
                  <IoSendSharp size={20} />
                  {scheduleType === 'scheduled' ? '📅 Schedule Campaign' : scheduleType === 'time-based' ? '🔁 Save Recurring Campaign' : '⚡ Send Campaign Now'}
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
                      className={`status-icon ${r.success ? "success" : "error"
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

        {/* Excel Contacts Confirmation Preview Modal */}
        {showExcelPreviewModal && (
          <div className="modal-overlay" onClick={handleCancelExcelPreview}>
            <div
              className="modal-content"
              style={{ maxWidth: '640px', width: '92%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-title-section">
                  <h2>Review Uploaded Contacts</h2>
                  <span
                    style={{
                      fontSize: '12px',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: '700',
                    }}
                  >
                    {previewContacts.length} Contacts
                  </span>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  onClick={handleCancelExcelPreview}
                >
                  <IoCloseSharp size={20} />
                </button>
              </div>

              <div
                className="modal-body"
                style={{ maxHeight: '65vh', overflowY: 'auto', padding: '16px 20px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Source File: <strong style={{ color: '#0f172a' }}>{previewFileName}</strong>
                  </p>
                  <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
                    ✓ Ready to send
                  </span>
                </div>

                {/* Quick Search */}
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Search by contact name or phone..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Contacts Preview Table */}
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                      textAlign: 'left',
                    }}
                  >
                    <thead
                      style={{
                        background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <tr>
                        <th
                          style={{
                            padding: '8px 12px',
                            color: '#64748b',
                            fontWeight: '600',
                            width: '40px',
                          }}
                        >
                          #
                        </th>
                        <th
                          style={{
                            padding: '8px 12px',
                            color: '#64748b',
                            fontWeight: '600',
                          }}
                        >
                          Contact Name
                        </th>
                        <th
                          style={{
                            padding: '8px 12px',
                            color: '#64748b',
                            fontWeight: '600',
                          }}
                        >
                          Phone Number
                        </th>
                        <th
                          style={{
                            padding: '8px 12px',
                            color: '#64748b',
                            fontWeight: '600',
                            textAlign: 'right',
                          }}
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewContacts
                        .filter((c) => {
                          if (!previewSearch) return true;
                          const s = previewSearch.toLowerCase();
                          return (
                            (c.name && c.name.toLowerCase().includes(s)) ||
                            (c.phone && c.phone.includes(s))
                          );
                        })
                        .slice(0, 100)
                        .map((c, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              backgroundColor: idx % 2 === 0 ? 'white' : '#fcfcfd',
                            }}
                          >
                            <td style={{ padding: '8px 12px', color: '#94a3b8' }}>
                              {idx + 1}
                            </td>
                            <td
                              style={{
                                padding: '8px 12px',
                                fontWeight: '500',
                                color: c.name ? '#0f172a' : '#94a3b8',
                              }}
                            >
                              {c.name || 'N/A'}
                            </td>
                            <td
                              style={{
                                padding: '8px 12px',
                                fontFamily: 'monospace',
                                color: '#0284c7',
                                fontWeight: '600',
                              }}
                            >
                              {c.phone}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              <span
                                style={{
                                  background: '#dcfce7',
                                  color: '#166534',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                }}
                              >
                                Ready
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {previewContacts.length > 100 && (
                    <div
                      style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#64748b',
                        background: '#f8fafc',
                      }}
                    >
                      Showing first 100 of {previewContacts.length} contacts
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCancelExcelPreview}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="save-btn"
                  onClick={handleConfirmExcelContacts}
                  style={{ background: '#008069' }}
                >
                  Confirm & Use {previewContacts.length} Contacts
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkWhatsApp;