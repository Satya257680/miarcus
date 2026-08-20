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
`;

/* =========================================================
   DEFAULT FILTERS
========================================================= */

const emptyFilters = {
  years: "",
  months: "",
  weeks: "",
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

  const departments = [
    "ASM",
    "Accounts",
    "Buying",
    "City Manager",
    "Customer Support",
    "Design",
    "E-commerce",
    "EA",
    "HR",
    "IT Department",
    "Inventory Manager",
    "Maintenance",
    "Management",
    "Marketing",
    "New Store Opening",
    "Quality",
    "Regional Head",
    "Store Personnel",
    "VM",
    "Warehouse",
  ];

  const [selectedScoreStore, setSelectedScoreStore] =
    useState("");

  const [departmentScores, setDepartmentScores] =
    useState({});

  const [scoresSavedAt, setScoresSavedAt] =
    useState("");

  const scoreStorageKey = useMemo(() => {
    const year = filters.years || "all-years";
    const month = filters.months || "all-months";
    const week = filters.weeks || "all-weeks";
    return `miarcus-sales-review-department-scores:${year}:${month}:${week}`;
  }, [filters.years, filters.months, filters.weeks]);

  const scoreStores = useMemo(() => {
    const seen = new Set();
    return rows
      .map((row) => String(row.store_name || "").trim())
      .filter((name) => {
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      });
  }, [rows]);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(scoreStorageKey) || "{}"
      );

      setDepartmentScores(
        saved?.scores && typeof saved.scores === "object"
          ? saved.scores
          : {}
      );

      setScoresSavedAt(saved?.savedAt || "");
    } catch (error) {
      console.warn("Unable to restore department scores:", error);
      setDepartmentScores({});
      setScoresSavedAt("");
    }
  }, [scoreStorageKey]);

  useEffect(() => {
    if (!selectedScoreStore && scoreStores.length) {
      setSelectedScoreStore(scoreStores[0]);
    }
  }, [scoreStores, selectedScoreStore]);

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

          <input
            placeholder="Select year..."
            value={
              filters.years
            }
            onChange={(event) =>
              setFilter(
                "years",
                event.target
                  .value
              )
            }
          />
        </label>

        <label className="sales-global-filter">
          <span>
            Month(s)
          </span>

          <input
            placeholder="Select month..."
            value={
              filters.months
            }
            onChange={(event) =>
              setFilter(
                "months",
                event.target
                  .value
              )
            }
          />
        </label>

        <label className="sales-global-filter">
          <span>
            Week(s)
          </span>

          <input
            placeholder="Select week..."
            value={
              filters.weeks
            }
            onChange={(event) =>
              setFilter(
                "weeks",
                event.target
                  .value
              )
            }
          />
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

          <input
            placeholder="Store..."
            value={
              filters.store
            }
            onChange={(event) =>
              setFilter(
                "store",
                event.target
                  .value
              )
            }
          />
        </label>
      </FilterBar>

      {/* =================================================
          QUICK SUMMARY
      ================================================= */}

      {!loading &&
        rows.length > 0 && (
          <div className="sales-review-summary-grid">

            <div className="sales-review-summary-card">
              <div className="sales-review-summary-icon">
                <FaBullseye />
              </div>

              <div>
                <span>
                  Target
                </span>

                <strong>
                  {summary.target.toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="sales-review-summary-card">
              <div className="sales-review-summary-icon">
                <FaChartLine />
              </div>

              <div>
                <span>
                  MTD
                </span>

                <strong>
                  {summary.mtd.toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="sales-review-summary-card">
              <div className="sales-review-summary-icon">
                <FaChartLine />
              </div>

              <div>
                <span>
                  Projection
                </span>

                <strong>
                  {summary.projection.toLocaleString()}
                </strong>
              </div>
            </div>

          </div>
        )}

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
          DEPARTMENT SCORING
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
              {filters.months || "All months"}
              {filters.years ? ` · ${filters.years}` : ""}
              {filters.weeks ? ` · ${filters.weeks}` : ""}
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

        <div className="sales-scoring-grid">
          <div className="sales-scoring-panel">
            <div className="sales-scoring-panel-top">
              <div>
                <span className="sales-scoring-label">SELECT STORE</span>
                <h3>Enter Scores</h3>
              </div>

              <select
                value={selectedScoreStore}
                onChange={(event) => setSelectedScoreStore(event.target.value)}
                disabled={!scoreStores.length}
              >
                <option value="">
                  {scoreStores.length ? "Select a store" : "No stores in current results"}
                </option>
                {scoreStores.map((store) => (
                  <option key={store} value={store}>
                    {store}
                  </option>
                ))}
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
                <span>Department scoring becomes available when Sales Review rows are loaded.</span>
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