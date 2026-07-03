require('dotenv').config();

const app = require('./app');
const { env } = require('./src/config/env.config');
const { connectRedis, disconnectRedis } = require('./src/config/redis.config');
const prisma = require('./src/config/prisma');
const { logger } = require('./src/config/logger.config');

async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    logger.info('Redis connection established');

    // Verify PostgreSQL connection
    await prisma.$connect();
    logger.info('PostgreSQL connection established');

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
      logger.info(`🛡️  RateShield running on port ${env.PORT}`);
      logger.info(`📚 API Docs: http://localhost:${env.PORT}/api-docs`);
      logger.info(`🏥 Health:   http://localhost:${env.PORT}/health`);
    });

    // ─── Graceful Shutdown ────────────────────────────────

    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectRedis();
          await prisma.$disconnect();
          logger.info('All connections closed. Goodbye.');
          process.exit(0);
        } catch (error) {
          logger.error({ err: error }, 'Error during shutdown');
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // ─── Unhandled Errors ─────────────────────────────────

    process.on('unhandledRejection', (reason) => {
      logger.fatal({ err: reason }, 'Unhandled Promise Rejection');
      process.exit(1);
    });

    process.on('uncaughtException', (error) => {
      logger.fatal({ err: error }, 'Uncaught Exception');
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();