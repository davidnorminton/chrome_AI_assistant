import { Link } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { HistoryNavigationContext, AppActionsContext } from '../App';

export default function Menu() {
    const nav = useContext(HistoryNavigationContext);
    const actions = useContext(AppActionsContext);
    const [showNewsDropdown, setShowNewsDropdown] = useState(false);
    const newsDropdownRef = useRef<HTMLDivElement>(null);
    
    console.log('Menu actions:', actions);
    console.log('Menu nav:', nav);
    
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
            console.log('Sending world news query:', query);
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
            
            console.log('Detected location:', location, 'Country:', country);
            
            // Save this location for future use
            saveLocation(location, country);
            
        } catch (error) {
            console.log('Could not get location automatically, will show location form');
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
            console.log('Sending query via context:', query);
            actions.sendNewsQuery(`LOADING:${loadingMessage}:${query}`);
        }
    };
    
    return (
    <div id="rightMenu">
        <nav>
            <Link to="/" id="homeToggle" className="menu-item">
                <i className="fas fa-comments"></i>
            </Link>
            <button id="historyBackBtn" title="Previous Result" className="menu-item" onClick={nav?.goBack} disabled={!nav?.canGoBack}>
                <i className="fas fa-arrow-left"></i>
            </button>
            <button id="historyForwardBtn" title="Next Result" className="menu-item" onClick={nav?.goForward} disabled={!nav?.canGoForward}>
                <i className="fas fa-arrow-right"></i>
            </button>
            <Link to="/history" id="historyToggle" className="menu-item">
                <i className="fas fa-history"></i>
            </Link>
            
            {/* News/Events Button */}
            <div className="news-dropdown-container">
                <button 
                    id="newsBtn" 
                    className="menu-item news-button" 
                    onClick={() => setShowNewsDropdown(!showNewsDropdown)}
                    title="News & Events"
                >
                    <i className="fas fa-newspaper"></i>
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
            <Link to="/notes" id="notesToggle" className="menu-item notes-button" title="Notes">
                <i className="fas fa-sticky-note"></i>
            </Link>
            
            {/* Clear Content Button - Bottom with large gap */}
            <div className="clear-button-container">
                <button 
                    id="clearContentBtn" 
                    className="menu-item clear-button" 
                    onClick={() => actions?.clearContent?.()}
                    title="Clear content"
                >
                    <i className="fas fa-trash-alt"></i>
                </button>
            </div>
            
            {/* Help Button - Above settings button */}
            <div className="help-button-container">
                <Link to="/help" id="helpToggle" className="menu-item help-button" title="Help & Documentation">
                    <i className="fas fa-question-circle"></i>
                </Link>
            </div>
            
            {/* Settings Button - Below help button */}
            <div className="settings-button-container">
                <Link to="/settings" id="settingsToggle" className="menu-item settings-button">
                    <i className="fas fa-cog"></i>
                </Link>
            </div>
        </nav>
    </div>
    )
}