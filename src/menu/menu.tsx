import { Link } from 'react-router';
import { useContext } from 'react';
import { HistoryNavigationContext, AppActionsContext } from '../App';

export default function Menu() {
    const nav = useContext(HistoryNavigationContext);
    const actions = useContext(AppActionsContext);
    
    console.log('Menu actions:', actions);
    console.log('Menu nav:', nav);
    
    return (
    <div id="rightMenu">
        <nav>
            <Link to="/" id="homeToggle" className="menu-item">
                <i className="fas fa-comments"></i>
            </Link>
            <Link to="/settings" id="settingsToggle" className="menu-item">
                <i className="fas fa-cog"></i>
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
        </nav>
    </div>
    )
}