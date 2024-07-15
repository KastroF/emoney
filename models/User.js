const mongoose = require("mongoose"); 

const userSchema = mongoose.Schema({
    
    name: {type: String}, 
    phone: {type: String}, 
    password: {type: String}, 
    amPhone: {type: String}, 
    amPin: {type: String}, 
    mmPhone: {type: String}, 
    mmPin: {type: String}, 
    flashPhone: {type: String},
    flashPin: {type: String},
    expressPhone: {type: String},
    expressPin: {type: String},
    services: {type: Array}, 
    active: {type: Boolean}, 
    profile: {type: String}, 
    street: {type: String},
    date: {type: Date}, 
    status: {type: String}, 
    agg_id: {type: String}, 
    rec_id: {type: String}, 
    recouvreurs: {type: Number}, 
    pos: {type: Number}, 
    locked: {type: String}, 
    time: {type: Number}, 
    amount: {type: Number}, 
    amBalance: {type: Number},
    mmBalance: {type: Number},
    flashBalance: {type: Number},
    expressBalance: {type: Number}
  
})

module.exports = mongoose.model("User", userSchema);