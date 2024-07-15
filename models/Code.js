const mongoose = require("mongoose"); 

const codeSchema = mongoose.Schema({
    
    value: {type: String}
})

module.exports = mongoose.model("Code", codeSchema); 