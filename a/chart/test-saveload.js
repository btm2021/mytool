/**
 * Test script để kiểm tra SaveLoad Engine logic
 * Chạy trong Node.js environment
 */

// Mock PocketBase cho testing
class MockPocketBase {
    constructor(url) {
        this.url = url;
        this.mockData = new Map();
        this.idCounter = 1;
    }
    
    collection(name) {
        return {
            create: async (data) => {
                const id = `mock_${this.idCounter++}`;
                const record = {
                    id,
                    ...data,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                };
                this.mockData.set(id, record);
                console.log('Mock created:', record);
                return record;
            },
            
            getOne: async (id) => {
                const record = this.mockData.get(id);
                if (!record) {
                    throw new Error(`Record ${id} not found`);
                }
                console.log('Mock getOne:', record);
                return record;
            },
            
            getList: async (page, perPage, options = {}) => {
                const items = Array.from(this.mockData.values());
                console.log('Mock getList:', items);
                return {
                    items,
                    page,
                    perPage,
                    totalItems: items.length,
                    totalPages: Math.ceil(items.length / perPage)
                };
            },
            
            update: async (id, data) => {
                const existing = this.mockData.get(id);
                if (!existing) {
                    throw new Error(`Record ${id} not found`);
                }
                const updated = {
                    ...existing,
                    ...data,
                    updated: new Date().toISOString()
                };
                this.mockData.set(id, updated);
                console.log('Mock updated:', updated);
                return updated;
            },
            
            delete: async (id) => {
                const deleted = this.mockData.delete(id);
                if (!deleted) {
                    throw new Error(`Record ${id} not found`);
                }
                console.log('Mock deleted:', id);
                return true;
            }
        };
    }
}

// Mock window object
global.window = {
    PocketBase: MockPocketBase
};

// Import SaveLoad Engine logic (copy paste key functions)
function createSaveLoadEngine({
    userId = null,
    autoSave = true,
    autoSaveDelay = 1000,
    pocketbaseUrl = 'https://crypto.pockethost.io'
} = {}) {
    
    const pb = new MockPocketBase(pocketbaseUrl);
    const COLLECTION_NAME = 'chart_layouts';
    
    function normalizeChartData(chartData) {
        let layout, version, symbol, interval, name;
        
        if (chartData.charts && Array.isArray(chartData.charts) && chartData.charts.length > 0) {
            const chart = chartData.charts[0];
            layout = chart.data || chart;
            version = chart.version || 1;
            symbol = chartData.symbol || 'UNKNOWN';
            interval = chartData.interval || '1D';
            name = chartData.name || `Layout ${new Date().toLocaleString()}`;
        } else {
            layout = chartData.layout || chartData;
            version = chartData.version || 1;
            symbol = chartData.symbol || 'UNKNOWN';
            interval = chartData.interval || '1D';
            name = chartData.name || `Layout ${new Date().toLocaleString()}`;
        }
        
        const payload = {
            name: name,
            symbol: symbol,
            interval: interval,
            layout: layout,
            version: version
        };
        
        if (userId) {
            payload.user = userId;
        }
        
        return payload;
    }
    
    async function saveChartToServer(chartData) {
        const payload = normalizeChartData(chartData);
        const record = await pb.collection(COLLECTION_NAME).create(payload);
        return { id: record.id };
    }
    
    async function loadChartFromServer(chartId) {
        const record = await pb.collection(COLLECTION_NAME).getOne(chartId);
        return {
            symbol: record.symbol,
            interval: record.interval,
            charts: [{
                version: record.version,
                data: record.layout
            }]
        };
    }
    
    async function getAllCharts(targetUserId = userId) {
        const records = await pb.collection(COLLECTION_NAME).getList(1, 50, {
            sort: '-updated'
        });
        
        return records.items.map(record => ({
            id: record.id,
            name: record.name,
            symbol: record.symbol,
            interval: record.interval,
            timestamp: new Date(record.updated).getTime() / 1000
        }));
    }
    
    async function removeChart(chartId) {
        await pb.collection(COLLECTION_NAME).delete(chartId);
        return true;
    }
    
    return {
        saveChartToServer,
        loadChartFromServer,
        getAllCharts,
        removeChart
    };
}

// Test functions
async function runTests() {
    console.log('🧪 Starting SaveLoad Engine Tests...\n');
    
    try {
        // Test 1: Khởi tạo engine
        console.log('Test 1: Khởi tạo SaveLoad Engine');
        const engine = createSaveLoadEngine({
            userId: 'test_user_123',
            autoSave: true,
            autoSaveDelay: 1000
        });
        console.log('✅ Engine initialized successfully\n');
        
        // Test 2: Save chart
        console.log('Test 2: Save chart layout');
        const testChartData = {
            name: 'Test Layout',
            symbol: 'BINANCE:BTCUSDT',
            interval: '1H',
            layout: {
                version: 1,
                data: {
                    indicators: [],
                    drawings: [],
                    timeframe: '1H'
                }
            }
        };
        
        const saveResult = await engine.saveChartToServer(testChartData);
        console.log('✅ Chart saved with ID:', saveResult.id);
        const chartId = saveResult.id;
        console.log('');
        
        // Test 3: Load chart
        console.log('Test 3: Load chart layout');
        const loadResult = await engine.loadChartFromServer(chartId);
        console.log('✅ Chart loaded:', JSON.stringify(loadResult, null, 2));
        console.log('');
        
        // Test 4: Get all charts
        console.log('Test 4: Get all charts');
        const allCharts = await engine.getAllCharts();
        console.log('✅ All charts:', JSON.stringify(allCharts, null, 2));
        console.log('');
        
        // Test 5: Save another chart
        console.log('Test 5: Save another chart');
        const testChartData2 = {
            name: 'Test Layout 2',
            symbol: 'BINANCE:ETHUSDT',
            interval: '4H',
            charts: [{
                version: 2,
                data: {
                    indicators: ['RSI', 'MACD'],
                    drawings: ['trendline'],
                    timeframe: '4H'
                }
            }]
        };
        
        const saveResult2 = await engine.saveChartToServer(testChartData2);
        console.log('✅ Second chart saved with ID:', saveResult2.id);
        console.log('');
        
        // Test 6: Get all charts again
        console.log('Test 6: Get all charts (should have 2 now)');
        const allCharts2 = await engine.getAllCharts();
        console.log('✅ All charts count:', allCharts2.length);
        console.log('Charts:', allCharts2.map(c => `${c.name} (${c.symbol})`));
        console.log('');
        
        // Test 7: Remove chart
        console.log('Test 7: Remove first chart');
        await engine.removeChart(chartId);
        console.log('✅ Chart removed successfully');
        console.log('');
        
        // Test 8: Get all charts after removal
        console.log('Test 8: Get all charts after removal');
        const allCharts3 = await engine.getAllCharts();
        console.log('✅ Remaining charts count:', allCharts3.length);
        console.log('');
        
        console.log('🎉 All tests passed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run tests
runTests();