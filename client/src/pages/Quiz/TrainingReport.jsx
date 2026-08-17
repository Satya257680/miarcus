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
    FaCamera,
    FaMapMarkerAlt,
    FaCalendarAlt,
    FaShieldAlt,
} from "react-icons/fa";

import "../../styles/pages/Quiz.css";

const mediaUrl = (value) => {
    if (!value) return "";

    if (/^https?:\/\//i.test(String(value))) {
        return String(value);
    }

    const api = (
        import.meta.env.VITE_API_URL ||
        "http://localhost:5000"
    ).replace(/\/+$/, "");

    return `${api}/${String(value).replace(/^\/+/, "")}`;
};

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");


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


        const rawQuizName =
            String(
                certificateDetail?.quiz_name ||
                "Training Assessment"
            ).trim();

        const quizName = /^mi\s+arcus\b/i.test(rawQuizName)
            ? rawQuizName
            : `Mi Arcus ${rawQuizName}`;

        const participantPhoto =
            certificateDetail?.photo_path
                ? mediaUrl(certificateDetail.photo_path)
                : "";

        const verificationLocation =
            certificateDetail?.latitude != null &&
            certificateDetail?.longitude != null
                ? `${Number(certificateDetail.latitude).toFixed(6)}, ${Number(certificateDetail.longitude).toFixed(6)}`
                : "Not captured";

        const verificationAccuracy =
            certificateDetail?.location_accuracy != null
                ? `±${Math.round(Number(certificateDetail.location_accuracy))} m`
                : "-";

        const verificationTime =
            certificateDetail?.started_at ||
            certificateDetail?.created_at ||
            certificateDetail?.submitted_at ||
            null;


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
            `MI-${participantId}-${String(
                certificateDetail?.id || "0000"
            ).padStart(4, "0")}`;


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
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Certificate - ${escapeHtml(quizName)}</title>
<style>
*{box-sizing:border-box}
@page{size:landscape;margin:0}
body{margin:0;min-height:100vh;background:#f1eff8;font-family:Arial,Helvetica,sans-serif;color:#273047;display:flex;align-items:center;justify-content:center;padding:24px}
.certificate{position:relative;width:1200px;min-height:780px;overflow:hidden;background:#fff;border:10px solid #eee9ff;border-radius:28px;box-shadow:0 25px 60px rgba(42,35,77,.18);padding:62px 88px 58px;text-align:center}
.certificate:before{content:"";position:absolute;inset:18px;border:2px solid #8f7bca;pointer-events:none;z-index:2}
.corner{position:absolute;width:125px;height:125px;border:5px solid #ff6d22;z-index:3}.top-left{top:18px;left:18px;border-right:0;border-bottom:0;border-radius:20px 0 0 0}.bottom-right{right:18px;bottom:18px;border-left:0;border-top:0;border-radius:0 0 20px 0}
.wave{position:absolute;bottom:-100px;width:360px;height:470px;border-radius:48% 52% 0 0;background:linear-gradient(145deg,#2f216f,#5942a2);z-index:0;opacity:.98}.wave.left{left:-150px;transform:rotate(10deg)}.wave.right{right:-150px;transform:rotate(-10deg)}.wave:after{content:"";position:absolute;inset:30px;border-radius:48% 52% 0 0;border:34px solid #ff9d00;border-bottom:0;opacity:.95}.wave:before{content:"";position:absolute;inset:65px;border-radius:48% 52% 0 0;background:rgba(130,107,207,.35)}
.content{position:relative;z-index:4;max-width:1010px;margin:0 auto}.logo{height:78px;display:flex;justify-content:center;align-items:center;margin-bottom:10px}.logo img{max-height:78px;max-width:150px;object-fit:contain}.eyebrow{font-size:13px;font-weight:800;letter-spacing:5px;color:#8b8fa0;margin:8px 0 12px}.title{font-size:43px;line-height:1.1;color:#634fb0;font-weight:800;margin:0 auto 16px;max-width:900px}.gold-line{height:3px;width:480px;max-width:70%;margin:0 auto 20px;background:linear-gradient(90deg,transparent,#d9a529,transparent)}.awarded{font-size:15px;color:#687083;margin-bottom:8px}.name{display:inline-block;font-size:43px;font-weight:800;color:#202b42;padding:0 36px 10px;border-bottom:3px solid #ff6d22;margin-bottom:10px}.description{font-size:13px;line-height:1.45;color:#667085;max-width:640px;margin:0 auto}.verification{margin:14px auto 18px;display:flex;justify-content:center;align-items:center;gap:14px}.photo-frame{width:84px;height:84px;border-radius:14px;overflow:hidden;border:3px solid #e4ddf7;background:#f7f5fc;box-shadow:0 8px 18px rgba(75,60,130,.12)}.photo-frame img{width:100%;height:100%;object-fit:cover}.photo-placeholder{height:100%;display:grid;place-items:center;color:#7562ba;font-size:25px}.verification-copy{text-align:left;font-size:10px;color:#737b8b;line-height:1.5}.verification-copy strong{display:block;color:#4f466f;font-size:11px;margin-bottom:3px}.metrics{display:flex;justify-content:center;gap:0;margin:18px auto 16px;max-width:620px;border-radius:42px;background:#fff;box-shadow:0 10px 25px rgba(51,43,87,.13);padding:12px}.metric{min-width:210px;padding:0 30px}.metric+.metric{border-left:1px solid #e2dfeb}.metric strong{display:block;font-size:25px;color:#5e4aac;margin-bottom:4px}.metric span{display:block;font-size:9px;letter-spacing:2px;color:#9299a8;font-weight:800}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:900px;margin:10px auto 0}.meta-item{font-size:9px;color:#8b93a3}.meta-item svg{color:#6855b1;margin-right:5px}.meta-item strong{display:block;color:#4b5261;font-size:10px;margin-top:4px}.signatures{display:grid;grid-template-columns:1fr 130px 1fr;align-items:end;gap:22px;max-width:700px;margin:18px auto 0}.signature{border-top:2px solid #d8b25a;padding-top:6px;font-size:9px;color:#6f7581}.seal{width:95px;height:95px;margin:auto;border-radius:50%;border:5px solid #d7a72c;background:radial-gradient(circle,#f8df8a,#c58a16);display:grid;place-items:center;color:#fff;font-size:25px;box-shadow:0 7px 18px rgba(156,110,14,.25)}.seal small{display:block;font-size:7px;letter-spacing:1px}.footer-note{position:absolute;bottom:20px;left:0;right:0;font-size:8px;color:#a0a5b0;z-index:4}
@media print{body{padding:0;background:#fff}.certificate{width:100vw;height:100vh;min-height:0;border-radius:0;box-shadow:none;border-width:8px}.footer-note{bottom:14px}}
</style>
</head>
<body>
<div class="certificate">
<div class="corner top-left"></div><div class="corner bottom-right"></div>
<div class="wave left"></div><div class="wave right"></div>
<div class="content">
<div class="logo">
    <img src="${escapeHtml(mediaUrl('/images/Miarcus.png'))}" alt="Mi Arcus" onerror="this.style.display='none'">
</div>
<div class="eyebrow">CERTIFICATE OF COMPLETION</div>
<div class="title">${escapeHtml(quizName)}</div>
<div class="gold-line"></div>
<div class="awarded">This certificate is proudly awarded to</div>
<div class="name">${escapeHtml(participantName)}</div>
<div class="description">For successfully completing the Mi Arcus training assessment and demonstrating the required level of knowledge.</div>
<div class="verification">
    <div class="photo-frame">
        ${participantPhoto ? `<img src="${escapeHtml(participantPhoto)}" alt="Participant verification photo">` : `<div class="photo-placeholder">${FaCamera ? '' : ''}</div>`}
    </div>
    <div class="verification-copy">
        <strong>Participant verification</strong>
        Photo captured before assessment<br>
        Location: ${escapeHtml(verificationLocation)}<br>
        Accuracy: ${escapeHtml(verificationAccuracy)}<br>
        Verified at: ${escapeHtml(verificationTime ? new Date(verificationTime).toLocaleString() : '-')}
    </div>
</div>
<div class="metrics">
    <div class="metric"><strong>${escapeHtml(score)} / ${escapeHtml(maxScore)}</strong><span>SCORE</span></div>
    <div class="metric"><strong>${escapeHtml(percentage)}%</strong><span>PERFORMANCE</span></div>
</div>
<div class="meta">
    <div class="meta-item">CERTIFICATE ID<strong>${escapeHtml(certificateId)}</strong></div>
    <div class="meta-item">PARTICIPANT ID<strong>${escapeHtml(participantId)}</strong></div>
    <div class="meta-item">COMPLETED ON<strong>${escapeHtml(completionDate)}</strong></div>
</div>
<div class="signatures">
    <div class="signature">Training Manager</div>
    <div class="seal">★<small>MI ARCUS</small></div>
    <div class="signature">Authorized Signatory</div>
</div>
</div>
<div class="footer-note">This is a digitally generated certificate from Mi Arcus Portal.</div>
</div>
<script>
window.onload=function(){
    var images=Array.prototype.slice.call(document.images||[]);
    var pending=images.filter(function(img){return !img.complete;});
    var printNow=function(){setTimeout(function(){window.print();},500);};
    if(!pending.length){printNow();return;}
    var remaining=pending.length;
    pending.forEach(function(img){
        var done=function(){
            remaining-=1;
            if(remaining<=0) printNow();
        };
        img.addEventListener('load',done,{once:true});
        img.addEventListener('error',done,{once:true});
    });
    setTimeout(printNow,3000);
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
                            VERIFICATION EVIDENCE
                        ========================================== */}

                        <div className="submission-verification">
                            <div className="submission-verification-photo">
                                {detail.photo_path ? (
                                    <img
                                        src={mediaUrl(detail.photo_path)}
                                        alt="Participant verification"
                                    />
                                ) : (
                                    <FaCamera />
                                )}
                            </div>

                            <div className="submission-verification-info">
                                <h3>Verification evidence</h3>
                                <div className="verification-info-grid">
                                    <div><FaMapMarkerAlt /><span>Location</span><strong>{detail.latitude != null && detail.longitude != null ? `${Number(detail.latitude).toFixed(6)}, ${Number(detail.longitude).toFixed(6)}` : "Not captured"}</strong></div>
                                    <div><FaShieldAlt /><span>Accuracy</span><strong>{detail.location_accuracy != null ? `±${Math.round(Number(detail.location_accuracy))} m` : "-"}</strong></div>
                                    <div><FaCalendarAlt /><span>Captured / started</span><strong>{formatDate(detail.started_at)}</strong></div>
                                </div>
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