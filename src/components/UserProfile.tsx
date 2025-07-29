import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../css/userProfile.css';

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="user-profile">
      <div className="user-info">
        <div className="user-avatar">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || 'User'} />
          ) : (
            <div className="avatar-placeholder">
              <i className="fas fa-user"></i>
            </div>
          )}
        </div>
        <div className="user-details">
          <div className="user-name">
            {user.displayName || 'User'}
          </div>
          <div className="user-email">
            {user.email}
          </div>
        </div>
      </div>
      
      <button
        className="sign-out-btn"
        onClick={handleSignOut}
        disabled={isSigningOut}
        title="Sign out"
      >
        {isSigningOut ? (
          <>
            <div className="btn-spinner"></div>
            <span>Signing out...</span>
          </>
        ) : (
          <>
            <i className="fas fa-sign-out-alt"></i>
            <span>Sign out</span>
          </>
        )}
      </button>
    </div>
  );
};

export default UserProfile; 