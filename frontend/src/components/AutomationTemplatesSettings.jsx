// src/pages/AutomationTemplateManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  getAllSettings,
  createSettings,
  updateSettings,
  deleteSettings,
  setDefaultSettings,
  uploadHeaderImage,
} from "../api/auth";
import { getMasterConfigs } from "../api/masterConfig";
import { API_BASE_URL } from "../api/config";
import { useToast } from "../contexts/ToastContext";
import { Eye, EyeOff, Plus, Trash2, Star, Upload, RefreshCw } from "lucide-react";
import "../styles/QuickReply.css";

const DEFAULT_API_URL = "https://graph.facebook.com/v20.0";

const LANGUAGE_OPTIONS = [
  { label: "English", value: "en" },
  { label: "Tamil", value: "ta" },
  { label: "Hindi", value: "hi" },
  { label: "English (US) - en_US", value: "en_US" },
  { label: "English (UK) - en_GB", value: "en_GB" },
];

const DAY_OPTIONS = [0, 1, 2, 3, 5, 7, 10, 14, 30, 60, 90, 180, 365];

function isVideo(url = "") {
  return /\.(mp4|avi|mov|webm)$/i.test(url);
}

function badgeLabel(eventType, dayBefore) {
  const d = Number(dayBefore);
  if (d === 0) return `${eventType} (On Day)`;
  if (d > 0) return `${eventType} (${d} days before)`;
  return `${eventType} (${Math.abs(d)} days after)`;
}

function ruleKey(rule) {
  return `${rule.eventType}:${Number(rule.dayBefore)}`;
}

function parseDayBeforeToUI(dayBefore) {
  const d = Number(dayBefore);
  if (d === 0) return { when: "on", days: 0 };
  if (d > 0) return { when: "before", days: d };
  return { when: "after", days: Math.abs(d) };
}

function uiToDayBefore(when, days) {
  if (when === "on") return 0;
  const d = Number(days || 0);
  return when === "after" ? -d : d;
}

const AutomationTemplateManager = () => {
  const { showSuccess, showError, showConfirm } = useToast();

  const [loading, setLoading] = useState(true);
  const [allSettings, setAllSettings] = useState([]);
  const [masterConfigs, setMasterConfigs] = useState([]);

  // tabs
  const [activeTab, setActiveTab] = useState("automation"); // automation | normal

  // summary
  const [summaryGroups, setSummaryGroups] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // modal
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // mode
  const [mode, setMode] = useState("normal"); // normal | automation

  // template name UI: automation dropdown + optional custom
  const [templateMode, setTemplateMode] = useState("select"); // select | custom
  const [customTemplateName, setCustomTemplateName] = useState("");

  // automation rules list (MULTIPLE)
  // each: { eventType: 'DOB'|'ANNIVERSARY', when: 'before'|'on'|'after', days: number, dayBefore: number }
  const [autoRules, setAutoRules] = useState([]);

  // token visibility
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [currentSettings, setCurrentSettings] = useState({
    name: "",
    templateName: "",
    phoneNumberId: "",
    accessToken: "",
    verifyToken: "",
    apiUrl: DEFAULT_API_URL,
    language: "en",
    headerImageUrl: "",
    isDefault: false,
    masterConfigId: "",
  });

  const templateOptions = useMemo(() => {
    const set = new Set(
      (allSettings || [])
        .map((s) => String(s.templateName || "").trim())
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [allSettings]);

  const automationIds = useMemo(() => {
    return new Set((summaryGroups || []).map((g) => Number(g.whatsAppSettingsId)));
  }, [summaryGroups]);

  const normalTemplates = useMemo(() => {
    return (allSettings || []).filter((s) => !automationIds.has(Number(s.id)));
  }, [allSettings, automationIds]);

  const automationTemplates = useMemo(() => {
    return (allSettings || []).filter((s) => automationIds.has(Number(s.id)));
  }, [allSettings, automationIds]);

  const visibleSettings = activeTab === "automation" ? automationTemplates : normalTemplates;

  const enabledBadgesBySettingsId = useMemo(() => {
    const map = new Map();
    for (const g of summaryGroups || []) {
      const sid = Number(g.whatsAppSettingsId);
      const b = badgeLabel(g.eventType, Number(g.dayBefore));
      if (!map.has(sid)) map.set(sid, new Set());
      map.get(sid).add(b);
    }
    return map;
  }, [summaryGroups]);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/run-daily-automation/summary`, { credentials: "include" });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        showError(err?.message || `Summary failed (${resp.status})`);
        setSummaryGroups([]);
        return;
      }
      const json = await resp.json();
      setSummaryGroups(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
      showError("Failed to load automation summary");
      setSummaryGroups([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [settings, masters] = await Promise.all([getAllSettings(), getMasterConfigs()]);
      setAllSettings(settings || []);
      setMasterConfigs(masters || []);
      await fetchSummary();
    } catch (e) {
      console.error(e);
      showError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setMode("normal");
    setShowForm(false);
    setSaving(false);
    setTemplateMode("select");
    setCustomTemplateName("");
    setAutoRules([]);
    setShowAccessToken(false);
    setShowVerifyToken(false);
    setUploading(false);

    setCurrentSettings({
      name: "",
      templateName: "",
      phoneNumberId: "",
      accessToken: "",
      verifyToken: "",
      apiUrl: DEFAULT_API_URL,
      language: "en",
      headerImageUrl: "",
      isDefault: false,
      masterConfigId: "",
    });
  };

  const handleInputChange = (field, value) => {
    setCurrentSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleMasterChange = (masterId) => {
    setCurrentSettings((prev) => {
      if (!masterId) return { ...prev, masterConfigId: "" };

      const mc = masterConfigs.find((x) => String(x.id) === String(masterId));
      if (!mc) return { ...prev, masterConfigId: masterId };

      return {
        ...prev,
        masterConfigId: masterId,
        phoneNumberId: mc.phoneNumberId || "",
        accessToken: mc.accessToken || "",
        verifyToken: mc.verifyToken || "",
      };
    });
  };

  const handleAddNormal = () => {
    resetForm();
    setMode("normal");
    setShowForm(true);
  };

  const handleAddAutomation = () => {
    resetForm();
    setMode("automation");
    // default rule
    setAutoRules([
      { eventType: "DOB", when: "before", days: 7, dayBefore: 7 },
    ]);
    setShowForm(true);
  };

  const handleEdit = (row) => {
    resetForm();

    const isAutomation = automationIds.has(Number(row.id));
    setMode(isAutomation ? "automation" : "normal");
    setEditingId(row.id);

    // fill settings fields
    setCurrentSettings({
      name: row.name || "",
      templateName: String(row.templateName || "").trim(),
      phoneNumberId: row.phoneNumberId || "",
      accessToken: row.accessToken || "",
      verifyToken: row.verifyToken || "",
      apiUrl: row.apiUrl || DEFAULT_API_URL,
      language: row.language || "en",
      headerImageUrl: row.headerImageUrl || "",
      isDefault: !!row.isDefault,
      masterConfigId: row.masterConfigId || "",
    });

    if (isAutomation) {
      // Load ALL rules for this template from summary
      const rules = (summaryGroups || [])
        .filter((g) => Number(g.whatsAppSettingsId) === Number(row.id))
        .map((g) => {
          const ui = parseDayBeforeToUI(g.dayBefore);
          return {
            eventType: g.eventType,
            when: ui.when,
            days: ui.days,
            dayBefore: Number(g.dayBefore),
          };
        })
        .sort((a, b) => String(a.eventType).localeCompare(String(b.eventType)) || a.dayBefore - b.dayBefore);

      setAutoRules(rules.length ? rules : [{ eventType: "DOB", when: "before", days: 7, dayBefore: 7 }]);

      // template dropdown mode
      const cur = String(row.templateName || "").trim();
      if (templateOptions.includes(cur)) {
        setTemplateMode("select");
        setCustomTemplateName("");
      } else {
        setTemplateMode("custom");
        setCustomTemplateName(cur);
      }
    }

    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadHeaderImage(file);
      handleInputChange("headerImageUrl", result.url);
      showSuccess("Media uploaded");
    } catch {
      showError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // API calls
  const enableRule = async (settingsId, eventType, dayBefore) => {
    const resp = await axios.post(
      `${API_BASE_URL}/run-daily-automation/bulk`,
      { whatsAppSettingsId: Number(settingsId), eventType, dayBefore: Number(dayBefore) },
      { withCredentials: true }
    );
    return resp.data;
  };

  const disableRule = async (settingsId, eventType, dayBefore) => {
    const resp = await axios.post(
      `${API_BASE_URL}/run-daily-automation/disable`,
      { whatsAppSettingsId: Number(settingsId), eventType, dayBefore: Number(dayBefore) },
      { withCredentials: true }
    );
    return resp.data;
  };

  const updateRuleRow = (idx, patch) => {
    setAutoRules((prev) => {
      const next = [...prev];
      const r = { ...next[idx], ...patch };

      // recompute dayBefore when when/days change
      const when = r.when;
      const days = Number(r.days || 0);
      r.dayBefore = uiToDayBefore(when, days);

      next[idx] = r;
      return next;
    });
  };

  const addRuleRow = () => {
    setAutoRules((prev) => [
      ...prev,
      { eventType: "DOB", when: "before", days: 7, dayBefore: 7 },
    ]);
  };

  const removeRuleRow = (idx) => {
    setAutoRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!currentSettings.name?.trim()) throw new Error("Configuration Name is required");
      if (!currentSettings.templateName?.trim()) throw new Error("Template Name is required");

      // For automation create: require at least 1 rule
      if (!editingId && mode === "automation" && autoRules.length === 0) {
        throw new Error("Add at least one Automation Rule");
      }

      // TemplateName: if automation + custom mode
      if (mode === "automation" && templateMode === "custom") {
        handleInputChange("templateName", customTemplateName);
      }

      const payload = {
        ...currentSettings,
        apiUrl: DEFAULT_API_URL,
        templateName: String(currentSettings.templateName || "").trim(),
      };

      let settingsId = editingId;

      if (editingId) {
        await updateSettings(editingId, payload);
        showSuccess("Template updated");
      } else {
        const created = await createSettings(payload);
        settingsId = created?.id;
        showSuccess("Template created");
      }

      // MULTI-RULE sync
      if (mode === "automation") {
        if (!settingsId) throw new Error("Missing settingsId");

        // previous rules from summary
        const prevRules = (summaryGroups || [])
          .filter((g) => Number(g.whatsAppSettingsId) === Number(settingsId))
          .map((g) => ({ eventType: g.eventType, dayBefore: Number(g.dayBefore) }));

        const prevSet = new Set(prevRules.map(ruleKey));

        // new rules from UI (dedupe)
        const nextRulesRaw = autoRules.map((r) => ({
          eventType: r.eventType,
          dayBefore: Number(r.dayBefore),
        }));
        const nextMap = new Map(); // key -> rule
        for (const r of nextRulesRaw) nextMap.set(ruleKey(r), r);
        const nextRules = Array.from(nextMap.values());
        const nextSet = new Set(nextRules.map(ruleKey));

        // disable removed
        for (const r of prevRules) {
          if (!nextSet.has(ruleKey(r))) {
            await disableRule(settingsId, r.eventType, r.dayBefore);
          }
        }

        // enable added
        for (const r of nextRules) {
          if (!prevSet.has(ruleKey(r))) {
            await enableRule(settingsId, r.eventType, r.dayBefore);
          }
        }

        // If user removed ALL rules (editing) -> becomes normal
        if (editingId && nextRules.length === 0) {
          showSuccess("All rules removed. Template moved to Normal Templates.");
          setActiveTab("normal");
        } else {
          setActiveTab("automation");
        }
      } else {
        setActiveTab("normal");
      }

      resetForm();
      await fetchAll();
    } catch (e) {
      showError(e?.response?.data?.message || e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await showConfirm("Delete this template configuration?");
    if (!ok) return;

    try {
      await deleteSettings(id);
      showSuccess("Deleted");
      await fetchAll();
    } catch (e) {
      showError(
        e?.message ||
          "Cannot delete: used in automation/campaign/logs. Disable automation first or use deactivate."
      );
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultSettings(id);
      showSuccess("Default updated");
      await fetchAll();
    } catch {
      showError("Failed to set default");
    }
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div>
          <h1>Templates</h1>
         
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
         

          <button className="btn-secondary" onClick={handleAddNormal}>
            <Plus size={16} /> Add Normal Template
          </button>

          <button className="btn-primary" onClick={handleAddAutomation}>
            <Plus size={16} /> Add Automation Template
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          className={activeTab === "automation" ? "btn-primary" : "btn-outline"}
          onClick={() => setActiveTab("automation")}
        >
          Automation Templates ({automationTemplates.length})
        </button>

        <button
          className={activeTab === "normal" ? "btn-primary" : "btn-outline"}
          onClick={() => setActiveTab("normal")}
        >
          Normal Templates ({normalTemplates.length})
        </button>
      </div>

      <div className="settings-list">
        <h2>{activeTab === "automation" ? "Automation Templates" : "Normal Templates"}</h2>

        {visibleSettings.length === 0 ? (
          <p style={{ color: "#64748b" }}>No templates found.</p>
        ) : (
          <div className="configurations-grid">
            {visibleSettings.map((config) => {
              const badgesSet = enabledBadgesBySettingsId.get(Number(config.id));
              const badges = badgesSet ? Array.from(badgesSet) : [];

              return (
                <div key={config.id} className={`config-card ${config.isDefault ? "default" : ""}`}>
                  <div className="config-header">
                    <h3>{config.name}</h3>
                    {config.isDefault && <Star size={16} className="default-icon" />}
                  </div>

                  <div className="config-details">
                    <p><strong>Template:</strong> {config.templateName}</p>
                    <p><strong>Language:</strong> {config.language}</p>
                    <p><strong>Phone ID:</strong> {config.phoneNumberId}</p>

                    {activeTab === "automation" && badges.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {badges.map((b) => (
                          <span
                            key={b}
                            style={{
                              fontSize: 12,
                              padding: "4px 8px",
                              borderRadius: 999,
                              background: "#eef2ff",
                              border: "1px solid #c7d2fe",
                              color: "#3730a3",
                              fontWeight: 600,
                            }}
                          >
                            Enabled: {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="config-actions" style={{ gap: 8 }}>
                    <button className="btn-secondary" onClick={() => handleEdit(config)}>
                      Edit
                    </button>

                    {!config.isDefault && (
                      <button className="btn-outline" onClick={() => handleSetDefault(config.id)}>
                        Set Default
                      </button>
                    )}

                    <button className="btn-danger" onClick={() => handleDelete(config.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                {editingId
                  ? mode === "automation"
                    ? "Edit Automation Template"
                    : "Edit Normal Template"
                  : mode === "automation"
                    ? "Add Automation Template"
                    : "Add Normal Template"}
              </h2>
              <button onClick={resetForm} className="close-btn">×</button>
            </div>

            <div className="settings-form">
              {/* MULTI RULES UI */}
              {mode === "automation" && (
                <div className="form-group">
                  <label>Automation Rules</label>

                  {autoRules.length === 0 ? (
                    <small style={{ color: "#64748b" }}>No rules. Click “Add Rule”.</small>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {autoRules.map((r, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr auto",
                            gap: 10,
                            padding: 10,
                            border: "1px solid #e0e0e0",
                            borderRadius: 8,
                            background: "#fafafa",
                          }}
                        >
                          <div>
                            <small style={{ color: "#64748b" }}>Event</small>
                            <select
                              value={r.eventType}
                              onChange={(e) => updateRuleRow(idx, { eventType: e.target.value })}
                            >
                              <option value="DOB">DOB</option>
                              <option value="ANNIVERSARY">ANNIVERSARY</option>
                            </select>
                          </div>

                          <div>
                            <small style={{ color: "#64748b" }}>When</small>
                            <select
                              value={r.when}
                              onChange={(e) => updateRuleRow(idx, { when: e.target.value })}
                            >
                              <option value="before">Before</option>
                              <option value="on">On Day</option>
                              <option value="after">After (Follow-up)</option>
                            </select>
                          </div>

                          <div>
                            <small style={{ color: "#64748b" }}>Days</small>
                            <select
                              value={r.days}
                              disabled={r.when === "on"}
                              onChange={(e) => updateRuleRow(idx, { days: Number(e.target.value) })}
                            >
                              {DAY_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: "flex", alignItems: "end" }}>
                            <button
                              type="button"
                              className="btn-danger"
                              onClick={() => removeRuleRow(idx)}
                              style={{ padding: "8px 10px" }}
                            >
                              X
                            </button>
                          </div>

                          <div style={{ gridColumn: "1 / -1", color: "#64748b", fontSize: 12 }}>
                            Saves as: <b>dayBefore = {r.dayBefore}</b> ({badgeLabel(r.eventType, r.dayBefore)})
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 10 }}>
                    <button type="button" className="btn-outline" onClick={addRuleRow}>
                      + Add Rule
                    </button>
                  </div>

                  <small style={{ color: "#666", display: "block", marginTop: 8 }}>
                    Example: Add two rules for the same template → 5 days before and 2 days before.
                  </small>
                </div>
              )}

              <div className="form-group">
                <label>Configuration Name *</label>
                <input
                  type="text"
                  value={currentSettings.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  disabled={editingId !== null}
                />
              </div>

              <div className="form-group">
                <label>Configuration (Master)</label>
                <select
                  value={currentSettings.masterConfigId}
                  onChange={(e) => handleMasterChange(e.target.value)}
                >
                  <option value="">Select Configuration</option>
                  {masterConfigs.map((mc) => (
                    <option key={mc.id} value={mc.id}>
                      {mc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template name */}
              <div className="form-group">
                <label>Template Name *</label>

                {mode === "automation" ? (
                  <>
                    <select
                      value={templateMode === "custom" ? "__custom__" : (currentSettings.templateName || "")}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__custom__") {
                          setTemplateMode("custom");
                          handleInputChange("templateName", customTemplateName || "");
                        } else {
                          setTemplateMode("select");
                          setCustomTemplateName("");
                          handleInputChange("templateName", v);
                        }
                      }}
                    >
                      <option value="">Select Template</option>
                      {templateOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="__custom__">+ Custom Template Name</option>
                    </select>

                    {templateMode === "custom" && (
                      <div style={{ marginTop: 10 }}>
                        <input
                          type="text"
                          value={customTemplateName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomTemplateName(val);
                            handleInputChange("templateName", val);
                          }}
                          placeholder="Type template name exactly as in Meta"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    value={currentSettings.templateName}
                    onChange={(e) => handleInputChange("templateName", e.target.value)}
                    placeholder="Type template name exactly as in Meta"
                  />
                )}
              </div>

              <div className="form-group">
                <label>Template Language</label>
                <select
                  value={currentSettings.language}
                  onChange={(e) => handleInputChange("language", e.target.value)}
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* PhoneNumberId */}
              <div className="form-group">
                <label>Phone Number ID *</label>
                <input
                  type="text"
                  value={currentSettings.phoneNumberId}
                  onChange={(e) => handleInputChange("phoneNumberId", e.target.value)}
                  disabled={!!currentSettings.masterConfigId}
                />
                {currentSettings.masterConfigId && (
                  <small style={{ color: "#28a745", fontSize: 12, fontWeight: 500 }}>
                    Auto-filled from configuration
                  </small>
                )}
              </div>

              {/* Access Token */}
              <div className="form-group">
                <label>Access Token *</label>
                <div className="input-with-icon">
                  <input
                    type={showAccessToken ? "text" : "password"}
                    value={currentSettings.accessToken}
                    onChange={(e) => handleInputChange("accessToken", e.target.value)}
                    disabled={!!currentSettings.masterConfigId}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowAccessToken((v) => !v)}
                  >
                    {showAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Verify Token */}
              <div className="form-group">
                <label>Verify Token *</label>
                <div className="input-with-icon">
                  <input
                    type={showVerifyToken ? "text" : "password"}
                    value={currentSettings.verifyToken}
                    onChange={(e) => handleInputChange("verifyToken", e.target.value)}
                    disabled={!!currentSettings.masterConfigId}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowVerifyToken((v) => !v)}
                  >
                    {showVerifyToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Header Media */}
              <div className="form-group">
                <label>Header Media (Optional)</label>
                <small style={{ display: "block", marginBottom: 8, color: "#666" }}>
                  Only add if your WhatsApp template has a media header parameter
                </small>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <label className="btn-secondary" style={{ cursor: "pointer", margin: 0 }}>
                    <Upload size={16} /> {uploading ? "Uploading..." : "Upload Media"}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      style={{ display: "none" }}
                    />
                  </label>

                  {currentSettings.headerImageUrl && (
                    <span style={{ fontSize: 12, color: "#28a745" }}>✓ Media uploaded</span>
                  )}
                </div>

                {currentSettings.headerImageUrl && (
                  <div style={{ marginTop: 10, position: "relative", display: "inline-block", width: "200px" }}>
                    {isVideo(currentSettings.headerImageUrl) ? (
                      <video
                        src={currentSettings.headerImageUrl}
                        style={{
                          width: "100%",
                          height: "150px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          objectFit: "cover",
                          display: "block",
                        }}
                        controls
                      />
                    ) : (
                      <img
                        src={currentSettings.headerImageUrl}
                        alt="Header preview"
                        style={{
                          width: "100%",
                          height: "150px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    )}

                    <button
                      type="button"
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "28px",
                        height: "28px",
                        padding: "0",
                        border: "none",
                        borderRadius: "50%",
                        background: "rgba(239, 68, 68, 0.9)",
                        color: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        fontWeight: "bold",
                        lineHeight: "1",
                      }}
                      onClick={() => handleInputChange("headerImageUrl", "")}
                      title="Remove media"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={currentSettings.isDefault}
                    onChange={(e) => handleInputChange("isDefault", e.target.checked)}
                  />
                  Set as default configuration
                </label>
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update" : "Save"}
                </button>
              </div>

              <small style={{ color: "#64748b", display: "block", paddingBottom: 10 }}>
                Note: Delete may fail if used in automation/campaign/logs.
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationTemplateManager;