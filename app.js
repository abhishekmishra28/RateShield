const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { swaggerDefinition } = require('./src/config/swagger.config');
const { requestLogger } = require('./src/middleware/requestLogger.middleware');
const { errorHandler } = require('./src/middleware/errorHandler.middleware');
const limiterRoutes = require('./src/routes/limiter.routes');
const adminRoutes = require('./src/routes/admin.routes');

const app = express();

// ─── Global Middleware ──────────────────────────────────

app.use(express.json());
app.use(requestLogger);

// ─── Swagger Documentation ─────────────────────────────

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'RateShield API Docs',
}));

// ─── Health Check ───────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'RateShield',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ─────────────────────────────────────────

app.use('/api/v1', limiterRoutes);
app.use('/api/v1/admin', adminRoutes);

// ─── 404 Handler ────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
});

// ─── Global Error Handler (must be last) ────────────────

app.use(errorHandler);

module.exports = app;