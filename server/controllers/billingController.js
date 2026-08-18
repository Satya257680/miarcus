const Billing = require("../models/billingModel");
const Audit = require("../models/auditModel");

const actorId = req => req.user?.id || req.user?.user_id || req.body?.created_by;

exports.createBill = (req, res) => {
    const userId = actorId(req);
    const { bill_no, store_id, customer_name, bill_date, subtotal, discount=0, tax=0, grand_total, items=[], payment_type, payment_amount, transaction_reference } = req.body;
    if (!bill_no || !store_id || grand_total === undefined || !payment_type) return res.status(400).json({ success:false, message:"Bill number, store, total and payment type are required." });
    Billing.createBill({ bill_no, store_id, customer_name, bill_date: bill_date || new Date(), subtotal: Number(subtotal||0), discount:Number(discount||0), tax:Number(tax||0), grand_total:Number(grand_total), created_by:userId }, items, { payment_type, amount:Number(payment_amount ?? grand_total), transaction_reference }, (err, result) => {
        if (err) return res.status(500).json({ success:false, message:"Failed to create bill", error:err.message });
        Audit.create({ module_name:"Billing", reference_id:result.id, action:"CREATE", new_data:req.body, changed_by:userId }, auditErr => { if (auditErr) console.error("Billing audit error:", auditErr); });
        res.status(201).json({ success:true, message:"Bill created successfully", data:result });
    });
};

exports.getBills = (req,res) => Billing.getBills(req.query, (err,data) => err ? res.status(500).json({success:false,message:"Failed to fetch bills"}) : res.json({success:true,data}));
exports.getBillById = (req,res) => Billing.getBillById(req.params.id,(err,data) => err ? res.status(500).json({success:false,message:"Failed to fetch bill"}) : !data ? res.status(404).json({success:false,message:"Bill not found"}) : res.json({success:true,data}));

exports.updateBill = (req,res) => { const userId=actorId(req); Billing.getBillById(req.params.id,(beforeErr,before)=>{ if(beforeErr) return res.status(500).json({success:false,message:"Failed to load bill"}); if(!before) return res.status(404).json({success:false,message:"Bill not found"}); Billing.updateBill(req.params.id,{...req.body,updated_by:userId},err=>{ if(err) return res.status(500).json({success:false,message:"Failed to update bill"}); Audit.create({module_name:"Billing",reference_id:req.params.id,action:"UPDATE",old_data:before,new_data:req.body,changed_by:userId},auditErr=>{if(auditErr)console.error(auditErr);}); res.json({success:true,message:"Bill updated successfully"}); }); }); };
exports.cancelBill = (req,res) => { const userId=actorId(req); Billing.getBillById(req.params.id,(beforeErr,before)=>{ if(beforeErr) return res.status(500).json({success:false,message:"Failed to load bill"}); if(!before) return res.status(404).json({success:false,message:"Bill not found"}); Billing.cancelBill(req.params.id,userId,err=>{ if(err) return res.status(500).json({success:false,message:"Failed to cancel bill"}); Audit.create({module_name:"Billing",reference_id:req.params.id,action:"CANCEL",old_data:before,new_data:{status:"CANCELLED"},changed_by:userId},auditErr=>{if(auditErr)console.error(auditErr);}); res.json({success:true,message:"Bill cancelled successfully"}); }); }); };
exports.dailyReport = (req,res) => Billing.dailyReport(req.query,(err,data)=>err ? res.status(500).json({success:false,message:"Failed to generate daily report"}) : res.json({success:true,data}));
exports.audit = (req,res) => Audit.getByReference("Billing",req.params.billId,(err,data)=>err ? res.status(500).json({success:false,message:"Failed to fetch audit history"}) : res.json({success:true,data}));
