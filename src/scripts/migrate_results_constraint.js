const { pool } = require('../config/db');

async function migrate() {
  try {
    console.log('🔄 Adding unique constraint to results table...');
    // We want unique results per student per subject per exam type
    await pool.query(`
      ALTER TABLE results 
      ADD UNIQUE KEY unique_student_subject_exam (student_id, subject, exam_type);
    `);
    console.log('✅ Unique constraint added successfully.');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️ Constraint already exists.');
      process.exit(0);
    }
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
