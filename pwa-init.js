// PWA Initialization and Service Worker Registration
(function() {
  'use strict';

  // Check if service workers are supported
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      registerServiceWorker();
    });
  }

  async function registerServiceWorker() {
    try {
      // Unregister old service workers first (helps with iOS issues)
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        if (registration.scope !== location.origin + '/') {
          await registration.unregister();
        }
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none' // Important for iOS - always fetch fresh service worker
      });

      console.log('✅ Service Worker registered:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Service Worker update found');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotification();
          }
        });
      });

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }

  function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #2962FF;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    `;

    notification.innerHTML = `
      <span>Có phiên bản mới! Tải lại để cập nhật.</span>
      <button style="
        background: white;
        color: #2962FF;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
      ">Tải lại</button>
    `;

    document.body.appendChild(notification);

    notification.querySelector('button').addEventListener('click', () => {
      window.location.reload();
    });

    setTimeout(() => {
      notification.remove();
    }, 10000);
  }

  // Install prompt handling
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  function showInstallButton() {
    const installBtn = document.createElement('button');
    installBtn.id = 'pwa-install-btn';
    installBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2962FF;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    installBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
      Cài đặt ứng dụng
    `;

    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`User response: ${outcome}`);
      deferredPrompt = null;
      installBtn.remove();
    });

    document.body.appendChild(installBtn);

    // Auto hide after 10 seconds
    setTimeout(() => {
      if (installBtn.parentNode) {
        installBtn.style.opacity = '0';
        installBtn.style.transition = 'opacity 0.3s';
        setTimeout(() => installBtn.remove(), 300);
      }
    }, 10000);
  }

  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installed successfully');
    deferredPrompt = null;
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.remove();
  });

  // Detect if running as PWA
  function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  if (isPWA()) {
    console.log('🚀 Running as PWA');
    document.documentElement.classList.add('pwa-mode');
  }

  // Handle offline/online status
  window.addEventListener('online', () => {
    console.log('🌐 Back online');
    showConnectionStatus('Đã kết nối lại', '#4CAF50');
  });

  window.addEventListener('offline', () => {
    console.log('📡 Offline mode');
    showConnectionStatus('Chế độ offline', '#FF9800');
  });

  function showConnectionStatus(message, color) {
    const status = document.createElement('div');
    status.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${color};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    status.textContent = message;
    document.body.appendChild(status);

    setTimeout(() => {
      status.style.opacity = '0';
      status.style.transition = 'opacity 0.3s';
      setTimeout(() => status.remove(), 300);
    }, 3000);
  }

})();
