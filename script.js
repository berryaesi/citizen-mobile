// Fire Incident Tracking System - Enhanced Version

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Fire Incident Tracking System...');
    
    // Configuration
    const SANTA_CRUZ_CENTER = [14.2833, 121.4194];
    const DEFAULT_ZOOM = 13;
    const MAX_ZOOM = 18;
    const MIN_ZOOM = 10;
    
    // Santa Cruz, Laguna bounds
    const SANTA_CRUZ_BOUNDS = {
        southWest: [14.20, 121.35],
        northEast: [14.32, 121.45]
    };
    
    // Initialize map with FREE OpenStreetMap tiles (no API key needed)
    const map = L.map('map', {
        center: SANTA_CRUZ_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        maxBounds: [
            SANTA_CRUZ_BOUNDS.southWest,
            SANTA_CRUZ_BOUNDS.northEast
        ],
        zoomControl: true,
        attributionControl: true
    });
    
    // Add FREE OpenStreetMap tile layer (no API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c']
    }).addTo(map);
    
    // Add map scale
    L.control.scale({ imperial: false }).addTo(map);
    
    // State variables
    let userMarker = null;
    let userCircle = null;
    let fireMarkers = [];
    let hydrantMarkers = [];
    let isTracking = false;
    let watchId = null;
    
    // Sample fire hydrant locations in Santa Cruz, Laguna
    const fireHydrants = [
        { lat: 14.280248, lng: 121.394529, condition: 'Operational', pressure: 'Low' },
        { lat: 14.280069, lng: 121.394703, condition: 'Operational', pressure: 'High' },
        { lat: 14.273128, lng: 121.400478, condition: 'Operational', pressure: 'High' },
        { lat: 14.271956, lng: 121.399617, condition: 'Operational', pressure: 'High' },
        { lat: 14.27774, lng: 121.411473, condition: 'Operational', pressure: 'Low' },
        { lat: 14.253727, lng: 121.380829, condition: 'Operational', pressure: 'High' },
        { lat: 14.278958, lng: 121.415888, condition: 'Operational', pressure: 'High' },
        { lat: 14.286795, lng: 121.411203, condition: 'Operational', pressure: 'Low' },
        { lat: 14.287409, lng: 121.411705, condition: 'Operational', pressure: 'Low' },
        { lat: 14.277512, lng: 121.419285, condition: 'Unserviceable', pressure: 'N/A' }
    ];
    
    // Add fire hydrant markers
    function addHydrantMarkers() {
        fireHydrants.forEach(hydrant => {
            const icon = L.divIcon({
                html: `
                    <div class="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
                        hydrant.condition === 'Operational' ? 'bg-green-500' : 'bg-gray-500'
                    }" style="box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 20S3 10.87 3 7a7 7 0 1114 0c0 3.87-7 13-7 13zm0-11a2 2 0 100-4 2 2 0 000 4z"/>
                        </svg>
                    </div>
                `,
                className: 'hydrant-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            
            const marker = L.marker([hydrant.lat, hydrant.lng], { icon }).addTo(map);
            
            marker.bindPopup(`
                <div class="p-2">
                    <div class="font-bold mb-2">Fire Hydrant</div>
                    <div class="space-y-1">
                        <div class="flex justify-between">
                            <span class="font-medium">Condition:</span>
                            <span class="${hydrant.condition === 'Operational' ? 'text-green-600' : 'text-red-600'}">
                                ${hydrant.condition}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-medium">Pressure:</span>
                            <span>${hydrant.pressure}</span>
                        </div>
                        <div class="text-xs text-gray-500 mt-2">
                            Lat: ${hydrant.lat.toFixed(6)}<br>
                            Lng: ${hydrant.lng.toFixed(6)}
                        </div>
                    </div>
                </div>
            `);
            
            hydrantMarkers.push(marker);
        });
    }
    
    // Initialize hydrant markers
    addHydrantMarkers();
    
    // Create custom fire icon
    function createFireIcon() {
        return L.divIcon({
            html: `
                <div class="marker-icon fire-icon w-6 h-6 flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"/>
                    </svg>
                </div>
            `,
            className: 'fire-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
    }
    
    // Create custom user location icon
    function createUserIcon() {
        return L.divIcon({
            html: `
                <div class="relative">
                    <div class="absolute inset-0 animate-ping bg-blue-400 rounded-full opacity-75"></div>
                    <div class="marker-icon user-icon w-8 h-8 flex items-center justify-center relative">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                    </div>
                </div>
            `,
            className: 'user-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
    }
    
    // Show notification
    function showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        
        const bgColor = {
            'info': 'bg-blue-500',
            'success': 'bg-green-500',
            'warning': 'bg-yellow-500',
            'error': 'bg-red-500'
        }[type] || 'bg-blue-500';
        
        notification.className = `notification ${bgColor} text-white p-4 rounded-lg shadow-lg max-w-sm`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i data-feather="${getNotificationIcon(type)}" class="w-5 h-5 mr-3"></i>
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2">
                    <i data-feather="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        
        container.appendChild(notification);
        feather.replace();
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transition = 'opacity 0.3s ease';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
    }
    
    function getNotificationIcon(type) {
        const icons = {
            'info': 'info',
            'success': 'check-circle',
            'warning': 'alert-triangle',
            'error': 'alert-octagon'
        };
        return icons[type] || 'info';
    }
    
    // Update location status display
    function updateLocationStatus(lat, lng, accuracy) {
        const statusEl = document.getElementById('locationStatus');
        const coordsEl = document.getElementById('coordinates');
        
        if (statusEl) {
            statusEl.textContent = 'Location detected';
            statusEl.className = 'text-sm text-green-600';
        }
        
        if (coordsEl) {
            coordsEl.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        }
    }
    
    // Update active fires count
    function updateFireCount() {
        const countEl = document.getElementById('activeFires');
        if (countEl) {
            countEl.textContent = fireMarkers.length;
            countEl.className = `text-3xl font-bold ${
                fireMarkers.length > 0 ? 'text-red-600 animate-pulse' : 'text-green-600'
            }`;
        }
    }
    
    // Update last updated timestamp
    function updateTimestamp() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateString = now.toLocaleDateString();
        
        const updateEl = document.getElementById('lastUpdate');
        if (updateEl) {
            updateEl.textContent = `${dateString} ${timeString}`;
        }
    }
    
    // Locate user function
    function locateUser() {
        if (!navigator.geolocation) {
            showNotification('Geolocation is not supported by your browser', 'error');
            return;
        }
        
        const locateBtn = document.getElementById('locateBtn');
        locateBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 animate-spin"></i><span>Locating...</span>';
        locateBtn.disabled = true;
        feather.replace();
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                // Remove old markers
                if (userMarker) {
                    map.removeLayer(userMarker);
                }
                if (userCircle) {
                    map.removeLayer(userCircle);
                }
                
                // Add user marker
                userMarker = L.marker([lat, lng], {
                    icon: createUserIcon(),
                    zIndexOffset: 1000
                }).addTo(map);
                
                userMarker.bindPopup(`
                    <div class="p-2">
                        <div class="font-bold text-blue-600 mb-2">Your Location</div>
                        <div class="space-y-1">
                            <div>Latitude: ${lat.toFixed(6)}</div>
                            <div>Longitude: ${lng.toFixed(6)}</div>
                            <div class="text-xs text-gray-500">Accuracy: ${Math.round(accuracy)} meters</div>
                        </div>
                    </div>
                `);
                
                // Add accuracy circle
                userCircle = L.circle([lat, lng], {
                    radius: accuracy,
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.1,
                    weight: 1
                }).addTo(map);
                
                // Center map on user
                map.setView([lat, lng], 15);
                
                // Update UI
                updateLocationStatus(lat, lng, accuracy);
                
                // Simulate nearby fires
                simulateNearbyFires(lat, lng);
                
                // Show success notification
                showNotification('Location detected successfully', 'success');
                
                // Reset button
                locateBtn.innerHTML = '<i data-feather="navigation" class="w-4 h-4"></i><span>Update Location</span>';
                locateBtn.disabled = false;
                feather.replace();
                
                // Start tracking if not already
                if (!isTracking) {
                    startTracking();
                }
                
                updateTimestamp();
            },
            function(error) {
                console.error('Geolocation error:', error);
                
                let errorMessage = 'Unable to retrieve your location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }
                
                showNotification(errorMessage, 'error');
                
                locateBtn.innerHTML = '<i data-feather="navigation" class="w-4 h-4"></i><span>Locate Me</span>';
                locateBtn.disabled = false;
                feather.replace();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
    
    // Start continuous tracking
    function startTracking() {
        if (isTracking || !navigator.geolocation) return;
        
        watchId = navigator.geolocation.watchPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                if (userMarker) {
                    userMarker.setLatLng([lat, lng]);
                }
                if (userCircle) {
                    userCircle.setLatLng([lat, lng]);
                    userCircle.setRadius(position.coords.accuracy);
                }
                
                updateLocationStatus(lat, lng, position.coords.accuracy);
                updateTimestamp();
            },
            function(error) {
                console.error('Tracking error:', error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 30000,
                timeout: 10000
            }
        );
        
        isTracking = true;
    }
    
    // Stop tracking
    function stopTracking() {
        if (watchId && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
            isTracking = false;
        }
    }
    
    // Simulate nearby fires
    function simulateNearbyFires(userLat, userLng) {
        // Clear existing fire markers
        fireMarkers.forEach(marker => map.removeLayer(marker));
        fireMarkers = [];
        
        // Generate 2-4 random nearby fires
        const fireCount = Math.floor(Math.random() * 3) + 2;
        
        for (let i = 0; i < fireCount; i++) {
            // Generate random coordinates within 3km radius
            const radius = 3 / 111.32; // approx 3km in degrees
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * radius;
            
            const lat = userLat + Math.cos(angle) * distance;
            const lng = userLng + Math.sin(angle) * distance;
            
            // Add fire marker
            const marker = L.marker([lat, lng], {
                icon: createFireIcon()
            }).addTo(map);
            
            marker.bindPopup(`
                <div class="p-2">
                    <div class="font-bold text-red-600 mb-2">Fire Incident #${i + 1}</div>
                    <div class="space-y-1 text-sm">
                        <div>Status: <span class="font-medium">Active</span></div>
                        <div>Reported: <span class="font-medium">Just now</span></div>
                        <div>Severity: <span class="font-medium">${['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]}</span></div>
                        <div class="text-xs text-gray-500">
                            Distance: ${Math.round(map.distance([userLat, userLng], [lat, lng]))} meters
                        </div>
                    </div>
                </div>
            `);
            
            fireMarkers.push(marker);
        }
        
        updateFireCount();
        updateTimestamp();
    }
    
    // Report fire incident
    function reportFireIncident() {
        if (!navigator.geolocation) {
            showNotification('Geolocation not supported', 'error');
            return;
        }
        
        const reportBtn = document.getElementById('reportBtn');
        reportBtn.innerHTML = '<i data-feather="loader" class="w-5 h-5 animate-spin"></i><span>Reporting...</span>';
        reportBtn.disabled = true;
        feather.replace();
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Add fire marker at user's location
                const marker = L.marker([lat, lng], {
                    icon: createFireIcon()
                }).addTo(map);
                
                marker.bindPopup(`
                    <div class="p-2">
                        <div class="font-bold text-red-600 mb-2">Fire Emergency Reported</div>
                        <div class="space-y-1 text-sm">
                            <div>Status: <span class="font-medium">Emergency Response En Route</span></div>
                            <div>Reported: <span class="font-medium">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                            <div>Priority: <span class="font-medium text-red-600">HIGH</span></div>
                            <div class="text-xs text-gray-500">
                                Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
                            </div>
                        </div>
                    </div>
                `).openPopup();
                
                fireMarkers.push(marker);
                
                // Center map on reported fire
                map.setView([lat, lng], 15);
                
                // Update UI
                updateFireCount();
                updateTimestamp();
                
                // Show confirmation
                showNotification('Fire emergency reported successfully! Response team has been notified.', 'success');
                
                // Reset button after delay
                setTimeout(() => {
                    reportBtn.innerHTML = '<i data-feather="alert-triangle" class="w-5 h-5"></i><span>Report Fire Emergency</span>';
                    reportBtn.disabled = false;
                    feather.replace();
                }, 2000);
                
                // Simulate response team marker
                setTimeout(() => {
                    const responseLat = lat + (Math.random() * 0.01 - 0.005);
                    const responseLng = lng + (Math.random() * 0.01 - 0.005);
                    
                    const responseIcon = L.divIcon({
                        html: `
                            <div class="w-10 h-10 bg-blue-600 rounded-full border-4 border-white flex items-center justify-center animate-pulse" style="box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);">
                                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                        `,
                        className: 'response-marker',
                        iconSize: [40, 40],
                        iconAnchor: [20, 40]
                    });
                    
                    const responseMarker = L.marker([responseLat, responseLng], {
                        icon: responseIcon
                    }).addTo(map);
                    
                    responseMarker.bindPopup(`
                        <div class="p-2">
                            <div class="font-bold text-blue-600 mb-2">Response Team En Route</div>
                            <div class="text-sm">ETA: ${Math.floor(Math.random() * 5) + 3} minutes</div>
                        </div>
                    `);
                    
                    // Remove response marker after 30 seconds
                    setTimeout(() => {
                        map.removeLayer(responseMarker);
                    }, 30000);
                }, 1000);
            },
            function(error) {
                showNotification('Unable to get location for reporting. Please enable location services.', 'error');
                reportBtn.innerHTML = '<i data-feather="alert-triangle" class="w-5 h-5"></i><span>Report Fire Emergency</span>';
                reportBtn.disabled = false;
                feather.replace();
            }
        );
    }
    
    // Refresh map data
    function refreshMapData() {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 animate-spin"></i><span>Refreshing...</span>';
        feather.replace();
        
        // Simulate data refresh
        setTimeout(() => {
            if (userMarker) {
                const latLng = userMarker.getLatLng();
                simulateNearbyFires(latLng.lat, latLng.lng);
            }
            
            refreshBtn.innerHTML = '<i data-feather="refresh-cw" class="w-4 h-4"></i><span>Refresh</span>';
            feather.replace();
            
            showNotification('Map data refreshed', 'success');
            updateTimestamp();
        }, 1000);
    }
    
    // Show hydrants
    function toggleHydrants() {
        hydrantMarkers.forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            } else {
                marker.addTo(map);
            }
        });
        
        const viewHydrantsBtn = document.getElementById('viewHydrants');
        const isVisible = map.hasLayer(hydrantMarkers[0]);
        
        showNotification(
            isVisible ? 'Fire hydrants shown on map' : 'Fire hydrants hidden',
            isVisible ? 'success' : 'info'
        );
    }
    
    // Show emergency contact
    function showEmergencyContact() {
        if (confirm('Call emergency services?\n\nBFP Santa Cruz: (049) 808-1234\n\nClick OK to call or Cancel for more options.')) {
            showNotification('Emergency services called. Please provide location details.', 'warning');
        } else {
            showNotification(
                'Emergency Contacts:\n' +
                'BFP: (049) 808-1234\n' +
                'Police: (049) 808-5678\n' +
                'Hospital: (049) 808-9012',
                'info'
            );
        }
    }
    
    // Show help information
    function showHelp() {
        showNotification(
            'Emergency Response Guide:\n' +
            '1. Report fires using the red button\n' +
            '2. Enable location for accurate positioning\n' +
            '3. Use the dashboard for navigation\n' +
            '4. Contact numbers are listed in Contacts section',
            'info',
            8000
        );
    }
    
    // Event Listeners
    document.getElementById('locateBtn').addEventListener('click', locateUser);
    document.getElementById('reportBtn').addEventListener('click', reportFireIncident);
    document.getElementById('refreshBtn').addEventListener('click', refreshMapData);
    document.getElementById('viewHydrants').addEventListener('click', toggleHydrants);
    document.getElementById('callEmergency').addEventListener('click', showEmergencyContact);
    document.getElementById('showHelp').addEventListener('click', showHelp);
    
    // Handle window resize
    window.addEventListener('resize', function() {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        stopTracking();
    });
    
    // Initialize
    updateFireCount();
    updateTimestamp();
    
    console.log('Fire Incident Tracking System initialized successfully');
});