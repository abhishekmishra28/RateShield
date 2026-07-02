class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;
        this.refillRate = refillRate;
        this.tokens = capacity;
        this.lastRefillTime = Date.now();
    }
    refill(){
        const now = Date.now();
        const elapsedTime = (now - this.lastRefillTime) / 1000;
        const tokensToAdd = elapsedTime * this.refillRate;
        this.tokens = Math.min(
            this.capacity,
            this.tokens + tokensToAdd
        );
        this.lastRefillTime = now;
    }
    
    consume(){
        this.refill();
        if(this.tokens >= 1){
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

module.exports = TokenBucket;