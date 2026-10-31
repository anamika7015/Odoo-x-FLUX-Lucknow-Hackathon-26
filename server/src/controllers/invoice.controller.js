import PDFDocument from 'pdfkit';
import * as invoices from '../services/invoice.service.js';

export async function createInvoice(request, response) {
  const invoice = await invoices.createInvoiceFromSubscription(request.body, request.user);
  response.status(201).json({ success: true, data: { invoice }, requestId: request.id });
}
export async function listInvoices(request, response) {
  const result = await invoices.listInvoices(request.query, request.user);
  response.json({ success: true, data: { invoices: result.items }, meta: result.meta, requestId: request.id });
}
export async function getInvoice(request, response) {
  const invoice = await invoices.getInvoice(request.params.invoiceId, request.user);
  response.json({ success: true, data: { invoice }, requestId: request.id });
}
export async function updateDraftInvoice(request, response) {
  const invoice = await invoices.updateDraftInvoice(request.params.invoiceId, request.body, request.user);
  response.json({ success: true, data: { invoice }, requestId: request.id });
}
export async function emailInvoice(request, response) {
  const result = await invoices.emailInvoice(request.params.invoiceId, request.user);
  response.json({ success: true, data: result, requestId: request.id });
}
export async function transitionInvoice(request, response) {
  const invoice = await invoices.transitionInvoice(request.params.invoiceId, request.params.action, request.user, request.body.reason);
  response.json({ success: true, data: { invoice }, requestId: request.id });
}
export async function downloadInvoicePdf(request, response) {
  const invoice = await invoices.getInvoice(request.params.invoiceId, request.user);
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  const pdf = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Invoice ${invoice.invoiceNumber}`, Author: 'Brightloop Software' } });
  pdf.pipe(response);
  pdf.fontSize(20).text('Brightloop Software');
  pdf.moveDown(0.4).fontSize(15).text(`Invoice ${invoice.invoiceNumber}`);
  pdf.moveDown(0.5).fontSize(10).text(`Bill to: ${invoice.customerSnapshot.fullName} (${invoice.customerSnapshot.email})`);
  if (invoice.customerSnapshot.companyName) pdf.text(invoice.customerSnapshot.companyName);
  if (invoice.customerSnapshot.billingAddress) pdf.text(invoice.customerSnapshot.billingAddress);
  pdf.moveDown().text(`Billing period: ${invoice.periodStart.toISOString().slice(0, 10)} – ${invoice.periodEnd.toISOString().slice(0, 10)}`);
  pdf.text(`Due: ${invoice.dueDate.toISOString().slice(0, 10)}    Status: ${invoice.status}`);
  pdf.moveDown();
  for (const line of invoice.lines) {
    pdf.fontSize(10).text(`${line.productName}${line.variantName ? ` · ${line.variantName}` : ''} — ${line.planName}`);
    pdf.text(`${line.quantity} × ${(line.unitPrice / 100).toFixed(2)} ${invoice.currency}  |  Subtotal ${(line.subtotal / 100).toFixed(2)} ${invoice.currency}`);
    for (const discount of line.discounts) pdf.text(`  Discount ${discount.code}: -${(discount.amount / 100).toFixed(2)} ${invoice.currency}`);
    for (const tax of line.taxes) pdf.text(`  ${tax.name} (${(tax.rateBasisPoints / 100).toFixed(2)}%): ${(tax.amount / 100).toFixed(2)} ${invoice.currency}`);
    pdf.moveDown(0.4);
  }
  pdf.moveDown().fontSize(11).text(`Subtotal: ${(invoice.subtotal / 100).toFixed(2)} ${invoice.currency}`, { align: 'right' });
  pdf.text(`Discounts: -${(invoice.discountTotal / 100).toFixed(2)} ${invoice.currency}`, { align: 'right' });
  pdf.text(`Tax: ${(invoice.taxTotal / 100).toFixed(2)} ${invoice.currency}`, { align: 'right' });
  pdf.fontSize(14).text(`Total: ${(invoice.total / 100).toFixed(2)} ${invoice.currency}`, { align: 'right' });
  pdf.fontSize(10).text(`Outstanding: ${(invoice.outstanding / 100).toFixed(2)} ${invoice.currency}`, { align: 'right' });
  pdf.end();
}
