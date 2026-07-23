const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({

    host: "smtp.gmail.com",

    port: 587,

    secure: false,

    requireTLS: true,

    auth: {

        user: process.env.EMAIL_USER,

        pass: process.env.EMAIL_PASS

    },

    tls: {

        rejectUnauthorized: false

    }

});

transporter.verify((err) => {

    if (err) {

        console.log("❌ Mail Error:", err);

    }

    else {

        console.log("✅ Mail Server Ready");

    }

});

module.exports = transporter;