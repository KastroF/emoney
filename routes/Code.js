const express = require("express"); 

const router = express.Router(); 

const codeCtrl = require("../controllers/Code");

router.post("/addcode", codeCtrl.addCode);
router.get("/getcode", codeCtrl.getCode);


module.exports = router;