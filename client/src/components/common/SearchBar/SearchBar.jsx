import React from "react";
import {
    FaSearch,
    FaTimes,
} from "react-icons/fa";

import "../../../styles/common/SearchBar.css";

function SearchBar({

    value = "",

    onChange = () => {},

    placeholder = "Search...",

    disabled = false,

    autoFocus = false,

    className = "",

}) {

    const handleClear = () => {

        onChange("");

    };

    return (

        <div className={`search-bar ${className}`}>

            <FaSearch className="search-icon" />

            <input
                type="text"
                value={value}
                placeholder={placeholder}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                disabled={disabled}
                autoFocus={autoFocus}
                autoComplete="off"
            />

            {value && !disabled && (

                <button
                    type="button"
                    className="clear-btn"
                    onClick={handleClear}
                    title="Clear Search"
                >

                    <FaTimes />

                </button>

            )}

        </div>

    );

}

export default SearchBar;