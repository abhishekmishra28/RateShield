/**
 * k6 Load Test: RateShield Rate Limiter
 *
 * Simulates realistic traffic patterns to validate:
 * - Throughput under load
 * - Latency percentiles
 * - Rate limiting accuracy
 * - Error rates
 *
 * Usage:
 *   k6 run src/tests/load/rateLimitLoad.js
 *
 * Prerequisites:
 *   - RateShield running at http://localhost:5000
 *   - A client created with a known API key
 *
 * Expected Results:
 *   - p95 latency < 100ms (Redis-backed operations are fast)
 *   - Error rate < 1% (only rate-limited 429s, no 5xx)
 *   - Rate limiting kicks in after burst capacity is exhausted
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// ─── Custom Metrics ─────────────────────────────────────

const rateLimitedRate = new Rate('rate_limited');
const allowedCounter = new Counter('allowed_requests');
const rejectedCounter = new Counter('rejected_requests');
const latencyTrend = new Trend('check_latency', true);

// ─── Test Configuration ─────────────────────────────────

export const options = {
  scenarios: {
    // Scenario 1: Ramp up traffic
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 20 },   // Ramp up to 20 VUs
        { duration: '30s', target: 50 },   // Ramp to 50 VUs
        { duration: '1m', target: 100 },   // Hold at 100 VUs
        { duration: '15s', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<100'],       // 95th percentile < 100ms
    http_req_failed: ['rate<0.01'],         // Less than 1% non-429 failures
    rate_limited: ['rate<0.80'],            // Rate limiting should cap at 80%
  },
};

// ─── Configuration ──────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API_KEY = __ENV.API_KEY || 'your-test-api-key-here';

// ─── Test Execution ─────────────────────────────────────

export default function () {
  const res = http.post(
    `${BASE_URL}/api/v1/check`,
    null,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      tags: { name: 'rate_limit_check' },
    }
  );

  // Track custom metrics
  latencyTrend.add(res.timings.duration);

  const isAllowed = res.status === 200;
  const isRateLimited = res.status === 429;

  if (isAllowed) {
    allowedCounter.add(1);
  }

  if (isRateLimited) {
    rejectedCounter.add(1);
  }

  rateLimitedRate.add(isRateLimited);

  // Verify response structure
  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'response has success field': (r) => {
      const body = JSON.parse(r.body);
      return body.success !== undefined;
    },
    'has rate limit headers': (r) => {
      return r.headers['X-Ratelimit-Limit'] !== undefined ||
             r.headers['x-ratelimit-limit'] !== undefined;
    },
    'has retry-after on 429': (r) => {
      if (r.status === 429) {
        return r.headers['Retry-After'] !== undefined ||
               r.headers['retry-after'] !== undefined;
      }
      return true;
    },
  });

  // Small random sleep to simulate realistic traffic
  sleep(Math.random() * 0.1);
}

// ─── Test Summary ───────────────────────────────────────

export function handleSummary(data) {
  const summary = {
    'Total Requests': data.metrics.http_reqs.values.count,
    'Allowed Requests': data.metrics.allowed_requests ? data.metrics.allowed_requests.values.count : 0,
    'Rejected Requests': data.metrics.rejected_requests ? data.metrics.rejected_requests.values.count : 0,
    'Avg Latency': `${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`,
    'p95 Latency': `${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`,
    'p99 Latency': `${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`,
  };

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     RateShield Load Test Results      ║');
  console.log('╠══════════════════════════════════════╣');
  Object.entries(summary).forEach(([key, value]) => {
    console.log(`║ ${key.padEnd(20)} │ ${String(value).padStart(14)} ║`);
  });
  console.log('╚══════════════════════════════════════╝\n');

  return {
    stdout: JSON.stringify(summary, null, 2),
  };
}
