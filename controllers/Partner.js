const User = require("../models/User");
const bcrypt = require("bcrypt"); 



exports.addPartner = (req, res) => {
  
    let newUser; 
  
  
    
  
    User.findOne({phone: req.body.phone}).then((user) => {
      
      if(user){
        
        res.status(200).json({status: 1, message: "Numéro de téléphone déjà enregistré"}); 
          
      }else{
        
        
        bcrypt.hash(req.body.password, 10).then((hash) => {
      
       if(req.body.status == "rec"){
      
          newUser = new User({
              name: req.body.name, 
              phone: req.body.phone, 
              status: "rec", 
              street: req.body.street, 
              password: hash, 
              active: true, 
              date: new Date(), 
              agg_id: req.auth.userId

          })
     
       
       }else{
         
         console.log(req.body);
         
           newUser = new User({
              name: req.body.name, 
              phone: req.body.phone, 
              status: "pos", 
              street: req.body.street, 
              password: hash, 
              active: true, 
              date: new Date(), 
              agg_id: req.auth.userId, 
              rec_id: req.body.recId, 
              time: req.body.time, 
              amount: req.body.amount, 
              amPhone: req.body.amPhone, 
              mmPhone: req.body.mmPhone, 
              flashPhone: req.body.flashPhone, 
              expressPhone: req.body.expressPhone

          })
         
       }
          
          
       newUser.save().then(() => {
         
           console.log("c'est Ok");
           
           res.status(201).json({status: 0, message: "Partenaire ajouté avec succès"});
           
             
         }, (err) => {
             
            console.log(err);
            res.status(500).json({err})
             
         })
      
        
    }, (err) => {
      
        
        console.log(err);
        res.status(500).json({err});
    })
  
        
          
      }
      
        
    },(err) => {
      
        
        console.log(err);
        res.status(500).json({err});
    })

  

  
   
}

exports.getPartners = (req, res) => {
  
  console.log("le body", req.body);
  
    const status = req.body.status; 
    const userStatus  = req.body.userStatus; 
  
    
  
    let champ; 
  
  
    if(userStatus == "rec") {
      
        champ = {rec_id: req.auth.userId}; 
        
    
    }else{
        
      
      champ = {agg_id: req.auth.userId, status}; 
        
    }
  
   
  
    User.aggregate([
      
      
      
      {
        $facet: {
          "recs" : [
            {
              $match: {
                $and: [
                  {
                    "status": "rec"
                  }, 
                  {
                    agg_id: req.auth.userId
                  }, 
                 
                ]
              }, 
              
            }, 
          
          ], 
          "allUsers" : [
              {
                $match : champ, 

              }, 
              {
                $sort: {
                    date: -1
                }
              }, 
              {
                $skip: req.body.startAt
              }, 
              {
                $limit: 10
              }, 
         
               
          ], 
          "count" : [
            {
              $match: champ
            }, 
            {
              $count: "totalDocs"
            }, 
            {$project: {_id: 0}}  
          ]
        }
      }
      
      
   
      
    ]).then((result) => {
      
          
        console.log(result[0].allUsers);
        console.log(result[0].recs);
        console.log(result[0].count)
          res.status(200).json({status: 0, message: "Tout est Ok", data: result[0].allUsers, 
          startAt: result[0].allUsers.length < 10 ? null : parseInt(req.body.startAt) + 10 , 
            count: result[0].count.length > 0 ? result[0].count[0].totalDocs : 0, recs: result[0].recs, _id: req.auth.userId  });
          
        
    }, (err) => {
      
        console.log(err); 
      res.status(500).json({err})
    })
}

exports.morePartners = (req, res) => {
  
    User.find({status: req.body.status, agg_id: req.auth.userId}).sort({date: -1}).skip(req.body.startAt).limit(10).then((partners) => {
      
      res.status(200).json({status: 0, partners, startAt: partners.length < 10 ? null : parseInt(req.body.startAt) + 10});
        
    }, (err) => {
      
        console.log(err); 
        res.status(505).json({err})
    })
}

exports.getPartner = (req, res) => {
  
    User.findOne({_id: req.body._id}).then((user) => {
      
      res.status(200).json({status: 0, user});
        
    }, (err) => {
      
      console.log(err); 
      res.status(500).json({err})
    })
}

exports.searchPartners = async (req, res) => {
  
    try {
    const { query } = req.body;
      
     // console.log(req.body);

     if(query && query !== ""){

        let body = {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { expressPhone: { $regex: query,  } },
              { amPhone: { $regex: query, } },
              { mmPhone: { $regex: query } },
              { flashPhone: { $regex: query } }, 
             
            ]
          };
          //let body = {name: { $regex: query, $options: 'i' }}; 
          
          if(req.body.status == "rec"){
            
              body = {...body, rec_id: req.auth.userId}
          }
          
          if(req.body.status == "agg"){
            
               body = {...body, agg_id: req.auth.userId}
          }
    
   // console.log(body);
          
        const users = await User.find(body).sort({date: -1}).limit(10); // Recherche insensible à la casse
          
          res.status(200).json({status: 0, users});

     }else{

        res.status(200).json({status: 0, users: []});

     }


  
    } catch (error) {
      console.log(error)
    res.status(500).send('Erreur lors de la recherche des utilisateurs.');
  }
}

exports.lockOrUnlockPartner = (req, res) => {
  
  console.log(req.body); 
  
  
    User.updateOne({_id: req.body._id}, {$set: {active: !req.body.active}}).then(() => {
      
      console.log("je dis bien")
      res.status(201).json({status: 0});
      
      
        
    }, (err) => {
        
      console.log(err)
         res.status(505).json({err})
    })
}

exports.getRecs = (req, res) => {
  
  console.log(req.body);
  
  User.find({agg_id: req.auth.userId, status: "rec"}).then((recs) => {
    
   
    res.status(200).json({status: 0, recs});
    
      
  }, (err) => {
    
      console.log(err); 
      res.status(505).json({err})
  }); 
  
  
}

exports.updatePartner = async (req, res) => {
  
  const body = req.body; 
  
  let _id;
  
  if(req.body._id){
    
       _id = req.body._id; 
      
  }else{
    
      _id = req.auth.userId;
  }
  

  
  
  if(req.body.password){
    
      body.password =  await  bcrypt.hash(req.body.password, 10);
      
  }
  
  if(body._id){
    
          delete body._id; 
  }
  
  let user; 
  
  if(req.body.phone){
    
     user =  await User.findOne({phone: req.body.phone}); 
    
    if(user && user._id !== req.auth.userId){
      
          console.log("c'est ici");
      
          res.status(200).json({status: 1, message: "Le numéro de connnexion que vous souhaiter utiliser pour ce partenaire est déjà pris par un autre"})
    
    }else{
      
      User.updateOne({_id: _id}, {$set: body}).then(() => {
    
    
        res.status(201).json({status: 0});


      }, (err) => {

          console.log(err); 
          res.status(505).json({err})
      })
        
    }
    

  }else{
    
    User.updateOne({_id: _id}, {$set: body}).then(() => {
    
    
    res.status(201).json({status: 0});
    
    
    }, (err) => {

        console.log(err); 
        res.status(505).json({err})
    })
  }
  
    
}

exports.getRecs = (req, res) => {
  
    User.find({agg_id: req.auth.userId, status: "rec"}).then((recs) => {
      
      res.status(200).json({status: 0, recs})
        
    }, (err) => {
      
        console.log(err); 
        res.status(505).json({err})
    })
  
}