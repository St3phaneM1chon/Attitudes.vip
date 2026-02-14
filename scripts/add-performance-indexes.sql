-- 🚀 OPTIMISATION DES PERFORMANCES - AJOUT D'INDEXES
-- Date: 28 juin 2025
-- Objectif: Améliorer les performances des requêtes fréquentes

-- ===================================
-- INDEXES POUR LA TABLE USERS
-- ===================================

-- Index sur email pour recherche rapide (déjà unique mais optimisons les recherches actives)
CREATE INDEX IF NOT EXISTS idx_users_email_active 
ON users(email) 
WHERE is_active = true;

-- Index sur la date de création pour tri et filtrage
CREATE INDEX IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

-- Index composite pour recherche par type et statut
CREATE INDEX IF NOT EXISTS idx_users_type_status 
ON users(user_type, is_active);

-- ===================================
-- INDEXES POUR LA TABLE WEDDINGS
-- ===================================

-- Index sur date de mariage et statut pour planning
CREATE INDEX IF NOT EXISTS idx_weddings_date_status 
ON weddings(wedding_date, status)
WHERE status IN ('active', 'upcoming');

-- Index sur user_id pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_weddings_user_id 
ON weddings(user_id)
WHERE is_deleted = false;

-- Index sur created_at pour tri chronologique
CREATE INDEX IF NOT EXISTS idx_weddings_created_at 
ON weddings(created_at DESC);

-- ===================================
-- INDEXES POUR LA TABLE BOOKINGS
-- ===================================

-- Index composite vendor + date pour calendrier
CREATE INDEX IF NOT EXISTS idx_bookings_vendor_date 
ON bookings(vendor_id, service_date)
WHERE status != 'cancelled';

-- Index sur wedding_id pour récupération rapide
CREATE INDEX IF NOT EXISTS idx_bookings_wedding_id 
ON bookings(wedding_id);

-- Index sur statut pour tableaux de bord
CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON bookings(status)
WHERE status IN ('pending', 'confirmed');

-- Index sur dates pour filtrage temporel
CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
ON bookings(created_at DESC);

-- ===================================
-- INDEXES POUR LA TABLE PAYMENTS
-- ===================================

-- Index sur user_id et statut pour historique
CREATE INDEX IF NOT EXISTS idx_payments_user_status 
ON payments(user_id, status)
WHERE status = 'completed';

-- Index sur wedding_id pour réconciliation
CREATE INDEX IF NOT EXISTS idx_payments_wedding_id 
ON payments(wedding_id);

-- Index sur date pour rapports financiers
CREATE INDEX IF NOT EXISTS idx_payments_date 
ON payments(payment_date DESC);

-- Index sur méthode de paiement pour analytics
CREATE INDEX IF NOT EXISTS idx_payments_method 
ON payments(payment_method)
WHERE status = 'completed';

-- ===================================
-- INDEXES POUR LA TABLE INVITES
-- ===================================

-- Index sur wedding_id pour liste d'invités
CREATE INDEX IF NOT EXISTS idx_invites_wedding_id 
ON invites(wedding_id);

-- Index sur email pour recherche et unicité par mariage
CREATE INDEX IF NOT EXISTS idx_invites_email_wedding 
ON invites(email, wedding_id);

-- Index sur statut RSVP pour statistiques
CREATE INDEX IF NOT EXISTS idx_invites_rsvp_status 
ON invites(rsvp_status)
WHERE wedding_id IS NOT NULL;

-- ===================================
-- INDEXES POUR LA TABLE MESSAGES
-- ===================================

-- Index composite expéditeur/destinataire
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient 
ON messages(sender_id, recipient_id);

-- Index sur conversation pour threading
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
ON messages(conversation_id, created_at DESC);

-- Index sur statut de lecture
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages(recipient_id, is_read)
WHERE is_read = false;

-- ===================================
-- INDEXES POUR LA TABLE NOTIFICATIONS
-- ===================================

-- Index sur user_id et statut de lecture
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read)
WHERE is_read = false;

-- Index sur type pour filtrage
CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON notifications(notification_type);

-- Index sur date pour ordre chronologique
CREATE INDEX IF NOT EXISTS idx_notifications_created 
ON notifications(created_at DESC);

-- ===================================
-- INDEXES POUR LA TABLE SESSIONS
-- ===================================

-- Index sur user_id pour sessions actives
CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
ON sessions(user_id)
WHERE is_active = true;

-- Index sur token hash pour validation rapide
CREATE INDEX IF NOT EXISTS idx_sessions_token 
ON sessions(token_hash);

-- Index sur expiration pour nettoyage
CREATE INDEX IF NOT EXISTS idx_sessions_expires 
ON sessions(expires_at)
WHERE is_active = true;

-- ===================================
-- INDEXES POUR LA TABLE AUDIT_LOGS
-- ===================================

-- Index sur user_id pour historique
CREATE INDEX IF NOT EXISTS idx_audit_user 
ON audit_logs(user_id);

-- Index sur action et entité pour filtrage
CREATE INDEX IF NOT EXISTS idx_audit_action_entity 
ON audit_logs(action, entity_type);

-- Index sur timestamp pour recherche temporelle
CREATE INDEX IF NOT EXISTS idx_audit_timestamp 
ON audit_logs(created_at DESC);

-- ===================================
-- INDEXES POUR LA TABLE VENDORS
-- ===================================

-- Index sur catégorie et localisation
CREATE INDEX IF NOT EXISTS idx_vendors_category_location 
ON vendors(category, city)
WHERE is_active = true;

-- Index sur rating pour tri
CREATE INDEX IF NOT EXISTS idx_vendors_rating 
ON vendors(average_rating DESC)
WHERE is_active = true;

-- Index géospatial pour recherche par proximité
CREATE INDEX IF NOT EXISTS idx_vendors_location 
ON vendors USING GIST (location)
WHERE location IS NOT NULL;

-- ===================================
-- STATISTIQUES ET MAINTENANCE
-- ===================================

-- Mettre à jour les statistiques pour optimiser le query planner
ANALYZE users;
ANALYZE weddings;
ANALYZE bookings;
ANALYZE payments;
ANALYZE invites;
ANALYZE messages;
ANALYZE notifications;
ANALYZE sessions;
ANALYZE audit_logs;
ANALYZE vendors;

-- ===================================
-- VÉRIFICATION DES INDEXES
-- ===================================

-- Query pour vérifier tous les indexes créés
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Query pour vérifier l'utilisation des indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- ===================================
-- NOTES D'OPTIMISATION
-- ===================================

-- 1. Ces indexes sont basés sur les patterns de requêtes identifiés
-- 2. Surveillez pg_stat_user_indexes pour identifier les indexes non utilisés
-- 3. Considérez des indexes partiels pour économiser l'espace
-- 4. Revoyez régulièrement avec EXPLAIN ANALYZE
-- 5. N'oubliez pas de faire VACUUM et REINDEX périodiquement

-- Fin du script d'optimisation