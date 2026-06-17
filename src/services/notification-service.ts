import { isPermissionGranted, requestPermission, sendNotification, onAction } from '@tauri-apps/plugin-notification';
import { CalendarStore } from './calendar-store';
import { store } from '../store';

const CHECK_INTERVAL_MS = 10000; // 10 seconds

export async function checkAndRequestNotificationPermission() {
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }
  return permissionGranted;
}

export function initNotificationWatcher() {
  // Check permission on startup
  checkAndRequestNotificationPermission();

  // Initial check right away
  checkReminders();

  // Watcher interval
  setInterval(() => {
    checkReminders();
  }, CHECK_INTERVAL_MS);

  // Listen for notification clicks (Deep linking)
  onAction((notification) => {
    const title = notification.title?.toLowerCase() || '';
    const body = notification.body?.toLowerCase() || '';
    
    let route = '';
    if (title.includes('speaking') || body.includes('speaking') || title.includes('nói') || body.includes('nói')) {
      route = '/speaking';
    } else if (title.includes('writing') || body.includes('writing') || title.includes('viết') || body.includes('viết')) {
      route = '/writing';
    } else if (title.includes('listening') || body.includes('listening') || title.includes('nghe') || body.includes('nghe')) {
      route = '/listening';
    } else if (title.includes('vocab') || body.includes('vocab') || title.includes('từ vựng') || body.includes('từ vựng')) {
      route = '/vocab';
    }

    if (route) {
      window.dispatchEvent(new CustomEvent('calendar-navigate', { detail: route }));
    }
  });
}

function checkReminders() {
  const { dailyReminder } = store.getState().app;
  if (!dailyReminder) return; // Skip if user disabled global reminders

  const events = CalendarStore.getEvents();
  const now = new Date();
  let updated = false;

  for (const event of events) {
    if (!event.start) continue;

    const eventTime = new Date(event.start);
    const timeDiffMs = eventTime.getTime() - now.getTime();
    const minutesUntil = timeDiffMs / (1000 * 60);

    console.log(`[Notification] Checking event: ${event.title}`);
    console.log(`  - Start time: ${event.start} (Parsed: ${eventTime.toISOString()})`);
    console.log(`  - Now: ${now.toISOString()}`);
    console.log(`  - Minutes until: ${minutesUntil}`);
    console.log(`  - Flags -> notified15m: ${event.notified15m}, notifiedStart: ${event.notifiedStart}, enableReminder: ${event.enableReminder}`);

    // Skip past events (older than 5 minutes to avoid stale notifications)
    if (minutesUntil < -5) {
      console.log(`  -> Skipped: Past event.`);
      continue;
    }

    // 15-minute reminder
    if (minutesUntil <= 15 && minutesUntil > 0 && !event.notified15m && event.enableReminder) {
      fireNotification('Sắp tới giờ học!', `Chỉ còn ${Math.ceil(minutesUntil)} phút nữa là đến lịch học: ${event.title}`);
      event.notified15m = true;
      updated = true;
    }

    // Exact time reminder (within 1 minute)
    if (minutesUntil <= 0 && minutesUntil >= -1 && !event.notifiedStart && event.enableReminder) {
      fireNotification('Đến giờ học rồi!', `Đã đến giờ bắt đầu lịch học: ${event.title}. Mở app ngay để học nhé!`);
      event.notifiedStart = true;
      updated = true;
    }
  }

  if (updated) {
    CalendarStore.saveEvents(events);
  }
}

async function fireNotification(title: string, body: string) {
  try {
    // 1. Dispatch event for In-App Toast
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { title, body } }));

    // 2. Try OS Notification
    const granted = await isPermissionGranted();
    if (granted) {
      sendNotification({
        title: title,
        body: body,
        sound: 'default'
      });
    }
  } catch (err) {
    console.error('Failed to send notification', err);
  }
}
