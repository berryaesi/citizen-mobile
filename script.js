// Mobile Location Tracker - User Location Only
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mobile Location Tracker initialized');
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
    let watchId = null;
    let isTracking = false;
    let lastLocation = null;
    // Create custom icons for mobile
    function createUserIcon() {
        return L.divIcon({
            html: `
                <div class="relative">
                    <div class="absolute inset-0 animate-ping bg-blue-400 rounded-full opacity-75" style="animation-duration: 2s;"></div>
                    <div class="relative w-10 h-10 bg-blue-600 rounded-full border-3 border-white flex items-center justify-center shadow-lg pulse-marker">
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
    // Update location status badge
    function updateLocationStatus(active, accuracy) {
        const badge = document.getElementById('locationStatusBadge');
        const text = document.getElementById('locationStatusText');
    
        if (active) {
            badge.className = 'bg-green-600 px-3 py-1 rounded-full text-xs';
            text.textContent = `Active (${Math.round(accuracy)}m)`;
            updateLocationStats(true, accuracy);
        } else {
            badge.className = 'bg-red-700 px-3 py-1 rounded-full text-xs';
            text.textContent = 'Location Off';
            updateLocationStats(false, 0);
        }
    }
    // Update location stats card
    function updateLocationStats(active, accuracy) {
        const statusEl = document.getElementById('locationStatus');
        if (!statusEl) return;
    
        if (active) {
            statusEl.textContent = `Active (${Math.round(accuracy)}m)`;
            statusEl.className = 'text-xl font-bold text-green-600';
        } else {
            statusEl.textContent = 'Not Tracking';
            statusEl.className = 'text-xl font-bold text-blue-600';
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
    // Store location specifically for form auto-fill
    function storeLocationForForms(lat, lng, accuracy, address) {
        const mobileLocation = {
            lat: lat,
            lng: lng,
            accuracy: accuracy,
            address: address,
            timestamp: new Date().toISOString(),
            source: 'mobile'
        };
      
        // Store in multiple ways for reliability
        localStorage.setItem('mobileLastLocation', JSON.stringify(mobileLocation));
        localStorage.setItem('locationForForms', JSON.stringify(mobileLocation));
        localStorage.setItem('formLocation', address);
        localStorage.setItem('formLat', lat);
        localStorage.setItem('formLng', lng);
      
        console.log('Location stored for forms:', mobileLocation);
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
    // Generate QR Code for location sharing
    function generateQRCodeForLocation(lat, lng, accuracy, address) {
        const locationData = {
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
            address: address,
            accuracy: accuracy,
            timestamp: new Date().getTime(),
            source: 'mobile'
        };
      
        const dataString = JSON.stringify(locationData);
      
        const qrModal = document.createElement('div');
        qrModal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        qrModal.innerHTML = `
            <div class="bg-white rounded-xl p-6 max-w-sm w-full">
                <div class="text-center">
                    <i data-feather="smartphone" class="w-12 h-12 text-blue-500 mx-auto mb-4"></i>
                    <h3 class="text-lg font-bold mb-2">Scan QR Code</h3>
                    <p class="text-gray-600 mb-4">Scan this QR code with desktop camera</p>
                  
                    <div id="qrcode" class="flex justify-center mb-4"></div>
                  
                    <div class="text-xs text-gray-500 mb-4">
                        Or manually enter:<br>
                        <code class="text-xs bg-gray-100 p-1 rounded">${btoa(dataString)}</code>
                    </div>
                  
                    <div class="text-left bg-blue-50 p-3 rounded-lg mb-4">
                        <div class="text-sm font-medium text-blue-800">Location:</div>
                        <div class="text-xs text-blue-600">
                            ${address}<br>
                            ${lat.toFixed(4)}, ${lng.toFixed(4)}
                        </div>
                    </div>
                  
                    <button onclick="closeQRModal()" class="w-full py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                        Close
                    </button>
                </div>
            </div>
        `;
      
        document.body.appendChild(qrModal);
        feather.replace();
      
        // Generate QR code
        setTimeout(() => {
            QRCode.toCanvas(document.getElementById('qrcode'), dataString, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }, function(error) {
                if (error) console.error(error);
            });
        }, 100);
    }
    function closeQRModal() {
        const modal = document.querySelector('.fixed.inset-0.bg-black');
        if (modal) {
            modal.remove();
        }
    }
    // Share location via QR code for cross-device use
    function shareLocationForDashboard() {
        if (!navigator.geolocation) {
            showNotification('Geolocation not supported', 'error');
            return;
        }
     
        showNotification('Getting location for dashboard...', 'info');
     
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = Math.round(position.coords.accuracy);
                const address = getApproximateAddress(lat, lng);
             
                // Store location for forms as well
                storeLocationForForms(lat, lng, accuracy, address);
             
                // Generate and show QR code
                generateQRCodeForLocation(lat, lng, accuracy, address);
            },
            function(error) {
                showNotification('Could not get location', 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000
            }
        );
    }
   
    // Add share button to mobile app
    function addShareButton() {
        const header = document.querySelector('header');
        if (header) {
            const shareButton = document.createElement('button');
            shareButton.className = 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2';
            shareButton.innerHTML = '<i data-feather="share-2" class="w-4 h-4"></i><span>Share Location</span>';
            shareButton.onclick = shareLocationForDashboard;
         
            // Insert after location status badge
            const statusBadge = document.getElementById('locationStatusBadge');
            if (statusBadge) {
                statusBadge.parentNode.insertBefore(shareButton, statusBadge.nextSibling);
            }
         
            feather.replace();
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
                const address = getApproximateAddress(lat, lng);
            
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
                            ${address}<br>
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
            
                // STORE LOCATION FOR DASHBOARD FORMS
                storeLocationForForms(lat, lng, accuracy, address);
            
                // Show success notification
                showNotification('Location saved for form auto-fill!', 'success');
            
                // Reset button
                locateBtn.innerHTML = '<i data-feather="navigation" class="w-4 h-4"></i><span>Update Location</span>';
                locateBtn.disabled = false;
                feather.replace();
            
                // Start tracking
                startTracking();
                updateTimestamp();
            
                lastLocation = { lat, lng, accuracy, address };
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
                const address = getApproximateAddress(lat, lng);
            
                if (userMarker) {
                    userMarker.setLatLng([lat, lng]);
                }
                if (userCircle) {
                    userCircle.setLatLng([lat, lng]);
                    userCircle.setRadius(accuracy);
                }
            
                updateLocationStatus(true, accuracy);
                updateLocationInfo(lat, lng, accuracy);
            
                // Update stored location
                storeLocationForForms(lat, lng, accuracy, address);
            
                lastLocation = { lat, lng, accuracy, address };
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
    // Report emergency
    function reportEmergency() {
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
                const accuracy = position.coords.accuracy;
                const address = getApproximateAddress(lat, lng);
            
                // Store location for dashboard
                storeLocationForForms(lat, lng, accuracy, address);
            
                // Show confirmation with location details
                showNotification(`Emergency reported from ${address}`, 'success');
            
                // Center map on user's location
                if (userMarker) {
                    map.setView([lat, lng], MOBILE_ZOOM, {
                        animate: true,
                        duration: 0.5
                    });
                
                    // Update location info
                    updateLocationInfo(lat, lng, accuracy);
                    updateTimestamp();
                
                    // Open user marker popup
                    userMarker.openPopup();
                }
            
                // Reset button after delay
                setTimeout(() => {
                    reportBtn.innerHTML = '<i data-feather="alert-triangle" class="w-4 h-4"></i><span>Report Emergency</span>';
                    reportBtn.disabled = false;
                    feather.replace();
                }, 2000);
            
                // Simulate BFP response
                setTimeout(() => {
                    showNotification('BFP response team dispatched to your location', 'info');
                }, 3000);
            },
            function(error) {
                showNotification('Unable to get location. Please try "Locate Me" first.', 'error');
                reportBtn.innerHTML = '<i data-feather="alert-triangle" class="w-4 h-4"></i><span>Report Emergency</span>';
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
        updateLocationStats(false, 0);
    
        // Handle device features
        handleDeviceOrientation();
        setupTouchGestures();
    
        // Event listeners
        document.getElementById('locateBtn').addEventListener('click', locateUser);
        document.getElementById('reportBtn').addEventListener('click', reportEmergency);
        
        // Add share button
        addShareButton();
    
        // Check if there's existing location data
        const storedLocation = localStorage.getItem('mobileLastLocation');
        if (storedLocation) {
            try {
                const locationData = JSON.parse(storedLocation);
                const now = new Date();
                const storedTime = new Date(locationData.timestamp);
                const hoursDiff = (now - storedTime) / (1000 * 60 * 60);
            
                if (hoursDiff < 1) { // Location is less than 1 hour old
                    // Pre-fill with stored location
                    updateLocationInfo(locationData.lat, locationData.lng, locationData.accuracy);
                    showNotification('Using your last known location for auto-fill', 'info', 3000);
                }
            } catch (e) {
                console.error('Error parsing stored location:', e);
            }
        }
    
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
            showNotification('Enable location for accurate tracking and form auto-fill', 'info', 4000);
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
