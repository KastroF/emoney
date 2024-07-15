const mongoose = require("mongoose"); 

const serviceSchema = mongoose.Schema({
  
    name: {type: String}, 
    status: {type: Boolean}, 
    lastChange: {type: Date}
})

module.exports = mongoose.model("Service", serviceSchema); 