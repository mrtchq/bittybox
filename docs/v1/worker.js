self.addEventListener('install', function(e) {
 e.waitUntil(
   caches.open('bittybox-v1').then(function(cache) {
     return cache.addAll([
       '/',
       '/favicon.ico?v=c47b3bf9ebeb910c'
     ]);
   })
 );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      console.debug("Requested", event.request.url, response);

      return response || fetch(event.request);
    })
  );
 });