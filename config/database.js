const mongoose = require("mongoose")

function dbConnect(){
    mongoose.connect(process.env.dbURL , {

    })

    try{
        console.log("The database is connected");
    }

    catch(error){

        console.log(error);


    }
}

module.exports = dbConnect;