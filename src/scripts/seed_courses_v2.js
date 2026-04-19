const { pool } = require('../config/db');

async function seedCourses() {
  try {
    console.log('🔄 Seeding courses table...');
    
    // Teacher IDs from previous research: 701 (Math), 702 (Science), 703 (English), 704 (Social)
    // Their db IDs were 1, 2, 3, 4 based on the SELECT * FROM teachers output
    
    const courses = [
      // Ramesh Sir (ID: 1) teaches Mathematics
      ['Mathematics', 'Mathematics for Class 6', '6', 1],
      ['Mathematics', 'Mathematics for Class 7', '7', 1],
      ['Mathematics', 'Mathematics for Class 8', '8', 1],
      
      // Lakshmi Madam (ID: 2) teaches Science
      ['Science', 'Science for Class 6', '6', 2],
      ['Science', 'Science for Class 7', '7', 2],
      
      // Suresh Sir (ID: 3) teaches English
      ['English', 'English for Class 8', '8', 3],
      ['English', 'English for Class 9', '9', 3]
    ];

    await pool.query('DELETE FROM courses');
    await pool.query(
      'INSERT INTO courses (name, description, class, teacher_id) VALUES ?',
      [courses]
    );

    console.log('✅ Courses table seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedCourses();
