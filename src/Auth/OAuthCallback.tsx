// components/OAuthCallback.tsx
import { useEffect } from 'react';

export default function OAuthCallback() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('oauth_state');

    if (error) {
      window.opener?.postMessage({
        type: 'OAUTH2_ERROR',
        error: error
      }, window.location.origin);
    } else if (code && state === storedState) {
      window.opener?.postMessage({
        type: 'OAUTH2_CODE',
        code: code
      }, window.location.origin);
    } else {
      window.opener?.postMessage({
        type: 'OAUTH2_ERROR',
        error: 'Invalid state or missing code'
      }, window.location.origin);
    }

    // Close the popup
    setTimeout(() => {
      window.close();
    }, 1000);

  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div>
        <h2>Completing login...</h2>
        <p>This window will close automatically.</p>
      </div>
    </div>
  );
}
