/**
 * SaveLoad Engine for TradingView Charting Library
 * Kết nối với PocketBase để lưu/tải chart layouts
 */

// Sử dụng PocketBase từ window object (loaded từ CDN)
(function (window) {
    'use strict';

    const PocketBase = window.PocketBase || (function () {
        throw new Error('PocketBase SDK chưa được load. Vui lòng thêm script tag cho PocketBase SDK.');
    })();

    /**
     * Tạo SaveLoad Engine instance
     * @param {Object} options - Cấu hình
     * @param {string} options.userId - ID người dùng (optional)
     * @param {boolean} options.autoSave - Bật autosave (default: true)
     * @param {number} options.autoSaveDelay - Delay autosave tính bằng ms (default: 8000)
     * @param {string} options.pocketbaseUrl - URL PocketBase instance (default: https://crypto.pockethost.io)
     * @returns {Object} SaveLoad adapter object
     */
    function createSaveLoadEngine({
        userId = null,
        autoSave = true,
        autoSaveDelay = 1000,
        pocketbaseUrl = 'https://crypto.pockethost.io'
    } = {}) {

        // Khởi tạo PocketBase client
        const pb = new PocketBase(pocketbaseUrl);
        pb.autoCancellation(false);
        // Timer cho autosave debounce
        let autoSaveTimer = null;

        // Collection name
        const COLLECTION_NAME = 'chart_layouts';

        /**
         * Chuẩn hóa dữ liệu chart từ TradingView format
         * @param {Object} chartData - Dữ liệu chart từ TradingView
         * @returns {Object} Payload chuẩn hóa cho PocketBase
         */
        function normalizeChartData(chartData) {
            console.log('🔄 Normalizing chart data:', chartData);

            // Xử lý các format khác nhau từ TradingView
            let layout, version, symbol, interval, name;

            if (chartData.charts && Array.isArray(chartData.charts) && chartData.charts.length > 0) {
                // Format chuẩn từ TradingView save
                const chart = chartData.charts[0];
                layout = chart.data || chart;
                version = chart.version || 1;
                symbol = chartData.symbol || 'UNKNOWN';
                interval = chartData.interval || '1D';
                name = chartData.name || `Layout ${new Date().toLocaleString()}`;
            } else {
                // Format đơn giản hoặc custom
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

            // Thêm user nếu có
            if (userId) {
                payload.user = userId;
            }

            return payload;
        }

        /**
         * Lưu chart layout lên server
         * @param {Object} chartData - Dữ liệu chart từ TradingView
         * @returns {Promise<Object>} Response với ID của record đã tạo
         */
        async function saveChartToServer(chartData) {
            try {
                console.log('💾 Saving chart to server...', chartData);

                const payload = normalizeChartData(chartData);
                console.log('📤 Payload to save:', payload);

                const record = await pb.collection(COLLECTION_NAME).create(payload);

                console.log('✅ Chart layout saved successfully:', record.id);
                return { id: record.id };

            } catch (error) {
                console.error('❌ Error saving chart layout:', error);
                throw new Error(`Không thể lưu chart layout: ${error.message}`);
            }
        }

        /**
         * Tải chart layout từ server
         * @param {string} chartId - ID của chart layout
         * @returns {Promise<Object>} Chart data theo format TradingView
         */
        async function loadChartFromServer(chartId) {
            try {
                console.log('📥 Loading chart from server:', chartId);

                const record = await pb.collection(COLLECTION_NAME).getOne(chartId);

                console.log('✅ Chart layout loaded successfully:', record.id);

                // Trả về format mà TradingView Charting Library yêu cầu
                return {
                    symbol: record.symbol,
                    interval: record.interval,
                    charts: [{
                        version: record.version,
                        data: record.layout
                    }]
                };

            } catch (error) {
                console.error('❌ Error loading chart layout:', error);
                throw new Error(`Không thể tải chart layout: ${error.message}`);
            }
        }

        /**
         * Xử lý autosave khi cần thiết
         * @param {Object} widget - TradingView widget instance
         */
        function onAutoSaveNeeded(widget) {
            if (!autoSave) {
                console.log('🔕 AutoSave disabled');
                return;
            }

            // Clear timer cũ nếu có
            if (autoSaveTimer) {
                clearTimeout(autoSaveTimer);
            }

            console.log(`⏰ AutoSave scheduled in ${autoSaveDelay}ms`);

            // Tạo timer mới với debounce
            autoSaveTimer = setTimeout(async () => {
                try {
                    console.log('🔄 AutoSave triggered');

                    // Gọi widget.save() để lấy dữ liệu chart hiện tại
                    widget.save(async (chartData) => {
                        try {
                            await saveChartToServer(chartData);
                            console.log('✅ AutoSave completed successfully');
                        } catch (error) {
                            console.error('❌ AutoSave failed:', error);
                        }
                    });

                } catch (error) {
                    console.error('❌ AutoSave error:', error);
                }
            }, autoSaveDelay);
        }

        /**
         * Liệt kê tất cả chart layouts của user (TradingView yêu cầu hàm này)
         * @param {string} targetUserId - ID người dùng (optional, dùng userId từ config nếu không có)
         * @returns {Promise<Array>} Danh sách chart layouts theo format TradingView
         */
        async function getAllCharts(targetUserId = userId) {
            try {
                console.log('📋 Getting all charts for:', targetUserId);

                let filter = '';
                if (targetUserId) {
                    filter = `user = "${targetUserId}"`;
                }

                const records = await pb.collection(COLLECTION_NAME).getList(1, 50, {
                    filter: filter,
                    sort: '-updated',
                    requestKey: null
                });

                console.log('✅ Found', records.items.length, 'chart layouts');

                // Chuyển đổi sang format mà TradingView yêu cầu
                return records.items.map(record => ({
                    id: record.id,
                    name: record.name,
                    symbol: record.symbol,
                    interval: record.interval,
                    timestamp: new Date(record.updated).getTime() / 1000 // Unix timestamp
                }));

            } catch (error) {
                console.error('❌ Error getting all charts:', error);
                throw new Error(`Không thể lấy danh sách chart layouts: ${error.message}`);
            }
        }

        /**
         * Alias cho getAllCharts để tương thích
         * @param {string} targetUserId - ID người dùng (optional)
         * @returns {Promise<Array>} Danh sách chart layouts
         */
        async function listUserCharts(targetUserId = userId) {
            return getAllCharts(targetUserId);
        }

        /**
         * Xóa chart layout (TradingView yêu cầu hàm này)
         * @param {string} chartId - ID của chart layout cần xóa
         * @returns {Promise<boolean>} True nếu xóa thành công
         */
        async function removeChart(chartId) {
            try {
                console.log('🗑️ Removing chart:', chartId);

                await pb.collection(COLLECTION_NAME).delete(chartId);

                console.log('✅ Chart layout removed successfully');
                return true;

            } catch (error) {
                console.error('❌ Error removing chart layout:', error);
                throw new Error(`Không thể xóa chart layout: ${error.message}`);
            }
        }

        /**
         * Alias cho removeChart để tương thích
         * @param {string} chartId - ID của chart layout cần xóa
         * @returns {Promise<boolean>} True nếu xóa thành công
         */
        async function deleteChart(chartId) {
            return removeChart(chartId);
        }

        /**
         * Cập nhật chart layout hiện có
         * @param {string} chartId - ID của chart layout
         * @param {Object} chartData - Dữ liệu chart mới
         * @returns {Promise<Object>} Record đã cập nhật
         */
        async function updateChart(chartId, chartData) {
            try {
                console.log('📝 Updating chart:', chartId);

                const payload = normalizeChartData(chartData);
                const record = await pb.collection(COLLECTION_NAME).update(chartId, payload);

                console.log('✅ Chart layout updated successfully');
                return record;

            } catch (error) {
                console.error('❌ Error updating chart layout:', error);
                throw new Error(`Không thể cập nhật chart layout: ${error.message}`);
            }
        }

        /**
         * Lấy thông tin chart metadata (không load full data)
         * @param {string} chartId - ID của chart layout
         * @returns {Promise<Object>} Chart metadata
         */
        async function getChartContent(chartId) {
            try {
                console.log('📄 Getting chart content:', chartId);

                const record = await pb.collection(COLLECTION_NAME).getOne(chartId);

                return {
                    id: record.id,
                    name: record.name,
                    symbol: record.symbol,
                    interval: record.interval,
                    timestamp: new Date(record.updated).getTime() / 1000
                };

            } catch (error) {
                console.error('❌ Error getting chart content:', error);
                throw new Error(`Không thể lấy thông tin chart: ${error.message}`);
            }
        }

        /**
         * Kiểm tra xem có thể save chart không
         * @returns {boolean} True nếu có thể save
         */
        function canSaveChart() {
            return true; // Luôn cho phép save
        }

        /**
         * Kiểm tra xem có thể load chart không
         * @returns {boolean} True nếu có thể load
         */
        function canLoadChart() {
            return true; // Luôn cho phép load
        }

        /**
         * Lấy default chart name
         * @returns {string} Default chart name
         */
        function getDefaultChartName() {
            return `Layout ${new Date().toLocaleString()}`;
        }

        /**
         * Validate chart data trước khi save
         * @param {Object} chartData - Chart data to validate
         * @returns {boolean} True if valid
         */
        function validateChartData(chartData) {
            return chartData && (chartData.charts || chartData.layout);
        }

        // Trả về SaveLoad adapter object theo chuẩn TradingView
        const adapter = {
            // Các hàm bắt buộc cho TradingView save_load_adapter
            saveChartToServer,
            loadChartFromServer,
            onAutoSaveNeeded,
            getAllCharts,
            removeChart,
            getChartContent,

            // Các hàm kiểm tra capability
            canSaveChart,
            canLoadChart,
            getDefaultChartName,
            validateChartData,

            // Các hàm bổ sung tiện ích (aliases)
            listUserCharts,
            deleteChart,
            updateChart,

            // Getter cho cấu hình
            get userId() { return userId; },
            get autoSave() { return autoSave; },
            get autoSaveDelay() { return autoSaveDelay; },

            // Setter để thay đổi cấu hình runtime
            setUserId(newUserId) { userId = newUserId; },
            setAutoSave(enabled) { autoSave = enabled; },
            setAutoSaveDelay(delay) { autoSaveDelay = delay; }
        };

        console.log('🚀 SaveLoad Engine initialized:', {
            userId,
            autoSave,
            autoSaveDelay,
            pocketbaseUrl
        });

        console.log('📋 Available methods:', Object.keys(adapter));

        return adapter;
    }

    // Expose to global scope
    window.createSaveLoadEngine = createSaveLoadEngine;

})(window);