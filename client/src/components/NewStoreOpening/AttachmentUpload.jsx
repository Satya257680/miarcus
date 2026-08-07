import React, {
    useRef
} from "react";

import {
    FaCloudUploadAlt,
    FaFilePdf,
    FaFileImage,
    FaTrash,
    FaPaperclip,
    FaEye
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";


/* ======================================================
   API BASE URL
====================================================== */

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";


export default function AttachmentUpload({

    file,
    preview,
    existingAttachment,
    onFileChange,
    onRemove

}) {

    const inputRef =
        useRef(null);


    /* ======================================================
       BROWSE
    ====================================================== */

    const browseFile = () => {

        inputRef.current?.click();

    };


    /* ======================================================
       NORMALIZE ATTACHMENT URL
    ====================================================== */

    const normalizeAttachmentUrl = (
        attachmentUrl
    ) => {

        if (!attachmentUrl) {
            return "";
        }


        let url =
            String(attachmentUrl).trim();


        if (!url) {
            return "";
        }


        /* ----------------------------------------------
           REMOVE OLD BROKEN PREFIX
           Example:
           undefineduploads/file.pdf
        ---------------------------------------------- */

        url =
            url.replace(
                /^undefined\/?/i,
                ""
            );


        url =
            url.replace(
                /^null\/?/i,
                ""
            );


        /* ----------------------------------------------
           BLOB URL
        ---------------------------------------------- */

        if (
            url.startsWith("blob:")
        ) {

            return url;

        }


        /* ----------------------------------------------
           DATA URL
        ---------------------------------------------- */

        if (
            url.startsWith("data:")
        ) {

            return url;

        }


        /* ----------------------------------------------
           ALREADY FULL URL
        ---------------------------------------------- */

        if (
            /^https?:\/\//i.test(url)
        ) {

            return url;

        }


        /* ----------------------------------------------
           REMOVE DUPLICATE SLASHES
        ---------------------------------------------- */

        url =
            url.replace(
                /^\/+/,
                ""
            );


        /* ----------------------------------------------
           ENSURE UPLOADS PATH
        ---------------------------------------------- */

        if (
            !url.startsWith("uploads/")
        ) {

            if (
                url.includes("uploads/")
            ) {

                url =
                    url.substring(
                        url.indexOf("uploads/")
                    );

            }

        }


        /* ----------------------------------------------
           FINAL URL
        ---------------------------------------------- */

        return `${API_BASE_URL}/${url}`;

    };


    /* ======================================================
       FILE ICON
    ====================================================== */

    const getIcon = (
        fileObject = null,
        fileName = ""
    ) => {

        const type =
            fileObject?.type || "";


        const name =
            fileObject?.name ||
            fileName ||
            "";


        if (
            type.includes("image") ||
            /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
        ) {

            return (
                <FaFileImage />
            );

        }


        if (
            type.includes("pdf") ||
            /\.pdf$/i.test(name)
        ) {

            return (
                <FaFilePdf />
            );

        }


        return (
            <FaPaperclip />
        );

    };


    /* ======================================================
       EXISTING FILE NAME
    ====================================================== */

    const getExistingFileName = () => {

        if (!existingAttachment) {
            return "";
        }


        /* ----------------------------------------------
           STRING
        ---------------------------------------------- */

        if (
            typeof existingAttachment === "string"
        ) {

            const cleanPath =
                existingAttachment
                    .split("?")[0]
                    .split("#")[0];


            return (
                cleanPath
                    .split("/")
                    .pop() ||
                "Existing Attachment"
            );

        }


        /* ----------------------------------------------
           OBJECT
        ---------------------------------------------- */

        return (
            existingAttachment.name ||
            existingAttachment.filename ||
            existingAttachment.originalname ||
            existingAttachment.file_name ||
            existingAttachment.fileName ||
            "Existing Attachment"
        );

    };


    /* ======================================================
       EXISTING FILE RAW URL
    ====================================================== */

    const getExistingFileRawUrl = () => {

        if (!existingAttachment) {
            return "";
        }


        /* ----------------------------------------------
           STRING
        ---------------------------------------------- */

        if (
            typeof existingAttachment === "string"
        ) {

            return existingAttachment;

        }


        /* ----------------------------------------------
           OBJECT
        ---------------------------------------------- */

        return (
            existingAttachment.url ||
            existingAttachment.path ||
            existingAttachment.file_url ||
            existingAttachment.fileUrl ||
            existingAttachment.file_path ||
            existingAttachment.filePath ||
            existingAttachment.location ||
            ""
        );

    };


    /* ======================================================
       EXISTING FILE VALUES
    ====================================================== */

    const existingFileName =
        getExistingFileName();


    const existingFileRawUrl =
        getExistingFileRawUrl();


    const existingFileUrl =
        normalizeAttachmentUrl(
            existingFileRawUrl
        );


    /* ======================================================
       EXISTING IMAGE CHECK
    ====================================================== */

    const existingIsImage =
        /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(
            existingFileName
        );


    /* ======================================================
       EXISTING FILE VIEW
    ====================================================== */

    const viewExistingFile = (
        event
    ) => {

        event.stopPropagation();


        if (!existingFileUrl) {
            return;
        }


        window.open(
            existingFileUrl,
            "_blank",
            "noopener,noreferrer"
        );

    };


    /* ======================================================
       RENDER
    ====================================================== */

    return (

        <div className="nso-card">


            {/* ==================================================
               HEADER
            ================================================== */}

            <div className="nso-card-header">

                <div>

                    <FaCloudUploadAlt />

                </div>


                <div>

                    <h2>
                        Attachment
                    </h2>


                    <p>
                        Upload lease agreement, drawings or any
                        supporting documents.
                    </p>

                </div>

            </div>


            {/* ==================================================
               UPLOAD ZONE
            ================================================== */}

            <div
                className="upload-zone"
                onClick={browseFile}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        browseFile();

                    }

                }}
            >

                <input
                    ref={inputRef}
                    type="file"
                    hidden
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={onFileChange}
                />


                <FaCloudUploadAlt
                    className="upload-icon"
                />


                <h3>
                    Drag &amp; Drop File
                </h3>


                <p>
                    or click to browse
                </p>


                <span>
                    PDF, JPG, PNG
                </span>

            </div>


            {/* ==================================================
               NEW FILE
            ================================================== */}

            {
                file && (

                    <div className="uploaded-file">

                        <div className="uploaded-left">

                            {
                                getIcon(
                                    file,
                                    file.name
                                )
                            }


                            <div>

                                <strong>
                                    {file.name}
                                </strong>


                                <span>

                                    {
                                        file.size
                                            ? (
                                                file.size /
                                                1024 /
                                                1024
                                            ).toFixed(2)
                                            : "0.00"
                                    }

                                    {" "}MB

                                </span>

                            </div>

                        </div>


                        <button
                            type="button"
                            className="remove-file"
                            title="Remove attachment"
                            aria-label="Remove attachment"
                            onClick={(event) => {

                                event.stopPropagation();

                                onRemove?.();

                            }}
                        >

                            <FaTrash />

                        </button>

                    </div>

                )
            }


            {/* ==================================================
               EXISTING FILE
            ================================================== */}

            {
                !file &&
                existingAttachment && (

                    <div className="uploaded-file">

                        <div className="uploaded-left">

                            {
                                getIcon(
                                    null,
                                    existingFileName
                                )
                            }


                            <div>

                                <strong>
                                    {existingFileName}
                                </strong>


                                <span>
                                    Existing attachment
                                </span>

                            </div>

                        </div>


                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px"
                            }}
                        >

                            {/* ==================================
                               VIEW EXISTING FILE
                            ================================== */}

                            {
                                existingFileUrl && (

                                    <button
                                        type="button"
                                        className="remove-file"
                                        title="View attachment"
                                        aria-label="View attachment"
                                        onClick={
                                            viewExistingFile
                                        }
                                        style={{
                                            background: "#dbeafe",
                                            color: "#2563eb"
                                        }}
                                    >

                                        <FaEye />

                                    </button>

                                )
                            }


                            {/* ==================================
                               REMOVE EXISTING FILE
                            ================================== */}

                            <button
                                type="button"
                                className="remove-file"
                                title="Remove attachment"
                                aria-label="Remove attachment"
                                onClick={(event) => {

                                    event.stopPropagation();

                                    onRemove?.();

                                }}
                            >

                                <FaTrash />

                            </button>

                        </div>

                    </div>

                )
            }


            {/* ==================================================
               NEW IMAGE PREVIEW
            ================================================== */}

            {
                preview &&
                file?.type?.includes("image") && (

                    <div className="image-preview">

                        <img
                            src={preview}
                            alt="Attachment preview"
                        />

                    </div>

                )
            }


            {/* ==================================================
               EXISTING IMAGE PREVIEW
            ================================================== */}

            {
                !file &&
                existingAttachment &&
                existingIsImage &&
                existingFileUrl && (

                    <div className="image-preview">

                        <img
                            src={existingFileUrl}
                            alt="Existing attachment"
                            onError={(event) => {

                                event.currentTarget.style.display =
                                    "none";

                            }}
                        />

                    </div>

                )
            }


            {/* ==================================================
               EMPTY
            ================================================== */}

            {
                !file &&
                !existingAttachment && (

                    <div
                        className="attachment-empty"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            marginTop: "20px",
                            color: "#64748b",
                            fontSize: "14px"
                        }}
                    >

                        <FaPaperclip />

                        <span>
                            No attachment selected
                        </span>

                    </div>

                )
            }

        </div>

    );

}