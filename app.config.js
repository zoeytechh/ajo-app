const fs = require('fs');
const path = require('path');

// In EAS builds, google-services.json is not in git.
// Decode it from the base64 env var so Expo can find it.
if (process.env.GOOGLE_SERVICES_JSON_BASE64) {
  fs.writeFileSync(
    path.join(__dirname, 'google-services.json'),
    Buffer.from(process.env.GOOGLE_SERVICES_JSON_BASE64, 'base64').toString('utf-8'),
  );
}

module.exports = ({ config }) => config;
