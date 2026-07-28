const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({

    host: "smtp.gmail.com",

    port: 587,

    secure: false,

    pool: true,

    maxConnections: 2,

    maxMessages: 100,

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

        console.error("❌ Mail Server Error");
        console.error(err);

    } else {

        console.log("✅ Mail Server Ready");

    }

});

module.exports = transporter;