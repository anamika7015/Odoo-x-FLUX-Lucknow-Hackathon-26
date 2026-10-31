import * as notifications from '../services/notification.service.js';

export async function listNotifications(request, response) {
  const data = await notifications.listNotifications(request.user._id);
  response.json({ success: true, data, requestId: request.id });
}

export async function markNotificationRead(request, response) {
  const notification = await notifications.markNotificationRead(request.params.notificationId, request.user._id);
  response.json({ success: true, data: { notification }, requestId: request.id });
}

export async function markAllNotificationsRead(request, response) {
  const result = await notifications.markAllNotificationsRead(request.user._id);
  response.json({ success: true, data: result, requestId: request.id });
}
