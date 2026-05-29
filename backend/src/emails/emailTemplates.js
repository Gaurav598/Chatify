export function createWelcomeEmailTemplate(name, clientURL) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Chatify</title>
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 600;">Welcome to Chatify! 🎉</h1>
      <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">Your conversations, elevated.</p>
    </div>
    <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
      <p style="font-size: 18px; color: #667eea;"><strong>Hello ${name},</strong></p>
      <p>We're thrilled to have you on board! Chatify connects you with friends, family, and colleagues through a beautiful, modern messaging experience.</p>
      
      <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
        <p style="font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">Get started:</p>
        <ul style="padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 8px;">Set up your profile with a photo</li>
          <li style="margin-bottom: 8px;">Find and add your contacts</li>
          <li style="margin-bottom: 8px;">Start a conversation or create a group</li>
          <li style="margin-bottom: 0;">Share photos, files, and voice notes</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${clientURL}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: 600; display: inline-block; font-size: 16px;">Open Chatify</a>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 24px;">Happy messaging! 💬</p>
      <p style="margin-top: 24px; color: #999;">— The Chatify Team</p>
    </div>
    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
      <p>© ${new Date().getFullYear()} Chatify. All rights reserved.</p>
    </div>
  </body>
  </html>
  `;
}

export function createResetPasswordTemplate(name, resetUrl) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Password Reset 🔐</h1>
    </div>
    <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
      <p style="font-size: 18px;"><strong>Hi ${name},</strong></p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: 600; display: inline-block;">Reset Password</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 12px;">If the button doesn't work, copy and paste this URL into your browser:<br><a href="${resetUrl}" style="color: #667eea;">${resetUrl}</a></p>
    </div>
  </body>
  </html>
  `;
}

export function createVerificationEmailTemplate(name, verifyUrl) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Verify Your Email ✉️</h1>
    </div>
    <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
      <p style="font-size: 18px;"><strong>Hi ${name},</strong></p>
      <p>Please verify your email address to complete your Chatify account setup:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: 600; display: inline-block;">Verify Email</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
    </div>
  </body>
  </html>
  `;
}
