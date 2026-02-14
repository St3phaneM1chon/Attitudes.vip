/**
 * Templates de Tâches pour Mariages
 *
 * Définit tous les templates de tâches utilisables dans les workflows
 */

module.exports = {
  // Planning & Organisation
  budget_planning: {
    title: 'Planifier le budget du mariage',
    description: 'Définir le budget total et l\'allocation par catégorie',
    type: 'planning',
    priority: 'critical',
    estimatedDuration: 120, // minutes
    automation: {
      enabled: true,
      executor: 'interactive',
      params: {
        questions: [
          'Budget total disponible?',
          'Priorités (lieu, traiteur, photo...)?',
          'Nombre d\'invités estimé?'
        ],
        calculations: ['cost_per_guest', 'category_percentages']
      }
    }
  },

  date_selection: {
    title: 'Sélectionner la date du mariage',
    description: 'Choisir la date optimale en fonction des contraintes',
    type: 'planning',
    priority: 'critical',
    automation: {
      enabled: true,
      executor: 'calendar_check',
      params: {
        checkAvailability: ['venue', 'key_guests', 'vendors'],
        avoidDates: ['holidays', 'long_weekends'],
        seasonPreference: true
      }
    }
  },

  guest_list_draft: {
    title: 'Créer la liste d\'invités préliminaire',
    description: 'Établir la première version de la liste des invités',
    type: 'guest_management',
    priority: 'high',
    automation: {
      enabled: true,
      executor: 'database',
      params: {
        importFrom: ['contacts', 'previous_events'],
        categories: ['family', 'friends', 'colleagues', 'plus_ones']
      }
    }
  },

  // Réservations Fournisseurs
  venue_booking: {
    title: 'Réserver le lieu de réception',
    description: 'Finaliser la réservation du lieu',
    type: 'vendor',
    priority: 'critical',
    category: 'venue',
    automation: {
      enabled: true,
      executor: 'vendor_booking',
      params: {
        requiresContract: true,
        requiresDeposit: true,
        depositPercentage: 30,
        cancellationPolicy: true
      }
    },
    reminders: [
      { before: '7d', message: 'Préparer les questions pour la visite' },
      { before: '1d', message: 'Confirmer le rendez-vous' }
    ]
  },

  catering_booking: {
    title: 'Réserver le traiteur',
    description: 'Sélectionner et réserver le service traiteur',
    type: 'vendor',
    priority: 'critical',
    category: 'catering',
    automation: {
      enabled: true,
      executor: 'vendor_booking',
      params: {
        requiresTasting: true,
        menuOptions: ['cocktail', 'dinner', 'dessert'],
        dietaryRequirements: true
      }
    }
  },

  photographer_booking: {
    title: 'Réserver le photographe',
    description: 'Choisir et réserver le photographe/vidéaste',
    type: 'vendor',
    priority: 'high',
    category: 'photography',
    automation: {
      enabled: true,
      executor: 'vendor_booking',
      params: {
        portfolioReview: true,
        packageOptions: ['ceremony', 'reception', 'full_day'],
        deliverables: ['digital', 'prints', 'album']
      }
    }
  },

  // Communications Invités
  save_the_date: {
    title: 'Envoyer les Save the Date',
    description: 'Envoyer les save the date à tous les invités',
    type: 'communication',
    priority: 'medium',
    category: 'guest',
    automation: {
      enabled: true,
      executor: 'email_campaign',
      params: {
        template: 'save_the_date',
        personalization: true,
        trackOpens: true,
        includeCalendarInvite: true
      }
    }
  },

  invitations_send: {
    title: 'Envoyer les invitations officielles',
    description: 'Envoi des invitations formelles avec RSVP',
    type: 'communication',
    priority: 'critical',
    category: 'guest',
    automation: {
      enabled: true,
      executor: 'invitation_system',
      params: {
        method: ['email', 'physical'],
        includeRSVP: true,
        rsvpDeadline: '30d',
        includeDetails: ['venue', 'dress_code', 'accommodation']
      }
    }
  },

  rsvp_reminder_1: {
    title: 'Premier rappel RSVP',
    description: 'Rappeler aux invités de confirmer leur présence',
    type: 'communication',
    priority: 'high',
    category: 'guest',
    automation: {
      enabled: true,
      executor: 'email_campaign',
      params: {
        template: 'rsvp_reminder_friendly',
        targetGroup: 'no_response',
        personalization: true
      }
    }
  },

  // Coordination Fournisseurs
  vendor_confirmation_all: {
    title: 'Confirmer tous les fournisseurs',
    description: 'Confirmation finale avec tous les prestataires',
    type: 'coordination',
    priority: 'critical',
    category: 'vendor',
    automation: {
      enabled: true,
      executor: 'vendor_communication',
      params: {
        confirmItems: ['date', 'time', 'location', 'services', 'payment'],
        requiresResponse: true,
        escalateIfNoResponse: '48h'
      }
    }
  },

  vendor_final_brief: {
    title: 'Brief final fournisseurs',
    description: 'Briefing détaillé pour le jour J',
    type: 'coordination',
    priority: 'critical',
    category: 'vendor',
    automation: {
      enabled: true,
      executor: 'meeting_coordinator',
      params: {
        meetingType: 'conference_call',
        duration: 60,
        agenda: ['timeline', 'logistics', 'contacts', 'contingency'],
        sendRecap: true
      }
    }
  },

  // Paiements
  deposit_reminder: {
    title: 'Rappel paiement acompte',
    description: 'Rappeler le paiement des acomptes dus',
    type: 'payment',
    priority: 'high',
    category: 'financial',
    automation: {
      enabled: true,
      executor: 'payment_reminder',
      params: {
        checkPaymentStatus: true,
        sendIfUnpaid: true,
        escalation: ['email', 'sms', 'call'],
        includePaymentLink: true
      }
    }
  },

  final_payments_prep: {
    title: 'Préparer les paiements finaux',
    description: 'Organiser tous les paiements pour le jour J',
    type: 'payment',
    priority: 'critical',
    category: 'financial',
    automation: {
      enabled: true,
      executor: 'payment_preparation',
      params: {
        generateSummary: true,
        prepareEnvelopes: true,
        confirmAmounts: true,
        backupPaymentMethod: true
      }
    }
  },

  // Jour J
  morning_checklist: {
    title: 'Check-list du matin',
    description: 'Vérifier que tout est prêt pour la journée',
    type: 'checklist',
    priority: 'critical',
    category: 'wedding_day',
    automation: {
      enabled: true,
      executor: 'checklist_verifier',
      params: {
        items: [
          'Météo vérifiée',
          'Équipe confirmée',
          'Matériel préparé',
          'Transport confirmé',
          'Plan B activé si nécessaire'
        ],
        requiresAllChecked: true,
        alertIfIncomplete: true
      }
    }
  },

  ceremony_coordination: {
    title: 'Coordonner la cérémonie',
    description: 'Orchestrer le déroulement de la cérémonie',
    type: 'coordination',
    priority: 'critical',
    category: 'wedding_day',
    automation: {
      enabled: true,
      executor: 'timeline_manager',
      params: {
        checkpoints: [
          'Guests seated',
          'Wedding party ready',
          'Music cued',
          'Officiant in place'
        ],
        communicateWith: ['venue', 'music', 'photo'],
        adjustForDelays: true
      }
    }
  },

  // Post-Mariage
  guest_thank_you: {
    title: 'Envoyer les remerciements',
    description: 'Remercier tous les invités pour leur présence',
    type: 'communication',
    priority: 'high',
    category: 'post_wedding',
    automation: {
      enabled: true,
      executor: 'thank_you_campaign',
      params: {
        personalization: 'high',
        includePhoto: true,
        mentionGift: true,
        sharePhotoLink: true
      }
    }
  },

  vendor_reviews: {
    title: 'Évaluer les fournisseurs',
    description: 'Laisser des avis pour tous les prestataires',
    type: 'feedback',
    priority: 'low',
    category: 'post_wedding',
    automation: {
      enabled: true,
      executor: 'review_collector',
      params: {
        platforms: ['google', 'wedding_sites', 'social_media'],
        ratingCriteria: ['quality', 'professionalism', 'value'],
        shareTestimonials: true
      }
    }
  },

  // Urgences
  crisis_assessment: {
    title: 'Évaluer la situation d\'urgence',
    description: 'Analyser rapidement la gravité et l\'impact',
    type: 'emergency',
    priority: 'critical',
    category: 'crisis',
    automation: {
      enabled: true,
      executor: 'crisis_analyzer',
      params: {
        assessFactors: ['severity', 'timing', 'impact', 'alternatives'],
        notifyTeam: true,
        activateEmergencyProtocol: true
      }
    }
  },

  backup_plan_activation: {
    title: 'Activer le plan B',
    description: 'Mettre en œuvre les solutions de secours',
    type: 'emergency',
    priority: 'critical',
    category: 'crisis',
    automation: {
      enabled: true,
      executor: 'backup_activator',
      params: {
        checkAvailableOptions: true,
        coordinateResources: true,
        communicateChanges: true,
        updateAllSystems: true
      }
    }
  },

  // Templates utilitaires
  status_update: {
    title: 'Mise à jour de statut',
    description: 'Informer toutes les parties prenantes',
    type: 'communication',
    priority: 'variable',
    automation: {
      enabled: true,
      executor: 'broadcast_update',
      params: {
        channels: ['email', 'sms', 'app_notification'],
        frequency: 'as_needed',
        includeNextSteps: true
      }
    }
  },

  automated_report: {
    title: 'Rapport automatisé',
    description: 'Générer et envoyer des rapports périodiques',
    type: 'reporting',
    priority: 'medium',
    automation: {
      enabled: true,
      executor: 'report_generator',
      params: {
        metrics: ['budget', 'tasks', 'rsvp', 'timeline'],
        format: ['pdf', 'email_summary'],
        recipients: ['couple', 'planner'],
        frequency: 'weekly'
      }
    }
  }
}
