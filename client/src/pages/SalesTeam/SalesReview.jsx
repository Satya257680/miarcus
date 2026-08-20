import { useCallback, useEffect, useState } from "react";
import { FaChartLine, FaDownload, FaFileCsv, FaSyncAlt } from "react-icons/fa";
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
import { canAdd, canDelete, canEdit, canView, downloadBlob } from "./salesTeamUtils";
import "../../styles/pages/SalesTeam.css";

const emptyFilters = { years: "", months: "", weeks: "", reports_to: "", asm: "", store: "", search: "" };

function SalesReview() {
  const permission = "Sales Review";
  const [filters, setFilters] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [benchmark, setBenchmark] = useState({ upt: "", abv: "", asp: "" });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const load = useCallback(async () => {
    if (!canView(permission)) return;
    setLoading(true);
    try {
      const response = await getSalesReview({ ...filters, page, limit });
      setRows(response.data?.data || []);
      setTotal(Number(response.data?.total || 0));
      if (response.data?.benchmarks) setBenchmark(response.data.benchmarks);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to load Sales Review.");
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters(emptyFilters);
  };

  const importFile = async (file) => {
    const result = await uploadSalesReview(file);
    setPage(1);
    await load();
    return result.data || result;
  };

  const exportCsv = async () => {
    try {
      const response = await exportSalesReview(filters);
      downloadBlob(response.data, "sales-review.csv");
    } catch (error) {
      alert(error.response?.data?.message || "Export failed.");
    }
  };

  const saveBenchmarks = async () => {
    try {
      await updateSalesBenchmark(benchmark);
      await load();
      alert("Benchmarks updated successfully.");
    } catch (error) {
      alert(error.response?.data?.message || "Benchmark update failed.");
    }
  };

  const confirmDeleteAll = async () => {
    try {
      await deleteAllSalesReview();
      setPage(1);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed.");
    } finally {
      setShowDeleteAllDialog(false);
    }
  };

  const downloadSample = () => {
    const headers = [
      "store_name", "year", "month", "week", "target", "mtd", "mrp_sale", "last_month_sale", "lysm",
      "projection", "projection_remaining", "projection_selected_week", "discount_amount", "discount_percent",
      "upt", "abv", "asp", "bill_count", "qty_sold", "reports_to", "asm", "remarks",
    ];
    const blob = new Blob([`${headers.join(",")}\n`], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, "sales-review-sample.csv");
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));

  const columns = [
    { key: "store_name", title: "Store Name", minWidth: "220px", render: (row) => <strong>{row.store_name}</strong> },
    { key: "year", title: "Year", minWidth: "90px", align: "center", render: (row) => row.year ?? "N/A" },
    { key: "month", title: "Month", minWidth: "100px", align: "center", render: (row) => row.month ?? "N/A" },
    { key: "week", title: "Week", minWidth: "90px", align: "center", render: (row) => row.week ?? "N/A" },
    { key: "target", title: "Target", minWidth: "110px", align: "right", render: (row) => row.target ?? 0 },
    { key: "mtd", title: "MTD", minWidth: "100px", align: "right", render: (row) => row.mtd ?? 0 },
    { key: "mrp_sale", title: "MRP Sale", minWidth: "110px", align: "right", render: (row) => row.mrp_sale ?? 0 },
    { key: "last_month_sale", title: "Last Month Sale", minWidth: "130px", align: "right", render: (row) => row.last_month_sale ?? 0 },
    { key: "lysm", title: "LYSM", minWidth: "100px", align: "right", render: (row) => row.lysm ?? 0 },
    { key: "projection", title: "Projection", minWidth: "110px", align: "right", render: (row) => row.projection ?? 0 },
    { key: "projection_remaining", title: "Projection Remaining", minWidth: "150px", align: "right", render: (row) => row.projection_remaining ?? 0 },
    { key: "projection_selected_week", title: "Projection Selected Week", minWidth: "170px", align: "right", render: (row) => row.projection_selected_week ?? 0 },
    { key: "discount_amount", title: "Discount Amount", minWidth: "140px", align: "right", render: (row) => row.discount_amount ?? 0 },
    { key: "discount_percent", title: "Discount %", minWidth: "110px", align: "right", render: (row) => row.discount_percent ?? 0 },
    { key: "upt", title: "UPT", minWidth: "90px", align: "right", render: (row) => row.upt ?? 0 },
    { key: "abv", title: "ABV", minWidth: "90px", align: "right", render: (row) => row.abv ?? 0 },
    { key: "asp", title: "ASP", minWidth: "90px", align: "right", render: (row) => row.asp ?? 0 },
    { key: "bill_count", title: "Bill Count", minWidth: "100px", align: "right", render: (row) => row.bill_count ?? 0 },
    { key: "qty_sold", title: "Qty Sold", minWidth: "100px", align: "right", render: (row) => row.qty_sold ?? 0 },
    { key: "remarks", title: "Remarks", minWidth: "220px", render: (row) => <span className="sales-wrap-cell">{row.remarks || "—"}</span> },
  ];

  if (!canView(permission)) return null;

  return (
    <div className="sales-page sales-standard-page">
      <PageHeader
        title={<>Sales Review <FaChartLine className="sales-title-info" /></>}
        subtitle="Review uploaded sales performance data, filter the summary, and maintain UPT, ABV and ASP benchmarks."
      />

      <PageToolbar
        search={filters.search}
        setSearch={(value) => setFilter("search", value)}
        placeholder="Search store or remarks..."
        showExport
        onExport={exportCsv}
        showBulk={canAdd(permission)}
        onBulk={() => setShowBulkModal(true)}
        showDeleteAll={canDelete(permission)}
        onDeleteAll={() => setShowDeleteAllDialog(true)}
      >
        <button type="button" className="toolbar-btn refresh-toolbar-btn" onClick={load}><FaSyncAlt /> Refresh</button>
        <button type="button" className="toolbar-btn sample-toolbar-btn" onClick={downloadSample}><FaFileCsv /> Sample CSV</button>
      </PageToolbar>

      <FilterBar onClear={clearFilters}>
        <label className="sales-global-filter"><span>Year(s)</span><input placeholder="Select year..." value={filters.years} onChange={(e) => setFilter("years", e.target.value)} /></label>
        <label className="sales-global-filter"><span>Month(s)</span><input placeholder="Select month..." value={filters.months} onChange={(e) => setFilter("months", e.target.value)} /></label>
        <label className="sales-global-filter"><span>Week(s)</span><input placeholder="Select week..." value={filters.weeks} onChange={(e) => setFilter("weeks", e.target.value)} /></label>
        <label className="sales-global-filter"><span>Reports To</span><input placeholder="Manager..." value={filters.reports_to} onChange={(e) => setFilter("reports_to", e.target.value)} /></label>
        <label className="sales-global-filter"><span>ASM</span><input placeholder="ASM..." value={filters.asm} onChange={(e) => setFilter("asm", e.target.value)} /></label>
        <label className="sales-global-filter"><span>Store</span><input placeholder="Store..." value={filters.store} onChange={(e) => setFilter("store", e.target.value)} /></label>
      </FilterBar>

      <Card title="Sales Summary" subtitle={`${total} record${total === 1 ? "" : "s"} found`} noPadding>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          emptyTitle="No Sales Review Data Found"
          emptyDescription="Upload a Sales Review CSV to populate this summary."
          className="sales-global-table sales-review-global-table"
        />
        <Pagination
          currentPage={page}
          totalPages={pageCount}
          totalRecords={total}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPage(1); setLimit(size); }}
        />
      </Card>

      <Card title="Benchmarks" subtitle="Set the reference values used by the Sales Review module." className="benchmark-card">
        <div className="benchmark-grid">
          <label><span>UPT</span><input type="number" step="0.0001" value={benchmark.upt ?? ""} onChange={(e) => setBenchmark((current) => ({ ...current, upt: e.target.value }))} /></label>
          <label><span>ABV</span><input type="number" step="0.0001" value={benchmark.abv ?? ""} onChange={(e) => setBenchmark((current) => ({ ...current, abv: e.target.value }))} /></label>
          <label><span>ASP</span><input type="number" step="0.0001" value={benchmark.asp ?? ""} onChange={(e) => setBenchmark((current) => ({ ...current, asp: e.target.value }))} /></label>
          {canEdit(permission) && <button type="button" className="benchmark-save-btn" onClick={saveBenchmarks}>Update Benchmarks</button>}
        </div>
      </Card>

      <BulkUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Upload Sales Review"
        uploadFunction={importFile}
        onSuccess={load}
        acceptedFile=".csv,.xlsx,.xls"
      />

      <ConfirmDialog
        open={showDeleteAllDialog}
        title="Delete All Sales Review Data"
        message="Are you sure you want to delete all Sales Review records? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={confirmDeleteAll}
        onCancel={() => setShowDeleteAllDialog(false)}
      />
    </div>
  );
}

export default SalesReview;
