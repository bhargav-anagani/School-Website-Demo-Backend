// ─────────────────────────────────────────────────────────────
// Student Controller — profile, results, attendance, fees
// ─────────────────────────────────────────────────────────────
const { pool } = require('../config/db');
const { getSignedDownloadUrl } = require('../utils/s3Service');

// ── PROFILE ───────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              s.id AS student_id, s.roll_no, s.class, s.section, s.dob, s.gender, s.address, s.photo_url, s.admitted_on,
              pu.name AS parent_name, pu.phone AS parent_phone, p.relation AS parent_relation,
              tu.name AS mentor_name, t.subject AS mentor_subject
       FROM users u
       JOIN students s ON u.id = s.user_id
       LEFT JOIN parents p ON s.id = p.student_id
       LEFT JOIN users pu ON p.user_id = pu.id
       LEFT JOIN teachers t ON s.class = t.assigned_class AND s.section = t.assigned_section
       LEFT JOIN users tu ON t.user_id = tu.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── TIMETABLE ─────────────────────────────────────────────────
const getTimetable = async (req, res, next) => {
  try {
    const [student] = await pool.query('SELECT class, section FROM students WHERE user_id = ?', [req.user.id]);
    if (!student.length) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [rows] = await pool.query(
      `SELECT tt.period_name, c.name AS subject, tu.name AS teacher_name
       FROM timetable tt
       JOIN courses c ON tt.course_id = c.id
       JOIN teachers t ON c.teacher_id = t.id
       JOIN users tu ON t.user_id = tu.id
       WHERE tt.class = ? AND tt.section = ?
       ORDER BY tt.period_name`,
      [student[0].class, student[0].section]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── RESULTS ───────────────────────────────────────────────────
const getResults = async (req, res, next) => {
  try {
    const [student] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (!student.length) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [rows] = await pool.query(
      `SELECT r.*, u.name AS teacher_name FROM results r
       JOIN teachers t ON r.teacher_id = t.id JOIN users u ON t.user_id = u.id
       WHERE r.student_id = ? ORDER BY r.exam_date DESC`,
      [student[0].id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── ATTENDANCE ────────────────────────────────────────────────
const getAttendance = async (req, res, next) => {
  try {
    const [student] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (!student.length) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [rows] = await pool.query(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 90',
      [student[0].id]
    );

    // Calculate summary
    const total   = rows.length;
    const present = rows.filter(r => r.status === 'present').length;
    const absent  = rows.filter(r => r.status === 'absent').length;
    const late    = rows.filter(r => r.status === 'late').length;
    const percentage = total > 0 ? ((present + late) / total * 100).toFixed(1) : 0;

    res.json({ success: true, data: rows, summary: { total, present, absent, late, percentage } });
  } catch (err) { next(err); }
};

// ── FEES ──────────────────────────────────────────────────────
const getFees = async (req, res, next) => {
  try {
    const [student] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (!student.length) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [rows] = await pool.query(
      'SELECT * FROM fees WHERE student_id = ? ORDER BY due_date DESC',
      [student[0].id]
    );

    const total_due  = rows.filter(r => !r.paid).reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const total_paid = rows.filter(r => r.paid).reduce((sum, r) => sum + parseFloat(r.amount), 0);

    res.json({ success: true, data: rows, summary: { total_due, total_paid } });
  } catch (err) { next(err); }
};

// ── MATERIALS ─────────────────────────────────────────────────
const getMaterials = async (req, res, next) => {
  try {
    const [student] = await pool.query('SELECT class, section FROM students WHERE user_id = ?', [req.user.id]);
    if (!student.length) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [rows] = await pool.query(
      `SELECT m.*, u.name AS teacher_name FROM materials m
       JOIN teachers t ON m.teacher_id = t.id JOIN users u ON t.user_id = u.id
       WHERE m.class = ? AND (m.section = ? OR m.section = 'All' OR m.section IS NULL)
       ORDER BY m.created_at DESC`,
      [student[0].class, student[0].section]
    );

    const data = await Promise.all(rows.map(async (m) => ({
      ...m,
      downloadUrl: await getSignedDownloadUrl(m.file_key)
    })));

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── ANNOUNCEMENTS FOR STUDENT ─────────────────────────────────
const getAnnouncements = async (req, res, next) => {
  try {
    const [student] = await pool.query('SELECT class, section FROM students WHERE user_id = ?', [req.user.id]);
    
    let query = `SELECT a.*, u.name AS author_name FROM announcements a 
                 JOIN users u ON a.author_id = u.id 
                 WHERE a.target_role = 'all'`;
    const params = [];
    
    if (student.length) {
      query += ` OR (a.target_role = 'student' AND (a.target_class IS NULL OR a.target_class = ?) AND (a.target_section IS NULL OR a.target_section = ?))`;
      params.push(student[0].class, student[0].section);
    }

    query += ' ORDER BY a.created_at DESC LIMIT 20';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

module.exports = { getProfile, getTimetable, getResults, getAttendance, getFees, getAnnouncements, getMaterials };
