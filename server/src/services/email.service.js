import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

function transporter() {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.password) return null;
  return nodemailer.createTransport({ host: config.smtp.host, port: config.smtp.port, secure: config.smtp.port === 465, auth: { user: config.smtp.user, pass: config.smtp.password } });
}

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
      html: `<p>Hello ${fullName},</p><p><a href="${resetUrl}">Reset your Brightloop password</a></p><p>This link expires in one hour.</p>`,
    });
  } catch (error) {
    logger.error('Password-reset email delivery failed', { error, to });
  }
}
