const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getProfile, getTimetable, getResults, getAttendance, getFees, getAnnouncements, getMaterials } = require('../controllers/studentController');
const { createOrder, verifyPayment } = require('../controllers/feesController');

router.use(protect, authorize('student'));

router.get('/profile',              getProfile);
router.get('/timetable',            getTimetable);
router.get('/results',              getResults);
router.get('/attendance',           getAttendance);
router.get('/fees',                 getFees);
router.get('/announcements',        getAnnouncements);
router.get('/materials',            getMaterials);
router.post('/fees/create-order',   createOrder);
router.post('/fees/verify-payment', verifyPayment);

module.exports = router;
