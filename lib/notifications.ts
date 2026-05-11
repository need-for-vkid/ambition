import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ScheduledBlock } from '../types/task';

export async function requestPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const MORNING_ID = 'morning-reminder';
const TASK_PREFIX = 'task-start-';

export async function scheduleMorningReminder(hour = 8, minute = 0): Promise<void> {
  // Cancel only morning reminder (not all) so task notifications survive
  try {
    await Notifications.cancelScheduledNotificationAsync(MORNING_ID);
  } catch {
    /* may not exist */
  }
  await Notifications.scheduleNotificationAsync({
    identifier: MORNING_ID,
    content: {
      title: 'Start with clarity.',
      body: "Drop everything that's on your mind.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as Notifications.DailyTriggerInput,
  });
}

/**
 * Schedule a one-time local notification at a task's start time today.
 * Only fires if the time is still in the future. Replaces any existing
 * notification for this task.
 */
export async function scheduleTaskStartNotification(
  block: ScheduledBlock,
  now: Date = new Date()
): Promise<void> {
  if (block.kind === 'lunch') return;
  const [h, m] = block.startTime.split(':').map(Number);
  const fireAt = new Date(now);
  fireAt.setHours(h, m, 0, 0);
  if (fireAt.getTime() <= now.getTime()) return;

  const id = TASK_PREFIX + block.task.id;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* may not exist */
  }

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: block.task.text,
      body: `Time to start · ${block.task.workType}`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    } as Notifications.DateTriggerInput,
  });
}

/**
 * Cancel all task-start notifications (call before re-scheduling a new plan).
 */
export async function cancelAllTaskNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(TASK_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/**
 * Sync notifications with the current day plan: cancel old, schedule new.
 */
export async function syncTaskNotifications(blocks: ScheduledBlock[]): Promise<void> {
  await cancelAllTaskNotifications();
  const now = new Date();
  await Promise.all(blocks.map((b) => scheduleTaskStartNotification(b, now)));
}

export function configureHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#c9a227',
    });
  }
}
