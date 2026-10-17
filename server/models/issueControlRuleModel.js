const db = require("../config/db");
const query = (sql, params=[]) => new Promise((resolve,reject)=>db.query(sql,params,(e,r)=>e?reject(e):resolve(r)));

// ------------------------------------------------------
// One rule per question + checklist type.
// Older databases have UNIQUE(question_text) only, which blocked a
// rule for the same wording in a different checklist. It is replaced
// (once, in a single ALTER) by UNIQUE(question_text, checklist_type).
// The new key is less strict than the old one, so existing rows always
// satisfy it. Failure is logged and never blocks the module.
// ------------------------------------------------------
async function migrateUniqueKey(){
  try {
    const oldKey = await query(`SHOW INDEX FROM issue_control_rules WHERE Key_name = 'uq_issue_question'`);
    if (!oldKey || !oldKey.length) return;
    const columns = oldKey.map((row) => String(row.Column_name || "").toLowerCase());
    if (columns.length === 1 && columns[0] === "question_text") {
      await query(`ALTER TABLE issue_control_rules DROP INDEX uq_issue_question, ADD UNIQUE KEY uq_issue_question_type (question_text(191), checklist_type(100))`);
      console.log("✅ issue_control_rules: unique key is now question + checklist type");
    }
  } catch (error) {
    console.warn("⚠️ issue_control_rules unique key migration skipped:", error.message);
  }
}

let ready;
async function ensureTable(){
  if(!ready){
    ready=(async()=>{
      await query(`CREATE TABLE IF NOT EXISTS issue_control_rules (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, question_id INT NULL, question_text VARCHAR(1000) NOT NULL, checklist_type VARCHAR(255) NULL, expected_answer VARCHAR(255) NOT NULL DEFAULT 'Yes', issue_answer VARCHAR(255) NOT NULL DEFAULT 'No', priority VARCHAR(30) NOT NULL DEFAULT 'Medium', sla_days INT NOT NULL DEFAULT 3, departments VARCHAR(500) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY uq_issue_question_type (question_text(191), checklist_type(100))) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      await migrateUniqueKey();
    })();
    // A failed CREATE must not be cached forever.
    ready.catch(()=>{ ready=null; });
  }
  return ready;
}
module.exports={ensureTable,query};
