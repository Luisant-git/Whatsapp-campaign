import React, { useState, useEffect, useRef } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRESETS = [
  { label: 'Auto-detected', days: 7, subtitle: 'Last 7 days' },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 60 days', days: 60 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Custom', days: 0 },
];

const stripTime = (d) => {
  if (!d) return null;
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (d) => {
  if (!d) return null;
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
};

const formatDateLabel = (d) => {
  if (!d) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export default function MetaCalendarPicker({
  value = { label: 'Auto-detected', days: 7 },
  onChange,
  timeZoneLabel = 'Dates are shown in Kolkata Time'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Today reference
  const today = stripTime(new Date());

  // Calculate initial start and end from value
  const getInitialRange = (val) => {
    if (val?.customStart && val?.customEnd) {
      return {
        start: stripTime(val.customStart),
        end: stripTime(val.customEnd),
        preset: val.label || 'Custom'
      };
    }
    const days = val?.days || 7;
    const end = stripTime(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    return {
      start,
      end,
      preset: val?.label || (days === 0 ? 'Custom' : `Last ${days} days`)
    };
  };

  const initialRange = getInitialRange(value);

  // Internal draft state while picker is open
  const [tempStart, setTempStart] = useState(initialRange.start);
  const [tempEnd, setTempEnd] = useState(initialRange.end);
  const [selectedPreset, setSelectedPreset] = useState(initialRange.preset);
  const [isPicking, setIsPicking] = useState(false);
  const [hoverDate, setHoverDate] = useState(null);
  const [hoveredDayKey, setHoveredDayKey] = useState(null);

  // Month navigation - left month defaults to month of start date
  const [leftMonth, setLeftMonth] = useState(() => {
    const s = initialRange.start || new Date();
    return new Date(s.getFullYear(), s.getMonth(), 1);
  });

  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);

  // Keep state synced when value prop changes or opened
  useEffect(() => {
    if (!isOpen) {
      const init = getInitialRange(value);
      setTempStart(init.start);
      setTempEnd(init.end);
      setSelectedPreset(init.preset);
      setIsPicking(false);
      setHoverDate(null);
      setHoveredDayKey(null);
      if (init.start) {
        setLeftMonth(new Date(init.start.getFullYear(), init.start.getMonth(), 1));
      }
    }
  }, [isOpen, value]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle Preset selection
  const handlePresetClick = (p) => {
    setSelectedPreset(p.label);
    setIsPicking(false);
    setHoverDate(null);
    if (p.days > 0) {
      const end = stripTime(new Date());
      const start = new Date(end);
      start.setDate(start.getDate() - (p.days - 1));
      setTempStart(start);
      setTempEnd(end);
      setLeftMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    }
  };

  // Handle Date Click in Calendar
  const handleDayClick = (d) => {
    if (d > today) return; // Future dates disabled

    setSelectedPreset('Custom');

    if (!isPicking || !tempStart) {
      setTempStart(d);
      setTempEnd(null);
      setIsPicking(true);
    } else {
      if (d < tempStart) {
        setTempEnd(tempStart);
        setTempStart(d);
      } else {
        setTempEnd(d);
      }
      setIsPicking(false);
    }
  };

  // Navigate months
  const handleMonthShift = (delta) => {
    setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() + delta, 1));
  };

  // Determine current active preview range
  const effectiveStart = tempStart;
  const effectiveEnd = isPicking && hoverDate ? hoverDate : tempEnd;

  let rangeMin = null;
  let rangeMax = null;
  if (effectiveStart && effectiveEnd) {
    if (effectiveStart <= effectiveEnd) {
      rangeMin = effectiveStart;
      rangeMax = effectiveEnd;
    } else {
      rangeMin = effectiveEnd;
      rangeMax = effectiveStart;
    }
  } else if (effectiveStart) {
    rangeMin = effectiveStart;
    rangeMax = effectiveStart;
  }

  // Handle Apply / Update
  const handleApply = () => {
    if (!rangeMin || !rangeMax) return;
    const finalStart = rangeMin;
    const finalEnd = endOfDay(rangeMax);
    const preset = PRESETS.find(p => p.label === selectedPreset);

    if (onChange) {
      onChange({
        label: selectedPreset,
        days: preset?.days || 0,
        customStart: finalStart,
        customEnd: finalEnd
      });
    }
    setIsOpen(false);
  };

  // Render a single month grid
  const renderMonthGrid = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    // Empty cells before start of month
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }

    return (
      <div style={{ flex: 1, minWidth: '252px' }}>
        {/* Day Name Headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 36px)',
          justifyContent: 'center',
          marginBottom: '8px'
        }}>
          {DAY_LABELS.map(name => (
            <div
              key={name}
              style={{
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: '400',
                color: '#65676b',
                padding: '4px 0',
                userSelect: 'none'
              }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 36px)',
          justifyContent: 'center',
          rowGap: '4px'
        }}>
          {cells.map((d, index) => {
            if (!d) {
              return <div key={`empty-${index}`} style={{ width: '36px', height: '36px' }} />;
            }

            const colIndex = index % 7;
            const isStart = rangeMin && isSameDay(d, rangeMin);
            const isEnd = rangeMax && isSameDay(d, rangeMax);
            const inRange = rangeMin && rangeMax && d > rangeMin && d < rangeMax;
            const isFuture = d > today;
            const dKey = `${year}-${month}-${d.getDate()}`;
            const isHovered = hoveredDayKey === dKey;

            // Row-aware rounding for continuous highlight band
            const isSun = colIndex === 0;
            const isSat = colIndex === 6;

            return (
              <div
                key={dKey}
                onMouseEnter={() => {
                  setHoveredDayKey(dKey);
                  if (isPicking && !isFuture) setHoverDate(d);
                }}
                onMouseLeave={() => {
                  setHoveredDayKey(null);
                }}
                onClick={() => handleDayClick(d)}
                style={{
                  width: '36px',
                  height: '36px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isFuture ? 'default' : 'pointer',
                  userSelect: 'none'
                }}
              >
                {/* Background strip for in-range days */}
                {inRange && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: '#cfe4fa',
                      borderTopLeftRadius: isSun ? '4px' : '0',
                      borderBottomLeftRadius: isSun ? '4px' : '0',
                      borderTopRightRadius: isSat ? '4px' : '0',
                      borderBottomRightRadius: isSat ? '4px' : '0',
                      zIndex: 1
                    }}
                  />
                )}

                {/* Number circle/box */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '4px',
                    background: (isStart || isEnd)
                      ? '#0064e0'
                      : inRange
                        ? 'transparent'
                        : isHovered && !isFuture
                          ? '#f0f2f5'
                          : 'transparent',
                    color: (isStart || isEnd)
                      ? '#ffffff'
                      : isFuture
                        ? '#bcc0c4'
                        : '#050505',
                    fontWeight: (isStart || isEnd) ? '600' : '400',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    transition: 'background-color 0.12s ease'
                  }}
                >
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Button Label Text
  const buttonDisplay = (() => {
    const curStart = value?.customStart || initialRange.start;
    const curEnd = value?.customEnd || initialRange.end;
    const startStr = formatDateLabel(curStart);
    const endStr = formatDateLabel(curEnd);
    const label = value?.label || 'Last 7 days';

    if (label === 'Custom') {
      return `${startStr} - ${endStr}`;
    }
    return `${label}: ${startStr} - ${endStr}`;
  })();

  // Footer range display text
  const footerRangeDisplay = (() => {
    if (!rangeMin || !rangeMax) return 'Select a date range';
    return `${formatDateLabel(rangeMin)} - ${formatDateLabel(rangeMax)}`;
  })();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: '#ffffff',
          border: '1px solid #ced0d4',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          color: '#050505',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
      >
        {/* Calendar Icon matching Meta screenshot */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <rect x="7" y="14" width="2" height="2" fill="#050505" stroke="none" />
          <rect x="11" y="14" width="2" height="2" fill="#050505" stroke="none" />
          <rect x="15" y="14" width="2" height="2" fill="#050505" stroke="none" />
        </svg>

        <span>{buttonDisplay}</span>

        {/* Down Caret matching Meta screenshot */}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="#050505" style={{ marginLeft: '2px' }}>
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            background: '#ffffff',
            border: '1px solid #ccd0d5',
            borderRadius: '8px',
            zIndex: 1000,
            display: 'flex',
            minWidth: 'min(730px, 95vw)',
            maxWidth: 'calc(100vw - 24px)',
            overflowX: 'auto'
          }}
        >
          {/* Left Presets Sidebar */}
          <div
            style={{
              width: '180px',
              padding: '20px 16px',
              borderRight: '1px solid #e4e6eb',
              flexShrink: 0
            }}
          >
            {PRESETS.map((p) => {
              const isSelected = selectedPreset === p.label;
              return (
                <div
                  key={p.label}
                  onClick={() => handlePresetClick(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 4px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    marginBottom: '10px'
                  }}
                >
                  {/* Meta-style Circular Radio Button */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: isSelected ? '2px solid #0064e0' : '1.5px solid #bcc0c4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#0064e0'
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '14px',
                      color: '#050505',
                      fontWeight: isSelected ? '600' : '400'
                    }}
                  >
                    {p.label}
                    {p.subtitle && (
                      <span style={{ fontSize: '12px', color: '#65676b', marginLeft: '6px' }}>({p.subtitle})</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right Calendars & Footer Panel */}
          <div style={{ flex: 1, padding: '20px 24px 16px 24px', display: 'flex', flexDirection: 'column' }}>
            {/* Months Header Row */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              {/* Left Month Header with < button */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
                <button
                  onClick={() => handleMonthShift(-1)}
                  style={{
                    position: 'absolute',
                    left: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#050505',
                    borderRadius: '4px'
                  }}
                  title="Previous Month"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div style={{ width: '100%', textAlign: 'center', fontSize: '15px', fontWeight: '600', color: '#050505' }}>
                  {MONTH_NAMES[leftMonth.getMonth()]} {leftMonth.getFullYear()}
                </div>
              </div>

              <div style={{ width: '24px' }} />

              {/* Right Month Header with > button */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
                <div style={{ width: '100%', textAlign: 'center', fontSize: '15px', fontWeight: '600', color: '#050505' }}>
                  {MONTH_NAMES[rightMonth.getMonth()]} {rightMonth.getFullYear()}
                </div>
                <button
                  onClick={() => handleMonthShift(1)}
                  style={{
                    position: 'absolute',
                    right: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#050505',
                    borderRadius: '4px'
                  }}
                  title="Next Month"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Side-by-side Dual Calendars */}
            <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
              {renderMonthGrid(leftMonth.getFullYear(), leftMonth.getMonth())}
              {renderMonthGrid(rightMonth.getFullYear(), rightMonth.getMonth())}
            </div>

            {/* Bottom Footer Bar */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid #e4e6eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#050505' }}>
                  {footerRangeDisplay}
                </div>
                <div style={{ fontSize: '12px', color: '#65676b', marginTop: '2px' }}>
                  {timeZoneLabel}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    padding: '8px 18px',
                    background: '#ffffff',
                    border: '1px solid #ccd0d5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    color: '#050505'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={!rangeMin || !rangeMax}
                  style={{
                    padding: '8px 20px',
                    background: rangeMin && rangeMax ? '#0064e0' : '#ccd0d5',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: rangeMin && rangeMax ? 'pointer' : 'not-allowed',
                    color: '#ffffff'
                  }}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
