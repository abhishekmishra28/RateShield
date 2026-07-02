const TokenBucket  = require("../src/services/tokenBucket.service");
const bucket = new TokenBucket(10,2);
setInterval(()=>{
    console.log(
        "Allowed:",
        bucket.consume(),
        "Remaining:",bucket.tokens
    );
},300);