const mongoose = require("mongoose"); 

const cashSchema = mongoose.Schema({
  
    amount: {type: Number}, 
    order_id: {type: String}, 
    rec_id: {type: String},
    agent_id: {type: String}, 
    agg_id: {type: String},
    author_id: {type: String},
    date: {type: Date}, 
    phone: {type: String}, 
  
})


module.exports = mongoose.model("Cash", cashSchema);