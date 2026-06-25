import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle, FileVideo, ImageIcon, Square, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import apiHandler from '../store/api/apiHandler';
import { API_ENDPOINTS } from '../store/api/endpoints';

const INITIAL_FORM = {
    ppc: '',
    wp: '',
    super_stocks: '',
    checkbox_status: '',
    remarks: '',
    photos: [],
    videos: [],
};

const getTaskTypeLabel = (type) => String(type || '').replace(/^\w/, (letter) => letter.toUpperCase());

const FileList = ({ files, onRemove }) => {
    if (!files.length) return null;

    return (
        <div className="mt-3 grid grid-cols-1 gap-2">
            {files.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-700">{file.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB</p>
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
                    video: { facingMode: { ideal: 'environment' } },
                    audio: todoType === 'video',
                });
            } catch {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' } },
                    audio: false,
                });
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
            return undefined;
        }

        setForm(INITIAL_FORM);
        setErrors({});
        setStep('form');

        if (todo?.type === 'photo' || todo?.type === 'video') {
            startCamera();
        } else {
            stopCamera();
            setCameraAvailable(true);
        }

        return () => stopCamera();
    }, [isOpen, todo?.todo_id, todo?.type]);

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
    };

    const handleCapturePhoto = () => {
        if (!videoRef.current || !isCameraReady) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            addCapturedFile('photos', file);
        }, 'image/jpeg', 0.92);
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
                addCapturedFile('videos', file);
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

        if (todoType === 'stock') {
            if (form.ppc === '') nextErrors.ppc = 'PPC is required.';
            if (form.wp === '') nextErrors.wp = 'WP is required.';
            if (form.super_stocks === '') nextErrors.super_stocks = 'Super stock value is required.';
        }

        if (todoType === 'checkbox' && form.checkbox_status === '') {
            nextErrors.checkbox_status = 'Checkbox status is required.';
        }

        if (todoType === 'photo' && !form.photos.length) {
            nextErrors.photos = 'Capture at least one photo.';
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
        }

        if (todoType === 'checkbox') {
            formData.append('checkbox_status', form.checkbox_status);
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
                                ].map(([field, label]) => (
                                    <div key={field} className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-600">{label}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form[field]}
                                            onChange={(event) => handleChange(field, event.target.value)}
                                            className={`rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors[field] ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                                        />
                                        {errors[field] && <span className="text-xs text-rose-600">{errors[field]}</span>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {todoType === 'checkbox' && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-600">Checkbox Status</label>
                                <select
                                    value={form.checkbox_status}
                                    onChange={(event) => handleChange('checkbox_status', event.target.value)}
                                    className={`cursor-pointer rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.checkbox_status ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                                >
                                    <option value="">Select status</option>
                                    <option value="true">Checked / Done</option>
                                    <option value="false">Unchecked / Not Done</option>
                                </select>
                                {errors.checkbox_status && <span className="text-xs text-rose-600">{errors.checkbox_status}</span>}
                            </div>
                        )}

                        {todoType === 'photo' && (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <label className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <ImageIcon className="h-4 w-4 text-blue-600" />
                                    Capture Photos
                                </label>
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
                                {errors.photos && <span className="mt-2 block text-xs text-rose-600">{errors.photos}</span>}
                                {photoPreviews.length > 0 && (
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        {photoPreviews.map((preview, index) => (
                                            <div key={preview.url} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                <img src={preview.url} alt={preview.file.name} className="aspect-video w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile('photos', index)}
                                                    className="absolute right-2 top-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/90 text-rose-500 shadow-sm transition-all hover:bg-rose-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <div className="p-2">
                                                    <p className="truncate text-[11px] font-bold text-slate-700">{preview.file.name}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <FileList files={form.photos} onRemove={(index) => handleRemoveFile('photos', index)} />
                            </div>
                        )}

                        {todoType === 'video' && (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <label className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <FileVideo className="h-4 w-4 text-blue-600" />
                                    Record Videos
                                </label>
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
                                {errors.videos && <span className="mt-2 block text-xs text-rose-600">{errors.videos}</span>}
                                {videoPreviews.length > 0 && (
                                    <div className="mt-3 grid grid-cols-1 gap-3">
                                        {videoPreviews.map((preview, index) => (
                                            <div key={preview.url} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                <video src={preview.url} controls playsInline className="aspect-video w-full bg-black object-contain" />
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
                                className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
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
                            </div>
                        )}

                        {todoType === 'checkbox' && (
                            <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs font-bold text-slate-400">Checkbox Status</p>
                                <p className="font-bold text-slate-900">{form.checkbox_status === 'true' ? 'Checked / Done' : 'Unchecked / Not Done'}</p>
                            </div>
                        )}

                        {isMediaTodo && (
                            <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs font-bold text-slate-400">Files</p>
                                {todoType === 'photo' && (
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        {photoPreviews.map((preview) => (
                                            <img key={preview.url} src={preview.url} alt={preview.file.name} className="aspect-video w-full rounded-xl border border-slate-200 object-cover" />
                                        ))}
                                    </div>
                                )}
                                {todoType === 'video' && (
                                    <div className="mt-3 grid grid-cols-1 gap-3">
                                        {videoPreviews.map((preview) => (
                                            <video key={preview.url} src={preview.url} controls playsInline className="aspect-video w-full rounded-xl border border-slate-200 bg-black object-contain" />
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
    );
};
