import React from "react";

import {
    FaCommentAlt,
    FaPaperclip,
    FaFileAlt
} from "react-icons/fa";

import ProjectSummary from "./ProjectSummary";

import "../../styles/AddNewStoreOpeningModal.css";


/* ======================================================
   REVIEW STEP
====================================================== */

export default function ReviewStep({

    formData = {},

    progress = 100,

    currentStep = 5,

    handleChange,

    handleFileChange

}) {


    /* ==================================================
       FILE NAME
    ================================================== */

    const getFileName = () => {

        const file =
            formData?.attachment ||
            formData?.attachments ||
            formData?.file ||
            formData?.document;

        if (!file) {
            return "";
        }

        if (file instanceof File) {
            return file.name;
        }

        if (typeof file === "string") {

            const parts =
                file.split("/");

            return (
                parts[parts.length - 1]
            );

        }

        if (typeof file === "object") {

            return (
                file.name ||
                file.file_name ||
                file.filename ||
                file.originalname ||
                ""
            );

        }

        return "";

    };


    const attachmentName =
        getFileName();


    /* ==================================================
       RENDER
    ================================================== */

    return (

        <div className="review-step-container">


            {/* ==================================================
               PROJECT SUMMARY
            ================================================== */}

            <ProjectSummary

                formData={formData}

                progress={progress}

                currentStep={currentStep}

            />


            {/* ==================================================
               REMARKS
            ================================================== */}

            <div className="review-input-card">

                <div className="review-input-header">

                    <div className="review-input-icon">

                        <FaCommentAlt />

                    </div>


                    <div>

                        <h3>
                            Remarks
                        </h3>

                        <p>
                            Add any important notes about this
                            store opening.
                        </p>

                    </div>

                </div>


                <div className="review-input-body">

                    <textarea

                        name="remarks"

                        value={
                            formData?.remarks || ""
                        }

                        onChange={handleChange}

                        placeholder="Enter remarks..."

                        rows={5}

                    />

                </div>

            </div>


            {/* ==================================================
               ATTACHMENT
            ================================================== */}

            <div className="review-input-card">

                <div className="review-input-header">

                    <div className="review-input-icon">

                        <FaPaperclip />

                    </div>


                    <div>

                        <h3>
                            Attachment
                        </h3>

                        <p>
                            Upload any supporting document
                            or file.
                        </p>

                    </div>

                </div>


                <div className="review-input-body">


                    <label
                        className="review-file-upload"
                    >

                        <FaFileAlt />

                        <span>
                            Choose File
                        </span>

                        <input

                            type="file"

                            name="attachment"

                            onChange={
                                handleFileChange
                                    ? handleFileChange
                                    : handleChange
                            }

                            style={{
                                display: "none"
                            }}

                        />

                    </label>


                    {
                        attachmentName && (

                            <div className="selected-file">

                                <FaPaperclip />

                                <span>

                                    {attachmentName}

                                </span>

                            </div>

                        )
                    }


                    {
                        !attachmentName && (

                            <div className="no-file-selected">

                                No file selected

                            </div>

                        )
                    }

                </div>

            </div>


        </div>

    );

}