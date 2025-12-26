-- ====================================
-- CRÉATION TABLE LOGIN_HISTORY
-- Journal complet de connexion pour Personnel et Clients
-- ====================================

CREATE TABLE IF NOT EXISTS public.login_history (
    id SERIAL PRIMARY KEY,
    
    -- Identification utilisateur
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('personnel', 'client')),
    username VARCHAR(255),
    full_name VARCHAR(255),
    
    -- Informations de connexion
    login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP NULL,
    session_duration INTEGER NULL, -- Durée en secondes
    
    -- Informations réseau
    ip_address VARCHAR(45), -- Support IPv4 et IPv6
    user_agent TEXT,
    
    -- Informations appareil
    device_type VARCHAR(50), -- desktop, mobile, tablet
    device_name VARCHAR(255),
    os_name VARCHAR(100),
    os_version VARCHAR(50),
    browser_name VARCHAR(100),
    browser_version VARCHAR(50),
    
    -- Informations géolocalisation (si disponible)
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    city VARCHAR(100),
    country VARCHAR(100),
    
    -- Statut et détails
    login_method VARCHAR(50) DEFAULT 'password', -- password, biometric, otp, sso
    status VARCHAR(20) DEFAULT 'success', -- success, failed, timeout
    failure_reason VARCHAR(255) NULL,
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_login_history_user ON public.login_history(user_id, user_type);
CREATE INDEX idx_login_history_login_time ON public.login_history(login_time DESC);
CREATE INDEX idx_login_history_status ON public.login_history(status);
CREATE INDEX idx_login_history_personnel ON public.login_history(user_id) WHERE user_type = 'personnel';
CREATE INDEX idx_login_history_client ON public.login_history(user_id) WHERE user_type = 'client';

-- Commentaires
COMMENT ON TABLE public.login_history IS 'Historique complet des connexions pour Personnel et Clients';
COMMENT ON COLUMN public.login_history.user_id IS 'ID du personnel ou client';
COMMENT ON COLUMN public.login_history.user_type IS 'Type utilisateur: personnel ou client';
COMMENT ON COLUMN public.login_history.session_duration IS 'Durée de session en secondes';
COMMENT ON COLUMN public.login_history.ip_address IS 'Adresse IP de connexion (IPv4 ou IPv6)';
COMMENT ON COLUMN public.login_history.login_method IS 'Méthode de connexion utilisée';
COMMENT ON COLUMN public.login_history.status IS 'Statut de la connexion';

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_login_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER trigger_update_login_history_updated_at
    BEFORE UPDATE ON public.login_history
    FOR EACH ROW
    EXECUTE FUNCTION update_login_history_updated_at();

-- Données de test (optionnel)
-- INSERT INTO public.login_history (user_id, user_type, username, full_name, ip_address, device_type, browser_name, status, login_method)
-- VALUES (1, 'personnel', 'admin', 'Admin User', '192.168.1.1', 'desktop', 'Chrome', 'success', 'password');

COMMENT ON TABLE public.login_history IS 'Historique complet de connexion - V1.0 - 2025-12-11';
