/* ========================================
   FinScope — Language Module (EN / ID)
   ======================================== */

const Lang = {
    current: 'id',

    translations: {
        en: {
            'ticker_placeholder': 'For Indonesian stocks, please add (.JK) at the end.\ne.g. BBCA.JK, BBRI.JK',
            'no_data_for_ticker': 'No data returned for "{ticker}" in the specified period.',
            'success_loaded': 'Successfully loaded {count} ticker(s)',
            'error_fetching': 'Error fetching "{ticker}"',
        },
        id: {
            // Login
            'Welcome to FinScope': 'Selamat Datang di FinScope',
            'Sign in to access the financial dashboard': 'Masuk untuk mengakses dashboard keuangan',
            'Username': 'Nama Pengguna',
            'Password': 'Kata Sandi',
            'Sign In': 'Masuk',
            'Verifying...': 'Memverifikasi...',

            // Header
            'Financial Statement Analyzer': 'Analisis Laporan Keuangan',
            'Export': 'Ekspor',

            // Query form
            'Tickers': 'Kode Saham',
            'ticker_placeholder': 'Untuk saham Indonesia, tambahkan (.JK) di akhir.\nContoh: BBCA.JK, BBRI.JK',
            'Separate with commas or new lines.': 'Pisahkan dengan koma atau baris baru.',
            'Start Year': 'Tahun Awal',
            'End Year': 'Tahun Akhir',
            'Analyze': 'Analisis',

            // Statement tabs
            'Income Statement': 'Laporan Laba Rugi',
            'Balance Sheet': 'Laporan Posisi Keuangan',
            'Cash Flow': 'Laporan Arus Kas',
            'Cash Flow Statement': 'Laporan Arus Kas',
            'Financial Ratios': 'Rasio Keuangan',

            // Macroeconomics tab
            'Macroeconomics': 'Makroekonomi',
            'GDP Growth (YoY)': 'Pertumbuhan PDB (YoY)',
            'Inflation (YoY)': 'Inflasi (YoY)',
            'Unemployment': 'Pengangguran',
            'Interest Rate': 'Suku Bunga',
            'USD/IDR Exchange': 'Kurs USD/IDR',
            'IHSG Index': 'Indeks IHSG',
            'Loading macroeconomic data...': 'Memuat data makroekonomi...',
            'Failed to load macroeconomic data.': 'Gagal memuat data makroekonomi.',
            'Year': 'Tahun',
            'Value': 'Nilai',
            'Latest Data': 'Data Terbaru',
            'Change': 'Perubahan',
            'History': 'Riwayat',

            // Loading
            'In just a few seconds': 'Dalam beberapa detik',
            'Loading': 'Memuat',

            // Empty state
            'Enter tickers to begin analysis': 'Masukkan kode saham untuk memulai analisis',
            'Input one or more stock tickers above to fetch and analyze financial statements with comprehensive ratio calculations.': 'Masukkan satu atau lebih kode saham di atas untuk mengambil dan menganalisis laporan keuangan dengan perhitungan rasio yang komprehensif.',

            // Export modal
            'Custom Excel Export': 'Ekspor Excel Kustom',
            'Select the specific data columns you want to include in the exported Excel file.': 'Pilih kolom data spesifik yang ingin Anda sertakan dalam file Excel yang diekspor.',
            'Select All Data': 'Pilih Semua Data',
            'Download Custom Excel': 'Unduh Excel Kustom',

            // Pricing modal
            'Subscription Packages': 'Paket Berlangganan',
            'Weekly': 'Mingguan',
            'Monthly': 'Bulanan',
            'Yearly': 'Tahunan',
            '7 Days': '7 Hari',
            '30 Days': '30 Hari',
            'Special Offer Ends In:': 'Penawaran Spesial Berakhir Dalam:',
            'Best Value': 'Pilihan Terbaik',
            'No Limit Usage': 'Tanpa Batasan Kuota',
            'To order an account or renew your subscription, please contact:': 'Untuk memesan akun atau memperpanjang langganan, silakan hubungi:',

            // Toast messages
            'Please enter at least one ticker symbol.': 'Silakan masukkan setidaknya satu kode saham.',
            'Start year cannot be after end year.': 'Tahun awal tidak boleh setelah tahun akhir.',
            'No valid tickers provided.': 'Tidak ada kode saham yang valid.',
            'Please select at least one metric.': 'Silakan pilih setidaknya satu metrik.',
            'Custom Excel exported successfully!': 'Ekspor Excel kustom berhasil!',
            'Connection error during authentication': 'Kesalahan koneksi saat autentikasi',
            'no_data_for_ticker': 'Tidak ada data untuk "{ticker}" dalam periode yang ditentukan.',
            'success_loaded': 'Berhasil memuat {count} kode saham',
            'error_fetching': 'Gagal mengambil data "{ticker}"',

            // Table
            'Metric': 'Metrik',
            'Other': 'Lainnya',
            'No data available.': 'Data tidak tersedia.',
            'No data available to compute ratios.': 'Data tidak tersedia untuk menghitung rasio.',
            'years': 'tahun',

            // Misc UI
            'Number Format:': 'Format Angka:',
            'Loading...': 'Memuat...',
            'days': 'hari',

            // Income Statement sections
            'Revenue & Gross Profit': 'Pendapatan & Laba Kotor',
            'Operating Performance': 'Kinerja Operasional',
            'Bottom Line': 'Laba Bersih',
            'EBITDA': 'EBITDA',

            // Balance Sheet sections
            'Current Assets': 'Aset Lancar',
            'Non-Current Assets': 'Aset Tidak Lancar',
            'Total Assets': 'Total Aset',
            'Current Liabilities': 'Utang Jangka Pendek',
            'Non-Current Liabilities': 'Utang Jangka Panjang',
            'Total Liabilities': 'Total Utang',
            'Equity': 'Ekuitas',
            'Debt Summary': 'Ringkasan Utang',

            // Cash Flow sections
            'Operating Activities': 'Aktivitas Operasi',
            'Investing Activities': 'Aktivitas Investasi',
            'Financing Activities': 'Aktivitas Pendanaan',
            'Summary': 'Ringkasan',

            // Ratio titles
            'Profitability Ratios': 'Rasio Profitabilitas',
            'Solvency Ratios': 'Rasio Solvabilitas',
            'Liquidity Ratios': 'Rasio Likuiditas',
            'Activity Ratios': 'Rasio Aktivitas',
            'Market Valuation Ratios': 'Rasio Valuasi Pasar',

            // Export categories
            'Income Statement (section)': 'Laporan Laba Rugi',
            'Balance Sheet (section)': 'Laporan Posisi Keuangan',
            'Cash Flow (section)': 'Laporan Arus Kas',
            'Key Stats': 'Statistik Utama',
            'Financial Ratios (section)': 'Rasio Keuangan',
        }
    },

    // Metric labels: camelCase API keys → Indonesian (PSAK)
    metricLabels: {
        en: {},
        id: {
            // Income Statement
            revenue: 'Pendapatan',
            costOfRevenue: 'Beban Pokok Penjualan',
            grossProfit: 'Laba Kotor',
            grossProfitRatio: 'Gross Profit Margin (GPM)',
            operatingExpenses: 'Beban Operasional',
            sellingGeneralAndAdministrativeExpenses: 'Beban Penjualan, Umum dan Administrasi',
            researchAndDevelopmentExpenses: 'Beban Penelitian dan Pengembangan',
            depreciationAndAmortization: 'Penyusutan dan Amortisasi',
            operatingIncome: 'Laba Operasional',
            operatingIncomeRatio: 'Operating Profit Margin (OPM)',
            interestExpense: 'Beban Bunga',
            interestIncome: 'Pendapatan Bunga',
            incomeBeforeTax: 'Laba Sebelum Pajak',
            incomeTaxExpense: 'Beban Pajak Penghasilan',
            netIncome: 'Laba Bersih',
            netIncomeRatio: 'Net Profit Margin (NPM)',
            eps: 'EPS',
            epsDiluted: 'EPS Terdilusi',
            weightedAverageShsOut: 'Rata-rata Tertimbang Saham Beredar',
            weightedAverageShsOutDil: 'Rata-rata Tertimbang Saham Beredar (Terdilusi)',
            ebitda: 'EBITDA',
            ebitdaRatio: 'EBITDA Margin',

            // Balance Sheet
            cashAndCashEquivalents: 'Kas dan Setara Kas',
            shortTermInvestments: 'Investasi Jangka Pendek',
            cashAndShortTermInvestments: 'Kas dan Investasi Jangka Pendek',
            netReceivables: 'Piutang Usaha',
            inventory: 'Persediaan',
            otherCurrentAssets: 'Aset Lancar Lainnya',
            totalCurrentAssets: 'Total Aset Lancar',
            propertyPlantEquipmentNet: 'Aset Tetap Bersih',
            goodwill: 'Goodwill',
            intangibleAssets: 'Aset Tidak Berwujud',
            goodwillAndIntangibleAssets: 'Goodwill dan Aset Tidak Berwujud',
            longTermInvestments: 'Investasi Jangka Panjang',
            taxAssets: 'Aset Pajak',
            otherNonCurrentAssets: 'Aset Tidak Lancar Lainnya',
            totalNonCurrentAssets: 'Total Aset Tidak Lancar',
            totalAssets: 'Total Aset',
            accountPayables: 'Utang Usaha',
            shortTermDebt: 'Utang Jangka Pendek',
            taxPayables: 'Utang Pajak',
            deferredRevenue: 'Pendapatan Diterima di Muka',
            otherCurrentLiabilities: 'Utang Jangka Pendek Lainnya',
            totalCurrentLiabilities: 'Total Utang Jangka Pendek',
            longTermDebt: 'Utang Jangka Panjang',
            deferredRevenueNonCurrent: 'Pendapatan Diterima di Muka Jangka Panjang',
            deferredTaxLiabilitiesNonCurrent: 'Utang Pajak Tangguhan',
            otherNonCurrentLiabilities: 'Utang Jangka Panjang Lainnya',
            totalNonCurrentLiabilities: 'Total Utang Jangka Panjang',
            totalLiabilities: 'Total Utang',
            commonStock: 'Saham Biasa',
            retainedEarnings: 'Saldo Laba',
            accumulatedOtherComprehensiveIncomeLoss: 'Akumulasi Pendapatan Komprehensif Lain',
            othertotalStockholdersEquity: 'Ekuitas Pemegang Saham Lainnya',
            totalStockholdersEquity: 'Total Ekuitas Pemegang Saham',
            totalEquity: 'Total Ekuitas',
            totalLiabilitiesAndStockholdersEquity: 'Total Utang dan Ekuitas Pemegang Saham',
            minorityInterest: 'Kepentingan Non-Pengendali',
            totalLiabilitiesAndTotalEquity: 'Total Utang dan Total Ekuitas',
            totalDebt: 'Total Utang',
            netDebt: 'Utang Bersih',

            // Cash Flow
            deferredIncomeTax: 'Pajak Penghasilan Tangguhan',
            stockBasedCompensation: 'Kompensasi Berbasis Saham',
            changeInWorkingCapital: 'Perubahan Modal Kerja',
            accountsReceivables: 'Piutang Usaha',
            accountsPayables: 'Utang Usaha',
            otherWorkingCapital: 'Modal Kerja Lainnya',
            otherNonCashItems: 'Pos Non-Kas Lainnya',
            netCashProvidedByOperatingActivities: 'Arus Kas Bersih dari Aktivitas Operasi',
            investmentsInPropertyPlantAndEquipment: 'Investasi pada Aset Tetap',
            acquisitionsNet: 'Akuisisi Bersih',
            purchasesOfInvestments: 'Pembelian Investasi',
            salesMaturitiesOfInvestments: 'Penjualan/Jatuh Tempo Investasi',
            otherInvestingActivites: 'Aktivitas Investasi Lainnya',
            netCashUsedForInvestingActivites: 'Arus Kas Bersih untuk Aktivitas Investasi',
            debtRepayment: 'Pembayaran Utang',
            commonStockIssued: 'Penerbitan Saham Biasa',
            commonStockRepurchased: 'Pembelian Kembali Saham',
            dividendsPaid: 'Pembayaran Dividen',
            otherFinancingActivites: 'Aktivitas Pendanaan Lainnya',
            netCashUsedProvidedByFinancingActivities: 'Arus Kas Bersih dari Aktivitas Pendanaan',
            effectOfForexChangesOnCash: 'Pengaruh Perubahan Kurs terhadap Kas',
            netChangeInCash: 'Perubahan Bersih Kas',
            cashAtEndOfPeriod: 'Kas Akhir Periode',
            cashAtBeginningOfPeriod: 'Kas Awal Periode',
            operatingCashFlow: 'Arus Kas Operasi',
            capitalExpenditure: 'Belanja Modal',
            freeCashFlow: 'Arus Kas Bebas',

            // Additional keys (appear in "Other" / "LAINNYA" section)
            otherAssets: 'Aset Lainnya',
            otherLiabilities: 'Utang Lainnya',
            capitalLeaseObligations: 'Utang Sewa Pembiayaan',
            preferredStock: 'Saham Preferen',
            totalInvestments: 'Total Investasi',
            sellingAndMarketingExpenses: 'Beban Penjualan dan Pemasaran',
            generalAndAdministrativeExpenses: 'Beban Umum dan Administrasi',
            otherExpenses: 'Beban Lainnya',
            totalOtherIncomeExpensesNet: 'Total Pendapatan (Beban) Lain-lain Bersih',
            incomeBeforeTaxRatio: 'Pre-tax Profit Margin',
            netIncomeDepr: 'Laba Bersih (Penyusutan)',
            receivables: 'Piutang Usaha',
            payables: 'Utang',
            
            // Reconciled specific unhandled keys
            costAndExpenses: 'Total Beban',
            epsdiluted: 'EPS Terdilusi',
            weightedAverageSharesOutstanding: 'Rata-rata Tertimbang Saham Beredar',
            weightedAverageSharesOutstandingDiluted: 'Rata-rata Tertimbang Saham Beredar (Terdilusi)',
            otherStockholdersEquity: 'Ekuitas Pemegang Saham Lainnya',
            ebitdaratio: 'EBITDA Margin',
        }
    },

    /**
     * Get translated string for current language.
     * Falls back: current lang → en explicit → key itself.
     */
    t(key) {
        const cur = this.translations[this.current];
        if (cur && cur[key] !== undefined) return cur[key];
        const en = this.translations.en;
        if (en && en[key] !== undefined) return en[key];
        return key;
    },

    /**
     * Template-based translation with variable substitution.
     * Usage: Lang.tf('no_data_for_ticker', { ticker: 'AAPL' })
     */
    tf(key, vars) {
        let str = this.t(key);
        if (vars) {
            Object.entries(vars).forEach(([k, v]) => {
                str = str.replace(`{${k}}`, v);
            });
        }
        return str;
    },

    /**
     * Translate camelCase API field name to human-readable label.
     * In ID mode, uses PSAK-standard terms; in EN mode, auto-generates from camelCase.
     */
    labelFromKey(key) {
        if (this.metricLabels[this.current] && this.metricLabels[this.current][key]) {
            return this.metricLabels[this.current][key];
        }
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, s => s.toUpperCase())
            .replace(/  +/g, ' ')
            .replace(/^Eps$/i, 'EPS')
            .replace('Ebitda', 'EBITDA')
            .trim();
    },

    /**
     * Switch language and update all UI elements.
     */
    set(lang) {
        this.current = lang;
        // Update toggle button
        document.querySelectorAll('.lang-option').forEach(el => {
            el.classList.toggle('active', el.dataset.lang === lang);
        });
        // Update all static translatable elements
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.getAttribute('data-lang-key');
            const attr = el.getAttribute('data-lang-attr');
            if (attr === 'placeholder') {
                el.placeholder = this.t(key);
            } else {
                el.textContent = this.t(key);
            }
        });
        // Re-render dynamic content if data is loaded
        if (typeof AppState !== 'undefined' && AppState.activeTicker) {
            renderActiveTickerData();
        }
    }
};
