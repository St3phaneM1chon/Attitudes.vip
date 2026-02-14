/**
 * CatererDashboard - Dashboard spécialisé pour les traiteurs
 * Gestion des menus, commandes et allergies
 */

import React from 'react';
import VendorDashboardV2 from './VendorDashboardV2';

// Wrapper spécialisé pour les traiteurs
const CatererDashboard = () => {
  // Le VendorDashboardV2 détecte automatiquement le type 'vendor:caterer'
  // et adapte l'interface en conséquence
  return <VendorDashboardV2 />;
};

export default CatererDashboard;