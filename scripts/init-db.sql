-- Script d'initialisation de la base de données Attitudes.vip
-- Exécuté automatiquement lors du premier démarrage du conteneur PostgreSQL

-- Création de la base de données (déjà créée par les variables d'environnement)
-- CREATE DATABASE attitudes_vip;

-- Connexion à la base de données
\c attitudes_vip;

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour les fonctions JSON avancées
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    tenant_id UUID,
    locale VARCHAR(10) DEFAULT 'fr',
    timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des profils OAuth
CREATE TABLE IF NOT EXISTS oauth_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'facebook', 'apple', 'twitter'
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    profile_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

-- Table des mariages
CREATE TABLE IF NOT EXISTS weddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    partner_name VARCHAR(100),
    wedding_date DATE NOT NULL,
    venue_name VARCHAR(255),
    venue_address TEXT,
    guest_count INTEGER DEFAULT 0,
    budget DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'in_progress', 'completed', 'cancelled'
    theme VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des invités
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    email VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    rsvp_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'declined'
    dietary_restrictions TEXT,
    plus_one BOOLEAN DEFAULT false,
    plus_one_name VARCHAR(100),
    table_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des fournisseurs
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    vendor_type VARCHAR(50) NOT NULL, -- 'photographer', 'dj', 'caterer', 'florist', 'planner'
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    services JSONB,
    pricing DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'contacted', -- 'contacted', 'quoted', 'booked', 'completed'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des tâches
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    category VARCHAR(50), -- 'planning', 'vendor', 'guest', 'ceremony', 'reception'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des événements
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL, -- 'ceremony', 'reception', 'rehearsal', 'other'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'general', -- 'general', 'urgent', 'notification'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider_user ON oauth_profiles(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_weddings_customer ON weddings(customer_id);
CREATE INDEX IF NOT EXISTS idx_weddings_date ON weddings(wedding_date);
CREATE INDEX IF NOT EXISTS idx_guests_wedding ON guests(wedding_id);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp ON guests(rsvp_status);
CREATE INDEX IF NOT EXISTS idx_vendors_wedding ON vendors(wedding_id);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(vendor_type);
CREATE INDEX IF NOT EXISTS idx_tasks_wedding ON tasks(wedding_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_events_wedding ON events(wedding_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_messages_wedding ON messages(wedding_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Triggers pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Application des triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_oauth_profiles_updated_at BEFORE UPDATE ON oauth_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weddings_updated_at BEFORE UPDATE ON weddings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertion de données de test (optionnel)
INSERT INTO users (email, first_name, last_name, role, locale) VALUES
('admin@attitudes.vip', 'Admin', 'System', 'admin', 'fr'),
('demo@attitudes.vip', 'Marie', 'Dupont', 'customer', 'fr')
ON CONFLICT (email) DO NOTHING;

-- Table des réservations/bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
    booking_amount DECIMAL(10,2),
    deposit_amount DECIMAL(10,2),
    deposit_paid BOOLEAN DEFAULT false,
    full_payment_amount DECIMAL(10,2),
    full_payment_paid BOOLEAN DEFAULT false,
    contract_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    payer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_type VARCHAR(50) NOT NULL, -- 'deposit', 'balance', 'full', 'refund'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'succeeded', 'failed', 'cancelled'
    payment_method VARCHAR(50), -- 'card', 'bank_transfer', 'cash'
    description TEXT,
    metadata JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des contrats
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contract_type VARCHAR(50) NOT NULL, -- 'service', 'rental', 'catering', 'photography'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    terms_and_conditions TEXT,
    total_amount DECIMAL(10,2),
    deposit_percentage INTEGER DEFAULT 30,
    cancellation_policy TEXT,
    contract_pdf_url TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'signed', 'completed', 'cancelled'
    customer_signed_at TIMESTAMP WITH TIME ZONE,
    vendor_signed_at TIMESTAMP WITH TIME ZONE,
    customer_signature TEXT,
    vendor_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des packages/services
CREATE TABLE IF NOT EXISTS vendor_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_hours INTEGER,
    included_services JSONB,
    additional_options JSONB,
    max_guests INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des disponibilités vendors
CREATE TABLE IF NOT EXISTS vendor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT true,
    reason TEXT, -- 'booked', 'personal', 'maintenance'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des reviews/avis
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    photos JSONB,
    is_verified BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    response_text TEXT,
    response_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'booking', 'payment', 'reminder', 'message'
    title VARCHAR(255) NOT NULL,
    content TEXT,
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    channel VARCHAR(20) DEFAULT 'in_app', -- 'in_app', 'email', 'sms', 'push'
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les nouvelles tables
CREATE INDEX IF NOT EXISTS idx_bookings_wedding ON bookings(wedding_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor ON bookings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(service_date);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_contracts_booking ON contracts(booking_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_packages_vendor ON vendor_packages(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_availability_vendor ON vendor_availability(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_availability_date ON vendor_availability(date);
CREATE INDEX IF NOT EXISTS idx_reviews_vendor ON reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Triggers pour les nouvelles tables
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_packages_updated_at BEFORE UPDATE ON vendor_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table de blacklist des tokens
CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Affichage des informations de création
SELECT 'Base de données Attitudes.vip initialisée avec succès!' as message;

-- Attitudes.vip - Schéma de base initial Supabase (V1)
-- Multi-tenant, utilisateurs, rôles, permissions, événements, i18n, médias, messages

-- 1. Tenants (clients marque blanche)
CREATE TABLE IF NOT EXISTS tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    branding JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Users - SKIP car déjà créé
-- CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password TEXT, -- hashé
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- 4. Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- 5. User <-> Role (N:N)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 6. Role <-> Permission (N:N)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 7. Events (mariages) - SKIP car déjà créé
-- CREATE TABLE events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date DATE,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Event <-> User (participants, prestataires, invités)
CREATE TABLE IF NOT EXISTS event_users (
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id),
    status TEXT, -- ex: invité, confirmé, refusé
    PRIMARY KEY (event_id, user_id)
);

-- 9. i18n (chaînes traduites)
CREATE TABLE IF NOT EXISTS i18n_strings (
    id SERIAL PRIMARY KEY,
    tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
    lang TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL
);

-- 10. Médias (photos, vidéos, etc.)
CREATE TABLE IF NOT EXISTS media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id),
    type TEXT, -- photo, video
    url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. Messages (chat, notifications) - SKIP car déjà créé
-- CREATE TABLE messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id),
    content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================
-- Données de test (DEMO)
-- =============================

-- 1. Tenant de démo
INSERT INTO tenants (id, name, branding) VALUES
  ('00000000-0000-0000-0000-000000000001', 'DemoTenant', '{"color":"#FF0080","logo":"demo.png"}');

-- 2. Rôles principaux
INSERT INTO roles (name, description) VALUES
  ('cio', 'Super administrateur système'),
  ('admin', 'Administrateur plateforme'),
  ('client', 'Client marque blanche'),
  ('customer', 'Couple marié'),
  ('invite', 'Invité'),
  ('dj', 'DJ'),
  ('photographe', 'Photographe'),
  ('traiteur', 'Traiteur'),
  ('wedding_planner', 'Wedding Planner'),
  ('patissier', 'Pâtissier'),
  ('location', 'Gestionnaire de salle');

-- 3. Permissions de base (exemples)
INSERT INTO permissions (name, description) VALUES
  ('backend', 'Accès backend'),
  ('frontend', 'Accès frontend'),
  ('support', 'Support technique'),
  ('white_label', 'Personnalisation marque blanche'),
  ('customer_management', 'Gestion des couples'),
  ('wedding_planning', 'Gestion du mariage'),
  ('guest_management', 'Gestion des invités'),
  ('vendor_communication', 'Communication prestataires'),
  ('profile_edit', 'Édition profil'),
  ('rsvp', 'Confirmation présence'),
  ('games', 'Accès jeux'),
  ('photo_upload', 'Upload photos'),
  ('music_management', 'Gestion musique'),
  ('micro_requests', 'Demandes micro'),
  ('games_results', 'Résultats jeux'),
  ('album_creation', 'Création albums'),
  ('menu_management', 'Gestion menus'),
  ('allergy_tracking', 'Suivi allergies'),
  ('project_overview', 'Vue projet'),
  ('communication_hub', 'Hub communication'),
  ('order_management', 'Gestion commandes'),
  ('equipment_management', 'Gestion équipements');

-- 4. Liaisons rôle-permission (exemple CIO = toutes permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'cio';

-- 5. Utilisateurs de test
INSERT INTO users (id, tenant_id, email, password, name, is_active) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'cio@demo.com', 'hashedpass', 'CIO Démo', TRUE),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'admin@demo.com', 'hashedpass', 'Admin Démo', TRUE),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'client@demo.com', 'hashedpass', 'Client Démo', TRUE),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'customer@demo.com', 'hashedpass', 'Customer Démo', TRUE),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 'invite@demo.com', 'hashedpass', 'Invité Démo', TRUE);

-- 6. Attribution des rôles aux utilisateurs
INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000101', id FROM roles WHERE name = 'cio';
INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000102', id FROM roles WHERE name = 'admin';
INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000103', id FROM roles WHERE name = 'client';
INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000104', id FROM roles WHERE name = 'customer';
INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000105', id FROM roles WHERE name = 'invite';

-- 7. Événement de test
INSERT INTO events (id, tenant_id, name, date, location) VALUES
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000001', 'Mariage Démo', '2024-09-21', 'Paris');

-- 8. Participants à l'événement
INSERT INTO event_users (event_id, user_id, role_id, status)
SELECT '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000101', r.id, 'confirmé' FROM roles r WHERE r.name = 'cio';
INSERT INTO event_users (event_id, user_id, role_id, status)
SELECT '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000102', r.id, 'confirmé' FROM roles r WHERE r.name = 'admin';
INSERT INTO event_users (event_id, user_id, role_id, status)
SELECT '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000103', r.id, 'confirmé' FROM roles r WHERE r.name = 'client';
INSERT INTO event_users (event_id, user_id, role_id, status)
SELECT '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000104', r.id, 'confirmé' FROM roles r WHERE r.name = 'customer';
INSERT INTO event_users (event_id, user_id, role_id, status)
SELECT '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000105', r.id, 'invité' FROM roles r WHERE r.name = 'invite';

-- =============================
-- Row Level Security (RLS) & Policies de base
-- =============================

-- 1. Activer RLS sur les tables sensibles
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 2. Policies multi-tenant de base

-- a) Tenants : accès lecture uniquement pour les users du tenant
CREATE POLICY "Tenant: read own tenant" ON tenants
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users u WHERE u.tenant_id = tenants.id AND u.id = auth.uid()
  ));

-- b) Users : lecture limitée au tenant, écriture à soi-même
CREATE POLICY "User: read same tenant" ON users
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "User: update self" ON users
  FOR UPDATE USING (id = auth.uid());

-- c) Events : accès limité au tenant
CREATE POLICY "Event: read same tenant" ON events
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Event: insert same tenant" ON events
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- d) Event_users : accès limité aux events du tenant
CREATE POLICY "EventUser: read same tenant" ON event_users
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  );

-- e) Media : accès limité aux events du tenant
CREATE POLICY "Media: read same tenant" ON media
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  );

-- f) Messages : accès limité aux events du tenant
CREATE POLICY "Message: read same tenant" ON messages
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  );

-- =============================
-- Sécurisation avancée RLS (multi-tenant, self-update)
-- =============================

-- 1. Supprimer la policy permissive (si existante)
DROP POLICY IF EXISTS "User: read all" ON users;

-- 2. Lecture : autoriser uniquement la lecture des users du même tenant (authentifié)
CREATE POLICY "User: read same tenant" ON users
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM users WHERE id::text = current_setting('request.jwt.claim.sub', true)
    )
  );

-- 3. Update : autoriser uniquement la modification de son propre profil
DROP POLICY IF EXISTS "User: update self" ON users;
CREATE POLICY "User: update self" ON users
  FOR UPDATE USING (id::text = current_setting('request.jwt.claim.sub', true));

-- 4. Exemples pour events et event_users
-- Lecture events : uniquement events du tenant
CREATE POLICY IF NOT EXISTS "Event: read same tenant" ON events
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM users WHERE id::text = current_setting('request.jwt.claim.sub', true)
    )
  );

-- Lecture event_users : uniquement events du tenant
CREATE POLICY IF NOT EXISTS "EventUser: read same tenant" ON event_users
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events WHERE tenant_id = (
        SELECT tenant_id FROM users WHERE id::text = current_setting('request.jwt.claim.sub', true)
      )
    )
  ); 