const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'international_high_school',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+05:30', 
  charset:            'utf8mb4',
});

const admins = [
  { username: '23BCE20234', password: 'Chandu@123', name: 'Admin Chandu', department: 'Administration' },
  { username: '23BCE20235', password: 'Bhargav@123', name: 'Admin Bhargav', department: 'Administration' },
  { username: '23BCE20239', password: 'Deepika@123', name: 'Admin Deepika', department: 'Administration' }
];

const facultyList = [
  { name: 'Ramesh Sir', ID: '701', Gender: 'male', Mobile: '920001001', Subject: 'Mathematics', Username: '701', Password: '701@123' },
  { name: 'Lakshmi Madam', ID: '702', Gender: 'female', Mobile: '920001002', Subject: 'Science', Username: '702', Password: '702@123' },
  { name: 'Suresh Sir', ID: '703', Gender: 'male', Mobile: '920001003', Subject: 'English', Username: '703', Password: '703@123' },
  { name: 'Kavitha Madam', ID: '704', Gender: 'female', Mobile: '920001004', Subject: 'Social', Username: '704', Password: '704@123' },
  { name: 'Prakash Sir', ID: '705', Gender: 'male', Mobile: '920001005', Subject: 'Computer Science', Username: '705', Password: '705@123' }
];

const studentsList = [
  { name: 'Rahul Kumar', ID: '20201', DOB: '2012-05-12', Grade: '6', Mobile: '900001001', Gender: 'male', Gmail: 'rahul20201@gmail.com', Username: '20201', Password: '20201@123' },
  { name: 'Ananya Reddy', ID: '20202', DOB: '2012-08-21', Grade: '6', Mobile: '900001002', Gender: 'female', Gmail: 'ananya20202@gmail.com', Username: '20202', Password: '20202@123' },
  { name: 'Karthik Rao', ID: '20203', DOB: '2011-11-10', Grade: '6', Mobile: '900001003', Gender: 'male', Gmail: 'karthik20203@gmail.com', Username: '20203', Password: '20203@123' },
  { name: 'Sneha Patel', ID: '20204', DOB: '2012-03-15', Grade: '6', Mobile: '900001004', Gender: 'female', Gmail: 'sneha20204@gmail.com', Username: '20204', Password: '20204@123' },
  { name: 'Arjun Das', ID: '20205', DOB: '2011-09-30', Grade: '6', Mobile: '900001005', Gender: 'male', Gmail: 'arjun20205@gmail.com', Username: '20205', Password: '20205@123' },
  { name: 'Pooja Sharma', ID: '20206', DOB: '2011-02-14', Grade: '7', Mobile: '900001006', Gender: 'female', Username: '20206', Password: '20206@123' },
  { name: 'Naveen Kumar', ID: '20207', DOB: '2011-06-18', Grade: '7', Mobile: '900001007', Gender: 'male', Username: '20207', Password: '20207@123' },
  { name: 'Kavya Singh', ID: '20208', DOB: '2010-12-01', Grade: '7', Mobile: '900001008', Gender: 'female', Username: '20208', Password: '20208@123' },
  { name: 'Rohit Verma', ID: '20209', DOB: '2011-04-09', Grade: '7', Mobile: '900001009', Gender: 'male', Username: '20209', Password: '20209@123' },
  { name: 'Meena Iyer', ID: '20210', DOB: '2010-07-22', Grade: '7', Mobile: '900001010', Gender: 'female', Username: '20210', Password: '20210@123' },
  { name: 'Aditya Jain', ID: '20211', DOB: '2010-03-11', Grade: '8', Mobile: '900001011', Gender: 'male', Username: '20211', Password: '20211@123' },
  { name: 'Divya Nair', ID: '20212', DOB: '2009-08-17', Grade: '8', Mobile: '900001012', Gender: 'female', Username: '20212', Password: '20212@123' },
  { name: 'Rohan Gupta', ID: '20213', DOB: '2010-01-25', Grade: '8', Mobile: '900001013', Gender: 'male', Username: '20213', Password: '20213@123' },
  { name: 'Aisha Khan', ID: '20214', DOB: '2009-06-05', Grade: '8', Mobile: '900001014', Gender: 'female', Username: '20214', Password: '20214@123' },
  { name: 'Surya Teja', ID: '20215', DOB: '2010-10-19', Grade: '8', Mobile: '900001015', Gender: 'male', Username: '20215', Password: '20215@123' },
  { name: 'Neha Kapoor', ID: '20216', DOB: '2009-02-12', Grade: '9', Mobile: '900001016', Gender: 'female', Username: '20216', Password: '20216@123' },
  { name: 'Vikram Reddy', ID: '20217', DOB: '2008-11-03', Grade: '9', Mobile: '900001017', Gender: 'male', Username: '20217', Password: '20217@123' },
  { name: 'Priya Menon', ID: '20218', DOB: '2009-07-27', Grade: '9', Mobile: '900001018', Gender: 'female', Username: '20218', Password: '20218@123' },
  { name: 'Kiran Kumar', ID: '20219', DOB: '2008-05-09', Grade: '9', Mobile: '900001019', Gender: 'male', Username: '20219', Password: '20219@123' },
  { name: 'Shreya Gupta', ID: '20220', DOB: '2009-12-14', Grade: '9', Mobile: '900001020', Gender: 'female', Username: '20220', Password: '20220@123' }
];

const parentsList = [
  { Name: 'Suresh Kumar', ChildID: '20201', Mobile: '910001001', Username: '20201_6', Password: '20201@123' },
  { Name: 'Lakshmi Reddy', ChildID: '20202', Mobile: '910001002', Username: '20202_6', Password: '20202@123' },
  { Name: 'Ramesh Rao', ChildID: '20203', Mobile: '910001003', Username: '20203_6', Password: '20203@123' },
  { Name: 'Mahesh Patel', ChildID: '20204', Mobile: '910001004', Username: '20204_6', Password: '20204@123' },
  { Name: 'Rajesh Das', ChildID: '20205', Mobile: '910001005', Username: '20205_6', Password: '20205@123' },
  { Name: 'Sunil Sharma', ChildID: '20206', Mobile: '910001006', Username: '20206_7', Password: '20206@123' },
  { Name: 'Prakash Kumar', ChildID: '20207', Mobile: '910001007', Username: '20207_7', Password: '20207@123' },
  { Name: 'Vikram Singh', ChildID: '20208', Mobile: '910001008', Username: '20208_7', Password: '20208@123' },
  { Name: 'Amit Verma', ChildID: '20209', Mobile: '910001009', Username: '20209_7', Password: '20209@123' },
  { Name: 'Suresh Iyer', ChildID: '20210', Mobile: '910001010', Username: '20210_7', Password: '20210@123' },
  { Name: 'Rajiv Jain', ChildID: '20211', Mobile: '910001011', Username: '20211_8', Password: '20211@123' },
  { Name: 'Mohan Nair', ChildID: '20212', Mobile: '910001012', Username: '20212_8', Password: '20212@123' },
  { Name: 'Sanjay Gupta', ChildID: '20213', Mobile: '910001013', Username: '20213_8', Password: '20213@123' },
  { Name: 'Imran Khan', ChildID: '20214', Mobile: '910001014', Username: '20214_8', Password: '20214@123' },
  { Name: 'Krishna Teja', ChildID: '20215', Mobile: '910001015', Username: '20215_8', Password: '20215@123' },
  { Name: 'Rakesh Kapoor', ChildID: '20216', Mobile: '910001016', Username: '20216_9', Password: '20216@123' },
  { Name: 'Srinivas Reddy', ChildID: '20217', Mobile: '910001017', Username: '20217_9', Password: '20217@123' },
  { Name: 'Rajesh Menon', ChildID: '20218', Mobile: '910001018', Username: '20218_9', Password: '20218@123' },
  { Name: 'Anil Kumar', ChildID: '20219', Mobile: '910001019', Username: '20219_9', Password: '20219@123' },
  { Name: 'Deepak Gupta', ChildID: '20220', Mobile: '910001020', Username: '20220_9', Password: '20220@123' }
];

async function seedDatabase() {
  try {
    const conn = await pool.getConnection();

    console.log('🔄 Re-creating tables from schema.sql...');
    const schemaPath = path.join(__dirname, '../models/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Drop all tables
    await conn.query('DROP TABLE IF EXISTS admissions, contact_submissions, gallery, fees, announcements, results, attendance, courses, admins, parents, teachers, students, users;');
    
    // Split SQL by semicolons, run statements individually
    const queries = schemaSql.split(/;+(?![^`]*`)|;+(?![^']*')|;+(?![^"]*")/g).filter(q => q.trim());
    
    for (let q of queries) {
      if (q.trim()) {
         try {
           await conn.query(q);
         } catch(e) {
           console.log("SQL Error in:", q);
           throw e;
         }
      }
    }

    console.log('✅ Tables created successfully.');
    
    // Hash function wrapper
    const hash = async (pwd) => await bcrypt.hash(pwd, 10);
    
    console.log('👤 Inserting Admins...');
    for (let admin of admins) {
      const hashed = await hash(admin.password);
      const [userRes] = await conn.query(
        'INSERT INTO users (username, name, password_hash, role) VALUES (?, ?, ?, ?)',
        [admin.username, admin.name, hashed, 'admin']
      );
      await conn.query(
        'INSERT INTO admins (user_id, department) VALUES (?, ?)',
        [userRes.insertId, admin.department]
      );
    }

    console.log('👨‍🏫 Inserting Faculty...');
    for (let fac of facultyList) {
      const hashed = await hash(fac.Password);
      const [userRes] = await conn.query(
        'INSERT INTO users (username, name, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
        [fac.Username, fac.name, hashed, 'teacher', fac.Mobile]
      );
      await conn.query(
        'INSERT INTO teachers (user_id, employee_id, subject) VALUES (?, ?, ?)',
        [userRes.insertId, fac.ID, fac.Subject]
      );
    }
    
    // Map to link roll_no to student db id
    const rollNoToStudentId = {};

    console.log('🎓 Inserting Students & Fees...');
    for (let stu of studentsList) {
      const hashed = await hash(stu.Password);
      const [userRes] = await conn.query(
        'INSERT INTO users (username, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [stu.Username, stu.name, stu.Gmail || null, hashed, 'student', stu.Mobile]
      );
      
      const [studentRes] = await conn.query(
        'INSERT INTO students (user_id, roll_no, class, section, dob, gender) VALUES (?, ?, ?, ?, ?, ?)',
        [userRes.insertId, stu.ID, stu.Grade, 'A', stu.DOB, stu.Gender]
      );
      
      const studentId = studentRes.insertId;
      rollNoToStudentId[stu.ID] = studentId;

      // Assign Fee based on grade
      let feeAmount = 50000;
      if (stu.Grade === '7') feeAmount = 55000;
      else if (stu.Grade === '8') feeAmount = 60000;
      else if (stu.Grade === '9') feeAmount = 65000;
      
      // Calculate due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const formattedDueDate = dueDate.toISOString().split('T')[0];

      await conn.query(
        'INSERT INTO fees (student_id, fee_type, amount, due_date, paid) VALUES (?, ?, ?, ?, false)',
        [studentId, 'Tuition Fee 2026-27', feeAmount, formattedDueDate]
      );
    }

    console.log('👪 Inserting Parents...');
    for (let par of parentsList) {
      const hashed = await hash(par.Password);
      const [userRes] = await conn.query(
        'INSERT INTO users (username, name, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
        [par.Username, par.Name, hashed, 'parent', par.Mobile]
      );
      
      const studentId = rollNoToStudentId[par.ChildID];
      if (!studentId) {
        console.warn(`Warning: Student ID ${par.ChildID} not found for parent ${par.Name}`);
      }
      
      await conn.query(
        'INSERT INTO parents (user_id, student_id, relation) VALUES (?, ?, ?)',
        [userRes.insertId, studentId || null, 'guardian'] // fallback relation as guardian
      );
    }

    console.log('📢 Inserting default announcements...');
    const [adminUser] = await conn.query('SELECT id FROM users WHERE username = ? LIMIT 1', [admins[0].username]);
    if (adminUser.length > 0) {
      const adminId = adminUser[0].id;
      const announcements = [
        ['Welcome to International High School', 'We are delighted to welcome all students and parents to the new academic year.', adminId, 'all', true],
        ['Annual Sports Day', 'Annual Sports Day will be held next month.', adminId, 'all', true]
      ];
      for (const ann of announcements) {
        await conn.query(
          'INSERT INTO announcements (title, content, author_id, target_role, is_public) VALUES (?, ?, ?, ?, ?)',
          ann
        );
      }
    }

    conn.release();
    console.log('🎉 Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedDatabase();
