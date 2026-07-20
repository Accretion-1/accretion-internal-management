import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../contexts/StateContext';
import { fetchAdminGodownSlips, fetchUserGodownSlips, reviewGodownSlip, uploadGodownSlips } from '../services/godown-slip.service';
import { UploadCloud, FileImage, Search, Filter, Loader2, Calendar, MapPin, CheckCircle, Clock, X, Plus, Eye, AlignLeft, RotateCw, ArrowLeftRight } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { Modal } from '../components/Modal';
import apiHandler from '../store/api/apiHandler';
import { API_ENDPOINTS } from '../store/api/endpoints';

const FALLBACK_IMAGE = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20fill%3D%22%23f1f5f9%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%20dy%3D%2210.5%22%20font-weight%3D%22bold%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
const REVIEWABLE_CEMENT_TYPES = ['UNKNOWN', 'PPC', 'WPC', 'SUPER'];
const REVIEWABLE_STATUSES = ['review', 'verified', 'rejected'];
const NORMALIZED_IMAGE_TYPE = 'image/jpeg';
const NORMALIZED_IMAGE_EXTENSION = '.jpg';
const UPLOAD_MAX_IMAGE_SIDE = 1800;
const UPLOAD_TARGET_BYTES = 900 * 1024;
const UPLOAD_IMAGE_QUALITIES = [0.9, 0.86, 0.82, 0.78];

const normalizeDateInputValue = (value) => {
    if (!value) return '';
    const text = String(value).trim();
    const directDateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (directDateMatch) {
        return `${directDateMatch[1]}-${directDateMatch[2]}-${directDateMatch[3]}`;
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
        return text;
    }

    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const buildReviewFormFromSlip = (slip) => ({
    slip_number: slip?.slip_number || '',
    slip_date: normalizeDateInputValue(slip?.slip_date),
    godown_name: slip?.godown_name || '',
    cement_type: slip?.cement_type || 'UNKNOWN',
    bag_count: slip?.bag_count ?? '',
    vehicle_number: slip?.vehicle_number || '',
    dispatch_number: slip?.dispatch_number || '',
    customer_name: slip?.customer_name || '',
    destination: slip?.destination || '',
    status: slip?.status || 'review',
    remarks: slip?.remarks || '',
});
const normalizeReviewPayload = (form) => ({
    slip_number: form.slip_number.trim() || null,
    slip_date: normalizeDateInputValue(form.slip_date) || null,
    godown_name: form.godown_name.trim() || null,
    cement_type: form.cement_type || 'UNKNOWN',
    bag_count: form.bag_count === '' ? null : Number(form.bag_count),
    vehicle_number: form.vehicle_number.trim() || null,
    dispatch_number: form.dispatch_number.trim() || null,
    customer_name: form.customer_name.trim() || null,
    destination: form.destination.trim() || null,
    status: form.status,
    remarks: form.remarks.trim() || null,
});

const formatSlipDate = (value) => {
    if (!value) return '-';
    const text = String(value).trim();
    const directDateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (directDateMatch) {
        return `${directDateMatch[3]}/${directDateMatch[2]}/${directDateMatch[1]}`;
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
        return text;
    }

    return parsed.toLocaleDateString('en-GB');
};

const createImageElementFromFile = (file) => new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
    };

    image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Selected image format is not supported on this device.'));
    };

    image.src = objectUrl;
});

const canvasToJpegFile = (canvas, fileName, quality) => new Promise((resolve) => {
    canvas.toBlob((blob) => {
        resolve(
            blob
                ? new File([blob], fileName, { type: NORMALIZED_IMAGE_TYPE, lastModified: Date.now() })
                : null,
        );
    }, NORMALIZED_IMAGE_TYPE, quality);
});

const normalizeSlipImage = async (file) => {
    if (!file?.type?.startsWith('image/')) {
        throw new Error('Only image files can be uploaded.');
    }

    const canKeepOriginal =
        file.type === NORMALIZED_IMAGE_TYPE &&
        file.size <= UPLOAD_TARGET_BYTES;

    try {
        const image = await createImageElementFromFile(file);
        const longestSide = Math.max(image.naturalWidth || 0, image.naturalHeight || 0);
        const scale = longestSide > 0 ? Math.min(1, UPLOAD_MAX_IMAGE_SIDE / longestSide) : 1;

        if (canKeepOriginal && scale >= 1) {
            return file;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
        canvas.height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
            return file;
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const normalizedBaseName = (file.name?.replace(/\.[^.]+$/, '') || `slip-${Date.now()}`).trim();
        let bestFile = file;

        for (const quality of UPLOAD_IMAGE_QUALITIES) {
            const normalizedFile = await canvasToJpegFile(
                canvas,
                `${normalizedBaseName}${NORMALIZED_IMAGE_EXTENSION}`,
                quality,
            );
            if (!normalizedFile) continue;

            bestFile = normalizedFile;
            if (normalizedFile.size <= UPLOAD_TARGET_BYTES) {
                break;
            }
        }

        return bestFile;
    } catch (error) {
        throw new Error(error?.message || 'Unable to prepare the selected image.');
    }
};


export const GodownSlipsPage = () => {
    const { currentUser } = useAppState();
    const navigate = useNavigate();
    const isPrivileged = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
    const userPanelIds = new Set((currentUser?.panels || []).map((panel) => Number(panel.panel_id)));
    const canAccessTodos = isPrivileged || userPanelIds.has(3);
    const canAccessGodownSlips = isPrivileged || userPanelIds.has(8);

    const [slips, setSlips] = useState([]);
    const [locations, setLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [filters, setFilters] = useState({ date: '', location_id: '' });
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    // New states for enhanced UI
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewSlip, setPreviewSlip] = useState(null);
    const [reviewForm, setReviewForm] = useState(buildReviewFormFromSlip(null));
    const [isSavingReview, setIsSavingReview] = useState(false);
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [imageRotation, setImageRotation] = useState(0);

    // Upload ref for User view
    const fileInputRef = useRef(null);

    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [filters.date, filters.location_id]);

    useEffect(() => {
        loadSlips();
    }, [pagination.page, filters.date, filters.location_id, isPrivileged]);

    useEffect(() => {
        if (isPrivileged) {
            fetchLocations();
        }
    }, [isPrivileged]);

    useEffect(() => {
        setReviewForm(buildReviewFormFromSlip(previewSlip));
        setIsEditingReview(false);
        setImageRotation(0);
    }, [previewSlip]);

    const fetchLocations = async () => {
        try {
            const response = await apiHandler({
                method: 'GET',
                url: API_ENDPOINTS.LOCATIONS.BASE,
            });
            if (response?.data) setLocations(response.data);
        } catch (error) {
            console.error('Failed to load locations', error);
        }
    };

    const loadSlips = async () => {
        setIsLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (filters.date) params.date = filters.date;
            if (filters.location_id) params.location_id = filters.location_id;

            const response = isPrivileged
                ? await fetchAdminGodownSlips(params)
                : await fetchUserGodownSlips(params);

            setSlips(response?.data?.data || []);
            setPagination(prev => ({ ...prev, total: response?.data?.total || 0 }));
        } catch (error) {
            console.error('Error loading slips', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        if (selectedFiles.length + files.length > 10) {
            toast.error('You can only upload up to 10 slips at a time.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const preparedFiles = [];
        let unsupportedCount = 0;

        for (const file of files) {
            try {
                const normalizedFile = await normalizeSlipImage(file);
                preparedFiles.push({
                    file: normalizedFile,
                    originalName: file.name,
                    previewUrl: URL.createObjectURL(normalizedFile),
                });
            } catch (error) {
                unsupportedCount += 1;
                toast.error(`${file.name}: ${error.message}`);
            }
        }

        if (preparedFiles.length === 0) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setSelectedFiles(prev => [...prev, ...preparedFiles].slice(0, 10));
        if (unsupportedCount > 0) {
            toast(`${unsupportedCount} image${unsupportedCount > 1 ? 's were' : ' was'} skipped.`, {
                icon: '⚠️',
            });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeSelectedFile = (indexToRemove) => {
        setSelectedFiles(prev => {
            const newFiles = [...prev];
            URL.revokeObjectURL(newFiles[indexToRemove].previewUrl);
            newFiles.splice(indexToRemove, 1);
            return newFiles;
        });
    };

    const submitUpload = async () => {
        if (selectedFiles.length === 0) return;

        setIsUploading(true);
        const formData = new FormData();
        selectedFiles.forEach(item => {
            formData.append('slips', item.file);
        });

        try {
            await uploadGodownSlips(formData);
            // Cleanup object URLs
            selectedFiles.forEach(item => URL.revokeObjectURL(item.previewUrl));
            setSelectedFiles([]);
            await loadSlips();
        } catch (error) {
            console.error('Upload failed', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleReviewFieldChange = (field, value) => {
        setReviewForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmitReview = async () => {
        if (!previewSlip?.slip_id || !isPrivileged) return;

        setIsSavingReview(true);
        try {
            const response = await reviewGodownSlip(
                previewSlip.slip_id,
                normalizeReviewPayload(reviewForm),
            );
            const updatedSlip = response?.data || null;

            if (updatedSlip) {
                setSlips(prev => prev.map((slip) => (
                    slip.slip_id === updatedSlip.slip_id ? { ...slip, ...updatedSlip } : slip
                )));
                setPreviewSlip(null);
            } else {
                await loadSlips();
                setPreviewSlip(null);
            }
        } catch (error) {
            console.error('Review save failed', error);
        } finally {
            setIsSavingReview(false);
        }
    };

    const StatusBadge = ({ status }) => {
        if (status === 'verified') return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md"><CheckCircle className="w-3 h-3" /> Verified</span>;
        if (status === 'rejected') return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded-md">Rejected</span>;
        if (status === 'review') return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md"><Clock className="w-3 h-3" /> Review</span>;
        return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md"><Clock className="w-3 h-3" /> Pending</span>;
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-slate-900">Godown Slips</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage and view uploaded godown slips.</p>
                </div>

                {!isPrivileged && (
                    <div className="flex flex-wrap items-center gap-2">
                        {canAccessTodos && (
                            <button
                                type="button"
                                onClick={() => navigate('/todos')}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                <ArrowLeftRight className="w-4 h-4" />
                                Go to To-Dos
                            </button>
                        )}
                        {canAccessGodownSlips && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                Upload Slips
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Hidden file input for User role */}
            <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            {/* Admin Filters */}
            {isPrivileged && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 min-w-[200px]">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <input 
                            type="date" 
                            className="bg-transparent text-sm w-full outline-none"
                            value={filters.date}
                            onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 min-w-[200px]">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <select 
                            className="bg-transparent text-sm w-full outline-none text-slate-700 cursor-pointer"
                            value={filters.location_id}
                            onChange={(e) => setFilters(prev => ({ ...prev, location_id: e.target.value }))}
                        >
                            <option value="">Filter by Location</option>
                            {locations.map(loc => (
                                <option key={loc.location_id} value={loc.location_id}>
                                    {loc.district} {loc.godown ? `- ${loc.godown}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    {(filters.date || filters.location_id) && (
                        <button 
                            onClick={() => setFilters({ date: '', location_id: '' })}
                            className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors px-2"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            )}

            {/* Slips Content */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                    <p className="text-sm font-medium">Loading slips...</p>
                </div>
            ) : slips.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
                        <FileImage className="w-8 h-8" />
                    </div>
                    <h3 className="font-display font-bold text-slate-900 text-lg">No Slips Found</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                        {isPrivileged 
                            ? "Try adjusting your filters or wait for users to upload new godown slips." 
                            : "You haven't uploaded any godown slips yet. Click the upload button to get started."}
                    </p>
                </div>
            ) : isPrivileged ? (
                /* Admin Table View */
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">S.No.</th>
                                    <th className="px-6 py-4 font-semibold">Date</th>
                                    <th className="px-6 py-4 font-semibold">Location</th>
                                    <th className="px-6 py-4 font-semibold">Customer</th>
                                    <th className="px-6 py-4 font-semibold">Bags</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {slips.map((slip, index) => (
                                    <tr key={slip.slip_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {(pagination.page - 1) * pagination.limit + index + 1}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(slip.created_at).toLocaleString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {slip.district 
                                                ? `${slip.district}${slip.godown ? ` (${slip.godown})` : ''}` 
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{slip.customer_name || '-'}</td>
                                        <td className="px-6 py-4 text-slate-600 font-semibold">{slip.bag_count || '-'}</td>
                                        <td className="px-6 py-4"><StatusBadge status={slip.status} /></td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setPreviewSlip(slip)}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" /> View Slip
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Controls */}
                    {pagination.total > 0 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 text-sm">
                            <div className="text-slate-500">
                                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    disabled={pagination.page === 1}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <button 
                                    disabled={pagination.page * pagination.limit >= pagination.total}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* User Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {slips.map((slip, i) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={slip.slip_id} 
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer h-72 flex flex-col"
                            onClick={() => setPreviewSlip(slip)}
                        >
                            <div className="flex-1 bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
                                {slip.image_url ? (
                                    <img
                                        src={slip.image_url}
                                        alt="Godown Slip"
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = FALLBACK_IMAGE;
                                        }}
                                    />
                                ) : (
                                    <FileImage className="w-10 h-10 text-slate-300" />
                                )}
                                <div className="absolute top-3 right-3 shadow-sm rounded-md">
                                    <StatusBadge status={slip.status} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Upload Preview Modal */}
            <Modal
                isOpen={selectedFiles.length > 0}
                onClose={() => {
                    selectedFiles.forEach(item => URL.revokeObjectURL(item.previewUrl));
                    setSelectedFiles([]);
                }}
                title="Review Uploads"
                maxWidthClass="max-w-4xl"
                footerButtons={[
                    { 
                        id: 'cancel-upload-btn', 
                        label: 'Cancel', 
                        onClick: () => {
                            selectedFiles.forEach(item => URL.revokeObjectURL(item.previewUrl));
                            setSelectedFiles([]);
                        }
                    },
                    { 
                        id: 'submit-upload-btn', 
                        label: `Upload ${selectedFiles.length} Slip${selectedFiles.length > 1 ? 's' : ''}`, 
                        onClick: submitUpload,
                        variant: 'primary',
                        isLoading: isUploading
                    }
                ]}
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <p className="text-slate-500">You are about to upload {selectedFiles.length} image(s).</p>
                        {selectedFiles.length < 10 && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                                <Plus className="w-4 h-4" /> Add More
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1">
                        {selectedFiles.map((item, idx) => (
                            <div key={idx} className="relative aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
                                <img src={item.previewUrl} alt={`Selected ${idx}`} className="w-full h-full object-contain p-1" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                    <span className="text-[10px] text-white font-medium truncate drop-shadow-md">{item.file.name}</span>
                                </div>
                                <button
                                    onClick={() => removeSelectedFile(idx)}
                                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-rose-500 text-slate-700 hover:text-white rounded-full shadow-sm transition-colors cursor-pointer backdrop-blur-sm"
                                    title="Remove image"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Slip Details Modal */}
            <Modal
                isOpen={!!previewSlip}
                onClose={() => setPreviewSlip(null)}
                title="Slip Details"
                maxWidthClass="max-w-5xl"
                footerButtons={isPrivileged && previewSlip ? [
                    {
                        id: 'close-slip-preview-btn',
                        label: 'Close',
                        onClick: () => setPreviewSlip(null),
                    },
                    ...(isEditingReview ? [
                        {
                            id: 'cancel-slip-review-btn',
                            label: 'Cancel Edit',
                            onClick: () => {
                                setReviewForm(buildReviewFormFromSlip(previewSlip));
                                setIsEditingReview(false);
                            },
                        },
                        {
                            id: 'save-slip-review-btn',
                            label: 'Save Review',
                            onClick: handleSubmitReview,
                            variant: 'primary',
                            isLoading: isSavingReview,
                        },
                    ] : [
                        {
                            id: 'start-slip-review-btn',
                            label: 'Manual Review',
                            onClick: () => setIsEditingReview(true),
                            variant: 'primary',
                        },
                    ]),
                ] : undefined}
            >
                {previewSlip && (
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Image Section */}
                        <div className="relative flex-1 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center p-4 min-h-[400px] overflow-hidden">
                            {previewSlip.image_url ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                                        className="absolute right-6 top-6 z-10 inline-flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-white"
                                    >
                                        <RotateCw className="h-4 w-4" />
                                        Rotate
                                    </button>
                                    <img 
                                        src={previewSlip.image_url} 
                                        alt="Slip Full View" 
                                        className="w-full h-auto max-h-[75vh] object-contain rounded-lg shadow-sm transition-transform duration-200"
                                        style={{ transform: `rotate(${imageRotation}deg)` }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = FALLBACK_IMAGE;
                                        }}
                                    />
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                    <FileImage className="w-16 h-16" />
                                    <span className="text-sm font-semibold">No Image Uploaded</span>
                                </div>
                            )}
                        </div>

                        {/* Details Section */}
                        <div className="w-full md:w-[380px] shrink-0 flex flex-col gap-6 overflow-y-auto max-h-[75vh] pr-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg">
                                        Slip No. {previewSlip.slip_number || '-'}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">Record ID: {previewSlip.slip_id}</p>
                                    <p className="text-xs text-slate-500 mt-1">{new Date(previewSlip.created_at).toLocaleString()}</p>
                                </div>
                                <StatusBadge status={previewSlip.status} />
                            </div>

                            <div className="flex flex-col gap-4">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    <AlignLeft className="w-4 h-4" /> Slip Metadata
                                </h5>

                                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                                    <div>
                                        <span className="block text-xs text-slate-500 mb-1">Slip Number</span>
                                        <span className="font-semibold text-slate-900">{previewSlip.slip_number || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-500 mb-1">Slip Date</span>
                                        <span className="font-semibold text-slate-900">{formatSlipDate(previewSlip.slip_date)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-500 mb-1">Location details</span>
                                        <span className="font-semibold text-slate-900">
                                            {previewSlip.district 
                                                ? `${previewSlip.district} ${previewSlip.godown ? `(${previewSlip.godown})` : ''} ${previewSlip.sloc ? `[${previewSlip.sloc}]` : ''}`
                                                : previewSlip.location_id || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-500 mb-1">Vehicle Number</span>
                                        <span className="font-semibold text-slate-900">{previewSlip.vehicle_number || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-500 mb-1">Godown Name</span>
                                        <span className="font-semibold text-slate-900">{previewSlip.godown_name || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-500 mb-1">Cement Type</span>
                                        <span className="font-semibold text-slate-900">{previewSlip.cement_type !== 'UNKNOWN' ? previewSlip.cement_type : '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-500 mb-1">Bag Count</span>
                                        <span className="font-semibold text-slate-900">{previewSlip.bag_count || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-500 mb-1">Dispatch Number</span>
                                        <span className="font-semibold text-slate-900">{previewSlip.dispatch_number || '-'}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="block text-xs text-slate-500 mb-1">Customer Name</span>
                                        <span className="font-semibold text-slate-900">{previewSlip.customer_name || '-'}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="block text-xs text-slate-500 mb-1">Destination</span>
                                        <span className="font-semibold text-slate-900">{previewSlip.destination || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {isPrivileged && isEditingReview && (
                                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Manual Review
                                    </h5>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <label className="col-span-2">
                                            <span className="mb-1 block text-xs text-slate-500">Slip Number</span>
                                            <input
                                                type="text"
                                                value={reviewForm.slip_number}
                                                onChange={(event) => handleReviewFieldChange('slip_number', event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </label>
                                        <label className="col-span-2">
                                            <span className="mb-1 block text-xs text-slate-500">Slip Date</span>
                                            <input
                                                type="date"
                                                value={reviewForm.slip_date}
                                                onChange={(event) => handleReviewFieldChange('slip_date', event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </label>
                                        <label className="col-span-2">
                                            <span className="mb-1 block text-xs text-slate-500">Godown Name</span>
                                            <input
                                                type="text"
                                                value={reviewForm.godown_name}
                                                onChange={(event) => handleReviewFieldChange('godown_name', event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </label>
                                        <label>
                                            <span className="mb-1 block text-xs text-slate-500">Cement Type</span>
                                            <select
                                                value={reviewForm.cement_type}
                                                onChange={(event) => handleReviewFieldChange('cement_type', event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            >
                                                {REVIEWABLE_CEMENT_TYPES.map((option) => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label>
                                            <span className="mb-1 block text-xs text-slate-500">Bag Count</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={reviewForm.bag_count}
                                                onChange={(event) => handleReviewFieldChange('bag_count', event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </label>
                                        <label>
                                            <span className="mb-1 block text-xs text-slate-500">Vehicle Number</span>
                                            <input
                                                type="text"
                                                value={reviewForm.vehicle_number}
                                                onChange={(event) => handleReviewFieldChange('vehicle_number', event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </label>
                                        <label>
                                            <span className="mb-1 block text-xs text-slate-500">Dispatch Number</span>
                                            <input
                                                type="text"
                                                value={reviewForm.dispatch_number}
                                                onChange={(event) => handleReviewFieldChange('dispatch_number', event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </label>
                                        <label className="col-span-2">
                                            <span className="mb-1 block text-xs text-slate-500">Customer Name</span>
                                            <input
                                                type="text"
                                                value={reviewForm.customer_name}
                                                onChange={(event) => handleReviewFieldChange('customer_name', event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </label>
                                        <label className="col-span-2">
                                            <span className="mb-1 block text-xs text-slate-500">Destination</span>
                                            <input
                                                type="text"
                                                value={reviewForm.destination}
                                                onChange={(event) => handleReviewFieldChange('destination', event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </label>
                                        <label>
                                            <span className="mb-1 block text-xs text-slate-500">Status</span>
                                            <select
                                                value={reviewForm.status}
                                                onChange={(event) => handleReviewFieldChange('status', event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            >
                                                {REVIEWABLE_STATUSES.map((option) => (
                                                    <option key={option} value={option}>
                                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="col-span-2">
                                            <span className="mb-1 block text-xs text-slate-500">Remarks</span>
                                            <textarea
                                                rows={3}
                                                value={reviewForm.remarks}
                                                onChange={(event) => handleReviewFieldChange('remarks', event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                                placeholder="Add review notes"
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
