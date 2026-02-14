-- Migration initiale pour l'environnement de staging
-- AttitudesFramework - Base de données multi-tenant

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Fonction pour les timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Table principale des mariages
CREATE TABLE IF NOT EXISTS weddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_names TEXT NOT NULL,
    wedding_date DATE NOT NULL,
    venue TEXT,
    venue_address JSONB,
    budget DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    guest_count INTEGER DEFAULT 0,
    theme VARCHAR(50),
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN (
        'admin', 'couple', 'wedding_planner', 'photographer',
        'videographer', 'caterer', 'decorator', 'dj',
        'venue_manager', 'officiant', 'transport_provider',
        'accommodation_provider', 'guest'
    )),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '{}',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des invités
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone VARCHAR(20),
    side VARCHAR(10) CHECK (side IN ('bride', 'groom', 'both')),
    table_number INTEGER,
    dietary_restrictions TEXT[],
    plus_one BOOLEAN DEFAULT false,
    plus_one_name TEXT,
    rsvp_status VARCHAR(20) DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'confirmed', 'declined', 'maybe')),
    rsvp_date TIMESTAMPTZ,
    invitation_sent BOOLEAN DEFAULT false,
    invitation_sent_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des tâches (Taskmaster)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    ai_score INTEGER DEFAULT 50 CHECK (ai_score >= 0 AND ai_score <= 100),
    ai_suggestions JSONB DEFAULT '[]',
    category VARCHAR(50),
    tags TEXT[],
    due_date DATE,
    completed_date TIMESTAMPTZ,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    parent_task_id UUID REFERENCES tasks(id),
    dependencies UUID[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des workflows (Taskmaster)
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    wedding_id UUID REFERENCES weddings(id),
    template BOOLEAN DEFAULT false,
    steps JSONB NOT NULL,
    triggers JSONB DEFAULT '[]',
    conditions JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    last_run TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des budgets et dépenses
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    vendor_id UUID REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    due_date DATE,
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    payment_method VARCHAR(50),
    invoice_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    recipient_id UUID REFERENCES users(id),
    channel VARCHAR(50),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des demandes musicales (DJ)
CREATE TABLE IF NOT EXISTS music_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
    guest_name TEXT NOT NULL,
    song_title TEXT NOT NULL,
    artist TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'played')),
    priority INTEGER DEFAULT 0,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    played_at TIMESTAMPTZ
);

-- Table des demandes de micro (DJ)
CREATE TABLE IF NOT EXISTS mic_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
    guest_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ
);

-- Table des photos
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    tags TEXT[],
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de logs pour audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX idx_weddings_date ON weddings(wedding_date);
CREATE INDEX idx_weddings_status ON weddings(status);

CREATE INDEX idx_users_wedding ON users(wedding_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_guests_wedding ON guests(wedding_id);
CREATE INDEX idx_guests_rsvp ON guests(rsvp_status);
CREATE INDEX idx_guests_table ON guests(table_number);

CREATE INDEX idx_tasks_wedding ON tasks(wedding_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_ai_score ON tasks(ai_score DESC);

CREATE INDEX idx_expenses_wedding ON expenses(wedding_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_category ON expenses(category);

CREATE INDEX idx_messages_wedding ON messages(wedding_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_read ON messages(read);

CREATE INDEX idx_music_requests_wedding ON music_requests(wedding_id);
CREATE INDEX idx_music_requests_status ON music_requests(status);

CREATE INDEX idx_photos_wedding ON photos(wedding_id);
CREATE INDEX idx_photos_featured ON photos(is_featured);

CREATE INDEX idx_audit_logs_wedding ON audit_logs(wedding_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Triggers pour updated_at
CREATE TRIGGER update_weddings_updated_at BEFORE UPDATE ON weddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mic_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS de base (à affiner selon les besoins)

-- Weddings: accessible aux membres du mariage
CREATE POLICY "wedding_members_policy" ON weddings
    FOR ALL USING (
        id IN (
            SELECT wedding_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Users: visible par les membres du même mariage
CREATE POLICY "users_same_wedding_policy" ON users
    FOR SELECT USING (
        wedding_id IN (
            SELECT wedding_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Guests: accessible aux membres du mariage
CREATE POLICY "guests_wedding_policy" ON guests
    FOR ALL USING (
        wedding_id IN (
            SELECT wedding_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Tasks: accessible aux membres du mariage
CREATE POLICY "tasks_wedding_policy" ON tasks
    FOR ALL USING (
        wedding_id IN (
            SELECT wedding_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Messages: accessible à l'expéditeur et au destinataire
CREATE POLICY "messages_sender_recipient_policy" ON messages
    FOR ALL USING (
        sender_id = auth.uid() OR 
        recipient_id = auth.uid() OR
        wedding_id IN (
            SELECT wedding_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Audit logs: lecture seule pour admins et couples
CREATE POLICY "audit_logs_read_policy" ON audit_logs
    FOR SELECT USING (
        wedding_id IN (
            SELECT wedding_id FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'couple')
        )
    );

-- Fonction pour créer des données de test en staging
CREATE OR REPLACE FUNCTION create_staging_test_data()
RETURNS void AS $$
DECLARE
    test_wedding_id UUID;
BEGIN
    -- Créer un mariage de test
    INSERT INTO weddings (couple_names, wedding_date, venue, budget, guest_count)
    VALUES ('Test Couple Staging', CURRENT_DATE + INTERVAL '6 months', 'Staging Venue', 25000, 100)
    RETURNING id INTO test_wedding_id;
    
    -- Ajouter quelques tâches de test
    INSERT INTO tasks (wedding_id, title, priority, ai_score, due_date)
    VALUES 
        (test_wedding_id, 'Finaliser la liste des invités', 'high', 85, CURRENT_DATE + INTERVAL '1 month'),
        (test_wedding_id, 'Confirmer le menu avec le traiteur', 'medium', 70, CURRENT_DATE + INTERVAL '2 months'),
        (test_wedding_id, 'Choisir les fleurs', 'low', 45, CURRENT_DATE + INTERVAL '3 months');
    
    RAISE NOTICE 'Données de test créées pour le mariage %', test_wedding_id;
END;
$$ LANGUAGE plpgsql;

-- Commentaires sur les tables
COMMENT ON TABLE weddings IS 'Table principale des mariages - multi-tenant root';
COMMENT ON TABLE users IS 'Utilisateurs avec 13 rôles distincts';
COMMENT ON TABLE tasks IS 'Système de tâches avec priorité IA (Taskmaster)';
COMMENT ON TABLE workflows IS 'Workflows automatisés pour tâches récurrentes';
COMMENT ON TABLE audit_logs IS 'Logs d audit pour traçabilité complète';

-- Vues utiles pour staging
CREATE OR REPLACE VIEW v_wedding_stats AS
SELECT 
    w.id,
    w.couple_names,
    w.wedding_date,
    w.budget,
    COUNT(DISTINCT g.id) as guest_count,
    COUNT(DISTINCT g.id) FILTER (WHERE g.rsvp_status = 'confirmed') as confirmed_guests,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
    SUM(e.amount) as total_expenses,
    SUM(e.paid_amount) as total_paid
FROM weddings w
LEFT JOIN guests g ON g.wedding_id = w.id
LEFT JOIN tasks t ON t.wedding_id = w.id
LEFT JOIN expenses e ON e.wedding_id = w.id
GROUP BY w.id;

-- Permissions pour la vue
GRANT SELECT ON v_wedding_stats TO authenticated;