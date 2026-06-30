import { REMINDER_TIME, WEB_URL } from "../constants.js";
import * as todoModel from "../model/todo.model.js";
import * as userModel from "../model/user.model.js";
import * as notificationService from "./notification.service.js";

const ONE_MINUTE_MS = 60 * 1000;
const DEFAULT_REMINDER_INTERVAL_MINUTES = 60;
const MIN_REMINDER_INTERVAL_MINUTES = 1;
const reminderCache = new Map();

let cronTimer = null;
let isRunning = false;

const getReminderIntervalMinutes = () => {
  const reminderInterval = Number(REMINDER_TIME || DEFAULT_REMINDER_INTERVAL_MINUTES);

  if (!Number.isFinite(reminderInterval) || reminderInterval < MIN_REMINDER_INTERVAL_MINUTES) {
    return DEFAULT_REMINDER_INTERVAL_MINUTES;
  }

  return Math.floor(reminderInterval);
};

const getTodayKey = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const formatTime = (time) => String(time || "").slice(0, 5);

const formatLocation = (task) => [
  task.district,
  task.godown,
  task.sloc,
].filter(Boolean).join(" • ");

const buildTodoPath = (todoId) => `/todos/${todoId}`;

const buildTodoUrl = (todoId) => {
  const baseUrl = String(WEB_URL || "").replace(/\/$/, "");
  const path = buildTodoPath(todoId);

  return baseUrl ? `${baseUrl}${path}` : null;
};

const buildReminderMessage = (task) => {
  const location = formatLocation(task);
  const dueTime = formatTime(task.due_time);

  return [
    `आपका कार्य "${task.title}" अभी तक पूरा नहीं हुआ है।`,
    dueTime ? `समय: ${dueTime}` : null,
    location ? `स्थान: ${location}` : null,
    "कृपया इसे जल्द पूरा करें।",
  ].filter(Boolean).join(" ");
};

const getReminderCacheKey = (task) => [
  task.user_id,
  task.todo_id,
  task.todo_location_id,
  getTodayKey(),
].join(":");

const shouldSendReminder = (task, cacheKey, intervalMs, nowMs) => {
  const dbLastSentAt = task.last_reminder_sent_at ? new Date(task.last_reminder_sent_at).getTime() : 0;
  const cacheLastSentAt = reminderCache.get(cacheKey);
  const lastSentAt = Math.max(dbLastSentAt, cacheLastSentAt || 0);
  return !lastSentAt || nowMs - lastSentAt >= intervalMs;
};

const cleanupReminderCache = (nowMs) => {
  const maxAgeMs = 24 * 60 * ONE_MINUTE_MS;

  for (const [cacheKey, sentAt] of reminderCache.entries()) {
    if (nowMs - sentAt > maxAgeMs) {
      reminderCache.delete(cacheKey);
    }
  }
};

const sendTodoReminder = async (task) => {
  try {
    const todoPath = buildTodoPath(task.todo_id);
    const todoUrl = buildTodoUrl(task.todo_id);

    await notificationService.sendNotification(
      task.fcm_token,
      "कार्य अनुस्मारक",
      buildReminderMessage(task),
      {
        data: {
          type: "TODO_REMINDER",
          todo_id: task.todo_id,
          todo_location_id: task.todo_location_id,
          location_id: task.location_id,
          url: todoUrl || todoPath,
        },
        link: todoUrl || undefined,
      },
    );

    return true;
  } catch (error) {
    if (notificationService.isUnregisteredTokenError(error)) {
      await userModel.clearUserFcmTokenModel(task.user_id);
    }

    console.warn(
      `Unable to send todo reminder for todo_id=${task.todo_id}, user_id=${task.user_id}:`,
      error?.message || error,
    );
    return false;
  }
};

export const runTodoReminderCron = async () => {
  if (isRunning) return;

  isRunning = true;

  console.log("⏰ Running todo reminder cron...");

  try {
    const nowMs = Date.now();
    const intervalMinutes = getReminderIntervalMinutes();
    const intervalMs = intervalMinutes * ONE_MINUTE_MS;
    const pendingTasks = await todoModel.getPendingTodoReminderTargetsModel(intervalMinutes);

    for (const task of pendingTasks) {
      const cacheKey = getReminderCacheKey(task);

      if (!shouldSendReminder(task, cacheKey, intervalMs, nowMs)) {
        continue;
      }

      const sent = await sendTodoReminder(task);

      if (sent) {
        reminderCache.set(cacheKey, nowMs);
        try {
          await todoModel.updateTodoLastReminderSentAtModel(task.todo_id);
        } catch (dbError) {
          console.error(
            `Failed to update last_reminder_sent_at for todo_id=${task.todo_id}:`,
            dbError?.message || dbError,
          );
        }
      }
    }

    cleanupReminderCache(nowMs);
  } catch (error) {
    console.error("Todo reminder cron failed:", error?.message || error);
  } finally {
    isRunning = false;
  }
};

export const startTodoReminderCron = () => {
  if (cronTimer) return cronTimer;

  const reminderInterval = getReminderIntervalMinutes();

  cronTimer = setInterval(runTodoReminderCron, ONE_MINUTE_MS);
  cronTimer.unref?.();

  console.log(`⏰ Todo reminder cron started. Checks every 1 minute, repeats every ${reminderInterval} minute(s).`);

  runTodoReminderCron();

  return cronTimer;
};

export const stopTodoReminderCron = () => {
  if (!cronTimer) return;

  clearInterval(cronTimer);
  cronTimer = null;
};
