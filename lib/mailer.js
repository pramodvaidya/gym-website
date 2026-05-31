import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendExpiryAlert({ to, ownerName, members }) {
  const memberList = members
    .map(
      (m) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${m.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;color:${m.daysLeft <= 2 ? '#ff4d6d' : m.daysLeft <= 4 ? '#ff9f1c' : '#4cc9f0'};">
            ${m.daysLeft === 0 ? 'Expires TODAY' : `${m.daysLeft} day${m.daysLeft !== 1 ? 's' : ''} left`}
          </td>
        </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0d0d1a;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:600px;margin:40px auto;background:#12122a;border-radius:16px;overflow:hidden;border:1px solid #2a2a4e;">
        <div style="background:linear-gradient(135deg,#6c3de0,#4361ee);padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">🏋️ GymPro Alert</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">Membership Expiry Notification</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#a0a0c0;font-size:15px;">Hi ${ownerName},</p>
          <p style="color:#a0a0c0;font-size:15px;">The following members have memberships expiring within 7 days:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#1a1a2e;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#1e1e3f;">
                <th style="padding:12px;text-align:left;color:#6c3de0;font-size:13px;text-transform:uppercase;">Member Name</th>
                <th style="padding:12px;text-align:left;color:#6c3de0;font-size:13px;text-transform:uppercase;">Status</th>
              </tr>
            </thead>
            <tbody style="color:#e0e0f0;">${memberList}</tbody>
          </table>
          <p style="color:#a0a0c0;font-size:13px;">Log in to your GymPro dashboard to take action.</p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard/track" style="display:inline-block;margin-top:16px;padding:12px 28px;background:linear-gradient(135deg,#6c3de0,#4361ee);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Dashboard</a>
        </div>
        <div style="padding:20px 32px;background:#0d0d1a;text-align:center;">
          <p style="color:#555;font-size:12px;margin:0;">GymPro — Gym Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"GymPro Alerts" <${process.env.GMAIL_USER}>`,
    to,
    subject: `⚠️ ${members.length} Member${members.length !== 1 ? 's' : ''} Expiring Soon — Action Required`,
    html,
  });
}
