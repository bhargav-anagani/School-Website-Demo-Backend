const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { 
  getStats, getAllUsers, createUser, updateUser, deleteUser,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getAdmissions, updateAdmissionStatus, 
  getContactSubmissions, updateContactStatus, deleteContactSubmission,
  addGalleryItem, deleteGalleryItem, getAllDetailedUsers,
  getStudentsFees, assignFee, updateFee,
  markTeacherAttendance, getTeacherAttendanceLogs, paySalary 
} = require('../controllers/adminController');
const { upload } = require('../utils/s3Service');

router.use(protect, authorize('admin'));

router.get('/stats', getStats);

// Users
router.get('/users',          getAllUsers);
router.get('/users/detailed', getAllDetailedUsers);
router.post('/users',         createUser);
router.put('/users/:id',      updateUser);
router.delete('/users/:id',   deleteUser);

// Announcements
router.get('/announcements',     getAnnouncements);
router.post('/announcements',    createAnnouncement);
router.put('/announcements/:id', updateAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

// Admissions & Careers
router.get('/admissions',        getAdmissions);
router.put('/admissions/:id',    updateAdmissionStatus);

// Contacts
router.get('/contacts',          getContactSubmissions);
router.put('/contacts/:id',      updateContactStatus);
router.delete('/contacts/:id',   deleteContactSubmission);

// Fees Management
router.get('/students-fees',     getStudentsFees);
router.post('/fees',             assignFee);
router.put('/fees/:id',          updateFee);

// Gallery
router.post('/gallery',          upload.single('file'), addGalleryItem);
router.delete('/gallery/:id',    deleteGalleryItem);

// Teacher Management
router.post('/attendance/teacher', markTeacherAttendance);
router.get('/attendance/teacher',  getTeacherAttendanceLogs);
router.post('/salary/pay',         paySalary);

module.exports = router;
