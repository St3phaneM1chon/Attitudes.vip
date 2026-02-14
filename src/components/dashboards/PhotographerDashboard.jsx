/**
 * PhotographerDashboard - Dashboard spécialisé pour les photographes
 * Gestion des shootings, galeries et livraisons
 */

import React from 'react';
import VendorDashboardV2 from './VendorDashboardV2';

// Wrapper spécialisé pour les photographes
const PhotographerDashboard = () => {
  // Le VendorDashboardV2 détecte automatiquement le type 'vendor:photographer'
  // et adapte l'interface en conséquence
  return <VendorDashboardV2 />;
};

export default PhotographerDashboard;