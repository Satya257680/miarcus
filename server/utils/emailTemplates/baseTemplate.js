const { getAppUrl } = require("../../config/appUrl");

const baseTemplate = ({
    title = "",
    greeting = "",
    intro = "",
    message = "",
    buttonText = "",
    buttonLink = "",
    infoBoxTitle = "",
    infoBoxMessage = "",
    bottomMessage = "",
    showButton = true,
    showInfoBox = true,
}) => {

// ======================================================
// MI ARCUS LOGO
// Rendered as an inline CID attachment so Gmail and other
// mail clients do not depend on the backend public-image URL.
// ======================================================

const logo = "cid:miarcus-logo@miarcus";

// ======================================================
// OFFICIAL MIARCUS LINKS
// ======================================================

const WEBSITE =
    getAppUrl();

const FACEBOOK =
    "https://www.facebook.com/MiArcusOfficial";

const INSTAGRAM =
    "https://www.instagram.com/official_miarcus/";

const LINKEDIN =
    "https://www.linkedin.com/company/mi-arcus";

const X =
    "https://x.com/officialmiarcus";

const YOUTUBE =
    "https://www.youtube.com/@official_miarcus";

// ======================================================
// SOCIAL ICONS
// ======================================================

const facebook =
    "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg";

const linkedin =
    "https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png";

const x =
    "https://upload.wikimedia.org/wikipedia/commons/5/57/X_logo_2023_%28white%29.png";

const instagram =
    "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png";

const youtube =
    "https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg";

return `
<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0">

<title>${title}</title>

<style>

body{
    margin:0;
    padding:40px 20px;
    background:#F3F0FF;
    font-family:Arial,Helvetica,sans-serif;
}

@media only screen and (max-width:600px){

    body{
        padding:20px 10px !important;
    }

    h1{
        font-size:24px !important;
    }

    p{
        font-size:16px !important;
        line-height:26px !important;
    }

    .button{
        display:block !important;
        width:100% !important;
        box-sizing:border-box;
        text-align:center !important;
    }

}

</style>

</head>

<body>

<table
width="100%"
border="0"
cellpadding="0"
cellspacing="0"
style="
max-width:700px;
margin:0 auto;
background:#ffffff;
border-radius:18px;
overflow:hidden;
box-shadow:0 10px 30px rgba(0,0,0,.08);
">

<tr>

<td
align="center"
style="
padding:40px 30px;
background:#B8DCE4;
">

<a
href="${WEBSITE}"
target="_blank"
rel="noopener noreferrer"
style="
display:inline-block;
text-decoration:none;
">

<img
src="${logo}"
alt="Mi Arcus"
style="
width:110px;\nmax-width:110px;
height:auto;
display:block;
border:0;
outline:none;
text-decoration:none;
">

</a>

</td>

</tr>

<tr>

<td style="padding:45px;">

<h1
style="
margin:0;
font-size:30px;
color:#202040;
">

${title}

</h1>

${greeting ? `
<p
style="
margin-top:30px;
font-size:18px;
color:#444;
line-height:30px;
">

${greeting}

</p>
` : ""}

${intro ? `
<p
style="
font-size:17px;
line-height:30px;
color:#555;
">

${intro}

</p>
` : ""}

${message ? `
<p
style="
font-size:17px;
line-height:30px;
color:#555;
">

${message}

</p>
` : ""}

${
showButton && buttonText && buttonLink
? `
<table
width="100%"
border="0"
cellpadding="0"
cellspacing="0"
style="margin-top:40px;">

<tr>

<td align="center">

<a
class="button"
href="${buttonLink}"
target="_blank"
rel="noopener noreferrer"
style="
background:#6C63FF;
color:#ffffff;
text-decoration:none;
display:inline-block;
padding:18px 55px;
font-size:18px;
font-weight:bold;
border-radius:12px;
">

${buttonText}

</a>

</td>

</tr>

</table>
`
: ""
}

${
showInfoBox && infoBoxTitle && infoBoxMessage
? `
<table
width="100%"
border="0"
cellpadding="20"
cellspacing="0"
style="
margin-top:40px;
background:#F8F6FF;
border:1px solid #E6DFFF;
border-radius:12px;
">

<tr>

<td>

<h3
style="
margin:0;
font-size:22px;
color:#202040;
">

${infoBoxTitle}

</h3>

<p
style="
margin-top:15px;
font-size:16px;
line-height:28px;
color:#555;
">

${infoBoxMessage}

</p>

</td>

</tr>

</table>
`
: ""
}

${bottomMessage ? `
<p
style="
margin-top:40px;
font-size:15px;
line-height:28px;
color:#666;
">

${bottomMessage}

</p>
` : ""}
<!-- Regards -->

<p
style="
margin-top:40px;
margin-bottom:0;
font-size:16px;
color:#555;
">

Regards,

</p>

<p
style="
margin-top:8px;
font-size:18px;
font-weight:bold;
color:#5F39FF;
">

Mi Arcus Team

</p>

<hr
style="
margin:40px 0 30px;
border:none;
border-top:1px solid #E5E5E5;
">

<!-- Footer -->

<table
width="100%"
border="0"
cellpadding="0"
cellspacing="0"
style="
background:#F8F6FF;
border-radius:14px;
">

<tr>

<td
align="center"
style="
padding:35px 20px 15px;
">

<h2
style="
margin:0;
font-size:22px;
color:#5F39FF;
">

Stay Connected

</h2>

</td>

</tr>

<tr>

<td
align="center"
style="padding:15px 0 25px;">

<!-- Website -->

<a
href="${WEBSITE}"
target="_blank"
rel="noopener noreferrer"
style="display:inline-block;margin:0 8px;">

<img
src="${logo}"
width="40"
alt="Website"
style="
display:block;
border:0;
outline:none;
text-decoration:none;
border-radius:8px;
">

</a>

<!-- Facebook -->

<a
href="${FACEBOOK}"
target="_blank"
rel="noopener noreferrer"
style="display:inline-block;margin:0 8px;">

<img
src="${facebook}"
width="40"
alt="Facebook"
style="
display:block;
border:0;
outline:none;
text-decoration:none;
">

</a>

<!-- Instagram -->

<a
href="${INSTAGRAM}"
target="_blank"
rel="noopener noreferrer"
style="display:inline-block;margin:0 8px;">

<img
src="${instagram}"
width="40"
alt="Instagram"
style="
display:block;
border:0;
outline:none;
text-decoration:none;
">

</a>

<!-- LinkedIn -->

<a
href="${LINKEDIN}"
target="_blank"
rel="noopener noreferrer"
style="display:inline-block;margin:0 8px;">

<img
src="${linkedin}"
width="40"
alt="LinkedIn"
style="
display:block;
border:0;
outline:none;
text-decoration:none;
">

</a>

<!-- X -->

<a
href="${X}"
target="_blank"
rel="noopener noreferrer"
style="display:inline-block;margin:0 8px;">

<img
src="${x}"
width="40"
alt="X"
style="
display:block;
border:0;
outline:none;
text-decoration:none;
">

</a>

<!-- YouTube -->

<a
href="${YOUTUBE}"
target="_blank"
rel="noopener noreferrer"
style="display:inline-block;margin:0 8px;">

<img
src="${youtube}"
width="40"
alt="YouTube"
style="
display:block;
border:0;
outline:none;
text-decoration:none;
">

</a>

</td>

</tr>
<tr>

<td
align="center"
style="
padding:0 25px;
font-size:15px;
line-height:28px;
color:#666;
">

<strong style="color:#202040;">
Need help?
</strong>

<br><br>

If you have any questions regarding your account or the Mi Arcus ERP application,
please contact your administrator or visit our official website.

<br><br>

<a
href="${WEBSITE}"
target="_blank"
rel="noopener noreferrer"
style="
color:#5F39FF;
font-weight:bold;
text-decoration:none;
">

${WEBSITE}

</a>

</td>

</tr>

<tr>

<td
align="center"
style="
padding:30px 20px 35px;
font-size:13px;
color:#999;
">

© ${new Date().getFullYear()} Mi Arcus. All Rights Reserved.

<br><br>

<a
href="${WEBSITE}"
target="_blank"
rel="noopener noreferrer"
style="
color:#5F39FF;
text-decoration:none;
margin:0 8px;
">

Website

</a>

|

<a
href="${FACEBOOK}"
target="_blank"
rel="noopener noreferrer"
style="
color:#5F39FF;
text-decoration:none;
margin:0 8px;
">

Facebook

</a>

|

<a
href="${INSTAGRAM}"
target="_blank"
rel="noopener noreferrer"
style="
color:#5F39FF;
text-decoration:none;
margin:0 8px;
">

Instagram

</a>

|

<a
href="${LINKEDIN}"
target="_blank"
rel="noopener noreferrer"
style="
color:#5F39FF;
text-decoration:none;
margin:0 8px;
">

LinkedIn

</a>

|

<a
href="${X}"
target="_blank"
rel="noopener noreferrer"
style="
color:#5F39FF;
text-decoration:none;
margin:0 8px;
">

X

</a>

|

<a
href="${YOUTUBE}"
target="_blank"
rel="noopener noreferrer"
style="
color:#5F39FF;
text-decoration:none;
margin:0 8px;
">

YouTube

</a>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
`;

};

module.exports = baseTemplate;