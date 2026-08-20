import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaChartLine,
  FaDownload,
  FaFileCsv,
  FaSyncAlt,
  FaSave,
  FaBullseye,
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