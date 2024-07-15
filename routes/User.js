const express = require("express"); 

const router = express.Router(); 

const userCtrl = require("../controllers/User"); 

const auth = require("../middleware/auth");

router.post("/adduser", userCtrl.addUser); 
router.post("/onlogin", userCtrl.login);
router.get("/getuser", auth, userCtrl.getUser)
router.post("/updateservice", auth, userCtrl.updateService);
router.post("/addservice", auth, userCtrl.addService);


module.exports = router;