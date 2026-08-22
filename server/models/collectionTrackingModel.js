const db = require("../config/db");

const STAGES = ["Designer","Buyer","Tech Team","Quality","E-Com","Warehouse"];

const DEFAULT_OPTIONS = {
  "Collection":["TEETHING","SAFARI","UNICORN","MOTHERHOOD","KOALA","COUDLE","ARCUS","CHRISTMAS 20","GINGHAM"],
  "Category":["CLOTHING","ACCESSORIES","BABY GEAR","BATHING","BEDDING","FEEDING","FOOTWEAR","FURNITURE"],
  "Sub Category":["BOTTOM WEAR","DUNGAREE","INNERWEAR","JACKET","SETS","SLEEP WEAR","SWEATER"],
  "Product Type":["DENIM","JOGGER","LEGGING","PYJAMA","SHORTS","SKIRT","TROUSER","DUNGAREE"],
  "Weather":["ALL WEATHER","PP WINTER","SUMMER","WINTER"],
  "Season":["AW27","SS27","AW26","SS26","AW25","SS25"],
  "Sizes":["NB","0-3M","3-6M","6-9M","9-12M","12-18M","18-24M","2-3Y","3-4Y","5-6Y"],
  "Color":["Black","White","Navy","Red","Blue","Green","Grey","Beige","Brown","Pink","Yellow","Orange","Purple"],
  "Gender":["BABY BOY","BABY GIRL","MOTHER","UNISEX"],
  "Pattern / Print":["SOLID","STRIPED","CHECK","PRINTED"],
  "Vendor":["Vendor A","Vendor B","Vendor C"],
  "Pack":["Single","2 Pack","3 Pack","Assorted"],
  "Fabric / Material":["100% Cotton","100% Polyester","Blended"],
  "Blend Details":["COTTON/POLYESTER","NATURAL RUBBER","COTTON","POLYESTER"],
  "GST":["GST 18%","GST 3%","GST 5%","GST APPAREL","GST TAXFREE"],
  "Country":["India","China","Bangladesh","Turkey","Vietnam","Other"],
  "Inner Material":["Cotton","Polyester","Foam"],
  "Outer Material":["Cotton","Polyester","Leather","Synthetic"],
  "Sole Material":["Rubber","EVA","PVC"],
  "Closure":["Zip","Button","Velcro","Slip-on"],
  "Capacity":["Small","Medium","Large"],
  "Wash Care":["Machine wash cold","Hand wash only","Do not bleach","Line dry","Dry clean only"],
  "Testing Result":["Pass","Fail","Partially Ok"],
  "Photoshoot Sample Received":["Yes","No"]
};

const DEFAULT_FIELDS = {
 Designer:[
  ["Designer Name","text",true],["Images","attachment-multiple",false],["Collection","select",true],["Category","select",true],
  ["Sub Category","select",true],["Product Type","select",true],["Article Name","text",true],["Weather","select",true],
  ["Season","multiselect",true],["Product Name","text",true],["Sizes","multiselect",true],["Color","multiselect",true],
  ["Gender","multiselect",true],["Pattern / Print","select",true],["Water Proof / Resistant","text",false],["Sleeve Type","text",false],
  ["Pocket","text",false],["Closure Top / Bottom","text",false],["Neck Type","text",false],["Weave","text",false],
  ["Item Contains","text",false],["Designer Remarks","textarea",false]
 ],
 Buyer:[
  ["Article Name","readonly",false],["PPK Code","readonly",true],["Vendor","select",true],["Buyer Name","readonly",true],
  ["Color","readonly",true],["Size","readonly",true],["Gender","readonly",true],["Barcode","text",false],
  ["SKU (Additional Item Code)","text",false],["Product Name","text",true],["Size Non Apparel (L×W×H)","text",true],["Pack","select",true],
  ["Fabric / Material","select",true],["Blend Details","select",true],["GSM","text",true],["Thread Count","text",true],
  ["Composition","text",true],["BIS","text",true],["HSN","text",true],["GST","select",true],["Base Price","text",true],
  ["MRP","text",true],["Country","select",true],["Manufacturer","text",true],["Fit Handover Date","date",true],
  ["PP Sample Handover Date","date",true],["Photo Shoot Sample Handover Date","date",true],["Photo Shoot Sample Handover Picture","attachment-multiple",false],
  ["Buyer Remarks","textarea",false]
 ],
 "Tech Team":[
  ["Barcode","readonly",true],["SKU","readonly",true],["Product Name","readonly",true],["Age Group","readonly",true],
  ["Size Non Apparel","readonly",true],["Pack","readonly",true],["Size Chart","attachment-single",false],["Inner Material","select",true],
  ["Outer Material","select",true],["Sole Material","select",true],["Closure","select",true],["Circumference","text",false],
  ["Capacity","select",true],["Fit Approval Date","date",true],["Size Set Approval Date","date",true],["PP Sample Approval Date","date",true],
  ["Tech Team Remarks","textarea",false]
 ],
 Quality:[
  ["Barcode","readonly",true],["SKU","readonly",true],["Product Name","readonly",true],["Age Group","readonly",true],
  ["Base Price","readonly",true],["MRP","readonly",true],["Packing Dimension","text",true],["Product Weight","text",true],
  ["Wash Care","select",false],["Testing Result","select",false],["Upload Test Result","attachment-multiple",false],["Fail Reason","textarea",false],
  ["Final Inspection Date","date",true],["Final Inspection Report Attachment","attachment-multiple",false],["QC Remarks","textarea",false]
 ],
 "E-Com":[
  ["Barcode","readonly",true],["SKU","readonly",true],["Product Name","readonly",true],["Age Group","readonly",true],
  ["Base Price","readonly",true],["MRP","readonly",true],["Photo Shoot Sample Handover Date","readonly",false],
  ["Photoshoot Sample Received","select",true],["Photo Shoot Sample Received Date","date",true],["Photo Shoot Sample Received Status","readonly",true],
  ["Photo Shoot Completion Date","date",false],["Website Listing Name","text",false],["Channel Listing Date","date",false],["E-Com Remarks","textarea",false]
 ],
 Warehouse:[
  ["Barcode","readonly",true],["SKU","readonly",true],["Product Name","readonly",true],["Age Group","readonly",true],
  ["Base Price","readonly",true],["MRP","readonly",true],["Receiving Date","date",true],["GRN Date","date",true],["Warehouse Remarks","textarea",false]
 ]
};

const parseJson=v=>{try{return v?JSON.parse(v):{};}catch{return{};}};

async function ensureTables(){
 await db.query(`CREATE TABLE IF NOT EXISTS collection_stage_configs (
  id INT AUTO_INCREMENT PRIMARY KEY, stage_name VARCHAR(50) NOT NULL, field_name VARCHAR(150) NOT NULL,
  display_type VARCHAR(40) NOT NULL DEFAULT 'text', is_mandatory TINYINT(1) NOT NULL DEFAULT 0,
  options_json LONGTEXT NULL, sort_order INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_ct_field(stage_name,field_name)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await db.query(`CREATE TABLE IF NOT EXISTS collection_products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, product_code VARCHAR(80) NOT NULL UNIQUE, product_name VARCHAR(255) NULL,
  current_stage VARCHAR(50) NOT NULL DEFAULT 'Designer', status VARCHAR(40) NOT NULL DEFAULT 'In Progress',
  created_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ct_stage(current_stage), INDEX idx_ct_status(status)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await db.query(`CREATE TABLE IF NOT EXISTS collection_stage_data (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, product_id BIGINT NOT NULL, stage_name VARCHAR(50) NOT NULL,
  data_json LONGTEXT NULL, updated_by INT NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ct_stage(product_id,stage_name), INDEX idx_ct_product(product_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await db.query(`CREATE TABLE IF NOT EXISTS collection_stage_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, product_id BIGINT NOT NULL, stage_name VARCHAR(50) NOT NULL,
  action VARCHAR(40) NOT NULL, note TEXT NULL, user_id INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ct_history(product_id,id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await db.query(`CREATE TABLE IF NOT EXISTS collection_comments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, product_id BIGINT NOT NULL, stage_name VARCHAR(50) NOT NULL,
  user_id INT NULL, comment TEXT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ct_comments(product_id,id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await db.query(`CREATE TABLE IF NOT EXISTS collection_requests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, product_id BIGINT NOT NULL, from_stage VARCHAR(50) NOT NULL,
  to_stage VARCHAR(50) NOT NULL, requested_by INT NULL, status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  note TEXT NULL, reviewed_by INT NULL, reviewed_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ct_req_status(status)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await db.query(`CREATE TABLE IF NOT EXISTS collection_permissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, stage_name VARCHAR(50) NOT NULL, department_id INT NULL,
  cross_department TINYINT(1) NOT NULL DEFAULT 0, UNIQUE KEY uq_ct_perm(stage_name,department_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 for(const stage of STAGES){
   const existing=await db.query("SELECT COUNT(*) c FROM collection_stage_configs WHERE stage_name=?",[stage]);
   if(Number(existing[0]?.c||0)===0){
     for(let i=0;i<DEFAULT_FIELDS[stage].length;i++){
       const [field,type,mandatory]=DEFAULT_FIELDS[stage][i];
       await db.query(
         "INSERT IGNORE INTO collection_stage_configs(stage_name,field_name,display_type,is_mandatory,options_json,sort_order) VALUES(?,?,?,?,?,?)",
         [stage,field,type,mandatory?1:0,JSON.stringify(DEFAULT_OPTIONS[field]||[]),i]
       );
     }
   }
 }
}

const getConfigs=async stage=>{
 const rows=await db.query(`SELECT * FROM collection_stage_configs ${stage?"WHERE stage_name=?":""} ORDER BY stage_name,sort_order,id`,stage?[stage]:[]);
 return rows.map(r=>({...r,is_mandatory:Boolean(r.is_mandatory),options:parseJson(r.options_json)||[]}));
};

const saveConfigs=async(stage,fields)=>{
 const c=await db.getConnection();
 try{
  await c.beginTransaction();
  await c.query("DELETE FROM collection_stage_configs WHERE stage_name=?",[stage]);
  for(let i=0;i<fields.length;i++){
   const f=fields[i];
   await c.query(
    "INSERT INTO collection_stage_configs(stage_name,field_name,display_type,is_mandatory,options_json,sort_order) VALUES(?,?,?,?,?,?)",
    [stage,String(f.field_name||"Field"),String(f.display_type||"text"),f.is_mandatory?1:0,JSON.stringify(f.options||[]),i]
   );
  }
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
};

const createProduct=async({productCode,productName,createdBy,data})=>{
 const result=await db.query(
  "INSERT INTO collection_products(product_code,product_name,current_stage,status,created_by) VALUES(?,?,'Designer','In Progress',?)",
  [productCode,productName||null,createdBy||null]
 );
 const id=result.insertId;
 await db.query("INSERT INTO collection_stage_data(product_id,stage_name,data_json,updated_by) VALUES(?,?,?,?)",
  [id,"Designer",JSON.stringify(data||{}),createdBy||null]);
 await db.query("INSERT INTO collection_stage_history(product_id,stage_name,action,note,user_id) VALUES(?,?,?,?,?)",
  [id,"Designer","Created","Product created",createdBy||null]);
 return getProduct(id);
};

const listProducts=async({search="",stage="",status="",page=1,pageSize=20}={})=>{
 const p=Math.max(1,Number(page)||1),s=Math.min(100,Math.max(1,Number(pageSize)||20)),o=(p-1)*s;
 const cond=[],params=[];
 if(search){const q=`%${search}%`;cond.push("(p.product_code LIKE ? OR p.product_name LIKE ?)");params.push(q,q);}
 if(stage){cond.push("p.current_stage=?");params.push(stage);}
 if(status){cond.push("p.status=?");params.push(status);}
 const where=cond.length?"WHERE "+cond.join(" AND "):"";
 const [rows,count]=await Promise.all([
  db.query(`SELECT p.*,u.name creator_name FROM collection_products p LEFT JOIN users u ON u.id=p.created_by ${where} ORDER BY p.updated_at DESC,p.id DESC LIMIT ? OFFSET ?`,[...params,s,o]),
  db.query(`SELECT COUNT(*) total FROM collection_products p ${where}`,params)
 ]);
 return {rows,total:Number(count[0]?.total||0),page:p,pageSize:s};
};

const getProduct=async id=>{
 const rows=await db.query("SELECT p.*,u.name creator_name,u.email creator_email FROM collection_products p LEFT JOIN users u ON u.id=p.created_by WHERE p.id=? LIMIT 1",[id]);
 if(!rows[0])return null;
 const stages=await db.query("SELECT * FROM collection_stage_data WHERE product_id=? ORDER BY id",[id]);
 return {...rows[0],stage_data:Object.fromEntries(stages.map(r=>[r.stage_name,parseJson(r.data_json)]))};
};

const getHistory=async id=>db.query(
 `SELECT h.*,u.name user_name,u.email user_email FROM collection_stage_history h
  LEFT JOIN users u ON u.id=h.user_id WHERE h.product_id=? ORDER BY h.id DESC`,[id]);

const getComments=async id=>db.query(
 `SELECT c.*,u.name user_name,u.email user_email FROM collection_comments c
  LEFT JOIN users u ON u.id=c.user_id WHERE c.product_id=? ORDER BY c.id DESC`,[id]);

const updateStage=async({id,stage,data,userId,note,nextStage})=>{
 const c=await db.getConnection();
 try{
  await c.beginTransaction();
  await c.query(
   `INSERT INTO collection_stage_data(product_id,stage_name,data_json,updated_by) VALUES(?,?,?,?)
    ON DUPLICATE KEY UPDATE data_json=VALUES(data_json),updated_by=VALUES(updated_by)`,
   [id,stage,JSON.stringify(data||{}),userId||null]
  );
  const target=nextStage||stage;
  await c.query("UPDATE collection_products SET current_stage=?,status=? WHERE id=?",
   [target,target===STAGES[STAGES.length-1]?"Completed":"In Progress",id]);
  await c.query("INSERT INTO collection_stage_history(product_id,stage_name,action,note,user_id) VALUES(?,?,?,?,?)",
   [id,stage,nextStage?"Submitted":"Updated",note||null,userId||null]);
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
 return getProduct(id);
};

const addComment=async({id,stage,comment,userId})=>{
 const r=await db.query("INSERT INTO collection_comments(product_id,stage_name,user_id,comment) VALUES(?,?,?,?)",
  [id,stage,userId||null,comment]);
 return (await db.query(
  `SELECT c.*,u.name user_name,u.email user_email FROM collection_comments c
   LEFT JOIN users u ON u.id=c.user_id WHERE c.id=?`,[r.insertId]))[0];
};

const createRequest=async({id,fromStage,toStage,userId,note})=>
 (await db.query("INSERT INTO collection_requests(product_id,from_stage,to_stage,requested_by,note) VALUES(?,?,?,?,?)",
  [id,fromStage,toStage,userId||null,note||null])).insertId;

const listRequests=async({status="Pending"}={})=>db.query(
 `SELECT r.*,p.product_code,p.product_name,u.name requester_name FROM collection_requests r
  JOIN collection_products p ON p.id=r.product_id LEFT JOIN users u ON u.id=r.requested_by
  WHERE (?='' OR r.status=?) ORDER BY r.id DESC`,[status,status]);

const reviewRequest=async({id,status,userId})=>
 db.query("UPDATE collection_requests SET status=?,reviewed_by=?,reviewed_at=NOW() WHERE id=?",[status,userId,id]);

const deleteProduct=async id=>{
 const c=await db.getConnection();
 try{await c.beginTransaction();
  for(const t of ["collection_stage_data","collection_stage_history","collection_comments","collection_requests"]) await c.query(`DELETE FROM ${t} WHERE product_id=?`,[id]);
  await c.query("DELETE FROM collection_products WHERE id=?",[id]); await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
};
const deleteAll=async()=>{
 const c=await db.getConnection();
 try{await c.beginTransaction();
  for(const t of ["collection_stage_data","collection_stage_history","collection_comments","collection_requests"]) await c.query(`DELETE FROM ${t}`);
  await c.query("DELETE FROM collection_products"); await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
};
const exportProducts=()=>db.query(
 `SELECT p.id,p.product_code,p.product_name,p.current_stage,p.status,p.created_at,p.updated_at,u.name creator
  FROM collection_products p LEFT JOIN users u ON u.id=p.created_by ORDER BY p.id DESC`);

const getInsight=async()=>{
 const [summary,stages,months]=await Promise.all([
  db.query("SELECT COUNT(*) total,COUNT(DISTINCT product_name) products FROM collection_products"),
  db.query("SELECT current_stage stage,COUNT(*) count FROM collection_products GROUP BY current_stage"),
  db.query("SELECT DATE_FORMAT(created_at,'%Y-%m') month,COUNT(*) count FROM collection_products GROUP BY month ORDER BY month DESC LIMIT 12")
 ]);
 return {summary:summary[0]||{},stages,months};
};

const getPreviousRecipients=async(productId,currentStage,excludeUserId)=>{
 const idx=STAGES.indexOf(currentStage);
 let rows=[];
 if(idx<=0){
  rows=await db.query(`SELECT u.id,u.name,u.email FROM collection_products p
   LEFT JOIN users u ON u.id=p.created_by WHERE p.id=? AND u.status='Active'`,[productId]);
 }else{
  const prev=STAGES[idx-1];
  rows=await db.query(`SELECT u.id,u.name,u.email,MAX(h.id) AS last_history_id FROM collection_stage_history h
   JOIN users u ON u.id=h.user_id WHERE h.product_id=? AND h.stage_name=? AND u.status='Active'
   GROUP BY u.id,u.name,u.email ORDER BY last_history_id DESC`,
   [productId,prev]);
 }
 return rows.filter(x=>Number(x.id)!==Number(excludeUserId));
};

const getPermissions=async()=>{
 const [departments,permissions]=await Promise.all([
  db.query("SELECT id,department_name FROM departments ORDER BY department_name"),
  db.query("SELECT * FROM collection_permissions ORDER BY stage_name")
 ]);
 return {departments,permissions:permissions.map(x=>({...x,cross_department:Boolean(x.cross_department)}))};
};

const savePermissions=async(items)=>{
 const c=await db.getConnection();
 try{
  await c.beginTransaction();
  await c.query("DELETE FROM collection_permissions");
  for(const x of (items||[])){
   if(x.department_id) await c.query(
    "INSERT INTO collection_permissions(stage_name,department_id,cross_department) VALUES(?,?,?)",
    [x.stage_name,Number(x.department_id),x.cross_department?1:0]
   );
  }
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
};

module.exports={STAGES,ensureTables,getConfigs,saveConfigs,createProduct,listProducts,getProduct,getHistory,getComments,
 updateStage,addComment,createRequest,listRequests,reviewRequest,deleteProduct,deleteAll,exportProducts,getInsight,
 getPreviousRecipients,getPermissions,savePermissions};
