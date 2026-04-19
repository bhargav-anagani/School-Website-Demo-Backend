// ─────────────────────────────────────────────────────────────
// Teacher Controller — students list, attendance marking, results upload
// ─────────────────────────────────────────────────────────────
const { pool } = require('../config/db');
const { uploadToS3, getSignedDownloadUrl } = require('../utils/s3Service');

// ── TEACHER PROFILE ───────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const month = new Date().toLocaleString('en-US', { month: 'long' });
    const year = new Date().getFullYear();
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone,
              t.id AS teacher_id, t.employee_id, t.subject, t.qualification, t.joining_date, t.photo_url, t.assigned_class, t.assigned_section,
              s.status AS salary_status, s.paid_date AS salary_paid_date, s.amount AS salary_amount
       FROM users u 
       JOIN teachers t ON u.id = t.user_id 
       LEFT JOIN salaries s ON t.id = s.teacher_id AND s.month = ? AND s.year = ?
       WHERE u.id = ?`,
      [month, year, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Teacher not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── GET CLASSES (taught by teacher) ───────────────────────────
const getClasses = async (req, res, next) => {
  try {
    const [teacher] = await pool.query('SELECT id, assigned_class, assigned_section FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacher.length) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    // 1. Get classes and subjects from courses table
    const [courses] = await pool.query('SELECT class, section, name AS subject FROM courses WHERE teacher_id = ?', [teacher[0].id]);
    
    // Group subjects by class-section
    const classMap = {};
    courses.forEach(c => {
      const key = `${c.class}-${c.section}`;
      if (!classMap[key]) classMap[key] = { class: c.class, section: c.section, subjects: new Set() };
      classMap[key].subjects.add(c.subject);
    });

    const result = Object.values(classMap).map(item => ({
      class: item.class,
      section: item.section,
      subjects: Array.from(item.subjects)
    }));

    res.json({ success: true, data: result });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── GET STUDENTS (flexible class selection) ───────────────────
const getStudents = async (req, res, next) => {
  try {
    const { class: className, section, search } = req.query;
    
    // If no class provided, default to teacher's mentored class
    let targetClass = className;
    let targetSection = section;

    if (!targetClass) {
      const [teacher] = await pool.query('SELECT assigned_class, assigned_section FROM teachers WHERE user_id = ?', [req.user.id]);
      if (!teacher.length) return res.status(404).json({ success: false, message: 'Teacher not found.' });
      targetClass = teacher[0].assigned_class;
      targetSection = targetSection || teacher[0].assigned_section;
    }

    if (!targetClass) return res.json({ success: true, data: [] });

    let query = `SELECT u.name, u.email, s.id AS student_id, s.roll_no, s.class, s.section, s.gender, s.photo_url
                 FROM students s JOIN users u ON s.user_id = u.id WHERE s.class = ?`;
    const params = [targetClass];
    
    if (targetSection) {
      query += ' AND s.section = ?';
      params.push(targetSection);
    }
    if (search) { query += ' AND u.name LIKE ?'; params.push(`%${search}%`); }
    query += ' ORDER BY s.roll_no';
    
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── MARK ATTENDANCE ───────────────────────────────────────────
const markAttendance = async (req, res, next) => {
  try {
    const [teacher] = await pool.query('SELECT id, assigned_class, assigned_section FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacher.length) return res.status(404).json({ success: false, message: 'Teacher not found.' });
    if (!teacher[0].assigned_class) return res.status(403).json({ success: false, message: 'You are not assigned to a class.' });

    const { records } = req.body; // [{ student_id, date, status, remarks }]
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'records array is required.' });
    }
    
    if (records.length === 0) return res.json({ success: true, message: 'No records to update.' });

    // Validate students belong to the teacher's class
    const studentIds = records.map(r => r.student_id);
    let stuQuery = 'SELECT id FROM students WHERE class = ? AND id IN (?)';
    const stuParams = [teacher[0].assigned_class, studentIds];
    
    if (teacher[0].assigned_section) {
      stuQuery = 'SELECT id FROM students WHERE class = ? AND section = ? AND id IN (?)';
      stuParams.splice(1, 0, teacher[0].assigned_section);
    }

    const [validStudents] = await pool.query(stuQuery, stuParams);
    const validStudentIds = new Set(validStudents.map(s => s.id));

    const validRecords = records.filter(r => validStudentIds.has(r.student_id));
    if (validRecords.length === 0) {
      return res.status(403).json({ success: false, message: 'You can only update attendance for your assigned class.' });
    }

    const values = validRecords.map(r => [r.student_id, teacher[0].id, r.date, r.status || 'present', r.remarks || null]);
    await pool.query(
      `INSERT INTO attendance (student_id, teacher_id, date, status, remarks) VALUES ?
       ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks)`,
      [values]
    );
    res.json({ success: true, message: `Attendance marked for ${validRecords.length} students.` });
  } catch (err) { next(err); }
};

// ── GET ATTENDANCE RECORDS ────────────────────────────────────
const getAttendanceRecords = async (req, res, next) => {
  try {
    const { date } = req.query;
    const [teacher] = await pool.query('SELECT assigned_class, assigned_section FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacher.length || !teacher[0].assigned_class) return res.json({ success: true, data: [] });

    let query = `SELECT a.*, u.name AS student_name, s.roll_no, s.class, s.section
                 FROM attendance a JOIN students s ON a.student_id = s.id JOIN users u ON s.user_id = u.id 
                 WHERE s.class = ?`;
    const params = [teacher[0].assigned_class];

    if (teacher[0].assigned_section) {
      query += ' AND s.section = ?';
      params.push(teacher[0].assigned_section);
    }
    if (date) { query += ' AND a.date = ?'; params.push(date); }
    query += ' ORDER BY s.roll_no';
    
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── UPLOAD/EDIT RESULTS ──────────────────────────────────────
const uploadResults = async (req, res, next) => {
  try {
    const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacher.length) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    const { results } = req.body; // [{ student_id, subject, exam_type, marks, max_marks, exam_date, remarks }]
    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ success: false, message: 'valid results array is required.' });
    }

    // Validation: Check if teacher is assigned to this subject and class/section
    // We assume all results in the batch are for the same class and subject (frontend logic)
    const { subject } = results[0];
    const [student] = await pool.query('SELECT class, section FROM students WHERE id = ?', [results[0].student_id]);
    if (!student.length) return res.status(400).json({ success: false, message: 'Student not found.' });

    const [assignment] = await pool.query(
      'SELECT id FROM courses WHERE teacher_id = ? AND class = ? AND section = ? AND name = ?',
      [teacher[0].id, student[0].class, student[0].section, subject]
    );

    if (!assignment.length) {
      return res.status(403).json({ success: false, message: `You are not assigned to teach ${subject} for Class ${student[0].class}.` });
    }

    const values = results.map(r => {
      const marksNum = parseFloat(r.marks);
      const maxMarksNum = parseFloat(r.max_marks || 100);
      const grade = marksNum / maxMarksNum >= 0.9 ? 'A+' : marksNum / maxMarksNum >= 0.8 ? 'A' :
                    marksNum / maxMarksNum >= 0.7 ? 'B' : marksNum / maxMarksNum >= 0.6 ? 'C' :
                    marksNum / maxMarksNum >= 0.5 ? 'D' : 'F';
      return [r.student_id, teacher[0].id, r.subject, r.exam_type, marksNum, maxMarksNum, grade, r.remarks || null, r.exam_date || null];
    });

    await pool.query(
      `INSERT INTO results (student_id, teacher_id, subject, exam_type, marks, max_marks, grade, remarks, exam_date) 
       VALUES ?
       ON DUPLICATE KEY UPDATE 
         marks = VALUES(marks), 
         grade = VALUES(grade), 
         remarks = VALUES(remarks),
         exam_date = VALUES(exam_date),
         teacher_id = VALUES(teacher_id)`,
      [values]
    );
    res.status(201).json({ success: true, message: `${results.length} results saved/updated.` });
  } catch (err) { next(err); }
};

// ── GET RESULTS (with class/subject filters) ──────────────────
const getResults = async (req, res, next) => {
  try {
    const { student_id, exam_type, subject, class: className, section } = req.query;
    let query = `SELECT r.*, u.name AS student_name, s.roll_no, s.class, s.section FROM results r
                 JOIN students s ON r.student_id = s.id 
                 JOIN users u ON s.user_id = u.id WHERE 1=1`;
    const params = [];
    if (student_id) { query += ' AND r.student_id = ?'; params.push(student_id); }
    if (exam_type)  { query += ' AND r.exam_type = ?';  params.push(exam_type); }
    if (subject)    { query += ' AND r.subject = ?';    params.push(subject); }
    if (className)  { query += ' AND s.class = ?';      params.push(className); }
    if (section)    { query += ' AND s.section = ?';    params.push(section); }
    
    query += ' ORDER BY r.created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── ANNOUNCEMENTS ──────────────────────────────────────────────
const getAnnouncements = async (req, res, next) => {
  try {
    const [teacher] = await pool.query('SELECT assigned_class, assigned_section FROM teachers WHERE user_id = ?', [req.user.id]);
    
    let query = `SELECT a.*, u.name AS author_name FROM announcements a JOIN users u ON a.author_id = u.id
                 WHERE a.target_role IN ('all','teacher')`;
    const params = [];

    if (teacher.length && teacher[0].assigned_class) {
      query += ` OR (a.target_role = 'student' AND a.target_class = ?)`;
      params.push(teacher[0].assigned_class);
    }
    
    query += ' ORDER BY a.created_at DESC LIMIT 20';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const postAnnouncement = async (req, res, next) => {
  try {
    const { title, content, target_class, target_section } = req.body;
    const [teacher] = await pool.query('SELECT assigned_class FROM teachers WHERE user_id = ?', [req.user.id]);
    
    // Check if teacher belongs to this class (security)
    if (target_class && teacher[0].assigned_class !== target_class) {
      // Allow posting if they teach a subject there (check courses)
      const [teaching] = await pool.query('SELECT id FROM courses WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = ?) AND class = ?', [req.user.id, target_class]);
      if (!teaching.length) return res.status(403).json({ success: false, message: 'You can only post notices for your assigned classes.' });
    }

    await pool.query(
      'INSERT INTO announcements (title, content, category, author_id, target_role, target_class, target_section) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, content, 'Academic', req.user.id, 'student', target_class || null, target_section || null]
    );
    res.status(201).json({ success: true, message: 'Academic notice posted.' });
  } catch (err) { next(err); }
};

// ── MATERIALS ─────────────────────────────────────────────────
const uploadMaterial = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File is required.' });
    
    const { title, description, class: className, section, subject } = req.body;
    const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    
    const { key, url } = await uploadToS3(req.file);

    await pool.query(
      'INSERT INTO materials (title, description, file_url, file_key, class, section, subject, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description || '', url, key, className, section, subject, teacher[0].id]
    );

    res.status(201).json({ success: true, message: 'Material uploaded successfully.' });
  } catch (err) { next(err); }
};

const getMaterials = async (req, res, next) => {
  try {
    const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    const [rows] = await pool.query(
      'SELECT * FROM materials WHERE teacher_id = ? ORDER BY created_at DESC',
      [teacher[0].id]
    );
    
    // Generate signed URLs for each material
    const data = await Promise.all(rows.map(async (m) => ({
      ...m,
      downloadUrl: await getSignedDownloadUrl(m.file_key)
    })));

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { 
  getProfile, getClasses, getStudents, markAttendance, getAttendanceRecords, 
  uploadResults, getResults, getAnnouncements, postAnnouncement,
  uploadMaterial, getMaterials
};
