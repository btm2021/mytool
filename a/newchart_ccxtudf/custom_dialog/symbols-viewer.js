/**
 * Symbols Viewer Dialog
 * Hiển thị danh sách symbols của từng datasource
 */

class SymbolsViewerDialog extends DialogBase {
    constructor() {
        super({
            id: 'symbols-viewer-dialog',
            title: 'Symbols Viewer',
            width: '800px',
            maxHeight: '80vh'
        });
        this.datafeed = null;
        this.isInitialized = false;
    }

    setDatafeed(datafeed) {
        this.datafeed = datafeed;
    }

    // Override show to inject content and styles
    show() {
        if (!this.isInitialized) {
            this.injectStyles();
            this.isInitialized = true;
        }
        
        // Reset dialog state (vì DialogBase remove dialog khi close)
        this.dialog = null;
        this.overlay = null;
        this.contentContainer = null;
        
        super.show();
        
        // Set content after dialog is created
        this.setContent(this.getContent());
        
        // Load symbols
        setTimeout(() => {
            this.loadSymbols();
            this.setupSearch();
        }, 100);
        
        return this;
    }

    injectStyles() {
        const styleId = 'symbols-viewer-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = this.getStyles();
        document.head.appendChild(style);
    }

    getContent() {
        return `
            <div class="symbols-viewer-container">
                <div class="symbols-header">
                    <div class="symbols-stats">
                        <span id="total-symbols">Loading...</span>
                    </div>
                    <div class="symbols-search">
                        <input type="text" id="symbols-search-input" placeholder="Search symbols..." />
                    </div>
                </div>
                
                <div class="symbols-content" id="symbols-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading symbols...</div>
                </div>
            </div>
        `;
    }

    getStyles() {
        return `
            .symbols-viewer-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                gap: 16px;
            }

            .symbols-header {
                display: flex;
                gap: 16px;
                align-items: center;
                padding: 0 4px;
            }

            .symbols-stats {
                font-size: 14px;
                color: #b2b5be;
            }

            .symbols-search {
                flex: 1;
            }

            .symbols-search input {
                width: 100%;
                padding: 8px 12px;
                background: #1e222d;
                border: 1px solid #2a2e39;
                border-radius: 4px;
                color: #d1d4dc;
                font-size: 14px;
            }

            .symbols-search input:focus {
                outline: none;
                border-color: #2962ff;
            }

            .symbols-content {
                flex: 1;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .datasource-section {
                background: #1e222d;
                border-radius: 8px;
                padding: 16px;
            }

            .datasource-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                cursor: pointer;
                user-select: none;
            }

            .datasource-header:hover {
                opacity: 0.8;
            }

            .datasource-title {
                font-size: 16px;
                font-weight: 600;
                color: #d1d4dc;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .datasource-count {
                font-size: 14px;
                color: #787b86;
                background: #2a2e39;
                padding: 2px 8px;
                border-radius: 12px;
            }

            .datasource-toggle {
                color: #787b86;
                transition: transform 0.2s;
            }

            .datasource-toggle.collapsed {
                transform: rotate(-90deg);
            }

            .symbols-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 8px;
                max-height: 300px;
                overflow-y: auto;
            }

            .symbols-list.collapsed {
                display: none;
            }

            .symbol-item {
                padding: 8px 12px;
                background: #2a2e39;
                border-radius: 4px;
                font-size: 13px;
                color: #d1d4dc;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
            }

            .symbol-item:hover {
                background: #363a45;
                color: #2962ff;
            }

            .symbol-item.spot {
                border-left: 3px solid #26a69a;
            }

            .symbol-item.futures {
                border-left: 3px solid #ef5350;
            }

            .symbol-item.forex {
                border-left: 3px solid #ffa726;
            }

            .no-symbols {
                text-align: center;
                color: #787b86;
                padding: 32px;
                font-size: 14px;
            }

            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #2a2e39;
                border-top-color: #2962ff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            }

            .loading-text {
                text-align: center;
                color: #787b86;
                margin-top: 16px;
                font-size: 14px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
    }

    async loadSymbols() {
        const content = document.getElementById('symbols-content');
        
        if (!this.datafeed || !this.datafeed._manager) {
            content.innerHTML = '<div class="no-symbols">Datafeed not available</div>';
            return;
        }

        const manager = this.datafeed._manager;
        
        // Đợi symbols load xong nếu chưa
        if (!manager.cacheLoaded) {
            content.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading symbols...</div>
            `;
            
            try {
                await manager.loadAllSymbols();
            } catch (error) {
                console.error('Error loading symbols:', error);
                content.innerHTML = '<div class="no-symbols">Error loading symbols</div>';
                return;
            }
        }

        // Group symbols by exchange
        const symbolsByExchange = {};
        let totalCount = 0;

        manager.symbolCache.forEach(symbol => {
            if (!symbolsByExchange[symbol.exchange]) {
                symbolsByExchange[symbol.exchange] = [];
            }
            symbolsByExchange[symbol.exchange].push(symbol);
            totalCount++;
        });

        // Update total count
        const totalElement = document.getElementById('total-symbols');
        if (totalElement) {
            totalElement.textContent = `Total: ${totalCount} symbols`;
        }

        // Render sections
        let html = '';
        const exchanges = Object.keys(symbolsByExchange).sort();

        exchanges.forEach(exchange => {
            const symbols = symbolsByExchange[exchange];
            const exchangeName = this.getExchangeDisplayName(exchange);
            
            html += `
                <div class="datasource-section" data-exchange="${exchange}">
                    <div class="datasource-header" onclick="symbolsViewerDialog.toggleSection('${exchange}')">
                        <div class="datasource-title">
                            <span>${exchangeName}</span>
                            <span class="datasource-count">${symbols.length}</span>
                        </div>
                        <span class="datasource-toggle" id="toggle-${exchange}">▼</span>
                    </div>
                    <div class="symbols-list" id="list-${exchange}">
                        ${symbols.map(s => `
                            <div class="symbol-item ${s.type}" 
                                 data-symbol="${s.symbol}"
                                 data-exchange="${s.exchange}"
                                 data-type="${s.type}"
                                 onclick="symbolsViewerDialog.selectSymbol('${s.exchange}', '${s.symbol}', '${s.type}')">
                                ${s.symbol}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        if (html === '') {
            html = '<div class="no-symbols">No symbols loaded</div>';
        }

        content.innerHTML = html;
    }

    getExchangeDisplayName(exchange) {
        const names = {
            'BINANCE': '🟡 Binance Spot',
            'BINANCEUSDM': '🟡 Binance USDⓈ-M',
            'OKXSPOT': '⚫ OKX Spot',
            'OKXFUTURES': '⚫ OKX Futures',
            'BYBITSPOT': '🟠 Bybit Spot',
            'BYBITFUTURES': '🟠 Bybit Futures',
            'OANDA': '🔵 OANDA Forex'
        };
        return names[exchange] || exchange;
    }

    toggleSection(exchange) {
        const list = document.getElementById(`list-${exchange}`);
        const toggle = document.getElementById(`toggle-${exchange}`);
        
        if (list && toggle) {
            list.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
        }
    }

    selectSymbol(exchange, symbol, type) {
        console.log('Selected symbol:', exchange, symbol, type);
        
        // Format symbol: thêm .P cho futures
        let displaySymbol = symbol;
        if (type === 'futures') {
            displaySymbol = `${symbol}.P`;
        }
        
        const fullSymbol = `${exchange}:${displaySymbol}`;
        console.log('Changing to:', fullSymbol);
        
        // Nếu có tvWidget global, change symbol
        if (window.tvWidget && window.tvWidget.activeChart) {
            try {
                window.tvWidget.activeChart().setSymbol(fullSymbol);
                this.close();
            } catch (error) {
                console.error('Error changing symbol:', error);
            }
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('symbols-search-input');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            this.filterSymbols(query);
        });
    }

    filterSymbols(query) {
        const sections = document.querySelectorAll('.datasource-section');
        
        sections.forEach(section => {
            const symbols = section.querySelectorAll('.symbol-item');
            let visibleCount = 0;

            symbols.forEach(symbol => {
                const symbolName = symbol.dataset.symbol.toLowerCase();
                if (query === '' || symbolName.includes(query)) {
                    symbol.style.display = '';
                    visibleCount++;
                } else {
                    symbol.style.display = 'none';
                }
            });

            // Hide section if no visible symbols
            if (visibleCount === 0 && query !== '') {
                section.style.display = 'none';
            } else {
                section.style.display = '';
            }
        });
    }
}

// Create global instance
const symbolsViewerDialog = new SymbolsViewerDialog();
