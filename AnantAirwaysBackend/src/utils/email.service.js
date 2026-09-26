const nodemailer = require('nodemailer');

// Reusable module-level transporter instance
let transporterInstance = null;

/**
 * Gets or creates NodeMailer Brevo SMTP Transporter instance.
 * Reads configuration strictly from environment variables:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */
// Gets or creates NodeMailer Brevo SMTP Transporter instance
const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass && user !== 'YOUR_BREVO_SMTP_USER' && pass !== 'YOUR_BREVO_SMTP_KEY') {
    return nodemailer.createTransport({
      host,
      port,
      secure: false, // port 587 uses STARTTLS
      auth: {
        user,
        pass
      }
    });
  }
  return null;
};

/**
 * Formats sender address with professional name 'Aviation Courses'
 */
const getFromAddress = () => {
  const rawFrom = process.env.MAIL_FROM || 'support@anantairways.in';
  if (rawFrom.includes('<')) {
    return rawFrom;
  }
  return `"Aviation Courses" <${rawFrom}>`;
};

/**
 * Generic email sending function with error handling & automatic fallback
 */
const sendMail = async ({ to, subject, text, html }) => {
  const from = getFromAddress();
  const transporter = getTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html
      });
      console.log(`✉️ [BREVO SMTP EMAIL SENT] MessageId: ${info.messageId} -> To: ${to}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ [BREVO SMTP ERROR] Primary sender (${from}) failed:`, err.message);

      // Fallback: Retry using Brevo SMTP_USER as sender if custom domain sender is unverified in Brevo
      if (process.env.SMTP_USER && !from.includes(process.env.SMTP_USER)) {
        try {
          const fallbackFrom = `"Aviation Courses" <${process.env.SMTP_USER}>`;
          const info = await transporter.sendMail({
            from: fallbackFrom,
            to,
            subject,
            text,
            html
          });
          console.log(`✉️ [BREVO SMTP EMAIL SENT VIA FALLBACK] MessageId: ${info.messageId} -> To: ${to}`);
          return { success: true, messageId: info.messageId };
        } catch (fallbackErr) {
          console.error(`❌ [BREVO SMTP FALLBACK ERROR]:`, fallbackErr.message);
        }
      }
      return { success: false, error: err.message };
    }
  }

  // Fallback: Log email details to terminal when SMTP credentials are not set in .env
  console.log('----------------------------------------------------');
  console.log(`✉️ [DEV EMAIL LOG - BREVO SMTP UNCONFIGURED]`);
  console.log(`From: ${from}`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Text Body:\n${text}`);
  console.log('----------------------------------------------------');
  return { success: true, devLog: true };
};

/**
 * EMAIL 1 — EXAM LINK EMAIL
 * Sends examination invitation email with Brevo SMTP
 */
const sendExamLinkEmail = async (toEmail, userName, examUrl, examName = 'Aviation Courses Examination', expiresAt = null) => {
  const subject = 'Your Examination Link – Aviation Courses';
  const expiryFormatted = expiresAt ? new Date(expiresAt).toLocaleString() : '24 hours from link generation';

  const text = `Hello ${userName},

You have been assigned the examination: ${examName}.

Access Link: ${examUrl}

EXAMINATION INSTRUCTIONS:
1. Open the examination link above.
2. Enter your registered Email, Phone Number, and Name.
3. Follow the instructions on the screen and start your examination.

IMPORTANT NOTICE:
- Expiry Time: ${expiryFormatted}
- You must complete the examination before the expiry time.
- Do not share your examination link with another person.

Regards,
Aviation Courses
support@anantairways.in`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family: Arial, sans-serif; color:#334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding:20px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#ffffff; border-radius:10px; border:1px solid #e2e8f0; padding:25px;">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#0284c7; padding:20px; text-align:center; border-radius:8px 8px 0 0;">
              <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:bold;">Aviation Courses</h1>
              <p style="color:#e0f2fe; margin:4px 0 0 0; font-size:13px;">Online Examination Link</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:25px 15px;">
              <p style="margin:0 0 14px 0; font-size:15px; color:#334155;">Hello <strong>${userName}</strong>,</p>
              <p style="margin:0 0 16px 0; font-size:14px; color:#475569;">
                You have been registered for the <strong>${examName}</strong>.
              </p>

              <!-- Instructions Box -->
              <div style="background-color:#f1f5f9; border-left:4px solid #0284c7; padding:14px 16px; border-radius:4px; margin-bottom:20px;">
                <p style="margin:0 0 8px 0; font-weight:bold; font-size:14px; color:#0f172a;">Instructions:</p>
                <ol style="margin:0; padding-left:18px; font-size:13px; color:#334155; line-height:1.6;">
                  <li>Click the button below to start your exam.</li>
                  <li>Enter your registered Email, Phone Number, and Name.</li>
                  <li>Follow the on-screen instructions to submit.</li>
                </ol>
              </div>

              <!-- Button -->
              <div style="text-align:center; margin:25px 0;">
                <a href="${examUrl}" target="_blank" style="background-color:#0284c7; color:#ffffff; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:15px; display:inline-block;">
                  Start Examination
                </a>
              </div>

              <p style="font-size:12px; color:#64748b; margin-bottom:4px;">Direct Exam URL:</p>
              <p style="font-size:12px; word-break:break-all; margin-bottom:20px;"><a href="${examUrl}" style="color:#0284c7;">${examUrl}</a></p>

              <!-- Expiry Note -->
              <div style="background-color:#fff1f2; border:1px solid #fecdd3; padding:10px 14px; border-radius:4px; font-size:12px; color:#be123c;">
                <strong>Notice:</strong> This link is valid until <strong>${expiryFormatted}</strong>. Complete your examination before expiry. Do not share this link.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #e2e8f0; padding-top:15px; text-align:center; font-size:12px; color:#94a3b8;">
              <p style="margin:0;">Regards, <strong>Aviation Courses</strong></p>
              <p style="margin:3px 0 0 0;"><a href="mailto:support@anantairways.in" style="color:#0284c7;">support@anantairways.in</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return await sendMail({ to: toEmail, subject, text, html });
};

/**
 * EMAIL 2 — EXAM RESULT EMAIL
 * Sends calculated result details with Brevo SMTP
 */
const sendResultEmail = async (toEmail, userName, examName = 'Aviation Courses Examination', score = 0, totalMarks = 0) => {
  const subject = 'Your Examination Result – Aviation Courses';
  const percentage = totalMarks > 0 ? ((score / totalMarks) * 100).toFixed(2) : '0';

  const text = `Hello ${userName},

Examination Result

Student Name: ${userName}
Exam: ${examName}

Total Marks: ${totalMarks}
Marks Obtained: ${score}
Percentage: ${percentage}%

Thank you for completing the examination.

Regards,
Aviation Courses
support@anantairways.in`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding:30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#0284c7; padding:28px 30px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:700;">Aviation Courses</h1>
              <p style="color:#e0f2fe; margin:6px 0 0 0; font-size:14px;">Official Examination Result</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 30px;">
              <h2 style="color:#0f172a; margin:0 0 16px 0; font-size:20px; font-weight:700;">Examination Result</h2>
              
              <!-- Result Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; border-radius:8px; padding:20px; margin-bottom:24px; border:1px solid #cbd5e1;">
                <tr>
                  <td style="font-size:15px; color:#334155; padding-bottom:10px;"><strong>Student Name:</strong> ${userName}</td>
                </tr>
                <tr>
                  <td style="font-size:15px; color:#334155; padding-bottom:12px;"><strong>Exam:</strong> ${examName}</td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #cbd5e1; padding-top:12px; font-size:15px; color:#334155;">
                    <strong>Total Marks:</strong> ${totalMarks}
                  </td>
                </tr>
                <tr>
                  <td style="font-size:15px; color:#0284c7; padding:6px 0;">
                    <strong>Marks Obtained:</strong> ${score}
                  </td>
                </tr>
                <tr>
                  <td style="font-size:16px; color:#0f172a; font-weight:bold; padding-top:6px;">
                    <strong>Percentage:</strong> ${percentage}%
                  </td>
                </tr>
              </table>

              <p style="margin:0; font-size:15px; color:#475569;">
                Thank you for completing the examination.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; padding:20px 30px; text-align:center; border-top:1px solid #e2e8f0; font-size:13px; color:#94a3b8;">
              <p style="margin:0 0 4px 0;">Regards, <strong>Aviation Courses</strong></p>
              <p style="margin:0;"><a href="mailto:support@anantairways.in" style="color:#0284c7; text-decoration:none;">support@anantairways.in</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return await sendMail({ to: toEmail, subject, text, html });
};

/**
 * EMAIL 3 — SUBMISSION CONFIRMATION EMAIL
 */
const sendSubmissionEmail = async (toEmail, userName) => {
  const subject = 'Exam Submitted Successfully – Aviation Courses';
  const text = `Hello ${userName},

Your examination has been submitted successfully.

Thank you for completing the examination.

Regards,
Aviation Courses
support@anantairways.in`;

  const html = `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
    <h2 style="color: #16a34a;">Exam Submitted Successfully</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Your examination has been submitted successfully.</p>
    <p>Thank you for completing the examination.</p>
    <br/>
    <p>Regards,<br/><strong>Aviation Courses</strong></p>
  </div>`;

  return await sendMail({ to: toEmail, subject, text, html });
};

module.exports = {
  sendExamLinkEmail,
  sendResultEmail,
  sendSubmissionEmail
};

