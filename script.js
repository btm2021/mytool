// Cấu hình các tools - bạn có thể thêm/sửa các tool ở đây
const tools = [
    {
        id: 'Backtest',
        title: 'Relay chart',
        description: 'Backtest chart',
        category: 'Trading',
        icon: '📊',
        url: '/mytool/a/replay/'
    },
    {
        id: 'Tradingview',
        title: 'Tradingview',
        description: 'Tradingview',
        category: 'Trading',
        icon: '📊',
        url: 'https://vn.tradingview.com/chart/JMJyafji/?symbol=BINANCE%3APUMPUSDT.P'
    },
    {
        id: 'PNL Calculator',
        title: 'Pnl Calulator',
        description: 'Tính Pnl',
        category: 'Trading',
        icon: '📊',
        url: '/mytool/a/pnlcalc/'
    },
    {
        id: 'Chatgpt',
        title: 'ChatGPT',
        description: 'ChatGPT',
        category: 'tool',
        icon: '📊',
        url: 'https://chatgpt.com/'
    },
    {
        id: 'Claude',
        title: 'Claude',
        description: 'Claude',
        category: 'tool',
        icon: '📊',
        url: 'https://claude.ai/'
    },
    {
        id: 'Reddit',
        title: 'Reddit',
        description: 'Reddit',
        category: 'tool',
        icon: '📊',
        url: 'https://reddit.com/'
    }
];

// Danh sách các câu trích dẫn
const quotes = [
    "No pain, no gain.",
    "Stay hungry, stay foolish.",
    "The only way to do great work is to love what you do.",
    "Strive for progress, not perfection.",
    "The future belongs to those who believe in the beauty of their dreams."
];

class Dashboard {
    constructor() {
        this.modal = document.getElementById('toolModal');
        this.toolIframe = document.getElementById('toolIframe');
        this.dashboard = document.getElementById('toolsGrid');
        this.searchInput = document.getElementById('searchInput');
        this.searchOverlay = document.getElementById('searchOverlay');
        this.searchBoxInput = document.getElementById('searchBoxInput');
        this.searchResults = document.getElementById('searchResults');
        this.filteredTools = [...tools];
        this.selectedIndex = -1;
        this.searchResultItems = [];

        this.init();
    }

    /**
     * Generates a two-letter initial from a tool ID and wraps it in a styled div.
     * @param {string} id The tool ID.
     * @returns {string} HTML string for the icon.
     */
    createIcon(id) {
        const parts = id.split(/[\s-]+/); // Split by space or hyphen
        let initials = '';
        if (parts.length > 1) {
            initials = (parts[0][0] || '') + (parts[1][0] || '');
        } else {
            initials = id.substring(0, 2);
        }
        initials = initials.toUpperCase();

        // Simple hash function to get a color from the ID
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = hash % 360;
        const color = `hsl(${h}, 65%, 70%)`;

        return `<div class="generated-icon" style="background-color: ${color};">${initials}</div>`;
    }

    init() {
        this.renderTools();
        this.bindEvents();
        this.displayDateTime();
        this.displayQuote();
        setInterval(() => this.displayQuote(), 5 * 60 * 1000); // Cập nhật quote mỗi 5 phút
    }

    displayDateTime() {
        const now = new Date();
        const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const dayOfWeek = days[now.getDay()];
        const day = now.getDate();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const dateString = `${dayOfWeek} ${day}/${month}/${year}`;
        document.getElementById('currentDate').textContent = dateString;
    }

    displayQuote() {
        const quoteElement = document.getElementById('quote');
        const randomIndex = Math.floor(Math.random() * quotes.length);
        quoteElement.textContent = `"${quotes[randomIndex]}"`;
    }

    renderTools(toolsToRender = this.filteredTools) {
        // Nhóm tools theo category
        const groupedTools = this.groupToolsByCategory(toolsToRender);

        // Render từng category section
        this.dashboard.innerHTML = Object.entries(groupedTools).map(([category, categoryTools]) => `
            <div class="category-section">
                <div class="category-header">${category}</div>
                <div class="tools-grid">
                    ${categoryTools.map(tool => `
                        <div class="tool-card" data-tool-id="${tool.id}">
                            <div class="tool-content">
                                <div class="tool-icon">${this.createIcon(tool.id)}</div>
                                <div class="tool-info">
                                    <div class="tool-title">${tool.title}</div>
                                    <div class="tool-description">${tool.description}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    groupToolsByCategory(tools) {
        return tools.reduce((groups, tool) => {
            const category = tool.category;
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(tool);
            return groups;
        }, {});
    }

    filterTools(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        this.filteredTools = tools.filter(tool =>
            tool.title.toLowerCase().includes(term) ||
            tool.description.toLowerCase().includes(term) ||
            tool.category.toLowerCase().includes(term)
        );
        this.renderTools();
    }

    bindEvents() {
        // Click vào tool card
        this.dashboard.addEventListener('click', (e) => {
            const toolCard = e.target.closest('.tool-card');
            if (toolCard) {
                const toolId = toolCard.dataset.toolId;
                this.openTool(toolId);
            }
        });

        // Global keydown để mở search overlay
        document.addEventListener('keydown', (e) => {
            // Nếu đang trong modal hoặc input, không xử lý
            if (this.modal.style.display === 'block' ||
                this.searchOverlay.classList.contains('active') ||
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Chỉ xử lý các phím chữ, số và một số ký tự đặc biệt
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                this.openSearchOverlay(e.key);
                e.preventDefault();
            }
        });

        // Search overlay events
        this.searchBoxInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        this.searchBoxInput.addEventListener('keydown', (e) => {
            this.handleSearchKeydown(e);
        });

        // Click outside search overlay để đóng
        this.searchOverlay.addEventListener('click', (e) => {
            if (e.target === this.searchOverlay) {
                this.closeSearchOverlay();
            }
        });

        // Click vào search result
        this.searchResults.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.search-result-item');
            if (resultItem) {
                const toolId = resultItem.dataset.toolId;
                this.openTool(toolId);
                this.closeSearchOverlay();
            }
        });

        // Click outside modal để đóng
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // ESC để đóng modal hoặc search overlay
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.searchOverlay.classList.contains('active')) {
                    this.closeSearchOverlay();
                } else if (this.modal.style.display === 'block') {
                    this.closeModal();
                }
            }
        });
    }

    openTool(toolId) {
        const tool = tools.find(t => t.id === toolId);
        if (!tool) return;

        // Kiểm tra xem URL có phải là link ngoài không
        const isExternal = tool.url.startsWith('http://') || tool.url.startsWith('https://');

        if (isExternal) {
            // Mở link ngoài trong tab mới
            window.open(tool.url, '_blank');
        } else {
            // Mở link nội bộ trong modal iframe
            this.toolIframe.src = tool.url;
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Disable body scroll
        }
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.toolIframe.src = '';

        // Enable body scroll
        document.body.style.overflow = 'auto';
    }

    openSearchOverlay(initialChar = '') {
        this.searchOverlay.classList.add('active');
        this.searchBoxInput.value = initialChar;
        this.searchBoxInput.focus();
        this.selectedIndex = -1;

        if (initialChar) {
            this.performSearch(initialChar);
        } else {
            this.showSearchHint();
        }
    }

    closeSearchOverlay() {
        this.searchOverlay.classList.remove('active');
        this.searchBoxInput.value = '';
        this.selectedIndex = -1;
        this.searchResultItems = [];
    }

    showSearchHint() {
        this.searchResults.innerHTML = '<div class="search-hint">Gõ để tìm kiếm tools...</div>';
    }

    performSearch(query) {
        const term = query.toLowerCase().trim();

        if (!term) {
            this.showSearchHint();
            return;
        }

        const results = tools.filter(tool =>
            tool.title.toLowerCase().includes(term) ||
            tool.description.toLowerCase().includes(term) ||
            tool.category.toLowerCase().includes(term)
        );

        this.renderSearchResults(results);
    }

    renderSearchResults(results) {
        if (results.length === 0) {
            this.searchResults.innerHTML = '<div class="search-no-results">Không tìm thấy tool nào</div>';
            this.searchResultItems = [];
            return;
        }

        this.searchResults.innerHTML = results.map((tool, index) => `
            <div class="search-result-item ${index === 0 ? 'selected' : ''}" data-tool-id="${tool.id}" data-index="${index}">
                <div class="search-result-icon">${this.createIcon(tool.id)}</div>
                <div class="search-result-info">
                    <div class="search-result-title">${tool.title}</div>
                    <div class="search-result-description">${tool.description}</div>
                </div>
                <div class="search-result-category">${tool.category}</div>
            </div>
        `).join('');

        this.searchResultItems = this.searchResults.querySelectorAll('.search-result-item');
        this.selectedIndex = 0;
    }

    handleSearchKeydown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.moveSelection(-1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            this.selectCurrentItem();
        }
    }

    moveSelection(direction) {
        if (this.searchResultItems.length === 0) return;

        // Remove current selection
        if (this.selectedIndex >= 0) {
            this.searchResultItems[this.selectedIndex].classList.remove('selected');
        }

        // Calculate new index
        this.selectedIndex += direction;
        if (this.selectedIndex < 0) {
            this.selectedIndex = this.searchResultItems.length - 1;
        } else if (this.selectedIndex >= this.searchResultItems.length) {
            this.selectedIndex = 0;
        }

        // Add new selection
        this.searchResultItems[this.selectedIndex].classList.add('selected');
        this.searchResultItems[this.selectedIndex].scrollIntoView({ block: 'nearest' });
    }

    selectCurrentItem() {
        if (this.selectedIndex >= 0 && this.searchResultItems[this.selectedIndex]) {
            const toolId = this.searchResultItems[this.selectedIndex].dataset.toolId;
            this.openTool(toolId);
            this.closeSearchOverlay();
        }
    }
}

// Khởi tạo dashboard khi DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();

    particlesJS('particles-js', {
        "particles": {
            "number": {
                "value": 80,
                "density": {
                    "enable": true,
                    "value_area": 800
                }
            },
            "color": {
                "value": "#dddddd"
            },
            "shape": {
                "type": "circle",
            },
            "opacity": {
                "value": 0.5,
                "random": false,
            },
            "size": {
                "value": 3,
                "random": true,
            },
            "line_linked": {
                "enable": true,
                "distance": 150,
                "color": "#e0e0e0",
                "opacity": 0.4,
                "width": 1
            },
            "move": {
                "enable": true,
                "speed": 2,
                "direction": "none",
                "random": false,
                "straight": false,
                "out_mode": "out",
                "bounce": false,
            }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": {
                    "enable": true,
                    "mode": "grab"
                },
                "onclick": {
                    "enable": false,
                },
                "resize": true
            },
            "modes": {
                "grab": {
                    "distance": 140,
                    "line_linked": {
                        "opacity": 1
                    }
                },
            }
        },
        "retina_detect": true
    });
});

// Utility function để thêm tool mới
function addTool(tool) {
    tools.push(tool);
    if (window.dashboard) {
        window.dashboard.filteredTools = [...tools];
        window.dashboard.renderTools();
    }
}

// Export để có thể sử dụng từ bên ngoài
window.addTool = addTool;