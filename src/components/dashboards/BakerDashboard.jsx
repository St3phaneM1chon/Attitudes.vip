/**
 * BakerDashboard - Dashboard spécialisé pour les pâtissiers
 * Gestion des commandes de gâteaux et créations personnalisées
 */

import React from 'react';
import VendorDashboardV2 from './VendorDashboardV2';

// Wrapper spécialisé pour les pâtissiers
const BakerDashboard = () => {
  // Le VendorDashboardV2 détecte automatiquement le type 'vendor:baker'
  // et adapte l'interface en conséquence
  return <VendorDashboardV2 />;
};

export default BakerDashboard;