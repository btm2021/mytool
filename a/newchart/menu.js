// Menu functionality for TradingView
(function () {
    'use strict';

    // Wait for tvWidget to be available
    function initMenu() {
        if (typeof tvWidget === 'undefined' || !tvWidget) {
            setTimeout(initMenu, 100);
            return;
        }

        tvWidget.onChartReady(() => {
            createMenuButton();
            setupMenuHandlers();
        });
    }

    function createMenuButton() {
        // Create button with align: 'left' to place it at the beginning
        const button = tvWidget.createButton({ align: 'left' });

        // Style the button
        button.setAttribute('title', 'User Menu');
        button.innerHTML = '<div class="tv-menu-button-content"><span class="tv-menu-avatar">Menu</span><span class="tv-menu-badge"></span></div>';
        button.classList.add('tv-user-menu-button');

        // Add click handler
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });
    }

    function setupMenuHandlers() {
        const sidebarMenu = document.getElementById('sidebar-menu');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        // Close menu when clicking overlay
        sidebarOverlay.addEventListener('click', closeMenu);

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!sidebarMenu.contains(e.target) && !e.target.closest('.tv-user-menu-button')) {
                closeMenu();
            }
        });

        // Prevent menu from closing when clicking inside
        sidebarMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Setup theme toggle
        setupThemeToggle();

        // Setup language selector
        setupLanguageSelector();
    }

    function setupThemeToggle() {
        const themeToggle = document.querySelector('.menu-item:has(.toggle-switch) input[type="checkbox"]');

        if (!themeToggle) return;

        // Get current theme from widget
        const currentTheme = tvWidget.getTheme();
        themeToggle.checked = currentTheme === 'Dark';

        // Handle theme change
        themeToggle.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'Dark' : 'Light';
            tvWidget.changeTheme(newTheme);

            // Save preference to localStorage
            localStorage.setItem('tradingview_theme', newTheme);
        });
    }

    function setupLanguageSelector() {
        // Find language menu item
        const languageItems = document.querySelectorAll('.menu-item');
        let languageMenuItem = null;

        languageItems.forEach(item => {
            if (item.textContent.includes('Ngôn ngữ')) {
                languageMenuItem = item;
            }
        });

        if (!languageMenuItem) return;

        // Create language dropdown
        languageMenuItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showLanguageDropdown(languageMenuItem);
        });
    }

    function showLanguageDropdown(menuItem) {
        // Remove existing dropdown if any
        const existingDropdown = document.querySelector('.language-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }

        // Language options
        const languages = [
            { code: 'vi', name: 'Tiếng Việt' },
            { code: 'en', name: 'English' },
            { code: 'zh', name: '中文' },
            { code: 'ja', name: '日本語' },
            { code: 'ko', name: '한국어' },
            { code: 'es', name: 'Español' },
            { code: 'fr', name: 'Français' },
            { code: 'de', name: 'Deutsch' },
            { code: 'ru', name: 'Русский' },
            { code: 'th', name: 'ภาษาไทย' }
        ];

        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'language-dropdown';

        const currentLang = localStorage.getItem('tradingview_language') || 'vi';

        languages.forEach(lang => {
            const item = document.createElement('div');
            item.className = 'language-dropdown-item';
            if (lang.code === currentLang) {
                item.classList.add('active');
            }
            item.textContent = lang.name;

            item.addEventListener('click', (e) => {
                e.stopPropagation();
                changeLanguage(lang.code, lang.name);
                dropdown.remove();
            });

            dropdown.appendChild(item);
        });

        // Position dropdown
        const rect = menuItem.getBoundingClientRect();
        dropdown.style.top = rect.top + 'px';
        dropdown.style.left = (rect.right + 10) + 'px';

        document.body.appendChild(dropdown);

        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target)) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 0);
    }

    function changeLanguage(langCode, langName) {
        // Save to localStorage
        localStorage.setItem('tradingview_language', langCode);

        // Update menu display
        const menuValue = document.querySelector('.menu-item .menu-value');
        if (menuValue) {
            menuValue.textContent = langName;
        }

        // Show reload message
        if (confirm(`Ngôn ngữ đã được thay đổi thành ${langName}.\nTải lại trang để áp dụng thay đổi?`)) {
            window.location.reload();
        }
    }

    function toggleMenu() {
        const sidebarMenu = document.getElementById('sidebar-menu');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        if (sidebarMenu.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    function openMenu() {
        const sidebarMenu = document.getElementById('sidebar-menu');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        sidebarMenu.classList.add('active');
        sidebarOverlay.classList.add('active');
    }

    function closeMenu() {
        const sidebarMenu = document.getElementById('sidebar-menu');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        sidebarMenu.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    // Expose functions globally if needed
    window.userMenu = {
        open: openMenu,
        close: closeMenu,
        toggle: toggleMenu
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMenu);
    } else {
        initMenu();
    }
})();
