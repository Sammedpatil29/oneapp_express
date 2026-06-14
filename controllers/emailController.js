const nodemailer = require('nodemailer');

/**
 * Reusable utility function to send emails from anywhere in your backend.
 * 
 * @param {string|string[]} to - Recipient email address or array of addresses
 * @param {string} subject - Email subject line
 * @param {string} body - The email content (automatically detects if it's HTML)
 * @returns {Promise<Object>} - Contains success boolean and message info/error
 */
const sendEmailUtility = async (to, subject, body) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials (SMTP_USER or SMTP_PASS) are missing or empty in your .env file.');
    }

    // Create reusable transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // true for port 465, false for others
      auth: {
        user: process.env.SMTP_USER, // SMTP username (e.g., your email)
        pass: process.env.SMTP_PASS, // SMTP password (e.g., App Password)
      },
    });

    // Detect if the body contains HTML tags
    const isHtml = /<[a-z][\s\S]*>/i.test(body);

    // Setup email data
    const mailOptions = {
      from: process.env.SMTP_FROM || '"OneApp" <noreply@oneapp.com>', // sender address
      to: Array.isArray(to) ? to.join(', ') : to, // list of receivers
      subject: subject,
    };

    // Attach body as either HTML or plain text
    if (isHtml) {
      mailOptions.html = body;
    } else {
      mailOptions.text = body;
    }

    // Send mail
    const info = await transporter.sendMail(mailOptions);
    
    return { success: true, messageId: info.messageId, info };
  } catch (error) {
    console.error('Email Send Utility Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Express controller handler for triggering an email via an API endpoint.
 * Route e.g., POST /api/email/send
 */
const sendEmailHandler = async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, message: 'Missing required fields: to, subject, body' });
    }

    const result = await sendEmailUtility(to, subject, body);

    if (result.success) {
      return res.status(200).json({ success: true, message: 'Email sent successfully', messageId: result.messageId });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to send email', error: result.error });
    }
  } catch (error) {
    console.error('Email Controller API Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  sendEmailUtility,
  sendEmailHandler
};