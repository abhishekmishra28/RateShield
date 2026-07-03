--[[
  Sliding Window Log Algorithm - Redis Lua Script
  
  Implements an atomic sliding window rate limiter using sorted sets.
  
  Each request is stored as a member in a sorted set with the timestamp
  as the score. To check if a request is allowed:
    1. Remove all entries outside the current window
    2. Count remaining entries
    3. If count < maxRequests, add the new entry
  
  WHY LUA?
  Same as token bucket — without atomicity, two concurrent requests
  could both count N entries, both add one, resulting in N+2 entries
  when only N+1 should be allowed. Lua ensures the entire
  remove-count-add operation is atomic.
  
  KEYS[1] = window key (e.g., "rateshield:window:{clientId}")
  ARGV[1] = window size in seconds
  ARGV[2] = max requests allowed per window
  ARGV[3] = current timestamp (seconds, float)
  ARGV[4] = unique request ID (for sorted set member uniqueness)
  
  Returns: { allowed (0/1), remaining requests, retry_after (seconds) }
]]

local key = KEYS[1]
local windowSize = tonumber(ARGV[1])
local maxRequests = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requestId = ARGV[4]

-- Calculate window boundaries
local windowStart = now - windowSize

-- Remove all entries outside the current window
redis.call('ZREMRANGEBYSCORE', key, '-inf', tostring(windowStart))

-- Count current requests in window
local currentCount = redis.call('ZCARD', key)

local allowed = 0
local remaining = maxRequests - currentCount
local retryAfter = 0

if currentCount < maxRequests then
  -- Add new request with timestamp as score
  redis.call('ZADD', key, tostring(now), requestId)
  allowed = 1
  remaining = remaining - 1
else
  -- Calculate when the oldest entry will expire
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  if #oldest >= 2 then
    local oldestTime = tonumber(oldest[2])
    retryAfter = (oldestTime + windowSize) - now
    if retryAfter < 0 then retryAfter = 0 end
  end
end

-- Set TTL slightly beyond window size for cleanup
redis.call('EXPIRE', key, windowSize + 60)

return { allowed, remaining, tostring(retryAfter) }
