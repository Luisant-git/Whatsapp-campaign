import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Key, Bell, Copy, Check, Calendar, Edit3, ArrowLeft,
  Smartphone, Image as ImageIcon, FileText, Video, MoreHorizontal,
  ChevronDown, HelpCircle, ExternalLink, TrendingUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTemplateAnalytics } from '../api/whatsapp';
import { API_BASE_URL } from '../api/config';

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

export default function TemplateDetailView({ template, onBack, onEdit }) {
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState('Trend');
  const [range, setRange] = useState({ label: 'Last 60 days', days: 60 });
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!template) return;
    fetchAnalytics();
  }, [template?.id, template?.templateId, range.days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - range.days);

      const targetId = template.templateId || template.id;
      const res = await getTemplateAnalytics(targetId, start.toISOString(), end.toISOString());
      if (res && res.analytics) {
        setAnalytics(res.analytics);
      }
    } catch (err) {
      console.log('Using template performance state (fallback/defaults if api unready):', err.message);
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

  const formatDateRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
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
      .replace(/{{(\d+)}}/g, (match, p1) => {
        const val = sampleValues[p1] || "123456";
        return val;
      });
  };

  const currencySymbol = analytics.currency === 'INR' ? '₹' : (analytics.currency || '₹');
  const statusStr = (template.status || 'ACTIVE').toUpperCase();
  const isApproved = statusStr === 'APPROVED' || statusStr === 'ACTIVE';

  const chartData = analytics.dataPoints?.length > 0 
    ? analytics.dataPoints.map(dp => ({
        date: new Date(dp.start * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        Sent: dp.sent,
        Delivered: dp.delivered,
        Read: dp.read
      }))
    : [
        { date: '10 Aug', Sent: 10, Delivered: 10, Read: 8 },
        { date: '15 Aug', Sent: 15, Delivered: 14, Read: 12 },
        { date: '20 Aug', Sent: 20, Delivered: 20, Read: 15 },
        { date: '25 Aug', Sent: 30, Delivered: 29, Read: 25 },
        { date: '30 Aug', Sent: 25, Delivered: 25, Read: 20 },
      ]; // dummy data for visual

  const categoryIcon = template.category?.toUpperCase() === 'AUTHENTICATION' ? <Key size={20} /> 
                     : template.category?.toUpperCase() === 'UTILITY' ? <Bell size={20} /> 
                     : <Megaphone size={20} />;

  const handleExportCSV = () => {
    const csvData = [
      ["Template", template?.name],
      ["Date Range", formatDateRange(range.days)],
      [],
      ["Metric", "Value"],
      ["Messages Sent", analytics.sent],
      ["Messages Delivered", analytics.delivered],
      ["Messages Read", analytics.read],
      ["Unique Replies", analytics.replies],
      ["Amount Spent", `${analytics.currency} ${analytics.amountSpent}`]
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${template?.name}.csv`;
    a.click();
    setShowExportMenu(false);
  };

  return (
    <div style={{ background: '#F0F2F5', minHeight: '100%', padding: '24px 32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#606770', fontSize: '14px', fontWeight: '600', cursor: 'pointer', padding: 0, marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Templates
      </button>

      {/* Header card area - matching exact meta pattern */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '8px', 
            backgroundColor: '#008069', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', color: '#ffffff', flexShrink: 0 
          }}>
            {categoryIcon}
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '700', color: '#1c1e21' }}>
              {template.name} · {getLanguageLabel(template.language)}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#606770' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', 
                borderRadius: '12px', backgroundColor: '#e8fdf0', color: '#047857', fontWeight: '600', fontSize: '12px'
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                Active – Quality pending
              </div>
              <span>·</span>
              <span>{template.category ? template.category.charAt(0) + template.category.slice(1).toLowerCase() : 'Authentication'}</span>
              <span>·</span>
              <span>Updated on {new Date(template.updatedAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>·</span>
              <div onClick={handleCopyId} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#1877f2', fontWeight: '500' }}>
                <span>ID: {template.templateId || template.id}</span>
                {copiedId ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </div>
            </div>
          </div>
        </div>
        
        {/* Top Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowRangeDropdown(!showRangeDropdown)} style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '6px', 
              border: '1px solid #ccd0d5', background: '#ffffff', fontSize: '13px', fontWeight: '600', color: '#1c1e21', cursor: 'pointer'
            }}>
              <Calendar size={14} color="#606770" />
              {range.label}: {formatDateRange(range.days)}
              <ChevronDown size={14} color="#606770" />
            </button>
            {showRangeDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', width: '240px', background: '#ffffff', border: '1px solid #ccd0d5', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, padding: '6px 0' }}>
                {[{ label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }, { label: 'Last 60 days', days: 60 }].map(opt => (
                  <div key={opt.label} onClick={() => { setRange(opt); setShowRangeDropdown(false); }} style={{ padding: '10px 16px', fontSize: '13px', cursor: 'pointer', background: range.days === opt.days ? '#f0f2f5' : 'transparent', fontWeight: range.days === opt.days ? '600' : '400', color: '#1c1e21', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onEdit(template)} style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '6px', 
            border: '1px solid #ccd0d5', background: '#ffffff', fontSize: '13px', fontWeight: '600', color: '#1c1e21', cursor: 'pointer'
          }}>
            <Edit3 size={14} /> Edit template
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #ccd0d5', background: '#ffffff', color: '#606770', cursor: 'pointer' }}>
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

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e6eb' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1c1e21' }}>Your template</h3>
            </div>
            <div style={{ 
              padding: '24px 20px', background: '#efeae2', 
              backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
              backgroundSize: '300px',
              minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'
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
                  {/* Buttons */}
                  <div style={{ borderTop: '1px solid #e9edef' }}>
                    {buttonsComponent?.buttons ? buttonsComponent.buttons.map((btn, bIdx) => (
                      <div key={bIdx} style={{ 
                        padding: '10px 14px', borderTop: bIdx > 0 ? '1px solid #e9edef' : 'none', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', 
                        color: '#00a884', fontSize: '13px', fontWeight: '600'
                      }}>
                        {btn.type === 'OTP' || btn.type === 'COPY_CODE' ? <Copy size={14} /> : null}
                        {btn.type === 'URL' ? <ExternalLink size={14} /> : null}
                        {btn.text || (btn.type === 'OTP' || btn.type === 'COPY_CODE' ? `Copy code` : 'Button')}
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
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#606770' }}>Last 60 days</p>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1c1e21' }}>--</div>
          </div>
        </div>

        {/* Right Column: Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top 3 Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1c1e21' }}>Amount spent</span>
                <HelpCircle size={14} color="#1c1e21" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500', color: '#1c1e21' }}>
                {currencySymbol}{Number(analytics.amountSpent || 0).toFixed(2)}
              </div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1c1e21' }}>Cost per message delivered</span>
                <HelpCircle size={14} color="#1c1e21" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500', color: '#1c1e21' }}>
                {currencySymbol}{Number(analytics.costPerDelivered || (analytics.delivered > 0 ? analytics.amountSpent / analytics.delivered : 0.06)).toFixed(2)}
              </div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1c1e21' }}>Cost per website button click</span>
                <HelpCircle size={14} color="#1c1e21" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500', color: '#1c1e21' }}>
                --
              </div>
            </div>
          </div>

          {/* Performance Card */}
          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #ccd0d5', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1c1e21' }}>Performance</h3>
              <HelpCircle size={14} color="#1c1e21" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div style={{ padding: '12px', border: '1px solid #ccd0d5', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21' }}>Messages sent</span>
                  <HelpCircle size={14} color="#1c1e21" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: '500', color: '#1c1e21' }}>{analytics.sent}</span>
                </div>
              </div>
              <div style={{ padding: '12px', border: '1px solid #ccd0d5', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21' }}>Messages delivered</span>
                  <HelpCircle size={14} color="#1c1e21" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: '500', color: '#1c1e21' }}>{analytics.delivered}</span>
                </div>
              </div>
              <div style={{ padding: '12px', border: '1px solid #ccd0d5', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21' }}>Messages read</span>
                  <HelpCircle size={14} color="#1c1e21" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '24px', fontWeight: '500', color: '#1c1e21' }}>{analytics.read}</span>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#606770' }}>({analytics.readRate}%)</span>
                </div>
              </div>
              <div style={{ padding: '12px', border: '1px solid #ccd0d5', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21' }}>Unique replies</span>
                  <HelpCircle size={14} color="#1c1e21" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: '500', color: '#1c1e21' }}>{analytics.replies}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#334155', fontWeight: '600' }}>Delivery & Engagement Funnel</h4>
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
                      <div style={{ width: `${step.pct}%`, height: '100%', background: step.color, borderRadius: '7px', transition: 'width 0.4s' }}></div>
                    </div>
                    <span style={{ width: '70px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                      {step.count} ({step.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
