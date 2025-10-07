// Binance Futures Broker Implementation with WebSocket
class BinanceBroker {
    constructor(config = {}) {
        this._host = null;
        this._connectionStatus = 3;
        this._currentAccountId = 'binance_1';
        
        this._config = {
            apiKey: config.apiKey || '',
            apiSecret: config.apiSecret || '',
            testnet: config.testnet || false
        };
        
        this._baseUrl = this._config.testnet 
            ? 'https://testnet.binancefuture.com'
            : 'https://fapi.binance.com';
        
        this._wsBaseUrl = this._config.testnet
            ? 'wss://stream.binancefuture.com'
            : 'wss://fstream.binance.com';
        
        this._orders = [];
        this._positions = [];
        this._executions = [];
        this._accountData = { balance: 0, equity: 0, marginUsed: 0, marginAvailable: 0 };
        
        this._userDataWs = null;
        this._listenKey = null;
        this._keepAliveInterval = null;
        
        if (this._config.apiKey && this._config.apiSecret) {
            this._connect();
        } else {
            console.warn('No API credentials, using demo data');
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
        this._accountData = { balance: 10000, equity: 10500, marginUsed: 500, marginAvailable: 10000 };
    }

    async _connect() {
        try {
            this._connectionStatus = 2;
            console.log('Connecting to Binance Futures...');
            
            // Fetch initial data once
            await this._fetchAccountInfo();
            await this._fetchOpenOrders();
            await this._fetchPositions();
            
            // Start WebSocket for realtime updates
            await this._startUserDataStream();
            
            this._connectionStatus = 1;
            console.log('Connected to Binance Futures with WebSocket');
            
            if (this._host) {
                this._host.connectionStatusUpdate(this._connectionStatus);
            }
        } catch (error) {
            console.error('Failed to connect:', error);
            this._connectionStatus = 4;
            if (this._host) {
                this._host.connectionStatusUpdate(this._connectionStatus);
            }
        }
    }

    async _startUserDataStream() {
        try {
            // Get listen key
            const response = await fetch(`${this._baseUrl}/fapi/v1/listenKey`, {
                method: 'POST',
                headers: { 'X-MBX-APIKEY': this._config.apiKey }
            });
            const data = await response.json();
            this._listenKey = data.listenKey;
            
            console.log('Listen key obtained');
            
            // Connect WebSocket
            this._userDataWs = new WebSocket(`${this._wsBaseUrl}/ws/${this._listenKey}`);
            
            this._userDataWs.onopen = () => {
                console.log('User Data Stream connected');
            };
            
            this._userDataWs.onmessage = (event) => {
                this._handleUserDataUpdate(JSON.parse(event.data));
            };
            
            this._userDataWs.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            this._userDataWs.onclose = () => {
                console.log('WebSocket closed, reconnecting...');
                setTimeout(() => this._startUserDataStream(), 5000);
            };
            
            // Keep alive every 30 minutes
            this._keepAliveInterval = setInterval(() => {
                this._keepAliveListenKey();
            }, 30 * 60 * 1000);
            
        } catch (error) {
            console.error('Error starting user data stream:', error);
        }
    }

    async _keepAliveListenKey() {
        try {
            await fetch(`${this._baseUrl}/fapi/v1/listenKey`, {
                method: 'PUT',
                headers: { 'X-MBX-APIKEY': this._config.apiKey }
            });
            console.log('Listen key kept alive');
        } catch (error) {
            console.error('Error keeping listen key alive:', error);
        }
    }

    _handleUserDataUpdate(data) {
        const eventType = data.e;
        
        if (eventType === 'ACCOUNT_UPDATE') {
            // Account update
            console.log('Account update received');
            this._handleAccountUpdate(data);
        } else if (eventType === 'ORDER_TRADE_UPDATE') {
            // Order update
            console.log('Order update received');
            this._handleOrderUpdate(data);
        }
    }

    _handleAccountUpdate(data) {
        // Update account balance
        if (data.a && data.a.B) {
            data.a.B.forEach(balance => {
                if (balance.a === 'USDT') {
                    this._accountData.balance = parseFloat(balance.wb);
                    this._accountData.equity = parseFloat(balance.cw);
                    this._accountData.marginAvailable = parseFloat(balance.ab);
                }
            });
            
            if (this._host) {
                this._host.equityUpdate(this._accountData.equity);
                this._host.marginAvailableUpdate(this._accountData.marginAvailable);
            }
        }
        
        // Update positions
        if (data.a && data.a.P) {
            data.a.P.forEach(pos => {
                const qty = Math.abs(parseFloat(pos.pa));
                if (qty > 0) {
                    const side = parseFloat(pos.pa) > 0 ? 1 : -1;
                    const avgPrice = parseFloat(pos.ep);
                    const unrealizedPnl = parseFloat(pos.up);
                    const plPercent = (unrealizedPnl / (avgPrice * qty)) * 100;
                    
                    const position = {
                        id: pos.s + '_' + side,
                        symbol: pos.s,
                        side: side,
                        qty: qty,
                        avgPrice: avgPrice,
                        pl: unrealizedPnl,
                        plPercent: plPercent
                    };
                    
                    const idx = this._positions.findIndex(p => p.id === position.id);
                    if (idx !== -1) {
                        this._positions[idx] = position;
                    } else {
                        this._positions.push(position);
                    }
                    
                    if (this._host) {
                        this._host.positionUpdate(position);
                    }
                } else {
                    // Position closed
                    const idx = this._positions.findIndex(p => p.symbol === pos.s);
                    if (idx !== -1) {
                        this._positions.splice(idx, 1);
                    }
                }
            });
        }
    }

    _handleOrderUpdate(data) {
        const o = data.o;
        const order = {
            id: o.i.toString(),
            symbol: o.s,
            type: this._mapOrderType(o.o),
            side: o.S === 'BUY' ? 1 : -1,
            qty: parseFloat(o.q),
            price: parseFloat(o.p),
            status: this._mapOrderStatus(o.X),
            filledQty: parseFloat(o.z),
            avgPrice: parseFloat(o.ap || 0),
            time: o.T
        };
        
        const idx = this._orders.findIndex(ord => ord.id === order.id);
        
        if (order.status === 2 || order.status === 1 || order.status === 5) {
            // Filled, Canceled, or Rejected - remove from orders
            if (idx !== -1) {
                this._orders.splice(idx, 1);
            }
        } else {
            // Working order - update or add
            if (idx !== -1) {
                this._orders[idx] = order;
            } else {
                this._orders.push(order);
            }
        }
        
        if (this._host) {
            this._host.orderUpdate(order);
        }
    }

    _generateSignature(queryString) {
        if (typeof CryptoJS === 'undefined') {
            console.error('CryptoJS not loaded');
            return '';
        }
        return CryptoJS.HmacSHA256(queryString, this._config.apiSecret).toString();
    }

    async _apiRequest(endpoint, params = {}, method = 'GET') {
        const timestamp = Date.now();
        const queryParams = { ...params, timestamp };
        
        const queryString = Object.keys(queryParams)
            .map(key => `${key}=${queryParams[key]}`)
            .join('&');
        
        const signature = this._generateSignature(queryString);
        const url = `${this._baseUrl}${endpoint}?${queryString}&signature=${signature}`;
        
        const response = await fetch(url, {
            method: method,
            headers: { 'X-MBX-APIKEY': this._config.apiKey }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.msg || 'API request failed');
        }
        
        return response.json();
    }

    async _fetchAccountInfo() {
        try {
            const data = await this._apiRequest('/fapi/v2/account');
            
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
            
            console.log('Account info fetched:', this._accountData);
            
            if (this._host) {
                this._host.equityUpdate(this._accountData.equity);
                this._host.marginAvailableUpdate(this._accountData.marginAvailable);
            }
        } catch (error) {
            console.error('Error fetching account info:', error);
        }
    }

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
            
            console.log('Orders fetched:', this._orders.length);
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

    async _fetchPositions() {
        try {
            const data = await this._apiRequest('/fapi/v2/positionRisk');
            
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
            
            console.log('Positions fetched:', this._positions.length);
        } catch (error) {
            console.error('Error fetching positions:', error);
        }
    }

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

    _mapOrderType(binanceType) {
        const typeMap = {
            'LIMIT': 2, 'MARKET': 1, 'STOP': 3, 'STOP_MARKET': 3,
            'TAKE_PROFIT': 3, 'TAKE_PROFIT_MARKET': 3
        };
        return typeMap[binanceType] || 2;
    }

    _mapOrderStatus(binanceStatus) {
        const statusMap = {
            'NEW': 6, 'PARTIALLY_FILLED': 6, 'FILLED': 2,
            'CANCELED': 1, 'REJECTED': 5, 'EXPIRED': 1
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
            
            const result = await this._apiRequest('/fapi/v1/order', params, 'POST');
            console.log('Order placed:', result.orderId);
            
            return { orderId: result.orderId.toString() };
        } catch (error) {
            console.error('Error placing order:', error);
            throw error;
        }
    }

    async modifyOrder(order) {
        try {
            await this._apiRequest('/fapi/v1/order', {
                symbol: order.symbol,
                orderId: order.id
            }, 'DELETE');
            
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
            }, 'DELETE');
            
            console.log('Order canceled:', orderId);
        } catch (error) {
            console.error('Error canceling order:', error);
            throw error;
        }
    }

    async closePosition(positionId) {
        try {
            const position = this._positions.find(p => p.id === positionId);
            if (!position) return;
            
            await this._apiRequest('/fapi/v1/order', {
                symbol: position.symbol,
                side: position.side === 1 ? 'SELL' : 'BUY',
                type: 'MARKET',
                quantity: position.qty
            }, 'POST');
            
            console.log('Position closed:', positionId);
        } catch (error) {
            console.error('Error closing position:', error);
            throw error;
        }
    }

    async reversePosition(positionId) {
        try {
            const position = this._positions.find(p => p.id === positionId);
            if (!position) return;
            
            await this._apiRequest('/fapi/v1/order', {
                symbol: position.symbol,
                side: position.side === 1 ? 'SELL' : 'BUY',
                type: 'MARKET',
                quantity: position.qty * 2
            }, 'POST');
            
            console.log('Position reversed:', positionId);
        } catch (error) {
            console.error('Error reversing position:', error);
            throw error;
        }
    }

    _watchedValue(val) {
        return {
            value: () => val,
            subscribe: () => ({ unsubscribe: () => {} })
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
        if (this._userDataWs) {
            this._userDataWs.close();
        }
        if (this._keepAliveInterval) {
            clearInterval(this._keepAliveInterval);
        }
        console.log('Broker destroyed');
    }
}

window.BinanceBroker = BinanceBroker;
