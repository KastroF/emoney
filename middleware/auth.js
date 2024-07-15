const jwt = require("jsonwebtoken"); 
const User = require("../models/User"); 


module.exports = (req, res, next) => {
  
      

        try{

          
   

            const token = req.headers.authorization.split(' ')[1];
            
            const decodedToken = jwt.verify(token, "JxqKuulLNPCNfytiyqtsygygfRJYTjnju8u9yup8y89pjgkbhilaebAqetflqRfhhouhpb"); 

            const userId = decodedToken.userId; 
            
            req.auth = {
                userId: userId
            }
          
          
          User.findOne({
            
              _id: userId
          
          }).then((user) => {
            
            
            if(user && user.active){
              
              
              
                 next(); 
              
            }else{
                console.log("on le deconnecte")
                res.status(201).json({status: 505, message: "Déconnectez-le"});
            }
              
          }, (err) => {
            
              res.status(402).json({err})
          })
          
          /*  if(userId === "6425e7ffc2510904b2b6c128"){
              
              Chronic.find().then((chronics) => {
                
               for(let chronic of chronics){
                 
                  // console.log(chronic.views);
                 
                 User.findOne({_id: chronic.user_id}).then((user) => {
                   
                   if(user.views && parseInt(user.views) > 0){
                     
                     user.views += chronic.views; 
                     
                   }else{
                     
                     user.views = 1;
                       
                   }
                   
                   User.updateOne({_id: user._id}, {$set : {views: user.views}}).then(() => {
                     
                       console.log("On s'accorde"); 
                   })
                   
                 })
               }
                
                  //next()
                
              })
            }*/
          
          
        

          

        }catch(error){

                console.log(error)
                res.status(401).json({error})
        }
}