import React, {
    useRef
} from "react";

import {
    FaCloudUploadAlt,
    FaFilePdf,
    FaFileImage,
    FaTrash,
    FaPaperclip
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";


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
            /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
        ) {

            return <FaFileImage />;

        }


        if (
            type.includes("pdf") ||
            /\.pdf$/i.test(name)
        ) {

            return <FaFilePdf />;

        }


        return <FaPaperclip />;

    };


    /* ======================================================
       EXISTING FILE NAME
    ====================================================== */

    const getExistingFileName = () => {

        if (!existingAttachment) {
            return "";
        }


        if (
            typeof existingAttachment === "string"
        ) {

            return existingAttachment
                .split("/")
                .pop();

        }


        return (
            existingAttachment.name ||
            existingAttachment.filename ||
            existingAttachment.originalname ||
            "Existing Attachment"
        );

    };


    /* ======================================================
       EXISTING FILE URL
    ====================================================== */

    const getExistingFileUrl = () => {

        if (!existingAttachment) {
            return "";
        }


        if (
            typeof existingAttachment === "string"
        ) {

            return existingAttachment;

        }


        return (
            existingAttachment.url ||
            existingAttachment.path ||
            existingAttachment.file_url ||
            ""
        );

    };


    const existingFileName =
        getExistingFileName();


    const existingFileUrl =
        getExistingFileUrl();


    const existingIsImage =
        /\.(jpg|jpeg|png|gif|webp)$/i.test(
            existingFileName
        );


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
                    Drag & Drop File
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
                                        (
                                            file.size /
                                            1024 /
                                            1024
                                        ).toFixed(2)
                                    }

                                    {" "}MB

                                </span>

                            </div>

                        </div>


                        <button
                            type="button"
                            className="remove-file"
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


                        <button
                            type="button"
                            className="remove-file"
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

                    <div className="attachment-empty">

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