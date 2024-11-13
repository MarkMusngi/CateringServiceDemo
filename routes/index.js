const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Route for the index page
router.get('/', (req, res) => {
  res.render('index', { title: 'Home' });  // Render the index.hbs template
});

//Route for the Admin page
router.get('/admin', (req, res) => {
  res.render('admin', { title: 'Admin' });  // Render the admin.hbs template
});

//Route for the Order Form page
router.get('/orderform', (req, res) => {
  res.render('orderform', { title: 'OrderForm' });  // Render the admin.hbs template
});

//Route for the Create New Client page
router.get('/createclient', (req, res) => {
  res.render('createclient', { title: 'CreateClient' });  // Render the admin.hbs template
});

// Route for the About Us page
router.get('/gallery', (req, res) => {
  res.render('gallery', { title: 'gallery' });  // Render the Gallery.hbs template
});

// Route for the Contact page
router.get('/contact', (req, res) => {
  console.log('Success flag:', req.query.success);
  res.render('contact', { title: 'Contact Us', success: req.query.success, error: req.query.error });  // Render the contact.hbs template with success and error flags
});

router.post('/submit', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).send('Name, email, subject, and message are required.');
  }

  try {
    // Create a transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'mailerdeflorence@gmail.com', // Your Gmail email address
        pass: 'nayf cfiv cpff bmxs'   // Your Gmail password
      }
    });

    // Email options
    const mailOptions = {
      from: 'noreply@example.com',
      to: 'xendraketv@gmail.com', // Set the recipient email here
      subject: subject || 'New Message from Contact Form', // Use provided subject or default
      text: `Name: ${name}
Email: ${email}
Subject: ${subject}
Message: ${message}`
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);

    // Redirect with success message
    res.redirect('/contact?success=true');
  } catch (emailError) {
    console.error('Error sending email:', emailError);
    return res.status(500).send('Error sending email');
  }
});

module.exports = router;
