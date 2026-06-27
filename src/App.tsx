/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  RefreshCw, 
  ChevronDown, 
  Calendar, 
  Layers, 
  AlertCircle, 
  CheckCircle,
  TrendingUp, 
  Database,
  ArrowUpDown,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SORecord, 
  FALLBACK_CSV_DATA, 
  parseCSV, 
  formatRupiah, 
  formatRupiahCompact,
  SortField,
  SortOrder
} from './data';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSx053jYZ7c1Y34d9oD72P3Q9SGnOllxVNY9STc2mrVM5EWwXmHl1sMOlTIiSGhEaie-izRKYRC5k4Q/pub?gid=0&single=true&output=csv';

export default function App() {
  const [allData, setAllData] = useState<SORecord[]>(FALLBACK_CSV_DATA);
  const [filteredData, setFilteredData] = useState<SORecord[]>(FALLBACK_CSV_DATA);
  
  // Loading & sync state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState<number>(300); // 5 minutes (300s) coordinator
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [lastCbToken, setLastCbToken] = useState<string>('');

  // Filter dropdown visibility
  const [openFilter, setOpenFilter] = useState<'none' | 'date' | 'category' | 'criteria'>('none');

  // Filter selections
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('tanggal');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Available unique fields for filters (derived from allData)
  const uniqueDates = Array.from(new Set(allData.map(d => d.tanggal))).filter(Boolean) as string[];
  const uniqueCategories = Array.from(new Set(allData.map(d => d.kategori))).filter(Boolean) as string[];
  const uniqueCriteria = Array.from(new Set(allData.map(d => d.kriteria))).filter(Boolean) as string[];

  // Toggle dropdown
  const toggleDropdown = (type: 'date' | 'category' | 'criteria') => {
    setOpenFilter(prev => prev === type ? 'none' : type);
  };

  // Close dropdowns if clicked outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenFilter('none');
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Sync CSV data
  const loadDataFromSheet = async (isManual = false) => {
    setIsLoading(true);
    const cbToken = Date.now().toString();
    setLastCbToken(cbToken);
    try {
      const fetchUrl = `${SHEET_CSV_URL}&_cb=${cbToken}`;
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      const parsed = parseCSV(csvText);
      
      setAllData(parsed);
      setIsSuccess(true);
      setIsOfflineMode(false);
      setLastUpdated(new Date());
      setCountdown(300); // Reset timer
    } catch (e) {
      console.warn("Using offline cached spreadsheet data:", e);
      setIsSuccess(false);
      setIsOfflineMode(true);
      if (allData.length === FALLBACK_CSV_DATA.length) {
        setAllData(FALLBACK_CSV_DATA);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and automatic refresh interval
  useEffect(() => {
    loadDataFromSheet();

    // 5-minute interval for fetching
    const fetchInterval = setInterval(() => {
      loadDataFromSheet();
    }, 5 * 60 * 1000);

    // 1-second countdown clock for countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(fetchInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...allData];

    if (selectedDates.length > 0) {
      result = result.filter(item => selectedDates.includes(item.tanggal));
    }

    if (selectedCategories.length > 0) {
      result = result.filter(item => selectedCategories.includes(item.kategori));
    }

    if (selectedCriteria.length > 0) {
      result = result.filter(item => selectedCriteria.includes(item.kriteria));
    }

    setFilteredData(result);
  }, [allData, selectedDates, selectedCategories, selectedCriteria]);

  // Calculations for Key Metrics
  const totalPendingCount = filteredData.reduce((sum, item) => sum + item.count, 0);
  const totalPendingValue = filteredData.reduce((sum, item) => sum + item.value, 0);

  // Category values (1P, 2P, 3P)
  const total1PValue = filteredData.filter(d => d.kategori.trim().toUpperCase() === '1P').reduce((sum, item) => sum + item.value, 0);
  const total2PValue = filteredData.filter(d => d.kategori.trim().toUpperCase() === '2P').reduce((sum, item) => sum + item.value, 0);
  const total3PValue = filteredData.filter(d => d.kategori.trim().toUpperCase() === '3P').reduce((sum, item) => sum + item.value, 0);

  // Sorting Handler
  const handleSort = (field: 'tanggal' | 'kategori' | 'count' | 'value') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortOrder('desc'); // default to descending for new field
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedDates([]);
    setSelectedCategories([]);
    setSelectedCriteria([]);
    setOpenFilter('none');
  };

  // Group filteredData by tanggal and kategori to make 1 row per category per date
  const aggregatedTableData = (() => {
    const aggregatedMap: { [key: string]: { tanggal: string; kategori: string; count: number; value: number } } = {};
    
    filteredData.forEach(item => {
      const key = `${item.tanggal}_${item.kategori}`;
      if (!aggregatedMap[key]) {
        aggregatedMap[key] = {
          tanggal: item.tanggal,
          kategori: item.kategori,
          count: 0,
          value: 0
        };
      }
      aggregatedMap[key].count += item.count;
      aggregatedMap[key].value += item.value;
    });

    return Object.values(aggregatedMap);
  })();

  // Sort consolidated aggregated table data
  const sortedTableData = [...aggregatedTableData].sort((a, b) => {
    if (sortField === 'tanggal') {
      const dateA = new Date(a.tanggal).getTime() || 0;
      const dateB = new Date(b.tanggal).getTime() || 0;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }

    const rawA = a[sortField as 'kategori' | 'count' | 'value'];
    const rawB = b[sortField as 'kategori' | 'count' | 'value'];

    if (typeof rawA === 'string' && typeof rawB === 'string') {
      return sortOrder === 'asc' 
        ? rawA.localeCompare(rawB) 
        : rawB.localeCompare(rawA);
    } else if (typeof rawA === 'number' && typeof rawB === 'number') {
      return sortOrder === 'asc' 
        ? rawA - rawB 
        : rawB - rawA;
    }
    return 0;
  });

  // Daily trends list calculation for text display showing dates and outstanding values
  const dailyTrends = (() => {
    const dateMap: { [date: string]: { count: number; value: number } } = {};
    
    const sortedUniqueDates = [...uniqueDates].sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    sortedUniqueDates.forEach(d => {
      dateMap[d] = { count: 0, value: 0 };
    });

    filteredData.forEach(item => {
      if (dateMap[item.tanggal] !== undefined) {
        dateMap[item.tanggal].count += item.count;
        dateMap[item.tanggal].value += item.value;
      }
    });

    return sortedUniqueDates.map(d => ({
      tanggal: d,
      count: dateMap[d].count,
      value: dateMap[d].value,
    }));
  })();

  // Track max value of daily trend for rendering clean visual progress bars
  const maxPendingTrendValue = dailyTrends.reduce((max, d) => Math.max(max, d.value), 1);

  // Handle outside click close of dropdowns
  const handleDropdownContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSelectDate = (date: string) => {
    setSelectedDates(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const handleSelectCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSelectCriteria = (crit: string) => {
    setSelectedCriteria(prev => 
      prev.includes(crit) ? prev.filter(c => c !== crit) : [...prev, crit]
    );
  };

  return (
    <div className="h-screen w-screen bg-slate-50 font-sans text-slate-800 flex flex-col overflow-hidden relative select-none">
      
      {/* Decorative Top subtle line color */}
      <div className="h-1 w-full bg-blue-600" />

      {/* 1. Header (68px) */}
      <header className="h-[68px] border-b border-slate-200 bg-white px-6 flex items-center justify-between z-40 shrink-0 shadow-sm col-span-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-xl border border-blue-200">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-800 flex items-center gap-2">
              Pending Sales Order Dashboard
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full">
                Real-time
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-sans">
              Live Google Sheets Integration • Supply Chain Monitoring
            </p>
          </div>
        </div>

        {/* Filters Controls and Dynamic Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200 rounded-xl p-1">
            
            {/* Filter Date Button & Dropdown */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleDropdown('date'); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedDates.length > 0 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Tanggal</span>
                {selectedDates.length > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {selectedDates.length}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>

              <AnimatePresence>
                {openFilter === 'date' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    onClick={handleDropdownContainerClick}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 text-slate-800 animate-none"
                  >
                    <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-400">Pilih Tanggal</span>
                      {selectedDates.length > 0 && (
                        <button 
                          onClick={() => setSelectedDates([])}
                          className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                      {uniqueDates.map(date => {
                        const isChecked = selectedDates.includes(date);
                        return (
                          <label key={date} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer select-none text-slate-700">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleSelectDate(date)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white w-3.5 h-3.5"
                            />
                            <span>{date}</span>
                          </label>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Filter Category Button & Dropdown */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleDropdown('category'); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedCategories.length > 0 
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                  : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Kategori</span>
                {selectedCategories.length > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {selectedCategories.length}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>

              <AnimatePresence>
                {openFilter === 'category' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    onClick={handleDropdownContainerClick}
                    className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 text-slate-800 animate-none"
                  >
                    <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-400">Pilih Kategori</span>
                      {selectedCategories.length > 0 && (
                        <button 
                          onClick={() => setSelectedCategories([])}
                          className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs font-sans">
                      {uniqueCategories.map(cat => {
                        const isChecked = selectedCategories.includes(cat);
                        return (
                          <label key={cat} className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer select-none text-slate-700">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleSelectCategory(cat)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-white w-3.5 h-3.5"
                            />
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                              cat.trim().toUpperCase() === '1P' 
                                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                : cat.trim().toUpperCase() === '2P' 
                                  ? 'bg-purple-50 border-purple-200 text-purple-700' 
                                  : cat.trim().toUpperCase() === '3P' 
                                    ? 'bg-amber-50 border-amber-200 text-amber-700' 
                                    : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}>{cat}</span>
                          </label>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Clear All active Filters indicator */}
            {(selectedDates.length > 0 || selectedCategories.length > 0 || selectedCriteria.length > 0) && (
              <button 
                onClick={clearAllFilters}
                className="text-[11px] px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 font-semibold cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Sync status/connection metadata */}
          <div className="flex items-center gap-3">
            <div className="text-right font-sans">
              <span className="text-[10px] text-slate-400 block font-mono">
                {isOfflineMode ? (
                  <span className="text-amber-600 flex items-center gap-1 justify-end font-semibold">
                    <AlertTriangle className="h-3 w-3" /> Offline Mode
                  </span>
                ) : (
                  <span className="text-emerald-600 flex items-center gap-1.5 justify-end font-semibold">
                    <CheckCircle className="h-3 w-3" /> Live Synced
                    <span 
                      title={`Dynamic Cache Buster Active: _cb=${lastCbToken}`}
                      className="text-[9px] bg-slate-900 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-slate-800 uppercase tracking-wider cursor-help"
                    >
                      CB Active
                    </span>
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-700 font-bold block font-mono">
                Update: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <button 
              onClick={() => loadDataFromSheet(true)}
              disabled={isLoading}
              title="Perbarui Data Manual"
              className={`p-2 bg-white hover:bg-slate-50 text-slate-600 disabled:text-slate-300 rounded-xl border border-slate-200 shadow-sm cursor-pointer active:scale-95 transition-all outline-none flex items-center justify-center ${
                isLoading ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Dashboard Content (Calculated Height: 100vh - 68px) */}
      <main className="flex-1 h-[calc(100vh-68px)] p-4 flex flex-col gap-4 min-h-0 bg-slate-50">
        
        {/* TOP SECTION: Full Width Metrics Stack & Category Breakdown */}
        <div className="flex flex-col gap-3 shrink-0 w-full">
          {/* Metrics Stack */}
          <div className="grid grid-cols-3 gap-3">
             {/* Metric 1: Total SO Pending Count */}
            <div className="bg-slate-900 border-2 border-slate-950 text-white rounded-2xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden col-span-1 min-h-[140px]">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <ShoppingBag className="w-20 h-20 text-blue-400" />
              </div>
              <span className="text-xs font-black text-blue-400 tracking-widest uppercase font-sans">
                TOTAL SO COUNT
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl lg:text-[72px] font-black tracking-tight text-white font-mono leading-none">
                  {totalPendingCount.toLocaleString('id-ID')}
                </span>
                <span className="text-xs text-slate-300 font-black font-sans uppercase tracking-wider">Orders</span>
              </div>
            </div>

            {/* Metric 2: Total Pending SO Value (Highlighted & Big) */}
            <div className="bg-slate-900 border-2 border-slate-950 text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden col-span-2 min-h-[140px]">
              <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                <Database className="w-20 h-20 text-emerald-400" />
              </div>
              <span className="text-xs font-black text-emerald-400 tracking-widest uppercase font-sans">
                ★ TOTAL VALUE PENDING SO (HIGHLIGHT) ★
              </span>
              <div className="mt-2 flex flex-col justify-end h-full">
                <span className="text-5xl sm:text-6xl lg:text-[70px] xl:text-[76px] font-black tracking-normal text-white font-mono leading-none truncate" title={formatRupiah(totalPendingValue)}>
                  {formatRupiah(totalPendingValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Row: 1P, 2P, and 3P Category Breakdown (Large & Bold for Wall TV) */}
          <div className="grid grid-cols-3 gap-3">
            {/* 1P Block */}
            <div className="bg-slate-900 border-2 border-slate-950 text-white rounded-2xl p-4 shadow-md text-center flex flex-col justify-center relative overflow-hidden min-h-[96px]">
              <span className="text-xs font-black text-blue-400 uppercase tracking-widest block mb-1">
                ★ TOTAL VALUE 1P
              </span>
              <span className="text-3xl sm:text-4xl lg:text-[40px] font-black font-mono tracking-wide leading-none block text-white mt-1">
                {formatRupiah(total1PValue)}
              </span>
            </div>

            {/* 2P Block */}
            <div className="bg-slate-900 border-2 border-slate-950 text-white rounded-2xl p-4 shadow-md text-center flex flex-col justify-center relative overflow-hidden min-h-[96px]">
              <span className="text-xs font-black text-purple-400 uppercase tracking-widest block mb-1">
                ★ TOTAL VALUE 2P
              </span>
              <span className="text-3xl sm:text-4xl lg:text-[40px] font-black font-mono tracking-wide leading-none block text-white mt-1">
                {formatRupiah(total2PValue)}
              </span>
            </div>

            {/* 3P Block */}
            <div className="bg-slate-900 border-2 border-slate-950 text-white rounded-2xl p-4 shadow-md text-center flex flex-col justify-center relative overflow-hidden min-h-[96px]">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest block mb-1">
                ★ TOTAL VALUE 3P
              </span>
              <span className="text-3xl sm:text-4xl lg:text-[40px] font-black font-mono tracking-wide leading-none block text-white mt-1">
                {formatRupiah(total3PValue)}
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Two Columns of Equal Width (50% / 50% split) */}
        <div className="flex-1 flex gap-4 min-h-0 w-full">
          
          {/* COLUMN 1: Pending SO Summary Table (50% width) */}
          <section className="w-1/2 h-full flex flex-col min-h-0">
            <div className="flex-1 bg-white border-2 border-slate-300 shadow-md rounded-2xl flex flex-col overflow-hidden min-h-0 relative">
              <div className="px-5 py-3 border-b-2 border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-slate-900" />
                  <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest">
                    RINGKASAN DATA PENDING SALES ORDER (SO)
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-950 text-white rounded font-black">
                  {sortedTableData.length} ROWS
                </span>
              </div>

              {/* Scrollable table container (only scrolls if data overflows space, but designed to fit) */}
              <div className="flex-1 overflow-y-auto min-h-0 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-150 text-slate-900 sticky top-0 z-10 border-b-2 border-slate-350 text-[10px] font-black tracking-widest font-sans uppercase">
                    <tr>
                      <th 
                        onClick={() => handleSort('tanggal')}
                        className="px-4 py-2 cursor-pointer hover:bg-slate-200 transition-colors select-none"
                      >
                        <div className="flex items-center gap-1 text-black">
                          TANGGAL
                          <ArrowUpDown className={`h-3 w-3 ${sortField === 'tanggal' ? 'text-blue-700' : 'text-slate-500'}`} />
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('kategori')}
                        className="px-3 py-2 cursor-pointer hover:bg-slate-200 transition-colors select-none text-center"
                      >
                        <div className="flex items-center justify-center gap-1 text-black">
                          KATEGORI
                          <ArrowUpDown className={`h-3 w-3 ${sortField === 'kategori' ? 'text-blue-700' : 'text-slate-500'}`} />
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('count')}
                        className="px-3 py-2 cursor-pointer hover:bg-slate-200 transition-colors select-none text-right"
                      >
                        <div className="flex items-center justify-end gap-1 text-black">
                          COUNT
                          <ArrowUpDown className={`h-3 w-3 ${sortField === 'count' ? 'text-blue-700' : 'text-slate-500'}`} />
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('value')}
                        className="px-4 py-2 cursor-pointer hover:bg-slate-200 transition-colors select-none text-right"
                      >
                        <div className="flex items-center justify-end gap-1 text-black">
                          NILAI PENDING
                          <ArrowUpDown className={`h-3 w-3 ${sortField === 'value' ? 'text-blue-700' : 'text-slate-500'}`} />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-black font-mono text-[12px] font-bold">
                    {sortedTableData.length > 0 ? (
                      sortedTableData.map((row, index) => {
                        return (
                          <tr 
                            key={`${row.tanggal}-${row.kategori}-${index}`} 
                            className="hover:bg-slate-100/80 transition-colors duration-150 border-b border-slate-150"
                          >
                            <td className="px-4 py-1.5 text-black font-black text-xs">{row.tanggal}</td>
                            <td className="px-3 py-1.5 text-center">
                              <span className={`px-2 py-0.5 rounded font-black text-[10px] border shadow-xs ${
                                row.kategori.trim().toUpperCase() === '1P' 
                                  ? 'bg-blue-600 text-white border-blue-700' 
                                  : row.kategori.trim().toUpperCase() === '2P' 
                                    ? 'bg-purple-600 text-white border-purple-700' 
                                    : row.kategori.trim().toUpperCase() === '3P' 
                                      ? 'bg-amber-600 text-white border-amber-700' 
                                      : 'bg-slate-800 text-white border-slate-900'
                              }`}>
                                {row.kategori}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right font-black text-slate-900 text-xs">
                              {row.count.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-1.5 text-right font-black text-emerald-850 text-sm">
                              {formatRupiah(row.value)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-slate-500 font-sans font-black text-xs">
                          <AlertCircle className="h-6 w-6 text-slate-500 mx-auto mb-1" />
                          No data matches selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer containing brief notice */}
              <div className="px-4 py-1.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] text-slate-500 font-sans shrink-0">
                <span className="font-mono">Menampilkan {aggregatedTableData.length} records</span>
                <span className="text-[9px] text-slate-400">Sorted by: {sortField} ({sortOrder})</span>
              </div>
            </div>
          </section>

          {/* COLUMN 2: Daily Trend Charts/Cards (50% width) */}
          <section className="w-1/2 h-full flex flex-col min-h-0">
            <div className="flex-1 bg-white border-2 border-slate-300 shadow-md rounded-2xl p-4 flex flex-col min-h-0 relative">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest mb-1 flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                TREN NILAI PENDING PER HARI
              </h3>
              
              <p className="text-[11px] text-slate-600 font-semibold mb-2.5 shrink-0">
                Menampilkan urutan akumulasi nilai backlog outstanding per tanggal secara kronologis.
              </p>
              {/* Flexible, non-scroll list container that stretches elements to fit perfectly */}
              <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
                {dailyTrends.length > 0 ? (
                  dailyTrends.map((item, index) => {
                    const percentage = ((item.value / maxPendingTrendValue) * 100).toFixed(1);
                    return (
                      <div 
                        key={`${item.tanggal}-${index}`}
                        className="px-3.5 py-2 bg-slate-50 border-2 border-slate-200 hover:bg-slate-100 rounded-xl transition-all flex flex-col justify-center flex-1 min-h-0 shadow-xs"
                      >
                        <div className="flex justify-between items-center text-xs text-slate-950 mb-1">
                          <span className="font-black text-black font-mono tracking-tight flex items-center gap-1 text-xs">
                            <span className="w-1.5 h-1.5 bg-slate-950 rounded-full shrink-0" />
                            {item.tanggal}
                          </span>
                          <div className="text-right">
                            <span className="font-black text-slate-950 font-mono block text-sm leading-tight">
                              {formatRupiah(item.value)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Interactive sleek progress indicator */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative mb-1 shrink-0 border border-slate-300">
                          <div 
                             className="bg-emerald-600 h-full rounded-full transition-all duration-550"
                             style={{ width: `${percentage}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between text-[9px] text-slate-700 font-mono font-bold leading-none">
                          <span>Porsi Kontribusi: {percentage}%</span>
                          <span className="text-black font-black">{item.count.toLocaleString('id-ID')} SO PENDING</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-slate-500 font-sans font-black text-xs">
                    <AlertCircle className="h-6 w-6 text-slate-500 mx-auto mb-1" />
                    No trend records found matching selected filters.
                  </div>
                )}
              </div>
              
            </div>
          </section>

        </div>

      </main>

      {/* 3. Bottom Footer Status Strip (24px) */}
      <footer className="h-6 border-t border-slate-200 bg-white px-4 flex items-center justify-between text-[10px] text-slate-400 font-mono shrink-0 select-none z-30">
        <div>
          Dashboard Monitor System ID: <span className="text-slate-500 font-semibold">{`AIS-SO-${new Date().getFullYear()}`}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Auto query:</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-500 font-semibold">Refresh in {Math.floor(countdown / 60)}m {countdown % 60}s</span>
        </div>
      </footer>

    </div>
  );
}
