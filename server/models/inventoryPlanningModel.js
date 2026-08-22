const db = require("../config/db");
const SALES_TABLE = "inventory_historical_sales";
const PLANS_TABLE = "inventory_plans";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const createTables = async (callback) => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS ${SALES_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY, store_id INT NULL, store_name VARCHAR(255) NOT NULL,
      sale_year INT NOT NULL, sale_month VARCHAR(20) NOT NULL, category VARCHAR(160) NOT NULL,
      sales_amount DECIMAL(16,2) NOT NULL DEFAULT 0, units_sold DECIMAL(16,2) NOT NULL DEFAULT 0,
      discount_percent DECIMAL(7,2) NOT NULL DEFAULT 0, created_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ips_store(store_id), INDEX idx_ips_store_name(store_name),
      INDEX idx_ips_period(sale_year,sale_month), INDEX idx_ips_category(category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.query(`CREATE TABLE IF NOT EXISTS ${PLANS_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY, store_ids TEXT NULL, store_names TEXT NULL,
      planning_month VARCHAR(20) NOT NULL, planning_year INT NOT NULL,
      benchmark_percent DECIMAL(5,2) NOT NULL DEFAULT 80, ai_allocation TINYINT(1) NOT NULL DEFAULT 0,
      total_quantity DECIMAL(16,2) NOT NULL DEFAULT 0, total_sales DECIMAL(16,2) NOT NULL DEFAULT 0,
      overall_discount DECIMAL(7,2) NOT NULL DEFAULT 0, recommendations_json LONGTEXT NULL,
      optional_categories_json LONGTEXT NULL, optimization_alerts_json LONGTEXT NULL,
      created_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ip_plan_period(planning_year,planning_month), INDEX idx_ip_plan_created(created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    if (callback) callback(null);
  } catch (e) { if (callback) callback(e); else throw e; }
};

const normalizeMonth = (value) => {
  const raw = String(value ?? "").trim(); if (!raw) return "";
  const n = Number(raw); if (Number.isInteger(n) && n >= 1 && n <= 12) return MONTHS[n-1];
  const full = MONTHS.find(m => m.toLowerCase() === raw.toLowerCase()); if (full) return full;
  return MONTHS.find(m => m.slice(0,3).toLowerCase() === raw.slice(0,3).toLowerCase()) || raw;
};
const normalizeNumber = (v, fallback=0) => { const n=Number(String(v ?? "").replace(/[,₹$%]/g,"").trim()); return Number.isFinite(n)?n:fallback; };

const listSales = async ({page=1,pageSize=10,search="",store="",year="",category=""}={}) => {
  const p=Math.max(1,Number(page)||1), size=Math.min(100,Math.max(1,Number(pageSize)||10)), offset=(p-1)*size;
  const c=[], params=[]; const q=String(search).trim();
  if(q){const like=`%${q}%`; c.push("(store_name LIKE ? OR category LIKE ? OR sale_month LIKE ?)"); params.push(like,like,like);}
  if(String(store).trim()){c.push("store_name = ?");params.push(String(store).trim());}
  if(year){c.push("sale_year = ?");params.push(Number(year));}
  if(String(category).trim()){c.push("category = ?");params.push(String(category).trim());}
  const where=c.length?`WHERE ${c.join(" AND ")}`:"";
  const [rows,count]=await Promise.all([
    db.query(`SELECT id,store_id,store_name,sale_year,sale_month,category,sales_amount,units_sold,discount_percent,created_by,created_at FROM ${SALES_TABLE} ${where} ORDER BY sale_year DESC,id DESC LIMIT ? OFFSET ?`,[...params,size,offset]),
    db.query(`SELECT COUNT(*) total FROM ${SALES_TABLE} ${where}`,params)
  ]);
  return {rows,total:Number(count[0]?.total||0),page:p,pageSize:size};
};
const getSalesById=async id=>(await db.query(`SELECT * FROM ${SALES_TABLE} WHERE id=? LIMIT 1`,[id]))[0]||null;
const createSale=async d=>(await db.query(`INSERT INTO ${SALES_TABLE}(store_id,store_name,sale_year,sale_month,category,sales_amount,units_sold,discount_percent,created_by) VALUES(?,?,?,?,?,?,?,?,?)`,[d.store_id||null,d.store_name,Number(d.sale_year),normalizeMonth(d.sale_month),d.category,normalizeNumber(d.sales_amount),normalizeNumber(d.units_sold),normalizeNumber(d.discount_percent),d.created_by||null])).insertId;
const deleteSale=id=>db.query(`DELETE FROM ${SALES_TABLE} WHERE id=?`,[id]);
const deleteAllSales=()=>db.query(`DELETE FROM ${SALES_TABLE}`);
const exportSales=()=>db.query(`SELECT * FROM ${SALES_TABLE} ORDER BY sale_year DESC,id DESC`);
const getOptions=async()=>{const [stores,categories,years]=await Promise.all([db.query(`SELECT id,store_name,store_code FROM stores ORDER BY store_name`),db.query(`SELECT DISTINCT category FROM ${SALES_TABLE} WHERE category<>'' ORDER BY category`),db.query(`SELECT DISTINCT sale_year year FROM ${SALES_TABLE} ORDER BY sale_year DESC`)]);return {stores,categories:categories.map(x=>x.category),years:years.map(x=>x.year)};};
const resolveStores=async ids=>{const clean=(ids||[]).map(Number).filter(Number.isFinite);if(!clean.length)return [];return db.query(`SELECT id,store_name FROM stores WHERE id IN (${clean.map(()=>"?").join(",")}) ORDER BY store_name`,clean);};

const analyze=async({storeIds,planningMonth,planningYear,benchmarkPercent=80,aiAllocation=false,removeLowPerformance=false})=>{
  const stores=await resolveStores(storeIds); if(!stores.length) throw new Error("Please select at least one store.");
  const names=stores.map(s=>s.store_name), ph=names.map(()=>"?").join(","), month=normalizeMonth(planningMonth), prior=Math.max(0,Number(planningYear)-1);
  let rows=await db.query(`SELECT category,SUM(sales_amount) sales_amount,SUM(units_sold) units_sold,CASE WHEN SUM(sales_amount)=0 THEN 0 ELSE SUM(sales_amount*discount_percent)/SUM(sales_amount) END discount_percent FROM ${SALES_TABLE} WHERE store_name IN (${ph}) AND LOWER(sale_month)=LOWER(?) AND sale_year<=? GROUP BY category ORDER BY sales_amount DESC`,[...names,month,prior]);
  if(!rows.length) rows=await db.query(`SELECT category,SUM(sales_amount) sales_amount,SUM(units_sold) units_sold,CASE WHEN SUM(sales_amount)=0 THEN 0 ELSE SUM(sales_amount*discount_percent)/SUM(sales_amount) END discount_percent FROM ${SALES_TABLE} WHERE store_name IN (${ph}) AND LOWER(sale_month)=LOWER(?) GROUP BY category ORDER BY sales_amount DESC`,[...names,month]);
  const totalSales=rows.reduce((a,r)=>a+Number(r.sales_amount||0),0), totalQuantity=rows.reduce((a,r)=>a+Number(r.units_sold||0),0);
  const overallDiscount=totalSales?rows.reduce((a,r)=>a+Number(r.sales_amount||0)*Number(r.discount_percent||0),0)/totalSales:0;
  const ranked=rows.map(r=>({category:r.category,sales:Number(r.sales_amount||0),units:Number(r.units_sold||0),discount:Number(r.discount_percent||0),share:totalSales?Number(r.sales_amount||0)/totalSales*100:0}));
  const working=removeLowPerformance?ranked.filter(r=>r.share>1):ranked;
  const benchmark=aiAllocation?100:Math.min(100,Math.max(1,Number(benchmarkPercent)||80));
  const recommended=aiAllocation?working:working.slice(0,5), optional=aiAllocation?[]:working.slice(5);
  const recShare=recommended.reduce((a,r)=>a+r.share,0), allocationQuantity=totalQuantity*(benchmark/100);
  const recommendations=recommended.map((r,i)=>({...r,rank:i+1,allocationPercent:recShare?r.share/recShare*benchmark:0,suggestedQuantity:Math.round(allocationQuantity*(recShare?r.share/recShare:0))}));
  const optionalQty=Math.max(0,totalQuantity-recommendations.reduce((a,r)=>a+r.suggestedQuantity,0)), optShare=optional.reduce((a,r)=>a+r.share,0);
  const optionalCategories=optional.map(r=>({...r,allocationPercent:optShare?r.share/optShare*(100-benchmark):0,suggestedQuantity:Math.round(optionalQty*(optShare?r.share/optShare:0))}));
  const optimizationAlerts=ranked.filter(r=>r.share<=1).slice(0,8).map(r=>({category:r.category,share:Number(r.share.toFixed(1))}));
  return {storeIds:stores.map(s=>s.id),storeNames:names,planningMonth:month,planningYear:Number(planningYear),benchmarkPercent:benchmark,totalSales,totalQuantity:Math.round(totalQuantity),overallDiscount,recommendations,optionalCategories,optimizationAlerts,sourceYear:prior,hasHistoricalData:rows.length>0,aiAllocation:Boolean(aiAllocation),replanBudget:Boolean(removeLowPerformance)};
};
const savePlan=async(p,userId)=>(await db.query(`INSERT INTO ${PLANS_TABLE}(store_ids,store_names,planning_month,planning_year,benchmark_percent,ai_allocation,total_quantity,total_sales,overall_discount,recommendations_json,optional_categories_json,optimization_alerts_json,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,[JSON.stringify(p.storeIds||[]),JSON.stringify(p.storeNames||[]),p.planningMonth,Number(p.planningYear),Number(p.benchmarkPercent),p.aiAllocation?1:0,Number(p.totalQuantity||0),Number(p.totalSales||0),Number(p.overallDiscount||0),JSON.stringify(p.recommendations||[]),JSON.stringify(p.optionalCategories||[]),JSON.stringify(p.optimizationAlerts||[]),userId||null])).insertId;
const parseJson=v=>{try{return v?JSON.parse(v):[];}catch{return[];}};
const normalizePlan=r=>({...r,store_ids:parseJson(r.store_ids),store_names:parseJson(r.store_names),recommendations:parseJson(r.recommendations_json),optional_categories:parseJson(r.optional_categories_json),optimization_alerts:parseJson(r.optimization_alerts_json),ai_allocation:Boolean(r.ai_allocation),total_quantity:Number(r.total_quantity||0),total_sales:Number(r.total_sales||0),overall_discount:Number(r.overall_discount||0)});
const listPlans=async()=>(await db.query(`SELECT * FROM ${PLANS_TABLE} ORDER BY created_at DESC,id DESC`)).map(normalizePlan);
const getPlan=async id=>{const r=await db.query(`SELECT * FROM ${PLANS_TABLE} WHERE id=? LIMIT 1`,[id]);return r[0]?normalizePlan(r[0]):null;};
const deletePlan=id=>db.query(`DELETE FROM ${PLANS_TABLE} WHERE id=?`,[id]);
const deleteAllPlans=()=>db.query(`DELETE FROM ${PLANS_TABLE}`);
const exportPlans=async()=>(await db.query(`SELECT * FROM ${PLANS_TABLE} ORDER BY created_at DESC,id DESC`)).map(normalizePlan);
const bulkInsertSales=async(rows,userId)=>{const c=await db.getConnection();try{await c.beginTransaction();for(const r of rows)await c.query(`INSERT INTO ${SALES_TABLE}(store_id,store_name,sale_year,sale_month,category,sales_amount,units_sold,discount_percent,created_by) VALUES(?,?,?,?,?,?,?,?,?)`,[r.store_id||null,r.store_name,Number(r.sale_year),normalizeMonth(r.sale_month),r.category,normalizeNumber(r.sales_amount),normalizeNumber(r.units_sold),normalizeNumber(r.discount_percent),userId||null]);await c.commit();return rows.length;}catch(e){await c.rollback();throw e;}finally{c.release();}};
module.exports={MONTHS,createTables,normalizeMonth,normalizeNumber,listSales,getSalesById,createSale,deleteSale,deleteAllSales,exportSales,getOptions,analyze,savePlan,listPlans,getPlan,deletePlan,deleteAllPlans,exportPlans,bulkInsertSales};
