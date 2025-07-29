import { Link } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { HistoryNavigationContext, AppActionsContext } from '../App';

export default function Menu() {
    const nav = useContext(HistoryNavigationContext);
    const actions = useContext(AppActionsContext);
    const [showNewsDropdown, setShowNewsDropdown] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const newsDropdownRef = useRef<HTMLDivElement>(null);
    
    // Check authentication status on component mount
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const result = await chrome.storage.local.get(['userAuthenticated', 'googleAuthToken', 'authTimestamp', 'userPhoto', 'userName']);
                if (result.userAuthenticated && result.googleAuthToken) {
                    // Check if token is still valid (24 hours)
                    const tokenAge = Date.now() - (result.authTimestamp || 0);
                    if (tokenAge < 24 * 60 * 60 * 1000) {
                        setIsAuthenticated(true);
                        setUserName(result.userName || 'User');
                        setUserPhoto(result.userPhoto || null);
                        
                        // Try to get user info from Google if we don't have it
                        if (!result.userPhoto && chrome.identity) {
                            try {
                                chrome.identity.getAuthToken({ interactive: false }, async (token) => {
                                    if (token) {
                                        // Get user info from Google People API
                                        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                                            headers: {
                                                'Authorization': `Bearer ${token}`
                                            }
                                        });
                                        
                                        if (response.ok) {
                                            const userInfo = await response.json();
                                            const photoUrl = userInfo.picture;
                                            const name = userInfo.name || userInfo.email;
                                            
                                            // Store user info
                                            await chrome.storage.local.set({
                                                userPhoto: photoUrl,
                                                userName: name
                                            });
                                            
                                            setUserPhoto(photoUrl);
                                            setUserName(name);
                                        }
                                    }
                                });
                            } catch (error) {
                                console.log('Could not fetch user photo:', error);
                            }
                        }
                    } else {
                        // Token expired, clear it
                        await chrome.storage.local.remove(['userAuthenticated', 'googleAuthToken', 'authTimestamp', 'userPhoto', 'userName']);
                        setIsAuthenticated(false);
                        setUserName(null);
                        setUserPhoto(null);
                    }
                } else {
                    setIsAuthenticated(false);
                    setUserName(null);
                    setUserPhoto(null);
                }
            } catch (error) {
                setIsAuthenticated(false);
                setUserName(null);
                setUserPhoto(null);
            }
        };

        checkAuthStatus();
        
        // Listen for storage changes to update auth status
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.userAuthenticated || changes.googleAuthToken || changes.userPhoto || changes.userName) {
                checkAuthStatus();
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        
        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);

    // Handle sign out
    const handleSignOut = async () => {
        try {
            // Clear authentication data
            await chrome.storage.local.remove(['userAuthenticated', 'googleAuthToken', 'authTimestamp', 'userPhoto', 'userName']);
            setIsAuthenticated(false);
            setUserName(null);
            setUserPhoto(null);
            
            // Revoke the token if possible
            if (chrome.identity) {
                chrome.identity.getAuthToken({ interactive: false }, (token) => {
                    if (token) {
                        chrome.identity.removeCachedAuthToken({ token: token as string }, () => {
                            console.log('Token revoked');
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };
    
    // Handle clicking outside the news dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (newsDropdownRef.current && !newsDropdownRef.current.contains(event.target as Node)) {
                setShowNewsDropdown(false);
            }
        };

        if (showNewsDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNewsDropdown]);
    
    const handleWeatherRequest = () => {
        // Weather always needs location, show location form
        showLocationForm('weather');
    };
    
    const handleNewsOption = async (option: string) => {
        setShowNewsDropdown(false);
        
        // World news doesn't need location, go directly to query
        if (option === 'world') {
            const query = `Get the latest world news and top international headlines. Include major global events, international politics, economic developments, and significant world news.`;
            if (actions?.sendNewsQuery) {
                actions.sendNewsQuery(query);
            }
            return;
        }
        
        // Weather and other options need location
        if (option === 'weather') {
            showLocationForm('weather');
            return;
        }
        
        // Get user's location or show location selection form
        let location = '';
        let country = '';
        let query = '';
        
        try {
            // Try to get browser location first
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });
            
            const { latitude, longitude } = position.coords;
            
            // Reverse geocode to get city and country name
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
            const data = await response.json();
            const addressParts = data.display_name.split(', ');
            location = addressParts[0]; // Get city name
            country = addressParts[addressParts.length - 1]; // Get country name
            
            // Save this location for future use
            saveLocation(location, country);
            
        } catch (error) {
            // Show location selection form instead of popup
            showLocationForm(option);
            return; // Exit early, will handle query after location is selected
        }
        
        // Build and send query using context
        buildAndSendQueryWithContext(option, location, country);
    };
    
    const saveLocation = (city: string, country: string) => {
        const savedLocations = JSON.parse(localStorage.getItem('savedLocations') || '[]');
        const newLocation = { city, country, timestamp: Date.now() };
        
        // Check if location already exists
        const exists = savedLocations.find((loc: any) => 
            loc.city.toLowerCase() === city.toLowerCase() && 
            loc.country.toLowerCase() === country.toLowerCase()
        );
        
        if (!exists) {
            savedLocations.push(newLocation);
            // Keep only last 10 locations
            if (savedLocations.length > 10) {
                savedLocations.shift();
            }
            localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
        }
    };
    
    const showLocationForm = (option: string) => {
        const savedLocations = JSON.parse(localStorage.getItem('savedLocations') || '[]');
        
        // Get the appropriate title based on option
        let title = '';
        switch (option) {
            case 'local':
                title = 'Local News';
                break;
            case 'national':
                title = 'National News';
                break;
            case 'events':
                title = 'Events';
                break;
            case 'weather':
                title = 'Weather';
                break;
            default:
                title = 'Location Required';
        }
        
        // Create the location form HTML
        const formHTML = `
            <div class="location-selection-form">
                <h3>${title}</h3>
                <h4>Select your location:</h4>
                
                ${savedLocations.length > 0 ? `
                    <div class="saved-locations">
                        <h5>Recent Locations:</h5>
                        <div class="location-buttons">
                            ${savedLocations.map((loc: any) => `
                                <button class="location-btn" data-city="${loc.city}" data-country="${loc.country}">
                                    ${loc.city}, ${loc.country}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="form-row">
                    <button id="useCurrentLocation" class="location-btn">
                        <i class="fas fa-location-arrow"></i> Use Current Location
                    </button>
                </div>
                
                <div class="form-row">
                    <input type="text" id="cityInput" placeholder="City" class="location-input">
                    <input type="text" id="countryInput" placeholder="Country" class="location-input">
                </div>
                
                <div class="form-actions">
                    <button id="submitLocation" class="location-btn">
                        Continue
                    </button>
                </div>
            </div>
        `;
        
        // Send the form to the Home component via context
        if (actions?.sendNewsQuery) {
            actions.sendNewsQuery(`LOCATION_FORM:${option}:${formHTML}`);
        }
    };
    
    const buildAndSendQueryWithContext = (option: string, location: string, country: string) => {
        let query = '';
        let loadingMessage = '';
        
        // Build query based on option and location
        switch (option) {
            case 'local':
                if (location && country) {
                    query = `Get the latest local news for ${location}, ${country} and surrounding areas within 100 miles. Include breaking news, community events, and local developments.`;
                    loadingMessage = `Getting local news for ${location}, ${country}...`;
                } else if (location) {
                    query = `Get the latest local news for ${location} and surrounding areas within 100 miles. Include breaking news, community events, and local developments.`;
                    loadingMessage = `Getting local news for ${location}...`;
                } else {
                    query = `Get the latest local news for my current area and surrounding regions within 100 miles. Include breaking news, community events, and local developments.`;
                    loadingMessage = 'Getting local news for your area...';
                }
                break;
            case 'national':
                if (country) {
                    query = `Get the latest national news from ${country}. Include top headlines, major political developments, economic news, and significant national events.`;
                    loadingMessage = `Getting national news from ${country}...`;
                } else {
                    query = `Get the latest national news from across the country. Include top headlines, major political developments, economic news, and significant national events.`;
                    loadingMessage = 'Getting national news...';
                }
                break;
            case 'events':
                if (location && country) {
                    query = `Get upcoming events, concerts, festivals, and activities happening in ${location}, ${country} and within 100 miles. Include dates, venues, and event details.`;
                    loadingMessage = `Getting events near ${location}, ${country}...`;
                } else if (location) {
                    query = `Get upcoming events, concerts, festivals, and activities happening in ${location} and within 100 miles. Include dates, venues, and event details.`;
                    loadingMessage = `Getting events near ${location}...`;
                } else {
                    query = `Get upcoming events, concerts, festivals, and activities happening in my area within 100 miles. Include dates, venues, and event details.`;
                    loadingMessage = 'Getting events in your area...';
                }
                break;
            case 'weather':
                if (location && country) {
                    query = `Get the current weather forecast for ${location}, ${country}. Include current conditions, temperature, humidity, wind speed, and a 5-day forecast. Also provide weather alerts if any.`;
                    loadingMessage = `Getting weather for ${location}, ${country}...`;
                } else if (location) {
                    query = `Get the current weather forecast for ${location}. Include current conditions, temperature, humidity, wind speed, and a 5-day forecast. Also provide weather alerts if any.`;
                    loadingMessage = `Getting weather for ${location}...`;
                } else {
                    query = `Get the current weather forecast for my current location. Include current conditions, temperature, humidity, wind speed, and a 5-day forecast. Also provide weather alerts if any.`;
                    loadingMessage = 'Getting weather for your location...';
                }
                break;
        }
        
        // Send the query to AI via context
        if (query && actions?.sendNewsQuery) {
            actions.sendNewsQuery(`LOADING:${loadingMessage}:${query}`);
        }
    };
    
    return (
    <div id="rightMenu">
        <nav>
            <Link to="/" id="homeToggle" className="menu-item tooltip">
                <i className="fas fa-comments"></i>
                <span className="tooltiptext">Chat</span>
            </Link>
            <button id="historyBackBtn" className="menu-item tooltip" onClick={async () => {
              try {
                await nav?.goBack?.();
              } catch (error) {
                console.error('Error navigating back:', error);
              }
            }} disabled={!nav?.canGoBack}>
                <i className="fas fa-arrow-left"></i>
                <span className="tooltiptext">Previous</span>
            </button>
            <button id="historyForwardBtn" className="menu-item tooltip" onClick={async () => {
              try {
                await nav?.goForward?.();
              } catch (error) {
                console.error('Error navigating forward:', error);
              }
            }} disabled={!nav?.canGoForward}>
                <i className="fas fa-arrow-right"></i>
                <span className="tooltiptext">Next</span>
            </button>
            <Link to="/history" id="historyToggle" className="menu-item tooltip">
                <i className="fas fa-history"></i>
                <span className="tooltiptext">History</span>
            </Link>
            
            {/* News/Events Button */}
            <div className="news-dropdown-container">
                <button 
                    id="newsBtn" 
                    className="menu-item news-button tooltip" 
                    onClick={() => setShowNewsDropdown(!showNewsDropdown)}
                >
                    <i className="fas fa-newspaper"></i>
                    <span className="tooltiptext">News</span>
                </button>
                
                {showNewsDropdown && (
                    <div className="news-dropdown" ref={newsDropdownRef}>
                        <button onClick={() => handleNewsOption('local')}>
                            <i className="fas fa-map-marker-alt"></i>
                            Local News
                        </button>
                        <button onClick={() => handleNewsOption('national')}>
                            <i className="fas fa-flag"></i>
                            National News
                        </button>
                        <button onClick={() => handleNewsOption('world')}>
                            <i className="fas fa-globe"></i>
                            World News
                        </button>
                        <button onClick={() => handleNewsOption('events')}>
                            <i className="fas fa-calendar-alt"></i>
                            Events
                        </button>
                        <button onClick={() => handleNewsOption('weather')}>
                            <i className="fas fa-cloud-sun"></i>
                            Weather
                        </button>
                    </div>
                )}
            </div>
            
            {/* Notes Button */}
            <Link to="/notes" id="notesToggle" className="menu-item notes-button tooltip">
                <i className="fas fa-sticky-note"></i>
                <span className="tooltiptext">Notes</span>
            </Link>
            
            {/* Clear Content Button - Bottom with large gap */}
            <div className="clear-button-container">
                <button 
                    id="clearContentBtn" 
                    className="menu-item clear-button tooltip" 
                    onClick={() => actions?.clearContent?.()}
                >
                    <i className="fas fa-trash-alt"></i>
                    <span className="tooltiptext">Clear</span>
                </button>
            </div>
            
            {/* Help Button - Above settings button */}
            <div className="help-button-container">
                <Link to="/help" id="helpToggle" className="menu-item help-button tooltip">
                    <i className="fas fa-question-circle"></i>
                    <span className="tooltiptext">Help</span>
                </Link>
            </div>
            
            {/* Settings Button - Below help button */}
            <div className="settings-button-container">
                <Link to="/settings" id="settingsToggle" className="menu-item settings-button tooltip">
                    <i className="fas fa-cog"></i>
                    <span className="tooltiptext">Settings</span>
                </Link>
            </div>
            
            {/* User Profile Section - Bottom of menu */}
            {isAuthenticated && (
                <div className="user-profile-container">
                    <div className="user-profile tooltip" onClick={handleSignOut}>
                        {userPhoto ? (
                            <img 
                                src={userPhoto} 
                                alt="User profile" 
                                className="user-avatar"
                            />
                        ) : (
                            <i className="fas fa-user-circle user-icon"></i>
                        )}
                        <span className="tooltiptext">{userName || 'User'} (Click to sign out)</span>
                    </div>
                </div>
            )}
        </nav>
    </div>
    )
}