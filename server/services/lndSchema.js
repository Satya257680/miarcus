const db = require("../config/db");

// Tables are created automatically on first use (same pattern as
// user_page_permissions) — no manual migration required.

const STATEMENTS = [
`CREATE TABLE IF NOT EXISTS lnd_programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  audience VARCHAR(80) NOT NULL DEFAULT 'All Staff',
  status VARCHAR(10) NOT NULL DEFAULT 'Active',
  thumb_media_id INT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS lnd_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  highlights TEXT NULL,
  duration_min INT NOT NULL DEFAULT 10,
  mandatory TINYINT(1) NOT NULL DEFAULT 1,
  allow_download TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(10) NOT NULL DEFAULT 'Active',
  sort_order INT NOT NULL DEFAULT 0,
  pass_mark INT NOT NULL DEFAULT 70,
  exam_minutes INT NOT NULL DEFAULT 15,
  video_url VARCHAR(500) NULL,
  thumb_media_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_lnd_modules_program (program_id)
)`,
`CREATE TABLE IF NOT EXISTS lnd_media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NULL,
  module_id INT NULL,
  kind VARCHAR(10) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_lnd_media_module (module_id)
)`,
`CREATE TABLE IF NOT EXISTS lnd_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_id INT NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INT NOT NULL,
  explanation TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  KEY idx_lnd_questions_module (module_id)
)`,
`CREATE TABLE IF NOT EXISTS lnd_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  kind VARCHAR(12) NOT NULL,
  ref_id INT NULL,
  KEY idx_lnd_assign_program (program_id)
)`,
`CREATE TABLE IF NOT EXISTS lnd_progress (
  user_id INT NOT NULL,
  module_id INT NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  best_score INT NULL,
  passed TINYINT(1) NOT NULL DEFAULT 0,
  attempts INT NOT NULL DEFAULT 0,
  last_viewed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, module_id)
)`,
`CREATE TABLE IF NOT EXISTS lnd_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  module_id INT NOT NULL,
  started_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  score INT NULL,
  passed TINYINT(1) NOT NULL DEFAULT 0,
  KEY idx_lnd_attempts_user (user_id, module_id)
)`,
`CREATE TABLE IF NOT EXISTS lnd_certificates (
  user_id INT NOT NULL,
  program_id INT NOT NULL,
  code VARCHAR(60) NOT NULL,
  issued_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, program_id)
)`,
];

let ready = null;

const ensureSchema = () => {
    if (!ready) {
        ready = (async () => {
            for (const sql of STATEMENTS) await db.query(sql);
            return true;
        })().catch((error) => {
            ready = null;
            throw error;
        });
    }
    return ready;
};

module.exports = { ensureSchema };
