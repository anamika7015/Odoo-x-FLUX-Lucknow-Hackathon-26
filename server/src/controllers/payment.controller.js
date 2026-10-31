import * as payments from '../services/payment.service.js';

export async function recordPayment(request, response) {
  const payment = await payments.recordPayment(request.body, request.user);
  response.status(201).json({ success: true, data: { payment }, requestId: request.id });
}
export async function listPayments(request, response) {
  const result = await payments.listPayments(request.query, request.user);
  response.json({ success: true, data: { payments: result.items }, meta: result.meta, requestId: request.id });
}
export async function getPayment(request, response) {
  const payment = await payments.getPayment(request.params.paymentId, request.user);
  response.json({ success: true, data: { payment }, requestId: request.id });
}
export async function updatePayment(request, response) {
  const payment = await payments.updatePayment(request.params.paymentId, request.body, request.user);
  response.json({ success: true, data: { payment }, requestId: request.id });
}
