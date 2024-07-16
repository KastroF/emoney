const User = require("../models/User"); 
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');

const bcrypt = require("bcrypt"); 




exports.addUser = (req, res) => {
  
  User.findOne({phone: req.body.phone}).then((user) => {
    
    if(user){
      
      res.status(200).json({status: 1, message: "Numéro de téléphone déjà utilisé"});
        
    }else{
      
     // console.log("C'est chaud");
      
        bcrypt.hash(req.body.password, 10).then(async (hash) => {
          
          let userr; 
          
          console.log(req.body.phone[1]);
          
          if(req.body.phone[1] == "7"){
            
             userr = new User({
              phone: req.body.phone, 
              name: req.body.name, 
              password: hash, 
              amPhone: req.body.phone, 
              amPin: req.body.password, 
              profile: "agg", 
              active: true, 
              services: ["am"], 
              date: new Date(), 
              status:"agg"
              
          })
              
          
          }else{
            
             userr = new User({
              phone: req.body.phone, 
              name: req.body.name, 
              password: hash, 
              mmPhone: req.body.phone, 
              mmPin: req.body.password,
              active: true, 
              services: ['mm'], 
              profile: "agg", 
              date: new Date(), 
              status: "agg"
               
              
              
          }); 
            
          }
          
         
          userr.save().then((uss) => {
            
    
            
              res.status(201).json({status: 0, message: "Utilisateur ajouté avec succès", token: jwt.sign(
                {userId: uss._id}, 
                 "JxqKuulLNPCNfytiyqtsygygfRJYTjnju8u9yup8y89pjgkbhilaebAqetflqRfhhouhpb"
                
          ), user: uss});
            
              
          }, (err) => {
            
              console.log(err);
              res.status(505).json({err});
          })
          
          
          
        
          
        }, (err) => {
          
          console.log(err);
    
      res.status(505).json({err})
  })
      
      
    }
      
  }, (err) => {
    
      res.status(505).json({err})
  })
    
}

exports.getUser = (req, res) => {
  
    //, user: {name: uss.name, amPhone: uss.amPhone, amPin: uss.amPin, mmPhone: uss.mmPhone, mmPin: uss.mmPin, services: uss.services}
  
  
  
  
    User.aggregate([
      
      

      {
        $facet: {
          'user': [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", {$toObjectId: req.auth.userId}]
                }
              }
            }
          ], 
          "recs": [
            {
              $match :{
                $and : [
                  {agg_id: req.auth.userId}, 
                  {status: "rec"}
                ]
              }
            }, 
            {
              $count: "totalRecs"
            }
          ], 
          "pos": [
            {
              $match :{
                $and : [
                  {$or:[{agg_id: req.auth.userId}, {rec_id: req.auth.userId}]}, 
                  {status: "pos"}
                ]
              }
            }, 
             {
              $count: "totalPos"
            }
          ]
        }
      }
    ]).then((result) => {
      
             // delete uss._id;
      
      console.log(result[0]);
      const user = result[0].user[0]; 
      user.recouvreurs = result[0].recs.length > 0 ? result[0].recs[0].totalRecs : 0
      user.pos = result[0].pos.length > 0 ? result[0].pos[0].totalPos : 0
      
    
      
        res.status(200).json({status: 0, user})
        
    }, (err) => {
      
        res.status(505).json({err})
    })
  

}

exports.login = (req, res) => {
  
    console.log(req.body);
  
    User.findOne({phone: req.body.phone}).then((user) => {
      
      if(!user || (user && !user.active)){
        
        res.status(200).json({status: 1, message: "Utilisateur non trouvé ou désactivé"}); 
        
          
      }else{
          
       
        bcrypt.compare( req.body.password, user.password).then((valid) => {
          
            if(valid){
              
         
              
              User.aggregate([
                {
                  $match: {
                     $or:[{agg_id: user._id.toString()}, {rec_id: user._id.toString()}]
                  }
                }, 
                
                {
                  $facet: {
                    "recouvreurs" : [
                      {
                        $match: {
                          status: "rec"
                        }
                      }, 
                      {
                        $count: "totalRecs"
                      }
                    ], 
                    "pos" : [
                      {
                        $match: {
                          status: "pos"
                        }
                      }, 
                      {
                        $count: "totalPos"
                      }
                    ]
                  }
                }
              ]).then((result) => {
                
                console.log(result[0])
                
                user.pos = result[0].pos.length > 0 ? result[0].pos[0].totalPos : 0; 
                user.recouvreurs = result[0].recouvreurs.length > 0 ? result[0].recouvreurs[0].totalRecs : 0; 
                  
               res.status(201).json({status: 0, message: "Connexion effectuée avec succès", token: jwt.sign(
                {userId: user._id}, 
                 "JxqKuulLNPCNfytiyqtsygygfRJYTjnju8u9yup8y89pjgkbhilaebAqetflqRfhhouhpb"
                
          ),user});
              
              }, (err) => {
    
                  res.status(505).json({err})
              })
              
               
                
            }else{
              
                res.status(200).json({status: 1, message: "Mot de passe incorrect"})
            }
        })
        
      }
        
    }, (err) => {
    
      res.status(505).json({err})
  })
}

exports.updateService = async (req, res) => {
  
    let champ; 
  
    console.log(req.body)
  
    if(req.body.service == "am"){
      
      if(req.body.services.find(item => item == 'am') == "am"){
        
       const hash = await bcrypt.hash(req.body.password, 10); 
        
          champ = {amPin: req.body.password, password: hash}
            
     
          
      }else{
        
         champ = {amPin: req.body.password}
          
      }
      
     
    
    }else if(req.body.service == "mm"){
      
       if(req.body.services.find(item => item == "mm") == "mm"){
        
        const hash = await bcrypt.hash(req.body.password, 10); 
          
          champ = {mmPin: req.body.password, password: hash}
            
   
          
      }else{
        
         champ = {amPin: req.body.password}
          
      }
    
    }else if(req.body.service === "flash"){
      
      champ = {flashPin: req.body.password}
    
    }else if(req.body.service === "express"){
      
      champ = {expressPin: req.body.password}
    
    }
  
    User.updateOne({_id: req.auth.userId}, {$set: champ}).then(async () => {
      
      const uss = await User.findOne({_id: req.auth.userId}); 
        
      res.status(201).json({status: 0, message: "Changement effectué avec succès", user:  {name: uss.name, amPhone: uss.amPhone, amPin: uss.amPin, mmPhone: uss.mmPhone, mmPin: uss.mmPin, services: uss.services} }); 
      
      
      
    }, (err) => {
      
        res.status(505).json({err})
    })
}


exports.addService = async (req, res) => {
  
   const user =  await User.findOne({_id: req.auth.userId}); 
  
  console.log(user);
  
  let services = user.services
  
    let update = {}; 
  
    if(req.body.amPhone){
        
        services = [...services, "am"];
        update = {...update, amPhone: req.body.amPhone, amPin: req.body.amPin, services}; 
        
    }
  
     if(req.body.mmPhone){
       
       
        services = [...services, "mm"];
        update = {...update, mmPhone: req.body.mmPhone, mmPin: req.body.mmPin, services}
        
    }
  
     if(req.body.flashPhone){
        
        services = [...services, "flash"];
        update = {...update, flashPhone: req.body.flashPhone, flashPin: req.body.flashPin, services}; 
       
    }
  
   if(req.body.expressPhone){
      
         services = [...services, "express"];
        update = {...update, expressPhone: req.body.expressPhone, expressPin: req.body.expressPin, services}; 
        
    }
  
  User.updateOne({_id: req.auth.userId}, {$set: update}).then(async () => {
    
    const user = await User.findOne({_id: req.auth.userId}); 
    delete user._id
    
    res.status(201).json({status: 0, message: "Modification effectuée avec succès", user});
      
  }, (err) => {
    
      res.status(505).json({err})
  })
  
    
  
  
}



