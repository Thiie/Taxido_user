import React, {useRef} from "react";
import {View, StyleSheet} from "react-native";
import {WebView} from "react-native-webview";

interface Coord {
  lat: number;
  lng: number;
}

interface MapScreenProps {
  mapType: "google_map" | "osm" | any;
  pickupCoords: Coord;
  stopsCoords: Coord[]; // up to 3 stops
  destinationCoords: Coord;
  isDark: boolean;
  Google_Map_Key: string;
}

const MapScreen: React.FC<MapScreenProps> = ({
  mapType,
  pickupCoords,
  stopsCoords,
  destinationCoords,
  isDark,
  Google_Map_Key,
}) => {
  const webViewRef = useRef<WebView>(null);

  const getMapHtml = (provider: "google_map" | "osm") => {
    if (!pickupCoords || !destinationCoords) return "";

    const commonCss = `
      <style>
        .route-button {
          position: absolute;
          bottom: 150px;
          right: 20px;
          z-index: 1001;
          background: white;
          padding: 8px;
          border-radius: 50%;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .route-button svg, .location-button svg {
          fill: #444;
          width: 24px;
          height: 24px;
        }
      </style>
    `;

    if (provider === "google_map") {
      const stopsJson = JSON.stringify(
        stopsCoords.map(s => ({location: s, stopover: true})),
      );
      const allPointsJson = JSON.stringify([
        {lat: pickupCoords.lat, lng: pickupCoords.lng},
        ...stopsCoords,
        {lat: destinationCoords.lat, lng: destinationCoords.lng},
      ]);

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Maps</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://maps.googleapis.com/maps/api/js?key=${Google_Map_Key}"></script>
          <style>html, body, #map { height: 100%; margin: 0; padding: 0; position: relative; }</style>
          ${commonCss}
        </head>
        <body>
          <div id="map"></div>
          <button class="route-button" onclick="focusRoute()">
            <svg viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
          </button>
          <script>
            var map, directionsRenderer, markers = [];
            
            function focusRoute() {
              if (markers.length > 0) {
                var bounds = new google.maps.LatLngBounds();
                markers.forEach(m => bounds.extend(m.getPosition()));
                map.panTo(bounds.getCenter());
              }
            }

            function fetchCurrentLocation() {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const pos = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                    };
                    map.setCenter(pos);
                    map.setZoom(15);
                  },
                  () => {
                    console.log("Error: The Geolocation service failed.");
                  }
                );
              } else {
                console.log("Error: Your browser doesn't support geolocation.");
              }
            }

            function initMap() {
              const darkMapStyle = [
                { elementType: 'geometry', stylers: [{ color: '#212121' }] },
                { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
                { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
                { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#282828' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#383838' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] }
              ];

              map = new google.maps.Map(document.getElementById('map'), {
                zoom: 11,
                center: { lat: ${pickupCoords.lat}, lng: ${pickupCoords.lng} },
                disableDefaultUI: true,
                gestureHandling: 'greedy',
                styles: ${isDark ? "darkMapStyle" : "null"},
                zoomControl: false,
                scrollwheel: true,
                draggable: true,
                disableDoubleClickZoom: true,
                keyboardShortcuts: true
              });

              drawRouteAndMarkers();
            }

            function clearAll() {
              if(directionsRenderer) directionsRenderer.setMap(null);
              markers.forEach(m => m.setMap(null));
              markers = [];
            }

            function drawRouteAndMarkers() {
              clearAll();
              var waypoints = ${stopsJson};
              var directionsService = new google.maps.DirectionsService();
              
              var allPoints = ${allPointsJson};
              allPoints.forEach(p => markers.push(new google.maps.Marker({ position: p, map: map })));

              directionsService.route({
                origin: { lat: ${pickupCoords.lat}, lng: ${pickupCoords.lng} },
                destination: { lat: ${destinationCoords.lat}, lng: ${
        destinationCoords.lng
      } },
                waypoints: waypoints,
                travelMode: 'DRIVING'
              }, (res, status) => { 
                if(status === 'OK') {
                  animatePolylineWithShimmer(res.routes[0].overview_path);
                }
              });
            }

            function animatePolylineWithShimmer(path) {
              var animatedPath = [];
              var polyline = new google.maps.Polyline({
                path: animatedPath,
                geodesic: true,
                strokeColor: '#199675',
                strokeOpacity: 1.0,
                strokeWeight: 5,
                map: map
              });

              var step = 0;
              var numSteps = 200;
              var timePerStep = 8;
              var pathLength = path.length;

              function easeInOutCubic(t) {
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
              }

              function animate() {
                if (step > numSteps) return;
                
                var progress = easeInOutCubic(step / numSteps);
                var targetIndex = Math.floor(progress * (pathLength - 1));
                
                for (var i = animatedPath.length; i <= targetIndex; i++) {
                  animatedPath.push(path[i]);
                }
                
                polyline.setPath(animatedPath);
                step++;
                
                if (step <= numSteps) {
                  setTimeout(animate, timePerStep);
                }
              }
              
              animate();
            }

            window.onload = initMap;
          </script>
        </body>
        </html>
      `;
    }

    const waypointsStr = [
      pickupCoords,
      ...stopsCoords.filter(s => s.lat && s.lng),
      destinationCoords,
    ]
      .map(c => `L.latLng(${c.lat}, ${c.lng})`)
      .join(", ");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OSM Map</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine/dist/leaflet-routing-machine.css" />
        <script src="https://unpkg.com/leaflet-routing-machine/dist/leaflet-routing-machine.js"></script>
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; position: relative; }
          .leaflet-container { background: ${isDark ? "#212121" : "#fff"}; }
          .leaflet-routing-container { display: none !important; }
          .leaflet-control { display: none !important; }
        </style>
        ${commonCss}
      </head>
      <body>
        <div id="map"></div>
        <button class="route-button" onclick="focusRoute()">
          <svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
        </button>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            var isDark = ${isDark};
            var lightTiles = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
            var darkTiles = 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png';
            var waypoints = [];

            window.focusRoute = function() {
              if (waypoints.length > 0) {
                var bounds = L.latLngBounds(waypoints.map(wp => [wp.lat, wp.lng]));
                map.panTo(bounds.getCenter());
              }
            };

            window.fetchCurrentLocation = function() {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    map.setView([lat, lng], 15);
                  },
                  () => {
                    console.log("Error: The Geolocation service failed.");
                  }
                );
              } else {
                console.log("Error: Your browser doesn't support geolocation.");
              }
            };

            var map = L.map('map', {
              center: [${pickupCoords.lat}, ${pickupCoords.lng}],
              zoom: 6,
              dragging: true,
              touchZoom: true,
              scrollWheelZoom: true,
              doubleClickZoom: true,
              boxZoom: true,
              keyboard: true,
              zoomControl: false,
              tap: true,
              attributionControl: false
            });

            L.tileLayer(isDark ? darkTiles : lightTiles, { maxZoom: 19 }).addTo(map);

            waypoints = [${waypointsStr}];

            // Draw markers
            waypoints.forEach((wp, i) => {
              var text = i === 0 ? "Start" : i === waypoints.length - 1 ? "End" : "Stop " + i;
              L.marker([wp.lat, wp.lng]).addTo(map).bindPopup(text);
            });

            // Draw route with animation and shimmer
            var routingControl = L.Routing.control({
              waypoints: waypoints,
              routeWhileDragging: false,
              createMarker: function() { return null; },
              lineOptions: { 
                styles: [{ color: 'transparent', weight: 0 }]
              },
              addWaypoints: false,
              draggableWaypoints: false,
              fitSelectedRoutes: true,
              showAlternatives: false
            }).on('routesfound', function(e) {
              var route = e.routes[0];
              var coordinates = route.coordinates;
              animatePolylineWithShimmer(coordinates);
            }).addTo(map);

            function animatePolylineWithShimmer(coordinates) {
              var animatedCoords = [];
              var polyline = L.polyline(animatedCoords, {
                color: '#199675',
                weight: 5,
                opacity: 1
              }).addTo(map);

              var step = 0;
              var numSteps = 200;
              var timePerStep = 8;
              var coordsLength = coordinates.length;

              function easeInOutCubic(t) {
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
              }

              function animate() {
                if (step > numSteps) return;
                
                var progress = easeInOutCubic(step / numSteps);
                var targetIndex = Math.floor(progress * (coordsLength - 1));
                
                for (var i = animatedCoords.length; i <= targetIndex; i++) {
                  animatedCoords.push(coordinates[i]);
                }
                
                polyline.setLatLngs(animatedCoords);
                step++;
                
                if (step <= numSteps) {
                  setTimeout(animate, timePerStep);
                }
              }
              
              animate();
            }

            map.fitBounds(waypoints.map(wp => [wp.lat, wp.lng]));
          });
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <WebView
        key={
          mapType +
          JSON.stringify([pickupCoords, stopsCoords, destinationCoords])
        }
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{html: getMapHtml(mapType)}}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
      />
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
