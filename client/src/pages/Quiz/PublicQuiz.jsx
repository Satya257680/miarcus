import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../../axiosConfig";
import {
    FaceDetector,
    FilesetResolver,
} from "@mediapipe/tasks-vision";

import {
    FaCamera,
    FaCheckCircle,
    FaClock,
    FaLocationArrow,
    FaMapMarkerAlt,
    FaShieldAlt,
    FaArrowLeft,
    FaArrowRight,
    FaLock,
    FaEnvelope,
} from "react-icons/fa";

import "../../styles/pages/Quiz.css";

const QUIZ_API_URL = (
    import.meta.env.VITE_QUIZ_API_URL?.trim() ||
    import.meta.env.VITE_API_URL?.trim() ||
    "http://localhost:5000"
).replace(/\/+$/, "");

const mediaUrl = (value) => {
    if (!value) return "";

    const raw = String(value).trim();

    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    return `${QUIZ_API_URL}/${raw.replace(/^\/+/, "")}`;
};


// ============================================================
// ANSWER NORMALIZATION
// ============================================================
//
// The public quiz submits the participant's selected option text,
// not an option letter/index. This matches Quiz Setup scoring where
// correct_answer is stored as the actual option value.
//
// ============================================================

const normalizeAnswerValue = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => String(item ?? "").trim())
            .filter(Boolean);
    }

    return String(value).trim();
};

const answerIsPresent = (value) => {
    if (Array.isArray(value)) {
        return value.length > 0;
    }

    return (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    );
};

const getStoredAnswer = (answersObject, questionId) => {
    if (!answersObject || questionId === undefined || questionId === null) {
        return undefined;
    }

    const numericId = Number(questionId);
    const stringId = String(questionId);

    if (
        Number.isFinite(numericId) &&
        Object.prototype.hasOwnProperty.call(
            answersObject,
            numericId
        )
    ) {
        return answersObject[numericId];
    }

    if (
        Object.prototype.hasOwnProperty.call(
            answersObject,
            stringId
        )
    ) {
        return answersObject[stringId];
    }

    return undefined;
};

function PublicQuiz() {
    const { token } = useParams();

    // ============================================================
    // QUIZ STATE
    // ============================================================

    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [step, setStep] = useState("verify");

    // ============================================================
    // PARTICIPANT STATE
    // ============================================================

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    const [emailConsent, setEmailConsent] = useState(false);
    const [cameraConsent, setCameraConsent] = useState(false);
    const [locationConsent, setLocationConsent] = useState(false);

    // ============================================================
    // VERIFICATION STATE
    // ============================================================

    const [location, setLocation] = useState(null);
    const [locationCapturedAt, setLocationCapturedAt] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [photoCapturedAt, setPhotoCapturedAt] = useState(null);

    const [cameraLoading, setCameraLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const faceDetectorRef = useRef(null);
    const faceDetectorLoadingRef = useRef(null);

    const [cameraVerification, setCameraVerification] = useState({
        status: "idle",
        message: "Camera verification is ready.",
        checks: [],
    });

    // Browser preview of the exact photo captured before the attempt.
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");

    useEffect(() => {
        if (!photo) {
            setPhotoPreviewUrl("");
            return undefined;
        }

        const url = URL.createObjectURL(photo);
        setPhotoPreviewUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [photo]);

    // ============================================================
    // SESSION / ANSWERS
    // ============================================================

    const [session, setSession] = useState(null);

    const [answers, setAnswers] = useState({});

    /*
     * IMPORTANT FIX
     *
     * React state updates are asynchronous.
     *
     * If a participant selects an answer and immediately clicks
     * "Save & Continue" or "Submit Assessment", the state update
     * may not have completed yet.
     *
     * answersRef always contains the latest answer object.
     */
    const answersRef = useRef({});

    const [index, setIndex] = useState(0);

    /*
     * Central answer updater.
     *
     * Every answer change goes through this function so both:
     *
     *   answers state
     *   answersRef
     *
     * stay synchronized immediately.
     */
    const updateAnswers = (updater) => {
        const previous = answersRef.current || {};

        const next =
            typeof updater === "function"
                ? updater(previous)
                : updater;

        // IMPORTANT:
        // Update the ref FIRST. React state updates are asynchronous,
        // so the submit handler must never depend on React finishing
        // a render before the latest answer is available.
        answersRef.current = next;

        setAnswers(next);
    };

    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    // ============================================================
    // TIMER
    // ============================================================

    const [remainingSeconds, setRemainingSeconds] =
        useState(null);

    // ============================================================
    // LOAD PUBLIC QUIZ
    // ============================================================

    useEffect(() => {
        let mounted = true;

        const loadQuiz = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await axios.get(
                    `/api/quiz/public/${token}`
                );

                if (!mounted) {
                    return;
                }

                const quizData =
                    response?.data?.data;

                if (!quizData) {
                    throw new Error(
                        "Quiz data was not found."
                    );
                }

                setQuiz(quizData);

                // ----------------------------------------------------
                // INITIALIZE TIMER
                // ----------------------------------------------------

                if (
                    quizData.time_limit_minutes
                ) {
                    const seconds =
                        Number(
                            quizData.time_limit_minutes
                        ) * 60;

                    if (
                        Number.isFinite(seconds) &&
                        seconds > 0
                    ) {
                        setRemainingSeconds(
                            seconds
                        );
                    }
                }
            } catch (err) {
                if (!mounted) {
                    return;
                }

                setError(
                    err?.response?.data?.message ||
                    err?.message ||
                    "This quiz link is unavailable."
                );
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadQuiz();

        return () => {
            mounted = false;
        };
    }, [token]);

    // ============================================================
    // CAMERA CLEANUP
    // ============================================================

    useEffect(() => {
        return () => {
            stopCamera();
            faceDetectorRef.current = null;
            faceDetectorLoadingRef.current = null;
        };
    }, []);

    // ============================================================
    // ATTACH CAMERA STREAM
    // ============================================================

    useEffect(() => {
        if (
            videoRef.current &&
            streamRef.current
        ) {
            videoRef.current.srcObject =
                streamRef.current;
        }
    }, [cameraConsent]);

    // ============================================================
    // QUIZ TIMER
    // ============================================================

    useEffect(() => {
        if (
            step !== "quiz" ||
            remainingSeconds === null ||
            submitting
        ) {
            return undefined;
        }

        if (remainingSeconds <= 0) {
            handleSubmit(true);
            return undefined;
        }

        const timer = setInterval(() => {
            setRemainingSeconds(
                (current) => {
                    if (current === null) {
                        return null;
                    }

                    if (current <= 1) {
                        clearInterval(timer);
                        return 0;
                    }

                    return current - 1;
                }
            );
        }, 1000);

        return () => clearInterval(timer);
    }, [
        step,
        remainingSeconds,
        submitting,
    ]);

    // ============================================================
    // STOP CAMERA
    // ============================================================

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current
                .getTracks()
                .forEach((track) => {
                    try {
                        track.stop();
                    } catch {
                        // Ignore cleanup errors
                    }
                });

            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // ============================================================
    // RESET PARTICIPANT VERIFICATION
    // ============================================================
    // Retake must return the verification flow to its initial state.
    // The participant must enter name, email and agreement again before
    // the camera can be enabled.

    const resetParticipantForRetake = () => {
        stopAutoCapture();
        stopCamera();

        setPhoto(null);
        setPhotoCapturedAt(null);
        setCameraConsent(false);
        setCameraLoading(false);

        setCameraVerification({
            status: "idle",
            message: "Camera verification is ready.",
            checks: [],
        });

        setName("");
        setEmail("");
        setEmailConsent(false);

        setError("");
    };

    // ============================================================
    // REQUEST CAMERA
    // ============================================================

    const requestCamera = async () => {
        setError("");

        if (!isCameraPrerequisiteComplete()) {
            setError(
                "Please complete your name, email address, and agreement before enabling the camera."
            );
            return;
        }

        setCameraLoading(true);

        try {
            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices
                    .getUserMedia
            ) {
                throw new Error(
                    "Camera access is not supported by this browser."
                );
            }

            stopCamera();

            const mediaStream =
                await navigator.mediaDevices
                    .getUserMedia({
                        video: {
                            facingMode: "user",
                            width: {
                                ideal: 1280,
                            },
                            height: {
                                ideal: 720,
                            },
                        },
                        audio: false,
                    });

            streamRef.current =
                mediaStream;

            setCameraConsent(true);

            setTimeout(() => {
                if (
                    videoRef.current &&
                    streamRef.current
                ) {
                    videoRef.current.srcObject =
                        streamRef.current;
                }
            }, 50);
        } catch (err) {
            setCameraConsent(false);

            setError(
                err?.message ||
                "Camera permission is required for this assessment."
            );
        } finally {
            setCameraLoading(false);
        }
    };

    // ============================================================
    // CAMERA QUALITY / FACE VERIFICATION
    // ============================================================

    const loadFaceDetector = async () => {
        if (faceDetectorRef.current) {
            return faceDetectorRef.current;
        }

        if (faceDetectorLoadingRef.current) {
            return faceDetectorLoadingRef.current;
        }

        faceDetectorLoadingRef.current = (async () => {
            // Loaded at runtime so the existing Vite bundle does not need
            // a large computer-vision dependency bundled into every page.
            const fileset = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
            );

            const detector = await FaceDetector.createFromOptions(
                fileset,
                {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                        delegate: "GPU",
                    },
                    runningMode: "IMAGE",
                    minDetectionConfidence: 0.65,
                    minSuppressionThreshold: 0.3,
                }
            );

            faceDetectorRef.current = detector;
            return detector;
        })();

        try {
            return await faceDetectorLoadingRef.current;
        } finally {
            faceDetectorLoadingRef.current = null;
        }
    };

    const calculateImageQuality = (context, box, width, height) => {
        const x = Math.max(0, Math.floor(box.originX));
        const y = Math.max(0, Math.floor(box.originY));
        const w = Math.min(width - x, Math.floor(box.width));
        const h = Math.min(height - y, Math.floor(box.height));

        if (w < 10 || h < 10) {
            return { brightness: 0, blurScore: 0 };
        }

        const image = context.getImageData(x, y, w, h);
        const data = image.data;
        const gray = new Float32Array(w * h);
        let sum = 0;

        for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
            const value =
                0.299 * data[i] +
                0.587 * data[i + 1] +
                0.114 * data[i + 2];
            gray[p] = value;
            sum += value;
        }

        const brightness = sum / gray.length;
        let laplaceSum = 0;
        let laplaceSq = 0;
        let count = 0;

        // A simple Laplacian variance is enough to reject obviously blurry
        // captures without requiring another image-processing dependency.
        for (let row = 1; row < h - 1; row += 1) {
            for (let col = 1; col < w - 1; col += 1) {
                const index = row * w + col;
                const laplacian =
                    gray[index - w] +
                    gray[index - 1] +
                    gray[index + 1] +
                    gray[index + w] -
                    4 * gray[index];

                laplaceSum += laplacian;
                laplaceSq += laplacian * laplacian;
                count += 1;
            }
        }

        const mean = count ? laplaceSum / count : 0;
        const blurScore = count
            ? laplaceSq / count - mean * mean
            : 0;

        return { brightness, blurScore };
    };

    const verifyCapturedFrame = async (canvas) => {
        setCameraVerification({
            status: "checking",
            message: "Checking your face, lighting and photo quality...",
            checks: [],
        });

        const detector = await loadFaceDetector();
        const result = detector.detect(canvas);
        const detections = result?.detections || [];

        if (detections.length !== 1) {
            throw new Error(
                detections.length === 0
                    ? "No face detected. Please place your face clearly inside the frame."
                    : "Only one face should be visible. Please make sure nobody else is in the camera frame."
            );
        }

        const detection = detections[0];
        const box = detection.boundingBox;
        const faceWidthRatio = box.width / canvas.width;
        const faceHeightRatio = box.height / canvas.height;
        const centerX = (box.originX + box.width / 2) / canvas.width;
        const centerY = (box.originY + box.height / 2) / canvas.height;

        if (
            faceWidthRatio < 0.20 ||
            faceHeightRatio < 0.20
        ) {
            throw new Error(
                "Your face is too far from the camera. Please move closer."
            );
        }

        if (
            faceWidthRatio > 0.82 ||
            faceHeightRatio > 0.82
        ) {
            throw new Error(
                "Your face is too close to the camera. Please move slightly back."
            );
        }

        if (
            centerX < 0.30 ||
            centerX > 0.70 ||
            centerY < 0.30 ||
            centerY > 0.70
        ) {
            throw new Error(
                "Please position your face in the center of the camera frame."
            );
        }

        const keypoints = detection.keypoints || [];
        const leftEye = keypoints.find(
            (point) => point?.label === "leftEye"
        );
        const rightEye = keypoints.find(
            (point) => point?.label === "rightEye"
        );
        const nose = keypoints.find(
            (point) => point?.label === "noseTip"
        );

        if (leftEye && rightEye && nose) {
            const eyeMidX = (leftEye.x + rightEye.x) / 2;
            const eyeMidY = (leftEye.y + rightEye.y) / 2;
            const eyeDistance = Math.hypot(
                leftEye.x - rightEye.x,
                leftEye.y - rightEye.y
            );
            const noseVerticalRatio =
                eyeDistance > 0
                    ? (nose.y - eyeMidY) / eyeDistance
                    : 0.35;
            const eyeTilt =
                Math.abs(leftEye.y - rightEye.y) /
                Math.max(eyeDistance, 0.0001);
            const noseHorizontalOffset =
                Math.abs(nose.x - eyeMidX) /
                Math.max(eyeDistance, 0.0001);

            // These are intentionally conservative orientation checks. They
            // reject an obviously downward/sideways pose without attempting
            // to infer age, sex, gender, race, or any other attribute.
            if (noseVerticalRatio > 1.25) {
                throw new Error(
                    "Please lift your head and look directly at the camera."
                );
            }

            if (noseVerticalRatio < 0.05) {
                throw new Error(
                    "Please face the camera directly and keep your head level."
                );
            }

            if (eyeTilt > 0.35) {
                throw new Error(
                    "Please keep your head straight and level with the camera."
                );
            }

            if (noseHorizontalOffset > 0.85) {
                throw new Error(
                    "Please face the camera directly rather than turning your head."
                );
            }
        }

        const { brightness, blurScore } = calculateImageQuality(
            canvas.getContext("2d"),
            box,
            canvas.width,
            canvas.height
        );

        if (brightness < 55) {
            throw new Error(
                "Lighting is too dark. Please move to a brighter area and try again."
            );
        }

        if (brightness > 235) {
            throw new Error(
                "Lighting is too bright. Please avoid strong light directly facing the camera."
            );
        }

        if (blurScore < 18) {
            throw new Error(
                "The photo is too blurry. Please keep still and try again."
            );
        }

        return {
            faceCount: detections.length,
            brightness: Math.round(brightness),
            blurScore: Math.round(blurScore),
            message: "Face, position, lighting and image quality passed.",
        };
    };

    // ============================================================
    // CAPTURE PHOTO
    // ============================================================

    const capturePhoto = async () => {
        if (!videoRef.current) {
            setError("Camera is not ready.");
            return false;
        }

        const video = videoRef.current;

        if (!video.videoWidth || !video.videoHeight) {
            setError("Camera is still loading. Please try again.");
            return false;
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        if (!context) {
            setError("Unable to capture photo.");
            return false;
        }

        context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        try {
            const verification = await verifyCapturedFrame(canvas);

            setCameraVerification({
                status: "passed",
                message: "Face verified. Photo captured successfully.",
                checks: [
                    "One face detected",
                    "Face visible",
                    "Lighting acceptable",
                    "Image clear",
                ],
            });

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        setError("Unable to create photo.");
                        return;
                    }

                    const file = new File(
                        [blob],
                        "participant-verification.jpg",
                        { type: "image/jpeg" }
                    );

                    setPhoto(file);
                    setPhotoCapturedAt(new Date().toISOString());
                    setError("");
                },
                "image/jpeg",
                0.88
            );

            return true;
        } catch (err) {
            setPhoto(null);
            setPhotoCapturedAt(null);

            setCameraVerification({
                status: "failed",
                message: "Camera verification failed. Please try again.",
                checks: [],
            });

            setError("Camera verification failed. Please try again.");
            return false;
        }
    };

    // ============================================================
    // AUTOMATIC FACE CAPTURE
    // ============================================================
    //
    // Once the camera is enabled, continuously inspect the live frame.
    // As soon as exactly one acceptable face is visible, capture it
    // automatically. After a successful capture the loop stops until
    // the participant presses Retake Photo.
    //

    const autoCaptureTimerRef = useRef(null);
    const autoCaptureBusyRef = useRef(false);

    const stopAutoCapture = () => {
        if (autoCaptureTimerRef.current) {
            clearInterval(autoCaptureTimerRef.current);
            autoCaptureTimerRef.current = null;
        }
        autoCaptureBusyRef.current = false;
    };

    const startAutoCapture = () => {
        stopAutoCapture();

        autoCaptureTimerRef.current = setInterval(async () => {
            if (
                autoCaptureBusyRef.current ||
                photo ||
                !cameraConsent ||
                !isCameraPrerequisiteComplete() ||
                !videoRef.current ||
                cameraVerification.status === "checking"
            ) {
                return;
            }

            const video = videoRef.current;

            if (!video.videoWidth || !video.videoHeight) {
                return;
            }

            autoCaptureBusyRef.current = true;

            try {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const context = canvas.getContext("2d");

                if (!context) {
                    return;
                }

                context.drawImage(
                    video,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                const detector = await loadFaceDetector();
                const result = detector.detect(canvas);
                const detections = result?.detections || [];

                // Only auto-capture when exactly one face is visible.
                if (detections.length !== 1) {
                    return;
                }

                const detection = detections[0];
                const box = detection.boundingBox;

                if (!box) {
                    return;
                }

                const faceWidthRatio = box.width / canvas.width;
                const faceHeightRatio = box.height / canvas.height;
                const centerX =
                    (box.originX + box.width / 2) / canvas.width;
                const centerY =
                    (box.originY + box.height / 2) / canvas.height;

                // Internal acceptance checks. The participant sees only
                // the generic verification message if these fail.
                if (
                    faceWidthRatio < 0.20 ||
                    faceHeightRatio < 0.20 ||
                    faceWidthRatio > 0.82 ||
                    faceHeightRatio > 0.82 ||
                    centerX < 0.30 ||
                    centerX > 0.70 ||
                    centerY < 0.30 ||
                    centerY > 0.70
                ) {
                    return;
                }

                // Reuse the full verification rules before saving the photo.
                await capturePhoto();
            } catch {
                // Keep watching the camera. A temporary detector failure
                // should not break the verification UI.
            } finally {
                autoCaptureBusyRef.current = false;
            }
        }, 650);
    };

    useEffect(() => {
        if (
            cameraConsent &&
            isCameraPrerequisiteComplete() &&
            !photo &&
            cameraVerification.status !== "passed"
        ) {
            const timer = setTimeout(() => {
                startAutoCapture();
            }, 800);

            return () => {
                clearTimeout(timer);
                stopAutoCapture();
            };
        }

        stopAutoCapture();

        return undefined;
    }, [
        cameraConsent,
        name,
        email,
        emailConsent,
        photo,
        cameraVerification.status,
    ]);

    // ============================================================
    // REQUEST LOCATION
    // ============================================================

    const requestLocation = () => {
        setError("");

        if (!navigator.geolocation) {
            setError(
                "Location services are not supported by this browser."
            );

            return;
        }

        setLocationLoading(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const {
                    latitude,
                    longitude,
                    accuracy,
                } = position.coords;

                setLocation({
                    latitude,
                    longitude,
                    accuracy,
                });

                setLocationCapturedAt(new Date().toISOString());
                setLocationConsent(true);
                setLocationLoading(false);
                setError("");
            },
            (err) => {
                setLocationLoading(false);
                setLocationConsent(false);

                let message =
                    "Location permission is required for this assessment.";

                if (err.code === 1) {
                    message =
                        "Location permission was denied. Please allow location access and try again.";
                }

                if (err.code === 2) {
                    message =
                        "Your location could not be determined. Please try again.";
                }

                if (err.code === 3) {
                    message =
                        "Location request timed out. Please try again.";
                }

                setError(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    // ============================================================
    // CAMERA PREREQUISITE CHECK
    // ============================================================

    const isCameraPrerequisiteComplete = () => {
        const participantName = name.trim();
        const participantEmail = email.trim();

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        return (
            participantName.length > 0 &&
            emailPattern.test(participantEmail) &&
            emailConsent === true
        );
    };

    // ============================================================
    // VALIDATE PARTICIPANT
    // ============================================================

    const validateParticipant = () => {
        if (!name.trim()) {
            setError(
                "Please enter your full name."
            );
            return false;
        }

        if (!email.trim()) {
            setError(
                "Please enter your email address."
            );
            return false;
        }

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            !emailPattern.test(
                email.trim()
            )
        ) {
            setError(
                "Please enter a valid email address."
            );

            return false;
        }

        if (!emailConsent) {
            setError(
                "Please provide your agreement before continuing."
            );

            return false;
        }

        if (
            quiz?.require_camera &&
            (
                !cameraConsent ||
                !photo ||
                cameraVerification.status !== "passed"
            )
        ) {
            setError(
                cameraVerification.message ||
                "Please complete camera verification before continuing."
            );

            return false;
        }

        if (
            quiz?.require_location &&
            !locationConsent
        ) {
            setError(
                "Please allow location access before continuing."
            );

            return false;
        }

        return true;
    };

    // ============================================================
    // START QUIZ SESSION
    // ============================================================

    const startQuiz = async () => {
        setError("");

        if (!validateParticipant()) {
            return;
        }

        const formData =
            new FormData();

        formData.append(
            "participant_name",
            name.trim()
        );

        formData.append(
            "participant_email",
            email.trim()
        );

        formData.append(
            "email_consent",
            emailConsent ? "1" : "0"
        );

        formData.append(
            "camera_consent",
            cameraConsent ? "1" : "0"
        );

        formData.append(
            "location_consent",
            locationConsent ? "1" : "0"
        );

        if (location) {
            formData.append(
                "latitude",
                String(
                    location.latitude
                )
            );

            formData.append(
                "longitude",
                String(
                    location.longitude
                )
            );

            formData.append(
                "location_accuracy",
                String(
                    location.accuracy
                )
            );
        }

        if (photo) {
            formData.append(
                "photo",
                photo
            );

            if (photoCapturedAt) {
                formData.append(
                    "photo_captured_at",
                    photoCapturedAt
                );
            }
        }

        try {
            const response =
                await axios.post(
                    `/api/quiz/public/${token}/start`,
                    formData,
                    {
                        headers: {
                            "Content-Type":
                                "multipart/form-data",
                        },
                    }
                );

            const sessionData =
                response?.data?.data ||
                response?.data;

            if (!sessionData) {
                throw new Error(
                    "Unable to create assessment session."
                );
            }

            setSession(
                sessionData
            );

            setStep("quiz");
            setIndex(0);

            // IMPORTANT:
            // Reset both state and ref.
            answersRef.current = {};
            setAnswers({});

            stopCamera();
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                "Unable to start assessment."
            );
        }
    };

    // ============================================================
    // NORMALIZE OPTIONS
    // ============================================================

    const getQuestionOptions =
        (question) => {
            if (!question) {
                return [];
            }

            if (
                question.question_type ===
                "true_false"
            ) {
                return [
                    "True",
                    "False",
                ];
            }

            if (
                Array.isArray(
                    question.options
                )
            ) {
                return question.options;
            }

            if (
                typeof question.options ===
                "string"
            ) {
                try {
                    const parsed =
                        JSON.parse(
                            question.options
                        );

                    if (
                        Array.isArray(
                            parsed
                        )
                    ) {
                        return parsed;
                    }
                } catch {
                    // Ignore invalid JSON
                }

                return question.options
                    .split(",")
                    .map(
                        (item) =>
                            item.trim()
                    )
                    .filter(Boolean);
            }

            return [];
        };

    // ============================================================
    // CURRENT QUESTION
    // ============================================================

    const currentQuestion =
        quiz?.questions?.[index] ||
        null;

    // ============================================================
    // CHECK REQUIRED QUESTION
    // ============================================================

    const isQuestionRequired =
        (question) => {
            if (!question) {
                return false;
            }

            return Boolean(
                question.is_mandatory ??
                question.required ??
                question.mandatory
            );
        };

    // ============================================================
    // CHECK ANSWER
    // ============================================================

    const hasAnswer =
        (question) => {
            if (!question) {
                return false;
            }

            /*
             * Read from the ref so validation always sees the
             * latest answer, even before React renders again.
             */
            const answer = getStoredAnswer(
                answersRef.current,
                question.id
            );

            return answerIsPresent(answer);
        };

    // ============================================================
    // SET ANSWER
    // ============================================================

    const setQuestionAnswer = (
        question,
        option
    ) => {
        if (!question) {
            return;
        }

        const questionId = Number(
            question.id
        );

        if (
            !Number.isInteger(questionId) ||
            questionId <= 0
        ) {
            return;
        }

        const selectedOption =
            String(option ?? "").trim();

        if (!selectedOption) {
            return;
        }

        const previous =
            answersRef.current || {};

        // --------------------------------------------------------
        // MULTIPLE CHOICE
        // --------------------------------------------------------

        if (
            question.question_type ===
            "multiple_choice"
        ) {
            const existingAnswer =
                getStoredAnswer(
                    previous,
                    questionId
                );

            const current =
                Array.isArray(existingAnswer)
                    ? [
                        ...existingAnswer,
                    ]
                    : [];

            const exists =
                current.some(
                    (item) =>
                        String(item).trim().toLowerCase() ===
                        selectedOption.toLowerCase()
                );

            const nextAnswer = exists
                ? current.filter(
                    (item) =>
                        String(item).trim().toLowerCase() !==
                        selectedOption.toLowerCase()
                )
                : [
                    ...current,
                    selectedOption,
                ];

            const next = {
                ...previous,
                [questionId]:
                    nextAnswer,
            };

            // Synchronously store the answer.
            answersRef.current = next;

            // Then update React state for the UI.
            setAnswers(next);

            return;
        }

        // --------------------------------------------------------
        // SINGLE CHOICE / TRUE-FALSE
        // --------------------------------------------------------

        const next = {
            ...previous,
            [questionId]:
                selectedOption,
        };

        // Synchronously store the answer.
        answersRef.current = next;

        // Then update React state for the UI.
        setAnswers(next);
    };

    // ============================================================
    // NEXT QUESTION
    // ============================================================

    const nextQuestion = () => {
        setError("");

        if (
            currentQuestion &&
            isQuestionRequired(
                currentQuestion
            ) &&
            !hasAnswer(
                currentQuestion
            )
        ) {
            setError(
                "This question is mandatory. Please provide an answer before continuing."
            );

            return;
        }

        if (
            index <
            (quiz?.questions
                ?.length || 1) - 1
        ) {
            setIndex(
                (current) =>
                    current + 1
            );

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }
    };

    // ============================================================
    // PREVIOUS QUESTION
    // ============================================================

    const previousQuestion =
        () => {
            setError("");

            if (index > 0) {
                setIndex(
                    (current) =>
                        current - 1
                );

                window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });
            }
        };

    // ============================================================
    // BUILD SUBMISSION PAYLOAD
    // ============================================================

    const buildSubmissionPayload =
        () => {
            /*
             * Use answersRef because it contains the latest answer
             * synchronously, even before React renders again.
             *
             * The complete quiz question list is the source of truth,
             * so every question is represented in the payload.
             */
            const latestAnswers =
                answersRef.current || {};

            const submittedAnswers =
                (
                    quiz?.questions ||
                    []
                )
                    .map(
                        (question) => {
                            const questionId =
                                Number(
                                    question?.id
                                );

                            if (
                                !Number.isFinite(
                                    questionId
                                ) ||
                                questionId <= 0
                            ) {
                                return null;
                            }

                            const storedAnswer =
                                getStoredAnswer(
                                    latestAnswers,
                                    questionId
                                );

                            /*
                             * Send the actual selected option text.
                             *
                             * Example:
                             *   "Peacock"
                             *
                             * Multiple-choice answers remain an array.
                             */
                            const answer =
                                normalizeAnswerValue(
                                    storedAnswer
                                );

                            return {
                                question_id:
                                    questionId,
                                answer,
                            };
                        }
                    )
                    .filter(Boolean);

            return {
                answers:
                    submittedAnswers,
            };
        };

    // ============================================================
    // SUBMIT QUIZ
    // ============================================================

    const handleSubmit =
        async (
            automaticSubmit = false
        ) => {
            if (submitting) {
                return;
            }

            setError("");

            // ----------------------------------------------------
            // VALIDATE MANDATORY QUESTIONS
            // ----------------------------------------------------

            if (!automaticSubmit) {
                const mandatoryQuestion =
                    quiz?.questions?.find(
                        (question) =>
                            isQuestionRequired(
                                question
                            ) &&
                            !hasAnswer(
                                question
                            )
                    );

                if (
                    mandatoryQuestion
                ) {
                    setError(
                        "Please answer all mandatory questions before submitting."
                    );

                    const mandatoryIndex =
                        quiz.questions.findIndex(
                            (question) =>
                                question.id ===
                                mandatoryQuestion.id
                        );

                    if (
                        mandatoryIndex >= 0
                    ) {
                        setIndex(
                            mandatoryIndex
                        );
                    }

                    return;
                }
            }

            if (
                !session?.session_token
            ) {
                setError(
                    "Your assessment session is unavailable. Please restart the assessment."
                );

                return;
            }

            setSubmitting(true);

            try {
                /*
                 * Build the payload immediately before the request.
                 *
                 * This ensures the latest answersRef value is used.
                 */
                const payload =
                    buildSubmissionPayload();

                // Never submit an empty answer collection when the
                // participant has actually selected an answer.
                const submittedCount =
                    Array.isArray(payload.answers)
                        ? payload.answers.filter(
                            (item) =>
                                answerIsPresent(
                                    item?.answer
                                )
                        ).length
                        : 0;

                if (
                    !automaticSubmit &&
                    submittedCount === 0
                ) {
                    setError(
                        "No answer was captured. Please select an answer and try again."
                    );
                    return;
                }

                const response =
                    await axios.post(
                        `/api/quiz/public/session/${session.session_token}/submit`,
                        payload,
                        {
                            headers: {
                                "Content-Type":
                                    "application/json",
                            },
                        }
                    );

                const resultData =
                    response?.data?.data ||
                    response?.data;

                setResult(
                    resultData
                );

                setStep("result");

                stopCamera();
            } catch (err) {
                setError(
                    err?.response?.data
                        ?.message ||
                    "Unable to submit assessment."
                );
            } finally {
                setSubmitting(false);
            }
        };

    // ============================================================
    // FORMAT TIMER
    // ============================================================

    const formatTime =
        (seconds) => {
            if (
                seconds === null ||
                seconds === undefined
            ) {
                return "No time limit";
            }

            const safeSeconds =
                Math.max(
                    0,
                    Number(seconds)
                );

            const minutes =
                Math.floor(
                    safeSeconds / 60
                );

            const remaining =
                safeSeconds % 60;

            return `${String(
                minutes
            ).padStart(
                2,
                "0"
            )}:${String(
                remaining
            ).padStart(
                2,
                "0"
            )}`;
        };

    // ============================================================
    // LOADING SCREEN
    // ============================================================

    if (loading) {
        return (
            <div className="public-quiz-shell">
                <header className="public-header">
                    <div className="brand-mark">
                        <img src="/miarcus.png" alt="Mi Arcus" />
                    </div>

                    <div className="public-secure">
                        <FaLock />
                        Secure Assessment
                    </div>
                </header>

                <main className="public-main">
                    <div className="public-card loading-card">
                        <div className="loading-ring" />

                        <h2>
                            Loading assessment
                        </h2>

                        <p>
                            Please wait while we
                            securely load your quiz.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // ============================================================
    // QUIZ UNAVAILABLE
    // ============================================================

    if (error && !quiz) {
        return (
            <div className="public-quiz-shell">
                <header className="public-header">
                    <div className="brand-mark">
                        <img src="/miarcus.png" alt="Mi Arcus" />
                    </div>

                    <div className="public-secure">
                        <FaShieldAlt />
                        Secure Assessment
                    </div>
                </header>

                <main className="public-main">
                    <div className="public-card public-error">
                        <FaShieldAlt />

                        <h1>
                            Assessment unavailable
                        </h1>

                        <p>
                            {error}
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // ============================================================
    // EMPTY QUIZ PROTECTION
    // ============================================================

    if (
        !quiz ||
        !Array.isArray(
            quiz.questions
        ) ||
        quiz.questions.length === 0
    ) {
        return (
            <div className="public-quiz-shell">
                <header className="public-header">
                    <div className="brand-mark">
                        <img src="/miarcus.png" alt="Mi Arcus" />
                    </div>
                </header>

                <main className="public-main">
                    <div className="public-card public-error">
                        <FaShieldAlt />

                        <h1>
                            No questions available
                        </h1>

                        <p>
                            This assessment has not
                            been configured with any
                            questions yet.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // ============================================================
    // CURRENT QUESTION OPTIONS
    // ============================================================

    const questionOptions =
        getQuestionOptions(
            currentQuestion
        );

    const currentAnswer =
        currentQuestion
            ? getStoredAnswer(
                answersRef.current || answers,
                currentQuestion.id
            )
            : undefined;

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="public-quiz-shell">
            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="public-header">
                <div className="brand-mark">
                    <img src="/miarcus.png" alt="Mi Arcus" />
                </div>

                <div className="public-secure">
                    <FaShieldAlt />
                    Secure Assessment
                </div>
            </header>

            <main className="public-main">
                {/* ==================================================
                    ERROR BANNER
                ================================================== */}

                {error && (
                    <div className="public-error-banner">
                        <FaShieldAlt />

                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setError("")
                            }
                            aria-label="Close error"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* ==================================================
                    VERIFICATION STEP
                ================================================== */}

                {step === "verify" && (
                    <div className="public-card wide">
                        <div className="public-card-intro">
                            <span>
                                MI ARCUS TRAINING
                            </span>

                            <h1>
                                {quiz.name}
                            </h1>

                            <p>
                                {quiz.description ||
                                    "Complete this assessment to demonstrate your training knowledge."}
                            </p>

                            <div className="public-meta">
                                <span>
                                    {
                                        quiz.questions
                                            .length
                                    }{" "}
                                    Questions
                                </span>

                                <span>
                                    {quiz.time_limit_minutes
                                        ? `${quiz.time_limit_minutes} Minutes`
                                        : "No Time Limit"}
                                </span>

                                <span>
                                    Pass{" "}
                                    {
                                        quiz.passing_score
                                    }%
                                </span>
                            </div>
                        </div>

                        <div className="verification-grid">
                            {/* ==================================================
                                PARTICIPANT DETAILS
                            ================================================== */}

                            <section>
                                <div className="section-heading">
                                    <span className="section-number">
                                        01
                                    </span>

                                    <div>
                                        <h3>
                                            Participant
                                            details
                                        </h3>

                                        <p>
                                            Enter the
                                            details used
                                            for your
                                            assessment
                                            record.
                                        </p>
                                    </div>
                                </div>

                                <label>
                                    <span>
                                        Full Name
                                    </span>

                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(event) => {
                                            setName(event.target.value);
                                        }}
                                        placeholder="Enter your full name"
                                        autoComplete="name"
                                    />
                                </label>

                                <label>
                                    <span>
                                        Email Address
                                    </span>

                                    <div className="input-with-icon">
                                        <FaEnvelope />

                                        <input
                                            type="email"
                                            value={
                                                email
                                            }
                                            onChange={(
                                                event
                                            ) => {
                                                setEmail(event.target.value);
                                            }}
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                        />
                                    </div>
                                </label>

                                <label className="consent">
                                        <input
                                            type="checkbox"
                                            checked={
                                                emailConsent
                                            }
                                            onChange={(
                                                event
                                            ) => {
                                                const checked = event.target.checked;
                                                setEmailConsent(checked);

                                                if (!checked) {
                                                    setPhoto(null);
                                                    setPhotoCapturedAt(null);
                                                    setCameraVerification({
                                                        status: "idle",
                                                        message: "Camera verification is ready.",
                                                        checks: [],
                                                    });
                                                }
                                            }}
                                        />

                                        <span>
                                            I agree to
                                            receive
                                            assessment-related
                                            emails such
                                            as my result
                                            and
                                            certificate.
                                        </span>
                                </label>
                            </section>

                            {/* ==================================================
                                VERIFICATION
                            ================================================== */}

                            <section>
                                <div className="section-heading">
                                    <span className="section-number">
                                        02
                                    </span>

                                    <div>
                                        <h3>
                                            Assessment
                                            verification
                                        </h3>

                                        <p>
                                            Complete the
                                            required
                                            verification
                                            steps before
                                            starting.
                                        </p>
                                    </div>
                                </div>

                                {/* CAMERA */}

                                {quiz.require_camera && (
                                    <>
                                        <div className="permission-card">
                                            <div>
                                                <FaCamera />

                                                <span>
                                                    Camera
                                                    verification

                                                    <small>
                                                        {!cameraConsent
                                                            ? "Required before starting"
                                                            : cameraVerification.status === "passed"
                                                                ? "Face and photo quality verified"
                                                                : cameraVerification.status === "checking"
                                                                    ? "Checking face and photo quality..."
                                                                    : photo
                                                                        ? "Waiting for a visible face"
                                                                        : "Camera ready — automatic capture enabled"}
                                                    </small>
                                                </span>
                                            </div>

                                            {!cameraConsent ? (
                                                <button
                                                    type="button"
                                                    onClick={
                                                        requestCamera
                                                    }
                                                    disabled={
                                                        cameraLoading ||
                                                        !isCameraPrerequisiteComplete()
                                                    }
                                                >
                                                    {cameraLoading
                                                        ? "Opening..."
                                                        : isCameraPrerequisiteComplete()
                                                            ? "Allow Camera"
                                                            : "Complete Details First"}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={resetParticipantForRetake}
                                                    disabled={
                                                        cameraVerification.status === "checking"
                                                    }
                                                >
                                                    {cameraVerification.status === "checking"
                                                        ? "Checking..."
                                                        : photo
                                                            ? "Retake Photo"
                                                            : "Auto Capture"}
                                                </button>
                                            )}
                                        </div>

                                        {!cameraConsent &&
                                            !isCameraPrerequisiteComplete() && (
                                                <p className="camera-prerequisite-hint">
                                                    Enter your name, valid email address,
                                                    and accept the agreement before enabling
                                                    camera verification.
                                                </p>
                                            )}

                                        {cameraConsent && (
                                            <div className="camera-preview">
                                                {photo && photoPreviewUrl ? (
                                                    <div className="captured-photo-preview">
                                                        <img
                                                            src={photoPreviewUrl}
                                                            alt="Participant verification preview"
                                                        />
                                                        <div className="verification-success">
                                                            <FaCheckCircle />
                                                            <span>Camera verification passed</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <video
                                                        ref={videoRef}
                                                        autoPlay
                                                        muted
                                                        playsInline
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {cameraVerification.status !== "idle" && (
                                            <div
                                                className={`camera-verification-status ${
                                                    cameraVerification.status
                                                }`}
                                            >
                                                <strong>
                                                    {cameraVerification.status === "checking"
                                                        ? "Checking camera..."
                                                        : cameraVerification.status === "passed"
                                                            ? "Camera verification passed"
                                                            : "Camera verification failed"}
                                                </strong>
                                                <span>{cameraVerification.message}</span>
                                                {cameraVerification.checks.length > 0 && (
                                                    <div className="camera-verification-checks">
                                                        {cameraVerification.checks.map((check) => (
                                                            <span key={check}>
                                                                <FaCheckCircle />
                                                                {check}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* LOCATION */}

                                {quiz.require_location && (
                                    <div className="permission-card">
                                        <div>
                                            <FaMapMarkerAlt />

                                            <span>
                                                Location
                                                verification

                                                <small>
                                                    {locationConsent
                                                        ? `Accuracy ${Math.round(
                                                            location?.accuracy ||
                                                            0
                                                        )}m`
                                                        : "Required before starting"}
                                                </small>
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={
                                                requestLocation
                                            }
                                            disabled={
                                                locationLoading
                                            }
                                        >
                                            {locationLoading
                                                ? "Checking..."
                                                : locationConsent
                                                    ? "Location Ready"
                                                    : "Allow Location"}
                                        </button>
                                    </div>
                                )}

                                {!quiz.require_camera &&
                                    !quiz.require_location && (
                                        <div className="verification-ready">
                                            <FaCheckCircle />

                                            <div>
                                                <strong>
                                                    No additional
                                                    verification
                                                    required
                                                </strong>

                                                <span>
                                                    You can
                                                    proceed
                                                    directly to
                                                    the
                                                    assessment.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                            </section>
                        </div>

                        {/* ==================================================
                            FOOTER ACTION
                        ================================================== */}

                        <div className="public-actions">
                            <span>
                                <FaShieldAlt />

                                Your assessment data
                                is recorded for
                                training
                                verification.
                            </span>

                            <button
                                type="button"
                                className="public-primary"
                                onClick={
                                    startQuiz
                                }
                            >
                                Proceed to Assessment
                                <FaArrowRight />
                            </button>
                        </div>
                    </div>
                )}

                {/* ==================================================
                    QUIZ PLAYER
                ================================================== */}

                {step === "quiz" &&
                    currentQuestion && (
                        <div className="public-card wide quiz-player">
                            {/* ==================================================
                                PLAYER HEADER
                            ================================================== */}

                            <div className="player-head">
                                <div>
                                    <span>
                                        QUESTION{" "}
                                        {index + 1} OF{" "}
                                        {
                                            quiz.questions
                                                .length
                                        }
                                    </span>

                                    <h1>
                                        {quiz.name}
                                    </h1>
                                </div>

                                <div className="player-status">
                                    {remainingSeconds !==
                                        null && (
                                            <div
                                                className={
                                                    remainingSeconds <=
                                                        60
                                                        ? "quiz-timer danger"
                                                        : "quiz-timer"
                                                }
                                            >
                                                <FaClock />

                                                <strong>
                                                    {formatTime(
                                                        remainingSeconds
                                                    )}
                                                </strong>

                                                <small>
                                                    Remaining
                                                </small>
                                            </div>
                                        )}

                                    <div className="player-progress">
                                        {Math.round(
                                            ((index + 1) /
                                                quiz
                                                    .questions
                                                    .length) *
                                            100
                                        )}
                                        %
                                    </div>
                                </div>
                            </div>

                            {/* ==================================================
                                PROGRESS
                            ================================================== */}

                            <div className="progress-track">
                                <i
                                    style={{
                                        width: `${
                                            ((index + 1) /
                                                quiz
                                                    .questions
                                                    .length) *
                                            100
                                        }%`,
                                    }}
                                />
                            </div>

                            {/* ==================================================
                                PARTICIPANT VERIFICATION SUMMARY
                            ================================================== */}

                            <div className="quiz-verification-summary">
                                <div className="quiz-verification-photo">
                                    {photoPreviewUrl ? (
                                        <img
                                            src={photoPreviewUrl}
                                            alt="Participant verification"
                                        />
                                    ) : (
                                        <img
                                            src="/miarcus.png"
                                            alt="Mi Arcus"
                                        />
                                    )}
                                </div>

                                <div className="quiz-verification-copy">
                                    <strong>Participant verification</strong>
                                    <span>Photo captured before assessment</span>
                                </div>

                                <div className="quiz-verification-meta">
                                    {location ? (
                                        <span>
                                            <FaMapMarkerAlt />
                                            {Number(location.latitude).toFixed(6)}, {Number(location.longitude).toFixed(6)}
                                        </span>
                                    ) : (
                                        <span>Location not captured</span>
                                    )}

                                    <span>
                                        <FaClock />
                                        {photoCapturedAt || locationCapturedAt || session?.started_at
                                            ? new Date(photoCapturedAt || locationCapturedAt || session?.started_at).toLocaleString()
                                            : "Verification time unavailable"}
                                    </span>

                                    {location?.accuracy !== undefined && (
                                        <span>
                                            ± {Math.round(Number(location.accuracy) || 0)}m
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ==================================================
                                QUESTION
                            ================================================== */}

                            <div className="player-question">
                                <div className="question-badge">
                                    {String(
                                        index + 1
                                    ).padStart(
                                        2,
                                        "0"
                                    )}
                                </div>

                                <div className="question-body">
                                    <div className="question-label">
                                        {currentQuestion.question_type ||
                                            "Question"}

                                        {isQuestionRequired(
                                            currentQuestion
                                        ) && (
                                                <span>
                                                    Required
                                                </span>
                                            )}
                                    </div>

                                    <h2>
                                        {
                                            currentQuestion.question_text
                                        }
                                    </h2>

                                    {/* IMAGE */}

                                    {currentQuestion.image_url && (
                                        <div className="question-media">
                                            <img
                                                src={mediaUrl(
                                                    currentQuestion.image_url
                                                )}
                                                alt="Question reference"
                                            />
                                        </div>
                                    )}

                                    {/* VIDEO */}

                                    {currentQuestion.video_url && (
                                        <div className="question-video">
                                            <a
                                                href={mediaUrl(
                                                    currentQuestion.video_url
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open video
                                                reference
                                                <FaArrowRight />
                                            </a>
                                        </div>
                                    )}

                                    {/* TEXT QUESTION */}

                                    {currentQuestion.question_type ===
                                        "text" && (
                                            <textarea
                                                value={
                                                    currentAnswer ||
                                                    ""
                                                }
                                                onChange={(
                                                    event
                                                ) => {
                                                    const questionId =
                                                        Number(
                                                            currentQuestion.id
                                                        );

                                                    const next = {
                                                        ...(answersRef.current || {}),
                                                        [questionId]:
                                                            event
                                                                .target
                                                                .value,
                                                    };

                                                    // Keep the latest text answer
                                                    // available immediately.
                                                    answersRef.current = next;
                                                    setAnswers(next);
                                                }}
                                                placeholder="Type your answer..."
                                            />
                                        )}

                                    {/* SINGLE / MULTIPLE / TRUE-FALSE */}

                                    {currentQuestion.question_type !==
                                        "text" && (
                                            <div className="answer-options">
                                                {questionOptions.map(
                                                    (
                                                        option,
                                                        optionIndex
                                                    ) => {
                                                        const selected =
                                                            Array.isArray(
                                                                currentAnswer
                                                            )
                                                                ? currentAnswer.includes(
                                                                    option
                                                                )
                                                                : currentAnswer ===
                                                                option;

                                                        return (
                                                            <label
                                                                key={`${currentQuestion.id}-${optionIndex}`}
                                                                className={
                                                                    selected
                                                                        ? "selected"
                                                                        : ""
                                                                }
                                                            >
                                                                <input
                                                                    type={
                                                                        currentQuestion.question_type ===
                                                                            "multiple_choice"
                                                                            ? "checkbox"
                                                                            : "radio"
                                                                    }
                                                                    name={`question-${currentQuestion.id}`}
                                                                    checked={
                                                                        selected
                                                                    }
                                                                    onChange={() =>
                                                                        setQuestionAnswer(
                                                                            currentQuestion,
                                                                            option
                                                                        )
                                                                    }
                                                                />

                                                                <span className="answer-letter">
                                                                    {String.fromCharCode(
                                                                        65 +
                                                                        optionIndex
                                                                    )}
                                                                </span>

                                                                <span className="answer-text">
                                                                    {
                                                                        option
                                                                    }
                                                                </span>

                                                                {selected && (
                                                                    <FaCheckCircle className="answer-check" />
                                                                )}
                                                            </label>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* ==================================================
                                PLAYER FOOTER
                            ================================================== */}

                            <div className="player-footer">
                                <button
                                    type="button"
                                    className="quiz-secondary"
                                    disabled={
                                        index ===
                                        0
                                    }
                                    onClick={
                                        previousQuestion
                                    }
                                >
                                    <FaArrowLeft />
                                    Previous
                                </button>

                                <span className="question-counter">
                                    {index + 1} /{" "}
                                    {
                                        quiz.questions
                                            .length
                                    }
                                </span>

                                {index <
                                    quiz.questions
                                        .length -
                                    1 ? (
                                    <button
                                        type="button"
                                        className="public-primary"
                                        onClick={
                                            nextQuestion
                                        }
                                    >
                                        Save & Continue
                                        <FaArrowRight />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="public-primary"
                                        disabled={
                                            submitting
                                        }
                                        onClick={() =>
                                            handleSubmit(
                                                false
                                            )
                                        }
                                    >
                                        {submitting
                                            ? "Submitting..."
                                            : "Submit Assessment"}

                                        {!submitting && (
                                            <FaCheckCircle />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                {/* ==================================================
                    RESULT
                ================================================== */}

                {step === "result" &&
                    result && (
                        <div className="public-card result-card">
                            <div className="result-icon">
                                <FaCheckCircle />
                            </div>

                            <span>
                                ASSESSMENT COMPLETE
                            </span>

                            <h1>
                                {result.result ||
                                    "Assessment Submitted"}
                            </h1>

                            <p>
                                Thank you,{" "}
                                <strong>
                                    {name}
                                </strong>
                                . Your assessment has
                                been securely recorded.
                            </p>

                            <div className="result-score">
                                <strong>
                                    {Number(
                                        result.percentage ||
                                        0
                                    ).toFixed(
                                        1
                                    )}
                                    %
                                </strong>

                                <span>
                                    {result.score ||
                                        0}{" "}
                                    /{" "}
                                    {result.max_score ||
                                        0}{" "}
                                    points
                                </span>
                            </div>

                            {result.participant_id && (
                                <div className="participant-id">
                                    <span>
                                        Participant ID
                                    </span>

                                    <strong>
                                        {
                                            result.participant_id
                                        }
                                    </strong>
                                </div>
                            )}

                            <div className="result-security">
                                <FaShieldAlt />

                                <div>
                                    <strong>
                                        Assessment
                                        recorded
                                        successfully
                                    </strong>

                                    <span>
                                        Your training
                                        report is
                                        available to the
                                        authorized
                                        Miarcus training
                                        team.
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
            </main>
        </div>
    );
}

export default PublicQuiz;