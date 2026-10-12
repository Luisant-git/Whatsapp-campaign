import { DateTime } from 'luxon';
import {
  CAMPAIGN_WINDOW_CONFIG,
  CAMPAIGN_STATUS_OUTSIDE_HOURS,
  isWithinAllowedSendingHours,
  getNextAllowedWindowStart,
  getAllowedSendingWindowInfo,
  isOutsideSendingHoursStatus,
  formatCampaignStatusLabel,
} from './campaign-window.util';

describe('Campaign Window Utility (8:00 AM - 8:00 PM IST Restriction)', () => {
  const IST_ZONE = 'Asia/Kolkata';

  describe('isWithinAllowedSendingHours', () => {
    it('should return false before 8:00 AM IST (e.g. 7:59 AM IST)', () => {
      // 07:59:59 AM IST on 2026-10-12
      const time = DateTime.fromISO('2026-10-12T07:59:59', { zone: IST_ZONE }).toJSDate();
      expect(isWithinAllowedSendingHours(time)).toBe(false);
    });

    it('should return true exactly at 8:00 AM IST', () => {
      // 08:00:00 AM IST on 2026-10-12
      const time = DateTime.fromISO('2026-10-12T08:00:00', { zone: IST_ZONE }).toJSDate();
      expect(isWithinAllowedSendingHours(time)).toBe(true);
    });

    it('should return true during the day (e.g. 12:30 PM IST and 5:00 PM IST)', () => {
      const noon = DateTime.fromISO('2026-10-12T12:30:00', { zone: IST_ZONE }).toJSDate();
      const evening = DateTime.fromISO('2026-10-12T17:00:00', { zone: IST_ZONE }).toJSDate();
      expect(isWithinAllowedSendingHours(noon)).toBe(true);
      expect(isWithinAllowedSendingHours(evening)).toBe(true);
    });

    it('should return true at 7:59 PM IST (19:59 IST)', () => {
      // 19:59:59 IST
      const time = DateTime.fromISO('2026-10-12T19:59:59', { zone: IST_ZONE }).toJSDate();
      expect(isWithinAllowedSendingHours(time)).toBe(true);
    });

    it('should return false at or after 8:00 PM IST (20:00 IST)', () => {
      // 20:00:00 IST
      const cutoff = DateTime.fromISO('2026-10-12T20:00:00', { zone: IST_ZONE }).toJSDate();
      const lateEvening = DateTime.fromISO('2026-10-12T20:30:00', { zone: IST_ZONE }).toJSDate();
      const midnight = DateTime.fromISO('2026-10-12T23:59:59', { zone: IST_ZONE }).toJSDate();
      const earlyMorning = DateTime.fromISO('2026-10-12T03:00:00', { zone: IST_ZONE }).toJSDate();

      expect(isWithinAllowedSendingHours(cutoff)).toBe(false);
      expect(isWithinAllowedSendingHours(lateEvening)).toBe(false);
      expect(isWithinAllowedSendingHours(midnight)).toBe(false);
      expect(isWithinAllowedSendingHours(earlyMorning)).toBe(false);
    });

    it('should calculate accurately independent of server local timezone (using UTC dates)', () => {
      // IST is UTC + 5:30
      // 08:00 AM IST = 02:30 AM UTC
      const eightAmIstInUtc = new Date('2026-10-12T02:30:00Z');
      expect(isWithinAllowedSendingHours(eightAmIstInUtc)).toBe(true);

      // 07:59 AM IST = 02:29 AM UTC
      const beforeWindowInUtc = new Date('2026-10-12T02:29:00Z');
      expect(isWithinAllowedSendingHours(beforeWindowInUtc)).toBe(false);

      // 08:00 PM IST = 14:30 PM UTC
      const cutoffInUtc = new Date('2026-10-12T14:30:00Z');
      expect(isWithinAllowedSendingHours(cutoffInUtc)).toBe(false);

      // 07:59 PM IST = 14:29 PM UTC
      const beforeCutoffInUtc = new Date('2026-10-12T14:29:00Z');
      expect(isWithinAllowedSendingHours(beforeCutoffInUtc)).toBe(true);
    });
  });

  describe('getNextAllowedWindowStart', () => {
    it('should reschedule to 8:00 AM TODAY if called before 8:00 AM IST', () => {
      const earlyMorning = DateTime.fromISO('2026-10-12T05:15:00', { zone: IST_ZONE }).toJSDate();
      const nextStart = getNextAllowedWindowStart(earlyMorning);

      const nextIst = DateTime.fromJSDate(nextStart).setZone(IST_ZONE);
      expect(nextIst.year).toBe(2026);
      expect(nextIst.month).toBe(10);
      expect(nextIst.day).toBe(12); // Same day!
      expect(nextIst.hour).toBe(8);
      expect(nextIst.minute).toBe(0);
      expect(nextIst.second).toBe(0);
    });

    it('should reschedule to 8:00 AM NEXT DAY if called at or after 8:00 PM IST', () => {
      const nightTime = DateTime.fromISO('2026-10-12T20:15:00', { zone: IST_ZONE }).toJSDate();
      const nextStart = getNextAllowedWindowStart(nightTime);

      const nextIst = DateTime.fromJSDate(nextStart).setZone(IST_ZONE);
      expect(nextIst.year).toBe(2026);
      expect(nextIst.month).toBe(10);
      expect(nextIst.day).toBe(13); // Next day!
      expect(nextIst.hour).toBe(8);
      expect(nextIst.minute).toBe(0);
      expect(nextIst.second).toBe(0);
    });

    it('should reschedule to 8:00 AM NEXT DAY even if called during daytime (e.g. 2:00 PM IST)', () => {
      const dayTime = DateTime.fromISO('2026-10-12T14:00:00', { zone: IST_ZONE }).toJSDate();
      const nextStart = getNextAllowedWindowStart(dayTime);

      const nextIst = DateTime.fromJSDate(nextStart).setZone(IST_ZONE);
      expect(nextIst.day).toBe(13); // Next day
      expect(nextIst.hour).toBe(8);
      expect(nextIst.minute).toBe(0);
    });
  });

  describe('getAllowedSendingWindowInfo', () => {
    it('should return active status when within window', () => {
      const afternoon = DateTime.fromISO('2026-10-12T15:30:00', { zone: IST_ZONE }).toJSDate();
      const info = getAllowedSendingWindowInfo(afternoon);

      expect(info.isWithinWindow).toBe(true);
      expect(info.status).toBe('active');
      expect(info.statusLabel).toBe('Running');
      expect(info.timeZone).toBe('Asia/Kolkata');
      expect(info.startTime).toBe('08:00 AM');
      expect(info.endTime).toBe('08:00 PM');
      expect(info.nextWindowOpensAt).toContain('Active now');
    });

    it('should return paused status and appropriate next window when outside hours', () => {
      const night = DateTime.fromISO('2026-10-12T21:45:00', { zone: IST_ZONE }).toJSDate();
      const info = getAllowedSendingWindowInfo(night);

      expect(info.isWithinWindow).toBe(false);
      expect(info.status).toBe('outside_sending_hours');
      expect(info.statusLabel).toBe('Paused – Outside Sending Hours');
      expect(info.nextWindowOpensAt).toBe('Tomorrow at 08:00 AM IST');
      expect(info.message).toContain('Outside allowed sending hours');
    });

    it('should show "Today at 08:00 AM IST" when called before 8:00 AM IST', () => {
      const morning = DateTime.fromISO('2026-10-12T06:00:00', { zone: IST_ZONE }).toJSDate();
      const info = getAllowedSendingWindowInfo(morning);

      expect(info.isWithinWindow).toBe(false);
      expect(info.nextWindowOpensAt).toBe('Today at 08:00 AM IST');
    });
  });

  describe('Campaign Status Labels & Helpers', () => {
    it('should identify outside sending hours statuses', () => {
      expect(isOutsideSendingHoursStatus(CAMPAIGN_STATUS_OUTSIDE_HOURS)).toBe(true);
      expect(isOutsideSendingHoursStatus('paused_night')).toBe(true);
      expect(isOutsideSendingHoursStatus('running')).toBe(false);
      expect(isOutsideSendingHoursStatus('scheduled')).toBe(false);
      expect(isOutsideSendingHoursStatus(null)).toBe(false);
      expect(isOutsideSendingHoursStatus(undefined)).toBe(false);
    });

    it('should format campaign status label accurately', () => {
      expect(formatCampaignStatusLabel('paused_outside_hours')).toBe('Paused – Outside Sending Hours');
      expect(formatCampaignStatusLabel('paused_night')).toBe('Paused – Outside Sending Hours');
      expect(formatCampaignStatusLabel('running')).toBe('Running');
      expect(formatCampaignStatusLabel('scheduled')).toBe('Scheduled');
      expect(formatCampaignStatusLabel('paused')).toBe('Paused');
      expect(formatCampaignStatusLabel('completed')).toBe('Completed');
    });
  });

  describe('Deduplication logic validation for Pause & Resume', () => {
    it('should prevent sending duplicate messages on resume using phone normalization', () => {
      // Simulate previously processed phones in DB for a campaign
      const sentHistoryFromDb = [
        { recipient: '+919876543210' },
        { recipient: '919876543211' },
      ];

      const processedPhones = new Set<string>();
      for (const msg of sentHistoryFromDb) {
        if (msg.recipient) {
          const raw = String(msg.recipient).trim();
          const clean = raw.replace(/\D/g, '');
          processedPhones.add(raw);
          processedPhones.add(clean);
          if (clean.length > 10) {
            processedPhones.add(clean.slice(-10));
          }
        }
      }

      // Candidate list of recipients to send upon resume:
      const candidateRecipients = [
        { phone: '9876543210' },       // Same as +919876543210 (10 digits) -> SHOULD BE SKIPPED
        { phone: '+919876543211' },     // Same as 919876543211 -> SHOULD BE SKIPPED
        { phone: '+919876543212' },     // New recipient -> SHOULD BE INCLUDED
      ];

      const pendingRecipients = candidateRecipients.filter(c => {
        const raw = String(c.phone).trim();
        const clean = raw.replace(/\D/g, '');
        const last10 = clean.length >= 10 ? clean.slice(-10) : clean;
        return !processedPhones.has(raw) && !processedPhones.has(clean) && !processedPhones.has(last10);
      });

      expect(pendingRecipients.length).toBe(1);
      expect(pendingRecipients[0].phone).toBe('+919876543212');
    });
  });
});
