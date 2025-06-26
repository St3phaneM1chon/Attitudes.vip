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

-- Affichage des informations de création
SELECT 'Base de données Attitudes.vip initialisée avec succès!' as message; 