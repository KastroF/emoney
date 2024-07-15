const express = require("express"); 
const mongoose = require("mongoose");

const cors = require('cors');
const requestMap = new Map();


const app = express();
app.use(cors());

app.use(express.json({limit: "50mb"})); 
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

    next();
  });

mongoose.connect("mongodb+srv://emoneysarl:2ItTxqHrRla49VUU@cluster0.pan21qj.mongodb.net/emoney?retryWrites=true&w=majority",

  { useNewUrlParser: true,
    useUnifiedTopology: true, autoIndex: true })
  .then(() => {
  
  
  console.log('Connexion à MongoDB réussie !'); 
     
              
              }) 

  .catch(() => console.log('Connexion à MongoDB échouée !'));


  const codeRouter = require("./routes/Code"); 
  const userRouter = require("./routes/User"); 
  const partnerRouter = require("./routes/Partner");
  const orderRouter = require("./routes/Order");
  const serviceRouter = require("./routes/Service");
  const cashRouter = require("./routes/Cash");


  app.use("/api/code", codeRouter);
  app.use("/api/user", userRouter);
  app.use("/api/partner", partnerRouter); 
  app.use("/api/order", orderRouter);
  app.use("/api/service", serviceRouter);
  app.use("/api/cash", cashRouter);

  module.exports = app;