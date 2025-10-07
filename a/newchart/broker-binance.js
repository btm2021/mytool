// Binance Futures Broker Implementation with Real API
class BinanceBroker {
    constructor(config = {}) {
        this._host = null;
        this._connectionStatus = 3; // Disconnected initially
        this._currentAccountId = 'binance_1';

        // API Configuration
        this._config = {
            apiKey: config.apiKey || '',
            apiSecret: config.apiSecret || '',
            testnet: config.testnet || false
        };

        this._baseUrl = this._config.testnet
            ? 'https://testnet.binancefuture.com'
            : 'https://fapi.binance.com';

        // Data cache
        this._orders = [];
        this._positions = [];
        this._executions = [];
        this._accountData = {
            balance: 0,
            equity: 0,
            marginUsed: 0,
            marginAvailable: 0
        };

        // Auto-refresh intervals
        this._refreshInterval = null;

        // Initialize connection if API key provided
        if (this._config.apiKey && this._config.apiSecret) {
            this._connect();
        } else {
            console.warn('Binance API credentials not provided, using demo data');
            this._useDemoData();
        }
    }

    _useDemoData() {
        this._connectionStatus = 1;
        this._orders = [
            { id: 'demo_o1', symbol: 'BTCUSDT', type: 2, side: 1, qty: 0.1, price: 95000, status: 6, filledQty: 0, avgPrice: 0 },
            { id: 'demo_o2', symbol: 'ETHUSDT', type: 2, side: -1, qty: 1, price: 3600, status: 6, filledQty: 0, avgPrice: 0 }
        ];
        this._positions = [
            { id: 'demo_p1', symbol: 'BTCUSDT', side: 1, qty: 0.05, avgPrice: 96000, pl: 50, plPercent: 1.04 },
            { id: 'demo_p2', symbol: 'ETHUSDT', side: -1, qty: 2, avgPrice: 3550, pl: -20, plPercent: -0.28 }
        ];
        this._executions = [
            { id: 'demo_e1', symbol: 'BTCUSDT', price: 96000, qty: 0.05, side: 1, time: Date.now() - 3600000 },
            { id: 'demo_e2', symbol: 'ETHUSDT', price: 3550, qty: 2, side: -1, time: Date.now() - 7200000 }
        ];
        this._accountData = {
            balance: 10000,
            equity: 10500,
            marginUsed: 500,
            marginAvailable: 10000
        };
    }

    async _connect() {
        try {
            this._connectionStatus = 2; // Connecting
            console.log('Connecting to Binance Futures...');

            // Test connection
            await this._fetchAccountInfo();

            this._connectionStatus = 1; // Connected
            console.log('Connected to Binance Futures');

            // Start auto-refresh
            this._startAutoRefresh();

            if (this._host) {
                this._host.connectionStatusUpdate(this._connectionStatus);
            }
        } catch (error) {
            console.error('Failed to connect to Binance:', error);
            this._connectionStatus = 4; // Error
            if (this._host) {
                this._host.connectionStatusUpdate(this._connectionStatus);
            }
        }
    }

    _startAutoRefresh() {
        // Refresh data every 3 seconds
        this._refreshInterval = setInterval(() => {
            this._fetchAccountInfo();
            this._fetchOpenOrders();
            this._fetchPositions();
        }, 3000);
    }

    _stopAutoRefresh() {
        if (this._refreshInterval) {
            clearInterval(this._refreshInterval);
            this._refreshInterval = null;
        }
    }

    // Generate signature for authenticated requests
    _generateSignature(queryString) {
        if (typeof CryptoJS === 'undefined') {
            console.error('CryptoJS not loaded');
            return '';
        }
        return CryptoJS.HmacSHA256(queryString, this._config.apiSecret).toString();
    }

    // Make authenticated API request
    async _apiRequest(endpoint, params = {}) {
        const timestamp = Date.now();
        const queryParams = { ...params, timestamp };

        const queryString = Object.keys(queryParams)
            .map(key => `${key}=${queryParams[key]}`)
            .join('&');

        const signature = this._generateSignature(queryString);
        const url = `${this._baseUrl}${endpoint}?${queryString}&signature=${signature}`;

        const response = await fetch(url, {
            headers: {
                'X-MBX-APIKEY': this._config.apiKey
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.msg || 'API request failed');
        }

        return response.json();
    }

    // Fetch account information
    async _fetchAccountInfo() {
        try {
            const data = await this._apiRequest('/fapi/v2/account');

            // Update account data
            const totalBalance = parseFloat(data.totalWalletBalance || 0);
            const totalUnrealizedProfit = parseFloat(data.totalUnrealizedProfit || 0);
            const totalMarginBalance = parseFloat(data.totalMarginBalance || 0);
            const availableBalance = parseFloat(data.availableBalance || 0);

            this._accountData = {
                balance: totalBalance,
                equity: totalMarginBalance,
                marginUsed: totalBalance - availableBalance,
                marginAvailable: availableBalance
            };

            console.log('Account info updated:', this._accountData);

            if (this._host) {
                this._host.equityUpdate(this._accountData.equity);
                this._host.marginAvailableUpdate(this._accountData.marginAvailable);
            }
        } catch (error) {
            console.error('Error fetching account info:', error);
        }
    }

    // Fetch open orders
    async _fetchOpenOrders() {
        try {
            const data = await this._apiRequest('/fapi/v1/openOrders');

            this._orders = data.map(order => ({
                id: order.orderId.toString(),
                symbol: order.symbol,
                type: this._mapOrderType(order.type),
                side: order.side === 'BUY' ? 1 : -1,
                qty: parseFloat(order.origQty),
                price: parseFloat(order.price),
                status: this._mapOrderStatus(order.status),
                filledQty: parseFloat(order.executedQty),
                avgPrice: parseFloat(order.avgPrice || 0),
                time: order.time
            }));

            console.log('Orders updated:', this._orders.length);

            // Update each order individually
            if (this._host) {
                this._orders.forEach(order => {
                    this._host.orderUpdate(order);
                });
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

    // Fetch positions
    async _fetchPositions() {
        try {
            const data = await this._apiRequest('/fapi/v2/positionRisk');

            // Filter only positions with non-zero amount
            this._positions = data
                .filter(pos => parseFloat(pos.positionAmt) !== 0)
                .map(pos => {
                    const qty = Math.abs(parseFloat(pos.positionAmt));
                    const side = parseFloat(pos.positionAmt) > 0 ? 1 : -1;
                    const avgPrice = parseFloat(pos.entryPrice);
                    const unrealizedPnl = parseFloat(pos.unRealizedProfit);
                    const plPercent = (unrealizedPnl / (avgPrice * qty)) * 100;

                    return {
                        id: pos.symbol + '_' + side,
                        symbol: pos.symbol,
                        side: side,
                        qty: qty,
                        avgPrice: avgPrice,
                        pl: unrealizedPnl,
                        plPercent: plPercent
                    };
                });

            console.log('Positions updated:', this._positions.length);

            // Update each position individually
            if (this._host) {
                this._positions.forEach(position => {
                    this._host.positionUpdate(position);
                });
            }
        } catch (error) {
            console.error('Error fetching positions:', error);
        }
    }

    // Fetch trade history (executions)
    async _fetchTradeHistory(symbol) {
        try {
            const data = await this._apiRequest('/fapi/v1/userTrades', { symbol, limit: 50 });

            return data.map(trade => ({
                id: trade.id.toString(),
                symbol: trade.symbol,
                price: parseFloat(trade.price),
                qty: parseFloat(trade.qty),
                side: trade.side === 'BUY' ? 1 : -1,
                time: trade.time
            }));
        } catch (error) {
            console.error('Error fetching trade history:', error);
            return [];
        }
    }

    // Map Binance order type to TradingView type
    _mapOrderType(binanceType) {
        const typeMap = {
            'LIMIT': 2,
            'MARKET': 1,
            'STOP': 3,
            'STOP_MARKET': 3,
            'TAKE_PROFIT': 3,
            'TAKE_PROFIT_MARKET': 3
        };
        return typeMap[binanceType] || 2;
    }

    // Map Binance order status to TradingView status
    _mapOrderStatus(binanceStatus) {
        const statusMap = {
            'NEW': 6,           // Working
            'PARTIALLY_FILLED': 6, // Working
            'FILLED': 2,        // Filled
            'CANCELED': 1,      // Canceled
            'REJECTED': 5,      // Rejected
            'EXPIRED': 1        // Canceled
        };
        return statusMap[binanceStatus] || 6;
    }

    setHost(host) {
        this._host = host;
        console.log('Broker host set');
    }

    connectionStatus() {
        return this._connectionStatus;
    }

    accountsMetainfo() {
        return Promise.resolve([{
            id: this._currentAccountId,
            name: 'Binance Futures',
            currency: 'USDT'
        }]);
    }

    accountMetainfo(accountId) {
        return Promise.resolve({
            id: accountId || this._currentAccountId,
            name: 'Binance Futures',
            currency: 'USDT',
            currencySign: '$'
        });
    }

    currentAccount() {
        return this._currentAccountId;
    }

    setCurrentAccount(accountId) {
        this._currentAccountId = accountId;
    }

    chartContextMenuActions() {
        return Promise.resolve([]);
    }

    isTradable() {
        return Promise.resolve(true);
    }

    orders() {
        return Promise.resolve(this._orders);
    }

    ordersHistory() {
        return Promise.resolve([]);
    }

    positions() {
        return Promise.resolve(this._positions);
    }

    async executions(symbol) {
        if (this._config.apiKey && this._config.apiSecret) {
            const trades = await this._fetchTradeHistory(symbol);
            return trades;
        }
        return this._executions.filter(e => e.symbol === symbol);
    }

    symbolInfo(symbol) {
        return Promise.resolve({
            qty: { min: 0.001, max: 1000, step: 0.001 },
            pipSize: 0.01,
            pipValue: 0.01,
            minTick: 0.01,
            description: symbol
        });
    }

    accountManagerInfo() {
        const orderCols = [
            { id: 'symbol', label: 'Symbol', dataFields: ['symbol'], alignment: 'left' },
            { id: 'side', label: 'Side', dataFields: ['side'], formatter: 'side' },
            { id: 'type', label: 'Type', dataFields: ['type'], formatter: 'type' },
            { id: 'qty', label: 'Qty', dataFields: ['qty'], formatter: 'fixed', alignment: 'right' },
            { id: 'price', label: 'Price', dataFields: ['price'], formatter: 'fixed', alignment: 'right' },
            { id: 'status', label: 'Status', dataFields: ['status'], formatter: 'status' }
        ];

        const positionCols = [
            { id: 'symbol', label: 'Symbol', dataFields: ['symbol'], alignment: 'left' },
            { id: 'side', label: 'Side', dataFields: ['side'], formatter: 'side' },
            { id: 'qty', label: 'Qty', dataFields: ['qty'], formatter: 'fixed', alignment: 'right' },
            { id: 'avgPrice', label: 'Avg Price', dataFields: ['avgPrice'], formatter: 'fixed', alignment: 'right' },
            { id: 'pl', label: 'P&L', dataFields: ['pl'], formatter: 'fixed', alignment: 'right', highlightDiff: true },
            { id: 'plPercent', label: 'P&L %', dataFields: ['plPercent'], formatter: 'percent', alignment: 'right', highlightDiff: true }
        ];

        const executionCols = [
            { id: 'symbol', label: 'Symbol', dataFields: ['symbol'] },
            { id: 'side', label: 'Side', dataFields: ['side'], formatter: 'side' },
            { id: 'qty', label: 'Qty', dataFields: ['qty'], formatter: 'fixed', alignment: 'right' },
            { id: 'price', label: 'Price', dataFields: ['price'], formatter: 'fixed', alignment: 'right' },
            { id: 'time', label: 'Time', dataFields: ['time'], formatter: 'date' }
        ];

        return {
            accountTitle: 'Binance Futures',
            summary: [
                { text: 'Balance', wValue: this._watchedValue(this._accountData.balance), formatter: 'fixed', isDefault: true },
                { text: 'Equity', wValue: this._watchedValue(this._accountData.equity), formatter: 'fixed', isDefault: true },
                { text: 'Margin', wValue: this._watchedValue(this._accountData.marginUsed), formatter: 'fixed' },
                { text: 'Available', wValue: this._watchedValue(this._accountData.marginAvailable), formatter: 'fixed' }
            ],
            orderColumns: orderCols,
            positionColumns: positionCols,
            pages: [
                {
                    id: 'orders',
                    title: 'Orders',
                    tables: [{
                        id: 'ordersTable',
                        columns: orderCols,
                        getData: () => this.orders(),
                        changeDelegate: this._delegate()
                    }]
                },
                {
                    id: 'positions',
                    title: 'Positions',
                    tables: [{
                        id: 'positionsTable',
                        columns: positionCols,
                        getData: () => this.positions(),
                        changeDelegate: this._delegate()
                    }]
                },
                {
                    id: 'executions',
                    title: 'Executions',
                    tables: [{
                        id: 'executionsTable',
                        columns: executionCols,
                        getData: () => Promise.resolve(this._executions),
                        changeDelegate: this._delegate()
                    }]
                }
            ],
            possibleOrderStatuses: [1, 2, 3, 4, 5, 6]
        };
    }

    async placeOrder(order) {
        try {
            const params = {
                symbol: order.symbol,
                side: order.side === 1 ? 'BUY' : 'SELL',
                type: order.type === 1 ? 'MARKET' : 'LIMIT',
                quantity: order.qty
            };

            if (order.type === 2) {
                params.price = order.limitPrice;
                params.timeInForce = 'GTC';
            }

            const result = await this._apiRequest('/fapi/v1/order', params);

            await this._fetchOpenOrders();

            return { orderId: result.orderId.toString() };
        } catch (error) {
            console.error('Error placing order:', error);
            throw error;
        }
    }

    async modifyOrder(order) {
        try {
            // Cancel old order
            await this._apiRequest('/fapi/v1/order', {
                symbol: order.symbol,
                orderId: order.id
            });

            // Place new order
            await this.placeOrder(order);
        } catch (error) {
            console.error('Error modifying order:', error);
            throw error;
        }
    }

    async cancelOrder(orderId) {
        try {
            const order = this._orders.find(o => o.id === orderId);
            if (!order) return;

            await this._apiRequest('/fapi/v1/order', {
                symbol: order.symbol,
                orderId: orderId
            });

            await this._fetchOpenOrders();
        } catch (error) {
            console.error('Error canceling order:', error);
            throw error;
        }
    }

    async closePosition(positionId) {
        try {
            const position = this._positions.find(p => p.id === positionId);
            if (!position) return;

            // Place market order in opposite direction
            await this._apiRequest('/fapi/v1/order', {
                symbol: position.symbol,
                side: position.side === 1 ? 'SELL' : 'BUY',
                type: 'MARKET',
                quantity: position.qty
            });

            await this._fetchPositions();
        } catch (error) {
            console.error('Error closing position:', error);
            throw error;
        }
    }

    async reversePosition(positionId) {
        try {
            const position = this._positions.find(p => p.id === positionId);
            if (!position) return;

            // Place market order for double quantity in opposite direction
            await this._apiRequest('/fapi/v1/order', {
                symbol: position.symbol,
                side: position.side === 1 ? 'SELL' : 'BUY',
                type: 'MARKET',
                quantity: position.qty * 2
            });

            await this._fetchPositions();
        } catch (error) {
            console.error('Error reversing position:', error);
            throw error;
        }
    }

    _watchedValue(val) {
        return {
            value: () => val,
            subscribe: () => ({ unsubscribe: () => { } })
        };
    }

    _delegate() {
        const subs = [];
        return {
            subscribe: (cb) => {
                subs.push(cb);
                return { unsubscribe: () => subs.splice(subs.indexOf(cb), 1) };
            },
            fire: (data) => subs.forEach(cb => cb(data))
        };
    }

    destroy() {
        this._stopAutoRefresh();
    }
}

window.BinanceBroker = BinanceBroker;
