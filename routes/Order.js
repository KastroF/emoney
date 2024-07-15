const express = require("express"); 

const router = express.Router(); 

const auth = require("../middleware/auth"); 

const orderCtrl = require("../controllers/Order"); 

router.post("/addorder", auth, orderCtrl.addOrder);
router.post("/checkenvoi", auth, orderCtrl.checkSendSMS);
router.post("/getorders", auth, orderCtrl.getOrders);
router.post("/recoveryall", auth, orderCtrl.recoveryAll)
router.post("/torecovery", auth, orderCtrl.toRecovery);
router.post("/launchorder", auth, orderCtrl.launchOrder);
router.get("/getpendingorders", auth, orderCtrl.getPendingOrders); 
router.post("/updateorderr", auth, orderCtrl.updateOrderr);
router.post("/minutestest", auth, orderCtrl.minutesTest);
router.post("/getreports", auth, orderCtrl.getReports);
router.post("/deleteorder", auth, orderCtrl.deleteOrder);
router.post("/managereturns", auth, orderCtrl.manageReturns);


module.exports = router; 