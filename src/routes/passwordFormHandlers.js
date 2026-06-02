const path = require('path');
const fs = require('fs');

const htmlPath = path.join(process.cwd(), 'public', 'auth', 'password-form.html');
const htmlTemplate = fs.readFileSync(htmlPath, 'utf8');

/**
 * Serves the standalone password HTML page (invite or reset).
 * Mounted under /api/v1/auth/* so BigRock/nginx proxies to Node (Flutter owns /set-password at site root).
 */
function servePasswordPage(purpose) {
  return (_req, res) => {
    res
      .type('html')
      .send(htmlTemplate.replace('data-purpose="invite"', `data-purpose="${purpose}"`));
  };
}

module.exports = { servePasswordPage };
