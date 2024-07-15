const express = require("express"); 

const router = express.Router(); 

const serviceCtrl = require("../controllers/Service"); 

const auth = require("../middleware/auth");

router.post('/getstatus', auth, serviceCtrl.getServiceStatus); 


module.exports = router;