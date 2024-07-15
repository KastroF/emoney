const Cash = require("../models/Cash"); 
const Order = require("../models/Order"); 

exports.addCash = (req, res) => {
  
    console.log(req.body); 
  
    Order.findOne({_id: req.body._id}).then((order) => {
      
      const newCash = new Cash({
        
          amount: order.rest && order.rest > 0 ? order.rest : order.amount, 
          rec_id: order.rec_id, 
          agent_id: order.agent_id, 
          agg_id: order.agg_id, 
          author_id: req.auth.userId,
          date: new Date(), 
          order_id: req.body._id, 
          phone: order.phone
        
      }); 
      
        newCash.save().then(async () => {
          
          await Order.updateOne({_id: req.body._id }, {$set: {rest: 0, read: true, message: order.message ? order.message+" et une remise d'argent en espèces de "+order.rest +" Fcfa ": "Remise en espèces de "+order.amount+" Fcfa"}}); 
          
          res.status(201).json({status: 0}); 
          
          
            
        }, (err) => {
          
            console.log(err); 
            
        })
        
    }, (err) => {
      
        console.log(err); 
        
    })
  
}