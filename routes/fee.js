const express = require('express');
const router = express.Router();
const feeController = require('../controllers/fee');

//HTTP POST /fees
router.post('/fees', feeController.createFee);

//HTTP GET /removefees
router.get('/removefees', feeController.removeFees);

//HTTP POST /compute-transaction-fee
router.post('/compute-transaction-fee', feeController.computeFees);

module.exports = router;
