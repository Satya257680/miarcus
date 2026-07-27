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

    return `
<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">

<meta name="viewport" content="width=device-width, initial-scale=1.0">

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
background:#6C63FF;
">

<a
href="${process.env.FRONTEND_URL || "#"}"
target="_blank"
rel="noopener noreferrer"
style="
display:inline-block;
text-decoration:none;
">

<img
src="cid:miarcus-logo"
alt="miarcus"
style="
max-width:180px;
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

miarcus Team

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

<a
href="https://www.facebook.com/"
target="_blank"
rel="noopener noreferrer"
style="display:inline-block;margin:0 8px;">

<img
src="cid:facebook-icon"
width="40"
alt="Facebook"
style="
display:block;
border:0;
outline:none;
text-decoration:none;
">

</a>

<a
href="https://www.linkedin.com/"
target="_blank"
rel="noopener noreferrer"
style="display:inline-block;margin:0 8px;">

<img
src="cid:linkedin-icon"
width="40"
alt="LinkedIn"
style="
display:block;
border:0;
outline:none;
text-decoration:none;
">

</a>
<a
href="https://x.com/"
target="_blank"
rel="noopener noreferrer"
style="display:inline-block;margin:0 8px;">

<img
src="cid:x-icon"
width="40"
alt="X"
style="
display:block;
border:0;
outline:none;
text-decoration:none;
">

</a>

<a
href="https://www.instagram.com/"
target="_blank"
rel="noopener noreferrer"
style="display:inline-block;margin:0 8px;">

<img
src="cid:instagram-icon"
width="40"
alt="Instagram"
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

Please contact your administrator if you have any questions regarding your account.

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

© ${new Date().getFullYear()} miarcus. All Rights Reserved.

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