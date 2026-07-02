const TokenBucket = require('./tokenBucket.service');

const buckets = new Map();

function getBucket(clientKey) {
    if (!buckets.has(clientKey)) {
        buckets.set(
            clientKey,
            new TokenBucket(10, 5)
        );
    }

    return buckets.get(clientKey);
}

module.exports = {
    getBucket
};