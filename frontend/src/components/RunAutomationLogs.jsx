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

const LIMIT_OPTIONS = [10, 20, 50, 100];

const RunAutomationLogs = () => {
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [filterStatus, setFilterStatus] = useState("all"); // all | sent | failed
  const [filterType, setFilterType] = useState("all"); // all | DOB | ANNIVERSARY

  // ✅ OVERALL stats (not page-wise)
  const [overall, setOverall] = useState({ total: 0, sent: 0, failed: 0 });

  const getType = (r) => r?.runDailyAutomation?.eventType || "-";

  // ----------------------------
  // TABLE LOGS (paginated)
  // ----------------------------
  const fetchLogs = async (signal) => {
    setLoading(true);
    try {
      const json = await getRunAutomationLogs({
        page,
        limit,
        status: filterStatus,
        type: filterType,
        signal,
      });

      setRows(Array.isArray(json?.data) ? json.data : []);
      setPagination(json?.pagination || null);
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
  }, [page, limit, filterStatus, filterType]);

  // ----------------------------
  // OVERALL COUNTS (not paginated)
  // Uses your separate endpoint:
  // GET /run-daily-automation/logs/total?status=&type=
  // ----------------------------
  const fetchOverallCounts = async (signal) => {
    try {
      // If user filters by status, summary should follow that filter too:
      if (filterStatus === "sent") {
        const [{ total: sent }] = await Promise.all([
          getRunAutomationLogsTotal({ status: "sent", type: filterType, signal }),
        ]);
        setOverall({ total: sent ?? 0, sent: sent ?? 0, failed: 0 });
        return;
      }

      if (filterStatus === "failed") {
        const [{ total: failed }] = await Promise.all([
          getRunAutomationLogsTotal({
            status: "failed",
            type: filterType,
            signal,
          }),
        ]);
        setOverall({ total: failed ?? 0, sent: 0, failed: failed ?? 0 });
        return;
      }

      // filterStatus === "all"
      const [t, s, f] = await Promise.all([
        getRunAutomationLogsTotal({ status: "all", type: filterType, signal }),
        getRunAutomationLogsTotal({ status: "sent", type: filterType, signal }),
        getRunAutomationLogsTotal({
          status: "failed",
          type: filterType,
          signal,
        }),
      ]);

      setOverall({
        total: Number(t?.total ?? 0),
        sent: Number(s?.total ?? 0),
        failed: Number(f?.total ?? 0),
      });
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
  }, [filterStatus, filterType]);

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
      <div className="page-header">
        <div className="page-title">
          <h1>Run Automation Logs</h1>
          <span className="page-subtitle">
            Shows which contact got message, template used, success/failed and
            time.
          </span>
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
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Day Offset</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{(page - 1) * limit + idx + 1}</td>
                    <td>{r.contact?.name || "-"}</td>
                    <td>{r.contact?.phone || "-"}</td>
                    <td>{getType(r)}</td>
                    <td>{r.runDailyAutomation?.dayBefore ?? "-"}</td>

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