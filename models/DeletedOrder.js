const mongoose = require("mongoose");

const DeletedorderSchema = mongoose.Schema({
  
    amount: {type: Number}, 
    agent_id: {type: String}, 
    rec_id: {type: String}, 
    agg_id: {type: String}, 
    type: {type: String}, 
    date: {type: Date}, 
    phone: {type: String}, 
    deleter_id: {type: String}, 
    deleted_date: {type: Date},
    use: {type: String}
})

module.exports = mongoose.model("Deletedorder", DeletedorderSchema);