
(() => {
  const hosted = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const label = document.getElementById('hostModeLabel');
  if (label && !hosted) label.firstChild.nodeValue = 'Local file · ';
  if (!hosted || !('serviceWorker' in navigator)) return;

  const reloadKey = 'portablelm-isolation-reload-1.6.4-v1';
  let reloadRequested = false;
  const reloadForIsolation = () => {
    if (crossOriginIsolated || reloadRequested || sessionStorage.getItem(reloadKey)) return;
    reloadRequested = true;
    sessionStorage.setItem(reloadKey, '1');
    location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', reloadForIsolation);
  navigator.serviceWorker.register('./service-worker.js', {
    scope: './',
    updateViaCache: 'none'
  }).then(async registration => {
    try { await registration.update(); } catch {}
    if (crossOriginIsolated) sessionStorage.removeItem(reloadKey);
    else if (navigator.serviceWorker.controller) reloadForIsolation();
  }).catch(error => {
    console.warn('PortableLM service worker registration failed:', error);
  });
})();
