const router = require('express').Router();
const { adminAuth } = require('../middleware/adminAuth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createClientSchema,
  updateClientSchema,
  clientIdParamSchema,
  clientIdParamSchemaAlt,
  listClientsQuerySchema,
} = require('../validators/client.validator');

const adminController = require('../controllers/admin.controller');
const analyticsController = require('../controllers/analytics.controller');

// All admin routes require admin authentication
router.use(adminAuth);

// ─── Client CRUD ────────────────────────────────────────

router.post(
  '/clients',
  validate(createClientSchema, 'body'),
  adminController.createClient
);

router.get(
  '/clients',
  validate(listClientsQuerySchema, 'query'),
  adminController.listClients
);

router.get(
  '/clients/:id',
  validate(clientIdParamSchema, 'params'),
  adminController.getClient
);

router.put(
  '/clients/:id',
  validate(clientIdParamSchema, 'params'),
  validate(updateClientSchema, 'body'),
  adminController.updateClient
);

router.delete(
  '/clients/:id',
  validate(clientIdParamSchema, 'params'),
  adminController.deleteClient
);

// ─── Analytics ──────────────────────────────────────────

router.get('/analytics', analyticsController.getGlobalAnalytics);

router.get(
  '/analytics/:clientId',
  validate(clientIdParamSchemaAlt, 'params'),
  analyticsController.getClientAnalytics
);

router.delete(
  '/analytics/:clientId',
  validate(clientIdParamSchemaAlt, 'params'),
  analyticsController.resetClientAnalytics
);

module.exports = router;