import * as service from '../services/subscription.service.js';

export async function createTemplate(request, response) {
  const template = await service.createQuotationTemplate(request.body, request.user._id);
  response.status(201).json({ success: true, data: { template }, requestId: request.id });
}
export async function listTemplates(request, response) {
  const result = await service.listQuotationTemplates(request.query);
  response.json({ success: true, data: { templates: result.items }, meta: result.meta, requestId: request.id });
}
export async function createQuotation(request, response) {
  const quotation = await service.createQuotation(request.body, request.user);
  response.status(201).json({ success: true, data: { quotation }, requestId: request.id });
}
export async function listQuotations(request, response) {
  const result = await service.listQuotations(request.query, request.user);
  response.json({ success: true, data: { quotations: result.items }, meta: result.meta, requestId: request.id });
}
export async function getQuotation(request, response) {
  const quotation = await service.getQuotationById(request.params.id, request.user);
  response.json({ success: true, data: { quotation }, requestId: request.id });
}
export async function publishQuotation(request, response) {
  const quotation = await service.publishQuotation(request.params.id, request.user);
  response.json({ success: true, data: { quotation }, requestId: request.id });
}
export async function acceptQuotation(request, response) {
  const quotation = await service.acceptQuotation(request.params.id, request.user);
  response.json({ success: true, data: { quotation }, requestId: request.id });
}
export async function convertQuotation(request, response) {
  const subscription = await service.convertQuotation(request.params.id, request.user);
  response.status(201).json({ success: true, data: { subscription }, requestId: request.id });
}
export async function listSubscriptions(request, response) {
  const result = await service.listSubscriptions(request.query, request.user);
  response.json({ success: true, data: { subscriptions: result.items }, meta: result.meta, requestId: request.id });
}
export async function getSubscription(request, response) {
  const result = await service.getSubscriptionById(request.params.id, request.user);
  response.json({ success: true, data: result, requestId: request.id });
}
export async function transitionSubscription(request, response) {
  const subscription = await service.transitionSubscription(request.params.id, request.params.action, request.user, request.body.reason);
  response.json({ success: true, data: { subscription }, requestId: request.id });
}
