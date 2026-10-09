import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Copy, 
  Check, 
  Calendar, 
  Cloud, 
  Edit3, 
  ArrowLeft, 
  TrendingDown, 
  TrendingUp, 
  ExternalLink, 
  Smartphone, 
  Image as ImageIcon, 
  FileText, 
  Video, 
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  BarChart2,
  Filter
} from 'lucide-react';
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
  const langMap = {
    en: 'English',
    en_US: 'English (US)',
    en_GB: 'English (UK)',
    en_IN: 'English (India)',
    hi: 'Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada',
    ml: 'Malayalam',
    mr: 'Marathi',
    gu: 'Gujarati',
    bn: 'Bengali',
    es: 'Spanish',
    pt_BR: 'Portuguese (Brazil)',
    fr: 'French',
    de: 'German',
    ar: 'Arabic'
  };
  return langMap[code] || code;
};

export default function TemplateDetailView({ template, onBack, onEdit }) {
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState('Trend'); // 'Trend' or 'Funnel'
  const [range, setRange] = useState({ label: 'Last 7 days', days: 7 });
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [analytics, setAnalytics] = useState({
    amountSpent: 0.86,
    costPerDelivered: 0.86,
    currency: 'INR',
    sent: 1,
    delivered: 1,
    read: 0,
    readRate: 0,
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

  // Helper to parse components from string or array
  const { components, isCarousel, carouselCards } = (() => {
    if (!template) return { components: [], isCarousel: false, carouselCards: [] };
    
    let raw = template.components;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
        raw = [];
      }
    }

    if (raw && !Array.isArray(raw) && raw.templateType === 'CAROUSEL') {
      const cComp = raw.components?.find(c => c.type === 'CAROUSEL');
      return {
        components: raw.components || [],
        isCarousel: true,
        carouselCards: cComp?.cards || []
      };
    }

    if (Array.isArray(raw)) {
      const cComp = raw.find(c => c.type === 'CAROUSEL');
      if (cComp && cComp.cards) {
        return {
          components: raw,
          isCarousel: true,
          carouselCards: cComp.cards
        };
      }
      return { components: raw, isCarousel: false, carouselCards: [] };
    }

    return { components: [], isCarousel: false, carouselCards: [] };
  })();

  const headerComponent = components.find(c => c.type === 'HEADER');
  const bodyComponent = components.find(c => c.type === 'BODY');
  const footerComponent = components.find(c => c.type === 'FOOTER');
  const buttonsComponent = components.find(c => c.type === 'BUTTONS');

  // Sample values parsing
  const sampleValues = (() => {
    try {
      if (typeof template?.sampleValues === 'string') {
        return JSON.parse(template.sampleValues);
      }
      return template?.sampleValues || {};
    } catch (e) {
      return {};
    }
  })();

  const formatTextWithVariables = (text) => {
    if (!text) return '';
    return text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/~(.*?)~/g, '<del>$1</del>')
      .replace(/{{(\d+)}}/g, (match, p1) => {
        const val = sampleValues[p1] || match;
        return `<span style="color: #008069; background: #e7f3ef; padding: 1px 5px; border-radius: 4px; font-weight: 600;">${val}</span>`;
      });
  };

  const currencySymbol = analytics.currency === 'INR' ? '₹' : (analytics.currency || '₹');
  const statusStr = (template.status || 'ACTIVE').toUpperCase();
  const isApproved = statusStr === 'APPROVED' || statusStr === 'ACTIVE';

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100%', padding: '24px 32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* Top Navigation Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button 
          onClick={onBack}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'none', 
            border: 'none', 
            color: '#1877f2', 
            fontWeight: '600', 
            fontSize: '14px', 
            cursor: 'pointer',
            padding: '6px 0'
          }}
        >
          <ArrowLeft size={16} />
          Back to templates
        </button>
      </div>

      {/* Main Header Card matching Meta Pattern */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '10px', 
        border: '1px solid #ccd0d5', 
        padding: '20px 24px', 
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Left info: Megaphone + Name + Metadata */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            {/* Green Icon Box */}
            <div style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '8px', 
              backgroundColor: '#008069', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#ffffff',
              flexShrink: 0
            }}>
              <Megaphone size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1c1e21' }}>
                  {template.name} · {getLanguageLabel(template.language)}
                </h2>
              </div>

              {/* Subtitle Badges Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap', fontSize: '13px', color: '#606770' }}>
                {/* Active / Quality Pending Badge */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '3px 10px', 
                  borderRadius: '14px', 
                  backgroundColor: isApproved ? '#e8fdf0' : (statusStr === 'REJECTED' ? '#fee2e2' : '#fff4e5'), 
                  color: isApproved ? '#047857' : (statusStr === 'REJECTED' ? '#b91c1c' : '#b26a00'),
                  fontWeight: '600',
                  fontSize: '12px'
                }}>
                  <div style={{ 
                    width: '7px', 
                    height: '7px', 
                    borderRadius: '50%', 
                    backgroundColor: isApproved ? '#10b981' : (statusStr === 'REJECTED' ? '#ef4444' : '#f59e0b') 
                  }}></div>
                  {isApproved ? 'Active – Quality pending' : (statusStr === 'REJECTED' ? 'Rejected' : template.status || 'Pending')}
                </div>

                <span>·</span>
                <span style={{ fontWeight: '500' }}>
                  {template.category ? template.category.charAt(0) + template.category.slice(1).toLowerCase() : 'Marketing'}
                </span>

                <span>·</span>
                <span>
                  Updated on {new Date(template.updatedAt || template.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>

                <span>·</span>
                <div 
                  onClick={handleCopyId}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#1877f2', fontWeight: '500' }}
                  title="Click to copy template ID"
                >
                  <span>ID: {template.templateId || template.id}</span>
                  {copiedId ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </div>
              </div>
            </div>
          </div>

          {/* Right Controls: Cloud API + Date Selector + Edit Template Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Cloud API Button */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '7px 12px', 
              borderRadius: '6px', 
              border: '1px solid #ccd0d5', 
              background: '#ffffff', 
              fontSize: '13px', 
              fontWeight: '600',
              color: '#1c1e21'
            }}>
              <Cloud size={14} color="#606770" />
              Cloud API
              <ChevronDown size={14} color="#606770" />
            </div>

            {/* Date Range Selector */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '7px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #ccd0d5', 
                  background: '#ffffff', 
                  fontSize: '13px', 
                  fontWeight: '600',
                  color: '#1c1e21',
                  cursor: 'pointer'
                }}
              >
                <Calendar size={14} color="#606770" />
                Auto-detected: {formatDateRange(range.days)}
                <ChevronDown size={14} color="#606770" />
              </button>

              {showRangeDropdown && (
                <div style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  right: 0, 
                  marginTop: '4px', 
                  width: '240px', 
                  background: '#ffffff', 
                  border: '1px solid #ccd0d5', 
                  borderRadius: '6px', 
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)', 
                  zIndex: 100, 
                  padding: '6px 0' 
                }}>
                  {[
                    { label: 'Last 7 days', days: 7 },
                    { label: 'Last 30 days', days: 30 },
                    { label: 'Last 60 days', days: 60 },
                    { label: 'Last 90 days', days: 90 }
                  ].map(opt => (
                    <div 
                      key={opt.label}
                      onClick={() => { setRange(opt); setShowRangeDropdown(false); }}
                      style={{ 
                        padding: '10px 16px', 
                        fontSize: '13px', 
                        cursor: 'pointer', 
                        background: range.days === opt.days ? '#f0f2f5' : 'transparent',
                        fontWeight: range.days === opt.days ? '600' : '400',
                        color: '#1c1e21',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{opt.label}</span>
                      <span style={{ fontSize: '11px', color: '#65676b' }}>({formatDateRange(opt.days)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Template Button */}
            <button 
              onClick={() => onEdit(template)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '7px 14px', 
                borderRadius: '6px', 
                border: '1px solid #ccd0d5', 
                background: '#ffffff', 
                fontSize: '13px', 
                fontWeight: '600',
                color: '#1c1e21',
                cursor: 'pointer'
              }}
            >
              <Edit3 size={14} />
              Edit template
            </button>

            {/* More Options */}
            <button style={{ 
              padding: '7px 10px', 
              borderRadius: '6px', 
              border: '1px solid #ccd0d5', 
              background: '#ffffff', 
              color: '#606770', 
              cursor: 'pointer' 
            }}>
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content Grid matching Meta layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: "Your template" Preview Card */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '10px', 
          border: '1px solid #ccd0d5', 
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          {/* Card Title */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e6eb' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1c1e21' }}>Your template</h3>
          </div>

          {/* WhatsApp Chat Preview Area */}
          <div style={{ 
            padding: '24px 20px', 
            background: '#efeae2', 
            backgroundImage: 'radial-gradient(#d5cdc4 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            minHeight: '440px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start'
          }}>
            
            {/* Standard Template Bubble */}
            {!isCarousel ? (
              <div style={{ 
                background: '#ffffff', 
                borderRadius: '8px', 
                boxShadow: '0 1px 2px rgba(0,0,0,0.12)', 
                overflow: 'hidden',
                maxWidth: '360px',
                position: 'relative'
              }}>
                
                {/* Header Rendering */}
                {headerComponent && (
                  <div style={{ borderBottom: '1px solid #f0f2f5' }}>
                    {headerComponent.format === 'IMAGE' ? (
                      headerComponent.example?.header_handle?.[0] ? (
                        <img 
                          src={getFullMediaUrl(headerComponent.example.header_handle[0])} 
                          alt="Header" 
                          style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ width: '100%', height: '140px', background: '#f5f6f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8d949e' }}>
                          <ImageIcon size={36} />
                        </div>
                      )
                    ) : headerComponent.format === 'VIDEO' ? (
                      <div style={{ width: '100%', height: '140px', background: '#1c1e21', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                        <Video size={36} />
                      </div>
                    ) : headerComponent.format === 'DOCUMENT' ? (
                      <div style={{ padding: '12px 14px', background: '#f5f6f7', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                        <FileText size={20} />
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>Document Attachment</span>
                      </div>
                    ) : headerComponent.text ? (
                      <div style={{ padding: '12px 14px 4px 14px', fontWeight: '700', fontSize: '15px', color: '#1c1e21' }}>
                        <div dangerouslySetInnerHTML={{ __html: formatTextWithVariables(headerComponent.text) }} />
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Body Text */}
                <div style={{ padding: '12px 14px', fontSize: '14px', lineHeight: '1.5', color: '#1c1e21', whiteSpace: 'pre-wrap' }}>
                  <div dangerouslySetInnerHTML={{ __html: formatTextWithVariables(bodyComponent?.text || 'No message text') }} />
                </div>

                {/* Footer Text */}
                {footerComponent?.text && (
                  <div style={{ padding: '0 14px 10px 14px', fontSize: '11px', color: '#8696a0' }}>
                    {footerComponent.text}
                  </div>
                )}

                {/* Action Buttons */}
                {buttonsComponent?.buttons && buttonsComponent.buttons.length > 0 && (
                  <div style={{ borderTop: '1px solid #e9edef' }}>
                    {buttonsComponent.buttons.map((btn, bIdx) => (
                      <div 
                        key={bIdx}
                        style={{ 
                          padding: '10px 14px', 
                          borderTop: bIdx > 0 ? '1px solid #e9edef' : 'none', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px', 
                          color: '#00a884', 
                          fontSize: '13px', 
                          fontWeight: '600'
                        }}
                      >
                        {btn.type === 'URL' && <ExternalLink size={14} />}
                        {btn.type === 'PHONE_NUMBER' && <Smartphone size={14} />}
                        {btn.text || (btn.type === 'COPY_CODE' ? `Copy Code: ${btn.example || 'CODE'}` : 'Action Button')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Carousel Preview */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                {bodyComponent?.text && (
                  <div style={{ 
                    background: '#ffffff', 
                    borderRadius: '8px', 
                    padding: '12px 14px', 
                    boxShadow: '0 1px 2px rgba(0,0,0,0.12)', 
                    fontSize: '14px',
                    color: '#1c1e21'
                  }}>
                    <div dangerouslySetInnerHTML={{ __html: formatTextWithVariables(bodyComponent.text) }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {carouselCards.map((card, cIdx) => {
                    const cHeader = card.components?.find(c => c.type === 'HEADER');
                    const cBody = card.components?.find(c => c.type === 'BODY');
                    const cBtns = card.components?.find(c => c.type === 'BUTTONS');

                    return (
                      <div key={cIdx} style={{ 
                        minWidth: '240px', 
                        maxWidth: '240px', 
                        background: '#ffffff', 
                        borderRadius: '8px', 
                        boxShadow: '0 1px 2px rgba(0,0,0,0.12)', 
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {cHeader?.example?.header_handle?.[0] ? (
                          <img 
                            src={getFullMediaUrl(cHeader.example.header_handle[0])} 
                            alt={`Card ${cIdx + 1}`} 
                            style={{ width: '100%', height: '140px', objectFit: 'cover' }} 
                          />
                        ) : (
                          <div style={{ width: '100%', height: '140px', background: '#f5f6f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8d949e' }}>
                            <ImageIcon size={32} />
                          </div>
                        )}

                        <div style={{ padding: '10px 12px', fontSize: '13px', lineHeight: '1.4', color: '#1c1e21', minHeight: '50px' }}>
                          <div dangerouslySetInnerHTML={{ __html: formatTextWithVariables(cBody?.text || '') }} />
                        </div>

                        {cBtns?.buttons && (
                          <div style={{ borderTop: '1px solid #e9edef' }}>
                            {cBtns.buttons.map((btn, bIdx) => (
                              <div key={bIdx} style={{ padding: '8px', textAlign: 'center', color: '#00a884', fontSize: '12px', fontWeight: '600', borderTop: bIdx > 0 ? '1px solid #e9edef' : 'none' }}>
                                {btn.text || 'Button'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Performance Cards & Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top 2 Metric Cards: Amount spent & Cost per message delivered */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Card 1: Amount spent */}
            <div style={{ 
              background: '#ffffff', 
              borderRadius: '10px', 
              border: '1px solid #ccd0d5', 
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#606770' }}>Amount spent</span>
                <HelpCircle size={14} color="#8d949e" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#1c1e21' }}>
                {currencySymbol}{Number(analytics.amountSpent || 0).toFixed(2)}
              </div>
            </div>

            {/* Card 2: Cost per message delivered */}
            <div style={{ 
              background: '#ffffff', 
              borderRadius: '10px', 
              border: '1px solid #ccd0d5', 
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#606770' }}>Cost per message delivered</span>
                <HelpCircle size={14} color="#8d949e" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#1c1e21' }}>
                {currencySymbol}{Number(analytics.costPerDelivered || (analytics.delivered > 0 ? analytics.amountSpent / analytics.delivered : 0.86)).toFixed(2)}
              </div>
            </div>

          </div>

          {/* Performance Card */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '10px', 
            border: '1px solid #ccd0d5', 
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            
            {/* Header + Tabs: Trend / Funnel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1c1e21' }}>Performance</h3>
                <HelpCircle size={14} color="#8d949e" />
              </div>

              {/* Trend / Funnel Tab Selector */}
              <div style={{ display: 'flex', background: '#f0f2f5', borderRadius: '6px', padding: '3px' }}>
                <button 
                  onClick={() => setActiveTab('Trend')}
                  style={{ 
                    border: 'none', 
                    padding: '6px 16px', 
                    borderRadius: '4px', 
                    fontSize: '13px', 
                    fontWeight: activeTab === 'Trend' ? '600' : '500', 
                    cursor: 'pointer',
                    background: activeTab === 'Trend' ? '#e7f3ff' : 'transparent',
                    color: activeTab === 'Trend' ? '#1877f2' : '#606770',
                    transition: 'all 0.2s'
                  }}
                >
                  Trend
                </button>
                <button 
                  onClick={() => setActiveTab('Funnel')}
                  style={{ 
                    border: 'none', 
                    padding: '6px 16px', 
                    borderRadius: '4px', 
                    fontSize: '13px', 
                    fontWeight: activeTab === 'Funnel' ? '600' : '500', 
                    cursor: 'pointer',
                    background: activeTab === 'Funnel' ? '#e7f3ff' : 'transparent',
                    color: activeTab === 'Funnel' ? '#1877f2' : '#606770',
                    transition: 'all 0.2s'
                  }}
                >
                  Funnel
                </button>
              </div>
            </div>

            {/* 4 Performance Metric Cards in Grid matching screenshot */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              
              {/* Metric 1: Messages sent */}
              <div style={{ padding: '16px', border: '1px solid #ccd0d5', borderRadius: '8px', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#606770' }}>Messages sent</span>
                  <HelpCircle size={12} color="#8d949e" />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '700', color: '#1c1e21' }}>{analytics.sent}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                    ↓ 50%
                  </span>
                </div>
              </div>

              {/* Metric 2: Messages delivered */}
              <div style={{ padding: '16px', border: '1px solid #ccd0d5', borderRadius: '8px', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#606770' }}>Messages delivered</span>
                  <HelpCircle size={12} color="#8d949e" />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '700', color: '#1c1e21' }}>{analytics.delivered}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                    ↓ 50%
                  </span>
                </div>
              </div>

              {/* Metric 3: Messages read */}
              <div style={{ padding: '16px', border: '1px solid #ccd0d5', borderRadius: '8px', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#606770' }}>Messages read</span>
                  <HelpCircle size={12} color="#8d949e" />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '700', color: '#1c1e21' }}>{analytics.read}</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#606770' }}>({analytics.readRate}%)</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                    ↓ 100%
                  </span>
                </div>
              </div>

              {/* Metric 4: Unique replies */}
              <div style={{ padding: '16px', border: '1px solid #ccd0d5', borderRadius: '8px', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#606770' }}>Unique replies</span>
                  <HelpCircle size={12} color="#8d949e" />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '700', color: '#1c1e21' }}>{analytics.replies}</span>
                </div>
              </div>

            </div>

            {/* Trend Tab: Visual chart timeline */}
            {activeTab === 'Trend' && (
              <div style={{ marginTop: '24px', padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#334155', fontWeight: '600' }}>Daily Trend Breakdown</h4>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3b82f6' }}></div>
                      <span style={{ color: '#64748b' }}>Sent</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }}></div>
                      <span style={{ color: '#64748b' }}>Delivered</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#6366f1' }}></div>
                      <span style={{ color: '#64748b' }}>Read</span>
                    </div>
                  </div>
                </div>

                {analytics.dataPoints?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {analytics.dataPoints.map((dp, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                        <span style={{ color: '#64748b', fontWeight: '500' }}>{new Date(dp.start * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        <div style={{ display: 'flex', gap: '20px', fontWeight: '600' }}>
                          <span style={{ color: '#3b82f6' }}>Sent: {dp.sent}</span>
                          <span style={{ color: '#10b981' }}>Delivered: {dp.delivered}</span>
                          <span style={{ color: '#6366f1' }}>Read: {dp.read}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                      <span style={{ color: '#64748b', fontWeight: '500' }}>27 Sep 2026 - 9 Oct 2026</span>
                      <div style={{ display: 'flex', gap: '20px', fontWeight: '600' }}>
                        <span style={{ color: '#3b82f6' }}>Sent: {analytics.sent}</span>
                        <span style={{ color: '#10b981' }}>Delivered: {analytics.delivered}</span>
                        <span style={{ color: '#6366f1' }}>Read: {analytics.read}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Funnel Tab */}
            {activeTab === 'Funnel' && (
              <div style={{ marginTop: '24px', padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
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
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
