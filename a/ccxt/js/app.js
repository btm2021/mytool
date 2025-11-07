const exchangeManager = new ExchangeManager();

// Add exchanges
exchangeManager.addExchange(new BinanceExchange());
exchangeManager.addExchange(new BybitExchange());
exchangeManager.addExchange(new OKXExchange());
exchangeManager.addExchange(new BitgetExchange());

// Exchanges requiring CORS proxy (disabled until proxy is deployed)
// exchangeManager.addExchange(new GateExchange());
// exchangeManager.addExchange(new KuCoinExchange());

const { createApp, ref, reactive, onMounted } = Vue;

createApp({
    setup() {
        const exchanges = ref([]);
        const activeTab = ref('binanceusdm');
        const logs = ref([]);
        const showSymbolsModal = ref(false);
        const selectedExchange = ref(null);
        const symbolsList = ref([]);
        const loading = ref(true);
        const loadingMessage = ref('Initializing exchanges...');
        const symbolFilter = ref('');
        const modalSymbolFilter = ref('');
        const showLogs = ref(false); // Default collapsed
        const sortBy = ref({});
        const sortOrder = ref({});
        const showSettingsModal = ref(false);
        
        // Settings
        const settings = reactive({
            requestsPerMinute: AppConfig.requestsPerMinute,
            symbolsPerBatch: AppConfig.symbolsPerBatch,
            ohlcvLimit: AppConfig.ohlcvLimit,
            defaultTimeframe: AppConfig.defaultTimeframe,
            cacheExpiry: AppConfig.cacheExpiry / (60 * 60 * 1000) // Convert to hours
        });

        const enabledExchanges = reactive({
            binanceusdm: true,
            bybit: true,
            okx: true,
            bitget: true
            // gate: true,
            // kucoinfutures: true
        });
        
        // Store results as arrays - Vue 3 reactive arrays
        const resultsData = reactive({
            binanceusdm: [],
            bybit: [],
            okx: [],
            bitget: []
            // gate: [],
            // kucoinfutures: []
        });

        // Callback when exchange updates result
        const onResultUpdate = (exchangeId, data) => {
            if (!resultsData[exchangeId]) {
                resultsData[exchangeId] = [];
            }
            
            const arr = resultsData[exchangeId];
            const index = arr.findIndex(r => r.symbol === data.symbol);
            
            const newData = {
                ...data,
                updated: true
            };
            
            if (index >= 0) {
                // Update existing
                arr[index] = newData;
            } else {
                // Add new at the beginning (newest first)
                arr.unshift(newData);
            }
            
            // Remove blink effect after animation
            setTimeout(() => {
                const idx = arr.findIndex(r => r.symbol === data.symbol);
                if (idx >= 0) {
                    arr[idx].updated = false;
                }
            }, 1000);
        };

        // Set callback for all exchanges
        setTimeout(() => {
            exchangeManager.getAllExchanges().forEach(ex => {
                ex.setResultCallback(onResultUpdate);
            });
        }, 0);

        const updateData = () => {
            exchanges.value = [...exchangeManager.getExchangesInfo()];
            logs.value = [...exchangeManager.getLogs()];
        };

        const getExchangeResults = (id) => {
            return resultsData[id] || [];
        };

        const getFilteredResults = (id) => {
            let results = resultsData[id] || [];
            
            // Filter by symbol
            if (symbolFilter.value) {
                const filter = symbolFilter.value.toUpperCase();
                results = results.filter(r => r.symbol.toUpperCase().includes(filter));
            }
            
            // Sort if needed
            if (sortBy.value[id]) {
                const field = sortBy.value[id];
                const order = sortOrder.value[id] || 'desc';
                
                results = [...results].sort((a, b) => {
                    let aVal, bVal;
                    
                    if (field === 'volume') {
                        aVal = parseFloat(a.volume) || 0;
                        bVal = parseFloat(b.volume) || 0;
                    } else if (field === 'price') {
                        aVal = parseFloat(a.close) || 0;
                        bVal = parseFloat(b.close) || 0;
                    } else if (field === 'change') {
                        const aChange = a.open && a.close ? ((parseFloat(a.close) - parseFloat(a.open)) / parseFloat(a.open)) * 100 : 0;
                        const bChange = b.open && b.close ? ((parseFloat(b.close) - parseFloat(b.open)) / parseFloat(b.open)) * 100 : 0;
                        aVal = aChange;
                        bVal = bChange;
                    }
                    
                    if (order === 'asc') {
                        return aVal - bVal;
                    } else {
                        return bVal - aVal;
                    }
                });
            }
            
            return results;
        };

        const sortTable = (exchangeId, field) => {
            if (sortBy.value[exchangeId] === field) {
                // Toggle order
                sortOrder.value[exchangeId] = sortOrder.value[exchangeId] === 'desc' ? 'asc' : 'desc';
            } else {
                // New field, default to desc
                sortBy.value[exchangeId] = field;
                sortOrder.value[exchangeId] = 'desc';
            }
        };

        const getSortIcon = (exchangeId, field) => {
            if (sortBy.value[exchangeId] !== field) {
                return 'fas fa-sort';
            }
            return sortOrder.value[exchangeId] === 'desc' ? 'fas fa-sort-down' : 'fas fa-sort-up';
        };

        const formatPrice = (price) => {
            if (!price || price === '-') return '-';
            const num = parseFloat(price);
            if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (num >= 1) return num.toFixed(4);
            return num.toFixed(6);
        };

        const formatVolume = (volume) => {
            if (!volume || volume === '-') return '-';
            const num = parseFloat(volume);
            if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
            if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
            if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
            return num.toFixed(2);
        };

        const formatTime = (timestamp) => {
            if (!timestamp || timestamp === '-') return '-';
            return timestamp.split(' ')[1]; // Only show time, not date
        };

        const calculateChange = (result) => {
            if (!result.open || !result.close || result.open === '-' || result.close === '-') return '-';
            const change = ((parseFloat(result.close) - parseFloat(result.open)) / parseFloat(result.open)) * 100;
            return (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
        };

        const getPriceChangeClass = (result) => {
            if (!result.open || !result.close || result.open === '-' || result.close === '-') return '';
            const change = parseFloat(result.close) - parseFloat(result.open);
            return change >= 0 ? 'positive' : 'negative';
        };

        const getPriceChangeIcon = (result) => {
            if (!result.open || !result.close || result.open === '-' || result.close === '-') return 'fas fa-minus';
            const change = parseFloat(result.close) - parseFloat(result.open);
            return change >= 0 ? 'fas fa-caret-up' : 'fas fa-caret-down';
        };

        const getCoinIcon = (symbol) => {
            if (!symbol || symbol === '-') return '';
            // Extract base currency (e.g., BTC from BTC/USDT:USDT)
            const base = symbol.split('/')[0].toLowerCase();
            return `https://icon.gateimg.com/images/coin_icon/64/${base}.png`;
        };

        const handleIconError = (event) => {
            // Fallback to default icon if image fails to load
            event.target.style.display = 'none';
        };

        const getChartLink = (symbol, exchangeId) => {
            // Convert symbol format: BTC/USDT:USDT -> BTCUSDT
            const cleanSymbol = symbol.split('/')[0] + symbol.split('/')[1].split(':')[0];
            
            // Get settings
            const timeframe = AppConfig.defaultTimeframe || '15m';
            const limit = AppConfig.ohlcvLimit || 1500;
            
            // Build URL with all params
            const params = new URLSearchParams({
                symbol: cleanSymbol,
                exchangeId: exchangeId,
                timeframe: timeframe,
                limit: limit,
                autoload: 'true',
                usecache: 'no'
            });
            
            return `./chart/index.html?${params.toString()}`;
        };

        const showSymbols = (exchange) => {
            selectedExchange.value = exchange;
            symbolsList.value = exchangeManager.getExchangeSymbols(exchange.id);
            showSymbolsModal.value = true;
        };

        const closeModal = () => {
            showSymbolsModal.value = false;
            modalSymbolFilter.value = '';
        };

        const getFilteredModalSymbols = () => {
            if (!modalSymbolFilter.value) {
                return symbolsList.value;
            }
            const filter = modalSymbolFilter.value.toUpperCase();
            return symbolsList.value.filter(s => s.toUpperCase().includes(filter));
        };

        const toggleLogs = () => {
            showLogs.value = !showLogs.value;
        };

        const openSettings = () => {
            showSettingsModal.value = true;
        };

        const closeSettings = () => {
            showSettingsModal.value = false;
        };

        const saveSettings = () => {
            // Update AppConfig
            AppConfig.requestsPerMinute = parseInt(settings.requestsPerMinute);
            AppConfig.symbolsPerBatch = parseInt(settings.symbolsPerBatch);
            AppConfig.ohlcvLimit = parseInt(settings.ohlcvLimit);
            AppConfig.defaultTimeframe = settings.defaultTimeframe;
            AppConfig.cacheExpiry = parseInt(settings.cacheExpiry) * 60 * 60 * 1000;
            
            // Save to localStorage
            const settingsToSave = {
                requestsPerMinute: AppConfig.requestsPerMinute,
                symbolsPerBatch: AppConfig.symbolsPerBatch,
                ohlcvLimit: AppConfig.ohlcvLimit,
                defaultTimeframe: AppConfig.defaultTimeframe,
                cacheExpiry: AppConfig.cacheExpiry
            };
            
            try {
                localStorage.setItem('ccxt_screener_settings', JSON.stringify(settingsToSave));
                
                // Save enabled exchanges
                localStorage.setItem('ccxt_screener_exchanges', JSON.stringify(enabledExchanges));
                
                // Update rate limiters for all exchanges
                exchangeManager.getAllExchanges().forEach(ex => {
                    if (ex.rateLimiter) {
                        ex.rateLimiter.requestsPerMinute = AppConfig.requestsPerMinute;
                    }
                });
                
                closeSettings();
                alert('Settings saved successfully!');
            } catch (error) {
                console.error('Failed to save settings:', error);
                alert('Failed to save settings. Please try again.');
            }
        };

        const loadSavedExchanges = () => {
            try {
                const saved = localStorage.getItem('ccxt_screener_exchanges');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    Object.keys(parsed).forEach(key => {
                        if (enabledExchanges.hasOwnProperty(key)) {
                            enabledExchanges[key] = parsed[key];
                        }
                    });
                }
            } catch (error) {
                console.error('Failed to load exchange settings:', error);
            }
        };

        const getExchangeName = (id) => {
            const names = {
                binanceusdm: 'Binance Futures',
                bybit: 'Bybit Perpetual',
                okx: 'OKX Perpetual',
                bitget: 'Bitget Perpetual',
                gate: 'Gate.io Futures',
                kucoinfutures: 'KuCoin Futures'
            };
            return names[id] || id;
        };

        const startExchange = async (id) => {
            await exchangeManager.startExchange(id);
        };

        const pauseExchange = (id) => {
            exchangeManager.pauseExchange(id);
        };

        const stopExchange = (id) => {
            exchangeManager.stopExchange(id);
        };

        const reloadExchange = async (id) => {
            await exchangeManager.reloadExchange(id);
        };

        const startAll = async () => {
            await exchangeManager.startAll();
        };

        const pauseAll = () => {
            exchangeManager.pauseAll();
        };

        const stopAll = () => {
            exchangeManager.stopAll();
        };

        const clearCache = async () => {
            if (confirm('Clear all cached data? This will reload markets from exchanges.')) {
                loading.value = true;
                loadingMessage.value = 'Clearing cache...';
                
                await exchangeManager.clearCache();
                
                loadingMessage.value = 'Cache cleared! Reloading...';
                await new Promise(resolve => setTimeout(resolve, 500));
                
                location.reload();
            }
        };

        const autoStart = async () => {
            try {
                loading.value = true;
                loadingMessage.value = 'Loading markets from cache...';
                
                const allExchanges = exchangeManager.getAllExchanges();
                for (let i = 0; i < allExchanges.length; i++) {
                    const ex = allExchanges[i];
                    loadingMessage.value = `Initializing ${ex.name} (${i + 1}/${allExchanges.length})...`;
                    await exchangeManager.initializeExchange(ex.id);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                loadingMessage.value = 'Ready! Click Start to begin.';
                await new Promise(resolve => setTimeout(resolve, 800));
                
                loading.value = false;
            } catch (error) {
                loadingMessage.value = `Error: ${error.message}`;
                console.error('Auto init error:', error);
                setTimeout(() => {
                    loading.value = false;
                }, 2000);
            }
        };

        // Load saved exchange preferences
        loadSavedExchanges();

        // Initialize data immediately
        updateData();

        onMounted(() => {
            setInterval(() => {
                updateData();
            }, 1000);

            autoStart();
        });

        return {
            exchanges,
            activeTab,
            logs,
            showSymbolsModal,
            selectedExchange,
            symbolsList,
            loading,
            loadingMessage,
            symbolFilter,
            modalSymbolFilter,
            showLogs,
            sortBy,
            sortOrder,
            updateData,
            toggleLogs,
            getFilteredModalSymbols,
            sortTable,
            getSortIcon,
            showSettingsModal,
            settings,
            enabledExchanges,
            openSettings,
            closeSettings,
            saveSettings,
            loadSavedExchanges,
            getExchangeName,
            getExchangeResults,
            getFilteredResults,
            formatPrice,
            formatVolume,
            formatTime,
            calculateChange,
            getPriceChangeClass,
            getPriceChangeIcon,
            getCoinIcon,
            handleIconError,
            getChartLink,
            showSymbols,
            closeModal,
            startExchange,
            pauseExchange,
            stopExchange,
            reloadExchange,
            startAll,
            pauseAll,
            stopAll,
            clearCache
        };
    }
}).mount('#app');
