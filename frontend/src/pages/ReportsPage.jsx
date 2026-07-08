import React, { useEffect, useMemo, useState } from 'react';
import { BarChart4, CalendarDays, ChevronDown, ClipboardList, Download, FileSpreadsheet, Filter, Loader2, RefreshCw, Search, UserRound } from 'lucide-react';
import apiHandler from '../store/api/apiHandler';
import { API_ENDPOINTS } from '../store/api/endpoints';
import { Modal } from '../components/Modal';

const STOCK_FIELDS = [
  ['ppc', 'PPC'],
  ['wp', 'WP'],
  ['super', 'Super'],
  ['cnt_ppc', 'CNT PPC'],
  ['cnt_wp', 'CNT WP'],
  ['cnt_super', 'CNT Super'],
  ['damage_ppc', 'Damage PPC'],
  ['damage_wp', 'Damage WP'],
  ['damage_super', 'Damage Super'],
];

const QUICK_EXPORT_HEADERS = [
  'Location',
  'PPC (In MT)',
  'WP (In MT)',
  'Super (In MT)',
  'Total Stock Quantity (In MT)',
  'CNT PPC (In MT)',
  'CNT WP (In MT)',
  'CNT Super (In MT)',
  'Total Stock Quantity of CNT (In MT)',
  'Damage PPC (In MT)',
  'Damage WP (In MT)',
  'Damage Super (In MT)',
  'Total Stock Quantity of Damage (In MT)',
  'Completion Date & Time',
  'Remarks',
];

const MAIN_EXPORT_HEADERS = [
  'Completion Date',
  'Completed At',
  'Location',
  'PPC (In MT)',
  'WP (In MT)',
  'Super (In MT)',
  'Total Stock Quantity (In MT)',
  'CNT PPC (In MT)',
  'CNT WP (In MT)',
  'CNT Super (In MT)',
  'Total Stock Quantity of CNT (In MT)',
  'Damage PPC (In MT)',
  'Damage WP (In MT)',
  'Damage Super (In MT)',
  'Total Stock Quantity of Damage (In MT)',
  'Completed By',
  'Phone Number',
  'Task Name',
  'Remarks',
];

const formatLocalDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getToday = () => formatLocalDateInput(new Date());

const getMonthStart = () => {
  const date = new Date();
  date.setDate(1);
  return formatLocalDateInput(date);
};

const getLocationLabel = (location) => {
  if (!location) return '-';
  return [location.district, location.godown, location.sloc].filter(Boolean).join(' • ') || '-';
};

const getTodoLocations = (todo) => (
  Array.isArray(todo.locations) && todo.locations.length
    ? todo.locations
    : [todo.location].filter(Boolean)
);

const hasAllLocations = (locationIds = []) => locationIds.includes('all');

const normalizeLocationIds = (locationIds = []) => {
  const nextLocationIds = Array.isArray(locationIds) ? locationIds.map(String).filter(Boolean) : [];
  return nextLocationIds.includes('all') || nextLocationIds.length === 0 ? ['all'] : nextLocationIds;
};

const getSelectedLocationsLabel = (locations = [], locationIds = []) => {
  if (hasAllLocations(locationIds)) return 'All locations';

  const selectedLocations = locations.filter((location) => locationIds.includes(String(location.location_id)));
  if (selectedLocations.length === 0) return 'Select locations';
  if (selectedLocations.length === 1) return getLocationLabel(selectedLocations[0]);

  return `${selectedLocations.length} locations selected`;
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getRecordStockTotal = (record) => (
  record.stock_item_sections || []
).reduce((sectionTotal, section) => (
  sectionTotal + (['ppc', 'wp', 'super'].includes(section.stock_name)
    ? (section.items || []).reduce((itemTotal, item) => itemTotal + Number(item.stock_value || 0), 0)
    : 0)
), 0);

const getRecordStockCategoryTotal = (record, predicate) => (
  record.stock_item_sections || []
).reduce((sectionTotal, section) => (
  sectionTotal + (predicate(section.stock_name)
    ? (section.items || []).reduce((itemTotal, item) => itemTotal + Number(item.stock_value || 0), 0)
    : 0)
), 0);

const getRecordCntStockTotal = (record) => getRecordStockCategoryTotal(record, (stockName) => stockName?.startsWith('cnt_'));

const getRecordDamageStockTotal = (record) => getRecordStockCategoryTotal(record, (stockName) => stockName?.startsWith('damage_'));

const sanitizeFileName = (value) => String(value || 'report')
  .trim()
  .replace(/[^\w\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .toLowerCase();

const escapeCsvValue = (value) => {
  const normalizedValue = value === null || value === undefined ? '' : String(value);
  return `"${normalizedValue.replace(/"/g, '""')}"`;
};

const escapeHtmlValue = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const downloadBlob = (content, fileName, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const formatStockSectionForExport = (record, stockName) => {
  const section = (record.stock_item_sections || []).find((item) => item.stock_name === stockName);
  if (!section?.items?.length) return '';

  return section.items
    .map((item) => `Week ${Number(item.stock_value || 0) > 0 ? item.week : '-'}: ${Number(item.stock_value || 0).toFixed(2)}`)
    .join(' | ');
};

const buildExportRows = (recordsToExport = []) => recordsToExport.map((record) => {
  return {
    'Completion Date': formatDate(record.completion_date),
    'Completed At': formatDateTime(record.completed_at),
    Location: getLocationLabel(record.location),
    'PPC (In MT)': formatStockSectionForExport(record, 'ppc'),
    'WP (In MT)': formatStockSectionForExport(record, 'wp'),
    'Super (In MT)': formatStockSectionForExport(record, 'super'),
    'Total Stock Quantity (In MT)': getRecordStockTotal(record).toFixed(2),
    'CNT PPC (In MT)': formatStockSectionForExport(record, 'cnt_ppc'),
    'CNT WP (In MT)': formatStockSectionForExport(record, 'cnt_wp'),
    'CNT Super (In MT)': formatStockSectionForExport(record, 'cnt_super'),
    'Total Stock Quantity of CNT (In MT)': getRecordCntStockTotal(record).toFixed(2),
    'Damage PPC (In MT)': formatStockSectionForExport(record, 'damage_ppc'),
    'Damage WP (In MT)': formatStockSectionForExport(record, 'damage_wp'),
    'Damage Super (In MT)': formatStockSectionForExport(record, 'damage_super'),
    'Total Stock Quantity of Damage (In MT)': getRecordDamageStockTotal(record).toFixed(2),
    'Completed By': record.completed_by_user?.full_name || `User #${record.completed_by}`,
    'Phone Number': record.completed_by_user?.phone_number || '-',
    'Task Name': record.todo?.title || record.todo_title || '-',
    Remarks: record.remarks || '-',
  };
});

const buildQuickExportRows = (recordsToExport = []) => recordsToExport.map((record) => {
  return {
    Location: getLocationLabel(record.location),
    'PPC (In MT)': formatStockSectionForExport(record, 'ppc'),
    'WP (In MT)': formatStockSectionForExport(record, 'wp'),
    'Super (In MT)': formatStockSectionForExport(record, 'super'),
    'Total Stock Quantity (In MT)': getRecordStockTotal(record).toFixed(2),
    'CNT PPC (In MT)': formatStockSectionForExport(record, 'cnt_ppc'),
    'CNT WP (In MT)': formatStockSectionForExport(record, 'cnt_wp'),
    'CNT Super (In MT)': formatStockSectionForExport(record, 'cnt_super'),
    'Total Stock Quantity of CNT (In MT)': getRecordCntStockTotal(record).toFixed(2),
    'Damage PPC (In MT)': formatStockSectionForExport(record, 'damage_ppc'),
    'Damage WP (In MT)': formatStockSectionForExport(record, 'damage_wp'),
    'Damage Super (In MT)': formatStockSectionForExport(record, 'damage_super'),
    'Total Stock Quantity of Damage (In MT)': getRecordDamageStockTotal(record).toFixed(2),
    'Completion Date & Time': formatDateTime(record.completed_at),
    Remarks: record.remarks || '-',
  };
});

const exportRowsAsCsv = (rows, fileName, headersOverride = null) => {
  const headers = headersOverride || Object.keys(rows[0] || {
    'Completion Date': '',
    'Completed At': '',
    'Completed By': '',
    'Phone Number': '',
    Location: '',
    'Task Name': '',
    'PPC (In MT)': '',
    'WP (In MT)': '',
    'Super (In MT)': '',
    'Total Stock Quantity (In MT)': '',
    'CNT PPC (In MT)': '',
    'CNT WP (In MT)': '',
    'CNT Super (In MT)': '',
    'Total Stock Quantity of CNT (In MT)': '',
    'Damage PPC (In MT)': '',
    'Damage WP (In MT)': '',
    'Damage Super (In MT)': '',
    'Total Stock Quantity of Damage (In MT)': '',
    Remarks: '',
  });
  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\n');

  downloadBlob(`\uFEFF${csvContent}`, `${fileName}.csv`, 'text/csv;charset=utf-8;');
};

const exportRowsAsXls = (rows, fileName, headersOverride = null) => {
  const headers = headersOverride || Object.keys(rows[0] || {
    'Completion Date': '',
    'Completed At': '',
    'Completed By': '',
    'Phone Number': '',
    Location: '',
    'Task Name': '',
    'PPC (In MT)': '',
    'WP (In MT)': '',
    'Super (In MT)': '',
    'Total Stock Quantity (In MT)': '',
    'CNT PPC (In MT)': '',
    'CNT WP (In MT)': '',
    'CNT Super (In MT)': '',
    'Total Stock Quantity of CNT (In MT)': '',
    'Damage PPC (In MT)': '',
    'Damage WP (In MT)': '',
    'Damage Super (In MT)': '',
    'Total Stock Quantity of Damage (In MT)': '',
    Remarks: '',
  });
  const tableHead = headers
    .map((header) => `<th style="background:#eaf2ff;border:1px solid #cbd5e1;padding:8px;text-align:left;">${escapeHtmlValue(header)}</th>`)
    .join('');
  const tableBody = rows
    .map((row) => `<tr>${headers.map((header) => `<td style="border:1px solid #cbd5e1;padding:8px;vertical-align:top;">${escapeHtmlValue(row[header])}</td>`).join('')}</tr>`)
    .join('');
  const htmlContent = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th { font-weight: 700; }
          td { mso-number-format: "\\@"; }
        </style>
      </head>
      <body>
        <table>
          <thead><tr>${tableHead}</tr></thead>
          <tbody>${tableBody}</tbody>
        </table>
      </body>
    </html>
  `;

  downloadBlob(htmlContent, `${fileName}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
};

const StockSection = ({ section }) => {
  const stockLabel = STOCK_FIELDS.find(([field]) => field === section.stock_name)?.[1] || section.stock_name;

  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
      <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-blue-700">
        {stockLabel}
      </span>
      <div className="flex flex-wrap gap-1">
        {(section.items || []).map((item, index) => (
          <span key={item.todo_completion_item_id || `${section.stock_name}-${index}`} className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold shadow-xs">
            <span className="text-[8px] uppercase tracking-wider text-slate-400">
              W{Number(item.stock_value || 0) > 0 ? item.week : '-'}
            </span>
            <span className="text-slate-900">{Number(item.stock_value || 0).toFixed(2)}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const LocationMultiSelect = ({
  locations,
  loadingLocations,
  locationIds,
  onToggleAll,
  onToggleLocation,
  open,
  onToggleOpen,
  onClose,
  label,
}) => (
  <div className="relative flex flex-col gap-1.5">
    <span className="text-xs font-bold text-slate-600">Location</span>
    <button
      type="button"
      onClick={() => onToggleOpen((prev) => !prev)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-extrabold text-slate-800 outline-none transition-all hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-100"
    >
      <span className="truncate">{loadingLocations ? 'Loading locations...' : label}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open ? (
      <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-[320px] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/80">
        <div className="mb-2 flex items-center justify-between border-b border-slate-100 px-2 pb-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Choose locations</span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-slate-500 hover:bg-slate-100"
          >
            Done
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto pr-1">
          {loadingLocations ? (
            <p className="px-3 py-2 text-xs font-semibold text-slate-400">Loading locations...</p>
          ) : (
            <>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-extrabold text-slate-900 transition-all hover:bg-blue-50">
                <input
                  type="checkbox"
                  checked={hasAllLocations(locationIds)}
                  onChange={onToggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                />
                All locations
              </label>
              {locations.map((location) => {
                const locationId = String(location.location_id);
                const isSelected = !hasAllLocations(locationIds) && locationIds.includes(locationId);

                return (
                  <label key={location.location_id} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleLocation(locationId)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                    />
                    <span className="truncate">{getLocationLabel(location)}</span>
                  </label>
                );
              })}
              {locations.length === 0 ? (
                <p className="px-3 py-2 text-xs font-semibold text-slate-400">No locations found</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    ) : null}
  </div>
);

export const ReportsPage = () => {
  const [locations, setLocations] = useState([]);
  const [stockTasks, setStockTasks] = useState([]);
  const [records, setRecords] = useState([]);
  const [quickReportOpen, setQuickReportOpen] = useState(false);
  const [quickStockTasks, setQuickStockTasks] = useState([]);
  const [quickLoadingTasks, setQuickLoadingTasks] = useState(false);
  const [quickLoadingExport, setQuickLoadingExport] = useState('');
  const [quickLocationDropdownOpen, setQuickLocationDropdownOpen] = useState(false);
  const [quickFilters, setQuickFilters] = useState({
    location_ids: ['all'],
    todo_id: '',
    report_date: getToday(),
    export_type: 'csv',
  });
  const [filters, setFilters] = useState({
    location_ids: ['all'],
    todo_id: '',
    start_date: getMonthStart(),
    end_date: getToday(),
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exportingType, setExportingType] = useState('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  const canFetchReport = Boolean(filters.location_ids.length && filters.todo_id && filters.start_date && filters.end_date);
  const selectedLocationLabel = useMemo(() => getSelectedLocationsLabel(locations, filters.location_ids), [locations, filters.location_ids]);
  const quickSelectedLocationLabel = useMemo(
    () => getSelectedLocationsLabel(locations, quickFilters.location_ids),
    [locations, quickFilters.location_ids],
  );

  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await apiHandler({ method: 'GET', url: API_ENDPOINTS.LOCATIONS.BASE });
      const nextLocations = Array.isArray(response?.data) ? response.data : [];
      setLocations(nextLocations);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadStockTasks = async (locationIds = [], setTasks, setSelectedTodoId, setLoading) => {
    setLoading(true);
    try {
      const response = await apiHandler({
        method: 'GET',
        url: API_ENDPOINTS.TODOS.BASE,
      });
      const selectedIds = normalizeLocationIds(locationIds);
      const tasks = (Array.isArray(response?.data) ? response.data : [])
        .filter((task) => task.type === 'stock')
        .filter((task) => {
          if (hasAllLocations(selectedIds)) return true;
          return getTodoLocations(task).some((location) => selectedIds.includes(String(location.location_id)));
        });
      setTasks(tasks);
      if (setSelectedTodoId) {
        setSelectedTodoId((currentTodoId) => (
          tasks.some((task) => String(task.todo_id) === String(currentTodoId))
            ? currentTodoId
            : (tasks[0]?.todo_id ? String(tasks[0].todo_id) : '')
        ));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStockTasks = async (locationIds = filters.location_ids) => {
    await loadStockTasks(locationIds, setStockTasks, (updater) => {
      setFilters((prev) => ({
        ...prev,
        todo_id: typeof updater === 'function'
          ? updater(prev.todo_id)
          : updater,
      }));
    }, setLoadingTasks);
  };

  const getReportLocationParam = (locationIds = filters.location_ids) => (
    hasAllLocations(locationIds)
      ? 'all'
      : locationIds.join(',')
  );

  const fetchReportRecords = async ({
    todoId,
    startDate,
    endDate,
    locationIds,
    pageNumber = 1,
    limit = 20,
  }) => {
    const response = await apiHandler({
      method: 'GET',
      url: API_ENDPOINTS.TODOS.STOCK_REPORT,
      params: {
        todo_id: todoId,
        start_date: startDate,
        end_date: endDate,
        location_ids: getReportLocationParam(locationIds),
        page: pageNumber,
        limit,
      },
    });
    return response?.data || {};
  };

  const fetchReport = async (targetPage = page) => {
    if (!canFetchReport) {
      setRecords([]);
      setTotalPages(1);
      setTotalRecords(0);
      return;
    }

    setLoadingReport(true);
    try {
      const data = await fetchReportRecords({
        todoId: filters.todo_id,
        startDate: filters.start_date,
        endDate: filters.end_date,
        locationIds: filters.location_ids,
        pageNumber: targetPage,
        limit: 20,
      });
      setRecords(Array.isArray(data.records) ? data.records : []);
      setTotalPages(Number(data.total_pages || 1));
      setTotalRecords(Number(data.total_records || 0));
      setPage(Number(data.current_page || targetPage));
    } finally {
      setLoadingReport(false);
    }
  };

  const getSelectedTaskTitle = () => stockTasks.find((task) => String(task.todo_id) === String(filters.todo_id))?.title || 'stock-report';

  const getExportFileName = () => sanitizeFileName([
    'stock-completion-report',
    getSelectedTaskTitle(),
    filters.start_date,
    'to',
    filters.end_date,
  ].filter(Boolean).join('-'));

  const fetchAllReportRecords = async ({
    todoId,
    startDate,
    endDate,
    locationIds,
  }) => {
    const firstData = await fetchReportRecords({
      todoId,
      startDate,
      endDate,
      locationIds,
      pageNumber: 1,
      limit: 100,
    });
    const allRecords = Array.isArray(firstData.records) ? [...firstData.records] : [];
    const exportTotalPages = Number(firstData.total_pages || 1);

    if (exportTotalPages > 1) {
      const remainingResponses = await Promise.all(
        Array.from({ length: exportTotalPages - 1 }, (_, index) => apiHandler({
          method: 'GET',
          url: API_ENDPOINTS.TODOS.STOCK_REPORT,
          params: {
            todo_id: todoId,
            start_date: startDate,
            end_date: endDate,
            location_ids: getReportLocationParam(locationIds),
            page: index + 2,
            limit: 100,
          },
        })),
      );

      remainingResponses.forEach((response) => {
        const nextRecords = Array.isArray(response?.data?.records) ? response.data.records : [];
        allRecords.push(...nextRecords);
      });
    }

    return allRecords;
  };

  const handleExportReport = async (type) => {
    if (!canFetchReport || exportingType) return;

    setExportingType(type);
    try {
      const exportRecords = await fetchAllReportRecords({
        todoId: filters.todo_id,
        startDate: filters.start_date,
        endDate: filters.end_date,
        locationIds: filters.location_ids,
      });
      const exportRows = buildExportRows(exportRecords);
      const fileName = getExportFileName();

      if (type === 'csv') {
        exportRowsAsCsv(exportRows, fileName, MAIN_EXPORT_HEADERS);
      } else {
        exportRowsAsXls(exportRows, fileName, MAIN_EXPORT_HEADERS);
      }
    } finally {
      setExportingType('');
    }
  };

  const handleQuickReportLocationToggleAll = () => {
    setQuickFilters((prev) => ({ ...prev, location_ids: ['all'], todo_id: '' }));
  };

  const handleQuickReportToggleLocation = (locationId) => {
    const locationIdValue = String(locationId);
    setQuickFilters((prev) => {
      const withoutAll = prev.location_ids.filter((existingId) => existingId !== 'all');
      const nextLocationIds = withoutAll.includes(locationIdValue)
        ? withoutAll.filter((existingId) => existingId !== locationIdValue)
        : [...withoutAll, locationIdValue];

      return {
        ...prev,
        location_ids: normalizeLocationIds(nextLocationIds),
        todo_id: '',
      };
    });
  };

  const handleQuickReportDateChange = (value) => {
    setQuickFilters((prev) => ({ ...prev, report_date: value }));
  };

  const handleQuickReportExport = async () => {
    if (!quickFilters.todo_id || !quickFilters.report_date || quickLoadingExport) return;

    setQuickLoadingExport(quickFilters.export_type);
    try {
      const exportRecords = await fetchAllReportRecords({
        todoId: quickFilters.todo_id,
        startDate: quickFilters.report_date,
        endDate: quickFilters.report_date,
        locationIds: quickFilters.location_ids,
      });
      const exportRows = buildQuickExportRows(exportRecords);
      const selectedTaskTitle = quickStockTasks.find((task) => String(task.todo_id) === String(quickFilters.todo_id))?.title || 'quick-report';
      const fileName = sanitizeFileName([
        'quick-stock-report',
        selectedTaskTitle,
        quickFilters.report_date,
      ].filter(Boolean).join('-'));

      if (quickFilters.export_type === 'xls') {
        exportRowsAsXls(exportRows, fileName, QUICK_EXPORT_HEADERS);
      } else {
        exportRowsAsCsv(exportRows, fileName, QUICK_EXPORT_HEADERS);
      }
      setQuickReportOpen(false);
    } finally {
      setQuickLoadingExport('');
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchStockTasks(filters.location_ids);
  }, [filters.location_ids]);

  useEffect(() => {
    if (!quickReportOpen) return;

    loadStockTasks(
      quickFilters.location_ids,
      setQuickStockTasks,
      (updater) => {
        setQuickFilters((prev) => ({
          ...prev,
          todo_id: typeof updater === 'function'
            ? updater(prev.todo_id)
            : updater,
        }));
      },
      setQuickLoadingTasks,
    );
  }, [quickReportOpen, quickFilters.location_ids]);

  useEffect(() => {
    setPage(1);
  }, [filters.location_ids, filters.todo_id, filters.start_date, filters.end_date]);

  useEffect(() => {
    fetchReport(page);
  }, [page, filters.location_ids, filters.todo_id, filters.start_date, filters.end_date]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'start_date' && next.end_date && value > next.end_date) {
        next.end_date = value;
      }
      return next;
    });
  };

  const handleToggleAllLocations = () => {
    setFilters((prev) => ({ ...prev, location_ids: ['all'] }));
  };

  const handleToggleLocation = (locationId) => {
    const locationIdValue = String(locationId);
    setFilters((prev) => {
      const withoutAll = prev.location_ids.filter((existingId) => existingId !== 'all');
      const nextLocationIds = withoutAll.includes(locationIdValue)
        ? withoutAll.filter((existingId) => existingId !== locationIdValue)
        : [...withoutAll, locationIdValue];

      return {
        ...prev,
        location_ids: nextLocationIds.length ? nextLocationIds : ['all'],
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <BarChart4 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Reports Management</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Filter stock task completions by location, task, and completion date range.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end xl:justify-start xl:pl-2">
          <button
            type="button"
            onClick={() => setQuickReportOpen(true)}
            className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-extrabold text-violet-700 shadow-sm transition-all hover:bg-violet-100"
          >
            <CalendarDays className="h-4 w-4" />
            Quick Report
          </button>
          <button
            type="button"
            onClick={() => handleExportReport('csv')}
            disabled={!canFetchReport || Boolean(exportingType)}
            className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportingType === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportReport('xls')}
            disabled={!canFetchReport || Boolean(exportingType)}
            className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-extrabold text-blue-700 shadow-sm transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportingType === 'xls' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => fetchReport(page)}
            disabled={!canFetchReport || loadingReport}
            className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loadingReport ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
          <Filter className="h-4 w-4" />
          Report Filters
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600">Location</span>
            <button
              type="button"
              onClick={() => setLocationDropdownOpen((prev) => !prev)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-extrabold text-slate-800 outline-none transition-all hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <span className="truncate">{loadingLocations ? 'Loading locations...' : selectedLocationLabel}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${locationDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {locationDropdownOpen ? (
              <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-[320px] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/80">
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 px-2 pb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Choose locations</span>
                  <button
                    type="button"
                    onClick={() => setLocationDropdownOpen(false)}
                    className="cursor-pointer rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-slate-500 hover:bg-slate-100"
                  >
                    Done
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto pr-1">
                  {loadingLocations ? (
                    <p className="px-3 py-2 text-xs font-semibold text-slate-400">Loading locations...</p>
                  ) : (
                    <>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-extrabold text-slate-900 transition-all hover:bg-blue-50">
                        <input
                          type="checkbox"
                          checked={hasAllLocations(filters.location_ids)}
                          onChange={handleToggleAllLocations}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                        />
                        All locations
                      </label>
                      {locations.map((location) => {
                        const locationId = String(location.location_id);
                        const isSelected = !hasAllLocations(filters.location_ids) && filters.location_ids.includes(locationId);

                        return (
                          <label key={location.location_id} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleLocation(locationId)}
                              className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                            />
                            <span className="truncate">{getLocationLabel(location)}</span>
                          </label>
                        );
                      })}
                      {locations.length === 0 ? (
                        <p className="px-3 py-2 text-xs font-semibold text-slate-400">No locations found</p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600">Stock Todo Task</span>
            <select
              value={filters.todo_id}
              onChange={(event) => handleFilterChange('todo_id', event.target.value)}
              disabled={!filters.location_ids.length || loadingTasks || stockTasks.length === 0}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingTasks ? <option>Loading stock tasks...</option> : null}
              {!loadingTasks && stockTasks.length === 0 ? <option value="">No stock tasks found</option> : null}
              {stockTasks.map((task) => (
                <option key={task.todo_id} value={task.todo_id}>{task.title}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600">Start Date</span>
            <input
              type="date"
              value={filters.start_date}
              onChange={(event) => handleFilterChange('start_date', event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600">End Date</span>
            <input
              type="date"
              value={filters.end_date}
              min={filters.start_date || undefined}
              onChange={(event) => handleFilterChange('end_date', event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
      </section>

      <Modal
        isOpen={quickReportOpen}
        onClose={() => setQuickReportOpen(false)}
        title="Quick Report"
        maxWidthClass="max-w-4xl"
        footerButtons={[
          {
            label: 'Cancel',
            onClick: () => setQuickReportOpen(false),
            variant: 'secondary',
          },
          {
            label: quickLoadingExport ? 'Downloading...' : 'Download Report',
            onClick: handleQuickReportExport,
            variant: 'primary',
            isLoading: Boolean(quickLoadingExport),
          },
        ]}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600">Report Date</span>
            <input
              type="date"
              value={quickFilters.report_date}
              onChange={(event) => handleQuickReportDateChange(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-violet-100"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600">Export Format</span>
            <select
              value={quickFilters.export_type}
              onChange={(event) => setQuickFilters((prev) => ({ ...prev, export_type: event.target.value }))}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-violet-100"
            >
              <option value="csv">CSV</option>
              <option value="xls">Excel</option>
            </select>
          </label>

          <LocationMultiSelect
            locations={locations}
            loadingLocations={loadingLocations}
            locationIds={quickFilters.location_ids}
            onToggleAll={() => setQuickFilters((prev) => ({ ...prev, location_ids: ['all'], todo_id: '' }))}
            onToggleLocation={(locationId) => {
              const locationIdValue = String(locationId);
              setQuickFilters((prev) => {
                const withoutAll = prev.location_ids.filter((existingId) => existingId !== 'all');
                const nextLocationIds = withoutAll.includes(locationIdValue)
                  ? withoutAll.filter((existingId) => existingId !== locationIdValue)
                  : [...withoutAll, locationIdValue];

                return {
                  ...prev,
                  location_ids: normalizeLocationIds(nextLocationIds),
                  todo_id: '',
                };
              });
            }}
            open={quickLocationDropdownOpen}
            onToggleOpen={setQuickLocationDropdownOpen}
            onClose={() => setQuickLocationDropdownOpen(false)}
            label={quickSelectedLocationLabel}
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600">Stock Todo Task</span>
            <select
              value={quickFilters.todo_id}
              onChange={(event) => setQuickFilters((prev) => ({ ...prev, todo_id: event.target.value }))}
              disabled={!quickFilters.location_ids.length || quickLoadingTasks || quickStockTasks.length === 0}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {quickLoadingTasks ? <option>Loading stock tasks...</option> : null}
              {!quickLoadingTasks && quickStockTasks.length === 0 ? <option value="">No stock tasks found</option> : null}
              {quickStockTasks.map((task) => (
                <option key={task.todo_id} value={task.todo_id}>{task.title}</option>
              ))}
            </select>
          </label>

        </div>
      </Modal>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">Completion List</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Showing stock completion rows for the selected filters.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-500">
            <Search className="h-4 w-4" /> Page {page} of {totalPages}
          </div>
        </div>

        {loadingReport ? (
          <div className="flex min-h-80 items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading report...
          </div>
        ) : records.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-50 text-slate-300">
              <ClipboardList className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-slate-900">No report records found</h3>
            <p className="mt-1 max-w-md text-sm font-medium text-slate-500">Try another location, stock task, or date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Completion</th>
                  <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Completed By</th>
                  <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Location</th>
                  <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Stock Quantity (In MT)</th>
                  <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Stock Quantity (In MT)</th>
                  <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Stock Quantity of CNT (In MT)</th>
                  <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Stock Quantity of Damage (In MT)</th>
                  <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {records.map((record) => (
                  <tr key={record.completion_id} className="align-top transition-colors hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="text-sm font-extrabold text-slate-900">{formatDate(record.completion_date)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{formatDateTime(record.completed_at)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">{record.completed_by_user?.full_name || `User #${record.completed_by}`}</p>
                          <p className="text-xs font-semibold text-slate-500">{record.completed_by_user?.phone_number || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="min-w-[220px] px-5 py-4">
                      <p className="text-sm font-extrabold leading-relaxed text-slate-700">{getLocationLabel(record.location)}</p>
                    </td>
                    <td className="min-w-[360px] px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(record.stock_item_sections || []).map((section) => (
                          <StockSection key={`${record.completion_id}-${section.stock_name}`} section={section} />
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="inline-flex min-w-28 items-center justify-center rounded-2xl bg-emerald-50 px-4 py-3 text-lg font-extrabold text-emerald-700">
                        {getRecordStockTotal(record).toFixed(2)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="inline-flex min-w-28 items-center justify-center rounded-2xl bg-blue-50 px-4 py-3 text-lg font-extrabold text-blue-700">
                        {getRecordCntStockTotal(record).toFixed(2)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="inline-flex min-w-28 items-center justify-center rounded-2xl bg-rose-50 px-4 py-3 text-lg font-extrabold text-rose-700">
                        {getRecordDamageStockTotal(record).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-xs text-sm font-semibold leading-relaxed text-slate-600">{record.remarks || '-'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-slate-500">Showing {records.length} of {totalRecords} records</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1 || loadingReport}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages || loadingReport}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
