import { DateTime } from 'luxon';

export const CAMPAIGN_WINDOW_CONFIG = {
  START_HOUR: 8,       // 8:00 AM
  START_MINUTE: 0,
  END_HOUR: 20,        // 8:00 PM (20:00)
  END_MINUTE: 0,
  TIMEZONE: 'Asia/Kolkata',
};

export const CAMPAIGN_STATUS_OUTSIDE_HOURS = 'paused_outside_hours';
export const CAMPAIGN_STATUS_RUNNING = 'running';
export const CAMPAIGN_STATUS_SCHEDULED = 'scheduled';

export function isOutsideSendingHoursStatus(status?: string | null): boolean {
  if (!status) return false;
  return status === CAMPAIGN_STATUS_OUTSIDE_HOURS || status === 'paused_night';
}

export function formatCampaignStatusLabel(status?: string | null): string {
  if (!status) return 'Unknown';
  if (isOutsideSendingHoursStatus(status)) {
    return 'Paused – Outside Sending Hours';
  }
  switch (status.toLowerCase()) {
    case 'running':
      return 'Running';
    case 'scheduled':
      return 'Scheduled';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'stopped':
      return 'Stopped';
    case 'draft':
      return 'Draft';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export interface SendingWindowInfo {
  isWithinWindow: boolean;
  currentIstTime: string;
  currentIstHour: number;
  currentIstMinute: number;
  startTime: string;
  endTime: string;
  timeZone: string;
  status: 'active' | 'outside_sending_hours';
  statusLabel: string;
  message: string;
  nextWindowOpensAt: string;
  nextWindowStartDate: Date;
}

/**
 * Returns the current DateTime in Asia/Kolkata timezone.
 */
export function getIstDateTime(date: Date = new Date()): DateTime {
  return DateTime.fromJSDate(date).setZone(CAMPAIGN_WINDOW_CONFIG.TIMEZONE);
}

/**
 * Checks whether the specified date/time is within the allowed campaign sending window
 * (8:00 AM to 8:00 PM IST).
 */
export function isWithinAllowedSendingHours(date: Date = new Date()): boolean {
  const ist = getIstDateTime(date);
  const currentMinuteOfDay = ist.hour * 60 + ist.minute;
  const startMinuteOfDay = CAMPAIGN_WINDOW_CONFIG.START_HOUR * 60 + CAMPAIGN_WINDOW_CONFIG.START_MINUTE; // 480 (08:00)
  const endMinuteOfDay = CAMPAIGN_WINDOW_CONFIG.END_HOUR * 60 + CAMPAIGN_WINDOW_CONFIG.END_MINUTE;     // 1200 (20:00)

  return currentMinuteOfDay >= startMinuteOfDay && currentMinuteOfDay < endMinuteOfDay;
}

/**
 * Computes the exact JavaScript Date for the next 8:00:00 AM IST window opening.
 */
export function getNextAllowedWindowStart(date: Date = new Date()): Date {
  const ist = getIstDateTime(date);
  const currentMinuteOfDay = ist.hour * 60 + ist.minute;
  const startMinuteOfDay = CAMPAIGN_WINDOW_CONFIG.START_HOUR * 60; // 480 (08:00)

  let nextIst: DateTime;
  if (currentMinuteOfDay < startMinuteOfDay) {
    // Before 8:00 AM today -> opens today at 8:00 AM IST
    nextIst = ist.set({ hour: CAMPAIGN_WINDOW_CONFIG.START_HOUR, minute: 0, second: 0, millisecond: 0 });
  } else {
    // At or after 8:00 AM -> opens tomorrow at 8:00 AM IST
    nextIst = ist.plus({ days: 1 }).set({ hour: CAMPAIGN_WINDOW_CONFIG.START_HOUR, minute: 0, second: 0, millisecond: 0 });
  }
  return nextIst.toJSDate();
}

/**
 * Returns comprehensive details about the campaign sending window.
 */
export function getAllowedSendingWindowInfo(date: Date = new Date()): SendingWindowInfo {
  const ist = getIstDateTime(date);
  const inWindow = isWithinAllowedSendingHours(date);
  const timeStr = ist.toFormat('hh:mm a');
  const currentMinuteOfDay = ist.hour * 60 + ist.minute;
  const startMinuteOfDay = CAMPAIGN_WINDOW_CONFIG.START_HOUR * 60; // 480

  const nextStartDate = getNextAllowedWindowStart(date);
  let nextWindowOpensAt: string;
  if (inWindow) {
    nextWindowOpensAt = `Active now until 08:00 PM IST today`;
  } else if (currentMinuteOfDay < startMinuteOfDay) {
    nextWindowOpensAt = `Today at 08:00 AM IST`;
  } else {
    nextWindowOpensAt = `Tomorrow at 08:00 AM IST`;
  }

  return {
    isWithinWindow: inWindow,
    currentIstTime: timeStr,
    currentIstHour: ist.hour,
    currentIstMinute: ist.minute,
    startTime: '08:00 AM',
    endTime: '08:00 PM',
    timeZone: CAMPAIGN_WINDOW_CONFIG.TIMEZONE,
    status: inWindow ? 'active' : 'outside_sending_hours',
    statusLabel: inWindow ? 'Running' : 'Paused – Outside Sending Hours',
    message: inWindow
      ? 'Campaign sending window is open (8:00 AM - 8:00 PM IST).'
      : `Outside allowed sending hours (8:00 AM - 8:00 PM IST). Messages are paused and scheduled to resume at 8:00 AM IST.`,
    nextWindowOpensAt,
    nextWindowStartDate: nextStartDate,
  };
}

