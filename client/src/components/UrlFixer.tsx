import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const UrlFixer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Check if we're on a URL with query parameters that might interfere with hash router
    const currentUrl = window.location.href;
    const hasQueryParams = currentUrl.includes('?') && !currentUrl.includes('#');
    
    if (hasQueryParams && !loading) {
      console.log('UrlFixer: Detected URL with query parameters, cleaning up...');
      console.log('Current URL:', currentUrl);
      
      // Check if this is a tournament URL
      if (currentUrl.includes('/tournaments?tournament=')) {
        const urlParams = new URLSearchParams(window.location.search);
        const tournamentId = urlParams.get('tournament');
        
        if (tournamentId) {
          console.log('UrlFixer: Converting tournament URL to hash router format');
          // Convert to hash router format: /#/tournaments?tournament=19
          const newUrl = `${window.location.origin}/#/tournaments?tournament=${tournamentId}`;
          console.log('UrlFixer: New URL:', newUrl);
          window.location.href = newUrl;
          return;
        }
      }
      
      // Extract the hash part if it exists
      const hashIndex = currentUrl.indexOf('#');
      const hashPart = hashIndex !== -1 ? currentUrl.substring(hashIndex) : '';
      
      // Create clean URL without query parameters
      const baseUrl = currentUrl.split('?')[0];
      const cleanUrl = baseUrl + hashPart;
      
      console.log('Clean URL:', cleanUrl);
      
      // Navigate to the clean URL
      if (cleanUrl !== currentUrl) {
        window.location.href = cleanUrl;
      }
    }
  }, [loading, user]);

  return null; // This component doesn't render anything
};

export default UrlFixer; 