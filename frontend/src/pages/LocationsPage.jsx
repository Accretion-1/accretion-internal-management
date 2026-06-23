import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Search, Edit2, Trash2, Warehouse, Building2, PackageCheck, X } from 'lucide-react';
import { Modal } from '../components/Modal';
import apiHandler from '../store/api/apiHandler';
import { API_ENDPOINTS } from '../store/api/endpoints';

const EMPTY_FORM = {
    district: '',
    godown: '',
    sloc: '',
    cap: '',
    remark: '',
};

const normalizeLocationForm = (form) => ({
    district: form.district.trim() || null,
    godown: form.godown.trim() || null,
    sloc: form.sloc.trim() || null,
    cap: form.cap === '' ? null : Number(form.cap),
    remark: form.remark.trim() || null,
});

export const LocationsPage = () => {
    const [locations, setLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [activeLocation, setActiveLocation] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const isEditing = Boolean(activeLocation?.location_id);

    const filteredLocations = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return locations;

        return locations.filter((location) => {
            const searchableText = [
                location.district,
                location.godown,
                location.sloc,
                location.cap,
                location.remark,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchableText.includes(query);
        });
    }, [locations, searchQuery]);

    const fetchLocations = async () => {
        setIsLoading(true);
        try {
            const response = await apiHandler({
                method: 'GET',
                url: API_ENDPOINTS.LOCATIONS.BASE,
            });
            setLocations(Array.isArray(response?.data) ? response.data : []);
        }
        finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const validateForm = () => {
        const nextErrors = {};

        if (!form.district.trim()) {
            nextErrors.district = 'District is required.';
        }

        if (!form.godown.trim()) {
            nextErrors.godown = 'Godown is required.';
        }

        if (form.cap !== '' && Number(form.cap) < 0) {
            nextErrors.cap = 'Capacity must be zero or more.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const openCreateModal = () => {
        setActiveLocation(null);
        setForm(EMPTY_FORM);
        setErrors({});
        setIsFormOpen(true);
    };

    const openEditModal = (location) => {
        setActiveLocation(location);
        setForm({
            district: location.district || '',
            godown: location.godown || '',
            sloc: location.sloc ?? '',
            cap: location.cap ?? '',
            remark: location.remark || '',
        });
        setErrors({});
        setIsFormOpen(true);
    };

    const openDeleteModal = (location) => {
        setActiveLocation(location);
        setIsDeleteOpen(true);
    };

    const closeFormModal = () => {
        if (isSaving) return;
        setIsFormOpen(false);
        setActiveLocation(null);
        setErrors({});
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleSaveLocation = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            const payload = normalizeLocationForm(form);
            const response = await apiHandler({
                method: isEditing ? 'PUT' : 'POST',
                url: isEditing
                    ? API_ENDPOINTS.LOCATIONS.BY_ID(activeLocation.location_id)
                    : API_ENDPOINTS.LOCATIONS.BASE,
                data: payload,
            });

            const savedLocation = response?.data;
            if (savedLocation?.location_id) {
                setLocations((prev) => isEditing
                    ? prev.map((location) => location.location_id === savedLocation.location_id ? savedLocation : location)
                    : [savedLocation, ...prev]);
            }
            else {
                await fetchLocations();
            }

            setIsFormOpen(false);
            setActiveLocation(null);
            setErrors({});
        }
        finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLocation = async () => {
        if (!activeLocation?.location_id) return;

        setIsSaving(true);
        try {
            await apiHandler({
                method: 'DELETE',
                url: API_ENDPOINTS.LOCATIONS.BY_ID(activeLocation.location_id),
            });
            setLocations((prev) => prev.filter((location) => location.location_id !== activeLocation.location_id));
            setIsDeleteOpen(false);
            setActiveLocation(null);
        }
        finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-12 text-left font-sans">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                        <MapPin className="h-6 w-6 text-blue-600" />
                        Locations
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">Manage districts, godowns, SLOC values, and capacity details.</p>
                </div>

                <button
                    id="add-location-btn"
                    onClick={openCreateModal}
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4.5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700 hover:shadow-md"
                >
                    <Plus className="h-4.5 w-4.5" />
                    Add Location
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Locations</span>
                        <MapPin className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-slate-900">{locations.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Capacity</span>
                        <PackageCheck className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-slate-900">
                        {locations.reduce((sum, location) => sum + Number(location.cap || 0), 0)}
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Godowns</span>
                        <Warehouse className="h-5 w-5 text-violet-500" />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-slate-900">
                        {new Set(locations.map((location) => location.godown).filter(Boolean)).size}
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                        id="location-search-query"
                        type="text"
                        placeholder="Search by district, godown, SLOC, capacity, or remark..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left">
                        <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-5 py-4 font-extrabold">District</th>
                                <th className="px-5 py-4 font-extrabold">Godown</th>
                                <th className="px-5 py-4 font-extrabold">SLOC</th>
                                <th className="px-5 py-4 font-extrabold">Capacity</th>
                                <th className="px-5 py-4 font-extrabold">Remark</th>
                                <th className="px-5 py-4 text-right font-extrabold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-xs font-semibold text-slate-400">
                                        Loading locations...
                                    </td>
                                </tr>
                            ) : filteredLocations.length > 0 ? (
                                filteredLocations.map((location) => (
                                    <tr key={location.location_id} className="transition-colors hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                                    <Building2 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{location.district || '-'}</p>
                                                    <p className="text-[11px] text-slate-400">ID: {location.location_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 font-semibold text-slate-700">{location.godown || '-'}</td>
                                        <td className="px-5 py-4 font-mono text-xs font-bold text-slate-500">{location.sloc ?? '-'}</td>
                                        <td className="px-5 py-4 font-mono text-xs font-bold text-slate-700">{location.cap ?? '-'}</td>
                                        <td className="max-w-xs px-5 py-4 text-xs leading-relaxed text-slate-500">
                                            <span className="line-clamp-2">{location.remark || '-'}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    id={`edit-location-${location.location_id}`}
                                                    onClick={() => openEditModal(location)}
                                                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                                    title="Edit location"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    id={`delete-location-${location.location_id}`}
                                                    onClick={() => openDeleteModal(location)}
                                                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 transition-all hover:bg-rose-100 hover:text-rose-600"
                                                    title="Delete location"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <MapPin className="h-8 w-8" />
                                            <p className="text-sm font-semibold">No locations found.</p>
                                            <p className="text-xs">Add a new location to start managing godown data.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={closeFormModal}
                title={isEditing ? 'Update Location' : 'Add Location'}
                maxWidthClass="max-w-2xl"
                footerButtons={[
                    { label: 'Cancel', onClick: closeFormModal },
                    { label: isEditing ? 'Update Location' : 'Create Location', onClick: handleSaveLocation, variant: 'primary', isLoading: isSaving },
                ]}
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">District</label>
                        <input
                            value={form.district}
                            onChange={(event) => handleChange('district', event.target.value)}
                            className={`rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.district ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                            placeholder="Enter district"
                        />
                        {errors.district && <span className="text-xs text-rose-600">{errors.district}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Godown</label>
                        <input
                            value={form.godown}
                            onChange={(event) => handleChange('godown', event.target.value)}
                            className={`rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.godown ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                            placeholder="Enter godown"
                        />
                        {errors.godown && <span className="text-xs text-rose-600">{errors.godown}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">SLOC</label>
                        <input
                            type="text"
                            value={form.sloc}
                            onChange={(event) => handleChange('sloc', event.target.value)}
                            className={`rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.sloc ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                            placeholder="Enter SLOC"
                        />
                        {errors.sloc && <span className="text-xs text-rose-600">{errors.sloc}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Capacity</label>
                        <input
                            type="number"
                            min="0"
                            value={form.cap}
                            onChange={(event) => handleChange('cap', event.target.value)}
                            className={`rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.cap ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                            placeholder="Enter capacity"
                        />
                        {errors.cap && <span className="text-xs text-rose-600">{errors.cap}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-600">Remark</label>
                        <textarea
                            value={form.remark}
                            onChange={(event) => handleChange('remark', event.target.value)}
                            rows={4}
                            className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="Add optional notes"
                        />
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isDeleteOpen}
                onClose={() => !isSaving && setIsDeleteOpen(false)}
                title="Delete Location"
                maxWidthClass="max-w-md"
                footerButtons={[
                    { label: 'Cancel', onClick: () => setIsDeleteOpen(false) },
                    { label: 'Delete Location', onClick: handleDeleteLocation, variant: 'danger', isLoading: isSaving },
                ]}
            >
                <div className="flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700">
                    <X className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold">This will soft-delete the location.</p>
                        <p className="mt-1 text-xs leading-relaxed">
                            {activeLocation?.district || 'Selected location'} will be hidden from the active locations list.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
