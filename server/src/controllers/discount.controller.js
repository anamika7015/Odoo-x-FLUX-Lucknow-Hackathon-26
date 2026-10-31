import * as discounts from '../services/discount.service.js';

export async function createDiscount(request, response) {
  const discount = await discounts.createDiscount(request.body, request.user._id);
  response.status(201).json({ success: true, data: { discount }, requestId: request.id });
}
export async function listDiscounts(request, response) {
  const result = await discounts.listDiscounts(request.query);
  response.json({ success: true, data: { discounts: result.items }, meta: result.meta, requestId: request.id });
}
export async function updateDiscount(request, response) {
  const discount = await discounts.updateDiscount(request.params.discountId, request.body, request.user._id);
  response.json({ success: true, data: { discount }, requestId: request.id });
}
