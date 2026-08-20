import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaChartLine,
  FaDownload,
  FaFileCsv,
  FaSyncAlt,
  FaSave,
  FaBullseye,
  FaArrowUp,
  FaArrowDown,
  FaBolt,
  FaTimes,
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

/* =========================================================
   SALES ANALYTICS HELPERS
========================================================= */

const numberValue = (value) =>
  Number.isFinite(Number(value))
    ? Number(value)
    : 0;

const formatAmount = (value) => {
  const number = numberValue(value);

  return `₹${number.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
};

const formatMetric = (value) =>
  numberValue(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const formatPercent = (value) => {
  const number = numberValue(value);

  return `${number >= 0 ? "+" : ""}${number.toFixed(1)}%`;
};

const trendMeta = (value) => {
  const number = numberValue(value);

  return {
    positive: number >= 0,
    Icon:
      number >= 0
        ? FaArrowUp
        : FaArrowDown,
  };
};

/* =========================================================
   TRADING-STYLE SALES TREND
========================================================= */

function SalesTrendChart({
  trend = [],
}) {
  if (!trend.length) {
    return (
      <div className="sales-review-chart-empty">
        Upload data with Year / Month / Week values to see the live trend.
      </div>
    );
  }

  const width = 760;
  const height = 250;
  const padding = {
    top: 22,
    right: 18,
    bottom: 42,
    left: 52,
  };

  const chartWidth =
    width - padding.left - padding.right;

  const chartHeight =
    height - padding.top - padding.bottom;

  const values = trend.flatMap((item) => [
    numberValue(item.mtd),
    numberValue(item.projection),
    numberValue(item.target),
  ]);

  const maxValue =
    Math.max(...values, 1);

  const minValue =
    Math.min(...values, 0);

  const range =
    maxValue - minValue || 1;

  const x = (index) =>
    padding.left +
    (trend.length === 1
      ? chartWidth / 2
      : (index / (trend.length - 1)) *
        chartWidth);

  const y = (value) =>
    padding.top +
    chartHeight -
    ((value - minValue) / range) *
      chartHeight;

  const line = (key) =>
    trend
      .map(
        (item, index) =>
          `${x(index)},${y(
            numberValue(item[key])
          )}`
      )
      .join(" ");

  const last =
    trend[trend.length - 1];

  const lastMtd =
    numberValue(last?.mtd);

  const firstMtd =
    numberValue(trend[0]?.mtd);

  const liveGrowth =
    firstMtd !== 0
      ? ((lastMtd - firstMtd) /
          Math.abs(firstMtd)) *
        100
      : lastMtd > 0
        ? 100
        : 0;

  const liveMeta =
    trendMeta(liveGrowth);

  const LiveIcon =
    liveMeta.Icon;

  const labelStep =
    Math.max(
      1,
      Math.ceil(trend.length / 6)
    );

  return (
    <div className="sales-review-chart-wrap">
      <div className="sales-review-chart-head">
        <div>
          <span>Sales movement</span>
          <strong>
            {liveGrowth >= 0
              ? "Momentum is rising"
              : "Momentum is falling"}
          </strong>
        </div>

        <div
          className={`sales-review-live-change ${
            liveMeta.positive
              ? "positive"
              : "negative"
          }`}
        >
          <LiveIcon />
          {formatPercent(liveGrowth)}
        </div>
      </div>

      <svg
        className="sales-review-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Sales trend chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map(
          (ratio) => {
            const gridY =
              padding.top +
              chartHeight * ratio;

            const gridValue =
              maxValue -
              range * ratio;

            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={gridY}
                  y2={gridY}
                  className="sales-review-grid-line"
                />
                <text
                  x={padding.left - 8}
                  y={gridY + 4}
                  textAnchor="end"
                  className="sales-review-axis-label"
                >
                  {formatAmount(gridValue)}
                </text>
              </g>
            );
          }
        )}

        <polyline
          points={line("target")}
          fill="none"
          className="sales-review-line target"
        />

        <polyline
          points={line("projection")}
          fill="none"
          className="sales-review-line projection"
        />

        <polyline
          points={line("mtd")}
          fill="none"
          className="sales-review-line mtd"
        />

        {trend.map(
          (item, index) => (
            <circle
              key={`${item.label}-${index}`}
              cx={x(index)}
              cy={y(
                numberValue(
                  item.mtd
                )
              )}
              r="4"
              className="sales-review-point"
            />
          )
        )}

        {trend.map(
          (item, index) =>
            index % labelStep === 0 ||
            index ===
              trend.length - 1 ? (
              <text
                key={`label-${item.label}-${index}`}
                x={x(index)}
                y={
                  height -
                  12
                }
                textAnchor="middle"
                className="sales-review-axis-label"
              >
                {item.label}
              </text>
            ) : null
        )}
      </svg>

      <div className="sales-review-chart-legend">
        <span>
          <i className="target" />
          Target
        </span>

        <span>
          <i className="mtd" />
          MTD
        </span>

        <span>
          <i className="projection" />
          Projection
        </span>
      </div>
    </div>
  );
}

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

  const [analytics, setAnalytics] =
    useState({
      target: 0,
      mtd: 0,
      mrp_sale: 0,
      last_month_sale: 0,
      lysm: 0,
      projection: 0,
      projection_remaining: 0,
      projection_selected_week: 0,
      discount_amount: 0,
      discount_percent: 0,
      upt: 0,
      abv: 0,
      asp: 0,
      bill_count: 0,
      qty_sold: 0,
      store_count: 0,
      mtd_growth: 0,
      mtd_vs_lysm: 0,
      projection_vs_target: 0,
      target_achievement: 0,
      projection_achievement: 0,
      projection_gap: 0,
    });

  const [trend, setTrend] =
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

        setAnalytics(
          response?.data?.analytics || {
            target: 0,
            mtd: 0,
            mrp_sale: 0,
            last_month_sale: 0,
            lysm: 0,
            projection: 0,
            projection_remaining: 0,
            projection_selected_week: 0,
            discount_amount: 0,
            discount_percent: 0,
            upt: 0,
            abv: 0,
            asp: 0,
            bill_count: 0,
            qty_sold: 0,
            store_count: 0,
            mtd_growth: 0,
            mtd_vs_lysm: 0,
            projection_vs_target: 0,
            target_achievement: 0,
            projection_achievement: 0,
            projection_gap: 0,
          }
        );

        setTrend(
          Array.isArray(response?.data?.trend)
            ? response.data.trend
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

    const timer = window.setInterval(() => {
      load(true);
    }, 30000);

    return () => window.clearInterval(timer);
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

  const summary = analytics;

  const growthMeta =
    trendMeta(summary.mtd_growth);

  const GrowthIcon =
    growthMeta.Icon;

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
          TRADING-STYLE LIVE SALES DASHBOARD
      ================================================= */}

      {!loading && (
        <div className="sales-review-live-dashboard">
          <div className="sales-review-live-banner">
            <div>
              <span className="sales-review-live-dot" />
              LIVE SALES PULSE
            </div>

            <small>
              Auto refresh every 30 seconds
            </small>
          </div>

          <div className="sales-review-kpi-grid">
            <div className="sales-review-kpi-card">
              <div className="sales-review-kpi-top">
                <span>MTD</span>
                <span className={`sales-review-trend ${growthMeta.positive ? "positive" : "negative"}`}>
                  <GrowthIcon />
                  {formatPercent(summary.mtd_growth)}
                </span>
              </div>
              <strong>{formatAmount(summary.mtd)}</strong>
              <small>
                vs last month {formatAmount(summary.last_month_sale)}
              </small>
            </div>

            <div className="sales-review-kpi-card">
              <div className="sales-review-kpi-top">
                <span>Target</span>
                <span className="sales-review-neutral">
                  {summary.target_achievement.toFixed(1)}%
                </span>
              </div>
              <strong>{formatAmount(summary.target)}</strong>
              <small>
                {summary.target_achievement.toFixed(1)}% achieved by MTD
              </small>
            </div>

            <div className="sales-review-kpi-card">
              <div className="sales-review-kpi-top">
                <span>Projection</span>
                <span className={`sales-review-trend ${summary.projection_vs_target >= 0 ? "positive" : "negative"}`}>
                  {summary.projection_vs_target >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                  {formatPercent(summary.projection_vs_target)}
                </span>
              </div>
              <strong>{formatAmount(summary.projection)}</strong>
              <small>
                {summary.projection_vs_target >= 0
                  ? "Projected above target"
                  : "Projected below target"}
              </small>
            </div>

            <div className="sales-review-kpi-card">
              <div className="sales-review-kpi-top">
                <span>Projection Gap</span>
                <FaBolt />
              </div>
              <strong>{formatAmount(summary.projection_gap)}</strong>
              <small>
                {summary.projection_gap >= 0
                  ? "Expected surplus vs target"
                  : "Expected shortfall vs target"}
              </small>
            </div>

            <div className="sales-review-kpi-card compact">
              <span>UPT</span>
              <strong>{formatMetric(summary.upt)}</strong>
              <small>Units per transaction</small>
            </div>

            <div className="sales-review-kpi-card compact">
              <span>ABV</span>
              <strong>{formatAmount(summary.abv)}</strong>
              <small>Average bill value</small>
            </div>

            <div className="sales-review-kpi-card compact">
              <span>ASP</span>
              <strong>{formatAmount(summary.asp)}</strong>
              <small>Average selling price</small>
            </div>

            <div className="sales-review-kpi-card compact">
              <span>Quantity / Bills</span>
              <strong>{formatMetric(summary.qty_sold)}</strong>
              <small>{formatMetric(summary.bill_count)} bills</small>
            </div>
          </div>

          <div className="sales-review-live-grid">
            <Card
              title="Sales Trend"
              subtitle="Target, MTD and projection movement across the filtered periods."
              className="sales-review-chart-card"
            >
              <SalesTrendChart trend={trend} />
            </Card>

            <Card
              title="Management View"
              subtitle="Automatic interpretation of the current filtered data."
              className="sales-review-insight-card"
            >
              <div className={`sales-review-insight ${summary.mtd_growth >= 0 ? "positive" : "negative"}`}>
                {summary.mtd_growth >= 0 ? <FaArrowUp /> : <FaArrowDown />}

                <div>
                  <strong>
                    {summary.mtd_growth >= 0
                      ? "Sales are growing"
                      : "Sales are falling"}
                  </strong>

                  <p>
                    MTD is {formatPercent(summary.mtd_growth)} compared with
                    last month. MTD has achieved {summary.target_achievement.toFixed(1)}%
                    of the current target.
                  </p>
                </div>
              </div>

              <div className="sales-review-insight-row">
                <span>Projection</span>
                <strong>{formatAmount(summary.projection)}</strong>
              </div>

              <div className="sales-review-insight-row">
                <span>Target gap</span>
                <strong>{formatAmount(summary.projection_gap)}</strong>
              </div>

              <div className="sales-review-insight-row">
                <span>LYSM comparison</span>
                <strong className={summary.mtd_vs_lysm >= 0 ? "positive-text" : "negative-text"}>
                  {formatPercent(summary.mtd_vs_lysm)}
                </strong>
              </div>

              <div className="sales-review-insight-row">
                <span>Stores in view</span>
                <strong>{formatMetric(summary.store_count)}</strong>
              </div>
            </Card>
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
  );
}

export default SalesReview;