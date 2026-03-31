/* ========================================
   FinScope — Export Module (CSV + Excel)
   ======================================== */

const ExportModule = {
    /**
     * Export all ticker data + ratios to CSV
     */
    exportCSV(allTickerData) {
        const lines = [];
        
        Object.entries(allTickerData).forEach(([ticker, data]) => {
            const years = data.years || [];
            
            // Income Statement
            lines.push(`\n=== ${ticker} — Income Statement ===`);
            lines.push(['Metric', ...years].join(','));
            if (data.income) {
                Object.keys(data.income[years[0]] || {}).forEach(key => {
                    const row = [this.labelFromKey(key)];
                    years.forEach(y => row.push(data.income[y]?.[key] ?? ''));
                    lines.push(row.join(','));
                });
            }

            // Balance Sheet
            lines.push(`\n=== ${ticker} — Balance Sheet ===`);
            lines.push(['Metric', ...years].join(','));
            if (data.balance) {
                Object.keys(data.balance[years[0]] || {}).forEach(key => {
                    const row = [this.labelFromKey(key)];
                    years.forEach(y => row.push(data.balance[y]?.[key] ?? ''));
                    lines.push(row.join(','));
                });
            }

            // Cash Flow
            lines.push(`\n=== ${ticker} — Cash Flow ===`);
            lines.push(['Metric', ...years].join(','));
            if (data.cashflow) {
                Object.keys(data.cashflow[years[0]] || {}).forEach(key => {
                    const row = [this.labelFromKey(key)];
                    years.forEach(y => row.push(data.cashflow[y]?.[key] ?? ''));
                    lines.push(row.join(','));
                });
            }

            // Ratios
            if (data.ratios) {
                const pillars = ['profitability', 'solvency', 'liquidity', 'activity', 'valuation'];
                pillars.forEach(p => {
                    const pillar = data.ratios[p];
                    if (!pillar) return;
                    lines.push(`\n=== ${ticker} — ${pillar.title} ===`);
                    lines.push(['Metric', ...years].join(','));
                    pillar.metrics.forEach(m => {
                        const row = [m.name];
                        years.forEach(y => {
                            const val = pillar.data[y]?.[m.key];
                            row.push(val != null ? val : '');
                        });
                        lines.push(row.join(','));
                    });
                });
            }
        });

        const csv = lines.join('\n');
        this.downloadFile(csv, 'FinScope_Export.csv', 'text/csv');
    },

    /**
     * Export all ticker data + ratios to Excel
     */
    exportExcel(allTickerData) {
        if (typeof XLSX === 'undefined') {
            showToast('SheetJS library not loaded. Cannot export Excel.', 'error');
            return;
        }

        const wb = XLSX.utils.book_new();

        Object.entries(allTickerData).forEach(([ticker, data]) => {
            const years = data.years || [];
            const shortTicker = ticker.replace('.JK', '').substring(0, 12);

            // Income Statement sheet
            if (data.income) {
                const rows = this.buildSheetRows(data.income, years);
                const ws = XLSX.utils.aoa_to_sheet([['Metric', ...years], ...rows]);
                this.applyColumnWidths(ws, years.length + 1);
                XLSX.utils.book_append_sheet(wb, ws, `${shortTicker}_Income`.substring(0, 31));
            }

            // Balance Sheet
            if (data.balance) {
                const rows = this.buildSheetRows(data.balance, years);
                const ws = XLSX.utils.aoa_to_sheet([['Metric', ...years], ...rows]);
                this.applyColumnWidths(ws, years.length + 1);
                XLSX.utils.book_append_sheet(wb, ws, `${shortTicker}_Balance`.substring(0, 31));
            }

            // Cash Flow
            if (data.cashflow) {
                const rows = this.buildSheetRows(data.cashflow, years);
                const ws = XLSX.utils.aoa_to_sheet([['Metric', ...years], ...rows]);
                this.applyColumnWidths(ws, years.length + 1);
                XLSX.utils.book_append_sheet(wb, ws, `${shortTicker}_CashFlow`.substring(0, 31));
            }

            // Ratios
            if (data.ratios) {
                const ratioRows = [];
                const pillars = ['profitability', 'solvency', 'liquidity', 'activity', 'valuation'];
                pillars.forEach(p => {
                    const pillar = data.ratios[p];
                    if (!pillar) return;
                    ratioRows.push([pillar.title]);
                    pillar.metrics.forEach(m => {
                        const row = [m.name];
                        years.forEach(y => {
                            const val = pillar.data[y]?.[m.key];
                            row.push(val != null ? val : '');
                        });
                        ratioRows.push(row);
                    });
                    ratioRows.push([]);
                });
                const ws = XLSX.utils.aoa_to_sheet([['Metric', ...years], ...ratioRows]);
                this.applyColumnWidths(ws, years.length + 1);
                XLSX.utils.book_append_sheet(wb, ws, `${shortTicker}_Ratios`.substring(0, 31));
            }
        });

        XLSX.writeFile(wb, 'FinScope_Export.xlsx');
    },

    /**
     * Export selected data into a single merged sheet mimicking the requested screenshot layout
     */
    customExcelExport(allTickerData, selectedLabels, macroData, formatSpec = 'en') {
        if (typeof XLSX === 'undefined') {
            showToast('SheetJS library not loaded. Cannot export Excel.', 'error');
            return;
        }

        const headers = ['No', 'Tickers', 'Year Date', ...selectedLabels.map(label => {
            const macroPercentLabels = [Lang.t('GDP Growth (YoY)'), Lang.t('Inflation (YoY)'), Lang.t('Unemployment'), Lang.t('Interest Rate')];
            if (macroPercentLabels.includes(label)) {
                return label.includes('%') ? label : label.replace('(YoY)', 'YoY').trim() + ' (%)';
            }
            return label;
        })];
        const rows = [headers];
        const merges = [];

        let currentRowIdx = 1;
        let tickerNo = 1;

        Object.entries(allTickerData).forEach(([ticker, data]) => {
            const years = data.years || [];
            if (years.length === 0) return;

            const startRow = currentRowIdx;
            const endRow = currentRowIdx + years.length - 1;

            if (years.length > 1) {
                // columns A(0), B(1) vertically merged
                merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } });
                merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } });
            }

            years.forEach((y, idx) => {
                const rowParams = [];
                
                if (idx === 0) {
                    rowParams.push(tickerNo);
                    rowParams.push(ticker.replace('.JK', ''));
                } else {
                    rowParams.push('');
                    rowParams.push('');
                }

                rowParams.push(y);

                selectedLabels.forEach(label => {
                    let foundVal = undefined;
                    
                    // --- Macro Data Matching ---
                    const macroMapping = {
                        [Lang.t('GDP Growth (YoY)')]: 'gdp',
                        [Lang.t('Inflation (YoY)')]: 'inflation',
                        [Lang.t('Unemployment')]: 'unemployment',
                        [Lang.t('Interest Rate')]: 'interestRate',
                        [Lang.t('USD/IDR Exchange')]: 'usdIdr',
                        [Lang.t('IHSG Index')]: 'ihsg'
                    };

                    if (macroMapping[label]) {
                        const mKey = macroMapping[label];
                        if (macroData && macroData[mKey] && macroData[mKey].history) {
                            const entry = macroData[mKey].history.find(h => h.year == y);
                            if (entry && entry.value !== undefined && entry.value !== null) {
                                if (['gdp', 'inflation', 'unemployment', 'interestRate'].includes(mKey)) {
                                    if (formatSpec === 'id') {
                                        foundVal = entry.value.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                                    } else {
                                        foundVal = entry.value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                                    }
                                } else if (mKey === 'ihsg') {
                                    if (formatSpec === 'id') {
                                        foundVal = Number(entry.value).toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                                    } else {
                                        foundVal = Number(entry.value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                                    }
                                } else {
                                    foundVal = entry.value; 
                                }
                            } else {
                                foundVal = '-';
                            }
                        } else {
                            foundVal = '-';
                        }
                    } else {
                        // --- Financial Data Matching ---
                        const findInBlock = (block) => {
                            if (!block || !block[y]) return undefined;
                            for (const [key, v] of Object.entries(block[y])) {
                                if (this.labelFromKey(key) === label) return v;
                            }
                            return undefined;
                        };

                        foundVal = findInBlock(data.income);
                        if (foundVal === undefined) foundVal = findInBlock(data.balance);
                        if (foundVal === undefined) foundVal = findInBlock(data.cashflow);
                        if (foundVal === undefined) foundVal = findInBlock(data.keystats);
                        
                        // Specific override for "Stock Price" using market cap / shares
                        if (foundVal === undefined && label === 'Stock Price') {
                            const k = data.keystats && data.keystats[y];
                            if (k && k.marketCapitalization && k.numberOfShares) {
                                foundVal = k.marketCapitalization / k.numberOfShares;
                            }
                        }

                        if (foundVal === undefined && data.ratios) {
                            for (const pillar of ['profitability', 'solvency', 'liquidity', 'activity', 'valuation']) {
                                const p = data.ratios[pillar];
                                if (!p) continue;
                                const metric = p.metrics.find(m => m.name === label);
                                if (metric) {
                                    foundVal = p.data[y] ? p.data[y][metric.key] : undefined;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundVal !== undefined && foundVal !== null && foundVal !== '-') {
                        if (typeof foundVal === 'number') {
                            if (formatSpec === 'id') {
                                foundVal = foundVal.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                            } else {
                                foundVal = foundVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                            }
                        }
                    }

                    rowParams.push(foundVal !== undefined && foundVal !== null ? foundVal : '-');
                });

                rows.push(rowParams);
                currentRowIdx++;
            });

            tickerNo++;
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        if (merges.length) ws['!merges'] = merges;
        
        // --- Apply Styling (requires xlsx-js-style library) ---
        const borderStyle = { 
            top: { style: "thin", color: { rgb: "000000" } }, 
            bottom: { style: "thin", color: { rgb: "000000" } }, 
            left: { style: "thin", color: { rgb: "000000" } }, 
            right: { style: "thin", color: { rgb: "000000" } } 
        };

        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };

                const cell = ws[cellRef];
                
                // Base style
                let cellStyle = { 
                    border: borderStyle,
                    alignment: { vertical: "center", horizontal: "center" },
                    font: { name: "Arial", sz: 10 }
                };

                // Conditional styling
                if (R === 0) {
                    // Header row
                    cellStyle.font = { name: "Arial", sz: 10, bold: true };
                } else if (C === 0 || C === 1) {
                    // Ticker NO and Ticker Symbol column
                    cellStyle.font = { name: "Arial", sz: 10, bold: true };
                }

                cell.s = cellStyle;
            }
        }
        // -----------------------------------------------------

        const wscols = [
            { wch: 6 },  // No
            { wch: 14 }, // Tickers
            { wch: 12 }, // Year Date
        ];
        selectedLabels.forEach(() => wscols.push({ wch: 20 }));
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Analysis Data");
        XLSX.writeFile(wb, 'FinScope_Custom_Export.xlsx');
    },

    buildSheetRows(statementByYear, years) {
        const allKeys = new Set();
        years.forEach(y => {
            if (statementByYear[y]) Object.keys(statementByYear[y]).forEach(k => allKeys.add(k));
        });
        
        const rows = [];
        allKeys.forEach(key => {
            const row = [this.labelFromKey(key)];
            years.forEach(y => row.push(statementByYear[y]?.[key] ?? ''));
            rows.push(row);
        });
        return rows;
    },

    applyColumnWidths(ws, cols) {
        ws['!cols'] = Array.from({ length: cols }, (_, i) => ({ wch: i === 0 ? 35 : 18 }));
    },

    labelFromKey(key) {
        return Lang.labelFromKey(key);
    },

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
