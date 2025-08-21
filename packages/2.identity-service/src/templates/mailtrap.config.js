require('dotenv').config();

const Nodemailer = require('nodemailer');

exports.transport = Nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: Number(process.env.MAILTRAP_PORT),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

exports.sender = {
  address: 'admin@eshop.com',
  name: 'E-Services',
};
