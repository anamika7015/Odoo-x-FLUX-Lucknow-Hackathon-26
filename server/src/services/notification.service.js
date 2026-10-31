import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { trustedFilter } from '../utils/trusted-filter.js';

export async function createNotificationForEmail(email, notification) {
  if (!email) return null;
  const user = await User.findOne({ email }).select('_id');
  if (!user) return null;
  return Notification.create({ ...notification, recipient: user._id });
}

export async function listNotifications(userId) {
  const [items, unreadCount] = await Promise.all([
    Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments(trustedFilter({ recipient: userId, readAt: { $exists: false } })),
  ]);
  return { items, unreadCount };
}

export async function markNotificationRead(notificationId, userId) {
  const item = await Notification.findOneAndUpdate(
    trustedFilter({ _id: notificationId, recipient: userId }),
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!item) throw new AppError('Notification not found.', { statusCode: 404, code: 'NOTIFICATION_NOT_FOUND' });
  return item;
}

export async function markAllNotificationsRead(userId) {
  await Notification.updateMany(trustedFilter({ recipient: userId, readAt: { $exists: false } }), { $set: { readAt: new Date() } });
  return { success: true };
}
