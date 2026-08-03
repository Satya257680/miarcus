import "../../../styles/common/FilterBar.css";

function FilterBar({
  children,
  onClear,
  showClear = true,
}) {
  return (
    <div className="filter-bar">

      <div className="filter-items">

        {children}

      </div>

      {showClear && (

        <button
          type="button"
          className="clear-filter-btn"
          onClick={onClear}
        >
          Clear Filters
        </button>

      )}

    </div>
  );
}

export default FilterBar;