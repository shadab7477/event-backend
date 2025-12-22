// utils/emailService.js
import { Resend } from 'resend';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (email, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'College Forms <noreply@collegeforms.in>',
      to: email,
      subject: 'Your OTP for College Form Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">College Form Registration</h2>
          <p>Your OTP for verification is:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending OTP email:', error);
      return false;
    }

    console.log('Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'collegeforms.in'}/user/reset-password/${resetToken}`;
    
    console.log("Sending reset email to:", email);
    console.log("Reset URL:", resetUrl);

    const { data, error } = await resend.emails.send({
      from: 'College Forms <noreply@collegeforms.in>',
      to: email,
      subject: 'Password Reset Request - College Form',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You requested to reset your password for your College Form account. Click the button below to reset it:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p>Or copy and paste this link in your browser:</p>
          <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 14px;">
            ${resetUrl}
          </p>
          
          <p><strong>This link will expire in 1 hour.</strong></p>
          
          <p>If you didn't request a password reset, please ignore this email. Your account remains secure.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
            <p>Best regards,<br>College Form Team</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }

    console.log('Password reset email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error in sendPasswordResetEmail:', error);
    return false;
  }
};

export const sendPasswordChangedEmail = async (email) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'College Forms <noreply@collegeforms.in>',
      to: email,
      subject: 'Password Changed - College Form',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Changed Successfully</h2>
          <p>Your password has been changed successfully.</p>
          <p>If you did not make this change, please contact us immediately.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending password changed email:', error);
      return false;
    }

    console.log('Password changed email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending password changed email:', error);
    return false;
  }
};

export const sendApplicationNotificationEmail = async (applicationData) => {
  const { name, number, email, city, course, collegeName, location } = applicationData;

  try {
    const { data, error } = await resend.emails.send({
      from: 'College Forms <noreply@collegeforms.in>',
      to: process.env.ADMIN_EMAIL,
      subject: 'New Application Submitted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Application Received</h2>
          <p>A new application has been submitted with the following details:</p>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Phone Number:</strong> ${number}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>City:</strong> ${city}</li>
            <li><strong>Course:</strong> ${course}</li>
            <li><strong>College Name:</strong> ${collegeName}</li>
            <li><strong>Location:</strong> ${location}</li>
          </ul>
          <p>Please review the application in the system.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending application notification email:', error);
      return false;
    }

    console.log('Application notification email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in sendApplicationNotificationEmail:', error);
    return false;
  }
};