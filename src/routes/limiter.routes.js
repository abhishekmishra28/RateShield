const router = require('express').Router();
const { apiKeyAuth } = require('../middleware/apiKeyAuth.middleware');
const { checkLimit } = require('../controllers/limiter.controller');

// Rate limit check — requires valid client API key
router.post('/check', apiKeyAuth, checkLimit);

module.exports = router;