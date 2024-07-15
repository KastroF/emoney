const Code = require("../models/Code"); 

exports.addCode = (req, res) => {
  
  const code = new Code({
      value: req.body.code
  })
    
  code.save().then(() => {
    
    console.log("Code ajouté avec succès");
    
    res.status(201).json({status: 0});
      
  }, (err) => {
    
      console.log(err); 
    res.status(505).json({err})
  })
}

exports.getCode = (req, res) => {
  
    Code.find().then((codes) => {
      
      res.status(201).json({code: codes[0].value, status: 0});
        
    }, (err) => {
      
        res.status(505).json({err})
    })
}