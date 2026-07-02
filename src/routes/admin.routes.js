const router =
require("express").Router();

const {
  registerClient
} = require(
  "../controllers/admin.controller"
);

router.post(
  "/clients",
  registerClient
);

module.exports = router;