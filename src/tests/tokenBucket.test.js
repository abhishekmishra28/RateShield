const TokenBucket = require("../services/tokenBucket.service");
const bucket = new TokenBucket(5,1);
for(let i=1;i<=7;i++){
    console.log(
        `Request ${i} : `,
        bucket.consume()
    );
}