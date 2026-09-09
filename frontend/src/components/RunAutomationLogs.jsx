import React, { useEffect, useMemo, useState } from "react";
import {
  MessageSquareText,
  CheckCircle2,
  XCircle,
  Percent,
  RefreshCw,
} from "lucide-react";

import "../styles/RunAutomationLogs.scss";
import { getRunAutomationLogs, getRunAutomationLogsTotal } from "../api/runDailyAutomationLogs";
import { getMetaLeadsAutomationLogs, getMetaLeadsAutomationLogsTotal } from "../api/metaLeadsAutomationLogs";

const LIMIT_OPTIONS = [10, 20, 50, 100];

const RunAutomationLogs = () => {
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [filterStatus, setFilterStatus] = useState("all"); // all | sent | failed
  const [filterType, setFilterType] = useState("all"); // all | DOB | ANNIVERSARY
  const [activeTab, setActiveTab] = useState("DAILY"); // DAILY | META_LEADS

  // ✅ OVERALL stats (not page-wise)
  const [overall, setOverall] = useState({ total: 0, sent: 0, failed: 0 });

  // ----------------------------
  // TABLE LOGS (paginated)
  // ----------------------------
  const fetchLogs = async (signal) => {
    setLoading(true);
    try {
      if (activeTab === "DAILY") {
        const json = await getRunAutomationLogs({
          page, limit, status: filterStatus, type: filterType !== "all" ? filterType : undefined, signal
        });
        setRows(Array.isArray(json?.data) ? json.data : []);
        setPagination(json?.pagination || null);
      } else {
        const json = await getMetaLeadsAutomationLogs({
          page, limit, status: filterStatus, signal
        });
        setRows(Array.isArray(json?.data) ? json.data : []);
        setPagination(json?.pagination || null);
      }
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.error(e);
        setRows([]);
        setPagination(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    fetchLogs(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line
  }, [page, limit, filterStatus, filterType, activeTab]);

  // ----------------------------
  // OVERALL COUNTS (not paginated)
  // Uses your separate endpoint:
  // GET /run-daily-automation/logs/total?status=&type=
  // ----------------------------
  const fetchOverallCounts = async (signal) => {
    try {
      let tTotal = 0, sTotal = 0, fTotal = 0;

      if (activeTab === "DAILY") {
        const typeParam = filterType !== "all" ? filterType : undefined;
        
        if (filterStatus === "sent") {
          const [{ total }] = await Promise.all([getRunAutomationLogsTotal({ status: "sent", type: typeParam, signal })]);
          tTotal = total ?? 0; sTotal = total ?? 0;
        } else if (filterStatus === "failed") {
          const [{ total }] = await Promise.all([getRunAutomationLogsTotal({ status: "failed", type: typeParam, signal })]);
          tTotal = total ?? 0; fTotal = total ?? 0;
        } else {
          const [t, s, f] = await Promise.all([
            getRunAutomationLogsTotal({ status: "all", type: typeParam, signal }),
            getRunAutomationLogsTotal({ status: "sent", type: typeParam, signal }),
            getRunAutomationLogsTotal({ status: "failed", type: typeParam, signal }),
          ]);
          tTotal = t?.total ?? 0; sTotal = s?.total ?? 0; fTotal = f?.total ?? 0;
        }
      } else {
        if (filterStatus === "sent") {
          const [{ total }] = await Promise.all([getMetaLeadsAutomationLogsTotal({ status: "sent", signal })]);
          tTotal = total ?? 0; sTotal = total ?? 0;
        } else if (filterStatus === "failed") {
          const [{ total }] = await Promise.all([getMetaLeadsAutomationLogsTotal({ status: "failed", signal })]);
          tTotal = total ?? 0; fTotal = total ?? 0;
        } else {
          const [t, s, f] = await Promise.all([
            getMetaLeadsAutomationLogsTotal({ status: "all", signal }),
            getMetaLeadsAutomationLogsTotal({ status: "sent", signal }),
            getMetaLeadsAutomationLogsTotal({ status: "failed", signal }),
          ]);
          tTotal = t?.total ?? 0; sTotal = s?.total ?? 0; fTotal = f?.total ?? 0;
        }
      }

      setOverall({ total: tTotal, sent: sTotal, failed: fTotal });
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.error(e);
        setOverall({ total: 0, sent: 0, failed: 0 });
      }
    }
  };



  useEffect(() => {
    const ac = new AbortController();
    fetchOverallCounts(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line
  }, [filterStatus, filterType, activeTab]);

  const successRate = useMemo(() => {
    return overall.total > 0
      ? ((overall.sent / overall.total) * 100).toFixed(2)
      : "0.00";
  }, [overall.total, overall.sent]);

  const badgeClass = (status) => {
    if (status === "sent") return "status-badge status-sent";
    if (status === "failed") return "status-badge status-failed";
    return "status-badge status-unknown";
  };

  const SummaryCard = ({ title, value, icon, tone }) => {
    return (
      <div className={`summary-ui-card tone-${tone}`}>
        <div className="summary-ui-icon">{icon}</div>
        <div className="summary-ui-text">
          <div className="summary-ui-title">{title}</div>
          <div className="summary-ui-value">{value}</div>
        </div>
      </div>
    );
  };

  const onRefresh = () => {
    const ac1 = new AbortController();
    fetchLogs(ac1.signal);

    const ac2 = new AbortController();
    fetchOverallCounts(ac2.signal);
  };

  return (
    <div className="run-automation-logs">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="page-title">
          <h1>Run Automation Logs</h1>
          <span className="page-subtitle">
            Shows which contact got message, template used, success/failed and
            time.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            style={{ 
              padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
              border: activeTab === 'DAILY' ? '1px solid #1e293b' : '1px solid #cbd5e1', 
              background: activeTab === 'DAILY' ? '#1e293b' : '#fff', 
              color: activeTab === 'DAILY' ? '#fff' : '#1e293b', 
            }}
            onClick={() => { setActiveTab('DAILY'); setPage(1); }}
          >Daily Automations</button>
          <button 
            style={{ 
              padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
              border: activeTab === 'META_LEADS' ? '1px solid #1e293b' : '1px solid #cbd5e1', 
              background: activeTab === 'META_LEADS' ? '#1e293b' : '#fff', 
              color: activeTab === 'META_LEADS' ? '#fff' : '#1e293b', 
            }}
            onClick={() => { setActiveTab('META_LEADS'); setPage(1); }}
          >Meta Leads</button>
        </div>
      </div>

      <div className="results-section">
        {/* ✅ SUMMARY CARDS (OVERALL, not page-wise) */}
        <div className="summary-ui-grid">
          <SummaryCard
            title="Total (overall)"
            value={overall.total}
            tone="total"
            icon={<MessageSquareText size={20} />}
          />
          <SummaryCard
            title="Sent (overall)"
            value={overall.sent}
            tone="sent"
            icon={<CheckCircle2 size={20} />}
          />
          <SummaryCard
            title="Failed (overall)"
            value={overall.failed}
            tone="failed"
            icon={<XCircle size={20} />}
          />
          <SummaryCard
            title="Success Rate (overall)"
            value={`${successRate}%`}
            tone="rate"
            icon={<Percent size={20} />}
          />
        </div>

        {/* FILTERS + LIMIT */}
        <div className="results-filters" style={{ alignItems: "end" }}>
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {activeTab === 'DAILY' && (
            <div className="filter-group">
              <label>Type:</label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="DOB">DOB</option>
                <option value="ANNIVERSARY">ANNIVERSARY</option>
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>Entries:</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* This is table pagination total (after backend filters) */}
          {pagination?.total != null && (
            <div className="filter-group" style={{ marginLeft: "auto" }}>
              <label>Total logs (table):</label>
              <div style={{ padding: "10px 12px", color: "#334155" }}>
                {pagination.total}
              </div>
            </div>
          )}
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="loading">Loading logs...</div>
        ) : (
          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>S.NO</th>
                  <th>{activeTab === 'DAILY' ? 'Contact' : 'Lead Name'}</th>
                  <th>Phone</th>
                  {activeTab === 'DAILY' && <th>Type</th>}
                  {activeTab === 'DAILY' && <th>Day Offset</th>}
                  {activeTab === 'META_LEADS' && <th>Step</th>}
                  <th>Template</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{(page - 1) * limit + idx + 1}</td>
                    <td>{activeTab === 'DAILY' ? r.contact?.name || "-" : r.metaLead?.name || "-"}</td>
                    <td>{activeTab === 'DAILY' ? r.contact?.phone || "-" : r.metaLead?.phone || "-"}</td>
                    {activeTab === 'DAILY' && <td>{r.runDailyAutomation?.eventType || "-"}</td>}
                    {activeTab === 'DAILY' && <td>{r.runDailyAutomation?.dayBefore ?? "-"}</td>}
                    {activeTab === 'META_LEADS' && <td>{r.stepIndex ?? "-"}</td>}

                    <td>
                      {r.templateName || r.whatsAppSettings?.templateName || "-"}
                      <div className="subtext">
                        lang: {r.whatsAppSettings?.language || "-"}
                      </div>
                    </td>

                    <td>
                      <span className={badgeClass(r.status)}>
                        {r.status || "unknown"}
                      </span>
                    </td>

                    <td>
                      {r.sentAt ? new Date(r.sentAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: 20, color: "#64748b" }}>
                      No logs found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {pagination && pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>

            <span className="pagination-info">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              className="pagination-btn"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RunAutomationLogs;