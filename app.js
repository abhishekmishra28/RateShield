const express = require("express");
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

module.exports = app;