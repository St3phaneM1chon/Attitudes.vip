import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../../hooks/useAuth';

const OAuthCallback = () => {
  const { t } = useTranslation();
  const { provider } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      // Get tokens from URL params
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refreshToken');
      const error = searchParams.get('error');

      if (error) {
        setError(t(`auth.errors.oauth.${error}`) || error);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!token) {
        setError(t('auth.errors.oauth.noToken'));
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Store tokens
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      // Check auth to get user data and redirect
      await checkAuth();
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      setError(t('auth.errors.oauth.failed'));
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {t('auth.oauth.error')}
            </h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              {t('auth.oauth.redirecting')}
            </p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {t('auth.oauth.processing')}
            </h1>
            <p className="text-gray-600">
              {t('auth.oauth.provider', { provider: provider })}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;