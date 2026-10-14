const db = require("../config/db");
const query = (sql, params=[]) => new Promise((resolve,reject)=>db.query(sql,params,(e,r)=>e?reject(e):resolve(r)));
let ready;
async function ensureTable(){ if(!ready) ready=query(`CREATE TABLE IF NOT EXISTS issue_control_rules (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, question_id INT NULL, question_text VARCHAR(1000) NOT NULL, checklist_type VARCHAR(255) NULL, expected_answer VARCHAR(255) NOT NULL DEFAULT 'Yes', issue_answer VARCHAR(255) NOT NULL DEFAULT 'No', priority VARCHAR(30) NOT NULL DEFAULT 'Medium', sla_days INT NOT NULL DEFAULT 3, departments VARCHAR(500) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY uq_issue_question (question_text(191))) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`); return ready; }
module.exports={ensureTable,query};
