const transporter = require("../config/mailer");

const logoUrl = `${process.env.BACKEND_URL}/images/Miarcus.png`;

console.log("Logo URL:", logoUrl);

const sendInvitationEmail = async (user, activationLink) => {

    return transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: user.email,

        subject: "Welcome to miarcus",

        html: `
<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Welcome to miarcus</title>

</head>

<body
style="
margin:0;
padding:0;
background:#F3F0FF;
font-family:Arial,Helvetica,sans-serif;
">

<table
width="100%"
border="0"
cellpadding="0"
cellspacing="0"
style="
background:#F3F0FF;
padding:45px 20px;
">

<tr>

<td align="center">

<!-- ===================== LOGO ===================== -->

<table
width="700"
cellpadding="0"
cellspacing="0"
border="0"
style="max-width:700px;width:100%;">

<tr>

<td
align="center"
style="padding-bottom:30px;">

<img
    src="${logoUrl}"
    alt="miarcus"
    width="170"
    style="
        display:block;
        margin:0 auto;
        border:0;
        outline:none;
        text-decoration:none;
    "
>

</td>

</tr>

</table>

<!-- ===================== CARD ===================== -->

<table

width="700"

cellpadding="0"

cellspacing="0"

border="0"

style="
max-width:700px;
width:100%;
background:#ffffff;
border-radius:28px;
overflow:hidden;
">

<tr>

<td

align="center"

style="
padding:55px 45px 30px;
">

<table
width="100%"
cellpadding="0"
cellspacing="0"
border="0">

<tr>

<td
width="40%"
style="
border-top:2px solid #ECE8FF;
">

</td>

<td
width="40"
align="center"
style="
font-size:22px;
color:#7A5CFF;
">

●

</td>

<td
width="40%"
style="
border-top:2px solid #ECE8FF;
">

</td>

</tr>

</table>

<h1

style="
margin:28px 0 0;
font-size:56px;
line-height:64px;
font-weight:700;
color:#202040;
">

Welcome to

<span style="color:#5F39FF;">

miarcus

</span>

</h1>

</td>

</tr>

<tr>

<td>

<hr
style="
margin:0;
border:none;
border-top:1px solid #ECE8FF;
">

</td>

</tr>

<tr>

<td

style="
padding:60px 70px;
">

<p

style="
margin:0;
font-size:24px;
font-weight:bold;
line-height:36px;
color:#222;
">

Hello

<span style="color:#5F39FF;">

${user.fullName}

</span>,

</p>

<p

style="
margin:45px 0 0;
font-size:24px;
line-height:42px;
color:#222;
">

You've been invited to join

<strong style="color:#5F39FF;">

miarcus

</strong>.

</p>

<p

style="
margin:50px 0 0;
font-size:23px;
line-height:42px;
color:#222;
">

Your account has been created successfully.

<br><br>

Click the button below to activate your account
and create a secure password.

</p>

<!-- ======= PART 2 STARTS FROM HERE ======= -->
<!-- ================= ACTIVATE BUTTON ================= -->

<table
width="100%"
border="0"
cellpadding="0"
cellspacing="0"
style="margin-top:60px;">

<tr>

<td align="center">

<a

href="${activationLink}"

style="
background:#6C63FF;
color:#ffffff;
text-decoration:none;
display:inline-block;
padding:18px 55px;
font-size:18px;
font-weight:bold;
border-radius:12px;
box-shadow:0 10px 25px rgba(108,99,255,.25);
">

Activate Account

</a>

</td>

</tr>

</table>

<!-- ================= SECURITY CARD ================= -->

<table
width="100%"
border="0"
cellpadding="0"
cellspacing="0"
style="
margin-top:60px;
background:#F8F6FF;
border:1px solid #E6DFFF;
border-radius:18px;
">

<tr>

<td
style="
padding:30px;
">

<table
width="100%"
border="0"
cellpadding="0"
cellspacing="0">

<tr>

<td
width="55"
valign="top"
style="
font-size:32px;
color:#6C63FF;
">

🛡️

</td>

<td>

<h2
style="
margin:0;
font-size:22px;
color:#202040;
">

Secure Invitation

</h2>

<p
style="
margin:18px 0 0;
font-size:17px;
line-height:30px;
color:#555;
">

This invitation link is valid for

<strong style="color:#6C63FF;">

24 hours

</strong>.

After it expires, your administrator can send you a new invitation.

</p>

<p
style="
margin:22px 0 0;
font-size:16px;
line-height:28px;
color:#555;
">

Never share this activation link with anyone.

</p>

</td>

</tr>

</table>

</td>

</tr>

</table>

<!-- ================= BACKUP LINK ================= -->

<p
style="
margin:50px 0 18px;
font-size:18px;
color:#222;
">

If the button doesn't work, copy and paste this link into your browser.

</p>

<p
style="
margin:0;
word-break:break-all;
line-height:30px;
">

<a

href="${activationLink}"

style="
color:#6C63FF;
font-size:16px;
text-decoration:none;
">

${activationLink}

</a>

</p>

<!-- ================= DIVIDER ================= -->

<table
width="100%"
border="0"
cellpadding="0"
cellspacing="0"
style="
margin:60px 0 0;
">

<tr>

<td
width="45%"
style="
border-top:1px solid #ECE8FF;
">

</td>

<td
align="center"
width="50"
style="
font-size:26px;
color:#6C63FF;
">

🛡️

</td>

<td
width="45%"
style="
border-top:1px solid #ECE8FF;
">

</td>

</tr>

</table>

<p
style="
margin:40px 0 0;
font-size:18px;
line-height:34px;
color:#555;
">

If you weren't expecting this invitation,
you can safely ignore this email.

</p>

<p
style="
margin:50px 0 0;
font-size:22px;
line-height:36px;
color:#222;
">

Regards,

<br><br>

<strong style="color:#5F39FF;">

miarcus Team

</strong>

</p>

</td>

</tr>

<!-- ======= PART 3 STARTS BELOW ======= -->
<!-- ================= FOOTER ================= -->

<tr>

<td
align="center"
style="
padding:45px 30px;
background:#F8F7FF;
border-top:1px solid #ECE8FF;
">

<p
style="
margin:0;
font-size:16px;
font-weight:bold;
color:#5F39FF;
">

Stay Connected

</p>

<table
border="0"
cellpadding="0"
cellspacing="0"
style="margin-top:25px;">

<tr>

<td align="center" style="padding:0 8px;">

<a
href="https://facebook.com"
style="
display:inline-block;
width:42px;
height:42px;
line-height:42px;
background:#6C63FF;
border-radius:50%;
color:#ffffff;
text-decoration:none;
font-size:18px;
font-weight:bold;
">

f

</a>

</td>

<td align="center" style="padding:0 8px;">

<a
href="https://linkedin.com"
style="
display:inline-block;
width:42px;
height:42px;
line-height:42px;
background:#6C63FF;
border-radius:50%;
color:#ffffff;
text-decoration:none;
font-size:18px;
font-weight:bold;
">

in

</a>

</td>

<td align="center" style="padding:0 8px;">

<a
href="https://twitter.com"
style="
display:inline-block;
width:42px;
height:42px;
line-height:42px;
background:#6C63FF;
border-radius:50%;
color:#ffffff;
text-decoration:none;
font-size:18px;
font-weight:bold;
">

X

</a>

</td>

<td align="center" style="padding:0 8px;">

<a
href="https://instagram.com"
style="
display:inline-block;
width:42px;
height:42px;
line-height:42px;
background:#6C63FF;
border-radius:50%;
color:#ffffff;
text-decoration:none;
font-size:18px;
font-weight:bold;
">

◎

</a>

</td>

</tr>

</table>

<p
style="
margin:35px 0 10px;
font-size:15px;
line-height:28px;
color:#666666;
">

Need help?

Contact your administrator if you have any questions regarding your account.

</p>

<p
style="
margin:0;
font-size:14px;
line-height:24px;
color:#999999;
">

© 2026 miarcus. All Rights Reserved.

</p>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
`

    });

};

module.exports = {
    sendInvitationEmail
};