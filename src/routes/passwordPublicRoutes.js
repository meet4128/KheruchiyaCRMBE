const path = require('path');
const express = require('express');
const fs = require('fs');

const router = express.Router();
const htmlPath = path.join(process.cwd(), 'public', 'auth', 'password-form.html');
const htmlTemplate = fs.readFileSync(htmlPath, 'utf8');

function servePasswordPage(purpose) {
  return (_req, res) => {
    res
      .type('html')
      .send(htmlTemplate.replace('data-purpose="invite"', `data-purpose="${purpose}"`));
  };
}

router.get('/set-password', servePasswordPage('invite'));
router.get('/reset-password', servePasswordPage('reset'));

module.exports = router;
