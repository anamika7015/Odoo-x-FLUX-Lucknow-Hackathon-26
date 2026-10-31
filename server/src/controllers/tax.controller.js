import * as taxes from '../services/tax.service.js';

export async function createTax(request, response) {
  const tax = await taxes.createTax(request.body, request.user._id);
  response.status(201).json({ success: true, data: { tax }, requestId: request.id });
}
export async function listTaxes(request, response) {
  const result = await taxes.listTaxes(request.query);
  response.json({ success: true, data: { taxes: result.items }, meta: result.meta, requestId: request.id });
}
export async function updateTax(request, response) {
  const tax = await taxes.updateTax(request.params.taxId, request.body, request.user._id);
  response.json({ success: true, data: { tax }, requestId: request.id });
}
