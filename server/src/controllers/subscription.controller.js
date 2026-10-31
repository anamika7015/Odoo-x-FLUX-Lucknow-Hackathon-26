import * as service from '../services/subscription.service.js';
import PDFDocument from 'pdfkit';

export async function createTemplate(request, response) {
  const template = await service.createQuotationTemplate(request.body, request.user._id);
  response.status(201).json({ success: true, data: { template }, requestId: request.id });
}
export async function updateTemplate(request, response) {
  const template = await service.updateQuotationTemplate(request.params.id, request.body, request.user);
  response.json({ success: true, data: { template }, requestId: request.id });
}
export async function listTemplates(request, response) {
  const result = await service.listQuotationTemplates(request.query);
  response.json({ success: true, data: { templates: result.items }, meta: result.meta, requestId: request.id });
}
export async function createQuotation(request, response) {
  const quotation = await service.createQuotation(request.body, request.user);
  response.status(201).json({ success: true, data: { quotation }, requestId: request.id });
}
export async function updateDraftQuotation(request, response) {
  const quotation = await service.updateDraftQuotation(request.params.id, request.body, request.user);
  response.json({ success: true, data: { quotation }, requestId: request.id });
}
export async function deleteDraftQuotation(request, response) {
  const result = await service.deleteDraftQuotation(request.params.id, request.user);
  response.json({ success: true, data: result, requestId: request.id });
}
export async function listQuotations(request, response) {
  const result = await service.listQuotations(request.query, request.user);
  response.json({ success: true, data: { quotations: result.items }, meta: result.meta, requestId: request.id });
}
export async function getQuotation(request, response) {
  const quotation = await service.getQuotationById(request.params.id, request.user);
  response.json({ success: true, data: { quotation }, requestId: request.id });
}
export async function downloadQuotationPdf(request, response) {
  const quotation = await service.getQuotationById(request.params.id, request.user);
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Content-Disposition', `attachment; filename="${quotation.quotationNumber}.pdf"`);
  const pdf = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Quotation ${quotation.quotationNumber}`, Author: 'Brightloop Software' } });
  pdf.pipe(response);
  pdf.fontSize(20).text('Brightloop Software');
  pdf.moveDown(0.4).fontSize(15).text(`Quotation ${quotation.quotationNumber}`);
  pdf.moveDown(0.5).fontSize(10).text(`Prepared for: ${quotation.customerSnapshot.fullName} (${quotation.customerSnapshot.email})`);
  if (quotation.customerSnapshot.companyName) pdf.text(quotation.customerSnapshot.companyName);
  if (quotation.customerSnapshot.billingAddress) pdf.text(quotation.customerSnapshot.billingAddress);
  pdf.moveDown().text(`Status: ${quotation.status}    Valid until: ${quotation.validUntil.toISOString().slice(0, 10)}`);
  pdf.moveDown();
  for (const line of quotation.lines) {
    pdf.fontSize(10).text(`${line.productName} — ${line.planName}`);
    pdf.text(`${line.quantity} × ${(line.unitPrice / 100).toFixed(2)} ${line.currency}  |  Total ${((line.total ?? line.lineTotal) / 100).toFixed(2)} ${line.currency}`);
    for (const discount of line.discounts || []) pdf.text(`  Discount ${discount.code}: -${(discount.amount / 100).toFixed(2)} ${line.currency}`);
    for (const tax of line.taxes || []) pdf.text(`  ${tax.name} (${(tax.rateBasisPoints / 100).toFixed(2)}%): ${(tax.amount / 100).toFixed(2)} ${line.currency}`);
    pdf.moveDown(0.4);
  }
  pdf.moveDown().fontSize(11).text(`Subtotal: ${(quotation.subtotal / 100).toFixed(2)} ${quotation.currency}`, { align: 'right' });
  pdf.text(`Discounts: -${(quotation.discountTotal / 100).toFixed(2)} ${quotation.currency}`, { align: 'right' });
  pdf.text(`Tax: ${(quotation.taxTotal / 100).toFixed(2)} ${quotation.currency}`, { align: 'right' });
  pdf.fontSize(14).text(`Total: ${(quotation.total / 100).toFixed(2)} ${quotation.currency}`, { align: 'right' });
  if (quotation.paymentTerms) pdf.moveDown().fontSize(10).text(`Payment terms: ${quotation.paymentTerms}`);
  pdf.end();
}
export async function publishQuotation(request, response) {
  const quotation = await service.publishQuotation(request.params.id, request.user);
  response.json({ success: true, data: { quotation }, requestId: request.id });
}
export async function emailQuotation(request, response) {
  const result = await service.emailQuotation(request.params.id, request.user);
  response.json({ success: true, data: result, requestId: request.id });
}
export async function acceptQuotation(request, response) {
  const quotation = await service.acceptQuotation(request.params.id, request.user);
  response.json({ success: true, data: { quotation }, requestId: request.id });
}
export async function rejectQuotation(request, response) {
  const quotation = await service.rejectQuotation(request.params.id, request.user);
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
export async function updateConfirmedSubscription(request, response) {
  const subscription = await service.updateConfirmedSubscription(request.params.id, request.body, request.user);
  response.json({ success: true, data: { subscription }, requestId: request.id });
}
export async function transitionSubscription(request, response) {
  const subscription = await service.transitionSubscription(request.params.id, request.params.action, request.user, request.body.reason);
  response.json({ success: true, data: { subscription }, requestId: request.id });
}
