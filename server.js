const express = require("express");
const dbConnect = require("./config/database");
const app = express();

require("dotenv").config()

const PORT = process.env.PORT || 5000;

// adding middlewares


// adding routes


// strat the server 
app.listen(PORT , ()=>{
    console.log(`Server is Started at ${PORT}`)
})

dbConnect();