import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sender = process.env.GMAIL_SENDER_EMAIL;
const appPassword = process.env.GMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: sender,
    pass: appPassword,
  },
});

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(email, name, otp) {
  if (!sender || !appPassword) {
    throw new Error('Email settings not configured');
  }

  const subject = 'Your complaint registration OTP';
  const text = `Hello ${name},\n\nYour one-time password is: ${otp}\n\nIt expires in 10 minutes.\n\nThank you.\n`;

  await transporter.sendMail({
    from: sender,
    to: email,
    subject,
    text,
  });
}
