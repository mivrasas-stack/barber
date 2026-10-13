-- Token Bucket Rate Limiting Script for Redis
-- Keys:
--   KEYS[1]: rate limit key, e.g. bp:rl:v1:{policy}:{hashedIdentity}
-- Arguments:
--   ARGV[1]: capacity (number, maximum tokens)
--   ARGV[2]: refillRatePerSec (number, tokens added per second)
--   ARGV[3]: cost (number, tokens requested to consume)
--   ARGV[4]: nowMs (number, current timestamp in ms, optional)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRatePerSec = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local nowMs = tonumber(ARGV[4])

if not nowMs or nowMs == 0 then
  local time = redis.call('TIME')
  nowMs = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
end

-- Read current token state
local data = redis.call('HMGET', key, 'tokens', 'lastRefillMs')
local tokens = tonumber(data[1])
local lastRefillMs = tonumber(data[2])

if not tokens or not lastRefillMs then
  -- First invocation: start full at capacity
  tokens = capacity
  lastRefillMs = nowMs
else
  -- Calculate elapsed milliseconds and add refilled tokens
  local elapsedMs = math.max(0, nowMs - lastRefillMs)
  if elapsedMs > 0 and refillRatePerSec > 0 then
    local tokensToAdd = (elapsedMs / 1000.0) * refillRatePerSec
    tokens = math.min(capacity, tokens + tokensToAdd)
    lastRefillMs = nowMs
  end
end

local allowed = 0
local remaining = 0
local retryAfterMs = 0

if tokens >= cost then
  allowed = 1
  tokens = tokens - cost
  remaining = math.floor(tokens)
  retryAfterMs = 0
else
  allowed = 0
  remaining = math.floor(tokens)
  local deficit = cost - tokens
  if refillRatePerSec > 0 then
    retryAfterMs = math.ceil((deficit / refillRatePerSec) * 1000)
  else
    retryAfterMs = 3600000 -- 1 hour if refill rate is 0
  end
end

-- Dynamic TTL: enough time for bucket to refill back to capacity, minimum 60 seconds
local ttlSec = 60
if refillRatePerSec > 0 then
  local timeToFullSec = math.ceil(capacity / refillRatePerSec)
  ttlSec = math.max(60, timeToFullSec * 2)
end

redis.call('HMSET', key, 'tokens', tostring(tokens), 'lastRefillMs', tostring(lastRefillMs))
redis.call('EXPIRE', key, ttlSec)

return { allowed, tostring(tokens), tostring(remaining), retryAfterMs, ttlSec }
