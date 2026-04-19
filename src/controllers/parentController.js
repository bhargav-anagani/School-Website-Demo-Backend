// ─────────────────────────────────────────────────────────────
// Parent Controller — view child data
// ─────────────────────────────────────────────────────────────
const { pool } = require('../config/db');
const { getSignedDownloadUrl } = require('../utils/s3Service');

// ── PARENT PROFILE + CHILD INFO ───────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone,
              p.id AS parent_id, p.relation, p.occupation,
              cu.name AS child_name, cu.email AS child_email,
              s.id AS student_id, s.roll_no, s.class, s.section, s.dob, s.photo_url
       FROM users u
       JOIN parents p    ON u.id = p.user_id
       JOIN students s   ON p.student_id = s.id
       JOIN users cu     ON s.user_id = cu.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Parent not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── CHILD RESULTS ──────────────────────────────────────────────
const getChildResults = async (req, res, next) => {
  try {
    const [parent] = await pool.query('SELECT student_id FROM parents WHERE user_id = ?', [req.user.id]);
    if (!parent.length) return res.status(404).json({ success: false, message: 'Parent not found.' });

    const [rows] = await pool.query(
      `SELECT r.*, u.name AS teacher_name FROM results r
       JOIN teachers t ON r.teacher_id = t.id JOIN users u ON t.user_id = u.id
       WHERE r.student_id = ? ORDER BY r.exam_date DESC`,
      [parent[0].student_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── CHILD ATTENDANCE ──────────────────────────────────────────
const getChildAttendance = async (req, res, next) => {
  try {
    const [parent] = await pool.query('SELECT student_id FROM parents WHERE user_id = ?', [req.user.id]);
    if (!parent.length) return res.status(404).json({ success: false, message: 'Parent not found.' });

    const [rows] = await pool.query(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 90',
      [parent[0].student_id]
    );
    const total = rows.length;
    const present = rows.filter(r => r.status === 'present').length;
    const absent  = rows.filter(r => r.status === 'absent').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    res.json({ success: true, data: rows, summary: { total, present, absent, percentage } });
  } catch (err) { next(err); }
};

// ── CHILD FEES ────────────────────────────────────────────────
const getChildFees = async (req, res, next) => {
  try {
    const [parent] = await pool.query('SELECT student_id FROM parents WHERE user_id = ?', [req.user.id]);
    if (!parent.length) return res.status(404).json({ success: false, message: 'Parent not found.' });

    const [rows] = await pool.query(
      'SELECT * FROM fees WHERE student_id = ? ORDER BY due_date DESC',
      [parent[0].student_id]
    );
    const total_due  = rows.filter(r => !r.paid).reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const total_paid = rows.filter(r => r.paid).reduce((sum, r) => sum + parseFloat(r.amount), 0);

    res.json({ success: true, data: rows, summary: { total_due, total_paid } });
  } catch (err) { next(err); }
};

// ── STUDY MATERIALS ───────────────────────────────────────────
const getMaterials = async (req, res, next) => {
  try {
    const [parent] = await pool.query('SELECT student_id FROM parents WHERE user_id = ?', [req.user.id]);
    if (!parent.length) return res.status(404).json({ success: false, message: 'Parent not found.' });

    const [student] = await pool.query('SELECT class, section FROM students WHERE id = ?', [parent[0].student_id]);

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

// ── ANNOUNCEMENTS ──────────────────────────────────────────────
const getAnnouncements = async (req, res, next) => {
  try {
    const [parent] = await pool.query('SELECT student_id FROM parents WHERE user_id = ?', [req.user.id]);
    const [student] = await pool.query('SELECT class, section FROM students WHERE id = ?', [parent[0].student_id]);
    
    let query = `SELECT a.*, u.name AS author_name FROM announcements a 
                 JOIN users u ON a.author_id = u.id 
                 WHERE a.target_role IN ('all','parent')`;
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

module.exports = { getProfile, getChildResults, getChildAttendance, getChildFees, getAnnouncements, getMaterials };
