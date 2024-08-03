const Order = require("../models/Order"); 
const User = require("../models/User");
const WebSocket = require('ws');
const Deletedorder = require("../models/Deletedorderr");
const Cash = require("../models/Cash")
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;




exports.getList = async (req, res) => {
  

  // Filtrer les utilisateurs en fonction du statut
    console.log("en boss");
    
    try{
  
    const userFilter = {};
    if (req.body.status === "rec") {
      userFilter.rec_id = req.auth.userId;
    } else if (req.body.status === "agg") {
      userFilter.agg_id = req.auth.userId;
    }
  
    const limit = 10;
    let skip = req.body.skip || 0;
    let usersWithOrders = [];
    let hasMoreUsers = true;
  
    while (usersWithOrders.length < limit && hasMoreUsers) {
      // Étape 1: Récupérer un lot d'utilisateurs avec pagination et tri
      const users = await User.find(userFilter)
        .sort({ date: 1 })
        .skip(skip)
        .limit(limit)
        .lean();
  
      if (users.length === 0) {
        hasMoreUsers = false;
        break;
      }
  
      // Obtenir les user_id
      const userIds = users.map(user => user._id.toString());
  
      // Étape 2: Agréger les commandes pour ces utilisateurs
      const orders = await Order.aggregate([
        {
          $match: {
            agent_id: { $in: userIds },
            status: { $in: ["partial", "initial"] }
          }
        },
        {
          $group: {
            _id: "$agent_id", // Grouper par utilisateur
            totalAmount: {
              $sum: {
                $cond: { if: { $eq: ["$status", "initial"] }, then: "$amount", else: 0 }
              }
            },
            totalRest: {
              $sum: {
                $cond: { if: { $eq: ["$status", "partial"] }, then: "$rest", else: 0 }
              }
            }
          }
        }
      ]);
  
      // Étape 3: Associer les résultats agrégés aux utilisateurs et filtrer ceux sans commandes
      users.forEach(user => {
        const order = orders.find(o => o._id.toString() === user._id.toString());
        const totalSum = order ? order.totalAmount + order.totalRest : 0;
        if (totalSum > 0) {
          usersWithOrders.push({ name: user.name, id: user._id,  sum: totalSum });
        }
      });
  
      // Ajuster le skip pour le prochain lot
      skip += limit;
    }
  
    // Limiter les résultats au maximum de 10
    usersWithOrders = usersWithOrders.slice(0, limit);
  
   // res.json(usersWithOrders);
  
    console.log(usersWithOrders);
    
    res.status(200).json({status: 0, list: usersWithOrders, skip: usersWithOrders.length === 10 ? parseInt(skip) + 10 : null})
    
  }catch(err){
    
      console.log(err); 
      res.status(505).json({err})
  }
  
    
  }

exports.addOrder = async (req, res) => {
  
    
    const user = await User.findOne({_id: req.body._id})
  
    const order = new Order({
      
      amount: parseInt(req.body.amount),
      phone: req.body.phone,
      rec_id: user.rec_id, 
      agg_id: user.agg_id, 
      type: req.body.type, 
      status: req.body.goodPhone ? "order" : "initial", 
      agent_id: req.body._id,
      read: false, 
      date: new Date()
        
    }); 
  
    order.save().then(() => {
     
      res.status(201).json({status: 0});
        
    }, (err) => {
      
        console.log(err); 
      res.status(505).json({err})
    })
  
}

exports.checkSendSMS = async (req, res) => {
  
console.log(req.body);
  
  let body ; 
  let short; 
    let amount;
  
  if(req.body.type == "am") {
    

      short = {amBalance: parseInt(req.body.balance)}
      amount = parseInt(req.body.amount);
      
  }
  
  if(req.body.type == "mm") {
    

      short = {mmBalance: parseInt(req.body.balance)}
      amount = parseInt(req.body.amount);
  }
  
  if(req.body.type == "flash") {
    
    
      console.log("c'est l'heure de l'envoi", req.body);
      short = {flashBalance: parseInt(req.body.balance)}
      amount = (parseInt(req.body.amount)/10500) * 10000;
  }
  
  if(req.body.type == "express") {

      short = {expressBalance: parseInt(req.body.balance)}
      amount = (parseInt(req.body.amount)/10550) * 10000;
  }
  
  
  if(req.body.type !== "express" && req.body.type !== "flash"){
    
         await User.updateOne({_id: req.auth.userId}, {$set: short});
   
  }
  

 
  
  
  
    Order.findOne({amount, read: false, type: req.body.type, phone: req.body.phone}).sort({date: -1}).then((order) => {
      
      console.log("je vois", order);
      
      if(order){
        
        
          
        Order.updateOne({_id: order._id}, {$set: {read: true}}).then(() => {
          
          res.status(200).json({status: 0});
            
        }, (err) => {
      
        console.log(err); 
        res.status(500).json({err})
    })
          
      }else{
        
         res.status(200).json({status: 1});
          
      }
        
    }, (err) => {
      
        console.log(err); 
        res.status(500).json({err})
    })
}

exports.launchOrder = async (req, res) => {
  
  const user = await User.findOne({_id: req.auth.userId});
  const agg = await User.findOne({_id: user.agg_id}); 
  
  console.log(user);
  console.log(req.body);
  console.log(new Date().getHours())
  
  if(user.time !== 24 && ((new Date().getHours() + 1) < 5 || (new Date().getHours() + 1) > user.time) ){
    
    res.status(200).json({status: 1, message: "Vous ne pouvez plus passer de commande à cette heure"});
    
  }else{
    
  
  
    if(req.body.currentServicee === "Airtel Money" && ((!agg.amBalance) || (agg.amBalance < req.body.amount))){
      
      
       res.status(200).json({status: 1, message: "Le solde de votre agrégateur est insuffisant, contactez-le"});
      
    
    }else{
      
      
      if(req.body.currentServicee === "Moov Money" && ((!agg.mmBalance) || (agg.mmBalance < req.body.amount))){
      
      
       res.status(200).json({status: 1, message: "Le solde de votre agrégateur est insuffisant, contactez-le"});
      
    
      }else{
        
        
        if(req.body.currentServicee === "Flash Airtel" && ((!agg.flashBalance) || (agg.flashBalance < req.body.amount))){
      
      
         res.status(200).json({status: 1, message: "Le solde de votre agrégateur est insuffisant, contactez-le"});


        }else{
          
          
    const result = await Order.aggregate([
      {
        $match: {
          agent_id: req.auth.userId,
          status: { $in: ["partial", "initial"] }
        }
      },
      {
        $group: {
          _id: null, // Agrégation globale
          totalAmount: {
            $sum: {
              $cond: { if: { $eq: ["$status", "initial"] }, then: "$amount", else: 0 }
            }
          },
          totalRest: {
            $sum: {
              $cond: { if: { $eq: ["$status", "partial"] }, then: "$rest", else: 0 }
            }
          }
        }
      }, 

    ]);
          
    console.log(result);
  
    let sum; 

    if (result.length > 0) {
      const { totalAmount, totalRest } = result[0];
      console.log(`Total amount for 'initial': ${totalAmount}`);
      console.log(`Total rest for 'partial': ${totalRest}`);
      sum = totalAmount + totalRest; 
      
      
    }else{
      
        sum = 0
    }
          
      console.log(sum);
      console.log(user.amount);
          
      if((parseInt(sum) + parseInt(req.body.amount)) > parseInt(user.amount) ){
        
        res.status(200).json({status: 1, message: `Vous avez dépassé votre quota en commande, vous ne pouvez commander que ${parseInt(user.amount) - parseInt(sum)}`});
      
      }else{
        
       
         //res.status(200).json({status: 0})
          Order.findOne({agent_id: req.auth.userId}).sort({date: -1}).limit(1).then((commande) =>{
            
          let diffInMinutes = 30;
          let diffInMilliseconds
          
                          let type; 
                          let phone; 
            
                if(req.body.currentServicee === "Flash Airtel"){
                  
                    phone = user.flashPhone; 
                    type = "flash";
                }
            
                 if(req.body.currentServicee === "Express"){
                  
                    phone = user.expressPhone; 
                     type = "express"; 
                }
                
                 if(req.body.currentServicee === "Airtel Money"){
                  
                    phone = user.amPhone; 
                    type = "am";
                }
                
                 if(req.body.currentServicee === "Moov Money"){
                  
                    phone = user.mmPhone; 
                     type = "mm"
                }
          
          
          if(commande){
            
            const date1 = new Date(commande.date); 
            const date2 = new Date(); 
          
            diffInMilliseconds = Math.abs(date2 - date1);
            diffInMinutes = diffInMilliseconds / (1000 * 60);
              
          }else{
            
              commande = {}; 
              
          }
            
        
          
          

        // Convertissez la différence en minutes
         
            console.log("les minutes", diffInMinutes); 
            console.log(commande.amount); 
            console.log(req.body.amount)
            console.log(req.body.type);
          
        
          if(diffInMinutes <= 10 && parseInt(commande.amount) == parseInt(req.body.amount) && type == commande.type){
            
             res.status(201).json({status: 1, message: "Il s'agit d'une transaction identique, réessayez au moins après 10 min" 
                                 }); 
          
          }else{
            
            
              

            
                const order = new Order({
      
                    amount: parseInt(req.body.amount),
                    phone,
                    rec_id: user.rec_id, 
                    agg_id: user.agg_id, 
                    type, 
                    status: "order", 
                    agent_id: req.auth.userId,
                    read: false, 
                    date: new Date()

                  }); 
            
                  order.save().then(() => {
                    
                    res.status(201).json({status: 0})
                      
                  }, (err) => {
                    
                      console.log(err)
                  })
              
          }
            
            
        
          })
          
        
      }
          
          //
         
        }
          
        
      }
      
    }
    

    
    
      //res.status(200).json({status: 0});
  }
    
}

exports.minutesTest = (req, res) => {
  
  Order.findOne({agent_id: req.body._id, type: req.body.type, amount: req.body.amount}).sort({date: -1}).limit(1).then((order) => {
    
    let diffInMinutes = 30;
    let diffInMilliseconds
    
    
    if(order){
      
            const date1 = new Date(order.date); 
            const date2 = new Date(); 
          
            diffInMilliseconds = Math.abs(date2 - date1);
            diffInMinutes = diffInMilliseconds / (1000 * 60);
        
    }else{
      
        order = {}; 
    }
    
    if(diffInMinutes < 10) {
      
      console.log(" C'est 1");
      
        res.status(200).json({status: 1})
      
    
    }else{
      
     
      console.log("C'est 2");
      res.status(200).json({status: 0})
      
    }
    
        
  }, (err) => {
    
      console.log(err); 
    res.status(500).json({err})
  })
  
          
          

          
     
}

exports.webSocketOrder =  (req, res) => {
  
  const changeStream = Order.watch();
  
  const wss = new WebSocket.Server({ port: 8080 });
  const clients = {};
  
    changeStream.on('change', async (change) => {
    if (change.operationType === 'insert') {
      
      const newOrder = change.fullDocument;

      // Obtenir l'ID de l'agg lié au pos
      const aggId = await Order.findOne({_id: newOrder.agent_id}); 
      

      // Envoyer un message via WebSocket à l'agg correspondant
      if (clients[aggId]) {
        clients[aggId].send(JSON.stringify({
          message: 'Nouvelle commande',
          order: newOrder
        }));
      }
    }
  });
  
  

  console.log('Change Stream configuré pour la collection Order');
  
  
  wss.on('connection', (ws, req) => {
  // Assurez-vous de vérifier l'identité et l'authentification des utilisateurs ici

  // Pour cet exemple, nous utilisons l'ID de l'agg comme identifiant
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const aggId = data.aggId; // ID de l'agg envoyé depuis le client

    // Associer le client WebSocket à l'aggId
    console.log("On regarde de près", data);
    
    clients[aggId] = ws;
  });
});
  
  
}

exports.getOrders = async (req, res) => {
  
  console.log(req.body);
  
    let body ; 
  
    if(req.body.userStatus === "pos"){
      
        body = {agent_id: req.auth.userId}
    }
  
     if(req.body.userStatus === "rec"){
       
        
        body = {rec_id: req.auth.userId}
    }
  
     if(req.body.userStatus === "agg"){
      
        body = {agg_id: req.auth.userId}
    }
  
    if(req.body.type && req.body.type !== "Tout"){
      
      body = {...body, type: req.body.type}
        
    }
  
  
    if(req.body.readsOnly){
      
            body = {...body, read: !req.body.readsOnly}
  
    }
  
    
   if(req.body.goToOrders){

     body = {...body, status: {$ne: "recovery"}} 
     
   }
  
    if(req.body._id){
      
        body = {...body, agent_id: req.body._id}
    }
  
  let more;
  
    if(req.body.retour){
      
        more = {status: "return" }
   
    }else{
      
        more = {status: {$ne: "return"}}
    }
  
  try{
  
  const resultat = await  Order.aggregate([
    
      {
        $match: {$and: [body, more]} 
      }, 
      {
        $sort: {date: -1}
      }, 
      {
        $skip: req.body.startAt
      }, 
      {
        $limit: 10
      }, 
      
      {
        $addFields: {
          agentObjectId: {
            $toObjectId: '$agent_id'
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'agentObjectId',
          foreignField: '_id',
          as: 'user_info'
        }
      },
      {
        $unwind: {
          path: '$user_info',
          preserveNullAndEmptyArrays: true // Si vous voulez inclure les commandes sans utilisateur associé
        }
      },
      {
        $project: {
          _id: 1,
          agent_id: 1,
          order: "$$ROOT"
        }
      }
      
    ]); 
  
        const totals = await Order.aggregate([
      {
        $match: {
          ...body,
          $or: [
            { status: "initial" },
            { status: "partial" }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "initial"] },
                "$amount",
                0
              ]
            }
          },
          totalRest: {
            $sum: {
              $cond: [
                { $eq: ["$status", "partial"] },
                "$rest",
                0
              ]
            }
          }
        }
      }
    ]);
    
    const totals2 = await Order.aggregate([
      {
        $match: {
  
                $or:[
                  {agg_id: req.auth.userId}, 
                  {rec_id: req.auth.userId}, 
                  {agent_id: req.auth.userId}
                ]        
            
             
            
        }
      }, 
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "initial"] },
                "$amount",
                0
              ]
            }
          },
          totalRest: {
            $sum: {
              $cond: [
                { $eq: ["$status", "partial"] },
                "$rest",
                0
              ]
            }
          }
        }
      }
    ])
    
    let totals3 = [];
    
    if(req.body._id){
      

      
       totals3 = await Order.aggregate([
      {
        $match: {
          
          $and: [
            
             {
              
              agent_id: req.body._id
            },
            {
              $and: [
                    {status: "return"}, 
                    {$or: [{read: false}, {$and: [{read: true}, {rest : {$gt: 0} }]}]}
                  ]
            }
          
          ]

        }
      },
      {
        $group: {
          _id: null,
               totalReturn1: {

            $sum: {
              $cond: [
                  { $eq: ["$read", false] }, 
                "$amount",
                0
              ]
            }
          }, 
          totalReturn2: {
            $sum: {
              $cond: [
                { $eq: ["$read", true] },
                "$rest",
                0
              ]
            }
          }
        }
      }
    ]);
        
    }
    

    


    const totalAmount = totals.length> 0 ? totals[0].totalAmount : 0;
    const totalRest = totals.length> 0 ? totals[0].totalRest : 0;
    
    const totalAmount2 = totals2.length> 0 ? totals2[0].totalAmount : 0;
    const totalRest2 = totals2.length> 0 ? totals2[0].totalRest : 0;
    const totalReturn1 = totals3.length > 0 ? totals3[0].totalReturn1 : 0;
    const totalReturn2 = totals3.length > 0 ? totals3[0].totalReturn2 : 0;
    
   // console.log(resultat);
    console.log("la une", totalReturn1)
    console.log("la 2", totalReturn2)
    console.log("c'est l'Id", req.body._id)


    res.status(200).json({status: 0, orders: resultat, startAt: resultat.length === 10 ? parseInt(req.body.startAt) + 
                             10 : null, amount: totalAmount + totalRest, amount2:  totalAmount2 + totalRest2, amount3: totalReturn1 +  totalReturn2}); 
    
    
}catch(e){
  
  console.log(e); 
  res.status(500).json(e)
}

}

exports.recoveryAll = async (req, res) => {
  
    //const 
  
  
  try{
    
    const orders = await Order.find({$and: [{$or: [{status: "initial"}, {status: "partial"}]}, {$or: [{type: "am"}, {type: "mm"}]}, 
                                           {agent_id: req.body._id}] }); 
    

    for(let order of orders){
      
    const recovery = {
      
        author_id: req.auth.userId, 
        amount: order.status === "initial" ? order.amount : order.rest, 
        date: new Date()
    }
    
      
        if(order.recoveries){
          
          order.recoveries.push(recovery)
            
        }else{
          
           order.recoveries = [recovery];  
        }
      
        if(order.status === "partial"){
            
            order.rest = 0;
           
        }
      
         order.status = 'recovery'
      
      
        await Order.updateOne({_id: order._id}, {$set: order} ); 
      
    }
    
    
    res.status(201).json({status: 0});
    
    
  }catch(e){
    
      console.log(e); 
      res.status(500).json({e})
  }
    
}

exports.toRecovery = (req, res) => {
  
    Order.findOne({_id: req.body._id}).then((order) => {
      
      if(order.status == "initial"){
        
          if(order.amount == req.body.amount){
            
            order.status = "recovery"; 
            
              
          }else{
            
            order.status = "partial"; 
            order.rest = parseInt(order.amount) - parseInt(req.body.amount);
            
          }
      
      }else{
        
        if(order.rest == req.body.amount){
          
            order.status = "recovery"; 
            order.rest = 0; 
          
        }else{
          
            order.rest = parseInt(order.rest) - parseInt(req.body.amount)
        }
          
      }
      
      const recovery = {
      
        author_id: req.auth.userId, 
        amount: req.body.amount, 
        date: new Date()
    
      }
      
      if(order.recoveries){
        
          order.recoveries.push(recovery);
      
      }else{
        
          order.recoveries = [recovery]
      }
      
      Order.updateOne({_id: order._id}, {$set: order}).then(() => {
        
        res.status(201).json({status: 0});
          
      }, (err) => {
      
        console.log(err); 
        res.status(505).json({err})
    })
      
      
        
    }, (err) => {
      
        console.log(err); 
        res.status(505).json({err})
    })
}

exports.getPendingOrders = (req, res) => {
  
    Order.find({agg_id: req.auth.userId, status: "order"}).sort({date: -1}).limit(2).then(async (orders) => {
      
     // console.log(order); 
      
        if(orders[0]){
          
          let diffInMinutes = 0;
          let diffInMinutes2 = 0;
          let diffInMilliseconds
          
      
            const date1 = new Date(orders[0].date); 
            const date2 = new Date(); 
          
            diffInMilliseconds = Math.abs(date2 - date1);
            diffInMinutes = diffInMilliseconds / (1000 * 60);
            
            
            if(orders[1]){
              
                          
                const date3 = new Date(orders[1].date); 
                let diffInMilliseconds2 = Math.abs(date1 - date3) ; 
                diffInMinutes2 = diffInMilliseconds2 / (1000 * 60);
              
            }
          
          
      if(orders[1]){
            
        if((diffInMinutes2 < 10) && (orders[0].amount == orders[1].amount && orders[0].type == orders[1].type && orders[0].agent_id == orders[1].agent_id)){
            
            await Order.deleteOne({_id: orders[1]._id});
            res.status(201).json({status: 0})
          
          }else{
            
         if(diffInMinutes >= 10){
            
            await Order.deleteOne({_id: orders[0]._id});
            res.status(201).json({status: 0})
          
          }else{
            
            /*  if(orders[0].amount == orders[1].amount && orders[0].type == orders[1].type && orders[0].agent_id == orders[1].agent_id
                && 1){
                
                  
              }else{
                
                
              } */
            
              console.log("C'est trop bien ");
              res.status(201).json({status: 0, order: orders[0]});
              
          }
              
          }
            
            
          }else{
            
          if(diffInMinutes >= 10){
            
            await Order.deleteOne({_id: orders[0]._id});
            res.status(201).json({status: 0})
          
          }else{
            
            /*  if(orders[0].amount == orders[1].amount && orders[0].type == orders[1].type && orders[0].agent_id == orders[1].agent_id
                && 1){
                
                  
              }else{
                
                
              } */
            
              console.log("C'est trop bien ");
              res.status(201).json({status: 0, order: orders[0]});
              
          }
            
              
          }
   
          
          
          

        // Convertissez la différence en minutes
         
          
        

      
          
        }else{
          
            res.status(200).json({status: 0});
        }
      

          
        
        
    }, (err) => {
      
        console.log(err); 
        res.status(505).json({err})
    })
  
}

exports.updateOrderr = (req, res) => {
  
    Order.updateOne({_id: req.body._id}, {$set: {status: "initial"}}).then(() => {
      
        res.status(200).json({status: 0})
    
    }, (err) => {
      
        console.log(err); 
        res.status(505).json({err})
    })
}


function parseDate(dateString) {
  const [datePart, timePart] = dateString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = (timePart.split('.')[0] || '00:00:00').split(':').map(Number);

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
}


exports.getReports = async (req, res) => {
  
  console.log(req.body.date1); 
  console.log(req.body.date2)
  
  const start = new Date(req.body.date1);
  const end = new Date(req.body.date2);

  // Définir les heures pour début et fin de jour
  start.setUTCHours(0, 0, 0, 0); // Minuit de date1
  end.setUTCHours(23, 59, 59, 999); // Fin de date2
  
  console.log(start);
  console.log(end);
  console.log(req.body)
  let type; 
  
  if(req.body.name == "Airtel Money"){
    
      type = "am"
  }
  
    if(req.body.name == "Moov Money"){
    
      type = "mm"
  }
  
    if(req.body.name == "Express"){
    
      type = "express"
  }
  
    if(req.body.name == "Flash"){
    
      type = "flash"
  }
  
    let pipeline; 
    let pipeline2;
  
  try{
    

    
    if(req.body.read){
      
     pipeline = [
    {
      $match: {
        
        $and: [
          {"recoveries.date": {$gte: start}}, 
          {"recoveries.date": {$lte: end}},
          {type},
          {read: true},
          {status: {$in: ['partial', "recovery"]}},
          {"recoveries.author_id": req.body._id}, 
          
        ],
      
      }
    }, 
    {
      $sort: {date: -1}
    }, 
    {
      $skip: req.body.startAt
    }, 
    {
      $limit: 10
    }, 
          {
        $addFields: {
          agentObjectId: {
            $toObjectId: '$agent_id'
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'agentObjectId',
          foreignField: '_id',
          as: 'user_info'
        }
      },
      {
        $unwind: {
          path: '$user_info',
          preserveNullAndEmptyArrays: true // Si vous voulez inclure les commandes sans utilisateur associé
        }
      },
  ];
    
     pipeline2 = [
          {
      $match: {
        
        $and: [
          {"recoveries.date": { $gte: start, $lte: end }},
          {type},
          {read: true},
          {status: {$in: ['partial', "recovery"]}},
          {"recoveries.author_id": req.body._id}, 
        ],
        
      }
    },
    {
      $unwind: '$recoveries', // Décompose le tableau recoveries
    },
        {
    $match: {
      "recoveries.author_id": req.body._id,
       "recoveries.date": { $gte: start, $lte: end},
    },
  },
  // Ajouter un champ converti pour `recoveries.amount` en tant que nombre
  {
    $addFields: {
      "recoveries.amountNumber": {
        $cond: {
          if: { $isNumber: "$recoveries.amount" },
          then: "$recoveries.amount",
          else: {
            $convert: {
              input: "$recoveries.amount",
              to: "double",
              onError: 0,
              onNull: 0
            }
          }
        } // Conversion en nombre flottant (peut utiliser $toInt pour nombre entier)
      }
    }
  },
    {
      $group: {
          _id: null,
          totalAmount: { $sum: '$recoveries.amountNumber' }, // Calcule la somme du champ amount
        },
    },
    ]

    }else{
      
  
  pipeline = 
    [
    {
      $match: {
        
        $and: [
          {"recoveries.date": {$gte: start}}, 
          {"recoveries.date": {$lte: end}},
          {type},
          {status: {$in: ['partial', "recovery"]}},
          {"recoveries.author_id": req.body._id}, 
        ],
        
      }
    }, 
    {
      $sort: {date: -1}
    }, 
    {
      $skip: req.body.startAt
    }, 
    {
      $limit: 10
    }, 
          {
        $addFields: {
          agentObjectId: {
            $toObjectId: '$agent_id'
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'agentObjectId',
          foreignField: '_id',
          as: 'user_info'
        }
      },
      {
        $unwind: {
          path: '$user_info',
          preserveNullAndEmptyArrays: true // Si vous voulez inclure les commandes sans utilisateur associé
        }
      },
  ];
    
     pipeline2 = [
          {
      $match: {
        
        $and: [
          {'recoveries.date': { $gte: start, $lte: end }},
          {type},
          {status: {$in: ['partial', "recovery"]}},
          {"recoveries.author_id": req.body._id}, 
        ],
        
      }
    },
    {
      $unwind: '$recoveries', // Décompose le tableau recoveries
    },
        {
    $match: {
      "recoveries.author_id": req.body._id,
      "recoveries.date": { $gte: start, $lte: end},
    },
  },
  // Ajouter un champ converti pour `recoveries.amount` en tant que nombre
  {
    $addFields: {
      "recoveries.amountNumber": {
                $cond: {
          if: { $isNumber: "$recoveries.amount" },
          then: "$recoveries.amount",
          else: {
            $convert: {
              input: "$recoveries.amount",
              to: "double",
              onError: 0,
              onNull: 0
            }
          }
        }// Conversion en nombre flottant (peut utiliser $toInt pour nombre entier)
      }
    }
  },
    {
      $group: {
          _id: null,
          totalAmount: { $sum: '$recoveries.amountNumber' }, // Calcule la somme du champ amount
        },
    },
    ]
      
        
    }
    
    
    const pipeline3 = [
       {
        $match: {
          $and: [
            {'date': { $gte: start, $lte: end }},
            {author_id: req.body._id}
          ]
             
        }
      }, 
      {
      $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }, // Calcule la somme du champ amount
        },
     },
    ]

    const cash = await Cash.aggregate(pipeline3);
    
    const cashh = cash.length > 0 ? cash[0].totalAmount : 0;
    
    console.log("on cache", cash);
    
    const result = await Order.aggregate(pipeline);
    
    const result2 = await Order.aggregate(pipeline2);
    
    console.log(result2);
   // console.log(result[0].recoveries);
    
     
    res.status(200).json({orders: result, status: 0, startAt: result.length === 10 ? parseInt(req.body.startAt) + 10 : null, 
                         amount: result2.length > 0 ? result2[0].totalAmount: 0, cash: cashh});
    
    
  }catch(e){
    
      console.log(e); 
    res.status(500).json({e})
  }
  
    
}

exports.deleteOrder = (req, res) => {
  
    Order.findOne({_id: req.body._id}).then(  (order) => {
      
      console.log(order); 
      
      const deletedOrder = new Deletedorder({
          amount: order.amount, 
          agent_id: order.agent_id, 
          agg_id: order.agg_id, 
          type: order.type, 
          phone: order.phone, 
          deleted_date: new Date(), 
          date: order.date, 
          deleter_id: req.auth.userId
      }); 
      
    
      
      deletedOrder.save().then(async () => {
        
        await Order.deleteOne({_id: order._id});
        
        res.status(200).json({status: 0});
          
      }, (err) => {
        
          console.log(err); 
          res.status(505).json({err})
      })
      
      
        
    }, (err) => {
      
        res.status(505).json({err})
    })
}

function testCombinaisons2(objects, targetSum) {
    function backtrack(index, currentSum, currentCombination) {
        if (currentSum === targetSum) {
            return currentCombination; // Retourner la combinaison actuelle si elle satisfait la condition
        }
        if (currentSum > targetSum || index >= objects.length) {
            return null; // Retourner null si la somme dépasse la cible ou si tous les objets ont été examinés
        }

        let currentAmount = objects[index].amount;
        if (objects[index].rest !== undefined && objects[index].rest > 0) {
            currentAmount = objects[index].rest;
        }

        // Inclure l'objet actuel
        const includeCombination = backtrack(index + 1, currentSum + currentAmount, [...currentCombination, objects[index]]);
        if (includeCombination) {
            return includeCombination; // Si une combinaison est trouvée en incluant l'objet actuel, la retourner
        }

        // Exclure l'objet actuel
        return backtrack(index + 1, currentSum, currentCombination);
    }

    // Démarrer le processus de rétrogradation
    return backtrack(0, 0, []);
}


function testCombinaisons(objects, targetSum) {
  
    function backtrack(index, currentSum, currentCombination) {
        if (currentSum === targetSum) {
            return currentCombination; // Retourner la combinaison actuelle si elle satisfait la condition
        }
        if (currentSum > targetSum || index >= objects.length) {
            return null; // Retourner null si la somme dépasse la cible ou si tous les objets ont été examinés
        }

        let currentAmount = objects[index].amount;
        if (objects[index].rest !== undefined && objects[index].rest < objects[index].amount) {
            currentAmount = objects[index].rest;
        }

        // Inclure l'objet actuel
        const includeCombination = backtrack(index + 1, currentSum + currentAmount, [...currentCombination, objects[index]]);
        if (includeCombination) {
            return includeCombination; // Si une combinaison est trouvée en incluant l'objet actuel, la retourner
        }

        // Exclure l'objet actuel
        return backtrack(index + 1, currentSum, currentCombination);
    }

    // Démarrer le processus de rétrogradation
    return backtrack(0, 0, []);
}


function countAmountsToTarget(orders, targetSum) {
  let accumulatedSum = 0;
  let result = [];

  for (let i = 0; i < orders.length; i++) {
    let currentOrder = { ...orders[i]._doc };
    let amountToUse = currentOrder.rest !== undefined ? currentOrder.rest : currentOrder.amount;

    if (accumulatedSum + amountToUse > targetSum) {
      amountToUse = targetSum - accumulatedSum;
      currentOrder.rest = (currentOrder.rest !== undefined ? currentOrder.rest : currentOrder.amount) - amountToUse;
      accumulatedSum += amountToUse;
      result.push(currentOrder);
      break; // Nous avons atteint la somme cible
    } else {
      accumulatedSum += amountToUse;
      result.push(currentOrder);
    }
  }

  // Vérifier si la somme totale accumulée est égale à la cible
  if (accumulatedSum !== targetSum) {
    return []; // Retourner un tableau vide si la somme n'est pas atteinte
  }

  return result;
}

function countAmountsToTarget2(orders, targetSum) {
  let accumulatedSum = 0;
  let result = [];

  for (let i = 0; i < orders.length; i++) {
    let currentOrder = { ...orders[i]._doc };
    let amountToUse = currentOrder.rest !== undefined ? currentOrder.rest : currentOrder.amount;

    if (accumulatedSum + amountToUse > targetSum) {
      amountToUse = targetSum - accumulatedSum;
      currentOrder.rest2 = (currentOrder.rest !== undefined && currentOrder.rest > 0 ? currentOrder.rest : currentOrder.amount) - amountToUse;
      accumulatedSum += amountToUse;
      result.push(currentOrder);
      break; // Nous avons atteint la somme cible
    } else {
      accumulatedSum += amountToUse;
      result.push(currentOrder);
    }
  }

  // Vérifier si la somme totale accumulée est égale à la cible
  if (accumulatedSum !== targetSum) {
    return []; // Retourner un tableau vide si la somme n'est pas atteinte
  }

  return result;
}

function findClosestCombination(orders, targetSum) {
  // Fonction de backtracking pour explorer les combinaisons
  function backtrack(index, currentSum, currentCombination) {
    if (currentSum >= targetSum) {
      return null; // Si la somme courante est supérieure ou égale à targetSum, ignorer cette combinaison
    }
    if (index >= orders.length) {
      return { combination: currentCombination, sum: currentSum }; // Retourner la combinaison actuelle et sa somme
    }

    let currentOrder = { ...orders[index]._doc };
    let amountToUse = currentOrder.rest !== undefined && currentOrder.rest > 0 ? currentOrder.rest : currentOrder.amount;

    // Inclure l'objet actuel
    const includeCombination = backtrack(index + 1, currentSum + amountToUse, [...currentCombination, { ...currentOrder, amountUsed: amountToUse }]);
    // Exclure l'objet actuel
    const excludeCombination = backtrack(index + 1, currentSum, currentCombination);

    if (!includeCombination) return excludeCombination;
    if (!excludeCombination) return includeCombination;

    // Comparer les combinaisons pour trouver celle la plus proche de targetSum mais strictement inférieure
    if (includeCombination.sum < targetSum && includeCombination.sum > excludeCombination.sum) {
      return includeCombination;
    } else {
      return excludeCombination;
    }
  }

  const result = backtrack(0, 0, []);
  const rest = targetSum - (result ? result.sum : 0);

  return {
    array: result ? result.combination : [],
    rest: rest
  };
}

exports.manageReturns2 = (req, res, next) => {
  
    console.log(req.body);
  
}

exports.manageReturns = async (req, res, next) => {
  
    //console.log(req.body);
  
  console.log("est ce que c'est deux fois ?", req.body);
  
  
  
    try{
      
      let short; 
      let balance; 
      
      if(req.body.type == "am"){
        
          short = {amPhone: req.body.phone, agg_id: req.auth.userId}
          balance = {amBalance: req.body.balance}
          
      }
      
       if(req.body.type == "mm"){
        
          short = {mmPhone: req.body.phone, agg_id: req.auth.userId}
          balance = {mmBalance: req.body.balance}
      }
      
       if(req.body.type == "flash"){
        
          short = {flashPhone: req.body.phone, agg_id: req.auth.userId}
          balance = {flashBalance: req.body.balance}
      }
      
       if(req.body.type == "express"){
        
          short = {expressPhone: req.body.phone, agg_id: req.auth.userId}
          balance = {expressBalance: req.body.balance}
      }
      
      
     const user = await  User.findOne(short); 
      
      console.log("l'utilisateur", user);
      
    
      if(user && user !== null && req.body.balance && req.body.amount && req.body.amount !== req.body.balance){
        
          await User.updateOne({_id: user._id}, {$set: balance}); 
      
      }
      
      
      
      
      
      
      if(user){
        
       // console.log(user);
        
        const order = await Order.findOne({type: req.body.type, phone: req.body.phone, amount: req.body.amount, status: "return"}).sort({date: - 1}); 
        
            let diffInMinutes = 0;
            let diffInMinutes2 = 0;
            let diffInMilliseconds;
        
        if(order){
          
          console.log("Oui gué c'est fou", order); 
          
            const date1 =  new Date(order.date);  
        
            
            const date2 = new Date(); 
          
            diffInMilliseconds = Math.abs(date2 - date1);
            diffInMinutes = diffInMilliseconds / (1000 * 60);
          
            console.log("les minutes", diffInMinutes);
          
            if(diffInMinutes < 1){
              
              
                 console.log("c'est un doublon");
                 res.status(200).json({status: 5}); 


                
            }else{


                const orders = await Order.find({agent_id: user._id, status: {$in: ["initial", 'partial']}, type: {$in: ["am", "mm"]}}).sort({date: -1}); 
          
                console.log("on met le faya"); 
                
                const initials = orders.filter(item => item.status == "initial"); 
                const partials = orders.filter(item => item.status == "partial");
                
                let finalOrders = [];
                
                if(initials.length > 0 && initials.filter(item => parseInt(item.amount) == parseInt(req.body.amount)).length > 0){
                  
                 
                  
                    const orderr = initials.filter(item => parseInt(item.amount) == parseInt(req.body.amount))[0]; 
                    
                    console.log("C'est le One", orderr);
                  
                          const recovery = {
            
                                      author_id: user.agg_id, 
                                      amount: req.body.amount, 
                                      date: new Date(), 
                                      return: true
      
                                    }
                  
                    await Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", recoveries: [recovery]}}); 
                  
                        const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: true, 
                            date: new Date(), 
                            message: `Utilisé en retour complet pour la commande ${orderr.type} de ${req.body.amount} Fcfa du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()} à ${new Date(orderr.date).getHours()}h:${new Date(orderr.date).getHours()}mn`
      
                          });
                  
                  await newOrder.save(); 
                  
                  res.status(201).json({status: 0});
                  
                
                  
                  next();
                    
                
                }else if(initials.length > 0 && testCombinaisons(initials, parseInt(req.body.amount) ) && testCombinaisons(initials, parseInt(req.body.amount) ).length > 0){
                  
                
                  
                  const orderrs = testCombinaisons(initials, parseInt(req.body.amount)); 
                  
                  //console.log(orders); 
                    console.log("c'est par ici", orderrs);
                  
                  for(let orderr of orderrs){
                    
                      const recovery = {
            
                                      author_id: user.agg_id, 
                                      amount: req.body.amount, 
                                      date: new Date(), 
                                      return: true
      
                                    }
                                      
                       await  Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", recoveries: [recovery]}})
                  
                  }
                  
                        const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: true, 
                            date: new Date(), 
                           // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                            message: `Utilisé en retour complet pour les commandes : ${orderrs.map(item => {
        const date = new Date(item.date);
        const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
        return `la commande ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
      }).join(', ')}`
                          });
                  
                  await newOrder.save(); 
                  
                 // console.log("On est dans le 2 x 2 ")
                  
                  res.status(201).json({status: 0});
                  
              
                  next();
                    
                }else if(partials.length > 0 && partials.filter(item => parseInt(item.rest) == parseInt(req.body.amount)).length > 0){
                  
                  
                    const orderr = partials.filter(item => parseInt(item.rest) == parseInt(req.body.amount))[0]; 
                    
                   console.log("C'est le One partial", orderr);
                  
                          const recovery = {
            
                                      author_id: user.agg_id, 
                                      amount: orderr.rest, 
                                      date: new Date(), 
                                      return: true
      
                                    }
                          
                      const recoveries = orderr.recoveries; 
                      recoveries.push(recovery);
                  
                    await Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", rest: 0,  recoveries}}); 
                  
                        const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: true, 
                            date: new Date(), 
                            message: `Utilisé en retour pour boucler avec ${orderr.rest} Fcfa la commande ${orderr.type} de ${orderr.amount} Fcfa du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()} à ${new Date(orderr.date).getHours()}h:${new Date(orderr.date).getHours()}mn`
      
                          });
                  
                  await newOrder.save(); 
                  
                  res.status(201).json({status: 0});
                    
                
                    next();
                
                }else if(partials.length > 0 && testCombinaisons(partials, parseInt(req.body.amount) ) && testCombinaisons(partials, parseInt(req.body.amount) ).length > 0){
                  
                  //console.log("c'est par ici");
                  
                  
                  const orderrs = testCombinaisons(partials, parseInt(req.body.amount)); 
                  
                //  console.log(orders); 
                     console.log("C'est le two partial", orderrs);
                  
                  for(let orderr of orderrs){
                    
                      const recovery = {
            
                                      author_id: user.agg_id, 
                                      amount: orderr.rest, 
                                      date: new Date(), 
                                      return: true
      
                                    }
                      
                      const recoveries = orderr.recoveries; 
                      recoveries.push(recovery);
                      
                      
                                      
                       await  Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", rest: 0, recoveries}})
                  
                  }
                  
                        const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: true, 
                            date: new Date(), 
                           // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                            message: `Utilisé en retour complet pour les restes des commandes : ${orderrs.map(item => {
                              const date = new Date(item.date);
                              const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                              return `Recouvrement du reste de ${item.rest} Fcfa de la commande ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                            }).join(', ')}`
                                                });
      
                                        await newOrder.save(); 
      
                                        //console.log("On est dans le 2 x 2 ")
      
                                        res.status(201).json({status: 0});
      
                                        
                                   
                                        next();
                    
                
                }else if(orders.length > 0 && testCombinaisons2(orders, parseInt(req.body.amount)) && testCombinaisons2(orders, parseInt(req.body.amount)).length > 0){
                  
                  const orderrs = testCombinaisons2(orders, parseInt(req.body.amount)); 
                  
                              for(let orderr of orderrs){
                    
                      const recovery = {
            
                                      author_id: user.agg_id, 
                                      amount: orderr.rest && orderr.rest > 0 ? orderr.rest : orderr.amount, 
                                      date: new Date(), 
                                      return: true
      
                                    }
                      
                      const recoveries = orderr.recoveries ? orderr.recoveries : []; 
                      recoveries.push(recovery);
                      
                      
                                      
                       await  Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", rest: 0, recoveries}})
                  
                  }
                  
                        const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: true, 
                            date: new Date(), 
                           // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                            message: `Utilisé en retour complet pour les commandes : ${orderrs.map(item => {
                              const date = new Date(item.date);
                              const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                              return `Recouvrement ${item.rest && item.rest > 0 ? " du reste de "+ item.rest +"Fcfa de " : "de"} la commande  ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                            }).join(', ')}`
                                                });
      
                                        await newOrder.save(); 
      
                                        //console.log("On est dans le 2 x 2 ")
      
                                        res.status(201).json({status: 0});
      
                                      
                                        next();
                  
                  
      
                    
                  
                  
                }else if(initials.length > 0 && countAmountsToTarget(initials, parseInt(req.body.amount)) && countAmountsToTarget(initials, parseInt(req.body.amount)).length > 0){
                  
            
                  
                  const orderrs = countAmountsToTarget(initials, parseInt(req.body.amount)); 
                        console.log("c'est la magie", orderrs);
                  
                  for(let orderr of orderrs){
                    
                                      const recovery = {
            
                                      author_id: user.agg_id, 
                                      amount: orderr.rest && orderr.rest > 0 ? parseInt(orderr.amount) - parseInt(orderr.rest) : orderr.amount, 
                                      date: new Date(), 
                                      return: true
      
                                    }
                      
             
                      
                      
                                      
                       await  Order.updateOne({_id: orderr._id}, {$set: {status: orderr.rest && orderr.rest > 0 ? "partial" : "recovery", rest: orderr.rest && orderr.rest > 0 ? orderr.rest : 0, recoveries: [recovery]}})
                  }
                  
                          const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: true, 
                            date: new Date(), 
                           // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                            message: `Utilisé en retour pour les commandes : ${orderrs.map(item => {
                              const date = new Date(item.date);
                              const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                              return `Recouvrement ${item.rest && item.rest > 0 ? " partiel de "+  `${(parseInt(item.amount) - parseInt(item.rest))}` + "Fcfa de " : "de"} la commande  ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                            }).join(', ')}`
                                                });
                  
                  
                          await newOrder.save();  
                          res.status(201).json({status: 0});
      
                    
                          next();
                  
                  
                }else if(partials.length > 0 && countAmountsToTarget2(partials, parseInt(req.body.amount)) && countAmountsToTarget2(partials, parseInt(req.body.amount)).length > 0){
                  
            
                  const orderrs = countAmountsToTarget2(partials, parseInt(req.body.amount)); 
                        console.log("c'est la seconde magie magie", orderrs);
                  
                  for(let orderr of orderrs){
                    
                                    const recovery = {
            
                                      author_id: user.agg_id, 
                                      amount: orderr.rest2 && orderr.rest2 > 0 ? (parseInt(orderr.rest) - parseInt(orderr.rest2)) : orderr.rest, 
                                      date: new Date(), 
                                      return: true
      
                                    }
                                      
                                const recoveries =  orderr.recoveries; 
                                recoveries.push(recovery);
                      
             
                      
                      
                                      
                       await  Order.updateOne({_id: orderr._id}, {$set: {status: orderr.rest2 && orderr.rest2 > 0 ? "partial" : "recovery", rest: orderr.rest2 && orderr.rest2 > 0 ?  parseInt(orderr.rest2) : 0, recoveries}})
                  }
                  
                          const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: true, 
                            date: new Date(), 
                           // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                            message: `Utilisé en retour pour les commandes : ${orderrs.map(item => {
                              const date = new Date(item.date);
                              const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                              return `Recouvrement  ${item.rest2 && item.rest2 > 0 ? "partiel de " + `${(parseInt(item.rest) - parseInt(item.rest2))}` +" Fcfa de " : "de "+ item.rest + "Fcfa pour boucler " }  la commande  ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                            }).join(', ')}`
                                                });
                  
                  
                          await newOrder.save();  
                          res.status(201).json({status: 0});
      
           
                  next();
                  
                  
                }else if(orders.length > 0 && countAmountsToTarget2(orders, parseInt(req.body.amount)) && countAmountsToTarget2(orders, parseInt(req.body.amount)).length > 0){
                  
                              const orderrs = countAmountsToTarget2(orders, parseInt(req.body.amount)); 
                              
                              console.log("c'est la troisième magie", orderrs);
                  
                              for(let orderr of orderrs){
                                
                                  const recovery = {
                                      author_id: user.agg_id, 
                                      amount: (orderr.rest && orderr.rest > 0) ? orderr.rest2 && orderr.rest2 > 0 ?  (parseInt(orderr.rest) - parseInt(orderr.rest2)) : orderr.rest : orderr.rest2 && orderr.rest2 > 0 ? (parseInt(orderr.amount) - parseInt(orderr.rest2)) : orderr.amount , 
                                      date: new Date(), 
                                      return: true
                                  }
                                  
                                const recoveries = orderr.rest && orderr.rest > 0 ? orderr.recoveries : [] ; 
                                
                                recoveries.push(recovery);
                                
                                await  Order.updateOne({_id: orderr._id}, {$set: {status: orderr.rest2 && orderr.rest2 > 0 ? "partial" : "recovery", rest: (orderr.rest && orderr.rest > 0) ? orderr.rest2 && orderr.rest2 > 0 ? parseInt(orderr.rest) - parseInt(orderr.rest2) : 0 : orderr.rest2 && orderr.rest2 > 0 ? parseInt(orderr.amount) - parseInt(orderr.rest2) : 0 , recoveries}})
                      
                              }
                  
                          const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: true, 
                            date: new Date(), 
                           // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                            message: `Utilisé en retour pour les commandes : ${orderrs.map(item => {
                              const date = new Date(item.date);
                              const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                              return `Recouvrement ${item.rest2 && item.rest2 > 0 ? " partiel de "+ `${item.rest && item.rest > 0 ? (parseInt(item.rest) - parseInt(item.rest2)) : (parseInt(item.amount) - parseInt(item.rest2)) }` +"Fcfa de " : "de"} la commande  ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                            }).join(', ')}`
                                                });
                  
                  
                          await newOrder.save();  
                          res.status(201).json({status: 0});
      
             
                  next();
                  
                  
                }else if(orders.length > 0 && findClosestCombination(orders, parseInt(req.body.amount)).array.length > 0){
                  
                 // console.log("c'est le boss")
                  
                  const orderrs = findClosestCombination(orders, parseInt(req.body.amount)).array; 
                  const theAmount = findClosestCombination(orders, parseInt(req.body.amount)).rest; 
                  
                        for(let orderr of orderrs){
                                
                                  const recovery = {
                                      author_id: user.agg_id, 
                                      amount: (orderr.rest && orderr.rest > 0) ?  orderr.rest : orderr.amount, 
                                      date: new Date(), 
                                      return: true
                                  }
                                  
                                const recoveries = orderr.rest && orderr.rest > 0 ? orderr.recoveries : []; 
                                
                                recoveries.push(recovery);
                                
                                await  Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", rest: 0, recoveries}}); 
                          
                      
                              }
                  
                          const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: true, 
                            date: new Date(), 
                            rest: parseInt(theAmount),
                           // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                            message: `Utilisé en retour complet pour les commandes : ${orderrs.map(item => {
                              const date = new Date(item.date);
                              const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                              return `Recouvrement ${item.rest && item.rest > 0 ? "de "+ item.rest +  " Fcfa pour boucler " :  "de " } la commande  ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                            }).join(', ')}`
                                                });
                  
                  
                          await newOrder.save();  
                          res.status(201).json({status: 0});
                  
                
                        next();
                  
                  
                }else if(initials.length > 0 && initials.filter(item => parseInt(item.amount) > parseInt(req.body.amount)).length > 0){
                  
                    console.log("C'est la folie des initials");
                  
                  const orderr = initials.filter(item => parseInt(item.amount) > parseInt(req.body.amount))[0]; 
                  
                                      const recovery = {
            
                                      author_id: user.agg_id, 
                                      amount: req.body.amount, 
                                      date: new Date(), 
                                      return: true
      
                                    }
                                      
                       await  Order.updateOne({_id: orderr._id}, {$set: {status: "partial", rest: parseInt(orderr.amount) - parseInt(req.body.amount), recoveries: [recovery]}})
                  
                          const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: true, 
                            date: new Date(), 
                            message: `Utilisé en retour partiel pour la commande ${orderr.type} de  ${parseInt(orderr.amount)} Fcfa du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
      
                          });
                  
                  await newOrder.save(); 
                  
                  //console.log("On est dans le 2")
                  
                  res.status(201).json({status: 0});
                  
                    
                  next();
                  
                
                }else if(partials.length > 0 && partials.filter(item => parseInt(item.rest) > parseInt(req.body.amount)).length > 0){
                  
                     console.log("C'est le three partial");
                  
                    const orderr = partials.filter(item => parseInt(item.rest) > parseInt(req.body.amount))[0]; 
                  
                                      const recovery = {
            
                                      author_id: user.agg_id, 
                                      amount: req.body.amount, 
                                      date: new Date(), 
                                      return: true
      
                                    }
                                      
                                const recoveries = orderr.recoveries; 
                                recoveries.push(recovery)
                                      
                       await  Order.updateOne({_id: orderr._id}, {$set: {rest: parseInt(orderr.rest) - parseInt(req.body.amount) , recoveries}})
                  
                          const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: true, 
                            date: new Date(), 
                            message: `Utilisé en retour partiel pour la commande ${orderr.type} de ${parseInt(orderr.amount)} Fcfa du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
      
                          });
                  
                  await newOrder.save(); 
                  
                  //console.log("On est dans le 2")
                  
                  res.status(201).json({status: 0});
                  
                  
                  next();
                    
                
                }else{
                  
                       console.log("C'est le sinon partial");
                          const newOrder = new Order({
            
                            amount: parseInt(req.body.amount),
                            phone: req.body.phone,
                            rec_id: user.rec_id, 
                            agg_id: user.agg_id, 
                            type: req.body.type, 
                            status: "return", 
                            agent_id: user._id,
                            read: false, 
                            date: new Date(), 
                          //  message: `Utilisé en retour pour boucler avec ${orderr.rest} Fcfa la commande ${orderr.type} de ${orderr.amount} Fcfa du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()} à ${new Date(orderr.date).getHours()}h:${new Date(orderr.date).getHours()}mn`
      
                          });
                  
                  await newOrder.save(); 
                  
                  res.status(201).json({status: 0});
              
                  next()
                  
                  
                }
                

              
              
            }
          
        }else{


            const orders = await Order.find({agent_id: user._id, status: {$in: ["initial", 'partial']}, type: {$in: ["am", "mm"]}}).sort({date: -1}); 
          
            console.log("on met le faya"); 
            
            const initials = orders.filter(item => item.status == "initial"); 
            const partials = orders.filter(item => item.status == "partial");
            
            let finalOrders = [];
            
            if(initials.length > 0 && initials.filter(item => parseInt(item.amount) == parseInt(req.body.amount)).length > 0){
              
             
              
                const orderr = initials.filter(item => parseInt(item.amount) == parseInt(req.body.amount))[0]; 
                
                console.log("C'est le One", orderr);
              
                      const recovery = {
        
                                  author_id: user.agg_id, 
                                  amount: req.body.amount, 
                                  date: new Date(), 
                                  return: true
  
                                }
              
                await Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", recoveries: [recovery]}}); 
              
                    const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: true, 
                        date: new Date(), 
                        message: `Utilisé en retour complet pour la commande ${orderr.type} de ${req.body.amount} Fcfa du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()} à ${new Date(orderr.date).getHours()}h:${new Date(orderr.date).getHours()}mn`
  
                      });
              
              await newOrder.save(); 
              
              res.status(201).json({status: 0});
              
         
              next();
                
            
            }else if(initials.length > 0 && testCombinaisons(initials, parseInt(req.body.amount) ) && testCombinaisons(initials, parseInt(req.body.amount) ).length > 0){
              
            
              
              const orderrs = testCombinaisons(initials, parseInt(req.body.amount)); 
              
              //console.log(orders); 
                console.log("c'est par ici", orderrs);
              
              for(let orderr of orderrs){
                
                  const recovery = {
        
                                  author_id: user.agg_id, 
                                  amount: req.body.amount, 
                                  date: new Date(), 
                                  return: true
  
                                }
                                  
                   await  Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", recoveries: [recovery]}})
              
              }
              
                    const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: true, 
                        date: new Date(), 
                       // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                        message: `Utilisé en retour complet pour les commandes : ${orderrs.map(item => {
    const date = new Date(item.date);
    const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
    return `la commande ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
  }).join(', ')}`
                      });
              
              await newOrder.save(); 
              
             // console.log("On est dans le 2 x 2 ")
              
              res.status(201).json({status: 0});
              
           
              next();
                
            }else if(partials.length > 0 && partials.filter(item => parseInt(item.rest) == parseInt(req.body.amount)).length > 0){
              
              
                const orderr = partials.filter(item => parseInt(item.rest) == parseInt(req.body.amount))[0]; 
                
               console.log("C'est le One partial", orderr);
              
                      const recovery = {
        
                                  author_id: user.agg_id, 
                                  amount: orderr.rest, 
                                  date: new Date(), 
                                  return: true
  
                                }
                      
                  const recoveries = orderr.recoveries; 
                  recoveries.push(recovery);
              
                await Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", rest: 0,  recoveries}}); 
              
                    const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: true, 
                        date: new Date(), 
                        message: `Utilisé en retour pour boucler avec ${orderr.rest} Fcfa la commande ${orderr.type} de ${orderr.amount} Fcfa du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()} à ${new Date(orderr.date).getHours()}h:${new Date(orderr.date).getHours()}mn`
  
                      });
              
              await newOrder.save(); 
              
              res.status(201).json({status: 0});
                
          
              next();
            
            }else if(partials.length > 0 && testCombinaisons(partials, parseInt(req.body.amount) ) && testCombinaisons(partials, parseInt(req.body.amount) ).length > 0){
              
              //console.log("c'est par ici");
              
              
              const orderrs = testCombinaisons(partials, parseInt(req.body.amount)); 
              
            //  console.log(orders); 
                 console.log("C'est le two partial", orderrs);
              
              for(let orderr of orderrs){
                
                  const recovery = {
        
                                  author_id: user.agg_id, 
                                  amount: orderr.rest, 
                                  date: new Date(), 
                                  return: true
  
                                }
                  
                  const recoveries = orderr.recoveries; 
                  recoveries.push(recovery);
                  
                  
                                  
                   await  Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", rest: 0, recoveries}})
              
              }
              
                    const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: true, 
                        date: new Date(), 
                       // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                        message: `Utilisé en retour complet pour les restes des commandes : ${orderrs.map(item => {
                          const date = new Date(item.date);
                          const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                          return `Recouvrement du reste de ${item.rest} Fcfa de la commande ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                        }).join(', ')}`
                                            });
  
                                    await newOrder.save(); 
  
                                    //console.log("On est dans le 2 x 2 ")
  
                                    res.status(201).json({status: 0});
  
                                    
                           
                                    next();
                
            
            }else if(orders.length > 0 && testCombinaisons2(orders, parseInt(req.body.amount)) && testCombinaisons2(orders, parseInt(req.body.amount)).length > 0){
              
              const orderrs = testCombinaisons2(orders, parseInt(req.body.amount)); 
              
                          for(let orderr of orderrs){
                
                  const recovery = {
        
                                  author_id: user.agg_id, 
                                  amount: orderr.rest && orderr.rest > 0 ? orderr.rest : orderr.amount, 
                                  date: new Date(), 
                                  return: true
  
                                }
                  
                  const recoveries = orderr.recoveries ? orderr.recoveries : []; 
                  recoveries.push(recovery);
                  
                  
                                  
                   await  Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", rest: 0, recoveries}})
              
              }
              
                    const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: true, 
                        date: new Date(), 
                       // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                        message: `Utilisé en retour complet pour les commandes : ${orderrs.map(item => {
                          const date = new Date(item.date);
                          const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                          return `Recouvrement ${item.rest && item.rest > 0 ? " du reste de "+ item.rest +"Fcfa de " : "de"} la commande  ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                        }).join(', ')}`
                                            });
  
                                    await newOrder.save(); 
  
                                    //console.log("On est dans le 2 x 2 ")
  
                                    res.status(201).json({status: 0});
  
                        
                                    next();
              
              
  
                
              
              
            }else if(initials.length > 0 && countAmountsToTarget(initials, parseInt(req.body.amount)) && countAmountsToTarget(initials, parseInt(req.body.amount)).length > 0){
              
        
              
              const orderrs = countAmountsToTarget(initials, parseInt(req.body.amount)); 
                    console.log("c'est la magie", orderrs);
              
              for(let orderr of orderrs){
                
                                  const recovery = {
        
                                  author_id: user.agg_id, 
                                  amount: orderr.rest && orderr.rest > 0 ? parseInt(orderr.amount) - parseInt(orderr.rest) : orderr.amount, 
                                  date: new Date(), 
                                  return: true
  
                                }
                  
         
                  
                  
                                  
                   await  Order.updateOne({_id: orderr._id}, {$set: {status: orderr.rest && orderr.rest > 0 ? "partial" : "recovery", rest: orderr.rest && orderr.rest > 0 ? orderr.rest : 0, recoveries: [recovery]}})
              }
              
                      const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: true, 
                        date: new Date(), 
                       // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                        message: `Utilisé en retour pour les commandes : ${orderrs.map(item => {
                          const date = new Date(item.date);
                          const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                          return `Recouvrement ${item.rest && item.rest > 0 ? " partiel de "+  `${(parseInt(item.amount) - parseInt(item.rest))}` + "Fcfa de " : "de"} la commande  ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                        }).join(', ')}`
                                            });
              
              
                      await newOrder.save();  
                      res.status(201).json({status: 0});
  
               
                      next();
              
              
            }else if(partials.length > 0 && countAmountsToTarget2(partials, parseInt(req.body.amount)) && countAmountsToTarget2(partials, parseInt(req.body.amount)).length > 0){
              
        
              const orderrs = countAmountsToTarget2(partials, parseInt(req.body.amount)); 
                    console.log("c'est la seconde magie magie", orderrs);
              
              for(let orderr of orderrs){
                
                                const recovery = {
        
                                  author_id: user.agg_id, 
                                  amount: orderr.rest2 && orderr.rest2 > 0 ? (parseInt(orderr.rest) - parseInt(orderr.rest2)) : orderr.rest, 
                                  date: new Date(), 
                                  return: true
  
                                }
                                  
                            const recoveries =  orderr.recoveries; 
                            recoveries.push(recovery);
                  
         
                  
                  
                                  
                   await  Order.updateOne({_id: orderr._id}, {$set: {status: orderr.rest2 && orderr.rest2 > 0 ? "partial" : "recovery", rest: orderr.rest2 && orderr.rest2 > 0 ?  parseInt(orderr.rest2) : 0, recoveries}})
              }
              
                      const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: true, 
                        date: new Date(), 
                       // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                        message: `Utilisé en retour pour les commandes : ${orderrs.map(item => {
                          const date = new Date(item.date);
                          const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                          return `Recouvrement  ${item.rest2 && item.rest2 > 0 ? "partiel de " + `${(parseInt(item.rest) - parseInt(item.rest2))}` +" Fcfa de " : "de "+ item.rest + "Fcfa pour boucler " }  la commande  ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                        }).join(', ')}`
                                            });
              
              
                      await newOrder.save();  
                      res.status(201).json({status: 0});
  
          
                      next();
              
              
            }else if(orders.length > 0 && countAmountsToTarget2(orders, parseInt(req.body.amount)) && countAmountsToTarget2(orders, parseInt(req.body.amount)).length > 0){
              
                          const orderrs = countAmountsToTarget2(orders, parseInt(req.body.amount)); 
                          
                          console.log("c'est la troisième magie", orderrs);
              
                          for(let orderr of orderrs){
                            
                              const recovery = {
                                  author_id: user.agg_id, 
                                  amount: (orderr.rest && orderr.rest > 0) ? orderr.rest2 && orderr.rest2 > 0 ?  (parseInt(orderr.rest) - parseInt(orderr.rest2)) : orderr.rest : orderr.rest2 && orderr.rest2 > 0 ? (parseInt(orderr.amount) - parseInt(orderr.rest2)) : orderr.amount , 
                                  date: new Date(), 
                                  return: true
                              }
                              
                            const recoveries = orderr.rest && orderr.rest > 0 ? orderr.recoveries : [] ; 
                            
                            recoveries.push(recovery);
                            
                            await  Order.updateOne({_id: orderr._id}, {$set: {status: orderr.rest2 && orderr.rest2 > 0 ? "partial" : "recovery", rest: (orderr.rest && orderr.rest > 0) ? orderr.rest2 && orderr.rest2 > 0 ? parseInt(orderr.rest) - parseInt(orderr.rest2) : 0 : orderr.rest2 && orderr.rest2 > 0 ? parseInt(orderr.amount) - parseInt(orderr.rest2) : 0 , recoveries}})
                  
                          }
              
                      const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: true, 
                        date: new Date(), 
                       // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                        message: `Utilisé en retour pour les commandes : ${orderrs.map(item => {
                          const date = new Date(item.date);
                          const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                          return `Recouvrement ${item.rest2 && item.rest2 > 0 ? " partiel de "+ `${item.rest && item.rest > 0 ? (parseInt(item.rest) - parseInt(item.rest2)) : (parseInt(item.amount) - parseInt(item.rest2)) }` +"Fcfa de " : "de"} la commande  ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                        }).join(', ')}`
                                            });
              
              
                      await newOrder.save();  
                      res.status(201).json({status: 0});
  
            
                      next();
              
              
            }else if(orders.length > 0 && findClosestCombination(orders, parseInt(req.body.amount)).array.length > 0){
              
             // console.log("c'est le boss")
              
              const orderrs = findClosestCombination(orders, parseInt(req.body.amount)).array; 
              const theAmount = findClosestCombination(orders, parseInt(req.body.amount)).rest; 
              
                    for(let orderr of orderrs){
                            
                              const recovery = {
                                  author_id: user.agg_id, 
                                  amount: (orderr.rest && orderr.rest > 0) ?  orderr.rest : orderr.amount, 
                                  date: new Date(), 
                                  return: true
                              }
                              
                            const recoveries = orderr.rest && orderr.rest > 0 ? orderr.recoveries : []; 
                            
                            recoveries.push(recovery);
                            
                            await  Order.updateOne({_id: orderr._id}, {$set: {status: "recovery", rest: 0, recoveries}}); 
                      
                  
                          }
              
                      const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: true, 
                        date: new Date(), 
                        rest: parseInt(theAmount),
                       // message: `Utilisé en retour partiel pour les commandes  de ${req.body.amount} Fcfa de ${user.name} du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
                        message: `Utilisé en retour complet pour les commandes : ${orderrs.map(item => {
                          const date = new Date(item.date);
                          const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} à ${date.getHours()}h:${date.getMinutes()}mn`;
                          return `Recouvrement ${item.rest && item.rest > 0 ? "de "+ item.rest +  " Fcfa pour boucler " :  "de " } la commande  ${item.type} de ${item.amount} FCFA du  ${formattedDate}`;
                        }).join(', ')}`
                                            });
              
              
                      await newOrder.save();  
                      res.status(201).json({status: 0});
              
               
                      next();
              
              
            }else if(initials.length > 0 && initials.filter(item => parseInt(item.amount) > parseInt(req.body.amount)).length > 0){
              
                console.log("C'est la folie des initials");
              
              const orderr = initials.filter(item => parseInt(item.amount) > parseInt(req.body.amount))[0]; 
              
                                  const recovery = {
        
                                  author_id: user.agg_id, 
                                  amount: req.body.amount, 
                                  date: new Date(), 
                                  return: true
  
                                }
                                  
                   await  Order.updateOne({_id: orderr._id}, {$set: {status: "partial", rest: parseInt(orderr.amount) - parseInt(req.body.amount), recoveries: [recovery]}})
              
                      const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: true, 
                        date: new Date(), 
                        message: `Utilisé en retour partiel pour la commande ${orderr.type} de  ${parseInt(orderr.amount)} Fcfa du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
  
                      });
              
              await newOrder.save(); 
              
              //console.log("On est dans le 2")
              
              res.status(201).json({status: 0});
              
             
              next();
              
            
            }else if(partials.length > 0 && partials.filter(item => parseInt(item.rest) > parseInt(req.body.amount)).length > 0){
              
                 console.log("C'est le three partial");
              
                const orderr = partials.filter(item => parseInt(item.rest) > parseInt(req.body.amount))[0]; 
              
                                  const recovery = {
        
                                  author_id: user.agg_id, 
                                  amount: req.body.amount, 
                                  date: new Date(), 
                                  return: true
  
                                }
                                  
                            const recoveries = orderr.recoveries; 
                            recoveries.push(recovery)
                                  
                   await  Order.updateOne({_id: orderr._id}, {$set: {rest: parseInt(orderr.rest) - parseInt(req.body.amount) , recoveries}})
              
                      const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: true, 
                        date: new Date(), 
                        message: `Utilisé en retour partiel pour la commande ${orderr.type} de ${parseInt(orderr.amount)} Fcfa du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()}`
  
                      });
              
              await newOrder.save(); 
              
              //console.log("On est dans le 2")
              
              res.status(201).json({status: 0});
              
         
              next();
                
            
            }else{
              
                   console.log("C'est le sinon partial");
                      const newOrder = new Order({
        
                        amount: parseInt(req.body.amount),
                        phone: req.body.phone,
                        rec_id: user.rec_id, 
                        agg_id: user.agg_id, 
                        type: req.body.type, 
                        status: "return", 
                        agent_id: user._id,
                        read: false, 
                        date: new Date(), 
                      //  message: `Utilisé en retour pour boucler avec ${orderr.rest} Fcfa la commande ${orderr.type} de ${orderr.amount} Fcfa du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()} à ${new Date(orderr.date).getHours()}h:${new Date(orderr.date).getHours()}mn`
  
                      });
              
              await newOrder.save(); 
              
              res.status(201).json({status: 0});
       
              next();
              
              
            }
            
          
          
            
        }       
          

        
      }else{
        
           const newOrder = new Order({
      
                      amount: parseInt(req.body.amount),
                      phone: req.body.phone,
                      type: req.body.type, 
                      status: "return", 
                      read: true, 
                      date: new Date(), 
                    //  message: `Utilisé en retour pour boucler avec ${orderr.rest} Fcfa la commande ${orderr.type} de ${orderr.amount} Fcfa du ${new Date(orderr.date).getDate()}/${new Date(orderr.date).getMonth() + 1}/${new Date(orderr.date).getFullYear()} à ${new Date(orderr.date).getHours()}h:${new Date(orderr.date).getHours()}mn`

                    });
            
            await newOrder.save(); 
        
          res.status(200).json({status: 5}); 
  
          next();
      }
      
      
      
    }catch(e){
      
        console.log(e); 
        res.status(505).json({e})
    }
  

          
  
}