import 'server-only'
import nodemailer from 'nodemailer'

export async function sendGmailOtp(toEmail: string, code: string): Promise<boolean> {
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD

  if (!gmailUser || !gmailPass) {
    return false
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  })

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #4F46E5; margin-bottom: 10px;">Security Verification Code</h2>
      <p style="font-size: 16px; color: #333;">Your One-Time Password (OTP) to reset your password is:</p>
      <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1F2937;">${code}</span>
      </div>
      <p style="font-size: 14px; color: #666;">This code is valid for <strong>10 minutes</strong>. If you did not request this code, please ignore this email.</p>
    </div>
  `

  try {
    await transporter.sendMail({
      from: `"Daily Planner Auth" <${gmailUser}>`,
      to: toEmail,
      subject: `${code} is your Daily Planner verification code`,
      html: emailHtml,
    })
    return true
  } catch (err) {
    console.error('[Mailer] Gmail SMTP Error:', err)
    return false
  }
}
