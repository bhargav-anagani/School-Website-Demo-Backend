const { pool } = require('../config/db');

async function seedDynamicTimetable() {
  try {
    console.log('🔄 Seeding dynamic courses and timetable...');
    
    // 1. Clear existing
    await pool.query('DELETE FROM timetable');
    await pool.query('DELETE FROM courses');

    // 2. Define courses [name, description, class, section, teacher_id]
    // Ramesh (1), Lakshmi (2), Suresh (3), SocialTeacher (4), CSExpert (5)
    // Based on SELECT * FROM teachers earlier:
    // 1: 701 Ramesh (Math), 2: 702 Lakshmi (Science), 3: 703 Suresh (English), 4: 704 Social, 5: 705 CS
    
    const courses = [
      ['Mathematics', 'Math for 6A', '6', 'A', 1],
      ['Science', 'Science for 6A', '6', 'A', 2],
      ['English', 'English for 6A', '6', 'A', 3],
      ['Social Studies', 'Social for 6A', '6', 'A', 4],
      ['Computer Science', 'CS for 6A', '6', 'A', 5],
      
      ['Mathematics', 'Math for 7A', '7', 'A', 1],
      ['Science', 'Science for 7A', '7', 'A', 2],
      ['Social Studies', 'Social for 7A', '7', 'A', 4],
      ['English', 'English for 7A', '7', 'A', 3],
      ['Computer Science', 'CS for 7A', '7', 'A', 5],
      
      ['Mathematics', 'Math for 8A', '8', 'A', 1],
      ['Science', 'Science for 8A', '8', 'A', 2],
      ['English', 'English for 8A', '8', 'A', 3],
      ['Social Studies', 'Social for 8A', '8', 'A', 4],
      ['Computer Science', 'CS for 8A', '8', 'A', 5],

      ['Mathematics', 'Math for 9A', '9', 'A', 1], // Ramesh Sir teaching Math in 9A
      ['Science', 'Science for 9A', '9', 'A', 2],
      ['Social Studies', 'Social for 9A', '9', 'A', 4],
      ['English', 'English for 9A', '9', 'A', 3],
      ['Computer Science', 'CS for 9A', '9', 'A', 5]
    ];

    await pool.query(
      'INSERT INTO courses (name, description, class, section, teacher_id) VALUES ?',
      [courses]
    );

    // 3. Fetch course IDs back to map to timetable
    const [courseRows] = await pool.query('SELECT id, name, class, section FROM courses');
    const courseMap = {};
    courseRows.forEach(c => {
      courseMap[`${c.class}-${c.section}-${c.name}`] = c.id;
    });

    // 4. Define timetable [class, section, period_name, course_id]
    const tt = [
      // Class 9A (The specific request case)
      ['9', 'A', '1st Period', courseMap['9-A-Social Studies']],
      ['9', 'A', '2nd Period', courseMap['9-A-Science']],
      ['9', 'A', '3rd Period', courseMap['9-A-Mathematics']],
      ['9', 'A', '4th Period', courseMap['9-A-English']],
      ['9', 'A', '5th Period', courseMap['9-A-Computer Science']],
      ['9', 'A', '6th Period', courseMap['9-A-Social Studies']],
      
      // Class 6A
      ['6', 'A', '1st Period', courseMap['6-A-Mathematics']],
      ['6', 'A', '2nd Period', courseMap['6-A-Science']],
      ['6', 'A', '3rd Period', courseMap['6-A-English']],
      ['6', 'A', '4th Period', courseMap['6-A-Social Studies']],
      ['6', 'A', '5th Period', courseMap['6-A-Computer Science']],
      ['6', 'A', '6th Period', courseMap['6-A-Mathematics']],
      
      // Class 7A
      ['7', 'A', '1st Period', courseMap['7-A-Science']],
      ['7', 'A', '2nd Period', courseMap['7-A-Mathematics']],
      ['7', 'A', '3rd Period', courseMap['7-A-Social Studies']],
      ['7', 'A', '4th Period', courseMap['7-A-English']],
      ['7', 'A', '5th Period', courseMap['7-A-Computer Science']],
      ['7', 'A', '6th Period', courseMap['7-A-Science']],
      
      // Class 8A
      ['8', 'A', '1st Period', courseMap['8-A-English']],
      ['8', 'A', '2nd Period', courseMap['8-A-Mathematics']],
      ['8', 'A', '3rd Period', courseMap['8-A-Science']],
      ['8', 'A', '4th Period', courseMap['8-A-Computer Science']],
      ['8', 'A', '5th Period', courseMap['8-A-Social Studies']],
      ['8', 'A', '6th Period', courseMap['8-A-English']]
    ];

    await pool.query(
      'INSERT INTO timetable (class, section, period_name, course_id) VALUES ?',
      [tt]
    );

    console.log('✅ Timetable seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedDynamicTimetable();
