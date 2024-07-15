const express = require("express"); 

const router = express.Router(); 

const auth = require("../middleware/auth"); 

const cashCtrl = require("../controllers/Cash"); 

router.post("/addcash", auth, cashCtrl.addCash);



module.exports = router; 