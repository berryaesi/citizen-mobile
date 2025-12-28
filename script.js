// Mobile Fire Tracking - User Location Only

document.addEventListener('DOMContentLoaded', function() {
    console.log('Mobile Fire Tracking initialized');
    
    // Configuration for mobile
    const DEFAULT_CENTER = [14.2833, 121.4194]; // Santa Cruz, Laguna
    const DEFAULT_ZOOM = 14;
    const MOBILE_ZOOM = 16;
    
    // Map initialization
    const map = L.map('map', {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: true,
        dragging: true,
        tap: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        trackResize: true
    });
    
    // Add FREE OpenStreetMap tiles (no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c']
    }).addTo(map);
    
    // Add scale control
    L.control.scale({ imperial: false }).addTo(map);
    
    // State variables
    let userMarker = null;
    let userCircle = null;
    let fireMarkers = [];
    let watchId = null;
    let isTracking = false;
    let lastLocation = null;
    
    // Create custom icons for mobile
    function createUserIcon() {
        return L.divIcon({
            html: `
                <div class="relative">
                    <div class="absolute inset-0 animate-ping bg-blue-400 rounded-full opacity-75" style="animation-duration: 2s;"></div>
                    <div class="relative w-10 h-10 bg-blue-600 rounded-full border-3 border-white flex items-center justify-center shadow-lg">
                        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                </div>
            `,
            className: 'mobile-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });
    }
    
    function createFireIcon() {
        return L.divIcon({
            html: `
                <div class="fire-marker-mobile w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"/>
                    </svg>
                </div>
            `,
            className: 'mobile-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });
    }
    
    // Update location status badge
    function updateLocationStatus(active, accuracy) {
        const badge = document.getElementById('locationStatusBadge');
        const text = document.getElementById('locationStatusText');
        
        if (active) {
            badge.className = 'bg-green-600 px-3 py-1 rounded-full text-xs';
            text.textContent = `Active (${Math.round(accuracy)}m)`;
        } else {
            badge.className = 'bg-red-700 px-3 py-1 rounded-full text-xs';
            text.textContent = 'Location Off';
        }
    }
    
    // Update location info display
    function updateLocationInfo(lat, lng, accuracy) {
        const locationEl = document.getElementById('currentLocation');
        const coordsEl = document.getElementById('coordinates');
        const accuracyEl = document.getElementById('accuracy');
        
        // Get approximate address (simulated)
        const address = getApproximateAddress(lat, lng);
        
        if (locationEl) {
            locationEl.innerHTML = `
                <div class="font-medium">${address}</div>
            `;
        }
        
        if (coordsEl) {
            coordsEl.textContent = `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
        
        if (accuracyEl) {
            accuracyEl.textContent = `Accuracy: ${Math.round(accuracy)} meters`;
        }
    }
    
    // Simulate approximate address based on coordinates
    function getApproximateAddress(lat, lng) {
        // This would normally use reverse geocoding
        // For demo, we'll return a simulated address
        const areas = [
            "Santa Cruz Town Proper",
            "Brgy. Gatid Area",
            "Brgy. Patimbao Area",
            "Brgy. Labuin Area",
            "Brgy. San Jose Area",
            "Brgy. Pagsawitan Area"
        ];
        
        // Use coordinates to pick an area
        const index = Math.abs(Math.floor(lat * 1000 + lng * 1000)) % areas.length;
        return areas[index];
    }
    
    // Update active fires count
    function updateFireCount() {
        const countEl = document.getElementById('activeFires');
        if (countEl) {
            countEl.textContent = fireMarkers.length;
            
            // Update response time based on fire count
            const responseTimeEl = document.getElementById('responseTime');
            if (responseTimeEl) {
                if (fireMarkers.length === 0) {
                    responseTimeEl.textContent = '-- min';
                    responseTimeEl.className = 'text-2xl font-bold text-green-600';
                } else if (fireMarkers.length <= 2) {
                    responseTimeEl.textContent = '5-7 min';
                    responseTimeEl.className = 'text-2xl font-bold text-yellow-600';
                } else {
                    responseTimeEl.textContent = '8-10 min';
                    responseTimeEl.className = 'text-2xl font-bold text-red-600';
                }
            }
        }
    }
    
    // Update timestamp
    function updateTimestamp() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        
        const updateEl = document.getElementById('lastUpdateTime');
        if (updateEl) {
            updateEl.textContent = timeString;
        }
    }
    
    // Locate user function
    function locateUser() {
        if (!navigator.geolocation) {
            showNotification('Geolocation not supported on this device', 'error');
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
                
                // Clear old markers
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
                        <div class="font-bold text-blue-600 mb-1">You are here</div>
                        <div class="text-xs text-gray-600">
                            Accuracy: ${Math.round(accuracy)}m<br>
                            ${new Date().toLocaleTimeString()}
                        </div>
                    </div>
                `);
                
                // Add accuracy circle
                userCircle = L.circle([lat, lng], {
                    radius: accuracy,
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.15,
                    weight: 1
                }).addTo(map);
                
                // Center map on user with mobile zoom
                map.setView([lat, lng], MOBILE_ZOOM, {
                    animate: true,
                    duration: 0.5
                });
                
                // Update UI
                updateLocationStatus(true, accuracy);
                updateLocationInfo(lat, lng, accuracy);
                
                // Simulate nearby fires
                simulateNearbyFires(lat, lng);
                
                // Show success notification
                showNotification('Location detected', 'success');
                
                // Reset button
                locateBtn.innerHTML = '<i data-feather="navigation" class="w-4 h-4"></i><span>Update Location</span>';
                locateBtn.disabled = false;
                feather.replace();
                
                // Start tracking
                startTracking();
                updateTimestamp();
                
                lastLocation = { lat, lng, accuracy };
            },
            function(error) {
                console.error('Geolocation error:', error);
                
                let errorMessage = 'Location access denied';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Please enable location in settings';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location timeout';
                        break;
                }
                
                showNotification(errorMessage, 'error');
                
                locateBtn.innerHTML = '<i data-feather="navigation" class="w-4 h-4"></i><span>Locate Me</span>';
                locateBtn.disabled = false;
                feather.replace();
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
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
                const accuracy = position.coords.accuracy;
                
                if (userMarker) {
                    userMarker.setLatLng([lat, lng]);
                }
                if (userCircle) {
                    userCircle.setLatLng([lat, lng]);
                    userCircle.setRadius(accuracy);
                }
                
                updateLocationStatus(true, accuracy);
                updateLocationInfo(lat, lng, accuracy);
                
                // Update nearby fires if moved significantly
                if (lastLocation && 
                    map.distance([lastLocation.lat, lastLocation.lng], [lat, lng]) > 100) {
                    simulateNearbyFires(lat, lng);
                }
                
                lastLocation = { lat, lng, accuracy };
                updateTimestamp();
            },
            function(error) {
                console.error('Tracking error:', error);
                updateLocationStatus(false, 0);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 30000,
                timeout: 15000
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
            updateLocationStatus(false, 0);
        }
    }
    
    // Simulate nearby fires
    function simulateNearbyFires(userLat, userLng) {
        // Clear existing fire markers
        fireMarkers.forEach(marker => map.removeLayer(marker));
        fireMarkers = [];
        
        // Generate 0-3 random fires near user
        const fireCount = Math.floor(Math.random() * 4);
        
        for (let i = 0; i < fireCount; i++) {
            // Generate random coordinates within 2km radius
            const radius = 2 / 111.32; // approx 2km in degrees
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * radius;
            
            const lat = userLat + Math.cos(angle) * distance;
            const lng = userLng + Math.sin(angle) * distance;
            
            // Add fire marker
            const marker = L.marker([lat, lng], {
                icon: createFireIcon()
            }).addTo(map);
            
            const distanceToUser = Math.round(map.distance([userLat, userLng], [lat, lng]));
            
            marker.bindPopup(`
                <div class="p-2">
                    <div class="font-bold text-red-600 mb-1">Fire Alert</div>
                    <div class="text-xs space-y-1">
                        <div>Distance: <span class="font-medium">${distanceToUser}m away</span></div>
                        <div>Status: <span class="font-medium text-red-500">Active</span></div>
                        <div>Reported: <span class="font-medium">${Math.floor(Math.random() * 10) + 1} min ago</span></div>
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
            showNotification('Location services required', 'error');
            return;
        }
        
        const reportBtn = document.getElementById('reportBtn');
        reportBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 animate-spin"></i><span>Reporting...</span>';
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
                        <div class="font-bold text-red-600 mb-1">Emergency Reported</div>
                        <div class="text-xs">
                            <div>Your location has been reported</div>
                            <div class="text-gray-500 mt-1">
                                ${new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                `).openPopup();
                
                fireMarkers.push(marker);
                
                // Center map on reported fire
                map.setView([lat, lng], MOBILE_ZOOM, {
                    animate: true,
                    duration: 0.5
                });
                
                // Update UI
                updateFireCount();
                updateTimestamp();
                
                // Show confirmation
                showNotification('Emergency reported! BFP notified.', 'success');
                
                // Reset button after delay
                setTimeout(() => {
                    reportBtn.innerHTML = '<i data-feather="alert-triangle" class="w-4 h-4"></i><span>Report Fire</span>';
                    reportBtn.disabled = false;
                    feather.replace();
                }, 2000);
                
                // Simulate BFP response
                setTimeout(() => {
                    showNotification('BFP response team dispatched', 'info');
                }, 3000);
            },
            function(error) {
                showNotification('Unable to get location', 'error');
                reportBtn.innerHTML = '<i data-feather="alert-triangle" class="w-4 h-4"></i><span>Report Fire</span>';
                reportBtn.disabled = false;
                feather.replace();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
    
    // Handle device orientation for better mobile experience
    function handleDeviceOrientation() {
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', function(event) {
                // Optional: Could adjust map based on device orientation
                // Currently not implemented to keep it simple
            });
        }
    }
    
    // Handle touch gestures
    function setupTouchGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        
        map.getContainer().addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        map.getContainer().addEventListener('touchend', function(e) {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            // Detect swipe gestures
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            // Long horizontal swipe could be used for navigation
            if (Math.abs(diffX) > 100 && Math.abs(diffY) < 50) {
                // Swipe detected - could be used for page navigation
            }
        });
    }
    
    // Initialize on page load
    function init() {
        // Set initial time
        updateTimestamp();
        updateFireCount();
        
        // Handle device features
        handleDeviceOrientation();
        setupTouchGestures();
        
        // Event listeners
        document.getElementById('locateBtn').addEventListener('click', locateUser);
        document.getElementById('reportBtn').addEventListener('click', reportFireIncident);
        
        // Handle page visibility
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                // Page is hidden - conserve resources
                stopTracking();
            } else {
                // Page is visible - resume if we had location
                if (lastLocation) {
                    startTracking();
                }
            }
        });
        
        // Handle window resize for map
        window.addEventListener('resize', function() {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        });
        
        // Initial notification
        setTimeout(() => {
            showNotification('Enable location for accurate tracking', 'info', 4000);
        }, 1000);
        
        console.log('Mobile app initialized successfully');
    }
    
    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        stopTracking();
    });
    
    // Initialize the app
    init();
});
