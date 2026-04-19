const express = require('express');
const router  = express.Router();
const { getPublicAnnouncements, getGallery, submitContact, submitAdmission } = require('../controllers/publicController');

router.get('/announcements', getPublicAnnouncements);
router.get('/gallery',       getGallery);
router.post('/contact',      submitContact);
router.post('/admissions',   submitAdmission);

module.exports = router;
