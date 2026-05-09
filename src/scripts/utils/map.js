export function createMap(elementId, center = [-2.5, 118], zoom = 5) {
  const layers = {
    'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }),
    'CartoDB Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://carto.com">CARTO</a>',
      maxZoom: 19,
    }),
    'Esri Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© <a href="https://esri.com">Esri</a>',
      maxZoom: 17,
    }),
  };
  const map = L.map(elementId).setView(center, zoom);
  layers['CartoDB Dark'].addTo(map);
  L.control.layers(layers, {}, { collapsed: false }).addTo(map);
  return map;
}
