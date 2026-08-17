import { useEffect, useMemo, useState } from "react";
import axios from "../../axiosConfig";

import {
    FaAward,
    FaChartLine,
    FaCheck,
    FaEye,
    FaSearch,
    FaTrash,
    FaTimes,
    FaUsers,
    FaCheckCircle,
    FaExclamationCircle,
    FaClipboardCheck,
    FaClock,
    FaDownload,
    FaPrint,
} from "react-icons/fa";

import "../../styles/pages/Quiz.css";


function TrainingReport() {

    // ============================================================
    // STATE
    // ============================================================

    const [rows, setRows] =
        useState([]);

    const [quizzes, setQuizzes] =
        useState([]);

    const [quizId, setQuizId] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [result, setResult] =
        useState("");

    const [detail, setDetail] =
        useState(null);

    const [message, setMessage] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [loadingDetail, setLoadingDetail] =
        useState(false);

    const [deletingId, setDeletingId] =
        useState(null);


    // ============================================================
    // LOAD REPORT
    // ============================================================

    const load = async () => {

        setLoading(true);

        try {

            const params =
                new URLSearchParams();

            if (quizId) {
                params.append(
                    "quiz_id",
                    quizId
                );
            }

            if (search.trim()) {
                params.append(
                    "search",
                    search.trim()
                );
            }

            if (result) {
                params.append(
                    "result",
                    result
                );
            }


            const [
                reportResponse,
                quizResponse,
            ] = await Promise.all([

                axios.get(
                    `/api/quiz/reports?${params.toString()}`
                ),

                axios.get(
                    "/api/quiz"
                ),

            ]);


            const reportData =
                reportResponse?.data?.data ||
                [];

            const quizData =
                quizResponse?.data?.data ||
                [];


            setRows(
                Array.isArray(reportData)
                    ? reportData
                    : []
            );

            setQuizzes(
                Array.isArray(quizData)
                    ? quizData
                    : []
            );

        } catch (error) {

            setMessage(
                error?.response?.data
                    ?.message ||
                "Unable to load training report."
            );

        } finally {

            setLoading(false);

        }

    };


    // ============================================================
    // INITIAL LOAD
    // ============================================================

    useEffect(() => {
        load();
    }, [
        quizId,
        result,
    ]);


    // ============================================================
    // CLIENT SIDE SEARCH
    // ============================================================

    const filtered =
        useMemo(() => {

            const keyword =
                search
                    .trim()
                    .toLowerCase();

            if (!keyword) {
                return rows;
            }

            return rows.filter(
                row => {

                    const participant =
                        row?.participant_name ||
                        "";

                    const email =
                        row?.participant_email ||
                        "";

                    const quiz =
                        row?.quiz_name ||
                        "";

                    const participantId =
                        row?.participant_id ||
                        "";

                    return (
                        `${participant} ${email} ${quiz} ${participantId}`
                            .toLowerCase()
                            .includes(keyword)
                    );

                }
            );

        }, [
            rows,
            search,
        ]);


    // ============================================================
    // STATISTICS
    // ============================================================

    const stats =
        useMemo(() => {

            const submitted =
                rows.filter((row) => {
                    const status = String(
                        row?.status ?? ""
                    )
                        .trim()
                        .toLowerCase();

                    return status === "submitted";
                });


            const passed =
                submitted.filter((row) =>
                    String(
                        row?.result ?? ""
                    )
                        .trim()
                        .toLowerCase() ===
                    "passed"
                );


            const failed =
                submitted.filter((row) =>
                    String(
                        row?.result ?? ""
                    )
                        .trim()
                        .toLowerCase() ===
                    "failed"
                );


            const scores =
                submitted.map(
                    row =>
                        Number(
                            row?.percentage ||
                            0
                        )
                );


            const average =
                scores.length
                    ? scores.reduce(
                        (
                            total,
                            score
                        ) =>
                            total +
                            score,
                        0
                    ) /
                    scores.length
                    : 0;


            const passRate =
                submitted.length
                    ? (
                        passed.length /
                        submitted.length
                    ) *
                    100
                    : 0;


            return {

                attempts:
                    submitted.length,

                passed:
                    passed.length,

                failed:
                    failed.length,

                average,

                passRate,

            };

        }, [
            rows,
        ]);


    // ============================================================
    // OPEN SUBMISSION
    // ============================================================

    const open = async id => {

        setLoadingDetail(true);

        try {

            const response =
                await axios.get(
                    `/api/quiz/reports/${id}`
                );

            setDetail(
                response?.data?.data ||
                null
            );

        } catch (error) {

            setMessage(
                error?.response?.data
                    ?.message ||
                "Unable to load submission."
            );

        } finally {

            setLoadingDetail(false);

        }

    };


    // ============================================================
    // DELETE SUBMISSION
    // ============================================================

    const del = async id => {

        const confirmed =
            window.confirm(
                "Delete this training submission permanently?"
            );

        if (!confirmed) {
            return;
        }


        setDeletingId(id);


        try {

            await axios.delete(
                `/api/quiz/reports/${id}`
            );


            setRows(
                previous =>
                    previous.filter(
                        row =>
                            row.id !== id
                    )
            );


            if (
                detail?.id === id
            ) {

                setDetail(null);

            }


            setMessage(
                "Training submission deleted successfully."
            );

        } catch (error) {

            setMessage(
                error?.response?.data
                    ?.message ||
                "Unable to delete submission."
            );

        } finally {

            setDeletingId(null);

        }

    };


    // ============================================================
    // FORMAT DATE
    // ============================================================

    const formatDate = value => {

        if (!value) {
            return "-";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return value;

        }

        return date.toLocaleString();

    };


    // ============================================================
    // FORMAT ANSWER
    // ============================================================

    const parseJsonValue = (value, fallback = null) => {
        if (
            value === null ||
            value === undefined
        ) {
            return fallback;
        }

        if (
            typeof value !== "string"
        ) {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    };


    const formatAnswer = answer => {
        const parsed =
            parseJsonValue(
                answer,
                answer
            );

        if (
            Array.isArray(parsed)
        ) {
            return parsed
                .map(value =>
                    String(value ?? "").trim()
                )
                .filter(Boolean)
                .join(", ") || "No answer";
        }

        if (
            parsed === null ||
            parsed === undefined ||
            String(parsed).trim() === ""
        ) {
            return "No answer";
        }

        return String(parsed);
    };


    const formatCorrectAnswer = answer => {
        const parsed =
            parseJsonValue(
                answer,
                answer
            );

        if (
            Array.isArray(parsed)
        ) {
            return parsed
                .map(value =>
                    String(value ?? "").trim()
                )
                .filter(Boolean)
                .join(", ") || "Not selected";
        }

        if (
            parsed === null ||
            parsed === undefined ||
            String(parsed).trim() === ""
        ) {
            return "Not selected";
        }

        return String(parsed);
    };


    // ============================================================
    // CERTIFICATE
    // ============================================================

    const printCertificate = (
        certificateDetail = detail
    ) => {

        if (
            !certificateDetail ||
            String(
                certificateDetail?.result ?? ""
            )
                .trim()
                .toLowerCase() !==
            "passed"
        ) {

            setMessage(
                "A certificate is available only for passed assessments."
            );

            return;

        }


        const participantName =
            certificateDetail
                ?.participant_name ||
            "Participant";


        const quizName =
            certificateDetail
                ?.quiz_name ||
            "Training Assessment";


        const participantId =
            certificateDetail
                ?.participant_id ||
            "-";


        const score =
            certificateDetail
                ?.score ??
            0;


        const maxScore =
            certificateDetail
                ?.max_score ??
            0;


        const percentage =
            Number(
                certificateDetail
                    ?.percentage ||
                0
            ).toFixed(1);


        const completionDate =
            certificateDetail
                ?.submitted_at
                ? new Date(
                    certificateDetail
                        .submitted_at
                ).toLocaleDateString(
                    undefined,
                    {
                        day:
                            "2-digit",
                        month:
                            "long",
                        year:
                            "numeric",
                    }
                )
                : "-";


        const certificateId =
            `MI-${participantId}-${Date.now()}`;


        const certificateWindow =
            window.open(
                "",
                "_blank",
                "width=1200,height=850"
            );


        if (!certificateWindow) {

            setMessage(
                "Please allow pop-ups to generate the certificate."
            );

            return;

        }


        certificateWindow.document.write(
            `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
Certificate - ${quizName}
</title>

<style>

* {
    box-sizing: border-box;
}

body {

    margin: 0;

    min-height: 100vh;

    background:
        linear-gradient(
            135deg,
            #f4f1ff 0%,
            #ffffff 50%,
            #fff4ef 100%
        );

    font-family:
        Arial,
        Helvetica,
        sans-serif;

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    padding:
        40px;

    color:
        #273047;
}

.certificate {

    width:
        1100px;

    min-height:
        720px;

    position:
        relative;

    background:
        rgba(
            255,
            255,
            255,
            0.98
        );

    border:
        12px solid
        #eee9ff;

    box-shadow:
        0 30px 70px
        rgba(
            45,
            38,
            80,
            0.18
        );

    overflow:
        hidden;

    text-align:
        center;

    padding:
        70px 90px;

}

.certificate::before {

    content: "";

    position:
        absolute;

    top:
        20px;

    left:
        20px;

    right:
        20px;

    bottom:
        20px;

    border:
        2px solid
        #9a88d5;

    pointer-events:
        none;

}

.corner {

    position:
        absolute;

    width:
        120px;

    height:
        120px;

    border:
        4px solid
        #ee744b;

}

.corner.top-left {

    top:
        38px;

    left:
        38px;

    border-right:
        none;

    border-bottom:
        none;

}

.corner.bottom-right {

    right:
        38px;

    bottom:
        38px;

    border-left:
        none;

    border-top:
        none;

}

.logo {

    display:
        inline-flex;

    align-items:
        center;

    justify-content:
        center;

    font-size:
        30px;

    font-weight:
        800;

    color:
        #7766bd;

    margin-bottom:
        25px;

}

.logo span {

    color:
        #ee744b;

}

.eyebrow {

    font-size:
        14px;

    font-weight:
        700;

    letter-spacing:
        6px;

    color:
        #9098a9;

    margin-bottom:
        18px;

}

.title {

    font-size:
        43px;

    line-height:
        1.15;

    color:
        #7160bb;

    font-weight:
        700;

    margin:
        0 auto 30px;

    max-width:
        850px;

}

.awarded {

    font-size:
        17px;

    color:
        #6d7586;

    margin-bottom:
        15px;

}

.name {

    display:
        inline-block;

    font-size:
        46px;

    font-weight:
        800;

    color:
        #283245;

    padding:
        0 45px 14px;

    border-bottom:
        3px solid
        #ee744b;

    margin-bottom:
        20px;

}

.description {

    font-size:
        16px;

    line-height:
        1.6;

    color:
        #667085;

}

.metrics {

    display:
        flex;

    justify-content:
        center;

    gap:
        90px;

    margin:
        42px auto;

}

.metric {

    min-width:
        160px;

}

.metric strong {

    display:
        block;

    font-size:
        30px;

    color:
        #6654ae;

    margin-bottom:
        7px;

}

.metric span {

    display:
        block;

    font-size:
        11px;

    letter-spacing:
        3px;

    color:
        #9299a8;

    font-weight:
        700;

}

.footer {

    position:
        absolute;

    left:
        90px;

    right:
        90px;

    bottom:
        58px;

    display:
        flex;

    justify-content:
        space-between;

    align-items:
        flex-end;

    color:
        #8d95a4;

    font-size:
        11px;

}

.footer strong {

    display:
        block;

    color:
        #626b7d;

    font-size:
        12px;

    margin-top:
        5px;

}

@media print {

    @page {

        size:
            landscape;

        margin:
            0;

    }

    body {

        padding:
            0;

        background:
            white;

    }

    .certificate {

        width:
            100vw;

        height:
            100vh;

        min-height:
            0;

        box-shadow:
            none;

    }

}

</style>

</head>

<body>

<div class="certificate">

    <div class="corner top-left"></div>

    <div class="corner bottom-right"></div>

    <div class="logo">
        mi <span>arcus</span>
    </div>

    <div class="eyebrow">
        CERTIFICATE OF COMPLETION
    </div>

    <div class="title">
        ${quizName}
    </div>

    <div class="awarded">
        This certificate is proudly awarded to
    </div>

    <div class="name">
        ${participantName}
    </div>

    <div class="description">
        For successfully completing the
        Mi Arcus training assessment and
        demonstrating the required level
        of knowledge.
    </div>

    <div class="metrics">

        <div class="metric">

            <strong>
                ${score} / ${maxScore}
            </strong>

            <span>
                SCORE
            </span>

        </div>

        <div class="metric">

            <strong>
                ${percentage}%
            </strong>

            <span>
                PERFORMANCE
            </span>

        </div>

    </div>

    <div class="footer">

        <div>
            Certificate ID
            <strong>
                ${certificateId}
            </strong>
        </div>

        <div>
            Participant ID
            <strong>
                ${participantId}
            </strong>
        </div>

        <div>
            Completed
            <strong>
                ${completionDate}
            </strong>
        </div>

    </div>

</div>

<script>

window.onload = function () {

    setTimeout(
        function () {
            window.print();
        },
        500
    );

};

</script>

</body>

</html>
            `
        );


        certificateWindow.document.close();

    };


    // ============================================================
    // EXPORT REPORT
    // ============================================================

    const exportReport = () => {

        if (!filtered.length) {

            setMessage(
                "There are no records to export."
            );

            return;

        }


        const headers = [

            "Participant",
            "Email",
            "Quiz",
            "Submitted",
            "Score",
            "Max Score",
            "Percentage",
            "Result",
            "Participant ID",

        ];


        const csvRows = [

            headers,

            ...filtered.map(
                row => [

                    row?.participant_name ||
                    "",

                    row?.participant_email ||
                    "",

                    row?.quiz_name ||
                    "",

                    formatDate(
                        row?.submitted_at
                    ),

                    row?.score ??
                    "",

                    row?.max_score ??
                    "",

                    `${Number(
                        row?.percentage ||
                        0
                    ).toFixed(1)}%`,

                    row?.result ||
                    row?.status ||
                    "",

                    row?.participant_id ||
                    "",

                ]
            ),

        ];


        const csv =
            csvRows
                .map(
                    row =>
                        row
                            .map(
                                value =>
                                    `"${String(
                                        value
                                    )
                                        .replace(
                                            /"/g,
                                            '""'
                                        )}"`
                            )
                            .join(",")
                )
                .join("\n");


        const blob =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8;",
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );

        link.href =
            url;

        link.download =
            `training-report-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
            url
        );


        setMessage(
            "Training report exported successfully."
        );

    };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div className="quiz-page">


            {/* ====================================================
                HEADER
            ==================================================== */}

            <div className="quiz-page-header">

                <div>

                    <div className="quiz-eyebrow">
                        ANALYTICS & COMPLIANCE
                    </div>

                    <h1>
                        Training Report
                    </h1>

                    <p>
                        Monitor assessment attempts,
                        performance, results and
                        certificates.
                    </p>

                </div>


                <button
                    type="button"
                    className="quiz-secondary"
                    onClick={
                        exportReport
                    }
                >

                    <FaDownload />

                    Export Report

                </button>

            </div>


            {/* ====================================================
                MESSAGE
            ==================================================== */}

            {message && (

                <div className="quiz-toast">

                    <span>
                        {message}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setMessage("")
                        }
                    >

                        <FaTimes />

                    </button>

                </div>

            )}


            {/* ====================================================
                STATISTICS
            ==================================================== */}

            <div className="report-stats">

                <div className="report-stat-card">

                    <div className="report-stat-icon">
                        <FaClipboardCheck />
                    </div>

                    <span>
                        Total Attempts
                    </span>

                    <strong>
                        {stats.attempts}
                    </strong>

                </div>


                <div className="report-stat-card">

                    <div className="report-stat-icon success">
                        <FaCheckCircle />
                    </div>

                    <span>
                        Passed
                    </span>

                    <strong>
                        {stats.passed}
                    </strong>

                    <small>
                        {stats.passRate.toFixed(
                            1
                        )}% pass rate
                    </small>

                </div>


                <div className="report-stat-card">

                    <div className="report-stat-icon failed">
                        <FaExclamationCircle />
                    </div>

                    <span>
                        Failed
                    </span>

                    <strong>
                        {stats.failed}
                    </strong>

                </div>


                <div className="report-stat-card">

                    <div className="report-stat-icon">
                        <FaChartLine />
                    </div>

                    <span>
                        Average Score
                    </span>

                    <strong>
                        {stats.average.toFixed(
                            1
                        )}%
                    </strong>

                </div>

            </div>


            {/* ====================================================
                REPORT PANEL
            ==================================================== */}

            <section className="quiz-panel report-panel">


                {/* ==================================================
                    FILTERS
                ================================================== */}

                <div className="report-filters">

                    <div className="quiz-search">

                        <FaSearch />

                        <input
                            type="search"
                            placeholder="Search participant, email, quiz or ID..."
                            value={search}
                            onChange={e =>
                                setSearch(
                                    e.target
                                        .value
                                )
                            }
                        />

                        {search && (

                            <button
                                type="button"
                                onClick={() =>
                                    setSearch(
                                        ""
                                    )
                                }
                            >

                                <FaTimes />

                            </button>

                        )}

                    </div>


                    <select
                        value={quizId}
                        onChange={e =>
                            setQuizId(
                                e.target
                                    .value
                            )
                        }
                    >

                        <option value="">
                            All quizzes
                        </option>

                        {quizzes.map(
                            quiz => (

                                <option
                                    key={
                                        quiz.id
                                    }
                                    value={
                                        quiz.id
                                    }
                                >
                                    {
                                        quiz.name
                                    }
                                </option>

                            )
                        )}

                    </select>


                    <select
                        value={result}
                        onChange={e =>
                            setResult(
                                e.target
                                    .value
                            )
                        }
                    >

                        <option value="">
                            All results
                        </option>

                        <option value="Passed">
                            Passed
                        </option>

                        <option value="Failed">
                            Failed
                        </option>

                    </select>

                </div>


                {/* ==================================================
                    REPORT SUMMARY
                ================================================== */}

                <div className="report-result-summary">

                    <span>

                        Showing

                        <strong>
                            {" "}
                            {filtered.length}
                        </strong>

                        {" "}submission
                        {filtered.length ===
                        1
                            ? ""
                            : "s"}

                    </span>

                    {quizId && (

                        <span>
                            Quiz filter active
                        </span>

                    )}

                    {result && (

                        <span>
                            Result:
                            {" "}
                            {result}
                        </span>

                    )}

                </div>


                {/* ==================================================
                    TABLE
                ================================================== */}

                <div className="report-table-wrap">

                    {loading ? (

                        <div className="table-empty">

                            Loading training
                            submissions...

                        </div>

                    ) : (

                        <table className="quiz-table">

                            <thead>

                                <tr>

                                    <th>
                                        Participant
                                    </th>

                                    <th>
                                        Quiz
                                    </th>

                                    <th>
                                        Submitted
                                    </th>

                                    <th>
                                        Score
                                    </th>

                                    <th>
                                        Result
                                    </th>

                                    <th>
                                        Actions
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {filtered.map(
                                    row => (

                                        <tr
                                            key={
                                                row.id
                                            }
                                        >

                                            {/* PARTICIPANT */}

                                            <td>

                                                <div className="report-participant">

                                                    <strong>
                                                        {
                                                            row.participant_name ||
                                                            "Unknown Participant"
                                                        }
                                                    </strong>

                                                    <small>
                                                        {
                                                            row.participant_email ||
                                                            "No email"
                                                        }
                                                    </small>

                                                </div>

                                            </td>


                                            {/* QUIZ */}

                                            <td>

                                                <div className="report-quiz-name">

                                                    {
                                                        row.quiz_name ||
                                                        "Unknown Quiz"
                                                    }

                                                </div>

                                            </td>


                                            {/* DATE */}

                                            <td>

                                                <div className="report-date">

                                                    {row.submitted_at ? (
                                                        <>
                                                            <strong>
                                                                {new Date(
                                                                    row.submitted_at
                                                                ).toLocaleDateString()}
                                                            </strong>

                                                            <small>
                                                                {new Date(
                                                                    row.submitted_at
                                                                ).toLocaleTimeString()}
                                                            </small>
                                                        </>
                                                    ) : (

                                                        <span className="in-progress">
                                                            <FaClock />
                                                            In progress
                                                        </span>

                                                    )}

                                                </div>

                                            </td>


                                            {/* SCORE */}

                                            <td>

                                                <div className="report-score">

                                                    <strong>
                                                        {
                                                            row.score ??
                                                            0
                                                        }{" "}
                                                        /{" "}
                                                        {
                                                            row.max_score ??
                                                            0
                                                        }
                                                    </strong>

                                                    <small>
                                                        {Number(
                                                            row.percentage ||
                                                            0
                                                        ).toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </small>

                                                </div>

                                            </td>


                                            {/* RESULT */}

                                            <td>

                                                <span
                                                    className={`result-badge ${
                                                        String(
                                                            row.result ||
                                                            row.status ||
                                                            ""
                                                        ).toLowerCase()
                                                    }`}
                                                >

                                                    {
                                                        row.result ||
                                                        row.status ||
                                                        "Unknown"
                                                    }

                                                </span>

                                            </td>


                                            {/* ACTIONS */}

                                            <td>

                                                <div className="quiz-row-actions">

                                                    <button
                                                        type="button"
                                                        title="View submission"
                                                        onClick={() =>
                                                            open(
                                                                row.id
                                                            )
                                                        }
                                                    >

                                                        <FaEye />

                                                    </button>


                                                    {row.result ===
                                                        "Passed" && (

                                                        <button
                                                            type="button"
                                                            title="Certificate"
                                                            onClick={
                                                                async () => {

                                                                    await open(
                                                                        row.id
                                                                    );

                                                                }
                                                            }
                                                        >

                                                            <FaAward />

                                                        </button>

                                                    )}


                                                    <button
                                                        type="button"
                                                        className="danger"
                                                        title="Delete submission"
                                                        disabled={
                                                            deletingId ===
                                                            row.id
                                                        }
                                                        onClick={() =>
                                                            del(
                                                                row.id
                                                            )
                                                        }
                                                    >

                                                        <FaTrash />

                                                    </button>

                                                </div>

                                            </td>

                                        </tr>

                                    )
                                )}


                                {!filtered.length && (

                                    <tr>

                                        <td
                                            colSpan="6"
                                            className="table-empty"
                                        >

                                            <FaClipboardCheck />

                                            <strong>
                                                No submissions found
                                            </strong>

                                            <span>
                                                Try changing
                                                your filters
                                                or search.
                                            </span>

                                        </td>

                                    </tr>

                                )}

                            </tbody>

                        </table>

                    )}

                </div>

            </section>


            {/* ====================================================
                DETAIL MODAL
            ==================================================== */}

            {detail && (

                <div
                    className="quiz-modal-backdrop"
                    onMouseDown={event => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {

                            setDetail(
                                null
                            );

                        }

                    }}
                >

                    <div className="quiz-modal report-modal">


                        {/* ==========================================
                            MODAL HEADER
                        ========================================== */}

                        <div className="quiz-modal-head">

                            <div>

                                <span>
                                    SUBMISSION DETAIL
                                </span>

                                <h2>
                                    {
                                        detail.participant_name
                                    }
                                </h2>

                                <small>
                                    {
                                        detail.quiz_name
                                    }
                                </small>

                            </div>


                            <button
                                type="button"
                                onClick={() =>
                                    setDetail(
                                        null
                                    )
                                }
                            >

                                <FaTimes />

                            </button>

                        </div>


                        {/* ==========================================
                            HERO
                        ========================================== */}

                        <div className="detail-hero">


                            <div className="detail-score-main">

                                <strong>
                                    {Number(
                                        detail.percentage ||
                                        0
                                    ).toFixed(
                                        1
                                    )}%
                                </strong>

                                <span
                                    className={`result-badge ${
                                        String(
                                            detail?.result ||
                                            ""
                                        )
                                            .trim()
                                            .toLowerCase()
                                    }`}
                                >
                                    {
                                        detail.result
                                    }
                                </span>

                            </div>


                            <div>

                                <small>
                                    Score
                                </small>

                                <b>
                                    {
                                        detail.score
                                    }{" "}
                                    /{" "}
                                    {
                                        detail.max_score
                                    }
                                </b>

                            </div>


                            <div>

                                <small>
                                    Participant ID
                                </small>

                                <b>
                                    {
                                        detail.participant_id
                                    }
                                </b>

                            </div>


                            <div>

                                <small>
                                    Submitted
                                </small>

                                <b>
                                    {
                                        formatDate(
                                            detail.submitted_at
                                        )
                                    }
                                </b>

                            </div>

                        </div>


                        {/* ==========================================
                            ANSWERS
                        ========================================== */}

                        <div className="answer-review">

                            <div className="answer-review-header">

                                <div>

                                    <h3>
                                        Answer Review
                                    </h3>

                                    <span>
                                        {
                                            detail.answers
                                                ?.length ||
                                            0
                                        }{" "}
                                        questions reviewed
                                    </span>

                                </div>

                            </div>


                            {detail.answers?.map(
                                (
                                    answer,
                                    index
                                ) => (

                                    <div
                                        key={
                                            answer.id ||
                                            index
                                        }
                                        className="answer-review-row"
                                    >

                                        <div>

                                            <span>
                                                Q
                                                {String(
                                                    index +
                                                    1
                                                ).padStart(
                                                    2,
                                                    "0"
                                                )}
                                            </span>

                                            <strong>
                                                {
                                                    answer.question_text
                                                }
                                            </strong>

                                        </div>


                                        <div
                                            className={
                                                answer.is_correct
                                                    ? "correct"
                                                    : "incorrect"
                                            }
                                        >

                                            {answer.is_correct ? (
                                                <FaCheck />
                                            ) : (
                                                <FaTimes />
                                            )}

                                            <span>
                                                {
                                                    formatAnswer(
                                                        answer.answer
                                                    )
                                                }
                                            </span>

                                        </div>

                                        {!answer.is_correct &&
                                            (
                                                answer.correct_answer !==
                                                    undefined ||
                                                answer.correct_answer_json !==
                                                    undefined
                                            ) && (

                                                <div
                                                    className="answer-review-correct"
                                                    style={{
                                                        marginTop: "6px",
                                                        fontSize: "12px",
                                                        color: "#15803d",
                                                    }}
                                                >
                                                    <strong>
                                                        Correct answer:
                                                    </strong>{" "}
                                                    {formatCorrectAnswer(
                                                        answer.correct_answer ??
                                                        answer.correct_answer_json
                                                    )}
                                                </div>

                                            )}

                                    </div>

                                )
                            )}


                            {!detail.answers?.length && (

                                <div className="quiz-empty">

                                    No answer details
                                    available.

                                </div>

                            )}

                        </div>


                        {/* ==========================================
                            FOOTER
                        ========================================== */}

                        <div className="quiz-modal-footer">

                            <button
                                type="button"
                                className="quiz-secondary"
                                onClick={() =>
                                    setDetail(
                                        null
                                    )
                                }
                            >

                                Close

                            </button>


                            {String(
                                detail?.result ?? ""
                            )
                                .trim()
                                .toLowerCase() ===
                            "passed" && (

                                <button
                                    type="button"
                                    className="quiz-primary"
                                    onClick={() =>
                                        printCertificate(
                                            detail
                                        )
                                    }
                                >

                                    <FaAward />

                                    Certificate

                                </button>

                            )}

                        </div>

                    </div>

                </div>

            )}


            {/* ====================================================
                DETAIL LOADING
            ==================================================== */}

            {loadingDetail && (

                <div className="quiz-loading-overlay">

                    <div>

                        Loading submission...

                    </div>

                </div>

            )}

        </div>

    );

}


export default TrainingReport;