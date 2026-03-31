/* ========================================
   FinScope — Main Application (Web Version)
   Client-side parsing via IDXParser + CF Worker CORS relay
   ======================================== */

// ─── Configuration ───
// IMPORTANT: Replace this with your actual Cloudflare Worker URL after deployment!
const WORKER_BASE = 'https://mrm-finscope.workers.dev';

// ─── State ───
const AppState = {
    allData: {},          // { ticker: { income, balance, cashflow, keystats, years, ratios } }
    activeTicker: null,
    activeTab: 'income',
    macroData: null,
};

// ─── DOM References ───
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
    form: $('#queryForm'),
    tickerInput: $('#tickerInput'),
    startYear: $('#startYear'),
    endYear: $('#endYear'),
    fetchBtn: $('#fetchBtn'),
    loadingOverlay: $('#loadingOverlay'),
    toastContainer: $('#toastContainer'),
    resultsArea: $('#resultsArea'),
    emptyState: $('#emptyState'),
    incompleteDataAlert: $('#incompleteDataAlert'),
    incompleteDataList: $('#incompleteDataList'),
    tickerTabs: $('#tickerTabs'),
    tabContent: $('#tabContent'),
    btnCustomExport: $('#btnCustomExport'),
    exportModal: $('#exportModal'),
    btnCloseModal: $('#btnCloseModal'),
    checkAllMetrics: $('#checkAllMetrics'),
    metricsGrid: $('#metricsGrid'),
    btnDoCustomExport: $('#btnDoCustomExport'),
    exportFormatToggle: $('#exportFormatToggle'),
    
    // Auth DOM
    loginPage: $('#loginPage'),
    appShell: $('#appShell'),
    loginForm: $('#loginForm'),
    usernameInput: $('#usernameInput'),
    passwordInput: $('#passwordInput'),
    btnLogin: $('#btnLogin'),
    btnPricingInfo: $('#btnPricingInfo'),
    pricingModal: $('#pricingModal'),
    btnClosePricingModal: $('#btnClosePricingModal')
};


// ─── Client-Side Data Fetching (via IDXParser + CF Worker) ───
async function fetchFinancials(ticker, startYear, endYear) {
    // IDXParser.fetchAndParse handles: download via CF Worker → parse with SheetJS → merge
    const result = await IDXParser.fetchAndParse(ticker, startYear, endYear, WORKER_BASE);
    
    if (!result) {
        throw new Error(`No IDX data found for "${ticker}" between ${startYear}-${endYear}`);
    }

    return result;
}


// ─── Data Parser ───
// Metadata keys to exclude from financial data display
const META_KEYS = new Set([
    'date', 'symbol', 'reportedCurrency', 'cik', 'fillingDate',
    'acceptedDate', 'period', 'link', 'finalLink', 'calendarYear', 'fiscalYear',
]);

function parseAPIResponse(json) {
    const result = {
        income: {},
        balance: {},
        cashflow: {},
        keystats: {},
        years: [],
        // Bilingual labels and section structures from parser
        incomeLabels: {},
        incomeSections: [],
        balanceLabels: {},
        balanceSections: [],
        cashflowLabels: {},
        cashflowSections: [],
    };

    if (!json || !json.statements) return result;

    const typeMap = {
        'INCOME_STATEMENT': 'income',
        'BALANCE_SHEET': 'balance',
        'CASH_FLOW': 'cashflow',
        'KEY_STATS': 'keystats',
    };

    const yearSet = new Set();

    json.statements.forEach(stmt => {
        const targetKey = typeMap[stmt.type];
        if (!targetKey || !stmt.data) return;

        // Store labels and sections
        if (stmt.labels) {
            result[targetKey + 'Labels'] = stmt.labels;
            if (typeof Lang !== 'undefined') {
                if (!Lang.metricLabels.en) Lang.metricLabels.en = {};
                Object.entries(stmt.labels).forEach(([k, vals]) => {
                    if (vals.id) Lang.metricLabels.id[k] = vals.id;
                    if (vals.en) Lang.metricLabels.en[k] = vals.en;
                });
            }
        }
        if (stmt.sections) result[targetKey + 'Sections'] = stmt.sections;

        stmt.data.forEach(entry => {
            const year = entry.calendarYear || entry.fiscalYear;
            if (!year) return;
            
            yearSet.add(String(year));
            
            if (!result[targetKey][year]) result[targetKey][year] = {};
            
            Object.entries(entry).forEach(([key, val]) => {
                if (META_KEYS.has(key)) return;
                result[targetKey][year][key] = val;
            });
        });
    });

    result.years = Array.from(yearSet).sort();
    return result;
}

// ─── Dynamic Table Renderer (sections & labels from IDX Excel) ───
const STATEMENT_TITLES = {
    income: 'Income Statement',
    balance: 'Balance Sheet',
    cashflow: 'Cash Flow Statement',
};

function formatCurrency(val) {
    if (val == null || val === '' || isNaN(val) || val === 0) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(val);
}

function renderStatementTable(statementData, years, stmtType, labels, sections) {
    const title = STATEMENT_TITLES[stmtType] || stmtType;

    if (!statementData || !years.length) {
        return `<div style="text-align:center;padding:40px;color:var(--text-muted);">${Lang.t('No data available.')}</div>`;
    }

    // Collect all available keys that have at least one non-null, non-zero value across all years
    const availableKeys = new Set();
    years.forEach(y => {
        if (statementData[y]) {
            Object.keys(statementData[y]).forEach(k => {
                const v = statementData[y][k];
                if (v != null && v !== '' && !isNaN(v) && v !== 0) availableKeys.add(k);
            });
        }
    });

    // Helper: get display label for a key using bilingual labels
    function getLabel(key) {
        if (labels && labels[key]) {
            const isID = typeof Lang !== 'undefined' && Lang.current === 'id';
            return isID ? labels[key].id : labels[key].en;
        }
        return key;
    }

    // Helper: detect per-share items that should not use currency formatting
    function isPerShare(key) {
        const lk = key.toLowerCase();
        return lk.includes('per share') || lk.includes('per saham');
    }

    let html = `
    <div class="table-card">
        <div class="table-card-header">
            <span class="table-card-title">${Lang.t(title)} <span class="badge">${years.length} ${Lang.t('years')}</span></span>
        </div>
        <div class="table-wrapper">
            <table class="data-table">
                <thead><tr><th>${Lang.t('Metric')}</th>`;
    years.forEach(y => { html += `<th>${y}</th>`; });
    html += `</tr></thead><tbody>`;

    const rendered = new Set();

    // Render by dynamic sections
    if (sections && sections.length) {
        sections.forEach(sec => {
            const secLabel = (typeof Lang !== 'undefined' && Lang.current === 'id') ? sec.id : sec.en;
            const sectionKeys = (sec.items || []).filter(k => availableKeys.has(k));
            if (!sectionKeys.length) return;

            html += `<tr class="section-header"><td colspan="${years.length + 1}">${secLabel}</td></tr>`;

            sectionKeys.forEach(key => {
                const label = getLabel(key);
                html += `<tr><td>${label}</td>`;
                years.forEach(y => {
                    const val = statementData[y]?.[key];
                    let formatted, cls = '';

                    if (isPerShare(key) && val != null) {
                        formatted = typeof val === 'number' ? val.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : val;
                    } else {
                        formatted = formatCurrency(val);
                    }

                    if (val != null && typeof val === 'number' && val < 0) cls = 'val-negative';
                    html += `<td class="${cls}">${formatted}</td>`;
                });
                html += `</tr>`;
                rendered.add(key);
            });
        });
    }

    // Render remaining keys not covered by any section
    const remaining = Array.from(availableKeys).filter(k => !rendered.has(k));
    if (remaining.length) {
        html += `<tr class="section-header"><td colspan="${years.length + 1}">${Lang.t('Other')}</td></tr>`;
        remaining.forEach(key => {
            const label = getLabel(key);
            html += `<tr><td>${label}</td>`;
            years.forEach(y => {
                const val = statementData[y]?.[key];
                const formatted = isPerShare(key) && val != null
                    ? val.toLocaleString('id-ID', { maximumFractionDigits: 2 })
                    : formatCurrency(val);
                const cls = (val != null && typeof val === 'number' && val < 0) ? 'val-negative' : '';
                html += `<td class="${cls}">${formatted}</td>`;
            });
            html += `</tr>`;
        });
    }

    html += `</tbody></table></div></div>`;
    return html;
}

function labelFromKey(key) {
    return Lang.labelFromKey(key);
}

// ─── UI Controllers ───
function showLoading() { DOM.loadingOverlay.classList.remove('hidden'); }
function hideLoading() { DOM.loadingOverlay.classList.add('hidden'); }

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' : 
              type === 'success' ? '<circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>' : 
              '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'}
        </svg>
        <span>${message}</span>
    `;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
}

function renderTickerTabs() {
    const tickers = Object.keys(AppState.allData);
    if (tickers.length <= 1) {
        DOM.tickerTabs.innerHTML = '';
        DOM.tickerTabs.style.display = 'none';
        return;
    }

    DOM.tickerTabs.style.display = 'flex';
    DOM.tickerTabs.innerHTML = tickers.map(t => 
        `<button class="ticker-tab ${t === AppState.activeTicker ? 'active' : ''}" data-ticker="${t}">${t}</button>`
    ).join('');
}

function renderActiveTickerData() {
    const data = AppState.allData[AppState.activeTicker];
    if (!data) return;

    const years = data.years;

    // Render statement tables using dynamic sections/labels from IDX Excel
    $('#incomeTab').innerHTML = renderStatementTable(data.income, years, 'income', data.incomeLabels, data.incomeSections);
    $('#balanceTab').innerHTML = renderStatementTable(data.balance, years, 'balance', data.balanceLabels, data.balanceSections);
    $('#cashflowTab').innerHTML = renderStatementTable(data.cashflow, years, 'cashflow', data.cashflowLabels, data.cashflowSections);

    // Render ratios
    const ratios = RatiosEngine.calculate(data);
    data.ratios = ratios;
    $('#ratiosTab').innerHTML = RatiosEngine.renderRatios(ratios, years);
}

function switchTab(tabName) {
    AppState.activeTab = tabName;
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    $$('.tab-pane').forEach(p => p.classList.remove('active'));
    $(`#${tabName}Tab`).classList.add('active');

    if (tabName === 'macro') {
        DOM.resultsArea.classList.remove('hidden');
        DOM.emptyState.classList.add('hidden');
        DOM.tickerTabs.style.display = 'none';
        if (AppState.macroData) {
            renderMacroData(AppState.macroData);
        } else {
            $('#macroTab').innerHTML = `<div class="macro-loading"><div class="spinner" style="margin:0 auto 16px;"></div>${Lang.t('Loading macroeconomic data...')}</div>`;
            fetchMacroData();
        }
    } else {
        if (Object.keys(AppState.allData).length > 1) {
            DOM.tickerTabs.style.display = 'flex';
        }
    }
}

function switchTicker(ticker) {
    AppState.activeTicker = ticker;
    renderTickerTabs();
    renderActiveTickerData();
}

// ─── Main Form Handler ───
async function handleSubmit(e) {
    e.preventDefault();

    const rawTickers = DOM.tickerInput.value.trim();
    const startYear = parseInt(DOM.startYear.value);
    const endYear = parseInt(DOM.endYear.value);

    if (!rawTickers) {
        showToast(Lang.t('Please enter at least one ticker symbol.'), 'error');
        return;
    }

    if (startYear > endYear) {
        showToast(Lang.t('Start year cannot be after end year.'), 'error');
        return;
    }

    const tickers = rawTickers.split(/[\n,]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
    if (!tickers.length) {
        showToast(Lang.t('No valid tickers provided.'), 'error');
        return;
    }

    showLoading();
    if (DOM.incompleteDataAlert) DOM.incompleteDataAlert.classList.add('hidden');

    const loadingTextEl = DOM.loadingOverlay.querySelector('.loading-text');
    const prevLoadingHtml = loadingTextEl ? loadingTextEl.innerHTML : '';
    if (loadingTextEl) {
        loadingTextEl.innerHTML = `${Lang.t('Loading')}<span class="dots"></span>`;
    }
    
    // Update progress indicator text
    const progressEl = DOM.loadingOverlay.querySelector('#loadingProgress');
    if (progressEl) {
        progressEl.textContent = `0 / ${tickers.length}`;
    }

    AppState.allData = {};
    let successCount = 0;
    let completedCount = 0;
    
    // Process tickers sequentially to avoid overwhelming CF Worker
    const results = [];
    for (const ticker of tickers) {
        const result = await Promise.allSettled([
            fetchFinancials(ticker, startYear, endYear)
        ]);
        results.push(result[0]);
        completedCount++;
        if (progressEl) progressEl.textContent = `${completedCount} / ${tickers.length}`;
    }
    
    // Restore original loading text
    if (loadingTextEl) loadingTextEl.innerHTML = prevLoadingHtml;

    // Build expected years list
    const expectedYears = [];
    for (let y = startYear; y <= endYear; y++) expectedYears.push(String(y));
    
    const incompleteNotices = [];

    results.forEach((result, i) => {
        const ticker = tickers[i];
        if (result.status === 'fulfilled') {
            const parsed = parseAPIResponse(result.value);
            if (parsed.years.length > 0) {
                AppState.allData[ticker] = parsed;
                successCount++;
                const missingYears = expectedYears.filter(y => !parsed.years.includes(y));
                if (missingYears.length > 0) {
                    incompleteNotices.push({ ticker, msg: Lang.current === 'id' ? `Tahun tidak lengkap/hilang: ${missingYears.join(', ')}` : `Missing year(s): ${missingYears.join(', ')}` });
                }
            } else {
                showToast(Lang.tf('no_data_for_ticker', { ticker }), 'error');
                incompleteNotices.push({ ticker, msg: Lang.current === 'id' ? 'Gagal ditarik / tidak ada data sama sekali.' : 'No data retrieved for any requested years.' });
            }
        } else {
            showToast(result.reason?.message || Lang.tf('error_fetching', { ticker }), 'error');
            let errMsg = result.reason?.message || 'Unknown error';
            incompleteNotices.push({ ticker, msg: Lang.current === 'id' ? `Error: ${errMsg}` : `Error: ${errMsg}` });
        }
    });

    hideLoading();

    if (incompleteNotices.length > 0) {
        DOM.incompleteDataList.innerHTML = incompleteNotices.map(item => `<li><strong>${item.ticker}</strong>: <span style="color:var(--text-secondary);">${item.msg}</span></li>`).join('');
        DOM.incompleteDataAlert.classList.remove('hidden');
    } else {
        DOM.incompleteDataAlert.classList.add('hidden');
    }

    if (successCount > 0) {
        const firstTicker = Object.keys(AppState.allData)[0];
        AppState.activeTicker = firstTicker;

        DOM.emptyState.classList.add('hidden');
        DOM.resultsArea.classList.remove('hidden');

        renderTickerTabs();
        renderActiveTickerData();
        switchTab('income');

        // Enable export button
        DOM.btnCustomExport.disabled = false;

        showToast(Lang.tf('success_loaded', { count: successCount }), 'success');
    } else {
        DOM.resultsArea.classList.add('hidden');
        DOM.emptyState.classList.remove('hidden');
        DOM.btnCustomExport.disabled = true;
    }
}

// ─── Macroeconomics (via CF Worker relay) ───
async function fetchMacroData() {
    try {
        const startYear = parseInt(DOM.startYear.value) || 2020;
        const endYear = parseInt(DOM.endYear.value) || new Date().getFullYear();
        const result = {};

        // --- Yahoo Finance: IHSG & USDIDR (via CF Worker relay) ---
        const yfMap = [
            { key: 'ihsg', symbol: '^JKSE' },
            { key: 'usdIdr', symbol: 'IDR=X' },
        ];

        const yfPromises = yfMap.map(async ({ key, symbol }) => {
            try {
                const resp = await fetch(`${WORKER_BASE}/api/yahoo?symbol=${encodeURIComponent(symbol)}&range=15y&interval=1mo`);
                if (!resp.ok) return;
                const json = await resp.json();
                const chart = json?.chart?.result?.[0];
                if (!chart) return;

                const meta = chart.meta || {};
                const closes = chart.indicators?.quote?.[0]?.close || [];
                const timestamps = chart.timestamp || [];
                const current = meta.regularMarketPrice || 0;
                const prevClose = meta.chartPreviousClose || current;
                const changePct = prevClose ? ((current - prevClose) / prevClose * 100) : 0;

                const yearly = {};
                timestamps.forEach((ts, i) => {
                    if (i < closes.length && closes[i] != null) {
                        const dt = new Date(ts * 1000);
                        const yr = dt.getFullYear();
                        if (yr >= startYear && yr <= endYear) {
                            yearly[yr] = closes[i];
                        }
                    }
                });

                result[key] = {
                    current: Math.round(current * 100) / 100,
                    changePct: Math.round(changePct * 100) / 100,
                    history: Object.entries(yearly)
                        .sort(([a], [b]) => a - b)
                        .map(([y, v]) => ({ year: parseInt(y), value: Math.round(v * 100) / 100 }))
                };
            } catch (e) {
                console.warn(`[Macro] Yahoo ${key} error:`, e);
            }
        });

        // --- World Bank API (via CF Worker relay) ---
        const wbIndicators = {
            gdp: 'NY.GDP.MKTP.KD.ZG',
            inflation: 'FP.CPI.TOTL.ZG',
            unemployment: 'SL.UEM.TOTL.ZS',
            interestRate: 'FR.INR.DPST',
        };

        const wbPromises = Object.entries(wbIndicators).map(async ([key, indicator]) => {
            try {
                const resp = await fetch(`${WORKER_BASE}/api/worldbank?indicator=${indicator}&mrv=15`);
                if (!resp.ok) return;
                const data = await resp.json();
                if (data.length > 1 && data[1]) {
                    const entries = data[1]
                        .filter(item => item.value != null && parseInt(item.date) >= startYear && parseInt(item.date) <= endYear)
                        .map(item => ({ year: parseInt(item.date), value: Math.round(item.value * 100) / 100 }))
                        .sort((a, b) => a.year - b.year);
                    
                    if (entries.length > 0) {
                        result[key] = {
                            current: entries[entries.length - 1].value,
                            year: entries[entries.length - 1].year,
                            history: entries,
                        };
                    }
                }
            } catch (e) {
                console.warn(`[Macro] World Bank ${key} error:`, e);
            }
        });

        // Fetch all macro sources in parallel
        await Promise.all([...yfPromises, ...wbPromises]);

        AppState.macroData = result;
        if (AppState.activeTab === 'macro') {
            renderMacroData(result);
        }
    } catch (e) {
        $('#macroTab').innerHTML = `<div class="macro-loading">${Lang.t('Failed to load macroeconomic data.')}</div>`;
    }
}

function renderMacroData(data) {
    const metrics = [
        { key: 'gdp',          icon: '📊', label: 'GDP Growth (YoY)',  unit: '%', color: 'cyan' },
        { key: 'inflation',    icon: '📈', label: 'Inflation (YoY)',   unit: '%', color: 'amber' },
        { key: 'unemployment', icon: '👥', label: 'Unemployment',      unit: '%', color: 'purple' },
        { key: 'interestRate', icon: '🏦', label: 'Interest Rate',     unit: '%', color: 'blue' },
        { key: 'usdIdr',       icon: '💱', label: 'USD/IDR Exchange',  unit: '',  color: 'green' },
        { key: 'ihsg',         icon: '🇮🇩', label: 'IHSG Index',        unit: '',  color: 'red' },
    ];

    let html = '<div class="macro-grid">';
    metrics.forEach(m => {
        const d = data[m.key];
        if (!d) return;

        const isMarket = m.key === 'usdIdr' || m.key === 'ihsg';
        const displayVal = isMarket
            ? d.current.toLocaleString('id-ID', { maximumFractionDigits: 2 })
            : d.current.toFixed(2) + m.unit;

        let changeHtml = '';
        if (d.changePct !== undefined) {
            const cls = d.changePct >= 0 ? 'val-positive' : 'val-negative';
            const arrow = d.changePct >= 0 ? '▲' : '▼';
            changeHtml = `<span class="macro-change ${cls}">${arrow} ${Math.abs(d.changePct).toFixed(2)}%</span>`;
        } else if (d.year) {
            changeHtml = `<span class="macro-year-badge">${Lang.t('Latest Data')}: ${d.year}</span>`;
        }

        let historyHtml = '';
        if (d.history && d.history.length) {
            historyHtml = `<div class="macro-history"><table>`;
            d.history.slice().reverse().forEach(h => {
                const val = m.unit === '%' ? h.value.toFixed(2) + '%' : h.value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
                historyHtml += `<tr><td>${h.year}</td><td>${val}</td></tr>`;
            });
            historyHtml += '</table></div>';
        }

        html += `
            <div class="macro-card macro-${m.color}">
                <div class="macro-card-header">
                    <span class="macro-icon">${m.icon}</span>
                    <span class="macro-label">${Lang.t(m.label)}</span>
                </div>
                <div class="macro-value">${displayVal}</div>
                ${changeHtml}
                ${historyHtml}
            </div>`;
    });
    html += '</div>';
    $('#macroTab').innerHTML = html;
}

// ─── Event Listeners ───
DOM.form.addEventListener('submit', handleSubmit);

// Language toggle
$('#langToggle').addEventListener('click', () => {
    Lang.set(Lang.current === 'en' ? 'id' : 'en');
});

// Statement tab switching
$$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Ticker tab switching (event delegation)
DOM.tickerTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.ticker-tab');
    if (btn) switchTicker(btn.dataset.ticker);
});

// --- Export Logic ---

// --- Custom Export Modal Logic ---
DOM.btnCustomExport.addEventListener('click', () => {
    openCustomExportModal();
});

DOM.btnCloseModal.addEventListener('click', () => {
    DOM.exportModal.classList.add('hidden');
});

// Close modal when clicking outside
DOM.exportModal.addEventListener('click', (e) => {
    if (e.target === DOM.exportModal) {
        DOM.exportModal.classList.add('hidden');
    }
});

DOM.checkAllMetrics.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    $$('.metric-cb').forEach(cb => cb.checked = isChecked);
});

// --- Format Toggle Logic ---
DOM.exportFormatToggle.addEventListener('click', (e) => {
    const opt = e.target.closest('.format-option');
    if (!opt) return;
    
    // Update active visual state
    DOM.exportFormatToggle.querySelectorAll('.format-option').forEach(el => el.classList.remove('active'));
    opt.classList.add('active');
    
    // Update underlying dataset format value
    DOM.exportFormatToggle.dataset.format = opt.dataset.val;
});

DOM.btnDoCustomExport.addEventListener('click', () => {
    const checked = Array.from($$('.metric-cb')).filter(cb => cb.checked).map(cb => cb.value);
    if (!checked.length) {
        showToast(Lang.t('Please select at least one metric.'), 'error');
        return;
    }
    ExportModule.customExcelExport(AppState.allData, checked, AppState.macroData, DOM.exportFormatToggle.dataset.format);
    DOM.exportModal.classList.add('hidden');
    showToast(Lang.t('Custom Excel exported successfully!'), 'success');
});

// --- Auth Logic (via CF Worker relay) ---
DOM.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = DOM.usernameInput.value.trim();
    const password = DOM.passwordInput.value.trim();
    
    if(!username || !password) return;
    
    const originalBtnHTML = DOM.btnLogin.innerHTML;
    DOM.btnLogin.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> ${Lang.t('Verifying...')}`;
    DOM.btnLogin.disabled = true;

    try {
        const response = await fetch(`${WORKER_BASE}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showToast(result.message, 'success');
            setTimeout(() => {
                DOM.loginPage.classList.add('hidden');
                DOM.appShell.classList.remove('hidden');
            }, 600);
        } else if (result.status === 'expired') {
            showToast(result.message, 'error');
            DOM.btnLogin.innerHTML = originalBtnHTML;
            DOM.btnLogin.disabled = false;
        } else {
            showToast(result.message || 'Authentication failed', 'error');
            DOM.btnLogin.innerHTML = originalBtnHTML;
            DOM.btnLogin.disabled = false;
        }
    } catch(err) {
        showToast(Lang.t('Connection error during authentication'), 'error');
        DOM.btnLogin.innerHTML = originalBtnHTML;
        DOM.btnLogin.disabled = false;
    }
});

let promoTimerInterval = null;
function startPromoCountdown() {
    if (promoTimerInterval) clearInterval(promoTimerInterval);
    let endTime = sessionStorage.getItem('promoEndTime');
    if (!endTime || Date.now() > endTime) {
        endTime = Date.now() + (Math.floor(Math.random() * 2 * 3600 + 3600) * 1000); // 1h to 3h
        sessionStorage.setItem('promoEndTime', endTime);
    }
    
    const display = $('#promoCountdown');
    if (!display) return;

    function update() {
        const diff = Math.max(0, endTime - Date.now());
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        display.textContent = `${h}:${m}:${s}`;
        if (diff === 0) clearInterval(promoTimerInterval);
    }
    
    update();
    promoTimerInterval = setInterval(update, 1000);
}

DOM.btnPricingInfo.addEventListener('click', () => {
    DOM.pricingModal.classList.remove('hidden');
    startPromoCountdown();
});

DOM.btnClosePricingModal.addEventListener('click', () => {
    DOM.pricingModal.classList.add('hidden');
});

DOM.pricingModal.addEventListener('click', (e) => {
    if (e.target === DOM.pricingModal) {
        DOM.pricingModal.classList.add('hidden');
    }
});

async function openCustomExportModal() {
    DOM.btnCustomExport.disabled = true;
    const prevText = DOM.btnCustomExport.innerHTML;
    DOM.btnCustomExport.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;border-top-color:var(--text-primary);display:inline-block;margin-right:5px"></span>' + Lang.t('Loading...');
    
    // Ensure macro data is fetched before showing modal so it can be added to export
    if (!AppState.macroData) {
        await fetchMacroData();
    }
    
    DOM.btnCustomExport.innerHTML = prevText;
    DOM.btnCustomExport.disabled = false;

    DOM.metricsGrid.innerHTML = '';
    const categories = {
        'Income Statement': new Set(),
        'Balance Sheet': new Set(),
        'Cash Flow': new Set(),
        'Key Stats': new Set(),
        'Financial Ratios': new Set(),
        'Macroeconomics': new Set()
    };

    if (AppState.macroData) {
        categories['Macroeconomics'].add(Lang.t('GDP Growth (YoY)'));
        categories['Macroeconomics'].add(Lang.t('Inflation (YoY)'));
        categories['Macroeconomics'].add(Lang.t('Unemployment'));
        categories['Macroeconomics'].add(Lang.t('Interest Rate'));
        categories['Macroeconomics'].add(Lang.t('USD/IDR Exchange'));
        categories['Macroeconomics'].add(Lang.t('IHSG Index'));
    }

    Object.values(AppState.allData).forEach(data => {
        data.years.forEach(y => {
            if (data.income && data.income[y]) Object.keys(data.income[y]).forEach(k => categories['Income Statement'].add(k));
            if (data.balance && data.balance[y]) Object.keys(data.balance[y]).forEach(k => categories['Balance Sheet'].add(k));
            if (data.cashflow && data.cashflow[y]) Object.keys(data.cashflow[y]).forEach(k => categories['Cash Flow'].add(k));
            if (data.keystats && data.keystats[y]) Object.keys(data.keystats[y]).forEach(k => categories['Key Stats'].add(k));
        });
        if (data.ratios) {
            ['profitability', 'solvency', 'liquidity', 'activity', 'valuation'].forEach(p => {
                if(data.ratios[p]) data.ratios[p].metrics.forEach(m => categories['Financial Ratios'].add(m.name));
            });
        }
    });

    // Special requested metrics explicit inclusion
    categories['Key Stats'].add('Stock Price');

    let html = '';
    for (const [catName, keysSet] of Object.entries(categories)) {
        if (keysSet.size === 0) continue;
        html += `<div class="metrics-category">${catName === 'Macroeconomics' ? Lang.t('Macroeconomics') : Lang.t(catName) || catName}</div>`;
        Array.from(keysSet).sort().forEach(key => {
            const label = catName === 'Financial Ratios' || catName === 'Macroeconomics' || key === 'Stock Price' ? key : labelFromKey(key);
            html += `<label class="metric-item"><input type="checkbox" class="metric-cb" value="${label}" checked> <span>${label}</span></label>`;
        });
    }

    DOM.metricsGrid.innerHTML = html;
    DOM.checkAllMetrics.checked = true; // Default to all checked initially
    DOM.exportModal.classList.remove('hidden');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        DOM.form.dispatchEvent(new Event('submit'));
    }
    if (e.key === 'Escape' && !DOM.exportModal.classList.contains('hidden')) {
        DOM.exportModal.classList.add('hidden');
    }
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    Lang.set(Lang.current);
});
