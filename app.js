const express = require("express");
const limiterRoutes = require("./src/routes/limiter.routes");
const adminRoutes = require("./src/routes/admin.routes");
const app = express();
app.use(express.json());


app.get("/",(req,res) => {
    res.status(200).json({
        message : "Server is Running..."
    });
});

app.get('/health',(req,res)=> {
    res.status(200).json({
        status:"ok",
        service:"RateShield"
    });
});
app.use("/api/v1", limiterRoutes);
app.use("/api/v1/admin", adminRoutes);
module.exports = app;