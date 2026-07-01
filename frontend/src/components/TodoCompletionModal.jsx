import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle, FileVideo, ImageIcon, Loader2, ShieldCheck, ShieldX, Square, Trash2, X } from 'lucide-react';
import { Modal } from './Modal';
import apiHandler from '../store/api/apiHandler';
import { API_ENDPOINTS } from '../store/api/endpoints';
import { useAppState } from '../contexts/StateContext';


const INITIAL_FORM = {
    ppc: '',
    wp: '',
    super_stocks: '',
    cnt_ppc: '',
    cnt_wp: '',
    cnt_super: '',
    week: '',
    checkbox_items_response: [],
    remarks: '',
    photos: [],
    videos: [],
};

const PHOTO_CAPTURE_CONSTRAINTS = {
    facingMode: { ideal: 'environment' },
    width: { ideal: 4096 },
    height: { ideal: 2160 },
    aspectRatio: { ideal: 1.777777778 },
};

const getTaskTypeLabel = (type) => String(type || '').replace(/^\w/, (letter) => letter.toUpperCase());

const getCheckboxItems = (todo) => (
    Array.isArray(todo?.checkbox_items) ? todo.checkbox_items : []
).map((item, index) => ({
    key: item.key || `checkbox_${index + 1}`,
    label: item.label || '',
})).filter((item) => item.label);

const getFileKey = (file) => `${file.name}-${file.lastModified}-${file.size}`;

const OcrStatusBadge = ({ result, compact = false }) => {
    if (!result) return null;

    const baseClass = compact
        ? 'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold'
        : 'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold';

    if (result.status === 'checking') {
        return (
            <span className={`${baseClass} bg-blue-50 text-blue-700`}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                OCR checking...
            </span>
        );
    }

    if (result.status === 'matched') {
        return (
            <span className={`${baseClass} bg-emerald-50 text-emerald-700`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                OCR matched {result.score ?? 0}%
            </span>
        );
    }

    return (
        <span className={`${baseClass} bg-rose-50 text-rose-700`}>
            <ShieldX className="h-3.5 w-3.5" />
            OCR failed {result.score !== undefined ? `${result.score}%` : ''}
        </span>
    );
};

const FileList = ({ files, onRemove, ocrResults = {} }) => {
    if (!files.length) return null;

    return (
        <div className="mt-3 grid grid-cols-1 gap-2">
            {files.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-700">{file.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB</p>
                        <OcrStatusBadge result={ocrResults[getFileKey(file)]} compact />
                    </div>
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-rose-500 transition-all hover:bg-rose-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export const TodoCompletionModal = ({ isOpen, todo, onClose, onCompleted }) => {
    const { currentUser } = useAppState();
    const isUser = currentUser?.role?.toUpperCase() === 'USER';

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const [form, setForm] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState('form');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cameraAvailable, setCameraAvailable] = useState(true);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const [videoPreviews, setVideoPreviews] = useState([]);
    const [ocrResults, setOcrResults] = useState({});

    // New states for User role enhancements
    const [isCapturing, setIsCapturing] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);

    const todoType = todo?.type;
    const isMediaTodo = todoType === 'photo' || todoType === 'video';

    const selectedFiles = useMemo(() => {
        if (todoType === 'photo') return form.photos;
        if (todoType === 'video') return form.videos;
        return [];
    }, [form.photos, form.videos, todoType]);

    const stopCamera = () => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        setIsCameraReady(false);
        setIsRecording(false);
    };

    const startCamera = async () => {
        if (!isMediaTodo || !navigator.mediaDevices?.getUserMedia) {
            setCameraAvailable(false);
            return;
        }

        try {
            stopCamera();
            let stream;

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: PHOTO_CAPTURE_CONSTRAINTS,
                    audio: todoType === 'video',
                });
            } catch {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: PHOTO_CAPTURE_CONSTRAINTS,
                    audio: false,
                });
            }

            const [videoTrack] = stream.getVideoTracks();
            const capabilities = videoTrack?.getCapabilities?.() || {};
            const advancedConstraints = {};

            if (capabilities.focusMode?.includes?.('continuous')) {
                advancedConstraints.focusMode = 'continuous';
            }

            if (capabilities.exposureMode?.includes?.('continuous')) {
                advancedConstraints.exposureMode = 'continuous';
            }

            if (capabilities.whiteBalanceMode?.includes?.('continuous')) {
                advancedConstraints.whiteBalanceMode = 'continuous';
            }

            if (Object.keys(advancedConstraints).length) {
                await videoTrack.applyConstraints({ advanced: [advancedConstraints] }).catch(() => {});
            }

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setCameraAvailable(true);
            setIsCameraReady(true);
        } catch {
            setCameraAvailable(false);
            setIsCameraReady(false);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setIsCapturing(false);
            setPreviewFile(null);
            return undefined;
        }

        const checkboxItems = getCheckboxItems(todo);
        setForm({
            ...INITIAL_FORM,
            checkbox_items_response: checkboxItems.map((item) => ({
                ...item,
                response: true,
            })),
        });
        setErrors({});
        setStep('form');
        setOcrResults({});
        setIsCapturing(false);
        setPreviewFile(null);

        if (!isUser && (todo?.type === 'photo' || todo?.type === 'video')) {
            startCamera();
        } else {
            stopCamera();
            setCameraAvailable(true);
        }

        return () => stopCamera();
    }, [isOpen, todo?.todo_id, todo?.type, currentUser?.role]);

    useEffect(() => {
        if (isUser && isCapturing) {
            startCamera();
        }
        return () => {
            if (isUser && !isCapturing) {
                stopCamera();
            }
        };
    }, [isCapturing]);

    const handleOpenCamera = () => {
        setIsCapturing(true);
    };

    const handleCloseCamera = () => {
        stopCamera();
        setIsCapturing(false);
    };

    const handleKeepCaptured = () => {
        setPreviewFile(null);
    };

    const handleDiscardCaptured = () => {
        if (previewFile) {
            handleRemoveFile(previewFile.type === 'photo' ? 'photos' : 'videos', previewFile.index);
            setPreviewFile(null);
        }
    };

    useEffect(() => {
        const previews = form.photos.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }));

        setPhotoPreviews(previews);
        return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    }, [form.photos]);

    useEffect(() => {
        const previews = form.videos.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }));

        setVideoPreviews(previews);
        return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    }, [form.videos]);


    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleCheckboxResponseToggle = (key) => {
        setForm((prev) => ({
            ...prev,
            checkbox_items_response: prev.checkbox_items_response.map((item) => (
                item.key === key ? { ...item, response: !item.response } : item
            )),
        }));
        setErrors((prev) => ({ ...prev, checkbox_items_response: undefined }));
    };

    const addCapturedFile = (field, file) => {
        setForm((prev) => ({
            ...prev,
            [field]: [...prev[field], file],
        }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleRemoveFile = (field, index) => {
        setForm((prev) => ({
            ...prev,
            [field]: prev[field].filter((_, fileIndex) => fileIndex !== index),
        }));
        if (field === 'photos') {
            const file = form.photos[index];
            if (file) {
                const fileKey = getFileKey(file);
                setOcrResults((prev) => {
                    const nextResults = { ...prev };
                    delete nextResults[fileKey];
                    return nextResults;
                });
            }
        }
    };

    const verifyPhotoWithOcr = async (file) => {
        const fileKey = getFileKey(file);
        setOcrResults((prev) => ({
            ...prev,
            [fileKey]: { status: 'checking' },
        }));

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await apiHandler({
                method: 'POST',
                url: API_ENDPOINTS.OCR.VERIFY,
                data: formData,
                showNotification: false,
            });
            const data = response?.data || {};
            const score = data.best_match?.score ?? 0;
            const status = data.is_matched ? 'matched' : 'failed';

            setOcrResults((prev) => ({
                ...prev,
                [fileKey]: {
                    status,
                    score,
                    bestMatch: data.best_match || null,
                    message: data.is_matched
                        ? 'Image verified successfully.'
                        : `Image did not match required OCR score (${data.min_match_score || 70}%).`,
                },
            }));
        } catch (error) {
            const isNetworkError = !error?.status || error?.message === 'Network Error';
            setOcrResults((prev) => ({
                ...prev,
                [fileKey]: {
                    status: 'failed',
                    message: isNetworkError
                        ? 'OCR request failed. Please check network, API URL, CORS, or upload size limit.'
                        : error?.message || 'Unable to verify image with OCR.',
                },
            }));
        }
    };

    const createPhotoFile = async () => {
        if (!videoRef.current || !isCameraReady) return;

        const [videoTrack] = streamRef.current?.getVideoTracks?.() || [];

        if (videoTrack && 'ImageCapture' in window) {
            try {
                const imageCapture = new window.ImageCapture(videoTrack);
                const capabilities = await imageCapture.getPhotoCapabilities?.();
                const photoSettings = {};

                if (capabilities?.imageWidth?.max) {
                    photoSettings.imageWidth = capabilities.imageWidth.max;
                }

                if (capabilities?.imageHeight?.max) {
                    photoSettings.imageHeight = capabilities.imageHeight.max;
                }

                const blob = await imageCapture.takePhoto(photoSettings);
                if (blob?.size) {
                    return new File([blob], `photo-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
                }
            } catch {
                // Fallback to canvas capture below.
            }
        }

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const trackSettings = videoTrack?.getSettings?.() || {};
        canvas.width = Math.max(video.videoWidth || 0, trackSettings.width || 0, 1920);
        canvas.height = Math.max(video.videoHeight || 0, trackSettings.height || 0, 1080);
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob ? new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }) : null);
            }, 'image/jpeg', 0.98);
        });
    };

    const handleCapturePhoto = async () => {
        const file = await createPhotoFile();
        if (!file) return;

            const newIndex = form.photos.length;
            addCapturedFile('photos', file);
            verifyPhotoWithOcr(file);

            if (isUser) {
                stopCamera();
                setIsCapturing(false);
                const previewUrl = URL.createObjectURL(file);
                setPreviewFile({
                    file,
                    url: previewUrl,
                    type: 'photo',
                    index: newIndex,
                    isNew: true
                });
            }
    };

    const handleStartRecording = () => {
        if (!streamRef.current || isRecording) return;

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm';

        chunksRef.current = [];
        const recorder = new MediaRecorder(streamRef.current, { mimeType });

        recorder.ondataavailable = (event) => {
            if (event.data?.size) {
                chunksRef.current.push(event.data);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            if (blob.size) {
                const file = new File([blob], `video-${Date.now()}.webm`, { type: mimeType });
                const newIndex = form.videos.length;
                addCapturedFile('videos', file);

                if (isUser) {
                    stopCamera();
                    setIsCapturing(false);
                    const previewUrl = URL.createObjectURL(file);
                    setPreviewFile({
                        file,
                        url: previewUrl,
                        type: 'video',
                        index: newIndex,
                        isNew: true
                    });
                }
            }
            chunksRef.current = [];
            setIsRecording(false);
        };

        recorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
    };

    const handleStopRecording = () => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
    };

    const validate = () => {
        const nextErrors = {};
        const hasRemarks = Boolean(form.remarks.trim());
        const photoOcrStates = form.photos.map((file) => ocrResults[getFileKey(file)]?.status);
        const hasPendingPhotoOcr = photoOcrStates.includes('checking');
        const hasFailedPhotoOcr = photoOcrStates.includes('failed');
        const hasVerifiedPhoto = photoOcrStates.includes('matched');

        if (todoType === 'stock') {
            if (form.ppc === '') nextErrors.ppc = 'PPC is required.';
            if (form.wp === '') nextErrors.wp = 'WP is required.';
            if (form.super_stocks === '') nextErrors.super_stocks = 'Super stock value is required.';
            if (form.cnt_ppc === '') nextErrors.cnt_ppc = 'CNT PPC is required.';
            if (form.cnt_wp === '') nextErrors.cnt_wp = 'CNT WP is required.';
            if (form.cnt_super === '') nextErrors.cnt_super = 'CNT Super is required.';
            if (!form.week.trim()) nextErrors.week = 'Week is required.';
        }

        if (todoType === 'checkbox' && !form.checkbox_items_response.length) {
            nextErrors.checkbox_items_response = 'No checkbox items are configured for this task.';
        }

        if (todoType === 'photo') {
            if (!form.photos.length && !hasRemarks) {
                nextErrors.photos = 'Capture a photo or add remarks.';
                nextErrors.remarks = 'Remarks are required when no photo is captured.';
            } else if (hasPendingPhotoOcr) {
                nextErrors.photos = 'Please wait until OCR verification is complete.';
            } else if (hasFailedPhotoOcr) {
                nextErrors.photos = 'Captured photo did not pass OCR. Remove it, capture another photo, or submit with remarks only.';
            } else if (form.photos.length && !hasVerifiedPhoto) {
                nextErrors.photos = 'Captured photo must pass OCR verification.';
            }
        }

        if (todoType === 'video' && !form.videos.length) {
            nextErrors.videos = 'Record at least one video.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleReview = () => {
        if (!validate()) return;
        setStep('review');
    };

    const buildFormData = () => {
        const formData = new FormData();

        if (form.remarks.trim()) {
            formData.append('remarks', form.remarks.trim());
        }

        if (todoType === 'stock') {
            formData.append('ppc', form.ppc);
            formData.append('wp', form.wp);
            formData.append('super_stocks', form.super_stocks);
            formData.append('cnt_ppc', form.cnt_ppc);
            formData.append('cnt_wp', form.cnt_wp);
            formData.append('cnt_super', form.cnt_super);
            formData.append('week', form.week.trim());
        }

        if (todoType === 'checkbox') {
            formData.append('checkbox_items_response', JSON.stringify(form.checkbox_items_response));
        }

        if (todoType === 'photo') {
            form.photos.forEach((file) => formData.append('photos', file));
        }

        if (todoType === 'video') {
            form.videos.forEach((file) => formData.append('videos', file));
        }

        return formData;
    };

    const handleSubmit = async () => {
        if (!todo || !validate()) return;

        setIsSubmitting(true);
        try {
            const response = await apiHandler({
                method: 'POST',
                url: API_ENDPOINTS.TODOS.COMPLETE(todo.todo_id),
                data: buildFormData(),
            });

            onCompleted?.(response?.data);
            onClose?.();
        } finally {
            setIsSubmitting(false);
        }
    };

    const footerButtons = step === 'review'
        ? [
            { label: 'Back', onClick: () => setStep('form') },
            { label: 'Submit Completion', onClick: handleSubmit, variant: 'primary', isLoading: isSubmitting },
        ]
        : [
            { label: 'Cancel', onClick: onClose },
            { label: 'Review Submission', onClick: handleReview, variant: 'primary' },
        ];

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={step === 'review' ? 'Review Task Completion' : 'Complete Task'}
                maxWidthClass="max-w-2xl"
                footerButtons={footerButtons}
            >
                <div className="flex flex-col gap-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Task</p>
                        <h3 className="mt-1 text-base font-extrabold text-slate-900">{todo?.title || '-'}</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Type: {getTaskTypeLabel(todoType)}</p>
                    </div>

                    {isMediaTodo && !cameraAvailable && (
                        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <p className="text-xs font-semibold">
                                Camera device was not detected or permission was blocked. Please connect/allow a camera, then retry.
                            </p>
                            <button
                                type="button"
                                onClick={startCamera}
                                className="ml-auto rounded-lg bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900 transition-all hover:bg-amber-200"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {step === 'form' ? (
                        <>
                            {todoType === 'stock' && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    {[
                                        ['ppc', 'PPC'],
                                        ['wp', 'WP'],
                                        ['super_stocks', 'Super Stocks'],
                                        ['cnt_ppc', 'CNT PPC'],
                                        ['cnt_wp', 'CNT WP'],
                                        ['cnt_super', 'CNT Super'],
                                        ['week', 'Week'],
                                    ].map(([field, label]) => (
                                        <div key={field} className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-600">{label}</label>
                                            <input
                                                type={field === 'week' ? 'text' : 'number'}
                                                min={field === 'week' ? undefined : '0'}
                                                step={field === 'week' ? undefined : '0.01'}
                                                value={form[field]}
                                                onChange={(event) => handleChange(field, event.target.value)}
                                                placeholder={field === 'week' ? 'Enter week' : undefined}
                                                className={`rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors[field] ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                                            />
                                            {errors[field] && <span className="text-xs text-rose-600">{errors[field]}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {todoType === 'checkbox' && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <label className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                                        Checklist Items
                                    </label>
                                    <div className="grid gap-2">
                                        {form.checkbox_items_response.map((item) => (
                                            <label
                                                key={item.key}
                                                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${item.response ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
                                            >
                                                <span>{item.label}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(item.response)}
                                                    onChange={() => handleCheckboxResponseToggle(item.key)}
                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-[11px] font-semibold text-slate-400">All items are selected by default. Uncheck only if not completed.</p>
                                    {errors.checkbox_items_response && <span className="mt-2 block text-xs text-rose-600">{errors.checkbox_items_response}</span>}
                                </div>
                            )}

                            {todoType === 'photo' && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <label className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <ImageIcon className="h-4 w-4 text-blue-600" />
                                        Capture Photos
                                    </label>
                                    
                                    {isUser ? (
                                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                                <Camera className="h-5 w-5" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleOpenCamera}
                                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white transition-all hover:bg-blue-700"
                                            >
                                                <Camera className="h-4 w-4" />
                                                {form.photos.length > 0 ? 'Capture Another Photo' : 'Open Camera'}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
                                                <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleCapturePhoto}
                                                disabled={!isCameraReady}
                                                className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Camera className="h-4 w-4" />
                                                Capture Photo
                                            </button>
                                        </>
                                    )}

                                    {errors.photos && <span className="mt-2 block text-xs text-rose-600">{errors.photos}</span>}
                                    {photoPreviews.length > 0 && (
                                        <div className="mt-3 grid grid-cols-2 gap-3">
                                            {photoPreviews.map((preview, index) => (
                                                <div
                                                    key={preview.url}
                                                    className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-white ${isUser ? 'cursor-pointer' : ''}`}
                                                    onClick={() => {
                                                        if (isUser) {
                                                            setPreviewFile({
                                                                file: preview.file,
                                                                url: preview.url,
                                                                type: 'photo',
                                                                index,
                                                                isNew: false
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <img src={preview.url} alt={preview.file.name} className="aspect-video w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveFile('photos', index);
                                                        }}
                                                        className="absolute right-2 top-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/90 text-rose-500 shadow-sm transition-all hover:bg-rose-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                    <div className="p-2">
                                                        <p className="truncate text-[11px] font-bold text-slate-700">{preview.file.name}</p>
                                                        <OcrStatusBadge result={ocrResults[getFileKey(preview.file)]} compact />
                                                        {ocrResults[getFileKey(preview.file)]?.message && (
                                                            <p className="mt-1 text-[10px] font-semibold text-slate-500">
                                                                {ocrResults[getFileKey(preview.file)].message}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <FileList files={form.photos} onRemove={(index) => handleRemoveFile('photos', index)} ocrResults={ocrResults} />
                                </div>
                            )}

                            {todoType === 'video' && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <label className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <FileVideo className="h-4 w-4 text-blue-600" />
                                        Record Videos
                                    </label>

                                    {isUser ? (
                                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                                <FileVideo className="h-5 w-5" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleOpenCamera}
                                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white transition-all hover:bg-blue-700"
                                            >
                                                <Camera className="h-4 w-4" />
                                                {form.videos.length > 0 ? 'Record Another Video' : 'Open Camera'}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
                                                <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={isRecording ? handleStopRecording : handleStartRecording}
                                                disabled={!isCameraReady}
                                                className={`mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isRecording ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                            >
                                                {isRecording ? <Square className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                                                {isRecording ? 'Stop Recording' : 'Start Recording'}
                                            </button>
                                        </>
                                    )}

                                    {errors.videos && <span className="mt-2 block text-xs text-rose-600">{errors.videos}</span>}
                                    {videoPreviews.length > 0 && (
                                        <div className="mt-3 grid grid-cols-1 gap-3">
                                            {videoPreviews.map((preview, index) => (
                                                <div key={preview.url} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                    <div
                                                        className={`relative ${isUser ? 'cursor-pointer' : ''}`}
                                                        onClick={() => {
                                                            if (isUser) {
                                                                setPreviewFile({
                                                                    file: preview.file,
                                                                    url: preview.url,
                                                                    type: 'video',
                                                                    index,
                                                                    isNew: false
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <video src={preview.url} controls={!isUser} playsInline className="aspect-video w-full bg-black object-contain pointer-events-none" />
                                                    </div>
                                                    <div className="flex items-center justify-between gap-3 p-2">
                                                        <p className="truncate text-[11px] font-bold text-slate-700">{preview.file.name}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFile('videos', index)}
                                                            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-rose-500 transition-all hover:bg-rose-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <FileList files={form.videos} onRemove={(index) => handleRemoveFile('videos', index)} />
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-600">Remarks</label>
                                <textarea
                                    value={form.remarks}
                                    onChange={(event) => handleChange('remarks', event.target.value)}
                                    rows={3}
                                    placeholder="Add optional remarks"
                                    className={`resize-none rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.remarks ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                                />
                                {errors.remarks && <span className="text-xs text-rose-600">{errors.remarks}</span>}
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                                <CheckCircle className="h-5 w-5" />
                                <p className="text-sm font-bold">Please review all fields before final submit.</p>
                            </div>

                            {todoType === 'stock' && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-400">PPC</p><p className="font-bold text-slate-900">{form.ppc}</p></div>
                                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-400">WP</p><p className="font-bold text-slate-900">{form.wp}</p></div>
                                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-400">Super Stocks</p><p className="font-bold text-slate-900">{form.super_stocks}</p></div>
                                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-400">CNT PPC</p><p className="font-bold text-slate-900">{form.cnt_ppc}</p></div>
                                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-400">CNT WP</p><p className="font-bold text-slate-900">{form.cnt_wp}</p></div>
                                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-400">CNT Super</p><p className="font-bold text-slate-900">{form.cnt_super}</p></div>
                                    <div className="rounded-xl bg-slate-50 p-3 sm:col-span-3"><p className="text-xs font-bold text-slate-400">Week</p><p className="font-bold text-slate-900">{form.week}</p></div>
                                </div>
                            )}

                            {todoType === 'checkbox' && (
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs font-bold text-slate-400">Checklist Responses</p>
                                    <div className="mt-2 grid gap-2">
                                        {form.checkbox_items_response.map((item) => (
                                            <div key={item.key} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700">
                                                <span>{item.label}</span>
                                                <span className={item.response ? 'text-emerald-600' : 'text-rose-600'}>
                                                    {item.response ? 'Yes' : 'No'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isMediaTodo && (
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs font-bold text-slate-400">Files</p>
                                    {todoType === 'photo' && (
                                        <div className="mt-3 grid grid-cols-2 gap-3">
                                            {photoPreviews.map((preview, index) => (
                                                <img
                                                    key={preview.url}
                                                    src={preview.url}
                                                    alt={preview.file.name}
                                                    className={`aspect-video w-full rounded-xl border border-slate-200 object-cover ${isUser ? 'cursor-pointer' : ''}`}
                                                    onClick={() => {
                                                        if (isUser) {
                                                            setPreviewFile({
                                                                file: preview.file,
                                                                url: preview.url,
                                                                type: 'photo',
                                                                index,
                                                                isNew: false
                                                            });
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {todoType === 'video' && (
                                        <div className="mt-3 grid grid-cols-1 gap-3">
                                            {videoPreviews.map((preview, index) => (
                                                <div
                                                    key={preview.url}
                                                    className={isUser ? 'cursor-pointer' : ''}
                                                    onClick={() => {
                                                        if (isUser) {
                                                            setPreviewFile({
                                                                file: preview.file,
                                                                url: preview.url,
                                                                type: 'video',
                                                                index,
                                                                isNew: false
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <video src={preview.url} controls={!isUser} playsInline className="aspect-video w-full rounded-xl border border-slate-200 bg-black object-contain pointer-events-none" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <ul className="mt-3 list-disc space-y-1 pl-4 text-xs font-semibold text-slate-700">
                                        {selectedFiles.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}
                                    </ul>
                                </div>
                            )}

                            <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs font-bold text-slate-400">Remarks</p>
                                <p className="text-sm font-semibold text-slate-800">{form.remarks || '-'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Full-screen Camera viewfinder for USER role */}
            {isUser && isCapturing && (
                <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                        <span className="text-sm font-extrabold uppercase tracking-wider">
                            {todoType === 'photo' ? 'Capture Photo' : 'Record Video'}
                        </span>
                        <button
                            type="button"
                            onClick={handleCloseCamera}
                            className="rounded-full bg-white/15 p-2 text-white hover:bg-white/25 transition-all cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Viewfinder Video */}
                    <div className="flex-1 flex items-center justify-center overflow-hidden relative">
                        <video
                            ref={videoRef}
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />

                        {!isCameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                            </div>
                        )}
                    </div>

                    {/* Footer Controls */}
                    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-t from-black/90 to-transparent gap-4">
                        {todoType === 'video' && isRecording && (
                            <div className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white border border-rose-500/30 animate-pulse">
                                Recording...
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-8 w-full">
                            {todoType === 'photo' ? (
                                <button
                                    type="button"
                                    onClick={handleCapturePhoto}
                                    disabled={!isCameraReady}
                                    className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/10 active:bg-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="h-14 w-14 rounded-full bg-white" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                                    disabled={!isCameraReady}
                                    className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/10 active:bg-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className={`h-14 w-14 transition-all ${isRecording ? 'rounded-lg bg-rose-600 scale-75' : 'rounded-full bg-rose-600'}`} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal for USER role */}
            {isUser && previewFile && (
                <Modal
                    isOpen={Boolean(previewFile)}
                    onClose={() => setPreviewFile(null)}
                    title={previewFile.type === 'photo' ? 'Photo Preview' : 'Video Preview'}
                    maxWidthClass="max-w-2xl"
                    footerButtons={
                        previewFile.isNew
                            ? [
                                  {
                                      label: 'Retake / Discard',
                                      onClick: handleDiscardCaptured,
                                      variant: 'danger',
                                  },
                                  {
                                      label: 'Keep / Use',
                                      onClick: handleKeepCaptured,
                                      variant: 'primary',
                                  },
                              ]
                            : [
                                  {
                                      label: 'Close',
                                      onClick: () => setPreviewFile(null),
                                  },
                                  {
                                      label: 'Remove / Delete',
                                      onClick: handleDiscardCaptured,
                                      variant: 'danger',
                                  },
                              ]
                    }
                >
                    <div className="flex justify-center overflow-hidden rounded-2xl bg-slate-950 p-2">
                        {previewFile.type === 'video' ? (
                            <video src={previewFile.url} controls playsInline className="max-h-[60vh] w-full object-contain" />
                        ) : (
                            <img src={previewFile.url} alt="Captured preview" className="max-h-[60vh] object-contain" />
                        )}
                    </div>
                </Modal>
            )}
        </>
    );
};
