import React, { useState } from 'react';
import { useAppState } from '../contexts/StateContext';
import { Package, Search, PlusCircle, ArrowDownCircle, ArrowUpCircle, AlertTriangle, RefreshCw, MapPin } from 'lucide-react';
import { Modal } from '../components/Modal';
export const StockPage = () => {
    const { currentUser, stocks, executeStockIn, executeStockOut, createStockItem, isLoading, showToast } = useAppState();
    const userRole = currentUser?.role;
    const isUserOnly = userRole === 'User';
    // Search & Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [warehouseFilter, setWarehouseFilter] = useState('All');
    // Modal controls
    const [isStockInOpen, setIsStockInOpen] = useState(false);
    const [isStockOutOpen, setIsStockOutOpen] = useState(false);
    const [isCreateSkuOpen, setIsCreateSkuOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    // Form parameters
    const [txQty, setTxQty] = useState('');
    const [txComments, setTxComments] = useState('');
    const [txError, setTxError] = useState('');
    // SKU addition parameters
    const [skuName, setSkuName] = useState('');
    const [skuCode, setSkuCode] = useState('');
    const [skuCategory, setSkuCategory] = useState('Safety Equipment');
    const [skuWarehouse, setSkuWarehouse] = useState('Alpha North');
    const [skuQty, setSkuQty] = useState('');
    const [skuThreshold, setSkuThreshold] = useState('');
    const [skuUnit, setSkuUnit] = useState('Units');
    const [skuErrors, setSkuErrors] = useState({});
    // Categories list
    const CATEGORIES = ['Heavy Storage', 'Hardware Assets', 'Machinery Spare Parts', 'Safety Equipment', 'Shipping Material'];
    const WAREHOUSES = ['Alpha North', 'Beta South'];
    // Calculations for Warehouse progress visualizations
    const totalQtyWarehouseA = stocks
        .filter(s => s.warehouse === 'Alpha North')
        .reduce((sum, item) => sum + item.quantity, 0);
    const totalQtyWarehouseB = stocks
        .filter(s => s.warehouse === 'Beta South')
        .reduce((sum, item) => sum + item.quantity, 0);
    // Mock warehouse max capacities (total units capacity)
    const MAX_CAP_A = 4000;
    const MAX_CAP_B = 2500;
    const capA_percent = Math.min(100, Math.round((totalQtyWarehouseA / MAX_CAP_A) * 100));
    const capB_percent = Math.min(100, Math.round((totalQtyWarehouseB / MAX_CAP_B) * 100));
    // Search filter evaluation
    const filteredStocks = stocks.filter((s) => {
        const matchesSearch = `${s.name} ${s.sku} ${s.category}`.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
        const matchesWarehouse = warehouseFilter === 'All' || s.warehouse === warehouseFilter;
        return matchesSearch && matchesCategory && matchesWarehouse;
    });
    // Open transaction modals
    const handleOpenStockIn = (item) => {
        setSelectedItem(item);
        setTxQty('');
        setTxComments('');
        setTxError('');
        setIsStockInOpen(true);
    };
    const handleOpenStockOut = (item) => {
        setSelectedItem(item);
        setTxQty('');
        setTxComments('');
        setTxError('');
        setIsStockOutOpen(true);
    };
    const handleOpenCreateSku = () => {
        setSkuName('');
        setSkuCode('');
        setSkuCategory('Safety Equipment');
        setSkuWarehouse('Alpha North');
        setSkuQty('');
        setSkuThreshold('');
        setSkuUnit('Units');
        setSkuErrors({});
        setIsCreateSkuOpen(true);
    };
    // Process Inwards
    const handleSaveStockIn = async () => {
        if (!selectedItem)
            return;
        const qtyNum = parseInt(txQty);
        if (!qtyNum || qtyNum <= 0) {
            setTxError('Quantity must be a positive integer.');
            return;
        }
        setTxError('');
        const success = await executeStockIn(selectedItem.id, qtyNum, txComments);
        if (success) {
            setIsStockInOpen(false);
            setSelectedItem(null);
        }
    };
    // Process Outwards
    const handleSaveStockOut = async () => {
        if (!selectedItem)
            return;
        const qtyNum = parseInt(txQty);
        if (!qtyNum || qtyNum <= 0) {
            setTxError('Quantity must be a positive integer.');
            return;
        }
        if (qtyNum > selectedItem.quantity) {
            setTxError(`Insufficient inventory. Max available is ${selectedItem.quantity}.`);
            return;
        }
        setTxError('');
        const success = await executeStockOut(selectedItem.id, qtyNum, txComments);
        if (success) {
            setIsStockOutOpen(false);
            setSelectedItem(null);
        }
    };
    // Save new SKU
    const handleSaveCreateSku = async () => {
        const errs = {};
        if (!skuName || skuName.trim().length < 2) {
            errs.name = 'Item Name must be at least 2 characters.';
        }
        if (!skuCode || skuCode.trim().length < 3) {
            errs.sku = 'SKU is required (minimum 3 characters)';
        }
        const qtyVal = parseInt(skuQty);
        if (isNaN(qtyVal) || qtyVal < 0) {
            errs.quantity = 'Initial stock cannot be negative.';
        }
        const minVal = parseInt(skuThreshold);
        if (isNaN(minVal) || minVal < 0) {
            errs.threshold = 'Safety threshold is a required positive number';
        }
        setSkuErrors(errs);
        if (Object.keys(errs).length > 0)
            return;
        const success = await createSkuItem();
        if (success) {
            setIsCreateSkuOpen(false);
        }
    };
    const createSkuItem = async () => {
        const qtyVal = parseInt(skuQty);
        const minVal = parseInt(skuThreshold);
        // Check duplication
        if (stocks.some(s => s.sku.toUpperCase() === skuCode.trim().toUpperCase())) {
            setSkuErrors({ sku: 'This SKU code is already inventoried.' });
            return false;
        }
        return await createStockItem({
            name: skuName,
            sku: skuCode.toUpperCase().trim(),
            category: skuCategory,
            warehouse: skuWarehouse,
            quantity: qtyVal,
            minThreshold: minVal,
            unit: skuUnit
        });
    };
    return (<div className="flex flex-col gap-6 font-sans text-left pb-10">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600"/>
            Inventory & Asset Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">Audit physical product allocations. Process quick inflows/outflows with automated threshhold detection.</p>
        </div>

        {/* User lacks create permission based on standards */}
        {!isUserOnly && (<button id="register-sku-btn" onClick={handleOpenCreateSku} className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md cursor-pointer transition-all shrink-0">
            <PlusCircle className="w-4.5 h-4.5"/>
            Inventory Brand New SKU
          </button>)}
      </div>

      {/* Warehouse occupancy meters visualizer and Metrics (Fulfills Warehouse View requirement) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Warehouse A occupy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-left">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <MapPin className="w-4.5 h-4.5 text-blue-600"/>
              Warehouse Node ALPHA (North)
            </div>
            <span className="text-xs font-mono text-slate-500 font-bold">{totalQtyWarehouseA} / {MAX_CAP_A} units</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-500 ${capA_percent >= 85 ? 'bg-rose-500' : capA_percent >= 60 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${capA_percent}%` }}/>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Space utilized: <strong>{capA_percent}% Capacity Grid</strong></p>
        </div>

        {/* Warehouse B occupy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-left">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <MapPin className="w-4.5 h-4.5 text-amber-600"/>
              Warehouse Node BETA (South)
            </div>
            <span className="text-xs font-mono text-slate-500 font-bold">{totalQtyWarehouseB} / {MAX_CAP_B} units</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-500 ${capB_percent >= 85 ? 'bg-rose-500' : capB_percent >= 60 ? 'bg-amber-500' : 'bg-amber-500'}`} style={{ width: `${capB_percent}%` }}/>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Space utilized: <strong>{capB_percent}% Capacity Grid</strong></p>
        </div>

        {/* General threshold notifications statistics card */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-xl text-yellow-400">
            <AlertTriangle className="w-6 h-6"/>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active warnings</h4>
            <p className="text-lg font-bold mt-1">
              {stocks.filter(s => s.quantity <= s.minThreshold).length} items are currently below low-stock reserves.
            </p>
          </div>
        </div>

      </div>

      {/* Inventory Filters strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-3">
          
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400"/>
            <input id="sku-search-filter" type="text" placeholder="Search assets inside stock count catalog by Name, Category, or SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-205 rounded-xl text-xs placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-105 focus:bg-white transition-all text-slate-800"/>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400">Category:</span>
              <select id="sku-cat-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer">
                <option value="All">All Categories</option>
                {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>

            {/* Warehouse select */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400">Sector:</span>
              <select id="sku-wh-filter" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer">
                <option value="All">All Locations</option>
                {WAREHOUSES.map((wh) => (<option key={wh} value={wh}>{wh}</option>))}
              </select>
            </div>

            {/* Refresh counter reset */}
            <button id="refresh-stock-btn" onClick={() => {
            setSearchQuery('');
            setCategoryFilter('All');
            setWarehouseFilter('All');
            showToast('Synchronized database inventories with real-time tags.', 'info');
        }} className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer">
              <RefreshCw className="w-4 h-4"/>
            </button>
          </div>

        </div>
      </div>

      {/* Main product logs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStocks.length > 0 ? (filteredStocks.map((item) => {
            const isLowStock = item.quantity <= item.minThreshold;
            return (<div key={item.id} className={`bg-white rounded-3xl border shadow-xs p-6 flex flex-col justify-between gap-5 transition-all hover:shadow-md hover:scale-[1.01] ${isLowStock ? 'border-rose-200/80' : 'border-slate-200/80'}`}>
                
                {/* Visual indicator row */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                    <h4 className="font-display text-md font-extrabold text-slate-900 mt-1.5">{item.name}</h4>
                    <p className="text-[11px] font-mono font-semibold text-slate-400 mt-0.5">Asset Code: {item.sku}</p>
                  </div>
                  
                  {isLowStock ? (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] uppercase font-extrabold bg-rose-50 border border-rose-100 text-rose-600 animate-pulse">
                      Low warning
                    </span>) : (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] uppercase font-semibold bg-emerald-50 border border-emerald-100 text-emerald-600">
                      Standard
                    </span>)}
                </div>

                {/* Quantitative info */}
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 font-sans text-xs">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Storage reserves</p>
                    <p className="text-sm font-extrabold text-slate-800 mt-1 font-mono">
                      {item.quantity} <span className="text-xs font-normal text-slate-500 font-sans">{item.unit}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Safety guards</p>
                    <p className="text-sm font-extrabold text-slate-800 mt-1 font-mono">
                      {item.minThreshold} <span className="text-xs font-normal text-slate-500 font-sans">{item.unit}</span>
                    </p>
                  </div>
                </div>

                {/* Warehouse Location Info & Transactions sliders */}
                <div className="flex flex-col gap-3.5 border-t border-slate-100 pt-3 text-xs">
                  <div className="flex justify-between items-center text-slate-505 font-medium">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400"/> Allocated Node:</span>
                    <strong className="text-slate-800">{item.warehouse}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    Last audit stamp: <span className="font-mono font-bold">{item.lastUpdated}</span>
                  </div>

                  {/* Flow control triggers */}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    
                    {/* Stock In - User can do operations */}
                    <button id={`stock-in-btn-${item.id}`} onClick={() => handleOpenStockIn(item)} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors text-xs">
                      <ArrowUpCircle className="w-4.5 h-4.5 text-emerald-500"/>
                      Inflows
                    </button>

                    {/* Stock Out - User can do operations */}
                    <button id={`stock-out-btn-${item.id}`} onClick={() => handleOpenStockOut(item)} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-705 font-semibold border border-slate-200 shadow-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors text-xs">
                      <ArrowDownCircle className="w-4.5 h-4.5 text-rose-500"/>
                      Outflows
                    </button>

                  </div>
                </div>

              </div>);
        })) : (<div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-3xl">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Package className="w-6 h-6"/>
            </div>
            <h4 className="font-display font-semibold text-slate-800 text-sm">No Stock Items Found</h4>
            <p className="text-xs text-slate-400 mt-1">Refine your search parameters or register an entire new brand SKU list.</p>
          </div>)}
      </div>

      {/* STOCK INWARDS DIALOG */}
      <Modal isOpen={isStockInOpen} onClose={() => {
            setIsStockInOpen(false);
            setSelectedItem(null);
        }} title={`Increase Stock Reserves: ${selectedItem?.name}`} footerButtons={[
            { label: 'Cancel', onClick: () => setIsStockInOpen(false) },
            { label: 'Validate Inflow', onClick: handleSaveStockIn, variant: 'primary', isLoading }
        ]}>
        {selectedItem && (<div className="flex flex-col gap-4 text-left">
            <div className="p-4 bg-emerald-50 text-emerald-990 border border-emerald-100 rounded-xl text-xs flex flex-col gap-1">
              <strong>Asset stats:</strong>
              <span>Current warehouse reserves: <strong>{selectedItem.quantity} {selectedItem.unit}</strong></span>
              <span>Allocated sector: <strong>{selectedItem.warehouse}</strong></span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-750">Quantity to Stock In ({selectedItem.unit})</label>
              <input id="action-stock-in-qty" type="number" placeholder="e.g. 50" value={txQty} onChange={(e) => setTxQty(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"/>
              {txError && <span className="text-[11px] text-rose-600 font-semibold">{txError}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-750">Reason / Reference Comments (Optional)</label>
              <input id="action-stock-in-comments" type="text" placeholder="e.g. Incoming shipment from Vendor PL-998" value={txComments} onChange={(e) => setTxComments(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-medium text-slate-800"/>
            </div>
          </div>)}
      </Modal>

      {/* STOCK OUTWARDS DIALOG */}
      <Modal isOpen={isStockOutOpen} onClose={() => {
            setIsStockOutOpen(false);
            setSelectedItem(null);
        }} title={`Decrease Stock Reserves: ${selectedItem?.name}`} footerButtons={[
            { label: 'Cancel', onClick: () => setIsStockOutOpen(false) },
            { label: 'Verify Outflow Dispatch', onClick: handleSaveStockOut, variant: 'primary', isLoading }
        ]}>
        {selectedItem && (<div className="flex flex-col gap-4 text-left">
            <div className="p-4 bg-rose-50 text-rose-990 border border-rose-100 rounded-xl text-xs flex flex-col gap-1">
              <strong>Safety Threshold warning:</strong>
              <span>If quantity falls below <strong>{selectedItem.minThreshold} {selectedItem.unit}</strong>, procurement alarms will broadcast.</span>
              <span>Available counts currently: <strong>{selectedItem.quantity} {selectedItem.unit}</strong></span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-750">Quantity to Stock Out ({selectedItem.unit})</label>
              <input id="action-stock-out-qty" type="number" placeholder="e.g. 5" value={txQty} onChange={(e) => setTxQty(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"/>
              {txError && <span className="text-[11px] text-rose-600 font-semibold">{txError}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-750">Dispatch Purpose Comments (Optional)</label>
              <input id="action-stock-out-comments" type="text" placeholder="e.g. Dispatched to Shift-B team for pallet installation" value={txComments} onChange={(e) => setTxComments(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-medium text-slate-800"/>
            </div>
          </div>)}
      </Modal>

      {/* NEW SKU CREATION DIALOG */}
      <Modal isOpen={isCreateSkuOpen} onClose={() => setIsCreateSkuOpen(false)} title="Inventory New SKU Catalogue Asset" footerButtons={[
            { label: 'Dismiss', onClick: () => setIsCreateSkuOpen(false) },
            { label: 'Inventorize and Commit', onClick: handleSaveCreateSku, variant: 'primary', isLoading }
        ]}>
        <div className="flex flex-col gap-4 text-left">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-750">Physical Item Name</label>
              <input id="sku-create-name" type="text" placeholder="e.g. Structural Steel Bar C" value={skuName} onChange={(e) => setSkuName(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"/>
              {skuErrors.name && <span className="text-[10px] text-rose-600 font-semibold">{skuErrors.name}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-750">SKU Code Identity</label>
              <input id="sku-create-code" type="text" placeholder="e.g. BAR-STL-808" value={skuCode} onChange={(e) => setSkuCode(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-mono font-bold text-slate-850"/>
              {skuErrors.sku && <span className="text-[10px] text-rose-600 font-semibold">{skuErrors.sku}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-750">Category Type</label>
              <select id="sku-create-category" value={skuCategory} onChange={(e) => setSkuCategory(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer text-xs font-semibold text-slate-800">
                {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-750">Warehouse Location Sector</label>
              <select id="sku-create-warehouse" value={skuWarehouse} onChange={(e) => setSkuWarehouse(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer text-xs font-semibold text-slate-800">
                {WAREHOUSES.map((wh) => (<option key={wh} value={wh}>{wh}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-750">Initial Stock</label>
              <input id="sku-create-initial" type="number" placeholder="e.g. 100" value={skuQty} onChange={(e) => setSkuQty(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"/>
              {skuErrors.quantity && <span className="text-[10px] text-rose-600 font-semibold">{skuErrors.quantity}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-750">Safety Threshold</label>
              <input id="sku-create-threshold" type="number" placeholder="e.g. 20" value={skuThreshold} onChange={(e) => setSkuThreshold(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"/>
              {skuErrors.threshold && <span className="text-[10px] text-rose-600 font-semibold">{skuErrors.threshold}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-750">Counting Metric Unit</label>
              <select id="sku-create-unit" value={skuUnit} onChange={(e) => setSkuUnit(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer text-xs font-semibold text-slate-850">
                <option value="Units">Units (Default)</option>
                <option value="Pcs">Pcs</option>
                <option value="Pairs">Pairs</option>
                <option value="Box">Boxes</option>
                <option value="Kits">Complete Kits</option>
              </select>
            </div>

          </div>

        </div>
      </Modal>

    </div>);
};
