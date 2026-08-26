import { useEffect, useState } from "react";
import axios from "axios";
import { FaCamera, FaCloudUploadAlt, FaCheckCircle, FaImages, FaTimes } from "react-icons/fa";
import "../styles/Gallery.css";

export default function GalleryMobile() {
    const token = window.location.pathname.split("/").filter(Boolean).pop() || "";
    const [validating, setValidating] = useState(true);
    const [valid, setValid] = useState(false);
    const [error, setError] = useState("");
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(null);

    useEffect(() => {
        let active = true;
        axios.get(`/api/gallery/mobile/${token}`)
            .then(() => active && setValid(true))
            .catch(err => active && setError(err?.response?.data?.message || "This upload link is no longer available."))
            .finally(() => active && setValidating(false));
        return () => { active = false; };
    }, [token]);

    useEffect(() => {
        if (!file) {
            setPreview("");
            return undefined;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const chooseFile = (event) => {
        const selected = event.target.files?.[0];
        if (!selected) return;
        if (selected.size > 25 * 1024 * 1024) {
            setError("The file must be 25 MB or smaller.");
            return;
        }
        setError("");
        setFile(selected);
    };

    const upload = async (event) => {
        event.preventDefault();
        if (!file) {
            setError("Please choose a file first.");
            return;
        }
        setUploading(true);
        setError("");
        try {
            const data = new FormData();
            data.append("photo", file);
            data.append("category", category);
            data.append("description", description);
            const response = await axios.post(`/api/gallery/mobile/${token}/upload`, data, { headers: { "Content-Type": "multipart/form-data" } });
            setUploaded(response.data.photo);
        } catch (err) {
            setError(err?.response?.data?.message || "Unable to upload file.");
        } finally {
            setUploading(false);
        }
    };

    if (validating) {
        return <div className="gallery-mobile-page"><div className="mobile-card"><FaImages className="mobile-logo" /><h1>MIARCUS Gallery</h1><p>Checking your secure upload link...</p></div></div>;
    }

    if (!valid) {
        return <div className="gallery-mobile-page"><div className="mobile-card"><FaTimes className="mobile-error-icon" /><h1>Upload link unavailable</h1><p>{error || "This link has expired or was already used."}</p></div></div>;
    }

    if (uploaded) {
        return <div className="gallery-mobile-page"><div className="mobile-card success-card"><FaCheckCircle className="mobile-success-icon" /><h1>Photo uploaded</h1><p>Your photo is now available in the Miarcus Gallery.</p><img className="mobile-result-image" src={preview} alt="Uploaded" /><button className="mobile-btn" onClick={() => window.location.reload()}>Upload another</button></div></div>;
    }

    return (
        <div className="gallery-mobile-page">
            <form className="mobile-card" onSubmit={upload}>
                <div className="mobile-brand"><FaImages /><span>MIARCUS</span></div>
                <h1>Gallery Upload</h1>
                <p>Upload a photo, video, audio file, PDF or supported document.</p>

                <label className="mobile-camera-box">
                    <input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip" onChange={chooseFile} />
                    {preview ? (
                        file?.type?.startsWith("image/") ? <img src={preview} alt="Preview" /> :
                        file?.type?.startsWith("video/") ? <video src={preview} controls playsInline /> :
                        file?.type?.startsWith("audio/") ? <audio src={preview} controls /> :
                        <div className="mobile-file-preview">{file?.name}</div>
                    ) : <><FaCamera /><strong>Choose File</strong><span>or take a photo / choose from device</span></>}
                </label>

                <label className="mobile-field">Category<input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Optional" maxLength={100} /></label>
                <label className="mobile-field">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" maxLength={2000} /></label>
                {error && <div className="mobile-error">{error}</div>}
                <button className="mobile-btn" type="submit" disabled={uploading || !file}><FaCloudUploadAlt /> {uploading ? "Uploading..." : "Upload Photo"}</button>
                <small>This secure link can be used once and expires automatically. Maximum file size: 25 MB.</small>
            </form>
        </div>
    );
}
