import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendTempPasswordEmail(
  to: string,
  firstName: string,
  tempPassword: string,
): Promise<void> {
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
