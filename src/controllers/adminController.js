// ─────────────────────────────────────────────────────────────
// Admin Controller — manage users, students, announcements, stats
// ─────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { uploadToS3 } = require('../utils/s3Service');

// ── DASHBOARD STATS ───────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const [[{ users }]]      = await pool.query('SELECT COUNT(*) AS users FROM users');
    const [[{ admissions }]] = await pool.query("SELECT COUNT(*) AS admissions FROM admissions WHERE form_type = 'admission' AND status = 'pending'");
    const [[{ careers }]]    = await pool.query("SELECT COUNT(*) AS careers FROM admissions WHERE form_type = 'career' AND status = 'pending'");
    const [[{ contacts }]]   = await pool.query("SELECT COUNT(*) AS contacts FROM contact_submissions WHERE is_read = FALSE");
    const [[{ revenue }]]    = await pool.query("SELECT COALESCE(SUM(amount), 0) AS revenue FROM fees WHERE paid = TRUE");

    res.json({
      success: true,
      data: { users, admissions, careers, contacts, revenue },
    });
  } catch (err) { next(err); }
};

// ── GET ALL USERS ──────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    let query = 'SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    if (role)   { query += ' AND role = ?';            params.push(role); }
    if (search) { query += ' AND (name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── CREATE USER ────────────────────────────────────────────────
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const password_hash = await bcrypt.hash(password || 'Password@123', 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, password_hash, role, phone || null]
    );
    const userId = result.insertId;
    if (role === 'student') await pool.query('INSERT INTO students (user_id, class, section) VALUES (?, ?, ?)', [userId, req.body.class || '1', req.body.section || 'A']);
    else if (role === 'teacher') await pool.query('INSERT INTO teachers (user_id, subject) VALUES (?, ?)', [userId, req.body.subject || null]);
    else if (role === 'admin') await pool.query('INSERT INTO admins (user_id) VALUES (?)', [userId]);
    res.status(201).json({ success: true, message: 'User created.', data: { id: userId } });
  } catch (err) { next(err); }
};

// ── UPDATE USER ────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, is_active } = req.body;
    await pool.query('UPDATE users SET name = ?, phone = ?, is_active = ? WHERE id = ?', [name, phone, is_active, id]);
    res.json({ success: true, message: 'User updated.' });
  } catch (err) { next(err); }
};

// ── DELETE USER ────────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) { next(err); }
};

// ── ANNOUNCEMENTS ──────────────────────────────────────────────
const getAnnouncements = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS author_name FROM announcements a 
       JOIN users u ON a.author_id = u.id ORDER BY a.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, category, target_role, is_public } = req.body;
    const [result] = await pool.query(
      'INSERT INTO announcements (title, content, category, author_id, target_role, is_public) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, category || 'General', req.user.id, target_role || 'all', is_public || false]
    );
    res.status(201).json({ success: true, message: 'Announcement created.', data: { id: result.insertId } });
  } catch (err) { next(err); }
};

const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, category, target_role, is_public } = req.body;
    await pool.query(
      'UPDATE announcements SET title = ?, content = ?, category = ?, target_role = ?, is_public = ? WHERE id = ?',
      [title, content, category || 'General', target_role || 'all', is_public || false, id]
    );
    res.json({ success: true, message: 'Announcement updated.' });
  } catch (err) { next(err); }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err) { next(err); }
};

// ── ADMISSIONS MANAGEMENT ─────────────────────────────────────
const getAdmissions = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM admissions ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const updateAdmissionStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    await pool.query('UPDATE admissions SET status = ?, remarks = ? WHERE id = ?', [status, remarks, req.params.id]);
    res.json({ success: true, message: 'Admission status updated.' });
  } catch (err) { next(err); }
};

// ── FEE MANAGEMENT ────────────────────────────────────────────
const getStudentsFees = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.id AS student_id, u.name AS student_name, s.class, s.section, s.roll_no,
             f.id AS fee_id, f.amount AS pending_amount, f.due_date
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN fees f ON s.id = f.student_id AND f.paid = FALSE
      ORDER BY s.class ASC, s.section ASC, u.name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const assignFee = async (req, res, next) => {
  try {
    const { student_id, fee_type, amount, due_date } = req.body;
    await pool.query(
      'INSERT INTO fees (student_id, fee_type, amount, due_date) VALUES (?, ?, ?, ?)',
      [student_id, fee_type || 'Annual Fee', amount, due_date]
    );
    res.status(201).json({ success: true, message: 'Fee assigned.' });
  } catch (err) { next(err); }
};

const updateFee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    await pool.query('UPDATE fees SET amount = ? WHERE id = ?', [amount, id]);
    res.json({ success: true, message: 'Fee updated.' });
  } catch (err) { next(err); }
};

// ── CONTACT SUBMISSIONS ───────────────────────────────────────
const getContactSubmissions = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contact_submissions ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── GALLERY MANAGEMENT ────────────────────────────────────────
const addGalleryItem = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Image file is required.' });
    
    const { title, category } = req.body;
    const { url } = await uploadToS3(req.file, 'gallery');

    const [result] = await pool.query(
      'INSERT INTO gallery (title, image_url, category, uploaded_by) VALUES (?, ?, ?, ?)',
      [title || 'Untitled', url, category || 'Events', req.user.id]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, image_url: url } });
  } catch (err) { next(err); }
};

const deleteGalleryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Note: We could also delete from S3 here using file_key if we stored it
    await pool.query('DELETE FROM gallery WHERE id = ?', [id]);
    res.json({ success: true, message: 'Image deleted.' });
  } catch (err) { next(err); }
};

// ── CONTACT STATUS ────────────────────────────────────────────
const updateContactStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_read } = req.body;
    await pool.query('UPDATE contact_submissions SET is_read = ? WHERE id = ?', [is_read, id]);
    res.json({ success: true, message: 'Status updated.' });
  } catch (err) { next(err); }
};

const deleteContactSubmission = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM contact_submissions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Message deleted.' });
  } catch (err) { next(err); }
};

// ── DETAILED USER LISTS (FOR ADMIN TABS) ───────────────────────
const getAllDetailedUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    let rows = [];

    if (role === 'student') {
      [rows] = await pool.query(`
        SELECT u.id, u.name, u.email, u.phone, s.class, s.section, s.roll_no,
               tu.name AS mentor_name
        FROM users u
        JOIN students s ON u.id = s.user_id
        LEFT JOIN teachers t ON s.class = t.assigned_class AND s.section = t.assigned_section
        LEFT JOIN users tu ON t.user_id = tu.id
        ORDER BY s.class ASC, s.section ASC, u.name ASC
      `);
    } else if (role === 'teacher') {
      const month = new Date().toLocaleString('en-US', { month: 'long' });
      const year = new Date().getFullYear();
      [rows] = await pool.query(`
        SELECT u.id, u.name, u.email, u.phone, t.id AS teacher_id, t.employee_id, t.subject,
               t.assigned_class, t.assigned_section,
               (SELECT status FROM salaries WHERE teacher_id = t.id AND month = ? AND year = ? LIMIT 1) AS salary_status
        FROM users u
        JOIN teachers t ON u.id = t.user_id
        ORDER BY u.name ASC
      `, [month, year]);
    } else if (role === 'parent') {
      [rows] = await pool.query(`
        SELECT u.id, u.name, u.email, u.phone, p.relation, p.occupation,
               cu.name AS child_name, s.class AS child_class
        FROM users u
        JOIN parents p ON u.id = p.user_id
        JOIN students s ON p.student_id = s.id
        JOIN users cu ON s.user_id = cu.id
        ORDER BY u.name ASC
      `);
    } else {
      [rows] = await pool.query('SELECT id, name, email, role, phone FROM users ORDER BY created_at DESC');
    }

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── TEACHER ATTENDANCE ────────────────────────────────────────
const markTeacherAttendance = async (req, res, next) => {
  try {
    const { teacher_id, date, status, remarks } = req.body;
    await pool.query(`
      INSERT INTO teacher_attendance (teacher_id, date, status, remarks)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks)
    `, [teacher_id, date, status, remarks || null]);
    res.json({ success: true, message: 'Attendance recorded.' });
  } catch (err) { next(err); }
};

const getTeacherAttendanceLogs = async (req, res, next) => {
  try {
    const { teacher_id } = req.query;
    const [rows] = await pool.query(
      'SELECT * FROM teacher_attendance WHERE teacher_id = ? ORDER BY date DESC LIMIT 31',
      [teacher_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── SALARY MANAGEMENT ─────────────────────────────────────────
const paySalary = async (req, res, next) => {
  try {
    const { teacher_id, amount, month, year, remarks } = req.body;
    await pool.query(`
      INSERT INTO salaries (teacher_id, amount, month, year, status, paid_date, remarks)
      VALUES (?, ?, ?, ?, 'paid', CURDATE(), ?)
      ON DUPLICATE KEY UPDATE status = 'paid', paid_date = CURDATE(), amount = VALUES(amount)
    `, [teacher_id, amount, month, year, remarks || null]);
    res.json({ success: true, message: 'Salary payment recorded.' });
  } catch (err) { next(err); }
};

module.exports = {
  getStats, getAllUsers, createUser, updateUser, deleteUser,
  getAnnouncements, createAnnouncement, deleteAnnouncement, updateAnnouncement,
  getAdmissions, updateAdmissionStatus, getContactSubmissions, updateContactStatus, deleteContactSubmission,
  addGalleryItem, deleteGalleryItem, getAllDetailedUsers,
  getStudentsFees, assignFee, updateFee,
  markTeacherAttendance, getTeacherAttendanceLogs, paySalary
};
