const express =
require('express');

const router =
express.Router();

const {
    checkLimit
} = require(
'../controllers/limiter.controller'
);

router.post(
    '/check',
    checkLimit
);

module.exports = router;