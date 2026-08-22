import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useParams} from "react-router-dom";
import {FaArrowLeft,FaCheck,FaCommentDots,FaDownload,FaEye,FaFileUpload,FaPlus,FaSave,FaTrash,FaPaperPlane} from "react-icons/fa";
import {ctGet,ctPost,ctPut,ctDelete} from "./collectionTrackingApi";
import "./CollectionTracking.css";

const STAGES=["Designer","Buyer","Tech Team","Quality","E-Com","Warehouse"];
const inputType=t=>["select","multiselect","date","textarea"].includes(t)?t:"text";

function Hero({title,subtitle,children}){return <div className="ct-hero"><div><div className="ct-kicker">Collection tracking · product workflow</div><h1>{title}</h1><p>{subtitle}</p></div>{children}</div>}

function ProductList(){
 const nav=useNavigate(),[rows,setRows]=useState([]),[q,setQ]=useState(""),[stage,setStage]=useState(""),[status,setStatus]=useState(""),[page,setPage]=useState(1),[total,setTotal]=useState(0),[bulk,setBulk]=useState(false),[file,setFile]=useState(null);
 const load=async()=>{const r=await ctGet(`/products?search=${encodeURIComponent(q)}&stage=${encodeURIComponent(stage)}&status=${encodeURIComponent(status)}&page=${page}&pageSize=12`);setRows(r.data.rows||[]);setTotal(r.data.total||0)};
 useEffect(()=>{load()},[q,stage,status,page]);
 const exportCsv=async()=>{const r=await ctGet("/products/export",{responseType:"blob"});const a=document.createElement("a");a.href=URL.createObjectURL(r.data);a.download="collection-tracking.csv";a.click();URL.revokeObjectURL(a.href)};
 const del=async id=>{if(confirm("Delete this product?")){await ctDelete(`/products/${id}`);load()}};
 const delAll=async()=>{if(rows.length&&confirm("Delete ALL collection products?")){await ctDelete("/products");load()}};
 const bulkUpload=async()=>{if(!file)return;const fd=new FormData();fd.append("file",file);await ctPost("/products/bulk",fd,{headers:{"Content-Type":"multipart/form-data"}});setBulk(false);setFile(null);load()};
 return <div className="ct-shell">
  <Hero title="Collection Tracking" subtitle="Move one product through Designer → Buyer → Tech Team → Quality → E-Com → Warehouse.">
   <div className="ct-toolbar"><button className="ct-btn light" onClick={()=>setBulk(true)}><FaFileUpload/> Bulk Upload</button><button className="ct-btn primary" onClick={()=>nav("/collection-tracking/add-products")}><FaPlus/> Add Product</button><button className="ct-btn light" onClick={exportCsv}><FaDownload/> Export CSV</button><button className="ct-btn danger" onClick={delAll}><FaTrash/> Delete All</button></div>
  </Hero>
  <div className="ct-card"><div className="ct-toolbar"><input className="ct-input ct-search" placeholder="Search product code or product name..." value={q} onChange={e=>{setQ(e.target.value);setPage(1)}}/><select className="ct-select" value={stage} onChange={e=>setStage(e.target.value)}><option value="">All stages</option>{STAGES.map(x=><option key={x}>{x}</option>)}</select><select className="ct-select" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All status</option><option>In Progress</option><option>Completed</option></select></div>
   <div style={{overflowX:"auto",marginTop:15}}><table className="ct-table"><thead><tr><th>Product</th><th>Current Stage</th><th>Status</th><th>Created By</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
    {rows.map(r=><tr key={r.id}><td><b>{r.product_code}</b><div className="ct-muted">{r.product_name||"Unnamed product"}</div></td><td><span className="ct-chip">{r.current_stage}</span></td><td><span className={`ct-badge ${r.status==="Completed"?"done":"progress"}`}>{r.status}</span></td><td>{r.creator_name||"—"}</td><td>{new Date(r.updated_at).toLocaleString()}</td><td><div className="ct-row-actions"><button className="ct-btn light" onClick={()=>nav(`/collection-tracking/sku-details/${r.id}`)}><FaEye/> View</button><button className="ct-btn danger" onClick={()=>del(r.id)}><FaTrash/></button></div></td></tr>)}
    {!rows.length&&<tr><td colSpan="6" className="ct-empty">No collection products match your filters.</td></tr>}
   </tbody></table></div>
   <div className="ct-pagination"><button className="ct-btn light" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span className="ct-muted" style={{padding:10}}>Page {page} · {total} records</span><button className="ct-btn light" disabled={page*12>=total} onClick={()=>setPage(p=>p+1)}>Next</button></div>
  </div>
  {bulk&&<div className="ct-modal-backdrop"><div className="ct-card" style={{width:600,margin:0}}><h3>Bulk Upload Products</h3><p className="ct-muted">CSV or Excel. Use product_code, product_name and any Master Data field names.</p><div className="ct-file"><input type="file" accept=".csv,.xlsx,.xls" onChange={e=>setFile(e.target.files?.[0]||null)}/><p className="ct-muted">{file?.name||"Choose a file"}</p></div><div className="ct-actions"><button className="ct-btn light" onClick={()=>setBulk(false)}>Cancel</button><button className="ct-btn primary" disabled={!file} onClick={bulkUpload}>Upload</button></div></div></div>}
 </div>
}

function Field({f,value,onChange,readonly=false}){
 const t=inputType(f.display_type), opts=f.options||[];
 return <div className={`ct-field ${t==="textarea"?"full":""}`}><label>{f.field_name} {f.is_mandatory&&<span className="req">*</span>}</label>
  {t==="textarea"?<textarea className={`ct-textarea ${readonly?"ct-readonly":""}`} disabled={readonly} value={value||""} onChange={e=>onChange(e.target.value)}/>
  :t==="select"||t==="multiselect"?<select className={`ct-select ${readonly?"ct-readonly":""}`} disabled={readonly} multiple={t==="multiselect"} value={t==="multiselect"?(Array.isArray(value)?value:value?[value]:[]):value||""} onChange={e=>onChange(t==="multiselect"?Array.from(e.target.selectedOptions).map(o=>o.value):e.target.value)}>{t==="select"&&<option value="">Select...</option>}{opts.map(o=><option key={o}>{o}</option>)}</select>
  :t==="date"?<input className={`ct-input ${readonly?"ct-readonly":""}`} type="date" disabled={readonly} value={value||""} onChange={e=>onChange(e.target.value)}/>
  :f.display_type?.startsWith("attachment")?<input className="ct-input" type="file" multiple={f.display_type.includes("multiple")} onChange={e=>onChange(Array.from(e.target.files||[]).map(x=>x.name).join(", "))}/>
  :<input className={`ct-input ${readonly?"ct-readonly":""}`} disabled={readonly} value={value||""} onChange={e=>onChange(e.target.value)}/>}
 </div>
}

function AddProduct(){
 const nav=useNavigate(),[fields,setFields]=useState([]),[data,setData]=useState({}),[saving,setSaving]=useState(false);
 useEffect(()=>{ctGet("/configs?stage=Designer").then(r=>setFields(r.data.configs||[]))},[]);
 const save=async()=>{const missing=fields.find(f=>f.is_mandatory&&!data[f.field_name]);if(missing)return alert(`Please fill ${missing.field_name}`);setSaving(true);try{const r=await ctPost("/products",{product_code:data["SKU"]||data["Article Name"]||undefined,product_name:data["Product Name"],data});nav(`/collection-tracking/sku-details/${r.data.product.id}`)}finally{setSaving(false)}};
 return <div className="ct-shell"><Hero title="Add Product" subtitle="Create the product once. Later teams receive previous information automatically."/>
  <div className="ct-card"><div className="ct-form-grid">{fields.map(f=><Field key={f.id} f={f} value={data[f.field_name]} onChange={v=>setData(d=>({...d,[f.field_name]:v}))}/>)}</div><div className="ct-actions"><button className="ct-btn light" onClick={()=>nav("/collection-tracking")}>Cancel</button><button className="ct-btn primary" disabled={saving} onClick={save}><FaSave/> Create Product</button></div></div>
 </div>
}

function Details(){
 const {id}=useParams(),[result,setResult]=useState(null),[configs,setConfigs]=useState([]),[stage,setStage]=useState("Designer"),[data,setData]=useState({}),[comment,setComment]=useState(""),[saving,setSaving]=useState(false);
 const load=async()=>{const [p,c]=await Promise.all([ctGet(`/products/${id}`),ctGet("/configs")]);setResult(p.data);setConfigs(c.data.configs||[]);setStage(p.data.product.current_stage);setData(p.data.product.stage_data?.[p.data.product.current_stage]||{})};
 useEffect(()=>{load()},[id]);
 useEffect(()=>{if(result)setData(result.product.stage_data?.[stage]||{})},[stage,result]);
 const fields=useMemo(()=>configs.filter(f=>f.stage_name===stage),[configs,stage]);
 const merged=useMemo(()=>{if(!result)return{};const idx=STAGES.indexOf(stage),o={};for(let i=0;i<=idx;i++)Object.assign(o,result.product.stage_data?.[STAGES[i]]||{});return {...o,...data}},[result,stage,data]);
 if(!result)return <div className="ct-shell"><div className="ct-card ct-empty">Loading product...</div></div>;
 const next=STAGES[STAGES.indexOf(stage)+1];
 const save=async move=>{const missing=fields.find(f=>f.is_mandatory&&!merged[f.field_name]);if(missing)return alert(`Please fill ${missing.field_name}`);setSaving(true);try{await ctPut(`/products/${id}/stage`,{stage,data:merged,next_stage:move?next:null});await load();alert(move?`Update sent to ${next}. Previous team was notified.`:"Update saved and previous team was notified.")}finally{setSaving(false)}};
 const sendRemark=async()=>{if(!comment.trim())return;await ctPost(`/products/${id}/comments`,{stage,comment});setComment("");await load();alert("Remark sent through website notification and email.")};
 return <div className="ct-shell"><Hero title={result.product.product_code} subtitle={result.product.product_name||"Collection product"}><span className="ct-badge progress">{result.product.current_stage}</span></Hero>
  <div className="ct-card"><div className="ct-stage-head"><div><h3>{stage} workspace</h3><div className="ct-muted">Read-only fields are copied from earlier stages.</div></div><span className="ct-chip">Step {STAGES.indexOf(stage)+1} / {STAGES.length}</span></div>
   <div className="ct-progress" style={{margin:"12px 0"}}><span style={{width:`${((STAGES.indexOf(stage)+1)/STAGES.length)*100}%`}}/></div>
   <div className="ct-tabs">{STAGES.map((s,i)=><button key={s} className={`ct-tab ${s===stage?"active":""}`} onClick={()=>setStage(s)}>{i+1}. {s}</button>)}</div>
   <div className="ct-form-grid">{fields.map(f=><Field key={f.id} f={f} readonly={f.display_type==="readonly"} value={merged[f.field_name]} onChange={v=>setData(d=>({...d,[f.field_name]:v}))}/>)}</div>
   <div className="ct-actions"><button className="ct-btn light" onClick={()=>location.href="/collection-tracking"}><FaArrowLeft/> Back</button><button className="ct-btn light" disabled={saving} onClick={()=>save(false)}><FaSave/> Save Update</button>{next&&<button className="ct-btn primary" disabled={saving} onClick={()=>save(true)}><FaPaperPlane/> Submit to {next}</button>}</div>
   <div className="ct-card" style={{marginTop:18,boxShadow:"none",borderStyle:"dashed"}}><h3><FaCommentDots/> Remark / Update</h3><textarea className="ct-textarea" placeholder="Write a remark for the previous team..." value={comment} onChange={e=>setComment(e.target.value)}/><div className="ct-actions"><button className="ct-btn teal" onClick={sendRemark}><FaPaperPlane/> Send Remark</button></div></div>
  </div>
  <div className="ct-card"><h3>Activity & remarks</h3>{(result.comments||[]).map(c=><div className="ct-comment" key={c.id}><b>{c.user_name||"User"}</b><span className="ct-muted"> · {c.stage_name} · {new Date(c.created_at).toLocaleString()}</span><div>{c.comment}</div></div>)}{(result.history||[]).map(h=><div className="ct-history" key={h.id}><b>{h.action} · {h.stage_name}</b><div className="ct-muted">{h.user_name||"User"} · {new Date(h.created_at).toLocaleString()}</div>{h.note&&<div>{h.note}</div>}</div>)}</div>
 </div>
}

function MasterData(){
 const [stage,setStage]=useState("Designer"),[fields,setFields]=useState([]),[saving,setSaving]=useState(false);
 const load=()=>ctGet(`/configs?stage=${encodeURIComponent(stage)}`).then(r=>setFields(r.data.configs||[]));useEffect(load,[stage]);
 const update=(i,k,v)=>setFields(a=>a.map((x,j)=>j===i?{...x,[k]:v}:x));const add=()=>setFields(a=>[...a,{id:`new${Date.now()}`,field_name:"New Field",display_type:"text",is_mandatory:false,options:[]}]);
 const save=async()=>{setSaving(true);try{await ctPut(`/configs/${encodeURIComponent(stage)}`,{fields});alert("Master data saved. Product forms now use these rules.")}finally{setSaving(false)}};
 return <div className="ct-shell"><Hero title="Master Data" subtitle="This is the control room. Change a field here and the product form follows it."><button className="ct-btn primary" onClick={save} disabled={saving}><FaSave/> Save Master Data</button></Hero>
  <div className="ct-card"><div className="ct-tabs">{STAGES.map(s=><button className={`ct-tab ${s===stage?"active":""}`} key={s} onClick={()=>setStage(s)}>{s}</button>)}</div>
   <div style={{overflowX:"auto"}}><table className="ct-table"><thead><tr><th>Requirement</th><th>Field</th><th>Display Type</th><th>Prefilled Data</th><th>Action</th></tr></thead><tbody>{fields.map((f,i)=><tr key={f.id||i}><td><button className={`ct-tab ${f.is_mandatory?"active":""}`} onClick={()=>update(i,"is_mandatory",!f.is_mandatory)}>{f.is_mandatory?"Mandatory":"Optional"}</button></td><td><input className="ct-input" value={f.field_name} onChange={e=>update(i,"field_name",e.target.value)}/></td><td><select className="ct-select" value={f.display_type} onChange={e=>update(i,"display_type",e.target.value)}>{["text","textarea","select","multiselect","date","attachment-single","attachment-multiple","readonly"].map(t=><option key={t}>{t}</option>)}</select></td><td>{["select","multiselect"].includes(f.display_type)?<textarea className="ct-textarea" value={(f.options||[]).join(", ")} onChange={e=>update(i,"options",e.target.value.split(",").map(x=>x.trim()).filter(Boolean))} placeholder="Option A, Option B, Option C"/>:<span className="ct-muted">{f.display_type==="readonly"?"Read-only / copied from previous stage":"No option list required"}</span>}</td><td><button className="ct-btn danger" onClick={()=>setFields(a=>a.filter((_,j)=>j!==i))}><FaTrash/></button></td></tr>)}</tbody></table></div><div className="ct-actions"><button className="ct-btn light" onClick={add}><FaPlus/> Add Field</button></div>
  </div></div>
}

function Insight(){
 const [d,setD]=useState(null);useEffect(()=>{ctGet("/insight").then(r=>setD(r.data))},[]);
 return <div className="ct-shell"><Hero title="Insight" subtitle="Live numbers from Collection Tracking."/><div className="ct-grid"><div className="ct-stat"><small>Total Products</small><strong>{d?.summary?.total||0}</strong></div><div className="ct-stat"><small>Unique Product Names</small><strong>{d?.summary?.products||0}</strong></div>{STAGES.slice(0,2).map(s=><div className="ct-stat" key={s}><small>{s}</small><strong>{d?.stages?.find(x=>x.stage===s)?.count||0}</strong></div>)}</div>
  <div className="ct-card"><h3>Stage distribution</h3>{(d?.stages||[]).map(x=><div key={x.stage} style={{margin:"13px 0"}}><div style={{display:"flex",justifyContent:"space-between"}}><b>{x.stage}</b><span>{x.count}</span></div><div className="ct-progress"><span style={{width:`${Math.min(100,(x.count/(d?.summary?.total||1))*100)}%`}}/></div></div>)}</div>
 </div>
}

function Requests(){
 const [rows,setRows]=useState([]);const load=()=>ctGet("/requests?status=Pending").then(r=>setRows(r.data.requests||[]));useEffect(load,[]);
 const review=async(id,status)=>{await ctPut(`/requests/${id}`,{status});load()};
 return <div className="ct-shell"><Hero title="Requests" subtitle="When a team needs the previous team to check something, the request appears here."/><div className="ct-card">{rows.length?rows.map(r=><div className="ct-request" key={r.id}><div><b>{r.product_code}</b> — {r.product_name||"Unnamed"}<div className="ct-muted">{r.from_stage} → {r.to_stage} · requested by {r.requester_name||"User"}</div>{r.note&&<p>{r.note}</p>}</div><div className="ct-row-actions"><button className="ct-btn primary" onClick={()=>review(r.id,"Approved")}><FaCheck/> Approve</button><button className="ct-btn danger" onClick={()=>review(r.id,"Rejected")}>Reject</button></div></div>):<div className="ct-empty">No pending requests.</div>}</div></div>
}

function Permissions(){
 const [deps,setDeps]=useState([]),[map,setMap]=useState({}),[cross,setCross]=useState({});
 useEffect(()=>{ctGet("/permissions").then(r=>{setDeps(r.data.departments||[]);const m={},c={};(r.data.permissions||[]).forEach(x=>{m[x.stage_name]=x.department_id;c[x.stage_name]=x.cross_department});setMap(m);setCross(c)})},[]);
 const save=async()=>{await ctPut("/permissions",{items:STAGES.map(s=>({stage_name:s,department_id:map[s]||null,cross_department:!!cross[s]})).filter(x=>x.department_id)});alert("Collection permissions saved.")};
 return <div className="ct-shell"><Hero title="Collection Permissions" subtitle="Connect each workflow stage to the department that should work on it."><button className="ct-btn primary" onClick={save}><FaSave/> Save</button></Hero><div className="ct-card"><div className="ct-alert">Each stage can have one main department. Cross-department view can be enabled when another team needs to see the stage.</div>{STAGES.map((s,i)=><div className="ct-stage" key={s}><div className="ct-stage-head"><div><h3>{s}</h3><div className="ct-muted">Stage {i+1}</div></div><span className="ct-chip">Access control</span></div><div className="ct-stage-body"><select className="ct-select" value={map[s]||""} onChange={e=>setMap(m=>({...m,[s]:e.target.value}))}><option value="">Select department</option>{deps.map(d=><option key={d.id} value={d.id}>{d.department_name}</option>)}</select><label style={{display:"block",marginTop:10}}><input type="checkbox" checked={!!cross[s]} onChange={e=>setCross(c=>({...c,[s]:e.target.checked}))}/> Allow cross-department view</label></div></div>)}</div></div>
}

export {ProductList,AddProduct,Details,MasterData,Insight,Requests,Permissions};
export default ProductList;
