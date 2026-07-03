// Test environment setup
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/rateshield_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.ADMIN_API_KEY = 'test_admin_key_12345';
process.env.LOG_LEVEL = 'silent';
