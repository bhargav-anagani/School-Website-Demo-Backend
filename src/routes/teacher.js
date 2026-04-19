const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getProfile, getClasses, getStudents, markAttendance, getAttendanceRecords, uploadResults, getResults, getAnnouncements, postAnnouncement, uploadMaterial, getMaterials } = require('../controllers/teacherController');
const { upload } = require('../utils/s3Service');

router.use(protect, authorize('teacher'));

router.get('/profile',      getProfile);
router.get('/classes',      getClasses);
router.get('/students',     getStudents);
router.get('/attendance',   getAttendanceRecords);
router.post('/attendance',  markAttendance);
router.get('/results',      getResults);
router.post('/results',     uploadResults);
router.get('/announcements',getAnnouncements);
router.post('/announcements',postAnnouncement);
router.get('/materials',    getMaterials);
router.post('/materials',   upload.single('file'), uploadMaterial);

module.exports = router;
