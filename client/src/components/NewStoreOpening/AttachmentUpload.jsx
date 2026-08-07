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

const getApiBaseUrl = () => {

    const envUrl =
        import.meta?.env?.VITE_API_URL;

    if (
        envUrl &&
        typeof envUrl === "string" &&
        envUrl.trim()
    ) {
        return envUrl
            .trim()
            .replace(/\/+$/, "");
    }

    return "http://localhost:5000";
};


const API_BASE_URL =
    getApiBaseUrl();


/* ======================================================
   NORMALIZE ATTACHMENT URL

   Handles:

   uploads/file.pdf
   /uploads/file.pdf
   undefineduploads/file.pdf
   undefined/uploads/file.pdf
   nulluploads/file.pdf
   /undefineduploads/file.pdf
   full http URL
   blob URL
   data URL
====================================================== */

const normalizeAttachmentUrl = (
    attachmentUrl
) => {

    if (
        attachmentUrl === null ||
        attachmentUrl === undefined
    ) {
        return "";
    }


    let url =
        String(attachmentUrl)
            .trim();


    if (!url) {
        return "";
    }


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
       CLEAN OLD BROKEN PREFIXES

       Examples:

       undefineduploads/file.pdf
       undefined/uploads/file.pdf
       nulluploads/file.pdf
       null/uploads/file.pdf
       /undefineduploads/file.pdf
    ---------------------------------------------- */

    url =
        url.replace(
            /^\/?(undefined|null)(?:\/)?/i,
            ""
        );


    /* ----------------------------------------------
       FULL URL

       Example:

       http://localhost:5000/uploads/file.pdf
    ---------------------------------------------- */

    if (
        /^https?:\/\//i.test(url)
    ) {
        return url;
    }


    /* ----------------------------------------------
       REMOVE BACKSLASHES

       Windows-style paths can sometimes arrive as:

       uploads\file.pdf
    ---------------------------------------------- */

    url =
        url.replace(
            /\\/g,
            "/"
        );


    /* ----------------------------------------------
       REMOVE QUERY / HASH ONLY FOR PATH PROCESSING
    ---------------------------------------------- */

    const queryIndex =
        url.indexOf("?");

    const hashIndex =
        url.indexOf("#");

    let cleanUrl = url;

    if (queryIndex !== -1) {
        cleanUrl =
            cleanUrl.substring(
                0,
                queryIndex
            );
    }

    if (hashIndex !== -1) {
        cleanUrl =
            cleanUrl.substring(
                0,
                cleanUrl.indexOf("#")
            );
    }


    /* ----------------------------------------------
       REMOVE LEADING SLASHES
    ---------------------------------------------- */

    cleanUrl =
        cleanUrl.replace(
            /^\/+/,
            ""
        );


    /* ----------------------------------------------
       REMOVE ANY REMAINING undefined/null PREFIX

       Handles:

       undefineduploads/file.pdf
       nulluploads/file.pdf
    ---------------------------------------------- */

    cleanUrl =
        cleanUrl.replace(
            /^(undefined|null)/i,
            ""
        );


    cleanUrl =
        cleanUrl.replace(
            /^\/+/,
            ""
        );


    /* ----------------------------------------------
       IF "uploads/" EXISTS ANYWHERE,
       KEEP ONLY FROM uploads/

       Example:

       something/uploads/file.pdf

       becomes:

       uploads/file.pdf
    ---------------------------------------------- */

    const uploadsIndex =
        cleanUrl
            .toLowerCase()
            .indexOf("uploads/");


    if (
        uploadsIndex !== -1
    ) {

        cleanUrl =
            cleanUrl.substring(
                uploadsIndex
            );

    }


    /* ----------------------------------------------
       IF PATH DOES NOT CONTAIN uploads/,
       ASSUME FILE IS INSIDE uploads/

       Example:

       1786094872598-263168914.pdf

       becomes:

       uploads/1786094872598-263168914.pdf
    ---------------------------------------------- */

    if (
        !cleanUrl
            .toLowerCase()
            .startsWith("uploads/")
    ) {

        cleanUrl =
            `uploads/${cleanUrl}`;

    }


    /* ----------------------------------------------
       FINAL URL

       http://localhost:5000/uploads/file.pdf
    ---------------------------------------------- */

    return (
        `${API_BASE_URL}/${cleanUrl}`
    );

};


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

            /\.(jpg|jpeg|png|gif|webp)$/i
                .test(name)

        ) {

            return (
                <FaFileImage />
            );

        }


        if (

            type.includes("pdf") ||

            /\.pdf$/i
                .test(name)

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

        if (
            !existingAttachment
        ) {
            return "";
        }


        /* ----------------------------------------------
           STRING
        ---------------------------------------------- */

        if (
            typeof existingAttachment ===
            "string"
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
       EXISTING FILE RAW VALUE
    ====================================================== */

    const getExistingFileRawUrl = () => {

        if (
            !existingAttachment
        ) {
            return "";
        }


        /* ----------------------------------------------
           STRING
        ---------------------------------------------- */

        if (
            typeof existingAttachment ===
            "string"
        ) {

            return existingAttachment;

        }


        /* ----------------------------------------------
           OBJECT

           Support all common backend names
        ---------------------------------------------- */

        return (

            existingAttachment.url ||

            existingAttachment.path ||

            existingAttachment.file_url ||

            existingAttachment.fileUrl ||

            existingAttachment.file_path ||

            existingAttachment.filePath ||

            existingAttachment.location ||

            existingAttachment.attachment ||

            existingAttachment.attachment_url ||

            existingAttachment.attachmentUrl ||

            existingAttachment.upload_path ||

            existingAttachment.uploadPath ||

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
        /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i
            .test(
                existingFileName
            );


    /* ======================================================
       VIEW EXISTING FILE
    ====================================================== */

    const viewExistingFile = (
        event
    ) => {

        event.stopPropagation();


        if (
            !existingFileUrl
        ) {

            alert(
                "Attachment URL is not available."
            );

            return;

        }


        console.log(
            "Opening attachment:",
            existingFileUrl
        );


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

                        event.key ===
                        "Enter" ||

                        event.key ===
                        " "

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
                            onClick={(
                                event
                            ) => {

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
                               VIEW
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
                                            background:
                                                "#dbeafe",
                                            color:
                                                "#2563eb"
                                        }}
                                    >

                                        <FaEye />

                                    </button>

                                )
                            }


                            {/* ==================================
                               REMOVE
                            ================================== */}

                            <button
                                type="button"
                                className="remove-file"
                                title="Remove attachment"
                                aria-label="Remove attachment"
                                onClick={(
                                    event
                                ) => {

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
                file?.type?.includes(
                    "image"
                ) && (

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
                            onError={(
                                event
                            ) => {

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