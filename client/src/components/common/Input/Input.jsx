import React from "react";

import "../../../styles/common/Input.css";

function Input({

    label = "",

    name = "",

    type = "text",

    value = "",

    onChange = () => {},

    placeholder = "",

    required = false,

    disabled = false,

    readOnly = false,

    error = "",

    helperText = "",

    leftIcon = null,

    rightIcon = null,

    maxLength,

    autoComplete = "off",

    className = "",

}) {

    return (

        <div className={`input-group ${className}`}>

            {label && (

                <label
                    htmlFor={name}
                    className="input-label"
                >

                    {label}

                    {required && (

                        <span className="required">

                            *

                        </span>

                    )}

                </label>

            )}

            <div
                className={`input-wrapper ${
                    error ? "input-error" : ""
                }`}
            >

                {leftIcon && (

                    <span className="input-icon left">

                        {leftIcon}

                    </span>

                )}

                <input
                    id={name}
                    name={name}
                    type={type}
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    readOnly={readOnly}
                    maxLength={maxLength}
                    autoComplete={autoComplete}
                />

                {rightIcon && (

                    <span className="input-icon right">

                        {rightIcon}

                    </span>

                )}

            </div>

            {error ? (

                <span className="input-message error">

                    {error}

                </span>

            ) : helperText ? (

                <span className="input-message">

                    {helperText}

                </span>

            ) : null}

        </div>

    );

}

export default Input;