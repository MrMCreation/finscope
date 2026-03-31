/* ========================================
   FinScope — Financial Ratios Engine
   ======================================== */

const RatiosEngine = {
    /**
     * Calculate all financial ratios from parsed financial data
     * @param {Object} data - Parsed financial data with income, balance, cashflow, keystats
     * @returns {Object} - All calculated ratios grouped by pillar
     */
    calculate(data) {
        const { income, balance, cashflow, keystats } = data;
        const years = Object.keys(income || {});
        if (!years.length) return null;

        const result = {
            profitability: this.calcProfitability(income, balance, years),
            solvency: this.calcSolvency(income, balance, years),
            liquidity: this.calcLiquidity(balance, years),
            activity: this.calcActivity(income, balance, years),
            valuation: this.calcValuation(income, balance, keystats, years)
        };

        return result;
    },

    // Helper: safe division
    div(a, b) {
        if (!b || b === 0 || a == null) return null;
        return a / b;
    },

    // Helper: format ratio value
    fmt(val, type = 'pct') {
        if (val == null || isNaN(val)) return '—';
        if (type === 'pct') return (val * 100).toFixed(2) + '%';
        if (type === 'x') return val.toFixed(2) + 'x';
        if (type === 'days') return val.toFixed(1) + ' ' + Lang.t('days');
        if (type === 'num') return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
        if (type === 'currency') return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
        return val.toFixed(2);
    },

    // ─── PROFITABILITY ───
    calcProfitability(inc, bal, years) {
        const metrics = [
            { name: 'Gross Profit Margin', key: 'grossMargin', type: 'pct' },
            { name: 'Operating Profit Margin', key: 'operatingMargin', type: 'pct' },
            { name: 'Net Profit Margin', key: 'netMargin', type: 'pct' },
            { name: 'EBITDA Margin', key: 'ebitdaMargin', type: 'pct' },
            { name: 'Return on Assets (ROA)', key: 'roa', type: 'pct' },
            { name: 'Return on Equity (ROE)', key: 'roe', type: 'pct' },
            { name: 'Earnings Per Share (EPS)', key: 'eps', type: 'num' },
        ];

        const data = {};
        years.forEach(y => {
            const i = inc[y] || {};
            const b = bal[y] || {};
            data[y] = {
                grossMargin: this.div(i.grossProfit, i.revenue),
                operatingMargin: this.div(i.operatingIncome, i.revenue),
                netMargin: this.div(i.netIncome, i.revenue),
                ebitdaMargin: this.div(i.ebitda, i.revenue),
                roa: this.div(i.netIncome, b.totalAssets),
                roe: this.div(i.netIncome, b.totalEquity || b.totalStockholdersEquity),
                eps: i.eps || null,
            };
        });

        return { metrics, data, icon: '📈', colorClass: 'profitability', title: 'Profitability Ratios' };
    },

    // ─── SOLVENCY ───
    calcSolvency(inc, bal, years) {
        const metrics = [
            { name: 'Debt-to-Equity Ratio', key: 'debtToEquity', type: 'x' },
            { name: 'Debt-to-Assets Ratio', key: 'debtToAssets', type: 'pct' },
            { name: 'Equity Ratio', key: 'equityRatio', type: 'pct' },
            { name: 'Interest Coverage Ratio', key: 'interestCoverage', type: 'x' },
            { name: 'Long-term Debt to Equity', key: 'ltDebtToEquity', type: 'x' },
            { name: 'Debt Service Coverage', key: 'dscr', type: 'x' },
        ];

        const data = {};
        years.forEach(y => {
            const i = inc[y] || {};
            const b = bal[y] || {};
            const equity = b.totalEquity || b.totalStockholdersEquity || 0;
            const totalDebt = b.totalDebt || ((b.shortTermDebt || 0) + (b.longTermDebt || 0));
            data[y] = {
                debtToEquity: this.div(totalDebt, equity),
                debtToAssets: this.div(totalDebt, b.totalAssets),
                equityRatio: this.div(equity, b.totalAssets),
                interestCoverage: this.div(i.operatingIncome, i.interestExpense ? Math.abs(i.interestExpense) : null),
                ltDebtToEquity: this.div(b.longTermDebt, equity),
                dscr: this.div(i.operatingIncome, totalDebt > 0 ? totalDebt : null),
            };
        });

        return { metrics, data, icon: '🛡️', colorClass: 'solvency', title: 'Solvency Ratios' };
    },

    // ─── LIQUIDITY ───
    calcLiquidity(bal, years) {
        const metrics = [
            { name: 'Current Ratio', key: 'currentRatio', type: 'x' },
            { name: 'Quick Ratio', key: 'quickRatio', type: 'x' },
            { name: 'Cash Ratio', key: 'cashRatio', type: 'x' },
            { name: 'Working Capital', key: 'workingCapital', type: 'currency' },
            { name: 'Working Capital Ratio', key: 'wcRatio', type: 'pct' },
        ];

        const data = {};
        years.forEach(y => {
            const b = bal[y] || {};
            const currentAssets = b.totalCurrentAssets || 0;
            const currentLiab = b.totalCurrentLiabilities || 0;
            const inventory = b.inventory || 0;
            const cash = b.cashAndCashEquivalents || b.cashAndShortTermInvestments || 0;
            data[y] = {
                currentRatio: this.div(currentAssets, currentLiab),
                quickRatio: this.div(currentAssets - inventory, currentLiab),
                cashRatio: this.div(cash, currentLiab),
                workingCapital: currentAssets - currentLiab,
                wcRatio: this.div(currentAssets - currentLiab, currentAssets),
            };
        });

        return { metrics, data, icon: '💧', colorClass: 'liquidity', title: 'Liquidity Ratios' };
    },

    // ─── ACTIVITY ───
    calcActivity(inc, bal, years) {
        const metrics = [
            { name: 'Asset Turnover', key: 'assetTurnover', type: 'x' },
            { name: 'Fixed Asset Turnover', key: 'fixedAssetTurnover', type: 'x' },
            { name: 'Receivables Turnover', key: 'receivablesTurnover', type: 'x' },
            { name: 'Inventory Turnover', key: 'inventoryTurnover', type: 'x' },
            { name: 'Payables Turnover', key: 'payablesTurnover', type: 'x' },
            { name: 'Days Sales Outstanding', key: 'dso', type: 'days' },
            { name: 'Days Inventory Outstanding', key: 'dio', type: 'days' },
            { name: 'Days Payable Outstanding', key: 'dpo', type: 'days' },
        ];

        const data = {};
        years.forEach(y => {
            const i = inc[y] || {};
            const b = bal[y] || {};
            const receivables = b.netReceivables || b.accountsReceivable || 0;
            const inventory = b.inventory || 0;
            const payables = b.accountsPayables || b.accountPayables || 0;
            const cogs = i.costOfRevenue || i.costOfGoodsSold || 0;
            const ppe = b.propertyPlantEquipmentNet || b.propertyPlantAndEquipment || 0;

            const recTurnover = this.div(i.revenue, receivables);
            const invTurnover = this.div(cogs, inventory);
            const payTurnover = this.div(cogs, payables);

            data[y] = {
                assetTurnover: this.div(i.revenue, b.totalAssets),
                fixedAssetTurnover: this.div(i.revenue, ppe),
                receivablesTurnover: recTurnover,
                inventoryTurnover: invTurnover,
                payablesTurnover: payTurnover,
                dso: recTurnover ? 365 / recTurnover : null,
                dio: invTurnover ? 365 / invTurnover : null,
                dpo: payTurnover ? 365 / payTurnover : null,
            };
        });

        return { metrics, data, icon: '⚡', colorClass: 'activity', title: 'Activity Ratios' };
    },

    // ─── MARKET VALUATION ───
    calcValuation(inc, bal, keystats, years) {
        const metrics = [
            { name: 'Market Capitalization', key: 'marketCap', type: 'currency' },
            { name: 'Enterprise Value', key: 'ev', type: 'currency' },
            { name: 'P/E Ratio', key: 'pe', type: 'x' },
            { name: 'P/B Ratio', key: 'pb', type: 'x' },
            { name: 'EV/EBITDA', key: 'evEbitda', type: 'x' },
            { name: 'Price/Sales (P/S)', key: 'ps', type: 'x' },
            { name: 'EV/Revenue', key: 'evRevenue', type: 'x' },
            { name: 'Dividend Yield', key: 'dividendYield', type: 'pct' },
        ];

        const data = {};
        years.forEach(y => {
            const i = inc[y] || {};
            const b = bal[y] || {};
            const k = keystats[y] || {};
            const equity = b.totalEquity || b.totalStockholdersEquity || 0;
            const marketCap = k.marketCapitalization || null;
            const ev = k.enterpriseValue || null;

            data[y] = {
                marketCap: marketCap,
                ev: ev,
                pe: this.div(marketCap, i.netIncome),
                pb: this.div(marketCap, equity),
                evEbitda: this.div(ev, i.ebitda),
                ps: this.div(marketCap, i.revenue),
                evRevenue: this.div(ev, i.revenue),
                dividendYield: i.dividendYield || k.dividendYield || null,
            };
        });

        return { metrics, data, icon: '💎', colorClass: 'valuation', title: 'Market Valuation Ratios' };
    },

    /**
     * Render ratios into an HTML container
     */
    renderRatios(ratios, years) {
        if (!ratios) return `<p class="val-neutral" style="text-align:center;padding:40px;">${Lang.t('No data available to compute ratios.')}</p>`;

        const pillars = ['profitability', 'solvency', 'liquidity', 'activity', 'valuation'];
        let html = '<div class="ratios-grid">';

        pillars.forEach(key => {
            const pillar = ratios[key];
            if (!pillar) return;

            html += `
            <div class="ratio-card">
                <div class="ratio-card-header">
                    <div class="ratio-icon ${pillar.colorClass}">${pillar.icon}</div>
                    <span class="ratio-card-title">${Lang.t(pillar.title)}</span>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>${Lang.t('Metric')}</th>`;

            years.forEach(y => { html += `<th>${y}</th>`; });
            html += `</tr></thead><tbody>`;

            pillar.metrics.forEach(m => {
                html += `<tr><td>${m.name}</td>`;
                years.forEach(y => {
                    const val = pillar.data[y]?.[m.key];
                    const formatted = this.fmt(val, m.type);
                    let cls = '';
                    if (val != null && typeof val === 'number') {
                        if (m.type === 'pct' || m.type === 'x') {
                            // context-dependent coloring
                            if (m.key === 'debtToEquity' || m.key === 'debtToAssets' || m.key === 'ltDebtToEquity') {
                                cls = val > 1 ? 'val-negative' : 'val-positive';
                            } else if (m.type === 'pct' && val < 0) {
                                cls = 'val-negative';
                            }
                        }
                    }
                    html += `<td class="${cls}">${formatted}</td>`;
                });
                html += `</tr>`;
            });

            html += `</tbody></table></div></div>`;
        });

        html += '</div>';
        return html;
    }
};
