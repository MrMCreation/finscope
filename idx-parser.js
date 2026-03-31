/* ========================================
   FinScope IDX — Client-Side XLSX Parser
   Port of idx_parser.py → JavaScript (SheetJS)
   ======================================== */

const IDXParser = {

    /**
     * Parse an IDX Financial Statement XLSX file.
     * @param {ArrayBuffer} arrayBuffer - Raw XLSX file bytes
     * @param {boolean} usePriorYear - If true, read PriorYear column instead of CurrentYear
     * @returns {object|null} { balance, income, cashflow } each with { data, labels, sections }
     */
    parse(arrayBuffer, usePriorYear = false) {
        let wb;
        try {
            wb = XLSX.read(arrayBuffer, { type: 'array' });
        } catch (e) {
            console.warn('[IDXParser] Error reading XLSX:', e);
            return null;
        }

        const sheets = wb.SheetNames;

        // Helper: read a sheet as a 2D array of raw values
        const readRows = (sheetName, maxRows) => {
            const ws = wb.Sheets[sheetName];
            if (!ws) return [];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: true });
            if (maxRows !== undefined) return rows.slice(0, maxRows);
            return rows;
        };

        // --- Identify General Information sheet ---
        const genInfoSheet = sheets.find(s => s.startsWith('100') || s === '1000000') || null;

        // --- Universal sheet detection (all IDX XBRL Taxonomy sectors) ---
        const BS_PREFIXES = ['121', '2', '42'];
        const IS_PREFIXES = ['131', '132', '3', '43'];
        const CF_PREFIXES = ['151', '45', '51'];

        const BS_KEYWORDS = ['financial position', 'posisi keuangan', 'neraca', 'balance sheet',
            'statement of financial position', 'laporan posisi keuangan'];
        const IS_KEYWORDS = ['profit or loss', 'laba rugi', 'income statement', 'comprehensive income',
            'pendapatan komprehensif', 'laporan laba', 'statement of profit'];
        const CF_KEYWORDS = ['cash flow', 'arus kas', 'statement of cash flows', 'laporan arus kas'];

        const findAllSheets = (prefixes, keywords) => {
            const candidates = [];

            // Step 1: Prefix matching
            for (const s of sheets) {
                if (s.endsWith('PY')) continue;
                if (prefixes.some(p => s.startsWith(p)) && !candidates.includes(s)) {
                    candidates.push(s);
                }
            }

            // Step 2: Keyword fallback (only if no prefix matches)
            if (candidates.length > 0) return candidates;

            for (const s of sheets) {
                if (candidates.includes(s) || s.endsWith('PY') || s.startsWith('100')) continue;
                try {
                    const peek = readRows(s, 5);
                    const text = peek.map(row =>
                        row.filter(v => typeof v === 'string').map(v => v.toLowerCase()).join(' ')
                    ).join(' ');
                    if (keywords.some(kw => text.includes(kw))) {
                        candidates.push(s);
                    }
                } catch (e) { /* skip */ }
            }
            return candidates;
        };

        const bsCandidates = findAllSheets(BS_PREFIXES, BS_KEYWORDS);
        const isCandidates = findAllSheets(IS_PREFIXES, IS_KEYWORDS);
        const cfCandidates = findAllSheets(CF_PREFIXES, CF_KEYWORDS);

        // --- Detect scale multiplier and currency conversion ---
        let scaleMultiplier = 1;
        let currencyRate = 1;
        let currencyName = 'IDR';

        if (genInfoSheet) {
            try {
                const genRows = readRows(genInfoSheet);
                for (const row of genRows) {
                    for (const cell of row) {
                        if (typeof cell !== 'string') continue;
                        const lc = cell.toLowerCase();

                        // Scale detection
                        if (lc.includes('jutaan') || lc.includes('millions')) {
                            scaleMultiplier = 1_000_000;
                        } else if (lc.includes('miliaran') || lc.includes('milyaran') || lc.includes('billions')) {
                            scaleMultiplier = 1_000_000_000;
                        } else if (lc.includes('ribuan') || lc.includes('thousands')) {
                            scaleMultiplier = 1_000;
                        }

                        // Currency detection
                        if (lc.includes('mata uang pelaporan') || lc.includes('presentation currency')) {
                            for (const cv of row) {
                                if (typeof cv !== 'string') continue;
                                const cvl = cv.toLowerCase();
                                if (cvl.includes('dollar') || cvl.includes('usd')) currencyName = 'USD';
                                else if (cvl.includes('euro') || cvl.includes('eur')) currencyName = 'EUR';
                                else if (cvl.includes('yen') || cvl.includes('jpy')) currencyName = 'JPY';
                            }
                        }

                        // Conversion rate
                        if (lc.includes('kurs konversi') || lc.includes('conversion rate')) {
                            for (const cv of row) {
                                if (typeof cv === 'number' && !isNaN(cv) && cv > 0) {
                                    currencyRate = cv;
                                    break;
                                }
                            }
                        }
                    }
                }

                if (currencyName === 'IDR') currencyRate = 1;

                console.log(`[IDXParser] Scale: ${scaleMultiplier}`);
                if (currencyName !== 'IDR') {
                    console.log(`[IDXParser] Currency: ${currencyName}, rate: ${currencyRate.toLocaleString()}`);
                }
            } catch (e) {
                console.warn('[IDXParser] Gen info error:', e);
            }
        }

        // --- Smart scale validation (median sampling) ---
        if (scaleMultiplier > 1) {
            const checkSheet = bsCandidates[0] || isCandidates[0] || cfCandidates[0];
            if (checkSheet) {
                try {
                    const checkRows = readRows(checkSheet);
                    const sampleValues = [];
                    for (let i = 0; i < Math.min(50, checkRows.length); i++) {
                        const row = checkRows[i];
                        if (row && row.length > 1) {
                            const v = row[1]; // Column 1 = typically CurrentYear
                            if (typeof v === 'number' && !isNaN(v) && Math.abs(v) > 0) {
                                sampleValues.push(Math.abs(v));
                            }
                        }
                    }
                    if (sampleValues.length > 0) {
                        sampleValues.sort((a, b) => a - b);
                        const medianVal = sampleValues[Math.floor(sampleValues.length / 2)];
                        if (medianVal > 1_000_000_000) {
                            console.warn(`[IDXParser] Scale override: text says ${scaleMultiplier} but median=${medianVal.toLocaleString()} → using 1`);
                            scaleMultiplier = 1;
                        } else {
                            console.log(`[IDXParser] Scale validated: median=${medianVal.toLocaleString()}, using ${scaleMultiplier}`);
                        }
                    }
                } catch (e) {
                    console.warn('[IDXParser] Scale validation error:', e);
                }
            }
        }

        // --- Sheet extractor ---
        const extractSheet = (sheetName) => {
            const data = {};
            const labels = {};
            const sections = [];
            let currentItems = [];

            if (!sheetName) return { data, labels, sections };

            let rows;
            try {
                rows = readRows(sheetName);
            } catch (e) {
                console.warn(`[IDXParser] Error reading sheet ${sheetName}:`, e);
                return { data, labels, sections };
            }

            if (!rows.length) return { data, labels, sections };

            const numCols = Math.max(...rows.slice(0, 20).map(r => r ? r.length : 0));

            // Detect column roles from header row
            let currentCol = null;
            let priorCol = null;
            let headerRowIdx = -1;

            for (let ridx = 0; ridx < Math.min(10, rows.length); ridx++) {
                const row = rows[ridx];
                if (!row) continue;
                for (let ci = 0; ci < row.length; ci++) {
                    const cell = row[ci];
                    if (typeof cell !== 'string') continue;
                    const cl = cell.toLowerCase().trim();
                    if (cl.startsWith('currentyear')) {
                        currentCol = ci;
                        headerRowIdx = ridx;
                    } else if (cl.includes('prioryear') || cl.includes('priorendyear')) {
                        priorCol = ci;
                    }
                }
            }

            // Fallback defaults
            if (currentCol === null) currentCol = 1;
            if (priorCol === null && numCols >= 4) priorCol = 2;

            const valCol = (usePriorYear && priorCol !== null) ? priorCol : currentCol;

            // Robust en_col detection: rightmost column with string content
            let enCol = numCols - 1;
            const maxColToCheck = priorCol !== null ? Math.max(currentCol, priorCol) : currentCol;

            for (let cid = numCols - 1; cid > maxColToCheck; cid--) {
                let stringCount = 0;
                for (let ridx = headerRowIdx + 1; ridx < Math.min(headerRowIdx + 21, rows.length); ridx++) {
                    const row = rows[ridx];
                    if (!row || cid >= row.length) continue;
                    const cv = row[cid];
                    if (typeof cv === 'string' && cv.trim() && !cv.trim().startsWith('[')) {
                        stringCount++;
                    }
                }
                if (stringCount >= 2) {
                    enCol = cid;
                    break;
                }
            }

            // Process data rows
            for (let ridx = headerRowIdx + 1; ridx < rows.length; ridx++) {
                const row = rows[ridx];
                if (!row) continue;

                // Indonesian label (column 0)
                let idLabel = null;
                if (row[0] != null && typeof row[0] === 'string') {
                    idLabel = row[0].trim();
                }

                // English label (en_col)
                let enLabel = null;
                if (enCol < row.length && row[enCol] != null && typeof row[enCol] === 'string') {
                    enLabel = row[enCol].trim();
                }

                if (!idLabel && !enLabel) continue;

                // Skip sheet descriptor rows
                if (idLabel && idLabel.startsWith('[')) continue;

                // Get raw value from chosen column
                const rawVal = (valCol < row.length) ? row[valCol] : null;

                // Robust numeric detection: handles accounting negatives "(768)" and string commas "25,305"
                let floatVal = null;
                if (typeof rawVal === 'number' && !isNaN(rawVal)) {
                    floatVal = rawVal;
                } else if (typeof rawVal === 'string') {
                    let s = rawVal.trim();
                    let isNeg = false;
                    if (s.startsWith('(') && s.endsWith(')')) {
                        isNeg = true;
                        s = s.slice(1, -1).trim();
                    }
                    s = s.replace(/,/g, '');
                    const parsed = parseFloat(s);
                    if (!isNaN(parsed)) {
                        floatVal = isNeg ? -parsed : parsed;
                    }
                }

                const hasValue = floatVal !== null;

                if (hasValue && (idLabel || enLabel)) {
                    // --- DATA ROW ---
                    const key = enLabel || idLabel;
                    const labelId = idLabel || enLabel;
                    const labelEn = enLabel || idLabel;

                    let val = floatVal;

                    // Don't scale per-share metrics
                    const isPerShare = (labelId.toLowerCase().includes('per saham')) ||
                        (labelEn.toLowerCase().includes('per share'));
                    if (!isPerShare) {
                        val *= scaleMultiplier * currencyRate;
                    }

                    // Handle duplicate keys
                    let uniqueKey = key;
                    let counter = 2;
                    while (uniqueKey in data) {
                        uniqueKey = `${key} (${counter})`;
                        counter++;
                    }

                    data[uniqueKey] = val;
                    labels[uniqueKey] = { id: labelId, en: labelEn };
                    currentItems.push(uniqueKey);

                } else if (idLabel) {
                    // --- SECTION HEADER ---
                    currentItems = [];
                    sections.push({
                        id: idLabel,
                        en: enLabel || idLabel,
                        items: currentItems,
                    });
                }
            }

            return { data, labels, sections };
        };

        // --- Best sheet selection ---
        const extractBestSheet = (candidates) => {
            let bestD = {}, bestL = {}, bestS = [], maxLen = -1, bestName = null;
            for (const s of candidates) {
                const { data: d, labels: l, sections: sec } = extractSheet(s);
                if (Object.keys(d).length > maxLen) {
                    maxLen = Object.keys(d).length;
                    bestD = d; bestL = l; bestS = sec; bestName = s;
                }
            }
            return { data: bestD, labels: bestL, sections: bestS, sheetName: bestName };
        };

        const bs = extractBestSheet(bsCandidates);
        const is = extractBestSheet(isCandidates);
        const cf = extractBestSheet(cfCandidates);

        console.log(`[IDXParser] Best Sheets: BS=${bs.sheetName}, IS=${is.sheetName}, CF=${cf.sheetName}`);

        return {
            balance: { data: bs.data, labels: bs.labels, sections: bs.sections },
            income: { data: is.data, labels: is.labels, sections: is.sections },
            cashflow: { data: cf.data, labels: cf.labels, sections: cf.sections },
        };
    },

    /**
     * Full pipeline: download multiple years via CF Worker relay, parse, and merge.
     * Replicates server.py handle_api_proxy + merge_statement logic.
     *
     * @param {string} ticker - e.g. "BBRI.JK" or "BBRI"
     * @param {number} startYear
     * @param {number} endYear
     * @param {string} workerBase - CF Worker base URL
     * @param {function} onProgress - callback(completedCount, totalCount)
     * @returns {object|null} Merged data compatible with AppState.allData[ticker]
     */
    async fetchAndParse(ticker, startYear, endYear, workerBase, onProgress) {
        // Strip .JK suffix
        const cleanTicker = ticker.split('.')[0].toUpperCase().trim();

        const allYears = [];
        for (let y = startYear; y <= endYear; y++) allYears.push(y);

        // Need files for [startYear..endYear] + endYear+1 (for PriorYear strategy)
        const neededYears = [...new Set([...allYears, endYear + 1])];

        // --- Phase 1: Parallel download ---
        const downloadCache = {}; // year -> ArrayBuffer | null
        let completed = 0;

        const downloadPromises = neededYears.map(async (yr) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout per file

                const resp = await fetch(`${workerBase}/api/idx?ticker=${cleanTicker}&year=${yr}`, {
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (resp.ok) {
                    const buf = await resp.arrayBuffer();
                    // Validate XLSX magic bytes
                    const magic = new Uint8Array(buf.slice(0, 4));
                    if (magic[0] === 0x50 && magic[1] === 0x4B) {
                        downloadCache[yr] = buf;
                    } else {
                        console.warn(`[IDXParser] ${cleanTicker} ${yr}: response is not XLSX`);
                        downloadCache[yr] = null;
                    }
                } else {
                    downloadCache[yr] = null;
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    console.warn(`[IDXParser] ${cleanTicker} ${yr}: download timed out`);
                } else {
                    console.warn(`[IDXParser] ${cleanTicker} ${yr}: download error:`, e.message);
                }
                downloadCache[yr] = null;
            } finally {
                completed++;
                if (onProgress) onProgress(completed, neededYears.length);
            }
        });

        await Promise.all(downloadPromises);

        // --- Phase 2: Parse & assemble (sequential, CPU-bound in browser) ---
        const yearsData = [];

        const isValidData = (d) => {
            if (!d) return false;
            for (const k of ['income', 'balance', 'cashflow']) {
                if (d[k] && Object.keys(d[k].data).length > 0) return true;
            }
            return false;
        };

        for (const yr of allYears) {
            let parsedData = null;
            const nextYr = yr + 1;

            // Strategy 1: Read PriorYear from Y+1 file
            if (downloadCache[nextYr]) {
                const pdTemp = this.parse(downloadCache[nextYr], true);
                if (isValidData(pdTemp)) {
                    parsedData = pdTemp;
                    console.log(`[IDXParser] Year ${yr}: from ${nextYr} file PriorYear ✓`);
                }
            }

            // Strategy 2: Read CurrentYear from Y file
            if (!parsedData && downloadCache[yr]) {
                const pdTemp2 = this.parse(downloadCache[yr], false);
                if (isValidData(pdTemp2)) {
                    parsedData = pdTemp2;
                    console.log(`[IDXParser] Year ${yr}: from ${yr} file CurrentYear ✓`);
                }
            }

            if (parsedData) {
                parsedData.year = yr;
                yearsData.push(parsedData);
            } else {
                console.warn(`[IDXParser] Year ${yr}: no data available`);
            }
        }

        if (yearsData.length === 0) return null;

        // --- Phase 3: Merge into AppState-compatible format ---
        return this._mergeYearsData(yearsData);
    },

    /**
     * Merge multi-year parsed data into the format expected by the renderer.
     * Replicates server.py merge_statement logic.
     */
    _mergeYearsData(yearsData) {
        const typeMap = { income: 'INCOME_STATEMENT', balance: 'BALANCE_SHEET', cashflow: 'CASH_FLOW' };
        const result = { statements: [] };

        for (const [key, stype] of Object.entries(typeMap)) {
            const allData = [];
            const allLabels = {};
            const sectionCandidates = [];

            for (const yd of yearsData) {
                const yr = yd.year;
                const stmt = yd[key];
                const d = { ...stmt.data, calendarYear: yr, fiscalYear: yr };
                allData.push(d);
                Object.assign(allLabels, stmt.labels);
                sectionCandidates.push(stmt.sections);
            }

            // Use section structure with most items covered
            let best = [];
            if (sectionCandidates.length > 0) {
                best = sectionCandidates.reduce((a, b) => {
                    const aCount = a.reduce((sum, sec) => sum + sec.items.length, 0);
                    const bCount = b.reduce((sum, sec) => sum + sec.items.length, 0);
                    return bCount > aCount ? b : a;
                });
            }

            // Find uncovered items
            const covered = new Set();
            for (const sec of best) {
                for (const item of sec.items) covered.add(item);
            }
            const allKeys = new Set();
            for (const d of allData) {
                for (const k of Object.keys(d)) {
                    if (k !== 'calendarYear' && k !== 'fiscalYear') allKeys.add(k);
                }
            }
            const uncovered = [...allKeys].filter(k => !covered.has(k));
            if (uncovered.length > 0) {
                best = [...best, { id: 'Lainnya', en: 'Other', items: uncovered.sort() }];
            }

            result.statements.push({
                type: stype,
                data: allData,
                labels: allLabels,
                sections: best,
            });
        }

        return result;
    },
};
