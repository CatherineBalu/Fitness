import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Prague',
  });
}

export async function sendTempPasswordEmail(
  to: string,
  firstName: string,
  tempPassword: string,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  await transporter.sendMail({
    from: `"FitnessXY Gym" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your FitnessXY staff account',
    text: [
      `Hi ${firstName},`,
      '',
      'An account has been created for you at FitnessXY Gym.',
      '',
      `Temporary password: ${tempPassword}`,
      '',
      'Please log in and change your password immediately.',
      '',
      'FitnessXY Gym',
    ].join('\n'),
  });
}

export async function sendBookingConfirmationEmail(
  to: string,
  firstName: string,
  lectureName: string,
  startTime: string,
  endTime: string,
  roomName: string,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  await transporter.sendMail({
    from: `"FitnessXY Gym" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Booking confirmed: ${lectureName}`,
    text: [
      `Hi ${firstName},`,
      '',
      `Your spot is confirmed for ${lectureName}.`,
      '',
      `When:  ${formatTime(startTime)} – ${new Date(endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' })}`,
      `Where: ${roomName}`,
      '',
      'See you there!',
      'FitnessXY Gym',
    ].join('\n'),
  });
}

export async function sendCancellationEmail(
  to: string,
  firstName: string,
  lectureName: string,
  startTime: string,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  await transporter.sendMail({
    from: `"FitnessXY Gym" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Booking cancelled: ${lectureName}`,
    text: [
      `Hi ${firstName},`,
      '',
      `Your booking for ${lectureName} on ${formatTime(startTime)} has been cancelled.`,
      '',
      'You can re-register any time on the schedule page.',
      '',
      'FitnessXY Gym',
    ].join('\n'),
  });
}

export async function sendReminderEmail(
  to: string,
  firstName: string,
  lectureName: string,
  startTime: string,
  endTime: string,
  roomName: string,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  await transporter.sendMail({
    from: `"FitnessXY Gym" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Reminder: ${lectureName} tomorrow`,
    text: [
      `Hi ${firstName},`,
      '',
      `Just a reminder that you are registered for ${lectureName} tomorrow.`,
      '',
      `When:  ${formatTime(startTime)} – ${new Date(endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' })}`,
      `Where: ${roomName}`,
      '',
      'See you there!',
      'FitnessXY Gym',
    ].join('\n'),
  });
}
