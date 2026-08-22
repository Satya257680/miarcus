const XLSX = require("xlsx");
const { Parser } = require("json2csv");
const Model = require("../models/collectionTrackingModel");
const Notification = require("../services/notificationService");
const { sendGenericEmail } = require("../services/emailService");
const db = require("../config/db");

const escape=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const appUrl=()=>process.env.APP_URL||process.env.FRONTEND_URL||"http://localhost:5173";

const notifyAndEmail=async(recipients,{title,message,product,link})=>{
 for(const r of recipients){
  try{
   await Notification.createNotification({
    user_id:r.id,title,message,module_name:"Collection Tracking",action_name:"Update",
    entity_id:product.id,link,type:"info"
   });
  }catch(e){console.error("CT notification:",e.message);}
  if(r.email){
   try{
    await sendGenericEmail({
     to:r.email,subject:title,
     html:`<div style="font-family:Arial,sans-serif;max-width:700px;margin:auto">
       <h2 style="color:#6f5cb1">${escape(title)}</h2><p>${escape(message)}</p>
       <p><b>Product:</b> ${escape(product.product_code)}${product.product_name?` — ${escape(product.product_name)}`:""}</p>
       <p><a href="${appUrl()}${link}">Open in MIARCUS</a></p>
       <hr/><small>MIARCUS Collection Tracking</small></div>`
    });
   }catch(e){console.error("CT email:",e.message);}
  }
 }
};

exports.ensure=async(req,res,next)=>{
 try{await Model.ensureTables();next();}
 catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.configs=async(req,res)=>{
 try{res.json({success:true,stages:Model.STAGES,configs:await Model.getConfigs(req.query.stage||"")});}
 catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.saveConfig=async(req,res)=>{
 try{
  const stage=String(req.params.stage);
  if(!Model.STAGES.includes(stage))return res.status(400).json({success:false,message:"Invalid stage"});
  await Model.saveConfigs(stage,Array.isArray(req.body.fields)?req.body.fields:[]);
  res.json({success:true,message:"Master data saved"});
 }catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.create=async(req,res)=>{
 try{
  const data=req.body.data||{};
  const productCode=String(req.body.product_code||`SKU-${Date.now()}`);
  const p=await Model.createProduct({
   productCode,productName:req.body.product_name||data["Product Name"]||"",
   createdBy:req.user.id,data
  });
  res.status(201).json({success:true,product:p});
 }catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.list=async(req,res)=>{
 try{res.json({success:true,...await Model.listProducts(req.query)});}
 catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.view=async(req,res)=>{
 try{
  const p=await Model.getProduct(req.params.id);
  if(!p)return res.status(404).json({success:false,message:"Product not found"});
  res.json({success:true,product:p,history:await Model.getHistory(p.id),comments:await Model.getComments(p.id)});
 }catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.updateStage=async(req,res)=>{
 try{
  const p=await Model.getProduct(req.params.id);
  if(!p)return res.status(404).json({success:false,message:"Product not found"});
  const stage=String(req.body.stage||p.current_stage);
  const nextStage=req.body.next_stage||null;
  if(!Model.STAGES.includes(stage)||nextStage&&!Model.STAGES.includes(nextStage))
   return res.status(400).json({success:false,message:"Invalid workflow stage"});
  const updated=await Model.updateStage({
   id:p.id,stage,data:req.body.data||{},userId:req.user.id,note:req.body.note,nextStage
  });
  const recipients=await Model.getPreviousRecipients(p.id,stage,req.user.id);
  const actor=(await db.query("SELECT name FROM users WHERE id=? LIMIT 1",[req.user.id]))[0]?.name||"A team member";
  const msg=nextStage
   ?`${actor} submitted an update for ${stage} and moved ${p.product_code} to ${nextStage}.`
   :`${actor} updated ${p.product_code} in ${stage}.`;
  await notifyAndEmail(recipients,{title:`Collection update: ${p.product_code}`,message:msg,product:p,link:`/collection-tracking/sku-details/${p.id}`});
  res.json({success:true,product:updated,notified:recipients.length});
 }catch(e){console.error("CT update:",e);res.status(500).json({success:false,message:e.message});}
};

exports.comment=async(req,res)=>{
 try{
  const p=await Model.getProduct(req.params.id);
  if(!p)return res.status(404).json({success:false,message:"Product not found"});
  const comment=String(req.body.comment||"").trim();
  if(!comment)return res.status(400).json({success:false,message:"Remark is required"});
  const stage=req.body.stage||p.current_stage;
  const row=await Model.addComment({id:p.id,stage,comment,userId:req.user.id});
  const recipients=await Model.getPreviousRecipients(p.id,stage,req.user.id);
  const actor=(await db.query("SELECT name FROM users WHERE id=? LIMIT 1",[req.user.id]))[0]?.name||"A team member";
  await notifyAndEmail(recipients,{
   title:`New remark on ${p.product_code}`,
   message:`${actor} added a remark: ${comment}`,
   product:p,link:`/collection-tracking/sku-details/${p.id}`
  });
  res.json({success:true,comment:row,notified:recipients.length});
 }catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.request=async(req,res)=>{
 try{
  const p=await Model.getProduct(req.params.id);
  if(!p)return res.status(404).json({success:false,message:"Product not found"});
  const id=await Model.createRequest({
   id:p.id,fromStage:p.current_stage,toStage:req.body.to_stage||p.current_stage,
   userId:req.user.id,note:req.body.note
  });
  const recipients=await Model.getPreviousRecipients(p.id,p.current_stage,req.user.id);
  await notifyAndEmail(recipients,{
   title:`Update request for ${p.product_code}`,
   message:`A request was raised for ${p.product_code}: ${req.body.note||"Please review the update request."}`,
   product:p,link:"/collection-tracking/requests"
  });
  res.status(201).json({success:true,id});
 }catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.requests=async(req,res)=>{
 try{res.json({success:true,requests:await Model.listRequests({status:req.query.status??"Pending"})});}
 catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.reviewRequest=async(req,res)=>{
 try{
  const rows=await db.query(
   `SELECT r.*,p.product_code,p.product_name,u.id requester_id,u.name requester_name,u.email requester_email
    FROM collection_requests r JOIN collection_products p ON p.id=r.product_id
    LEFT JOIN users u ON u.id=r.requested_by WHERE r.id=? LIMIT 1`,[req.params.id]);
  if(!rows[0])return res.status(404).json({success:false,message:"Request not found"});
  await Model.reviewRequest({id:req.params.id,status:req.body.status,userId:req.user.id});
  const r=rows[0];
  if(r.requester_id){
   await notifyAndEmail([{id:r.requester_id,name:r.requester_name,email:r.requester_email}],{
    title:`Collection request ${req.body.status}`,
    message:`Your request for ${r.product_code} was ${String(req.body.status||"reviewed").toLowerCase()}.`,
    product:r,link:`/collection-tracking/sku-details/${r.product_id}`
   });
  }
  res.json({success:true});
 }catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.delete=async(req,res)=>{
 try{await Model.deleteProduct(req.params.id);res.json({success:true});}
 catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.deleteAll=async(req,res)=>{
 try{await Model.deleteAll();res.json({success:true});}
 catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.export=async(req,res)=>{
 try{
  const rows=await Model.exportProducts();
  const parser=new Parser({fields:["id","product_code","product_name","current_stage","status","creator","created_at","updated_at"]});
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition",'attachment; filename="collection-tracking.csv"');
  res.send(parser.parse(rows));
 }catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.bulk=async(req,res)=>{
 try{
  let rows=req.body.rows;
  if(!Array.isArray(rows)&&req.file){
   const wb=XLSX.readFile(req.file.path);
   rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  }
  if(!Array.isArray(rows))rows=[];
  let created=0;
  for(const row of rows){
   await Model.createProduct({
    productCode:String(row.product_code||row.sku||`SKU-${Date.now()}-${created}`),
    productName:row.product_name||row["Product Name"]||"",
    createdBy:req.user.id,data:row
   });
   created++;
  }
  res.json({success:true,created});
 }catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.insight=async(req,res)=>{
 try{res.json({success:true,...await Model.getInsight()});}
 catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.permissions=async(req,res)=>{
 try{res.json({success:true,...await Model.getPermissions()});}
 catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.savePermissions=async(req,res)=>{
 try{await Model.savePermissions(req.body.items||[]);res.json({success:true,message:"Permissions saved"});}
 catch(e){res.status(500).json({success:false,message:e.message});}
};
