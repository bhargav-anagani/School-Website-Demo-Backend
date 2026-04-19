-- ============================================================
-- International High School — Database Schema
-- Engine: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS international_high_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE international_high_school;

-- ─────────────────────────────────────────────────────────────
-- 1. USERS (authentication + role)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(100)  NOT NULL UNIQUE,
  name         VARCHAR(150)  NOT NULL,
  email        VARCHAR(200),
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('admin','teacher','student','parent') NOT NULL,
  phone        VARCHAR(20),
  is_active    BOOLEAN DEFAULT TRUE,
  reset_token  VARCHAR(255),
  reset_token_expiry DATETIME,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 2. STUDENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  roll_no      VARCHAR(20) UNIQUE,
  class        VARCHAR(10)  NOT NULL,
  section      VARCHAR(5)   NOT NULL,
  dob          DATE,
  gender       ENUM('male','female','other'),
  address      TEXT,
  photo_url    VARCHAR(500),
  admitted_on  DATE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 3. TEACHERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL UNIQUE,
  employee_id     VARCHAR(30) UNIQUE,
  subject         VARCHAR(100),
  qualification   VARCHAR(200),
  joining_date    DATE,
  photo_url       VARCHAR(500),
  assigned_class  VARCHAR(10) DEFAULT NULL,
  assigned_section VARCHAR(5) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 4. PARENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parents (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  student_id   INT NOT NULL,
  relation     ENUM('father','mother','guardian') NOT NULL,
  occupation   VARCHAR(100),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 5. ADMINS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  department   VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 6. COURSES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  description  TEXT,
  class        VARCHAR(10)  NOT NULL,
  teacher_id   INT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────
-- 7. ATTENDANCE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  student_id   INT NOT NULL,
  teacher_id   INT NOT NULL,
  date         DATE NOT NULL,
  status       ENUM('present','absent','late','holiday') DEFAULT 'present',
  remarks      VARCHAR(255),
  UNIQUE KEY unique_attendance (student_id, date),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 8. RESULTS / MARKS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  student_id   INT NOT NULL,
  teacher_id   INT NOT NULL,
  subject      VARCHAR(100) NOT NULL,
  exam_type    ENUM('unit_test','mid_term','final','assignment') NOT NULL,
  marks        DECIMAL(5,2) NOT NULL,
  max_marks    DECIMAL(5,2) NOT NULL DEFAULT 100,
  grade        VARCHAR(5),
  remarks      VARCHAR(255),
  exam_date    DATE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_result (student_id, subject, exam_type),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 9. ANNOUNCEMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  content      TEXT         NOT NULL,
  category     VARCHAR(50)  DEFAULT 'General',
  author_id    INT          NOT NULL,
  target_role  ENUM('all','student','teacher','parent','admin') DEFAULT 'all',
  is_public    BOOLEAN DEFAULT FALSE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 10. FEES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fees (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  student_id     INT NOT NULL,
  fee_type       VARCHAR(100) DEFAULT 'Tuition Fee',
  amount         DECIMAL(10,2) NOT NULL,
  due_date       DATE          NOT NULL,
  paid           BOOLEAN DEFAULT FALSE,
  paid_date      DATE,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(200),
  razorpay_order_id   VARCHAR(200),
  razorpay_payment_id VARCHAR(200),
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 11. GALLERY
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200),
  image_url    VARCHAR(500) NOT NULL,
  category     VARCHAR(100) DEFAULT 'Events',
  uploaded_by  INT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────
-- 12. CONTACT SUBMISSIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_submissions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  email        VARCHAR(200) NOT NULL,
  phone        VARCHAR(20),
  subject      VARCHAR(200),
  message      TEXT NOT NULL,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 13. ADMISSIONS (Public Enquiry / Application)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admissions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  applicant_name  VARCHAR(150) NOT NULL,
  dob             DATE,
  class_applied   VARCHAR(10)  NOT NULL,
  parent_name     VARCHAR(150) NOT NULL,
  email           VARCHAR(200) NOT NULL,
  phone           VARCHAR(20)  NOT NULL,
  address         TEXT,
  previous_school VARCHAR(200),
  status          ENUM('pending','review','approved','rejected') DEFAULT 'pending',
  remarks         TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- 14. TEACHER ATTENDANCE
CREATE TABLE IF NOT EXISTS teacher_attendance (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id   INT NOT NULL,
  date         DATE NOT NULL,
  status       ENUM('present','absent','late','on_leave') DEFAULT 'present',
  remarks      VARCHAR(255),
  UNIQUE KEY unique_teacher_attendance (teacher_id, date),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- 15. SALARIES
CREATE TABLE IF NOT EXISTS salaries (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id     INT NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  month          VARCHAR(20)   NOT NULL,
  year           INT           NOT NULL,
  status         ENUM('pending','paid') DEFAULT 'pending',
  paid_date      DATE,
  transaction_id VARCHAR(100),
  remarks        VARCHAR(255),
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);
