(function () {
  'use strict';

  var script = document.currentScript;
  var store = script && script.getAttribute('data-store');
  if (!store) return;

  var baseUrl = (script && script.src)
    ? script.src.replace(/\/widget\.js.*$/, '')
    : 'https://aiminassist.com';

  function injectWidget(config) {
    var primaryColor = config.primaryColor || '#6366f1';
    var storeName = config.storeName || store;

    // Create container
    var container = document.createElement('div');
    container.id = '__aimin_widget_container__';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:12px;';

    // Create iframe wrapper
    var iframeWrapper = document.createElement('div');
    iframeWrapper.style.cssText = 'display:none;width:360px;height:520px;border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.3);';

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.src = baseUrl + '/widget/chat?store=' + encodeURIComponent(store);
    iframe.style.cssText = 'width:100%;height:100%;border:none;';
    iframe.allow = 'clipboard-write';
    iframe.title = storeName + ' Chat';
    iframeWrapper.appendChild(iframe);

    // Create toggle button
    var btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Open chat');
    btn.style.cssText = [
      'width:56px',
      'height:56px',
      'border-radius:50%',
      'background:' + primaryColor,
      'border:none',
      'cursor:pointer',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'box-shadow:0 4px 16px rgba(0,0,0,0.3)',
      'transition:transform 0.2s,box-shadow 0.2s',
      'flex-shrink:0',
    ].join(';');

    // Chat icon SVG
    var chatIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>';
    // Close icon SVG
    var closeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>';

    btn.innerHTML = chatIcon;

    var isOpen = false;

    btn.addEventListener('mouseenter', function () {
      btn.style.transform = 'scale(1.1)';
      btn.style.boxShadow = '0 6px 24px rgba(0,0,0,0.4)';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
    });

    btn.addEventListener('click', function () {
      isOpen = !isOpen;
      iframeWrapper.style.display = isOpen ? 'block' : 'none';
      btn.innerHTML = isOpen ? closeIcon : chatIcon;
      btn.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat');
    });

    container.appendChild(iframeWrapper);
    container.appendChild(btn);
    document.body.appendChild(container);
  }

  // Wait for DOM ready
  function init() {
    fetch(baseUrl + '/api/widget/config?store=' + encodeURIComponent(store), {
      credentials: 'omit',
    })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (data && data.enabled) {
          injectWidget(data);
        }
      })
      .catch(function () {
        // Silently fail — do not break host page
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
