import React, { useRef } from "react";

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

    onFileChange,

    onRemove

}) {

    const inputRef = useRef(null);

    const browseFile = () => {

        inputRef.current?.click();

    };

    const getIcon = () => {

        if (!file) {

            return <FaPaperclip />;

        }

        if (

            file.type?.includes("image")

        ) {

            return <FaFileImage />;

        }

        return <FaFilePdf />;

    };

    return (

        <div className="nso-card">

            <div className="nso-card-header">

                <div>

                    <FaCloudUploadAlt />

                </div>

                <div>

                    <h2>

                        Attachment

                    </h2>

                    <p>

                        Upload lease agreement, drawings or any supporting documents.

                    </p>

                </div>

            </div>

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

                <FaCloudUploadAlt className="upload-icon"/>

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

            {

                file && (

                    <div className="uploaded-file">

                        <div className="uploaded-left">

                            {getIcon()}

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

                            onClick={onRemove}

                        >

                            <FaTrash />

                        </button>

                    </div>

                )

            }

            {

                preview &&

                file?.type?.includes("image") && (

                    <div className="image-preview">

                        <img

                            src={preview}

                            alt="preview"

                        />

                    </div>

                )

            }

        </div>

    );

}