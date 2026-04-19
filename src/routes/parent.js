const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getProfile, getChildResults, getChildAttendance, getChildFees, getAnnouncements, getMaterials } = require('../controllers/parentController');
const { createOrder, verifyPayment } = require('../controllers/feesController');

router.use(protect, authorize('parent'));

router.get('/profile',              getProfile);
router.get('/child/results',        getChildResults);
router.get('/child/attendance',     getChildAttendance);
router.get('/child/fees',           getChildFees);
router.get('/announcements',        getAnnouncements);
router.get('/materials',            getMaterials);
router.post('/fees/create-order',   createOrder);
router.post('/fees/verify-payment', verifyPayment);

module.exports = router;
