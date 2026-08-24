const PettyCash = require("../models/pettyCashModel");
const Audit = require("../models/auditModel");
const { sendGenericEmail } = require("../services/emailService");

function actorId(req) { return Number(req.user?.id || req.user?.user_id || 0); }
function isAdmin(req) {
    const u = req.user || {};
    return Number(u?.is_admin) === 1;
}
function number(value, fallback=0) { const n=Number(value); return Number.isFinite(n)?n:fallback; }
function clean(value) { return value===undefined || value===null ? "" : String(value).trim(); }
function audit(data) { Audit.create(data, (e)=>{ if(e) console.error("Petty Cash audit error:",e); }); }

async function ensureStore(req, storeId) {
    if (isAdmin(req)) return true;
    return PettyCash.canAccessStore(actorId(req), Number(storeId));
}

async function ensureAdvanceAccess(req, advance) {
    if (!advance) return false;
    return ensureStore(req, advance.store_id);
}

async function sendPettyCashEventEmail(actorIdValue, event, subject, html, context={}) {
    try {
        // Petty Cash email behavior is controlled centrally from the
        // Email Notifications page. It is not tied to the user who
        // happened to trigger the action.
        const settings = await PettyCash.getGlobalEmailSettings();
        if (settings[event] === false) return;

        const recipients = await PettyCash.getEmailRecipients({
            giverId: context.giverId,
            receiverId: context.receiverId,
            settings
        });

        if (!recipients.length) return;

        await Promise.all(recipients.map((recipient) =>
            sendGenericEmail({
                to: recipient.email,
                subject,
                html
            })
        ));
    } catch (error) {
        console.error(`Petty Cash email (${event}) failed:`, error.message || error);
    }
}

function emailTemplate(title, detail, color="#146c80") {
    return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f7f8;padding:24px;color:#18323b"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #dce7ea;border-radius:12px;overflow:hidden"><div style="background:${color};color:#fff;padding:18px 22px"><h2 style="margin:0">${title}</h2><div style="opacity:.9;margin-top:4px">MIARCUS Petty Cash</div></div><div style="padding:22px">${detail}</div></div></body></html>`;
}

exports.options = async (req,res)=>{
    try { res.json({success:true,data:await PettyCash.getOptions(actorId(req),isAdmin(req))}); }
    catch(error){ console.error("Petty Cash options error:",error); res.status(500).json({success:false,message:"Unable to load petty cash options."}); }
};

exports.summary = async (req,res)=>{
    try { res.json({success:true,data:await PettyCash.getSummary(actorId(req),isAdmin(req),req.query?.store_id||"")}); }
    catch(error){ console.error("Petty Cash summary error:",error); res.status(500).json({success:false,message:"Unable to load petty cash summary."}); }
};

exports.getAll = async (req,res)=>{
    try { res.json({success:true,data:await PettyCash.getAll(req.query||{},actorId(req),isAdmin(req))}); }
    catch(error){ console.error("Petty Cash list error:",error); res.status(500).json({success:false,message:"Unable to load petty cash advances."}); }
};

exports.getById = async (req,res)=>{
    try {
        const data=await PettyCash.getById(req.params.id);
        if(!data) return res.status(404).json({success:false,message:"Petty cash advance not found."});
        if(!(await ensureAdvanceAccess(req,data))) return res.status(403).json({success:false,message:"You cannot access this store's petty cash records."});
        res.json({success:true,data});
    } catch(error){ console.error("Petty Cash detail error:",error); res.status(500).json({success:false,message:"Unable to load petty cash advance."}); }
};

exports.create = async (req,res)=>{
    const userId=actorId(req);
    try {
        const {advance_no,store_id,paid_by,received_by,advance_amount,purpose,advance_date}=req.body;
        if(!clean(advance_no)||!store_id||!paid_by||!received_by) return res.status(400).json({success:false,message:"Advance number, store, paid by and received by are required."});
        if(number(advance_amount)<=0) return res.status(400).json({success:false,message:"Advance amount must be greater than zero."});
        if(!(await ensureStore(req,store_id))) return res.status(403).json({success:false,message:"You cannot create petty cash for this store."});
        if(!isAdmin(req) && Number(paid_by)!==userId) return res.status(403).json({success:false,message:"Only the giver can create an advance in their own name."});
        if(!isAdmin(req) && !(await PettyCash.userBelongsToStore(Number(received_by), Number(store_id)))) return res.status(400).json({success:false,message:"The receiver must be assigned to the selected store."});
        const result=await PettyCash.createAdvance({advance_no:clean(advance_no),store_id:Number(store_id),paid_by:Number(paid_by),received_by:Number(received_by),advance_amount:number(advance_amount),purpose:clean(purpose),advance_date:clean(advance_date)||new Date().toISOString().slice(0,10)});
        audit({module_name:"Petty Cash",reference_id:result.id,action:"CREATE_ADVANCE",new_data:req.body,changed_by:userId});
        const amount=number(advance_amount).toLocaleString("en-IN",{minimumFractionDigits:2});
        const detail=`<p>A new petty cash advance has been created.</p><table cellpadding="7"><tr><td><b>Advance</b></td><td>${clean(advance_no)}</td></tr><tr><td><b>Store</b></td><td>${Number(store_id)}</td></tr><tr><td><b>Amount</b></td><td>₹${amount}</td></tr><tr><td><b>Purpose</b></td><td>${clean(purpose)||"-"}</td></tr></table>`;
        await sendPettyCashEventEmail(userId,"advance_created","Petty Cash Advance Created",emailTemplate("Petty Cash Advance Created",detail),{giverId:Number(paid_by),receiverId:Number(received_by)});
        res.status(201).json({success:true,message:"Petty cash advance created successfully.",data:result});
    } catch(error){ console.error("Petty Cash create error:",error); res.status(error?.code==="ER_DUP_ENTRY"?409:500).json({success:false,message:error?.code==="ER_DUP_ENTRY"?"Advance number already exists.":"Unable to create petty cash advance."}); }
};

exports.addExpense = async (req,res)=>{
    const userId=actorId(req);
    try {
        const {expense_type,description,amount,expense_date}=req.body;
        if(!clean(expense_type)||number(amount)<=0) return res.status(400).json({success:false,message:"Expense type and a valid amount are required."});
        const advance=await PettyCash.getById(req.params.id);
        if(!advance) return res.status(404).json({success:false,message:"Petty cash advance not found."});
        if(!(await ensureAdvanceAccess(req,advance))) return res.status(403).json({success:false,message:"You cannot access this store's petty cash records."});
        if(!isAdmin(req) && Number(advance.received_by)!==userId) return res.status(403).json({success:false,message:"Only the receiver can add expenses."});
        if(advance.status==="SETTLED"||advance.status==="CANCELLED") return res.status(400).json({success:false,message:"This advance can no longer be changed."});
        const file=req.file;
        const result=await PettyCash.addExpense(req.params.id,{expense_type:clean(expense_type),description:clean(description),amount:number(amount),expense_date:clean(expense_date)||new Date().toISOString().slice(0,10),entered_by:userId,bill_filename:file?.originalname||null,bill_path:file?`/uploads/${file.filename}`:null});
        audit({module_name:"Petty Cash",reference_id:req.params.id,action:"ADD_EXPENSE",new_data:{...req.body,file:file?.originalname||null},changed_by:userId});
        const detail=`<p>An expense was added to advance <b>${advance.advance_no}</b>.</p><p>Expense: <b>${clean(expense_type)}</b><br>Amount: <b>₹${number(amount).toLocaleString("en-IN",{minimumFractionDigits:2})}</b><br>Entered by: <b>${advance.received_by_name||"-"}</b></p>`;
        await sendPettyCashEventEmail(userId,"expense_added","Petty Cash Expense Added",emailTemplate("Petty Cash Expense Added",detail),{giverId:Number(advance.paid_by),receiverId:Number(advance.received_by)});
        res.status(201).json({success:true,message:"Expense added successfully.",data:result});
    } catch(error){ console.error("Petty Cash expense error:",error); res.status(500).json({success:false,message:"Unable to add petty cash expense."}); }
};

exports.addDeposit = async (req,res)=>{
    const userId=actorId(req);
    try {
        const {amount,deposited_by,received_by,deposit_date,reference_no}=req.body;
        if(number(amount)<=0||!deposited_by||!received_by) return res.status(400).json({success:false,message:"Deposit amount, deposited by and received by are required."});
        const advance=await PettyCash.getById(req.params.id);
        if(!advance) return res.status(404).json({success:false,message:"Petty cash advance not found."});
        if(!(await ensureAdvanceAccess(req,advance))) return res.status(403).json({success:false,message:"You cannot access this store's petty cash records."});
        if(!isAdmin(req) && Number(advance.received_by)!==userId) return res.status(403).json({success:false,message:"Only the receiver can deposit unused cash."});
        if(!isAdmin(req) && Number(deposited_by)!==userId) return res.status(403).json({success:false,message:"Deposited By must be the receiver."});
        if(Number(received_by)!==Number(advance.paid_by) && !isAdmin(req)) return res.status(403).json({success:false,message:"Cash must be returned to the original giver."});
        if(advance.status==="SETTLED"||advance.status==="CANCELLED") return res.status(400).json({success:false,message:"This advance can no longer be changed."});
        const file=req.file;
        const result=await PettyCash.addDeposit(req.params.id,{amount:number(amount),deposited_by:Number(deposited_by),received_by:Number(received_by),deposit_date:clean(deposit_date)||new Date().toISOString().slice(0,10),reference_no:clean(reference_no),receipt_filename:file?.originalname||null,receipt_path:file?`/uploads/${file.filename}`:null});
        audit({module_name:"Petty Cash",reference_id:req.params.id,action:"ADD_DEPOSIT",new_data:{...req.body,file:file?.originalname||null},changed_by:userId});
        const detail=`<p>Unused cash was deposited for advance <b>${advance.advance_no}</b>.</p><p>Deposit: <b>₹${number(amount).toLocaleString("en-IN",{minimumFractionDigits:2})}</b><br>Deposited by: <b>${advance.received_by_name||"-"}</b><br>Received by: <b>${advance.paid_by_name||"-"}</b></p>`;
        await sendPettyCashEventEmail(userId,"deposit_added","Petty Cash Deposit Recorded",emailTemplate("Petty Cash Deposit Recorded",detail),{giverId:Number(advance.paid_by),receiverId:Number(advance.received_by)});
        res.status(201).json({success:true,message:"Cash deposit recorded successfully.",data:result});
    } catch(error){ console.error("Petty Cash deposit error:",error); res.status(500).json({success:false,message:"Unable to record cash deposit."}); }
};

exports.settle = async (req,res)=>{
    const userId=actorId(req);
    try {
        const before=await PettyCash.getById(req.params.id);
        if(!before) return res.status(404).json({success:false,message:"Petty cash advance not found."});
        if(!(await ensureAdvanceAccess(req,before))) return res.status(403).json({success:false,message:"You cannot access this store's petty cash records."});
        if(!isAdmin(req) && Number(before.paid_by)!==userId) return res.status(403).json({success:false,message:"Only the giver can settle this advance."});
        const result=await PettyCash.settle(req.params.id,userId);
        audit({module_name:"Petty Cash",reference_id:req.params.id,action:"SETTLE",old_data:before,new_data:result,changed_by:userId});
        const detail=`<p>Advance <b>${before.advance_no}</b> has been settled.</p><p>Advance: <b>₹${number(before.advance_amount).toLocaleString("en-IN",{minimumFractionDigits:2})}</b><br>Expense: <b>₹${number(result.total_expense).toLocaleString("en-IN",{minimumFractionDigits:2})}</b><br>Deposit: <b>₹${number(result.total_deposit).toLocaleString("en-IN",{minimumFractionDigits:2})}</b><br>Balance: <b>₹0.00</b></p>`;
        await sendPettyCashEventEmail(userId,"settlement_completed","Petty Cash Advance Settled",emailTemplate("Petty Cash Advance Settled",detail),{giverId:Number(before.paid_by),receiverId:Number(before.received_by)});
        res.json({success:true,message:"Petty cash advance settled successfully.",data:result});
    } catch(error){ console.error("Petty Cash settle error:",error); res.status(400).json({success:false,message:error.message||"Unable to settle petty cash advance."}); }
};

exports.cancel = async (req,res)=>{
    const userId=actorId(req);
    try {
        const before=await PettyCash.getById(req.params.id);
        if(!before) return res.status(404).json({success:false,message:"Petty cash advance not found."});
        if(!(await ensureAdvanceAccess(req,before))) return res.status(403).json({success:false,message:"You cannot access this store's petty cash records."});
        if(!isAdmin(req) && Number(before.paid_by)!==userId) return res.status(403).json({success:false,message:"Only the giver can delete this advance."});
        const result=await PettyCash.cancel(req.params.id);
        if (!result?.affectedRows) {
            return res.status(404).json({success:false,message:"Petty cash advance was not deleted because it no longer exists."});
        }
        audit({module_name:"Petty Cash",reference_id:req.params.id,action:"DELETE",old_data:before,new_data:null,changed_by:userId});
        const detail=`<p>Petty cash advance <b>${before.advance_no}</b> was permanently deleted.</p><p>Store: <b>${before.store_name||"-"}</b><br>Amount: <b>₹${number(before.advance_amount).toLocaleString("en-IN",{minimumFractionDigits:2})}</b></p>`;
        await sendPettyCashEventEmail(userId,"advance_cancelled","Petty Cash Advance Deleted",emailTemplate("Petty Cash Advance Deleted",detail),{giverId:Number(before.paid_by),receiverId:Number(before.received_by)});
        res.json({success:true,message:"Petty cash advance permanently deleted."});
    } catch(error){ console.error("Petty Cash cancel error:",error); res.status(500).json({success:false,message:"Unable to delete petty cash advance."}); }
};

exports.bulkCancel = async (req,res)=>{
    const userId=actorId(req);
    try {
        const deleteAll = req.body?.deleteAll === true || req.body?.deleteAll === "true";
        const requestedIds=Array.isArray(req.body?.ids)
            ? req.body.ids.map(Number).filter(Number.isFinite)
            : [];

        let rows;

        if (deleteAll) {
            // Delete All means every record the current user is allowed to
            // delete. Administrators get every Petty Cash record.
            rows = await PettyCash.getDeleteCandidates(userId, isAdmin(req));
        } else {
            if (!requestedIds.length) {
                return res.status(400).json({
                    success:false,
                    message:"No petty cash records selected."
                });
            }

            rows = await PettyCash.getAll(
                {
                    search:req.body?.search||"",
                    store_id:req.body?.store_id||"",
                    status:req.body?.status||"",
                    paid_by:req.body?.paid_by||"",
                    received_by:req.body?.received_by||"",
                    from:req.body?.from||"",
                    to:req.body?.to||""
                },
                userId,
                isAdmin(req)
            );
        }

        const allowed=new Map((rows||[]).map(r=>[Number(r.id),r]));
        const ids=deleteAll
            ? Array.from(allowed.keys())
            : requestedIds.filter(id=>allowed.has(id));

        if (!isAdmin(req)) {
            const own=ids.map(id=>allowed.get(id)).filter(Boolean);
            if (own.some(x=>Number(x.paid_by)!==userId)) {
                return res.status(403).json({
                    success:false,
                    message:"Only records given by you can be deleted."
                });
            }
        }

        if (!ids.length) {
            return res.status(404).json({
                success:false,
                message: deleteAll
                    ? "There are no Petty Cash records available for deletion."
                    : "No accessible petty cash records were selected."
            });
        }

        const result=await PettyCash.bulkCancel(ids);

        ids.forEach(id=>audit({
            module_name:"Petty Cash",
            reference_id:id,
            action:"DELETE_BULK",
            old_data:allowed.get(id),
            new_data:null,
            changed_by:userId
        }));

        res.json({
            success:true,
            message:`${result.affectedRows||0} petty cash record(s) permanently deleted.`,
            data:{affectedRows:result.affectedRows||0}
        });
    } catch(error){
        console.error("Petty Cash bulk delete error:",error);
        res.status(500).json({
            success:false,
            message:error.message || "Unable to delete petty cash records."
        });
    }
};

exports.emailSettings = async (req,res)=>{
    try {
        res.json({
            success:true,
            data:await PettyCash.getGlobalEmailSettings()
        });
    } catch(error) {
        console.error("Petty Cash email settings load error:",error);
        res.status(500).json({success:false,message:"Unable to load email settings."});
    }
};

exports.updateEmailSettings = async (req,res)=>{
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({
                success:false,
                message:"Only a system administrator can change Petty Cash email notification settings."
            });
        }

        const data = await PettyCash.updateEmailSettings(
            actorId(req),
            req.body || {},
            true
        );

        res.json({
            success:true,
            message:"Email notification settings saved.",
            data
        });
    } catch(error) {
        console.error("Petty Cash email settings error:",error);
        res.status(500).json({success:false,message:"Unable to save email settings."});
    }
};

exports.audit=async (req,res)=>{
    try {
        const advance=await PettyCash.getById(req.params.id);
        if(!advance) return res.status(404).json({success:false,message:"Petty cash advance not found."});
        if(!(await ensureAdvanceAccess(req,advance))) return res.status(403).json({success:false,message:"You cannot access this store's petty cash audit history."});
        Audit.getByReference("Petty Cash",req.params.id,(err,data)=>{
            if(err){ console.error("Petty Cash audit error:",err); return res.status(500).json({success:false,message:"Unable to load audit history."}); }
            res.json({success:true,data});
        });
    } catch(error) {
        console.error("Petty Cash audit access error:",error);
        res.status(500).json({success:false,message:"Unable to load audit history."});
    }
};
