// src/services/email.ts
// TODO whole this file, rightnow just returnig true
/**
 * MOCK: Sends a verification code to the specified email.
 * For now, it only logs to the console and returns true.
 */
export const sendVerificationEmail = async (email: string, code: string): Promise<boolean> => {
  try {
    // Later this will connect to something like Resend, SendGrid, or Nodemailer
    console.log(`\n📧 [MOCK EMAIL SERVICE]`);
    console.log(`Recipient: ${email}`);
    console.log(`Your verification code is: ${code}`);
    console.log(`----------------------------------------\n`);
    
    return true; // We pretend the email was successfully sent
  } catch (error) {
    console.error("Error while sending email:", error);
    return false;
  }
};