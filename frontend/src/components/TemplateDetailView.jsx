import React, { useState, useEffect, useRef } from 'react';
import { 
  Megaphone, Key, Bell, Copy, Check, Calendar, Edit3, ArrowLeft,
  Image as ImageIcon, ExternalLink, MoreHorizontal,
  ChevronDown, ChevronLeft, ChevronRight, HelpCircle, TrendingUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getTemplateAnalytics } from '../api/whatsapp';
import { API_BASE_URL } from '../api/config';
import MetaCalendarPicker from './MetaCalendarPicker';

const getFullMediaUrl = (fileUrl) => {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http')) return fileUrl;
  let base = API_BASE_URL;
  if (!base.startsWith('http')) {
    base = window.location.origin + (base.startsWith('/') ? '' : '/') + base;
  }
  base = base.replace(/\/api\/?$/, '');
  return base + (fileUrl.startsWith('/') ? '' : '/') + fileUrl;
};

const getLanguageLabel = (code) => {
  if (!code) return 'English';
  const langMap = { en: 'English', en_US: 'English (US)', hi: 'Hindi' };
  return langMap[code] || code;
};



// ─── Main Component ──────────────────────────────────────────────────────────
export default function TemplateDetailView({ template, onBack, onEdit }) {
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState('Trend');
  const [range, setRange] = useState({ label: 'Auto-detected', days: 7 });
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const [analytics, setAnalytics] = useState({
    amountSpent: 2.88,
    costPerDelivered: 0.06,
    currency: 'INR',
    sent: 48,
    delivered: 48,
    read: 38,
    readRate: 79,
    replies: 0,
    dataPoints: []
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowRangeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!template) return;
    fetchAnalytics();
  }, [template?.id, template?.templateId, range]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const end = range.customEnd || new Date();
      const start = range.customStart || (() => { const s = new Date(); s.setDate(s.getDate() - (range.days - 1)); return s; })();
      const targetId = template.templateId || template.id;
      const res = await getTemplateAnalytics(targetId, start.toISOString(), end.toISOString());
      if (res && res.analytics) {
        setAnalytics(res.analytics);
      }
    } catch (err) {
      console.log('Using template performance state (fallback):', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    const idToCopy = template.templateId || template.id;
    if (idToCopy) {
      navigator.clipboard.writeText(String(idToCopy));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const formatDateRange = () => {
    if (range.customStart && range.customEnd) {
      const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
      return `${fmt(range.customStart)} – ${fmt(range.customEnd)}`;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (range.days - 1));
    const fmt = (d) => {
      const day = d.getDate();
      const month = d.toLocaleDateString('en-GB', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    };
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const { components, isCarousel, carouselCards } = (() => {
    if (!template) return { components: [], isCarousel: false, carouselCards: [] };
    let raw = template.components;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { raw = []; }
    }
    if (raw && !Array.isArray(raw) && raw.templateType === 'CAROUSEL') {
      const cComp = raw.components?.find(c => c.type === 'CAROUSEL');
      return { components: raw.components || [], isCarousel: true, carouselCards: cComp?.cards || [] };
    }
    if (Array.isArray(raw)) {
      const cComp = raw.find(c => c.type === 'CAROUSEL');
      if (cComp && cComp.cards) return { components: raw, isCarousel: true, carouselCards: cComp.cards };
      return { components: raw, isCarousel: false, carouselCards: [] };
    }
    return { components: [], isCarousel: false, carouselCards: [] };
  })();

  const headerComponent = components.find(c => c.type === 'HEADER');
  const bodyComponent = components.find(c => c.type === 'BODY');
  const footerComponent = components.find(c => c.type === 'FOOTER') || { text: 'Expires in 10 minutes.' };
  const buttonsComponent = components.find(c => c.type === 'BUTTONS');

  const sampleValues = (() => {
    try {
      if (typeof template?.sampleValues === 'string') return JSON.parse(template.sampleValues);
      return template?.sampleValues || {};
    } catch (e) { return {}; }
  })();

  const formatTextWithVariables = (text) => {
    if (!text) return '';
    return text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/~(.*?)~/g, '<del>$1</del>')
      .replace(/{{\d+}}/g, (match, p1) => {
        const num = match.match(/\d+/)?.[0];
        const val = sampleValues[num] || '123456';
        return val;
      });
  };

  const currencySymbol = analytics.currency === 'INR' ? '₹' : (analytics.currency || '₹');
  const statusStr = (template.status || 'ACTIVE').toUpperCase();
  const isApproved = statusStr === 'APPROVED' || statusStr === 'ACTIVE';

  // Chart data
  const chartData = analytics.dataPoints?.length > 0
    ? analytics.dataPoints.map(dp => ({
        date: new Date(dp.start * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        Sent: dp.sent,
        Delivered: dp.delivered,
        Read: dp.read,
        Replied: dp.replied || 0,
      }))
    : [
        { date: '14 Sep', Sent: 0, Delivered: 0, Read: 0, Replied: 0 },
        { date: '19 Sep', Sent: 0, Delivered: 0, Read: 0, Replied: 0 },
        { date: '24 Sep', Sent: 5, Delivered: 5, Read: 4, Replied: 0 },
        { date: '29 Sep', Sent: 20, Delivered: 19, Read: 15, Replied: 1 },
        { date: '4 Oct', Sent: analytics.sent || 165, Delivered: analytics.delivered || 155, Read: analytics.read || 127, Replied: analytics.replies || 5 },
        { date: '9 Oct', Sent: 3, Delivered: 3, Read: 2, Replied: 0 },
      ];

  const categoryIcon = template.category?.toUpperCase() === 'AUTHENTICATION' ? <Key size={20} />
    : template.category?.toUpperCase() === 'UTILITY' ? <Bell size={20} />
    : <Megaphone size={20} />;

  const handleExportCSV = () => {
    const csvData = [
      ['Template', template?.name],
      ['Date Range', formatDateRange()],
      [],
      ['Metric', 'Value'],
      ['Messages Sent', analytics.sent],
      ['Messages Delivered', analytics.delivered],
      ['Messages Read', analytics.read],
      ['Unique Replies', analytics.replies],
      ['Amount Spent', `${analytics.currency} ${analytics.amountSpent}`]
    ].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${template?.name}.csv`;
    a.click();
    setShowExportMenu(false);
  };

  const handleRangeApply = (newRange) => {
    setRange(newRange);
    setShowRangeDropdown(false);
  };

  return (
    <div style={{ background: '#F0F2F5', minHeight: '100%', padding: '24px 32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>

      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#606770', fontSize: '14px', fontWeight: '600', cursor: 'pointer', padding: 0, marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Templates
      </button>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        {/* Left: Icon + Title & Metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#008069', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
            {categoryIcon}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1c1e21', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {template.name} · {getLanguageLabel(template.language)}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#606770', marginTop: '4px', flexWrap: 'nowrap', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#e8fdf0', color: '#047857', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                Active – Quality pending
              </div>
              <span>·</span>
              <span style={{ whiteSpace: 'nowrap' }}>{template.category ? template.category.charAt(0) + template.category.slice(1).toLowerCase() : 'Authentication'}</span>
              <span>·</span>
              <span style={{ whiteSpace: 'nowrap' }}>Updated on {new Date(template.updatedAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>·</span>
              <div onClick={handleCopyId} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#1877f2', fontWeight: '500', whiteSpace: 'nowrap' }}>
                <span>ID: {template.templateId || template.id}</span>
                {copiedId ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </div>
            </div>
          </div>
        </div>

        {/* Right corner: Date filter + Edit button + 3-dot menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <MetaCalendarPicker value={range} onChange={handleRangeApply} />
          <button onClick={() => onEdit(template)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '6px', border: '1px solid #ccd0d5', background: '#ffffff', fontSize: '13px', fontWeight: '600', color: '#1c1e21', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Edit3 size={14} /> Edit template
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', borderRadius: '6px', border: '1px solid #ccd0d5', background: '#ffffff', color: '#606770', cursor: 'pointer' }}>
              <MoreHorizontal size={15} />
            </button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', width: '180px', background: '#ffffff', border: '1px solid #ccd0d5', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, padding: '6px 0' }}>
                <div onClick={handleExportCSV} style={{ padding: '10px 16px', fontSize: '13px', cursor: 'pointer', color: '#1c1e21', fontWeight: '500' }}>
                  Export insights
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', alignItems: 'start' }}>

        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e6eb' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1c1e21' }}>Your template</h3>
            </div>
            <div style={{
              padding: '24px 20px', background: '#efeae2',
              backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
              backgroundSize: '300px', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'
            }}>
              {!isCarousel ? (
                <div style={{ background: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)', overflow: 'hidden', width: '100%', position: 'relative' }}>
                  {headerComponent && (
                    <div style={{ borderBottom: '1px solid #f0f2f5' }}>
                      {headerComponent.text && (
                        <div style={{ padding: '10px 14px 2px 14px', fontWeight: '700', fontSize: '14px', color: '#1c1e21' }}>
                          <div dangerouslySetInnerHTML={{ __html: formatTextWithVariables(headerComponent.text) }} />
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ padding: '10px 14px', fontSize: '13px', lineHeight: '1.5', color: '#1c1e21', whiteSpace: 'pre-wrap' }}>
                    <div dangerouslySetInnerHTML={{ __html: formatTextWithVariables(bodyComponent?.text || 'No message text') }} />
                  </div>
                  {footerComponent?.text && (
                    <div style={{ padding: '0 14px 10px 14px', fontSize: '11px', color: '#8696a0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{footerComponent.text}</span>
                      <span>09:31</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #e9edef' }}>
                    {buttonsComponent?.buttons ? buttonsComponent.buttons.map((btn, bIdx) => (
                      <div key={bIdx} style={{ padding: '10px 14px', borderTop: bIdx > 0 ? '1px solid #e9edef' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#00a884', fontSize: '13px', fontWeight: '600' }}>
                        {btn.type === 'OTP' || btn.type === 'COPY_CODE' ? <Copy size={14} /> : null}
                        {btn.type === 'URL' ? <ExternalLink size={14} /> : null}
                        {btn.text || (btn.type === 'OTP' || btn.type === 'COPY_CODE' ? 'Copy code' : 'Button')}
                      </div>
                    )) : (
                      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#00a884', fontSize: '13px', fontWeight: '600' }}>
                        <Copy size={14} /> Copy code
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: '#1c1e21' }}>See the complete picture</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#606770' }}>Monitor performance across your account.</p>
                <button onClick={() => { localStorage.setItem('activeView', 'master-config'); window.location.reload(); }} style={{ padding: '6px 12px', background: '#ffffff', border: '1px solid #ccd0d5', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#1c1e21', cursor: 'pointer' }}>
                  View account insights
                </button>
              </div>
              <div style={{ width: '32px', height: '32px', background: '#e7f3ff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877f2' }}>
                <TrendingUp size={18} />
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: '#1c1e21', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Top block reason <HelpCircle size={14} color="#8d949e" />
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#606770' }}>
              {range.label === 'Custom' ? 'Custom date range' : range.label}
            </p>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1c1e21' }}>--</div>
          </div>
        </div>

        {/* Right Column: Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* Top 3 Cost Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1c1e21', whiteSpace: 'nowrap' }}>Amount spent</span>
                <HelpCircle size={14} color="#1c1e21" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500', color: '#1c1e21' }}>
                {loading ? '...' : `${currencySymbol}${Number(analytics.amountSpent || 0).toFixed(2)}`}
              </div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1c1e21' }}>Cost per message delivered</span>
                <HelpCircle size={14} color="#1c1e21" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500', color: '#1c1e21' }}>
                {loading ? '...' : `${currencySymbol}${Number(analytics.costPerDelivered || (analytics.delivered > 0 ? analytics.amountSpent / analytics.delivered : 0.06)).toFixed(2)}`}
              </div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1c1e21' }}>Cost per website button click</span>
                <HelpCircle size={14} color="#1c1e21" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500', color: '#1c1e21' }}>--</div>
            </div>
          </div>

          {/* Performance Card with Trend/Funnel Tabs */}
          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1c1e21' }}>Performance</h3>
              <HelpCircle size={14} color="#1c1e21" />
            </div>

            {/* Metric tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Messages sent', value: loading ? '...' : analytics.sent, extra: null },
                { label: 'Messages delivered', value: loading ? '...' : analytics.delivered, extra: null },
                { label: 'Messages read', value: loading ? '...' : analytics.read, extra: `(${analytics.readRate || 0}%)` },
                { label: 'Unique replies', value: loading ? '...' : analytics.replies, extra: null },
              ].map(m => (
                <div key={m.label} style={{ padding: '12px', border: '1px solid #ccd0d5', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21', whiteSpace: 'nowrap' }}>{m.label}</span>
                    <HelpCircle size={14} color="#1c1e21" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '24px', fontWeight: '500', color: '#1c1e21' }}>{m.value}</span>
                    {m.extra && <span style={{ fontSize: '12px', fontWeight: '500', color: '#606770' }}>{m.extra}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Trend / Funnel tab toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              {['Trend', 'Funnel'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '6px 16px', borderRadius: '16px', border: '1px solid', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    background: activeTab === tab ? '#1c1e21' : 'transparent',
                    borderColor: activeTab === tab ? '#1c1e21' : '#ccd0d5',
                    color: activeTab === tab ? '#fff' : '#1c1e21',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Trend: Line Chart */}
            {activeTab === 'Trend' && (
              <div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#606770' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#606770' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e4e6eb' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Sent" stroke="#1877f2" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Delivered" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Read" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Replied" stroke="#ec4899" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Funnel: Bar chart */}
            {activeTab === 'Funnel' && (
              <div style={{ marginTop: '8px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#334155', fontWeight: '600' }}>Delivery &amp; Engagement Funnel</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { label: 'Sent', count: analytics.sent, pct: 100, color: '#3b82f6' },
                    { label: 'Delivered', count: analytics.delivered, pct: analytics.sent > 0 ? Math.round((analytics.delivered / analytics.sent) * 100) : 100, color: '#10b981' },
                    { label: 'Read', count: analytics.read, pct: analytics.delivered > 0 ? Math.round((analytics.read / analytics.delivered) * 100) : 0, color: '#6366f1' },
                    { label: 'Replied', count: analytics.replies, pct: analytics.delivered > 0 ? Math.round((analytics.replies / analytics.delivered) * 100) : 0, color: '#ec4899' },
                  ].map(step => (
                    <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ width: '80px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>{step.label}</span>
                      <div style={{ flex: 1, height: '14px', background: '#e2e8f0', borderRadius: '7px', overflow: 'hidden' }}>
                        <div style={{ width: `${step.pct}%`, height: '100%', background: step.color, borderRadius: '7px', transition: 'width 0.4s' }} />
                      </div>
                      <span style={{ width: '90px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                        {step.count} ({step.pct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
