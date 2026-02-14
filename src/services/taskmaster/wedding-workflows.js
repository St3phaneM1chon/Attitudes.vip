/**
 * Workflows Prédéfinis pour Mariages
 *
 * Collection de workflows automatisés spécifiques à la gestion de mariages
 */

module.exports = {
  /**
   * Workflow de Planification Complète
   */
  completePlanning: {
    name: 'Planification Complète du Mariage',
    description: 'Workflow complet de A à Z pour organiser un mariage',
    steps: [
      // Phase 1: Initialisation (12-18 mois avant)
      {
        name: 'Définir le budget',
        taskTemplate: 'budget_planning',
        category: 'planning',
        priority: 'high'
      },
      {
        name: 'Choisir la date',
        taskTemplate: 'date_selection',
        category: 'planning',
        priority: 'high',
        parallel: true
      },
      {
        name: 'Créer la liste d\'invités préliminaire',
        taskTemplate: 'guest_list_draft',
        category: 'guest',
        priority: 'high',
        parallel: true
      },

      // Phase 2: Réservations principales (10-12 mois avant)
      {
        name: 'Réserver le lieu de réception',
        taskTemplate: 'venue_booking',
        category: 'vendor',
        priority: 'critical',
        conditions: ['budget.defined', 'date.selected']
      },
      {
        name: 'Choisir et réserver le traiteur',
        taskTemplate: 'catering_booking',
        category: 'vendor',
        priority: 'critical',
        conditions: ['venue.booked']
      },
      {
        name: 'Réserver le photographe',
        taskTemplate: 'photographer_booking',
        category: 'vendor',
        priority: 'high',
        parallel: true
      },
      {
        name: 'Réserver le DJ/Musiciens',
        taskTemplate: 'music_booking',
        category: 'vendor',
        priority: 'high',
        parallel: true
      },

      // Phase 3: Détails (6-8 mois avant)
      {
        name: 'Envoyer les save-the-date',
        taskTemplate: 'save_the_date',
        category: 'guest',
        priority: 'medium',
        conditions: ['venue.booked', 'guest_list.draft']
      },
      {
        name: 'Commander la robe/costume',
        taskTemplate: 'attire_order',
        category: 'planning',
        priority: 'high'
      },
      {
        name: 'Choisir le fleuriste',
        taskTemplate: 'florist_selection',
        category: 'vendor',
        priority: 'medium',
        parallel: true
      },
      {
        name: 'Réserver le transport',
        taskTemplate: 'transport_booking',
        category: 'vendor',
        priority: 'medium',
        parallel: true
      },

      // Phase 4: Finalisation (2-4 mois avant)
      {
        name: 'Envoyer les invitations officielles',
        taskTemplate: 'invitations_send',
        category: 'guest',
        priority: 'high',
        conditions: ['save_the_date.sent']
      },
      {
        name: 'Finaliser le menu',
        taskTemplate: 'menu_finalization',
        category: 'vendor',
        priority: 'high',
        conditions: ['catering.booked']
      },
      {
        name: 'Organiser l\'essayage final',
        taskTemplate: 'final_fitting',
        category: 'planning',
        priority: 'medium'
      },

      // Phase 5: Derniers préparatifs (1 mois avant)
      {
        name: 'Collecter les RSVP',
        taskTemplate: 'rsvp_collection',
        category: 'guest',
        priority: 'critical',
        conditions: ['invitations.sent', 'daysUntilWedding <= 30']
      },
      {
        name: 'Finaliser le plan de table',
        taskTemplate: 'seating_chart',
        category: 'planning',
        priority: 'high',
        conditions: ['rsvp.collected']
      },
      {
        name: 'Confirmer tous les fournisseurs',
        taskTemplate: 'vendor_confirmation_all',
        category: 'vendor',
        priority: 'critical'
      },

      // Phase 6: Semaine du mariage
      {
        name: 'Brief final avec les fournisseurs',
        taskTemplate: 'vendor_final_brief',
        category: 'vendor',
        priority: 'critical',
        conditions: ['daysUntilWedding <= 7']
      },
      {
        name: 'Préparer les paiements finaux',
        taskTemplate: 'final_payments_prep',
        category: 'planning',
        priority: 'high'
      },
      {
        name: 'Répétition de la cérémonie',
        taskTemplate: 'ceremony_rehearsal',
        category: 'ceremony',
        priority: 'high',
        conditions: ['daysUntilWedding <= 2']
      }
    ]
  },

  /**
   * Workflow de Gestion des Invités
   */
  guestManagement: {
    name: 'Gestion Complète des Invités',
    description: 'Automatise tout le processus de gestion des invités',
    steps: [
      {
        name: 'Créer la base de données des invités',
        taskTemplate: 'guest_database_setup',
        priority: 'high'
      },
      {
        name: 'Importer les contacts',
        taskTemplate: 'contact_import',
        priority: 'medium',
        parallel: true
      },
      {
        name: 'Segmenter les invités',
        taskTemplate: 'guest_segmentation',
        priority: 'medium',
        conditions: ['contacts.imported']
      },
      {
        name: 'Envoyer save-the-date',
        taskTemplate: 'save_the_date_batch',
        priority: 'high',
        conditions: ['guests.segmented']
      },
      {
        name: 'Gérer les plus-ones',
        taskTemplate: 'plus_one_management',
        priority: 'medium'
      },
      {
        name: 'Envoyer invitations',
        taskTemplate: 'invitation_batch_send',
        priority: 'critical',
        conditions: ['save_the_date.sent', 'monthsUntilWedding <= 3']
      },
      {
        name: 'Rappel RSVP #1',
        taskTemplate: 'rsvp_reminder_1',
        priority: 'high',
        conditions: ['invitations.sent', 'rsvpRate < 0.5', 'weeksAfterInvitation >= 3']
      },
      {
        name: 'Rappel RSVP #2',
        taskTemplate: 'rsvp_reminder_2',
        priority: 'critical',
        conditions: ['reminder1.sent', 'rsvpRate < 0.8', 'weeksUntilWedding <= 4']
      },
      {
        name: 'Gérer les régimes alimentaires',
        taskTemplate: 'dietary_requirements',
        priority: 'high',
        conditions: ['rsvp.received']
      },
      {
        name: 'Finaliser la liste',
        taskTemplate: 'guest_list_finalization',
        priority: 'critical',
        conditions: ['weeksUntilWedding <= 2']
      }
    ]
  },

  /**
   * Workflow de Coordination des Fournisseurs
   */
  vendorCoordination: {
    name: 'Coordination des Fournisseurs',
    description: 'Assure la communication et coordination avec tous les fournisseurs',
    steps: [
      {
        name: 'Collecte des contrats',
        taskTemplate: 'contract_collection',
        priority: 'high'
      },
      {
        name: 'Création du planning fournisseurs',
        taskTemplate: 'vendor_schedule_creation',
        priority: 'high'
      },
      {
        name: 'Rappel paiement acompte',
        taskTemplate: 'deposit_reminder',
        priority: 'high',
        conditions: ['deposit.unpaid', 'daysSinceContract >= 7']
      },
      {
        name: 'Point d\'étape 3 mois',
        taskTemplate: 'vendor_checkpoint_3m',
        priority: 'medium',
        conditions: ['monthsUntilWedding == 3']
      },
      {
        name: 'Point d\'étape 1 mois',
        taskTemplate: 'vendor_checkpoint_1m',
        priority: 'high',
        conditions: ['monthsUntilWedding == 1']
      },
      {
        name: 'Confirmation finale',
        taskTemplate: 'vendor_final_confirmation',
        priority: 'critical',
        conditions: ['weeksUntilWedding == 2']
      },
      {
        name: 'Envoi planning jour J',
        taskTemplate: 'day_schedule_send',
        priority: 'critical',
        conditions: ['weeksUntilWedding == 1']
      },
      {
        name: 'Brief téléphonique final',
        taskTemplate: 'final_call_brief',
        priority: 'critical',
        conditions: ['daysUntilWedding == 2']
      },
      {
        name: 'Préparation des paiements',
        taskTemplate: 'payment_preparation',
        priority: 'high',
        conditions: ['daysUntilWedding == 1']
      }
    ]
  },

  /**
   * Workflow de Gestion du Budget
   */
  budgetManagement: {
    name: 'Gestion et Suivi du Budget',
    description: 'Surveille et optimise le budget du mariage',
    steps: [
      {
        name: 'Définition du budget initial',
        taskTemplate: 'budget_initial_setup',
        priority: 'critical'
      },
      {
        name: 'Allocation par catégorie',
        taskTemplate: 'budget_allocation',
        priority: 'high',
        conditions: ['budget.defined']
      },
      {
        name: 'Suivi des dépenses',
        taskTemplate: 'expense_tracking',
        priority: 'high',
        recurrence: 'weekly'
      },
      {
        name: 'Alerte dépassement',
        taskTemplate: 'budget_alert',
        priority: 'high',
        conditions: ['expenses > budget * 0.9']
      },
      {
        name: 'Rapport mensuel',
        taskTemplate: 'budget_monthly_report',
        priority: 'medium',
        recurrence: 'monthly'
      },
      {
        name: 'Optimisation des coûts',
        taskTemplate: 'cost_optimization',
        priority: 'medium',
        conditions: ['expenses > budget * 0.8']
      },
      {
        name: 'Négociation fournisseurs',
        taskTemplate: 'vendor_negotiation',
        priority: 'high',
        conditions: ['totalQuotes > budget * 1.1']
      },
      {
        name: 'Bilan final',
        taskTemplate: 'budget_final_report',
        priority: 'low',
        conditions: ['daysAfterWedding == 7']
      }
    ]
  },

  /**
   * Workflow Jour J
   */
  weddingDay: {
    name: 'Coordination Jour J',
    description: 'Orchestre parfaitement le jour du mariage',
    steps: [
      {
        name: 'Check-list matin',
        taskTemplate: 'morning_checklist',
        priority: 'critical',
        schedule: 'weddingDay 06:00'
      },
      {
        name: 'Confirmation transport',
        taskTemplate: 'transport_confirm',
        priority: 'critical',
        schedule: 'weddingDay 07:00'
      },
      {
        name: 'Arrivée coiffeur/maquilleur',
        taskTemplate: 'beauty_team_arrival',
        priority: 'high',
        schedule: 'weddingDay 08:00'
      },
      {
        name: 'Livraison fleurs',
        taskTemplate: 'flowers_delivery',
        priority: 'high',
        schedule: 'weddingDay 09:00'
      },
      {
        name: 'Installation décoration',
        taskTemplate: 'decoration_setup',
        priority: 'high',
        schedule: 'weddingDay 10:00'
      },
      {
        name: 'Arrivée photographe',
        taskTemplate: 'photographer_arrival',
        priority: 'high',
        schedule: 'weddingDay 11:00'
      },
      {
        name: 'Vérification son/lumière',
        taskTemplate: 'av_check',
        priority: 'critical',
        schedule: 'weddingDay 14:00'
      },
      {
        name: 'Briefing équipe',
        taskTemplate: 'team_briefing',
        priority: 'high',
        schedule: 'weddingDay 15:00'
      },
      {
        name: 'Accueil invités',
        taskTemplate: 'guest_welcome',
        priority: 'critical',
        schedule: 'weddingDay 16:30'
      },
      {
        name: 'Coordination cérémonie',
        taskTemplate: 'ceremony_coordination',
        priority: 'critical',
        schedule: 'weddingDay 17:00'
      },
      {
        name: 'Transition cocktail',
        taskTemplate: 'cocktail_transition',
        priority: 'high',
        schedule: 'weddingDay 18:00'
      },
      {
        name: 'Service dîner',
        taskTemplate: 'dinner_service',
        priority: 'critical',
        schedule: 'weddingDay 20:00'
      },
      {
        name: 'Animations soirée',
        taskTemplate: 'evening_entertainment',
        priority: 'medium',
        schedule: 'weddingDay 22:00'
      }
    ]
  },

  /**
   * Workflow Post-Mariage
   */
  postWedding: {
    name: 'Suivi Post-Mariage',
    description: 'Gère toutes les tâches après le mariage',
    steps: [
      {
        name: 'Remerciements équipe',
        taskTemplate: 'team_thanks',
        priority: 'high',
        conditions: ['daysAfterWedding == 1']
      },
      {
        name: 'Collecte photos invités',
        taskTemplate: 'guest_photos_collection',
        priority: 'medium',
        conditions: ['daysAfterWedding == 2']
      },
      {
        name: 'Paiements finaux fournisseurs',
        taskTemplate: 'final_vendor_payments',
        priority: 'critical',
        conditions: ['daysAfterWedding <= 3']
      },
      {
        name: 'Envoi remerciements invités',
        taskTemplate: 'guest_thank_you',
        priority: 'high',
        conditions: ['daysAfterWedding == 7']
      },
      {
        name: 'Récupération photos pro',
        taskTemplate: 'pro_photos_collection',
        priority: 'medium',
        conditions: ['weeksAfterWedding == 4']
      },
      {
        name: 'Album photo',
        taskTemplate: 'photo_album_creation',
        priority: 'low',
        conditions: ['photos.received']
      },
      {
        name: 'Évaluation fournisseurs',
        taskTemplate: 'vendor_reviews',
        priority: 'low',
        conditions: ['weeksAfterWedding == 2']
      },
      {
        name: 'Clôture administrative',
        taskTemplate: 'admin_closure',
        priority: 'medium',
        conditions: ['monthsAfterWedding == 1']
      }
    ]
  },

  /**
   * Workflow d'Urgence
   */
  emergencyResponse: {
    name: 'Gestion de Crise',
    description: 'Réagit automatiquement aux situations d\'urgence',
    steps: [
      {
        name: 'Évaluation de la situation',
        taskTemplate: 'crisis_assessment',
        priority: 'critical',
        immediate: true
      },
      {
        name: 'Notification parties prenantes',
        taskTemplate: 'stakeholder_alert',
        priority: 'critical',
        parallel: true
      },
      {
        name: 'Activation plan B',
        taskTemplate: 'backup_plan_activation',
        priority: 'critical',
        conditions: ['severity == "high"']
      },
      {
        name: 'Communication invités',
        taskTemplate: 'guest_communication',
        priority: 'critical',
        conditions: ['impact.guests == true']
      },
      {
        name: 'Coordination fournisseurs',
        taskTemplate: 'vendor_crisis_coord',
        priority: 'critical',
        parallel: true
      },
      {
        name: 'Solutions alternatives',
        taskTemplate: 'alternative_solutions',
        priority: 'high'
      },
      {
        name: 'Mise à jour continue',
        taskTemplate: 'status_updates',
        priority: 'high',
        recurrence: 'every 30 minutes'
      },
      {
        name: 'Résolution et suivi',
        taskTemplate: 'crisis_resolution',
        priority: 'high'
      }
    ]
  }
}
