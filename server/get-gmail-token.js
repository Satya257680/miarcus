const fs = require("fs");
const { google } = require("googleapis");

const credentials = JSON.parse(
  fs.readFileSync("./credentials.json", "utf8")
);

const { client_id, client_secret, redirect_uris } = credentials.installed;

const REDIRECT_URI = redirect_uris[0];

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  REDIRECT_URI
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
console.log("OPEN THIS URL IN GOOGLE CHROME:");
console.log("========================================\n");

console.log(authUrl);

console.log("\n========================================");
console.log("After Google authorization:");
console.log("Copy the FULL URL from the browser address bar.");
console.log("It will start with:");
console.log("http://localhost/?code=...");
console.log("========================================\n");

process.stdin.setEncoding("utf8");

process.stdin.once("data", async (input) => {
  const url = input.trim();

  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get("code");

    if (!code) {
      throw new Error("Authorization code not found in the URL.");
    }

    const { tokens } = await oauth2Client.getToken(code);

    console.log("\n========================================");
    console.log("SUCCESS!");
    console.log("========================================\n");

    console.log("Refresh Token:");
    console.log(tokens.refresh_token);

    console.log("\nAccess Token:");
    console.log(tokens.access_token);

    fs.writeFileSync(
      "./gmail-token.json",
      JSON.stringify(tokens, null, 2)
    );

    console.log("\nSaved to:");
    console.log("./gmail-token.json");
  } catch (error) {
    console.error("\nERROR:");
    console.error(error.response?.data || error.message);
  }

  process.exit(0);
});