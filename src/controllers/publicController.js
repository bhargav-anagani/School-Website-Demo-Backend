// ─────────────────────────────────────────────────────────────
// Public Controller — announcements, gallery, contact, admissions
// ─────────────────────────────────────────────────────────────
const { pool } = require('../config/db');

// ── PUBLIC ANNOUNCEMENTS ──────────────────────────────────────
const getPublicAnnouncements = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.content, a.created_at, u.name AS author_name
       FROM announcements a JOIN users u ON a.author_id = u.id
       WHERE a.is_public = TRUE ORDER BY a.created_at DESC LIMIT 10`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── GALLERY ───────────────────────────────────────────────────
const getGallery = async (req, res, next) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM gallery WHERE 1=1';
    const params = [];
    if (category) { query += ' AND category = ?'; params.push(category); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);

    // Get distinct categories
    const [categories] = await pool.query('SELECT DISTINCT category FROM gallery ORDER BY category');

    res.json({ success: true, data: rows, categories: categories.map(c => c.category) });
  } catch (err) { next(err); }
};

// ── CONTACT FORM ──────────────────────────────────────────────
const submitContact = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }
    await pool.query(
      'INSERT INTO contact_submissions (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, subject || null, message]
    );
    res.status(201).json({ success: true, message: 'Your message has been sent. We will get back to you soon!' });
  } catch (err) { next(err); }
};

// ── ADMISSIONS / CAREERS APPLICATION ──────────────────────────
const submitAdmission = async (req, res, next) => {
  try {
    const { 
      applicant_name, dob, class_applied, parent_name, email, phone, 
      address, previous_school, form_type, resume_url 
    } = req.body;
    
    if (!applicant_name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }
    
    // For student admissions, class and parent name are usually required
    if (form_type === 'admission' && (!class_applied || !parent_name)) {
        return res.status(400).json({ success: false, message: 'Class and Parent name are required for admissions.' });
    }

    const [result] = await pool.query(
      `INSERT INTO admissions (applicant_name, dob, class_applied, parent_name, email, phone, address, previous_school, form_type, resume_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        applicant_name, dob || null, class_applied || null, parent_name || null, 
        email, phone, address || null, previous_school || null, 
        form_type || 'admission', resume_url || null
      ]
    );
    res.status(201).json({
      success: true,
      message: `${form_type === 'career' ? 'Job application' : 'Admission application'} submitted successfully!`,
      data: { id: result.insertId },
    });
  } catch (err) { next(err); }
};

module.exports = { getPublicAnnouncements, getGallery, submitContact, submitAdmission };
