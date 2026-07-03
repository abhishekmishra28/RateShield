--[[
  Token Bucket Algorithm - Redis Lua Script
  
  Implements an atomic token bucket rate limiter.
  
  WHY LUA?
  Without Lua, the token bucket requires multiple Redis commands:
    1. HGETALL (read current state)
    2. Calculate refill
    3. Check if tokens available
    4. HSET (update state)
  
  Between steps 1 and 4, another request could read the same state,
  causing a race condition where both requests consume the same token.
  
  Lua scripts execute atomically on the Redis server — no other command
  can interleave. This guarantees exactly-once token consumption.
  
  KEYS[1] = bucket key (e.g., "rateshield:bucket:{clientId}")
  ARGV[1] = capacity (burst size)
  ARGV[2] = refill rate (tokens per second)
  ARGV[3] = current timestamp (seconds, float)
  
  Returns: { allowed (0/1), remaining tokens, retry_after (seconds) }
]]

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Get current bucket state
local tokens = tonumber(redis.call('HGET', key, 'tokens'))
local lastRefill = tonumber(redis.call('HGET', key, 'lastRefill'))

-- Initialize bucket if it doesn't exist
if tokens == nil then
  tokens = capacity
  lastRefill = now
end

-- Calculate token refill (lazy refill)
local elapsed = now - lastRefill
local tokensToAdd = elapsed * refillRate
tokens = math.min(capacity, tokens + tokensToAdd)
lastRefill = now

-- Attempt to consume one token
local allowed = 0
local retryAfter = 0

if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  -- Calculate how long until 1 token is available
  retryAfter = (1 - tokens) / refillRate
end

-- Persist state
redis.call('HSET', key, 'tokens', tostring(tokens), 'lastRefill', tostring(lastRefill))

-- Set TTL: enough time for full bucket refill + buffer
local ttl = math.ceil(capacity / refillRate) * 2
if ttl < 60 then ttl = 60 end
redis.call('EXPIRE', key, ttl)

return { allowed, math.floor(tokens), tostring(retryAfter) }
