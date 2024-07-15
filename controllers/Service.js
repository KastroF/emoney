const Service = require("../models/Service")

exports.getServiceStatus = (req, res) => {
  
    Service.findOne({name: req.body.name}).then((service) => {
      
      res.status(200).json({status: 0, service});
        
    }, (err) => {
      
        console.log(err); 
        res.status(505).json({err})
    })
}