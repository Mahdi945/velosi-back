-- Migration pour créer les tables d'activités CRM
-- Date: 2025-10-16

-- Table des activités CRM
CREATE TABLE IF NOT EXISTS crm_activities (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    
    -- Type et contenu
    type VARCHAR(50) NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'task', 'note', 'appointment', 'follow_up', 'presentation', 'proposal', 'negotiation', 'visit', 'demo')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Statut
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'no_show')),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Relations CRM
    lead_id INTEGER REFERENCES crm_leads(id) ON DELETE SET NULL,
    opportunity_id INTEGER REFERENCES crm_opportunities(id) ON DELETE SET NULL,
    quote_id INTEGER, -- À implémenter plus tard
    client_id INTEGER REFERENCES client(id) ON DELETE SET NULL,
    
    -- Dates et durée
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    reminder_at TIMESTAMP WITH TIME ZONE,
    
    -- Localisation
    location VARCHAR(255),
    meeting_link VARCHAR(500),
    
    -- Gestion
    assigned_to INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    
    -- Résultats
    outcome TEXT,
    next_steps TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    
    -- Récurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern JSONB,
    parent_activity_id INTEGER REFERENCES crm_activities(id) ON DELETE CASCADE,
    
    -- Métadonnées
    tags TEXT[],
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des participants aux activités
CREATE TABLE IF NOT EXISTS crm_activity_participants (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES crm_activities(id) ON DELETE CASCADE,
    
    -- Type de participant
    participant_type VARCHAR(50) NOT NULL CHECK (participant_type IN ('internal', 'client', 'partner', 'vendor')),
    
    -- Informations du participant
    personnel_id INTEGER REFERENCES personnel(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Statut de réponse
    response_status VARCHAR(50) DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),
    response_date TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte unique pour éviter les doublons
    UNIQUE(activity_id, personnel_id, full_name)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_activities_type ON crm_activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_status ON crm_activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_priority ON crm_activities(priority);
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to ON crm_activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON crm_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_opportunity_id ON crm_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activities_client_id ON crm_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled_at ON crm_activities(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON crm_activities(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON crm_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_participants_activity_id ON crm_activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_participants_personnel_id ON crm_activity_participants(personnel_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_activities_updated_at
    BEFORE UPDATE ON crm_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_activities_updated_at();

-- Commentaires sur les tables
COMMENT ON TABLE crm_activities IS 'Table des activités CRM (appels, emails, réunions, tâches, etc.)';
COMMENT ON TABLE crm_activity_participants IS 'Table des participants aux activités (réunions, présentations, etc.)';
COMMENT ON COLUMN crm_activities.type IS 'Type d''activité: call, email, meeting, task, note, etc.';
COMMENT ON COLUMN crm_activities.status IS 'Statut: scheduled, in_progress, completed, cancelled, postponed, no_show';
COMMENT ON COLUMN crm_activities.priority IS 'Priorité: low, medium, high, urgent';
COMMENT ON COLUMN crm_activities.duration_minutes IS 'Durée estimée en minutes';
COMMENT ON COLUMN crm_activities.outcome IS 'Résultat de l''activité après complétion';
COMMENT ON COLUMN crm_activities.is_recurring IS 'Indique si l''activité est récurrente';
COMMENT ON COLUMN crm_activities.recurring_pattern IS 'Pattern de récurrence au format JSON';

