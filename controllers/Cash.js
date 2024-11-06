const Cash = require("../models/Cash"); 
const Order = require("../models/Order"); 

exports.addCash = (req, res) => {
  
    console.log(req.body); 
  
    Order.findOne({_id: req.body._id}).then((order) => {
      
      const newCash = new Cash({
        
          amount: req.body.amount, 
          rec_id: order.rec_id, 
          agent_id: order.agent_id, 
          agg_id: order.agg_id, 
          author_id: req.auth.userId,
          date: new Date(), 
          order_id: req.body._id, 
          phone: order.phone
        
      }); 
      
        newCash.save().then(async () => {
          
          await Order.updateOne({_id: req.body._id }, {$set: {rest: order.rest &&  order.rest !== 0 ?  parseInt(order.rest) - parseInt(req.body.amount) : parseInt(order.amount) - parseInt(req.body.amount) , read: true, message: order.message ? order.message+" et une remise d'argent en espèces de "+ req.body.amount +" Fcfa ": "Remise en espèces de "+req.body.amount+" Fcfa"}}); 
          
          res.status(201).json({status: 0,  message: order.message ? order.message+" et une remise d'argent en espèces de "+ req.body.amount +" Fcfa ": "Remise en espèces de "+req.body.amount+" Fcfa"}); 
          
          
            
        }, (err) => {
          
            console.log(err); 
            
        })
        
    }, (err) => {
      
        console.log(err); 
        
    })
  
}