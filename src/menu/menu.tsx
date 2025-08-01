import { Link, useNavigate } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { HistoryNavigationContext, AppActionsContext } from '../App';

export default function Menu() {
    const nav = useContext(HistoryNavigationContext);
    const actions = useContext(AppActionsContext);
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    
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
                                            setUserPhoto(userInfo.picture);
                                            setUserName(userInfo.name || userInfo.email);
                                            
                                            // Save to storage
                                            await chrome.storage.local.set({
                                                userPhoto: userInfo.picture,
                                                userName: userInfo.name || userInfo.email
                                            });
                                        }
                                    }
                                });
                            } catch (error) {
                                console.error('Error getting user info from Google:', error);
                            }
                        }
                    } else {
                        // Token expired, clear it
                        await chrome.storage.local.remove(['userAuthenticated', 'googleAuthToken', 'authTimestamp', 'userPhoto', 'userName']);
                        setIsAuthenticated(false);
                    }
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
            }
        };

        checkAuthStatus();
        
        // Listen for storage changes
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.userAuthenticated || changes.googleAuthToken) {
                checkAuthStatus();
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    const handleSignOut = async () => {
        try {
            await chrome.storage.local.remove(['userAuthenticated', 'googleAuthToken', 'authTimestamp', 'userPhoto', 'userName']);
            setIsAuthenticated(false);
            setUserPhoto(null);
            setUserName(null);
        } catch (error) {
            console.error('Error signing out:', error);
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
                <i className="fas fa-arrow-right"></i>
                <span className="tooltiptext">Next</span>
            </button>
            <button id="historyForwardBtn" className="menu-item tooltip" onClick={async () => {
              try {
                await nav?.goForward?.();
              } catch (error) {
                console.error('Error navigating forward:', error);
              }
            }} disabled={!nav?.canGoForward}>
                <i className="fas fa-arrow-left"></i>
                <span className="tooltiptext">Previous</span>
            </button>
            <Link to="/history" id="historyToggle" className="menu-item tooltip">
                <i className="fas fa-history"></i>
                <span className="tooltiptext">History</span>
            </Link>
            <Link to="/welcome" id="welcomeToggle" className="menu-item tooltip">
                <i className="fas fa-home"></i>
                <span className="tooltiptext">Welcome</span>
            </Link>
            
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
                    onClick={() => {
                        actions?.clearContent?.();
                        navigate('/welcome');
                    }}
                >
                    <i className="fas fa-trash-alt"></i>
                    <span className="tooltiptext">Clear & Welcome</span>
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