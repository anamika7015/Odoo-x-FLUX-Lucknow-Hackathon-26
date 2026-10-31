import { listUsers, updateUser } from '../services/user.service.js';

export async function getUsers(request, response) {
  const result = await listUsers(request.query);
  response.json({ success: true, data: { users: result.items }, meta: result.meta, requestId: request.id });
}

export async function patchUser(request, response) {
  const user = await updateUser(request.params.userId, request.body, request.user);
  response.json({ success: true, data: { user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt } }, requestId: request.id });
}
