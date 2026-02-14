/**
 * VenueDashboard - Dashboard spécialisé pour les lieux de réception
 * Gestion des disponibilités, réservations et services
 */

import React from 'react';
import VendorDashboardV2 from './VendorDashboardV2';

// Wrapper spécialisé pour les lieux de réception
const VenueDashboard = () => {
  // Le VendorDashboardV2 détecte automatiquement le type 'vendor:venue'
  // et adapte l'interface en conséquence
  return <VendorDashboardV2 />;
};

export default VenueDashboard;