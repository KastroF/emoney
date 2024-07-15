const express = require("express"); 

const router = express.Router(); 

const partnerCtrl = require("../controllers/Partner"); 

const auth = require("../middleware/auth");

router.post("/addPartner", auth, partnerCtrl.addPartner); 
router.post("/getpartners", auth, partnerCtrl.getPartners);
router.post("/getpartner", auth, partnerCtrl.getPartner);
router.post("/partnerstatus", auth, partnerCtrl.lockOrUnlockPartner)
router.get("/getrecs", auth, partnerCtrl.getRecs);
router.post("/updatepartner", auth, partnerCtrl.updatePartner);
router.post("/morepartners", auth, partnerCtrl.morePartners);
router.post("/searchpartners", auth, partnerCtrl.searchPartners); 
router.get("/getrecs", auth, partnerCtrl.getRecs); 


module.exports = router; 