import { getDepartments } from "../../services/departmentService.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaChartLine,
  FaFileCsv,
  FaSyncAlt,
  FaSave,
  FaBullseye,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowDown,
  FaPlus,
  FaTimes,
  FaCalculator,
} from "react-icons/fa";

import PageHeader from "../../components/common/PageHeader";
import PageToolbar from "../../components/common/PageToolbar";
import FilterBar from "../../components/common/FilterBar";
import Card from "../../components/common/Card";
import DataTable from "../../components/common/DataTable";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import BulkUploadModal from "../../components/common/BulkUploadModal";

import {
  deleteAllSalesReview,
  exportSalesReview,
  getSalesReview,
  getSalesStores,
  updateSalesBenchmark,
  uploadSalesReview,
} from "../../services/salesTeamService";

import {
  canAdd,
  canDelete,
  canEdit,
  canView,
  downloadBlob,
} from "./salesTeamUtils";

import "../../styles/pages/SalesTeam.css";


const departmentScoringStyles = `
  .sales-scoring-shell {
    margin-top: 22px;
    border: 1px solid #d9e4e8;
    border-radius: 18px;
    overflow: hidden;
    background: linear-gradient(180deg, #ffffff 0%, #f8fbfc 100%);
    box-shadow: 0 14px 40px rgba(40, 73, 84, 0.09);
  }
  .sales-scoring-header {
    display:flex; justify-content:space-between; gap:24px; align-items:flex-start;
    padding:24px 26px 20px; border-bottom:1px solid #e6eef1;
    background:linear-gradient(135deg,#fdfefe 0%,#f2f8fa 100%);
  }
  .sales-scoring-eyebrow,.sales-scoring-label {
    display:flex; align-items:center; gap:7px; font-size:10px; font-weight:800; letter-spacing:.12em; color:#7c6ac0;
  }
  .sales-scoring-header h2,.sales-scoring-panel h3 { margin:6px 0 5px; color:#203a46; }
  .sales-scoring-header h2 { font-size:21px; }
  .sales-scoring-header p { margin:0; max-width:720px; color:#6a7b83; font-size:12px; line-height:1.6; }
  .sales-scoring-period { min-width:150px; padding:10px 13px; border:1px solid #dbe6ea; border-radius:12px; background:#fff; }
  .sales-scoring-period span { display:block; font-size:10px; color:#7a8b92; text-transform:uppercase; letter-spacing:.08em; }
  .sales-scoring-period strong { display:block; margin-top:4px; font-size:12px; color:#29434e; }
  .sales-scoring-explainer { display:flex; gap:12px; margin:18px 22px 0; padding:13px 15px; border:1px solid #d9e9ed; border-radius:12px; background:#f5fbfc; }
  .sales-scoring-explainer-icon { width:30px; height:30px; flex:0 0 30px; display:grid; place-items:center; border-radius:9px; background:#e1f1f4; color:#3b7484; }
  .sales-scoring-explainer strong { color:#2a4652; font-size:12px; }
  .sales-scoring-explainer p { margin:4px 0 0; color:#667981; font-size:11px; line-height:1.55; }
  .sales-scoring-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:16px; padding:18px 22px 22px; }
  .sales-scoring-panel { min-width:0; border:1px solid #e1eaed; border-radius:14px; background:#fff; box-shadow:0 7px 22px rgba(44,75,85,.055); padding:18px; }
  .sales-scoring-panel-top,.sales-scoring-panel-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; }
  .sales-scoring-panel h3 { font-size:16px; }
  .sales-scoring-panel-top select { width:min(330px,55%); height:40px; padding:0 11px; border:1px solid #cfdde2; border-radius:9px; background:#fff; color:#263f49; font-size:12px; outline:none; }
  .sales-scoring-store-context { display:flex; justify-content:space-between; gap:12px; align-items:center; margin:16px 0 10px; padding:10px 12px; border-radius:10px; background:#f6f9fa; border:1px solid #e5edef; color:#60727a; font-size:11px; }
  .sales-scoring-store-context div { display:flex; align-items:center; gap:8px; }
  .sales-scoring-store-context svg { color:#7b69be; }
  .sales-scoring-store-context small { color:#84949a; }
  .sales-score-list { max-height:520px; overflow:auto; padding-right:4px; }
  .sales-score-row { display:grid; grid-template-columns:1fr minmax(210px,45%); gap:14px; align-items:center; padding:9px 0; border-bottom:1px solid #eef3f4; }
  .sales-score-row:last-child { border-bottom:0; }
  .sales-score-department span { display:block; font-size:12px; font-weight:650; color:#2c4651; }
  .sales-score-department small { display:block; margin-top:2px; font-size:9px; color:#8a999f; }
  .sales-score-control { display:grid; grid-template-columns:1fr 62px; gap:8px; align-items:center; }
  .sales-score-control input[type=range] { width:100%; accent-color:#806dc3; cursor:pointer; }
  .sales-score-control select { height:30px; padding:0 7px; border:1px solid #d2dfe3; border-radius:7px; font-size:11px; color:#29414c; background:#fff; }
  .sales-score-row.excellent .sales-score-control select { border-color:#9ed9be; }
  .sales-score-row.watch .sales-score-control select { border-color:#ecd18d; }
  .sales-score-row.critical .sales-score-control select { border-color:#edb1b1; }
  .sales-score-save { width:100%; margin-top:14px; height:40px; display:flex; justify-content:center; align-items:center; gap:8px; border:0; border-radius:9px; background:linear-gradient(135deg,#18a957,#0d8d4b); color:#fff; font-size:11px; font-weight:750; cursor:pointer; box-shadow:0 8px 18px rgba(20,145,77,.18); }
  .sales-score-save:disabled { cursor:not-allowed; opacity:.55; box-shadow:none; }
  .sales-scoring-empty { min-height:300px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:#829198; gap:7px; }
  .sales-scoring-empty svg { font-size:28px; color:#9a8bd0; margin-bottom:4px; }
  .sales-scoring-empty strong { color:#405862; font-size:13px; }
  .sales-scoring-empty span { max-width:300px; font-size:11px; line-height:1.5; }
  .sales-performance-copy { margin:9px 0 14px; color:#77878e; font-size:11px; }
  .sales-score-saved { display:flex; align-items:center; gap:5px; padding:5px 8px; border-radius:999px; background:#e9f8ef; color:#198a57; font-size:9px; font-weight:700; white-space:nowrap; }
  .sales-performance-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
  .sales-performance-kpi { padding:10px; border:1px solid #e3ebee; border-radius:10px; background:#fbfcfc; }
  .sales-performance-kpi span { display:block; color:#74858c; font-size:9px; }
  .sales-performance-kpi strong { display:block; margin:3px 0 1px; color:#233e49; font-size:18px; }
  .sales-performance-kpi small { color:#9aa7ac; font-size:8px; }
  .sales-performance-kpi.primary { background:#f6f3ff; border-color:#ddd5f4; }
  .sales-performance-kpi.positive { background:#f2fbf6; border-color:#d8efdf; }
  .sales-performance-kpi.negative { background:#fff6f4; border-color:#f1ddd8; }
  .sales-score-chart { margin-top:17px; border-top:1px solid #edf2f3; padding-top:15px; }
  .sales-score-chart-head { display:flex; justify-content:space-between; margin-bottom:10px; color:#415b65; font-size:10px; }
  .sales-score-chart-head span { color:#99a7ac; }
  .sales-score-bars { max-height:410px; overflow:auto; padding-right:3px; }
  .sales-score-bar-row { display:grid; grid-template-columns:108px 1fr 28px; gap:8px; align-items:center; margin:7px 0; }
  .sales-score-bar-row > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#64777f; font-size:9px; }
  .sales-score-track { height:7px; border-radius:999px; background:#edf2f3; overflow:hidden; }
  .sales-score-fill { height:100%; border-radius:999px; transition:width .25s ease; background:#9a8bd0; }
  .sales-score-fill.excellent { background:#21a766; }
  .sales-score-fill.watch { background:#d7a12b; }
  .sales-score-fill.critical { background:#dc5c5c; }
  .sales-score-fill.na { background:#c9d2d6; width:0 !important; }
  .sales-score-bar-row strong { text-align:right; color:#334e59; font-size:9px; }
  .sales-score-guidance { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; margin-top:15px; padding-top:12px; border-top:1px solid #edf2f3; }
  .sales-score-guidance div { display:flex; align-items:center; gap:5px; color:#7b8a90; font-size:8px; }
  .sales-score-guidance svg { color:#7c6ac0; }
  .sales-score-guidance strong { color:#415964; }

  .sales-add-entry-btn {
    background:linear-gradient(135deg,#7257d6 0%,#5d43c2 100%) !important;
    color:#fff !important; border-color:transparent !important;
    box-shadow:0 7px 16px rgba(105,78,205,.22);
  }
  .sales-add-entry-btn:hover { transform:translateY(-1px); box-shadow:0 9px 20px rgba(105,78,205,.28); }
  .sales-entry-overlay {
    position:fixed; inset:0; z-index:2000; display:flex; align-items:center; justify-content:center;
    padding:22px; background:rgba(20,38,46,.54); backdrop-filter:blur(5px);
  }
  .sales-entry-modal {
    width:min(980px,100%); max-height:min(88vh,860px); overflow:auto;
    border:1px solid #dbe6ea; border-radius:20px; background:#fff;
    box-shadow:0 30px 80px rgba(19,43,53,.28);
  }
  .sales-entry-head {
    position:sticky; top:0; z-index:2; display:flex; justify-content:space-between;
    gap:20px; align-items:flex-start; padding:22px 24px 18px;
    border-bottom:1px solid #e6eef1; background:linear-gradient(135deg,#fff 0%,#f3f8fa 100%);
  }
  .sales-entry-eyebrow {
    display:flex; align-items:center; gap:7px; color:#765fc9;
    font-size:10px; font-weight:850; letter-spacing:.13em;
  }
  .sales-entry-head h2 { margin:6px 0 4px; color:#193744; font-size:22px; }
  .sales-entry-head p { margin:0; color:#70838a; font-size:11px; line-height:1.5; }
  .sales-entry-close {
    width:36px; height:36px; border:1px solid #d6e1e5; border-radius:10px;
    background:#fff; color:#60747c; display:grid; place-items:center; cursor:pointer;
  }
  .sales-entry-close:hover { background:#f4f8f9; color:#1f3e4a; }
  .sales-entry-body { padding:20px 24px 8px; }
  .sales-entry-section {
    margin-bottom:18px; padding:16px; border:1px solid #e2ebee;
    border-radius:14px; background:#fbfcfd;
  }
  .sales-entry-section-head {
    display:flex; align-items:center; justify-content:space-between;
    gap:12px; margin-bottom:13px;
  }
  .sales-entry-section-head strong { color:#294652; font-size:12px; }
  .sales-entry-section-head span { color:#8a999f; font-size:9px; }
  .sales-entry-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:11px; }
  .sales-entry-field { display:flex; flex-direction:column; gap:5px; min-width:0; }
  .sales-entry-field.wide { grid-column:span 2; }
  .sales-entry-field.full { grid-column:1/-1; }
  .sales-entry-field label {
    color:#5e737b; font-size:9px; font-weight:800; letter-spacing:.05em; text-transform:uppercase;
  }
  .sales-entry-field input,.sales-entry-field select,.sales-entry-field textarea {
    width:100%; box-sizing:border-box; border:1px solid #d3e0e4; border-radius:9px;
    background:#fff; color:#253f4b; outline:none; font-size:11px; padding:0 10px;
    height:38px; transition:border-color .15s,box-shadow .15s;
  }
  .sales-entry-field textarea { height:74px; padding:9px 10px; resize:vertical; }
  .sales-entry-field input:focus,.sales-entry-field select:focus,.sales-entry-field textarea:focus {
    border-color:#8b77d0; box-shadow:0 0 0 3px rgba(139,119,208,.10);
  }
  .sales-entry-field input[readonly] { background:#f2f5f6; color:#42606b; font-weight:750; }
  .sales-entry-field small { color:#8b999f; font-size:8px; line-height:1.35; }
  .sales-entry-insight {
    display:flex; gap:9px; align-items:flex-start; padding:10px 12px;
    border:1px solid #d9e9ed; border-radius:10px; background:#f4fafb;
    color:#5f747c; font-size:9px; line-height:1.45;
  }
  .sales-entry-insight svg { flex:0 0 auto; margin-top:1px; color:#6d59c1; }
  .sales-entry-footer {
    position:sticky; bottom:0; display:flex; justify-content:flex-end; gap:9px;
    padding:14px 24px; border-top:1px solid #e5edef; background:rgba(255,255,255,.97);
  }
  .sales-entry-footer button {
    height:40px; padding:0 17px; border-radius:9px; font-size:11px; font-weight:800; cursor:pointer;
  }
  .sales-entry-cancel { border:1px solid #d5e0e4; background:#fff; color:#536a73; }
  .sales-entry-submit {
    display:flex; align-items:center; gap:7px; border:0;
    background:linear-gradient(135deg,#7257d6,#5d43c2); color:#fff;
    box-shadow:0 8px 18px rgba(105,78,205,.18);
  }
  .sales-entry-submit:disabled { opacity:.6; cursor:not-allowed; box-shadow:none; }
  @media (max-width:760px) {
    .sales-entry-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .sales-entry-field.wide { grid-column:span 2; }
  }
  @media (max-width:480px) {
    .sales-entry-overlay { padding:8px; }
    .sales-entry-head,.sales-entry-body,.sales-entry-footer { padding-left:15px; padding-right:15px; }
    .sales-entry-grid { grid-template-columns:1fr; }
    .sales-entry-field.wide,.sales-entry-field.full { grid-column:auto; }
    .sales-entry-footer { flex-direction:column-reverse; }
    .sales-entry-footer button { width:100%; }
  }

  .sales-scoring-period-controls { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:18px 22px 0; padding:12px; border:1px solid #e1eaed; border-radius:12px; background:#fbfcfd; }
  .sales-period-control { display:flex; flex-direction:column; gap:5px; }
  .sales-period-control span { font-size:9px; font-weight:800; letter-spacing:.08em; color:#7c6ac0; text-transform:uppercase; }
  .sales-period-control select,.sales-period-control input { width:100%; box-sizing:border-box; height:36px; padding:0 9px; border:1px solid #d2dfe3; border-radius:8px; background:#fff; color:#29414c; font-size:11px; outline:none; }
  .sales-period-control small { color:#8b9aa0; font-size:8px; line-height:1.35; }
  .sales-store-source { margin:8px 22px 0; color:#71838a; font-size:9px; }
  .sales-store-source strong { color:#3b7484; }
  .sales-scoring-store-select { min-width:270px; }
  @media (max-width: 900px) { .sales-scoring-period-controls { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width: 1100px) {
    .sales-scoring-grid { grid-template-columns:1fr; }
  }
  @media (max-width: 720px) {
    .sales-scoring-header,.sales-scoring-panel-top,.sales-scoring-panel-heading { flex-direction:column; align-items:stretch; }
    .sales-scoring-period { width:100%; box-sizing:border-box; }
    .sales-scoring-panel-top select { width:100%; }
    .sales-score-row { grid-template-columns:1fr; gap:7px; }
    .sales-performance-kpis { grid-template-columns:repeat(2,1fr); }
    .sales-score-guidance { grid-template-columns:1fr; }
  }

  .sales-live-pulse { margin-top:18px; }
  .sales-live-pulse-head { height:34px; display:flex; align-items:center; justify-content:space-between; padding:0 12px; border:1px solid #d8e5e9; border-radius:10px; background:#f8fbfc; }
  .sales-live-pulse-head > div { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .sales-live-pulse-title { display:flex; align-items:center; gap:7px; color:#244452; font-size:11px; font-weight:800; letter-spacing:.08em; }
  .sales-live-pulse-head > div > span { color:#778a92; font-size:9px; }
  .sales-live-dot { width:9px; height:9px; border-radius:50%; background:#19a966; box-shadow:0 0 0 4px #dff5e9; }
  .sales-kpi-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:12px; }
  .sales-kpi-card { min-height:78px; padding:12px 13px; border:1px solid #dce7ea; border-radius:11px; background:#fff; box-shadow:0 5px 16px rgba(45,74,84,.045); }
  .sales-kpi-card span { display:block; color:#6d8088; font-size:9px; font-weight:800; letter-spacing:.07em; }
  .sales-kpi-card strong { display:block; margin:7px 0 4px; color:#173846; font-size:20px; line-height:1; }
  .sales-kpi-card small { display:block; min-height:12px; color:#7d8e95; font-size:9px; font-weight:700; }
  .sales-kpi-card small.positive { color:#159252; }
  .sales-kpi-card small.negative { color:#d25a5a; }
  .sales-kpi-card em { display:block; margin-top:5px; color:#819198; font-size:8px; font-style:normal; }
  .sales-analysis-grid { display:grid; grid-template-columns:minmax(0,2fr) minmax(310px,1fr); gap:12px; margin-top:12px; }
  .sales-analysis-card { min-width:0; border:1px solid #dce7ea; border-radius:12px; background:#fff; box-shadow:0 5px 16px rgba(45,74,84,.045); overflow:hidden; }
  .sales-analysis-heading { min-height:62px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; gap:14px; border-bottom:1px solid #e6eef0; }
  .sales-analysis-heading h2 { margin:0 0 3px; color:#1e3b48; font-size:16px; }
  .sales-analysis-heading p { margin:0; color:#788a91; font-size:9px; }
  .sales-analysis-heading > strong { font-size:11px; }
  .sales-analysis-heading .positive { color:#168f50; }
  .sales-analysis-heading .negative { color:#d15c5c; }
  .sales-trend-content { padding:15px 18px 14px; }
  .sales-trend-label { color:#6d7e86; font-size:9px; line-height:1.45; display:flex; flex-direction:column; gap:2px; }
  .sales-trend-label b { color:#1c3a47; font-size:12px; display:flex; align-items:center; gap:5px; }
  .sales-trend-label b i { font-style:normal; font-size:15px; font-weight:900; }
  .sales-trend-label small { font-size:8px; color:#84959b; }
  .sales-trend-label.momentum-up b, .sales-trend-label.momentum-up b i { color:#0b9a62; }
  .sales-trend-label.momentum-down b, .sales-trend-label.momentum-down b i { color:#e04450; }
  .sales-trend-chart { width:100%; height:245px; margin-top:4px; overflow:visible; }
  .sales-trend-chart line { stroke:#e5edef; stroke-width:1; }
  .sales-trend-chart text { fill:#84959b; font-size:10px; }
  .sales-trend-chart polyline { fill:none; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
  .sales-trend-chart .trend-target { stroke:#8b999f; stroke-dasharray:7 6; stroke-width:2; }
  .sales-trend-chart .trend-projection { stroke:#806dc3; stroke-dasharray:2 0; stroke-width:2.5; }
  .sales-trend-chart .trend-momentum { stroke:#2c849d; stroke-width:4; filter:drop-shadow(0 3px 4px rgba(44,132,157,.16)); }
  .sales-trend-chart.momentum-chart-down .trend-momentum { stroke:#e04450; }
  .sales-trend-chart.momentum-chart-up .trend-momentum { stroke:#0b9a62; }
  .trend-point circle:first-child { fill:#fff; stroke:#2c849d; stroke-width:3; }
  .trend-point circle:last-child { fill:#2c849d; }
  .momentum-chart-down .trend-point circle:first-child { stroke:#e04450; }
  .momentum-chart-down .trend-point circle:last-child { fill:#e04450; }
  .momentum-chart-up .trend-point circle:first-child { stroke:#0b9a62; }
  .momentum-chart-up .trend-point circle:last-child { fill:#0b9a62; }
  .trend-axis-label { font-size:9px !important; text-anchor:middle; }
  .sales-trend-legend { display:flex; justify-content:center; gap:22px; color:#71838a; font-size:9px; }
  .sales-trend-legend .legend-momentum { font-weight:700; }
  .momentum-chart-up + .sales-trend-legend .legend-momentum { color:#0b9a62; }
  .momentum-chart-down + .sales-trend-legend .legend-momentum { color:#e04450; }
  .sales-management-card { padding-bottom:14px; }
  .sales-management-message { margin:14px 18px 8px; padding:13px; border-radius:10px; background:#f5f9fa; }
  .sales-management-message b { color:#244452; font-size:11px; }
  .sales-management-message p { margin:5px 0 0; color:#71838a; font-size:9px; line-height:1.55; }
  .sales-management-list { padding:0 18px; }
  .sales-management-list div { display:flex; justify-content:space-between; gap:10px; padding:10px 0; border-bottom:1px solid #edf2f3; }
  .sales-management-list span { color:#70838a; font-size:9px; }
  .sales-management-list strong { color:#29434e; font-size:10px; }
  @media (max-width: 1100px) { .sales-kpi-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .sales-analysis-grid { grid-template-columns:1fr; } }
  @media (max-width: 600px) { .sales-kpi-grid { grid-template-columns:1fr; } .sales-live-pulse-head > div { align-items:flex-start; flex-direction:column; justify-content:center; gap:2px; } }
`;

/* =========================================================
   DEFAULT FILTERS
========================================================= */

const emptyFilters = {
  years: "",
  months: "",
  weeks: "",
  day: "",
  reports_to: "",
  asm: "",
  store: "",
  search: "",
};

/* =========================================================
   SALES REVIEW
========================================================= */

function SalesReview() {
  const permission = "Sales Review";

  /* =======================================================
     DATA
  ======================================================= */

  const [filters, setFilters] =
    useState(emptyFilters);

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const [page, setPage] =
    useState(1);

  const [limit, setLimit] =
    useState(10);

  const [total, setTotal] =
    useState(0);

  /* =======================================================
     BENCHMARKS
  ======================================================= */

  const [benchmark, setBenchmark] =
    useState({
      upt: "",
      abv: "",
      asp: "",
    });

  const [savingBenchmark, setSavingBenchmark] =
    useState(false);

  /* =======================================================
     DEPARTMENT SCORING

     This is intentionally kept in this page because the
     current Sales Review backend does not expose a scoring
     endpoint yet. Scores are persisted in browser storage
     so the existing backend contract is not changed.
  ======================================================= */

  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    let mounted = true;

    const loadDepartments = async () => {
      try {
        const response = await getDepartments();
        const rows = response?.data || response?.departments || [];

        if (mounted) {
          setDepartments(
            (Array.isArray(rows) ? rows : [])
              .filter(
                (department) =>
                  String(department.status || "Active").toLowerCase() !==
                  "inactive"
              )
              .map((department) => department.department_name)
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b))
          );
        }
      } catch (error) {
        console.error("Failed to load current departments:", error);
        if (mounted) setDepartments([]);
      }
    };

    loadDepartments();

    return () => {
      mounted = false;
    };
  }, []);

  const [selectedScoreStore, setSelectedScoreStore] = useState("");

  const [storeOptions, setStoreOptions] = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);

  const [departmentScores, setDepartmentScores] = useState({});
  const [scoresSavedAt, setScoresSavedAt] = useState("");

  const [scorePeriodType, setScorePeriodType] = useState("year");
  const [scorePeriodValue, setScorePeriodValue] = useState("");

  const periodOptions = useMemo(() => {
    const values = (key) => [...new Set(rows.map((row) => row?.[key]).filter((value) => value !== undefined && value !== null && String(value).trim() !== "").map((value) => String(value).trim()))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (scorePeriodType === "year") return values("year");
    if (scorePeriodType === "month") return values("month");
    if (scorePeriodType === "week") return values("week");
    return [];
  }, [rows, scorePeriodType]);

  useEffect(() => {
    let mounted = true;
    const loadStores = async () => {
      setStoresLoading(true);
      try {
        const response = await getSalesStores("");
        const data = response?.data?.data;
        const list = Array.isArray(data) ? data : [];
        if (!mounted) return;
        setStoreOptions(list);
      } catch (error) {
        console.error("Unable to load Store Management stores:", error);
        if (mounted) setStoreOptions([]);
      } finally {
        if (mounted) setStoresLoading(false);
      }
    };
    loadStores();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!scorePeriodValue && periodOptions.length) setScorePeriodValue(periodOptions[0]);
  }, [periodOptions, scorePeriodValue]);

  useEffect(() => {
    if (scorePeriodType === "day") return;
    if (scorePeriodValue && periodOptions.includes(scorePeriodValue)) return;
    if (!periodOptions.length) setScorePeriodValue("");
  }, [scorePeriodType, periodOptions, scorePeriodValue]);

  const scoreStorageKey = useMemo(() => {
    const period = scorePeriodValue || `all-${scorePeriodType}s`;
    return `miarcus-sales-review-department-scores:${period}:${filters.years || "all-years"}`;
  }, [scorePeriodType, scorePeriodValue, filters.years]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(scoreStorageKey) || "{}");
      setDepartmentScores(saved?.scores && typeof saved.scores === "object" ? saved.scores : {});
      setScoresSavedAt(saved?.savedAt || "");
    } catch (error) {
      console.warn("Unable to restore department scores:", error);
      setDepartmentScores({});
      setScoresSavedAt("");
    }
  }, [scoreStorageKey]);

  const selectScoringStore = (storeName) => {
    setSelectedScoreStore(storeName);
    setPage(1);
    setFilters((current) => ({ ...current, store: storeName }));
  };

  const scoreForStore = useMemo(() => {
    if (!selectedScoreStore) return {};
    return departmentScores[selectedScoreStore] || {};
  }, [departmentScores, selectedScoreStore]);

  const setDepartmentScore = (department, value) => {
    if (!selectedScoreStore) return;

    setDepartmentScores((current) => ({
      ...current,
      [selectedScoreStore]: {
        ...(current[selectedScoreStore] || {}),
        [department]: value,
      },
    }));
  };

  const saveDepartmentScores = () => {
    if (!selectedScoreStore) {
      alert("Please select a store first.");
      return;
    }

    const savedAt = new Date().toISOString();

    try {
      localStorage.setItem(
        scoreStorageKey,
        JSON.stringify({
          scores: departmentScores,
          savedAt,
        })
      );

      setScoresSavedAt(savedAt);
      alert(`Department scores saved for ${selectedScoreStore}.`);
    } catch (error) {
      console.error("Unable to save department scores:", error);
      alert("Unable to save department scores on this device.");
    }
  };

  const scoringSummary = useMemo(() => {
    const values = Object.values(scoreForStore)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0);

    if (!values.length) {
      return {
        average: null,
        scored: 0,
        total: departments.length,
        high: 0,
        low: 0,
      };
    }

    return {
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      scored: values.length,
      total: departments.length,
      high: values.filter((value) => value >= 8).length,
      low: values.filter((value) => value < 5).length,
    };
  }, [scoreForStore, departments.length]);

  const scoreTone = (value) => {
    if (value === "" || value === undefined || value === null) return "na";
    const number = Number(value);
    if (number >= 8) return "excellent";
    if (number >= 5) return "watch";
    return "critical";
  };

  const scoreLabel = (value) => {
    if (value === "" || value === undefined || value === null) return "Not scored";
    const number = Number(value);
    if (number >= 8) return "Strong";
    if (number >= 5) return "Watch";
    return "Needs attention";
  };

  /* =======================================================
     MODALS
  ======================================================= */

  const [showBulkModal, setShowBulkModal] =
    useState(false);

  const [showDeleteAllDialog, setShowDeleteAllDialog] =
    useState(false);

  /* =======================================================
     ADD SINGLE SALES ENTRY

     Reuses the existing Sales Review CSV import contract,
     so no second write API is required.
  ======================================================= */

  const createEmptySalesEntry = () => {
    const now = new Date();
    return {
      store_name: "",
      year: String(now.getFullYear()),
      month: now.toLocaleString("en-US", { month: "long" }),
      week: "",
      day: String(now.getDate()),
      target: "",
      mtd: "",
      mrp_sale: "",
      last_month_sale: "",
      lysm: "",
      projection_remaining: "",
      projection_selected_week: "",
      discount_amount: "",
      bill_count: "",
      qty_sold: "",
      reports_to: "",
      asm: "",
      remarks: "",
    };
  };

  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [salesEntry, setSalesEntry] = useState(createEmptySalesEntry);

  const entryMetrics = useMemo(() => {
    const mtd = Number(salesEntry.mtd || 0);
    const remaining = Number(salesEntry.projection_remaining || 0);
    const mrp = Number(salesEntry.mrp_sale || 0);
    const bills = Number(salesEntry.bill_count || 0);
    const qty = Number(salesEntry.qty_sold || 0);
    const discount = Number(salesEntry.discount_amount || 0);

    return {
      projection: mtd + remaining,
      discountPercent: mrp > 0 ? (discount / mrp) * 100 : 0,
      upt: bills > 0 ? qty / bills : 0,
      abv: bills > 0 ? mrp / bills : 0,
      asp: qty > 0 ? mrp / qty : 0,
    };
  }, [salesEntry]);

  const updateSalesEntry = (key, value) => {
    setSalesEntry((current) => ({ ...current, [key]: value }));
  };

  const openAddEntry = () => {
    if (!canAdd(permission)) return;
    setSalesEntry(createEmptySalesEntry());
    setShowAddEntryModal(true);
  };

  const closeAddEntry = () => {
    if (savingEntry) return;
    setShowAddEntryModal(false);
  };

  const csvEscape = (value) => {
    const text = value === undefined || value === null ? "" : String(value);
    return /[",\n\r]/.test(text)
      ? `"${text.replace(/"/g, '""')}"`
      : text;
  };

  const saveSalesEntry = async () => {
    if (!canAdd(permission) || savingEntry) return;

    if (!salesEntry.store_name) {
      alert("Please select a Store Management store.");
      return;
    }

    if (!salesEntry.year || !salesEntry.month) {
      alert("Year and month are required.");
      return;
    }

    const headers = [
      "store_name", "year", "month", "week", "day", "target", "mtd", "mrp_sale",
      "last_month_sale", "lysm", "projection", "projection_remaining",
      "projection_selected_week", "discount_amount", "discount_percent", "upt",
      "abv", "asp", "bill_count", "qty_sold", "reports_to", "asm", "remarks",
    ];

    const values = [
      salesEntry.store_name,
      salesEntry.year,
      salesEntry.month,
      salesEntry.week,
      salesEntry.day,
      salesEntry.target,
      salesEntry.mtd,
      salesEntry.mrp_sale,
      salesEntry.last_month_sale,
      salesEntry.lysm,
      entryMetrics.projection.toFixed(2),
      salesEntry.projection_remaining,
      salesEntry.projection_selected_week,
      salesEntry.discount_amount,
      entryMetrics.discountPercent.toFixed(2),
      entryMetrics.upt.toFixed(4),
      entryMetrics.abv.toFixed(2),
      entryMetrics.asp.toFixed(2),
      salesEntry.bill_count,
      salesEntry.qty_sold,
      salesEntry.reports_to,
      salesEntry.asm,
      salesEntry.remarks,
    ];

    const csv =
      `${headers.join(",")}\n${values.map(csvEscape).join(",")}\n`;

    const file = new File(
      [csv],
      `sales-review-entry-${Date.now()}.csv`,
      { type: "text/csv;charset=utf-8" }
    );

    setSavingEntry(true);

    try {
      await uploadSalesReview(file);
      setShowAddEntryModal(false);
      setSalesEntry(createEmptySalesEntry());
      setPage(1);
      await load(true);
      alert(
        `Sales entry added successfully for ${salesEntry.store_name}.`
      );
    } catch (error) {
      console.error(
        "Unable to add Sales Review entry:",
        error
      );
      alert(
        error.response?.data?.message ||
          "Unable to add Sales Review entry."
      );
    } finally {
      setSavingEntry(false);
    }
  };

  /* =======================================================
     LOAD SALES REVIEW
  ======================================================= */

  const load = useCallback(
    async (showRefresh = false) => {
      if (!canView(permission)) {
        setLoading(false);
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response =
          await getSalesReview({
            ...filters,
            page,
            limit,
          });

        const data =
          response?.data?.data;

        setRows(
          Array.isArray(data)
            ? data
            : []
        );

        setTotal(
          Number(
            response?.data?.total || 0
          )
        );

        if (
          response?.data?.benchmarks
        ) {
          setBenchmark(
            response.data.benchmarks
          );
        }
      } catch (error) {
        console.error(
          "Unable to load Sales Review:",
          error
        );

        alert(
          error.response?.data?.message ||
            "Unable to load Sales Review."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      filters,
      page,
      limit,
    ]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    load();
  }, [load]);

  /* =======================================================
     FILTER
  ======================================================= */

  const setFilter = (
    key,
    value
  ) => {
    setPage(1);

    setFilters(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  };

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  const clearFilters = () => {
    setPage(1);
    setFilters({
      ...emptyFilters,
    });
  };

  /* =======================================================
     BULK IMPORT
  ======================================================= */

  const importFile = async (
    file
  ) => {
    const result =
      await uploadSalesReview(
        file
      );

    setPage(1);

    /*
      Reload after upload so the newly
      imported data is immediately visible.
    */
    await load(true);

    return (
      result?.data ||
      result
    );
  };

  /* =======================================================
     EXPORT
  ======================================================= */

  const exportCsv =
    async () => {
      try {
        const response =
          await exportSalesReview(
            filters
          );

        downloadBlob(
          response.data,
          "sales-review.csv"
        );
      } catch (error) {
        console.error(
          "Sales Review export failed:",
          error
        );

        alert(
          error.response?.data?.message ||
            "Export failed."
        );
      }
    };

  /* =======================================================
     SAVE BENCHMARKS
  ======================================================= */

  const saveBenchmarks =
    async () => {
      if (
        savingBenchmark ||
        !canEdit(permission)
      ) {
        return;
      }

      const upt =
        Number(
          benchmark.upt
        );

      const abv =
        Number(
          benchmark.abv
        );

      const asp =
        Number(
          benchmark.asp
        );

      if (
        benchmark.upt !== "" &&
        (!Number.isFinite(upt) ||
          upt < 0)
      ) {
        alert(
          "Please enter a valid UPT benchmark."
        );

        return;
      }

      if (
        benchmark.abv !== "" &&
        (!Number.isFinite(abv) ||
          abv < 0)
      ) {
        alert(
          "Please enter a valid ABV benchmark."
        );

        return;
      }

      if (
        benchmark.asp !== "" &&
        (!Number.isFinite(asp) ||
          asp < 0)
      ) {
        alert(
          "Please enter a valid ASP benchmark."
        );

        return;
      }

      setSavingBenchmark(true);

      try {
        await updateSalesBenchmark(
          benchmark
        );

        await load(true);

        alert(
          "Benchmarks updated successfully."
        );
      } catch (error) {
        console.error(
          "Benchmark update failed:",
          error
        );

        alert(
          error.response?.data?.message ||
            "Benchmark update failed."
        );
      } finally {
        setSavingBenchmark(false);
      }
    };

  /* =======================================================
     DELETE ALL
  ======================================================= */

  const confirmDeleteAll =
    async () => {
      try {
        await deleteAllSalesReview();

        setPage(1);

        await load(true);
      } catch (error) {
        console.error(
          "Delete all failed:",
          error
        );

        alert(
          error.response?.data?.message ||
            "Delete failed."
        );
      } finally {
        setShowDeleteAllDialog(
          false
        );
      }
    };

  /* =======================================================
     SAMPLE CSV
  ======================================================= */

  const downloadSample =
    () => {
      const headers = [
        "store_name",
        "year",
        "month",
        "week",
        "target",
        "mtd",
        "mrp_sale",
        "last_month_sale",
        "lysm",
        "projection",
        "projection_remaining",
        "projection_selected_week",
        "discount_amount",
        "discount_percent",
        "upt",
        "abv",
        "asp",
        "bill_count",
        "qty_sold",
        "reports_to",
        "asm",
        "remarks",
      ];

      const blob =
        new Blob(
          [
            `${headers.join(
              ","
            )}\n`,
          ],
          {
            type:
              "text/csv;charset=utf-8;",
          }
        );

      downloadBlob(
        blob,
        "sales-review-sample.csv"
      );
    };

  /* =======================================================
     PAGE COUNT
  ======================================================= */

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        total / limit
      )
    );

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(
    () => {
      if (!rows.length) {
        return {
          target: 0,
          mtd: 0,
          projection: 0,
        };
      }

      return rows.reduce(
        (
          result,
          row
        ) => ({
          target:
            result.target +
            Number(
              row.target || 0
            ),

          mtd:
            result.mtd +
            Number(
              row.mtd || 0
            ),

          projection:
            result.projection +
            Number(
              row.projection || 0
            ),
        }),
        {
          target: 0,
          mtd: 0,
          projection: 0,
        }
      );
    },
    [rows]
  );

  /* =======================================================
     LIVE SALES PULSE
  ======================================================= */

  const salesPulse = useMemo(() => {
    const safe = (key) => rows.reduce((sum, row) => sum + Number(row?.[key] || 0), 0);
    const average = (key) => {
      const values = rows.map((row) => Number(row?.[key])).filter(Number.isFinite);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    };

    const target = safe("target");
    const mtd = safe("mtd");
    const projection = safe("projection");
    const lastMonth = safe("last_month_sale");
    const lysm = safe("lysm");
    const bills = safe("bill_count");
    const qty = safe("qty_sold");
    const targetAchievement = target > 0 ? (mtd / target) * 100 : 0;
    const lastMonthChange = lastMonth !== 0 ? ((mtd - lastMonth) / Math.abs(lastMonth)) * 100 : 0;
    const projectionGap = projection - target;

    return {
      target,
      mtd,
      projection,
      projectionGap,
      lastMonth,
      lysm,
      bills,
      qty,
      upt: average("upt"),
      abv: average("abv"),
      asp: average("asp"),
      targetAchievement,
      lastMonthChange,
      projectionAboveTarget: projectionGap >= 0,
      chartMax: Math.max(target, mtd, projection, 1),
    };
  }, [rows]);

  const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const formatNumber = (value, digits = 0) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const signedPercent = (value) => `${value >= 0 ? "+" : ""}${Number(value || 0).toFixed(1)}%`;

  /* =======================================================
     TABLE COLUMNS
  ======================================================= */

  const columns = [
    {
      key: "store_name",
      title: "Store Name",
      minWidth: "220px",

      render: (row) => (
        <strong>
          {row.store_name ||
            "—"}
        </strong>
      ),
    },

    {
      key: "year",
      title: "Year",
      minWidth: "90px",
      align: "center",

      render: (row) =>
        row.year ??
        "N/A",
    },

    {
      key: "month",
      title: "Month",
      minWidth: "100px",
      align: "center",

      render: (row) =>
        row.month ??
        "N/A",
    },

    {
      key: "week",
      title: "Week",
      minWidth: "90px",
      align: "center",

      render: (row) =>
        row.week ??
        "N/A",
    },

    {
      key: "target",
      title: "Target",
      minWidth: "110px",
      align: "right",

      render: (row) =>
        row.target ??
        0,
    },

    {
      key: "mtd",
      title: "MTD",
      minWidth: "100px",
      align: "right",

      render: (row) =>
        row.mtd ??
        0,
    },

    {
      key: "mrp_sale",
      title: "MRP Sale",
      minWidth: "110px",
      align: "right",

      render: (row) =>
        row.mrp_sale ??
        0,
    },

    {
      key: "last_month_sale",
      title: "Last Month Sale",
      minWidth: "130px",
      align: "right",

      render: (row) =>
        row.last_month_sale ??
        0,
    },

    {
      key: "lysm",
      title: "LYSM",
      minWidth: "100px",
      align: "right",

      render: (row) =>
        row.lysm ??
        0,
    },

    {
      key: "projection",
      title: "Projection",
      minWidth: "110px",
      align: "right",

      render: (row) =>
        row.projection ??
        0,
    },

    {
      key: "projection_remaining",
      title: "Projection Remaining",
      minWidth: "150px",
      align: "right",

      render: (row) =>
        row.projection_remaining ??
        0,
    },

    {
      key: "projection_selected_week",
      title: "Projection Selected Week",
      minWidth: "170px",
      align: "right",

      render: (row) =>
        row.projection_selected_week ??
        0,
    },

    {
      key: "discount_amount",
      title: "Discount Amount",
      minWidth: "140px",
      align: "right",

      render: (row) =>
        row.discount_amount ??
        0,
    },

    {
      key: "discount_percent",
      title: "Discount %",
      minWidth: "110px",
      align: "right",

      render: (row) =>
        row.discount_percent ??
        0,
    },

    {
      key: "upt",
      title: "UPT",
      minWidth: "90px",
      align: "right",

      render: (row) =>
        row.upt ??
        0,
    },

    {
      key: "abv",
      title: "ABV",
      minWidth: "90px",
      align: "right",

      render: (row) =>
        row.abv ??
        0,
    },

    {
      key: "asp",
      title: "ASP",
      minWidth: "90px",
      align: "right",

      render: (row) =>
        row.asp ??
        0,
    },

    {
      key: "bill_count",
      title: "Bill Count",
      minWidth: "100px",
      align: "right",

      render: (row) =>
        row.bill_count ??
        0,
    },

    {
      key: "qty_sold",
      title: "Qty Sold",
      minWidth: "100px",
      align: "right",

      render: (row) =>
        row.qty_sold ??
        0,
    },

    {
      key: "reports_to",
      title: "Reports To",
      minWidth: "140px",

      render: (row) =>
        row.reports_to ||
        "—",
    },

    {
      key: "asm",
      title: "ASM",
      minWidth: "130px",

      render: (row) =>
        row.asm ||
        "—",
    },

    {
      key: "remarks",
      title: "Remarks",
      minWidth: "220px",

      render: (row) => (
        <span className="sales-wrap-cell">
          {row.remarks ||
            "—"}
        </span>
      ),
    },
  ];

  /* =======================================================
     PERMISSION
  ======================================================= */

  if (!canView(permission)) {
    return null;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  // Trading-style momentum view. The movement line uses the
  // available comparison points instead of drawing a flat line.
  // Reference lines remain Target and Projection so the chart
  // stays meaningful even when only one store is selected.
  const trendValues = [
    Number(salesPulse.lastMonth) || 0,
    Number(salesPulse.mtd) || 0,
    Number(salesPulse.target) || 0,
    Number(salesPulse.projection) || 0,
  ];
  const trendMax = Math.max(...trendValues, 1);
  const trendMin = Math.min(...trendValues, 0);
  const trendRange = Math.max(trendMax - trendMin, 1);
  const trendX = [90, 330, 570, 810];
  const trendY = (value) => 218 - (((Number(value) || 0) - trendMin) / trendRange) * 170;
  const momentumRising = Number(salesPulse.lastMonthChange) >= 0;
  const momentumDirection = momentumRising ? "↗" : "↘";
  const momentumText = momentumRising ? "Momentum is rising" : "Momentum is falling";

  return (
    <>
      <style>{departmentScoringStyles}</style>
      <div className="sales-page sales-standard-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <PageHeader
        title={
          <>
            Sales Review

            <FaChartLine className="sales-title-info" />
          </>
        }
        subtitle="Review uploaded sales performance data, filter results, monitor targets and maintain UPT, ABV and ASP benchmarks."
      />

      {/* =================================================
          TOOLBAR
      ================================================= */}

      <PageToolbar
        search={
          filters.search
        }

        setSearch={(value) =>
          setFilter(
            "search",
            value
          )
        }

        placeholder="Search store or remarks..."

        showExport

        onExport={
          exportCsv
        }

        showBulk={
          canAdd(permission)
        }

        onBulk={() =>
          setShowBulkModal(
            true
          )
        }

        showDeleteAll={
          canDelete(
            permission
          )
        }

        onDeleteAll={() =>
          setShowDeleteAllDialog(
            true
          )
        }
      >
                {canAdd(permission) && (
          <button
            type="button"
            className="toolbar-btn sales-add-entry-btn"
            onClick={openAddEntry}
            title="Add one Sales Review entry"
          >
            <FaPlus />
            Add Entry
          </button>
        )}

<button
          type="button"
          className="toolbar-btn refresh-toolbar-btn"
          onClick={() =>
            load(true)
          }
          disabled={
            loading ||
            refreshing
          }
        >
          <FaSyncAlt
            className={
              refreshing
                ? "sales-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

        <button
          type="button"
          className="toolbar-btn sample-toolbar-btn"
          onClick={
            downloadSample
          }
        >
          <FaFileCsv />

          Sample CSV
        </button>
      </PageToolbar>

      {/* =================================================
          FILTERS
      ================================================= */}

      <FilterBar
        onClear={
          clearFilters
        }
      >
        <label className="sales-global-filter">
          <span>
            Year(s)
          </span>

          <select value={filters.years} onChange={(event) => setFilter("years", event.target.value)}>
            <option value="">All years</option>
            {[...new Set(rows.map((row) => row?.year).filter((value) => value !== null && value !== undefined && String(value).trim() !== ""))].sort((a, b) => Number(a) - Number(b)).map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>

        <label className="sales-global-filter">
          <span>
            Month(s)
          </span>

          <select value={filters.months} onChange={(event) => setFilter("months", event.target.value)}>
            <option value="">All months</option>
            {[...new Set(rows.map((row) => row?.month).filter((value) => value))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </label>

        <label className="sales-global-filter">
          <span>
            Week(s)
          </span>

          <select value={filters.weeks} onChange={(event) => setFilter("weeks", event.target.value)}>
            <option value="">All weeks</option>
            {[...new Set(rows.map((row) => row?.week).filter((value) => value))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).map((week) => <option key={week} value={week}>{week}</option>)}
          </select>
        </label>

        <label className="sales-global-filter">
          <span>
            Day(s)
          </span>

          <select value={filters.day || ""} onChange={(event) => setFilter("day", event.target.value)}>
            <option value="">All days</option>
            {[...new Set(rows.map((row) => row?.day || row?.date || row?.sales_date).filter((value) => value))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
        </label>

        <label className="sales-global-filter">
          <span>
            Reports To
          </span>

          <input
            placeholder="Manager..."
            value={
              filters.reports_to
            }
            onChange={(event) =>
              setFilter(
                "reports_to",
                event.target
                  .value
              )
            }
          />
        </label>

        <label className="sales-global-filter">
          <span>
            ASM
          </span>

          <input
            placeholder="ASM..."
            value={
              filters.asm
            }
            onChange={(event) =>
              setFilter(
                "asm",
                event.target
                  .value
              )
            }
          />
        </label>

        <label className="sales-global-filter">
          <span>
            Store
          </span>

          <select value={filters.store} onChange={(event) => selectScoringStore(event.target.value)}>
            <option value="">All stores</option>
            {storeOptions.map((store) => { const name = String(store?.store_name || "").trim(); return name ? <option key={store.id || name} value={name}>{name}</option> : null; })}
          </select>
        </label>
      </FilterBar>

      {/* =================================================
          LIVE SALES PULSE
      ================================================= */}

      <section className="sales-live-pulse">
        <div className="sales-live-pulse-head">
          <div>
            <div className="sales-live-pulse-title"><span className="sales-live-dot" /> LIVE SALES PULSE</div>
            <span>Auto refresh every 30 seconds</span>
          </div>
        </div>

        <div className="sales-kpi-grid">
          <div className="sales-kpi-card">
            <span>MTD</span><strong>{formatMoney(salesPulse.mtd)}</strong>
            <small className={salesPulse.lastMonthChange >= 0 ? "positive" : "negative"}>{salesPulse.lastMonthChange >= 0 ? "↗" : "↘"} {signedPercent(salesPulse.lastMonthChange)}</small>
            <em>vs last month {formatMoney(salesPulse.lastMonth)}</em>
          </div>
          <div className="sales-kpi-card">
            <span>TARGET</span><strong>{formatMoney(salesPulse.target)}</strong>
            <small>{salesPulse.targetAchievement.toFixed(1)}%</small>
            <em>{salesPulse.targetAchievement.toFixed(1)}% achieved by MTD</em>
          </div>
          <div className="sales-kpi-card">
            <span>PROJECTION</span><strong>{formatMoney(salesPulse.projection)}</strong>
            <small className={salesPulse.projectionAboveTarget ? "positive" : "negative"}>{salesPulse.projectionAboveTarget ? "↗" : "↘"} {signedPercent(salesPulse.target ? (salesPulse.projectionGap / Math.abs(salesPulse.target)) * 100 : 0)}</small>
            <em>{salesPulse.projectionAboveTarget ? "Projected above target" : "Projected below target"}</em>
          </div>
          <div className="sales-kpi-card">
            <span>PROJECTION GAP</span><strong>{formatMoney(salesPulse.projectionGap)}</strong>
            <small>{salesPulse.projectionAboveTarget ? "⚡" : "↓"}</small>
            <em>{salesPulse.projectionAboveTarget ? "Expected surplus vs target" : "Expected shortfall vs target"}</em>
          </div>
          <div className="sales-kpi-card"><span>UPT</span><strong>{formatNumber(salesPulse.upt, 2)}</strong><em>Units per transaction</em></div>
          <div className="sales-kpi-card"><span>ABV</span><strong>{formatMoney(salesPulse.abv)}</strong><em>Average bill value</em></div>
          <div className="sales-kpi-card"><span>ASP</span><strong>{formatMoney(salesPulse.asp)}</strong><em>Average selling price</em></div>
          <div className="sales-kpi-card"><span>QUANTITY / BILLS</span><strong>{formatNumber(salesPulse.qty)}</strong><em>{formatNumber(salesPulse.bills)} bills</em></div>
        </div>
      </section>

      <div className="sales-analysis-grid">
        <section className="sales-analysis-card">
          <div className="sales-analysis-heading">
            <div><h2>Sales Trend</h2><p>Target, MTD and projection movement across the filtered periods.</p></div>
            <strong className={salesPulse.lastMonthChange >= 0 ? "positive" : "negative"}>{salesPulse.lastMonthChange >= 0 ? "↗" : "↘"} {signedPercent(salesPulse.lastMonthChange)}</strong>
          </div>
          <div className="sales-trend-content">
            <div className={`sales-trend-label ${momentumRising ? "momentum-up" : "momentum-down"}`}>
              <span>Sales movement</span>
              <b><i>{momentumDirection}</i> {momentumText}</b>
              <small>{signedPercent(salesPulse.lastMonthChange)} vs last month</small>
            </div>
            <svg className={`sales-trend-chart ${momentumRising ? "momentum-chart-up" : "momentum-chart-down"}`} viewBox="0 0 900 270" preserveAspectRatio="none" aria-label="Sales momentum chart">
              <line x1="60" y1="48" x2="860" y2="48" />
              <line x1="60" y1="105" x2="860" y2="105" />
              <line x1="60" y1="162" x2="860" y2="162" />
              <line x1="60" y1="218" x2="860" y2="218" />

              <text x="12" y="52">₹{formatNumber(trendMax)}</text>
              <text x="12" y="222">₹{formatNumber(Math.max(trendMin, 0))}</text>

              <polyline
                className="trend-target"
                points={`${trendX[0]},${trendY(salesPulse.target)} ${trendX[1]},${trendY(salesPulse.target)} ${trendX[2]},${trendY(salesPulse.target)} ${trendX[3]},${trendY(salesPulse.target)}`}
              />
              <polyline
                className="trend-projection"
                points={`${trendX[0]},${trendY(salesPulse.projection)} ${trendX[1]},${trendY(salesPulse.projection)} ${trendX[2]},${trendY(salesPulse.projection)} ${trendX[3]},${trendY(salesPulse.projection)}`}
              />

              <polyline
                className="trend-momentum"
                points={trendValues.map((value, index) => `${trendX[index]},${trendY(value)}`).join(" ")}
              />

              {trendValues.map((value, index) => (
                <g key={`trend-point-${index}`} className="trend-point">
                  <circle cx={trendX[index]} cy={trendY(value)} r="6" />
                  <circle cx={trendX[index]} cy={trendY(value)} r="2.5" />
                </g>
              ))}

              <text className="trend-axis-label" x="90" y="252">Last Month</text>
              <text className="trend-axis-label" x="330" y="252">MTD</text>
              <text className="trend-axis-label" x="570" y="252">Target</text>
              <text className="trend-axis-label" x="810" y="252">Projection</text>
            </svg>
            <div className="sales-trend-legend">
              <span className="legend-momentum">● Momentum</span>
              <span>— Target</span>
              <span>— Projection</span>
            </div>
          </div>
        </section>

        <section className="sales-analysis-card sales-management-card">
          <div className="sales-analysis-heading"><div><h2>Management View</h2><p>Automatic interpretation of the current filtered data.</p></div></div>
          <div className="sales-management-message"><b>↗ &nbsp;{salesPulse.lastMonthChange >= 0 ? "Sales are growing" : "Sales are declining"}</b><p>MTD is {signedPercent(salesPulse.lastMonthChange)} compared with last month. MTD has achieved {salesPulse.targetAchievement.toFixed(1)}% of the current target.</p></div>
          <div className="sales-management-list">
            <div><span>Projection</span><strong>{formatMoney(salesPulse.projection)}</strong></div>
            <div><span>Target gap</span><strong>{formatMoney(salesPulse.projectionGap)}</strong></div>
            <div><span>LYSM comparison</span><strong>{salesPulse.lysm ? signedPercent(((salesPulse.mtd-salesPulse.lysm)/Math.abs(salesPulse.lysm))*100) : "+0.0%"}</strong></div>
            <div><span>Stores in view</span><strong>{total}</strong></div>
          </div>
        </section>
      </div>

      {/* =================================================
          SALES TABLE
      ================================================= */}

      <Card
        title="Sales Summary"
        subtitle={`${total} record${
          total === 1
            ? ""
            : "s"
        } found`}
        noPadding
      >
        <DataTable
          columns={
            columns
          }

          data={rows}

          loading={
            loading
          }

          emptyTitle="No Sales Review Data Found"

          emptyDescription="Upload a Sales Review CSV to populate this summary."

          className="sales-global-table sales-review-global-table"
        />

        <Pagination
          currentPage={
            page
          }

          totalPages={
            pageCount
          }

          totalRecords={
            total
          }

          pageSize={
            limit
          }

          onPageChange={
            setPage
          }

          onPageSizeChange={(
            size
          ) => {
            setPage(1);
            setLimit(size);
          }}
        />
      </Card>

      {/* =================================================
          BENCHMARKS
      ================================================= */}

      <Card
        title="Sales Benchmarks"
        subtitle="Set the reference values used by the Sales Review module."
        className="benchmark-card"
      >
        <div className="benchmark-grid">

          <label>
            <span>
              UPT
            </span>

            <input
              type="number"
              min="0"
              step="0.0001"
              value={
                benchmark.upt ??
                ""
              }
              onChange={(event) =>
                setBenchmark(
                  (current) => ({
                    ...current,
                    upt:
                      event.target
                        .value,
                  })
                )
              }
              disabled={
                !canEdit(
                  permission
                ) ||
                savingBenchmark
              }
            />
          </label>

          <label>
            <span>
              ABV
            </span>

            <input
              type="number"
              min="0"
              step="0.0001"
              value={
                benchmark.abv ??
                ""
              }
              onChange={(event) =>
                setBenchmark(
                  (current) => ({
                    ...current,
                    abv:
                      event.target
                        .value,
                  })
                )
              }
              disabled={
                !canEdit(
                  permission
                ) ||
                savingBenchmark
              }
            />
          </label>

          <label>
            <span>
              ASP
            </span>

            <input
              type="number"
              min="0"
              step="0.0001"
              value={
                benchmark.asp ??
                ""
              }
              onChange={(event) =>
                setBenchmark(
                  (current) => ({
                    ...current,
                    asp:
                      event.target
                        .value,
                  })
                )
              }
              disabled={
                !canEdit(
                  permission
                ) ||
                savingBenchmark
              }
            />
          </label>

          {canEdit(
            permission
          ) && (
            <button
              type="button"
              className="benchmark-save-btn"
              onClick={
                saveBenchmarks
              }
              disabled={
                savingBenchmark
              }
            >
              <FaSave
                className={
                  savingBenchmark
                    ? "sales-spin"
                    : ""
                }
              />

              {savingBenchmark
                ? "Updating..."
                : "Update Benchmarks"}
            </button>
          )}
        </div>
      </Card>

      {/* =================================================
          DEPARTMENT SCORING — AFTER SALES BENCHMARKS
      ================================================= */}

      <section className="sales-scoring-shell">
        <div className="sales-scoring-header">
          <div>
            <div className="sales-scoring-eyebrow">
              <FaChartLine /> PERFORMANCE INTELLIGENCE
            </div>
            <h2>Department Scoring</h2>
            <p>
              Score each department for the selected store to turn the Sales Review
              into an actionable management view — not just a sales table.
            </p>
          </div>

          <div className="sales-scoring-period">
            <span>Review period</span>
            <strong>
              {scorePeriodValue || `All ${scorePeriodType}s`}
              {filters.years ? ` · ${filters.years}` : ""}
            </strong>
          </div>
        </div>

        <div className="sales-scoring-explainer">
          <div className="sales-scoring-explainer-icon">
            <FaInfoCircle />
          </div>
          <div>
            <strong>Why this is here</strong>
            <p>
              Sales numbers show <em>what</em> happened. Department scores help explain
              <em> why</em> it happened. A low score highlights where management,
              merchandising, support, inventory or store execution needs attention.
              This makes follow-up and coaching much easier.
            </p>
          </div>
        </div>

        <div className="sales-scoring-period-controls">
          <label className="sales-period-control"><span>Period</span><select value={scorePeriodType} onChange={(event) => { setScorePeriodType(event.target.value); setScorePeriodValue(""); }}><option value="year">Per Year</option><option value="month">Per Month</option><option value="week">Per Week</option><option value="day">Per Day</option></select><small>Yearly, monthly, weekly and daily scoring use the same workspace.</small></label>
          <label className="sales-period-control"><span>Period Value</span>{scorePeriodType === "day" ? <input type="date" value={scorePeriodValue} onChange={(event) => setScorePeriodValue(event.target.value)} /> : <select value={scorePeriodValue} onChange={(event) => setScorePeriodValue(event.target.value)}><option value="">All {scorePeriodType}s</option>{periodOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select>}<small>{scorePeriodType === "day" ? "Choose the exact day to score." : "Values come from loaded Sales Review data."}</small></label>
          <label className="sales-period-control"><span>Store Source</span><select value={selectedScoreStore} onChange={(event) => selectScoringStore(event.target.value)} disabled={storesLoading || !storeOptions.length}><option value="">Select Store</option>{storeOptions.map((store) => { const name = String(store?.store_name || "").trim(); return name ? <option key={store.id || name} value={name}>{name}</option> : null; })}</select><small><strong>Store Management</strong> is the only source for this list.</small></label>
          <div className="sales-period-control"><span>Current Scope</span><div style={{height:"36px",display:"flex",alignItems:"center",padding:"0 10px",border:"1px solid #d2dfe3",borderRadius:"8px",background:"#fff",color:"#29414c",fontSize:"11px",boxSizing:"border-box"}}>{selectedScoreStore || "No store selected"}</div><small>{filters.store ? "Sales table is filtered to the selected store." : "Select a store to load its scoring view."}</small></div>
        </div>
        <div className="sales-store-source"><strong>Store Management sync:</strong> scoring stores are loaded from the main Store Management stores table; no manual store names are created here.</div>

        <div className="sales-scoring-grid">
          <div className="sales-scoring-panel">
            <div className="sales-scoring-panel-top">
              <div>
                <span className="sales-scoring-label">SELECT STORE</span>
                <h3>Enter Scores</h3>
              </div>

              <select className="sales-scoring-store-select" value={selectedScoreStore} onChange={(event) => selectScoringStore(event.target.value)} disabled={storesLoading || !storeOptions.length}>
                <option value="">{storesLoading ? "Loading Store Management..." : storeOptions.length ? "Select a store" : "No stores available"}</option>
                {storeOptions.map((store) => { const name = String(store?.store_name || "").trim(); return name ? <option key={store.id || name} value={name}>{name}</option> : null; })}
              </select>
            </div>

            {selectedScoreStore ? (
              <>
                <div className="sales-scoring-store-context">
                  <div>
                    <FaBullseye />
                    <span>
                      Scoring <strong>{selectedScoreStore}</strong>
                    </span>
                  </div>
                  <small>0 = critical · 5 = watch · 10 = excellent</small>
                </div>

                <div className="sales-score-list">
                  {departments.map((department) => {
                    const value = scoreForStore[department] ?? "";
                    const tone = scoreTone(value);

                    return (
                      <div className={`sales-score-row ${tone}`} key={department}>
                        <div className="sales-score-department">
                          <span>{department}</span>
                          <small>{scoreLabel(value)}</small>
                        </div>

                        <div className="sales-score-control">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="1"
                            value={value === "" ? 0 : value}
                            onChange={(event) =>
                              setDepartmentScore(department, event.target.value)
                            }
                            aria-label={`${department} score`}
                          />
                          <select
                            value={value}
                            onChange={(event) =>
                              setDepartmentScore(department, event.target.value)
                            }
                            aria-label={`${department} score selection`}
                          >
                            <option value="">N/A</option>
                            {Array.from({ length: 11 }, (_, index) => (
                              <option key={index} value={index}>
                                {index}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="sales-score-save"
                  onClick={saveDepartmentScores}
                  disabled={!canEdit(permission)}
                  title={!canEdit(permission) ? "Edit permission is required" : "Save department scores"}
                >
                  <FaSave />
                  {canEdit(permission) ? `Save Scores for ${selectedScoreStore}` : "View Only — Edit Permission Required"}
                </button>
              </>
            ) : (
              <div className="sales-scoring-empty">
                <FaBullseye />
                <strong>Select a store to begin</strong>
                <span>Select a Store Management store to open the scoring workspace and performance summary for the chosen period.</span>
              </div>
            )}
          </div>

          <div className="sales-scoring-panel sales-performance-panel">
            <div className="sales-scoring-panel-heading">
              <div>
                <span className="sales-scoring-label">LIVE SUMMARY</span>
                <h3>Performance Summary</h3>
              </div>
              {scoresSavedAt && (
                <span className="sales-score-saved">
                  <FaCheckCircle /> Saved {new Date(scoresSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>

            <p className="sales-performance-copy">
              {selectedScoreStore
                ? `Aggregated department performance for ${selectedScoreStore}.`
                : "Select a store to see its department performance."}
            </p>

            <div className="sales-performance-kpis">
              <div className="sales-performance-kpi primary">
                <span>Average Score</span>
                <strong>
                  {scoringSummary.average === null
                    ? "N/A"
                    : scoringSummary.average.toFixed(1)}
                </strong>
                <small>out of 10</small>
              </div>
              <div className="sales-performance-kpi">
                <span>Scored</span>
                <strong>{scoringSummary.scored}/{scoringSummary.total}</strong>
                <small>departments</small>
              </div>
              <div className="sales-performance-kpi positive">
                <span>Strong</span>
                <strong>{scoringSummary.high}</strong>
                <small>8–10 score</small>
              </div>
              <div className="sales-performance-kpi negative">
                <span>Needs Attention</span>
                <strong>{scoringSummary.low}</strong>
                <small>below 5</small>
              </div>
            </div>

            <div className="sales-score-chart">
              <div className="sales-score-chart-head">
                <strong>Department-wise Performance</strong>
                <span>0 — 10</span>
              </div>

              <div className="sales-score-bars">
                {departments.map((department) => {
                  const value = Number(scoreForStore[department]);
                  const hasValue = Number.isFinite(value);
                  const width = hasValue ? `${Math.max(2, value * 10)}%` : "0%";
                  const tone = scoreTone(hasValue ? value : "");

                  return (
                    <div className="sales-score-bar-row" key={`bar-${department}`}>
                      <span title={department}>{department}</span>
                      <div className="sales-score-track">
                        <div className={`sales-score-fill ${tone}`} style={{ width }} />
                      </div>
                      <strong>{hasValue ? value : "N/A"}</strong>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sales-score-guidance">
              <div>
                <FaCheckCircle />
                <span><strong>8–10</strong> Strong execution</span>
              </div>
              <div>
                <FaExclamationTriangle />
                <span><strong>5–7</strong> Watch closely</span>
              </div>
              <div>
                <FaArrowDown />
                <span><strong>0–4</strong> Immediate attention</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =================================================
          ADD SINGLE SALES ENTRY
      ================================================= */}

      {showAddEntryModal && (
        <div
          className="sales-entry-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sales-entry-title"
        >
          <div className="sales-entry-modal">
            <div className="sales-entry-head">
              <div>
                <div className="sales-entry-eyebrow">
                  <FaChartLine /> SALES DATA ENTRY
                </div>
                <h2 id="sales-entry-title">
                  Add Sales Review Entry
                </h2>
                <p>
                  Add one professional sales record without leaving Sales Review.
                  The store list is always sourced from Store Management.
                </p>
              </div>

              <button
                type="button"
                className="sales-entry-close"
                onClick={closeAddEntry}
                disabled={savingEntry}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="sales-entry-body">
              <section className="sales-entry-section">
                <div className="sales-entry-section-head">
                  <strong>Period & ownership</strong>
                  <span>Define exactly where this entry belongs.</span>
                </div>

                <div className="sales-entry-grid">
                  <div className="sales-entry-field wide">
                    <label>Store *</label>
                    <select
                      value={salesEntry.store_name}
                      onChange={(event) =>
                        updateSalesEntry(
                          "store_name",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select Store Management store
                      </option>
                      {storeOptions.map((store) => {
                        const name = String(
                          store?.store_name || ""
                        ).trim();

                        return name ? (
                          <option
                            key={store.id || name}
                            value={name}
                          >
                            {name}
                          </option>
                        ) : null;
                      })}
                    </select>
                    <small>
                      Store names come from the existing Store Management source.
                    </small>
                  </div>

                  <div className="sales-entry-field">
                    <label>Year *</label>
                    <select
                      value={salesEntry.year}
                      onChange={(event) =>
                        updateSalesEntry(
                          "year",
                          event.target.value
                        )
                      }
                    >
                      <option value="">Select year</option>
                      {Array.from(
                        { length: 5 },
                        (_, index) =>
                          new Date().getFullYear() - 1 + index
                      ).map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sales-entry-field">
                    <label>Month *</label>
                    <select
                      value={salesEntry.month}
                      onChange={(event) =>
                        updateSalesEntry(
                          "month",
                          event.target.value
                        )
                      }
                    >
                      <option value="">Select month</option>
                      {Array.from(
                        { length: 12 },
                        (_, index) =>
                          new Date(
                            2000,
                            index,
                            1
                          ).toLocaleString(
                            "en-US",
                            { month: "long" }
                          )
                      ).map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sales-entry-field">
                    <label>Week</label>
                    <select
                      value={salesEntry.week}
                      onChange={(event) =>
                        updateSalesEntry(
                          "week",
                          event.target.value
                        )
                      }
                    >
                      <option value="">Select week</option>
                      {Array.from(
                        { length: 53 },
                        (_, index) => index + 1
                      ).map((week) => (
                        <option key={week} value={week}>
                          Week {week}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sales-entry-field">
                    <label>Day</label>
                    <select
                      value={salesEntry.day}
                      onChange={(event) =>
                        updateSalesEntry(
                          "day",
                          event.target.value
                        )
                      }
                    >
                      <option value="">Select day</option>
                      {Array.from(
                        { length: 31 },
                        (_, index) => index + 1
                      ).map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sales-entry-field">
                    <label>Reports To</label>
                    <input
                      value={salesEntry.reports_to}
                      onChange={(event) =>
                        updateSalesEntry(
                          "reports_to",
                          event.target.value
                        )
                      }
                      placeholder="Manager name"
                    />
                  </div>

                  <div className="sales-entry-field">
                    <label>ASM</label>
                    <input
                      value={salesEntry.asm}
                      onChange={(event) =>
                        updateSalesEntry(
                          "asm",
                          event.target.value
                        )
                      }
                      placeholder="ASM name"
                    />
                  </div>
                </div>
              </section>

              <section className="sales-entry-section">
                <div className="sales-entry-section-head">
                  <strong>Sales performance</strong>
                  <span>Enter the business numbers for this period.</span>
                </div>

                <div className="sales-entry-grid">
                  {[
                    ["target", "Target", "Selected-period target"],
                    ["mtd", "MTD", "Sales achieved so far"],
                    ["mrp_sale", "MRP Sale", "Gross sales value"],
                    ["last_month_sale", "Last Month Sale", "Previous-month comparison"],
                    ["lysm", "LYSM", "Last-year same-month value"],
                    ["projection_remaining", "Projection Remaining", "Expected remaining sales"],
                    ["projection_selected_week", "Projection Selected Week", "Expected selected-week sales"],
                    ["discount_amount", "Discount Amount", "Discount value"],
                    ["bill_count", "Bill Count", "Number of bills"],
                    ["qty_sold", "Qty Sold", "Units sold"],
                  ].map(([key, label, hint]) => (
                    <div
                      className="sales-entry-field"
                      key={key}
                    >
                      <label>{label}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={salesEntry[key]}
                        onChange={(event) =>
                          updateSalesEntry(
                            key,
                            event.target.value
                          )
                        }
                        placeholder="0.00"
                      />
                      <small>{hint}</small>
                    </div>
                  ))}
                </div>
              </section>

              <section className="sales-entry-section">
                <div className="sales-entry-section-head">
                  <strong>Live calculated indicators</strong>
                  <span>Calculated automatically while you type.</span>
                </div>

                <div className="sales-entry-grid">
                  <div className="sales-entry-field">
                    <label>Projection</label>
                    <input
                      readOnly
                      value={entryMetrics.projection.toFixed(2)}
                    />
                    <small>
                      MTD + Projection Remaining
                    </small>
                  </div>

                  <div className="sales-entry-field">
                    <label>Discount %</label>
                    <input
                      readOnly
                      value={`${entryMetrics.discountPercent.toFixed(2)}%`}
                    />
                    <small>
                      Discount Amount ÷ MRP Sale
                    </small>
                  </div>

                  <div className="sales-entry-field">
                    <label>UPT</label>
                    <input
                      readOnly
                      value={entryMetrics.upt.toFixed(4)}
                    />
                    <small>
                      Qty Sold ÷ Bill Count
                    </small>
                  </div>

                  <div className="sales-entry-field">
                    <label>ABV</label>
                    <input
                      readOnly
                      value={entryMetrics.abv.toFixed(2)}
                    />
                    <small>
                      MRP Sale ÷ Bill Count
                    </small>
                  </div>

                  <div className="sales-entry-field">
                    <label>ASP</label>
                    <input
                      readOnly
                      value={entryMetrics.asp.toFixed(2)}
                    />
                    <small>
                      MRP Sale ÷ Qty Sold
                    </small>
                  </div>

                  <div className="sales-entry-field wide">
                    <div className="sales-entry-insight">
                      <FaCalculator />
                      <span>
                        These indicators update live, giving the reviewer
                        an immediate view of the store's efficiency before
                        the record is saved.
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="sales-entry-section">
                <div className="sales-entry-section-head">
                  <strong>Management note</strong>
                  <span>Optional context for the Sales Review table.</span>
                </div>

                <div className="sales-entry-grid">
                  <div className="sales-entry-field full">
                    <label>Remarks</label>
                    <textarea
                      value={salesEntry.remarks}
                      onChange={(event) =>
                        updateSalesEntry(
                          "remarks",
                          event.target.value
                        )
                      }
                      placeholder="Add a concise explanation, action point or business context..."
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="sales-entry-footer">
              <button
                type="button"
                className="sales-entry-cancel"
                onClick={closeAddEntry}
                disabled={savingEntry}
              >
                Cancel
              </button>

              <button
                type="button"
                className="sales-entry-submit"
                onClick={saveSalesEntry}
                disabled={
                  savingEntry ||
                  !salesEntry.store_name
                }
              >
                <FaSave />
                {savingEntry
                  ? "Saving Entry..."
                  : "Save Sales Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          BULK UPLOAD
      ================================================= */}

      <BulkUploadModal
        isOpen={
          showBulkModal
        }

        onClose={() =>
          setShowBulkModal(
            false
          )
        }

        title="Bulk Upload Sales Review"

        uploadFunction={
          importFile
        }

        onSuccess={
          load
        }

        acceptedFile=".csv,.xlsx,.xls"
      />

      {/* =================================================
          DELETE ALL
      ================================================= */}

      <ConfirmDialog
        open={
          showDeleteAllDialog
        }

        title="Delete All Sales Review Data"

        message="Are you sure you want to delete all Sales Review records? This action cannot be undone."

        confirmText="Delete All"

        cancelText="Cancel"

        confirmVariant="danger"

        onConfirm={
          confirmDeleteAll
        }

        onCancel={() =>
          setShowDeleteAllDialog(
            false
          )
        }
      />

      </div>
    </>
  );
}

export default SalesReview;