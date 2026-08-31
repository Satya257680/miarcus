const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const fs = require("fs");

const credentials = require("./credentials.json");

const installed = credentials.installed || credentials.web;

const oauth2Client = new google.auth.OAuth2(
  installed.client_id,
  installed.client_secret,
  "http://localhost"
);

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send"
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent"
});

console.log("\n========================================");
console.log("OPEN THIS URL IN YOUR BROWSER:");
console.log("========================================\n");
console.log(authUrl);
console.log("\n========================================");
console.log("Waiting for Google OAuth callback...");
console.log("========================================\n");

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (!parsedUrl.query.code) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h2>Waiting for Google OAuth...</h2>");
    return;
  }

  try {
    const { code } = parsedUrl.query;

    const { tokens } = await oauth2Client.getToken(code);

    console.log("\n========================================");
    console.log("SUCCESS!");
    console.log("========================================\n");

    console.log("Refresh Token:");
    console.log(tokens.refresh_token);

    fs.writeFileSync(
      "./gmail-token.json",
      JSON.stringify(tokens, null, 2)
    );

    console.log("\nSaved to:");
    console.log("server/gmail-token.json");

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <h2>Google authorization successful ✅</h2>
      <p>You can close this window and return to VS Code.</p>
    `);

    setTimeout(() => {
      server.close();
    }, 1000);

  } catch (error) {
    console.error("\nOAuth error:");
    console.error(error.response?.data || error.message);

    res.writeHead(500, { "Content-Type": "text/html" });
    res.end("<h2>OAuth failed. Check VS Code terminal.</h2>");
  }
});

server.listen(80, "127.0.0.1", () => {
  console.log("Local OAuth server running on http://localhost/");
});