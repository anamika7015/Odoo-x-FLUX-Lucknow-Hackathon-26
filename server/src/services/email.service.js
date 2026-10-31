import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

function transporter() {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.password) return null;
  return nodemailer.createTransport({ host: config.smtp.host, port: config.smtp.port, secure: config.smtp.port === 465, auth: { user: config.smtp.user, pass: config.smtp.password } });
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export async function sendPasswordResetEmail({ to, fullName, resetUrl }) {
  const mailer = transporter();
  if (!mailer) {
    logger.warn('SMTP is not configured; password-reset email was not sent.', { to, resetUrl: config.isProduction ? undefined : resetUrl });
    return;
  }
  try {
    await mailer.sendMail({
      from: config.smtp.from,
      to,
      subject: 'Reset your Brightloop password',
      text: `Hello ${fullName}, reset your password using this link: ${resetUrl}. The link expires in one hour.`,
      html: `<p>Hello ${escapeHtml(fullName)},</p><p><a href="${escapeHtml(resetUrl)}">Reset your Brightloop password</a></p><p>This link expires in one hour.</p>`,
    });
  } catch (error) {
    logger.error('Password-reset email delivery failed', { error, to });
  }
}

export async function sendInvoiceNotification({ to, fullName, invoiceNumber, total, outstanding, currency, dueDate, eventId }) {
  const mailer = transporter();
  if (!mailer) {
    logger.warn('SMTP is not configured; invoice notification remains pending.', { to, invoiceNumber });
    return false;
  }
  const invoiceUrl = new URL('/portal', config.allowedOrigins[0]).toString();
  const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value / 100);
  try {
    await mailer.sendMail({
      from: config.smtp.from,
      to,
      messageId: `<billing-${eventId}@brightloop.local>`,
      subject: `Brightloop invoice ${invoiceNumber}`,
      text: `Hello ${fullName}, invoice ${invoiceNumber} is ready. Total: ${formatMoney(total)}. Outstanding: ${formatMoney(outstanding)}. Due date: ${new Date(dueDate).toLocaleDateString('en-IN')}. Sign in to your Brightloop customer portal to view and download it: ${invoiceUrl}`,
      html: `<p>Hello ${escapeHtml(fullName)},</p><p>Invoice <strong>${escapeHtml(invoiceNumber)}</strong> is ready.</p><p>Total: ${formatMoney(total)}<br/>Outstanding: ${formatMoney(outstanding)}<br/>Due date: ${new Date(dueDate).toLocaleDateString('en-IN')}</p><p><a href="${escapeHtml(invoiceUrl)}">Open your Brightloop customer portal</a> to view and download the invoice.</p>`,
    });
    return true;
  } catch (error) {
    logger.error('Invoice notification delivery failed', { error, to, invoiceNumber });
    return false;
  }
}

export async function sendQuotationNotification({ to, fullName, quotationNumber, lines, subtotal, discountTotal = 0, taxTotal = 0, total = subtotal, currency, validUntil, eventId }) {
  const mailer = transporter();
  if (!mailer) {
    logger.warn('SMTP is not configured; quotation email was not sent.', { to, quotationNumber });
    return false;
  }
  const quotationUrl = new URL('/quotations', config.allowedOrigins[0]).toString();
  const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value / 100);
  const summary = lines.map((line) => `${line.quantity} × ${line.planName} — ${formatMoney(line.lineTotal)}`).join('\n');
  try {
    await mailer.sendMail({
      from: config.smtp.from,
      to,
      messageId: `<quotation-${eventId}@brightloop.local>`,
      subject: `Brightloop quotation ${quotationNumber}`,
      text: `Hello ${fullName}, quotation ${quotationNumber} is ready.\n\n${summary}\nSubtotal: ${formatMoney(subtotal)}\nDiscounts: -${formatMoney(discountTotal)}\nEstimated tax: ${formatMoney(taxTotal)}\nTotal: ${formatMoney(total)}\nValid until: ${new Date(validUntil).toLocaleDateString('en-IN')}\n\nSign in to review and accept it: ${quotationUrl}`,
      html: `<p>Hello ${escapeHtml(fullName)}, quotation <strong>${escapeHtml(quotationNumber)}</strong> is ready.</p><ul>${lines.map((line) => `<li>${line.quantity} × ${escapeHtml(line.planName)} — ${formatMoney(line.lineTotal)}</li>`).join('')}</ul><p>Subtotal: ${formatMoney(subtotal)}<br/>Discounts: -${formatMoney(discountTotal)}<br/>Estimated tax: ${formatMoney(taxTotal)}<br/>Total: <strong>${formatMoney(total)}</strong><br/>Valid until: ${new Date(validUntil).toLocaleDateString('en-IN')}</p><p><a href="${escapeHtml(quotationUrl)}">Sign in to review and accept this quotation</a></p>`,
    });
    return true;
  } catch (error) {
    logger.error('Quotation email delivery failed', { error, to, quotationNumber });
    return false;
  }
}
