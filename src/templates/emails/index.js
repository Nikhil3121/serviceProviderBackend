// src/templates/emails/index.js
const APP_NAME = process.env.APP_NAME || 'Service Provider';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const baseTemplate = (content, preheader = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${APP_NAME}</title>
  <style>
    body{margin:0;padding:0;background:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#333}
    .wrapper{width:100%;background:#f4f7fa;padding:40px 0}
    .container{max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:36px 40px;text-align:center}
    .header h1{margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px}
    .header p{margin:6px 0 0;color:rgba(255,255,255,.85);font-size:14px}
    .body{padding:40px}
    .body h2{margin:0 0 16px;font-size:20px;font-weight:600;color:#1a202c}
    .body p{margin:0 0 16px;font-size:15px;line-height:1.7;color:#4a5568}
    .btn{display:inline-block;margin:24px 0;padding:14px 32px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff!important;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:.3px}
    .btn:hover{opacity:.9}
    .code-box{background:#f8f9ff;border:2px solid #667eea;border-radius:8px;padding:20px;text-align:center;margin:24px 0}
    .code-box span{font-size:36px;font-weight:700;color:#667eea;letter-spacing:8px}
    .divider{border:none;border-top:1px solid #e2e8f0;margin:24px 0}
    .footer{background:#f8f9fa;padding:24px 40px;text-align:center}
    .footer p{margin:0;font-size:12px;color:#718096;line-height:1.6}
    .footer a{color:#667eea;text-decoration:none}
    .alert{background:#fff5f5;border-left:4px solid #f56565;border-radius:4px;padding:12px 16px;margin:16px 0;font-size:14px;color:#c53030}
    .success-icon{font-size:48px;text-align:center;margin-bottom:16px}
    @media(max-width:640px){.body{padding:24px}.header{padding:24px}}
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>⚡ ${APP_NAME}</h1>
        <p>Professional Services Platform</p>
      </div>
      <div class="body">${content}</div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        <p style="margin-top:8px">
          <a href="${FRONTEND_URL}/privacy">Privacy Policy</a> &nbsp;|&nbsp;
          <a href="${FRONTEND_URL}/terms">Terms of Service</a> &nbsp;|&nbsp;
          <a href="${FRONTEND_URL}/contact">Contact Us</a>
        </p>
        <p style="margin-top:8px">You received this email because you registered on ${APP_NAME}.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const emailTemplates = {
  verifyEmail: ({ name, verificationUrl }) =>
    baseTemplate(
      `
      <h2>Verify Your Email Address 📧</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Welcome to ${APP_NAME}! Please verify your email address to activate your account and start using our services.</p>
      <div style="text-align:center">
        <a href="${verificationUrl}" class="btn">✅ Verify Email Address</a>
      </div>
      <hr class="divider"/>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break:break-all;font-size:13px;color:#667eea;background:#f8f9ff;padding:12px;border-radius:6px">${verificationUrl}</p>
      <div class="alert">⏰ This link expires in <strong>24 hours</strong>. If you didn't create an account, please ignore this email.</div>
    `,
      'Please verify your email to activate your account'
    ),

  welcome: ({ name }) =>
    baseTemplate(
      `
      <div class="success-icon">🎉</div>
      <h2>Welcome to ${APP_NAME}!</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your account has been successfully verified and activated. We're thrilled to have you on board!</p>
      <p>Here's what you can do:</p>
      <ul style="color:#4a5568;line-height:2;padding-left:20px">
        <li>Browse our professional services</li>
        <li>Get instant project quotes</li>
        <li>Contact our expert team</li>
        <li>Track your project progress</li>
      </ul>
      <div style="text-align:center">
        <a href="${FRONTEND_URL}" class="btn">🚀 Explore Services</a>
      </div>
    `,
      `Welcome aboard, ${name}! Your account is ready.`
    ),

  resetPassword: ({ name, resetUrl }) =>
    baseTemplate(
      `
      <h2>Reset Your Password 🔐</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset the password for your ${APP_NAME} account. Click the button below to set a new password.</p>
      <div style="text-align:center">
        <a href="${resetUrl}" class="btn">🔑 Reset Password</a>
      </div>
      <hr class="divider"/>
      <p>Or copy and paste this link:</p>
      <p style="word-break:break-all;font-size:13px;color:#667eea;background:#f8f9ff;padding:12px;border-radius:6px">${resetUrl}</p>
      <div class="alert">⏰ This link expires in <strong>10 minutes</strong>. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</div>
    `,
      'Password reset link inside — expires in 10 minutes'
    ),

  passwordChanged: ({ name }) =>
    baseTemplate(
      `
      <div class="success-icon">🛡️</div>
      <h2>Password Changed Successfully</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your ${APP_NAME} account password was successfully changed.</p>
      <p>If you made this change, no further action is required.</p>
      <div class="alert">🚨 If you did NOT make this change, your account may be compromised. Please <a href="${FRONTEND_URL}/forgot-password" style="color:#c53030">reset your password immediately</a> and contact our support team.</div>
      <div style="text-align:center;margin-top:24px">
        <a href="${FRONTEND_URL}/contact" class="btn">📞 Contact Support</a>
      </div>
    `,
      'Your password was just changed'
    ),

  contactNotification: ({ name, email, phone, subject, message }) =>
    baseTemplate(
      `
      <h2>📬 New Contact Form Submission</h2>
      <p>A new message has been submitted through the contact form.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f8f9ff"><td style="padding:10px 14px;font-weight:600;width:120px;border-radius:4px">Name</td><td style="padding:10px 14px">${name}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:600">Email</td><td style="padding:10px 14px"><a href="mailto:${email}" style="color:#667eea">${email}</a></td></tr>
        <tr style="background:#f8f9ff"><td style="padding:10px 14px;font-weight:600">Phone</td><td style="padding:10px 14px">${phone || 'N/A'}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:600">Subject</td><td style="padding:10px 14px">${subject || 'N/A'}</td></tr>
      </table>
      <p style="font-weight:600;margin-bottom:8px">Message:</p>
      <div style="background:#f8f9ff;padding:16px;border-radius:8px;line-height:1.7;white-space:pre-wrap">${message}</div>
      <div style="text-align:center;margin-top:24px">
        <a href="mailto:${email}" class="btn">💬 Reply to ${name}</a>
      </div>
    `
    ),

  contactAutoReply: ({ name }) =>
    baseTemplate(
      `
      <div class="success-icon">✅</div>
      <h2>Message Received!</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for reaching out to us! We've received your message and our team will get back to you within <strong>24–48 business hours</strong>.</p>
      <p>In the meantime, feel free to explore our services or check out our FAQ section.</p>
      <div style="text-align:center">
        <a href="${FRONTEND_URL}/services" class="btn">🔍 Explore Services</a>
      </div>
    `,
      "We've received your message and will respond soon."
    ),
};

module.exports = emailTemplates;
