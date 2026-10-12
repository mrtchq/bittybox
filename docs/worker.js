self.addEventListener('install', function(e) {
 e.waitUntil(
   caches.open('bittybox').then(function(cache) {
     return cache.addAll([
       '/',
       '/index.html',
       '/index.js?v=c47b3bf9ebeb910c',
       '/edit.html',
       '/edit.js?v=c47b3bf9ebeb910c',
       '/bitty.js?v=c47b3bf9ebeb910c',
       '/render.html',
       '/render.js?v=c47b3bf9ebeb910c',
       '/js/lzma/lzma_worker-min.js?v=c47b3bf9ebeb910c',
       '/js/lzma/lzma-d-min.js?v=c47b3bf9ebeb910c',
       '/render/bookmarklet.js?v=c47b3bf9ebeb910c',
       '/render/bookmarklet.css?v=c47b3bf9ebeb910c',
     ]);
   })
 );
});

self.addEventListener('fetch', function(event) {
  console.debug("Requested", event.request.url);
  
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
 });