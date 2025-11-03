-- Script de correction pour créer les tables CRM manquantes dans Supabase
-- Remplace uuid_generate_v4() par gen_random_uuid()

-- Activer l'extension uuid-ossp si pas déjà fait
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Supprimer les tables existantes si erreur
DROP TABLE IF EXISTS public.crm_activities CASCADE;
DROP TABLE IF EXISTS public.crm_leads CASCADE;
DROP TABLE IF EXISTS public.crm_opportunities CASCADE;
DROP TABLE IF EXISTS public.crm_pipelines CASCADE;
DROP TABLE IF EXISTS public.crm_quotes CASCADE;

-- CRÉER LA TABLE crm_activities
CREATE TABLE public.crm_activities (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    lead_id integer,
    opportunity_id integer,
    quote_id integer,
    client_id integer,
    scheduled_at timestamp without time zone,
    completed_at timestamp without time zone,
    due_date timestamp without time zone,
    duration_minutes integer,
    reminder_at timestamp without time zone,
    location character varying(255),
    meeting_link character varying(500),
    assigned_to integer,
    created_by integer NOT NULL,
    outcome text,
    next_steps text,
    follow_up_date timestamp without time zone,
    is_recurring boolean DEFAULT false,
    recurring_pattern jsonb,
    parent_activity_id integer,
    tags text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT crm_activities_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT crm_activities_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'scheduled'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'no_show'::character varying, 'postponed'::character varying])::text[]))),
    CONSTRAINT crm_activities_type_check CHECK (((type)::text = ANY ((ARRAY['call'::character varying, 'email'::character varying, 'meeting'::character varying, 'task'::character varying, 'note'::character varying, 'appointment'::character varying, 'follow_up'::character varying, 'presentation'::character varying, 'proposal'::character varying, 'negotiation'::character varying, 'visit'::character varying, 'demo'::character varying])::text[])))
);

CREATE SEQUENCE IF NOT EXISTS public.crm_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.crm_activities_id_seq OWNED BY public.crm_activities.id;
ALTER TABLE ONLY public.crm_activities ALTER COLUMN id SET DEFAULT nextval('public.crm_activities_id_seq'::regclass);

-- CRÉER LA TABLE crm_leads
CREATE TABLE public.crm_leads (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    company character varying(255),
    "position" character varying(100),
    website character varying(255),
    industry character varying(100),
    employee_count integer,
    source character varying(50),
    status character varying(50) DEFAULT 'new'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    transport_needs text[],
    annual_volume numeric(15,2),
    current_provider character varying(255),
    contract_end_date date,
    street text,
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(3) NOT NULL,
    is_local boolean DEFAULT true NOT NULL,
    assigned_to integer,
    estimated_value numeric(15,2),
    tags text[],
    notes text,
    last_contact_date timestamp without time zone,
    next_followup_date timestamp without time zone,
    qualified_date timestamp without time zone,
    converted_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL,
    updated_by integer,
    traffic public.traffictype,
    deleted_at timestamp without time zone,
    is_archived boolean DEFAULT false NOT NULL,
    archived_reason text,
    archived_by integer,
    CONSTRAINT chk_country CHECK ((length((country)::text) = 3)),
    CONSTRAINT crm_leads_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT crm_leads_source_check CHECK (((source)::text = ANY ((ARRAY['website'::character varying, 'email'::character varying, 'phone'::character varying, 'referral'::character varying, 'social_media'::character varying, 'trade_show'::character varying, 'cold_call'::character varying, 'partner'::character varying, 'advertisement'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT crm_leads_status_check CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'contacted'::character varying, 'qualified'::character varying, 'nurturing'::character varying, 'unqualified'::character varying, 'converted'::character varying, 'lost'::character varying, 'client'::character varying])::text[])))
);

CREATE SEQUENCE IF NOT EXISTS public.crm_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.crm_leads_id_seq OWNED BY public.crm_leads.id;
ALTER TABLE ONLY public.crm_leads ALTER COLUMN id SET DEFAULT nextval('public.crm_leads_id_seq'::regclass);

-- CRÉER LA TABLE crm_opportunities
CREATE TABLE public.crm_opportunities (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    lead_id integer,
    client_id integer,
    value numeric(15,2),
    probability integer DEFAULT 25,
    stage character varying(50) DEFAULT 'prospecting'::character varying NOT NULL,
    expected_close_date date,
    actual_close_date date,
    origin_address text,
    destination_address text,
    transport_type character varying(50),
    service_frequency character varying(50),
    special_requirements text,
    assigned_to integer,
    source character varying(50),
    priority character varying(20) DEFAULT 'medium'::character varying,
    tags text[],
    competitors text[],
    lost_reason text,
    lost_to_competitor character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL,
    updated_by integer,
    traffic public.traffictype,
    engine_type integer,
    won_description text,
    deleted_at timestamp without time zone,
    is_archived boolean DEFAULT false NOT NULL,
    archived_reason text,
    archived_by integer,
    CONSTRAINT crm_opportunities_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT crm_opportunities_probability_check CHECK (((probability >= 0) AND (probability <= 100))),
    CONSTRAINT crm_opportunities_source_check CHECK (((source)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying, 'partner'::character varying, 'lead_conversion'::character varying])::text[]))),
    CONSTRAINT crm_opportunities_stage_check CHECK (((stage)::text = ANY ((ARRAY['prospecting'::character varying, 'qualification'::character varying, 'needs_analysis'::character varying, 'proposal'::character varying, 'negotiation'::character varying, 'closed_won'::character varying, 'closed_lost'::character varying])::text[])))
);

CREATE SEQUENCE IF NOT EXISTS public.crm_opportunities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.crm_opportunities_id_seq OWNED BY public.crm_opportunities.id;
ALTER TABLE ONLY public.crm_opportunities ALTER COLUMN id SET DEFAULT nextval('public.crm_opportunities_id_seq'::regclass);

-- CRÉER LA TABLE crm_pipelines
CREATE TABLE public.crm_pipelines (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.crm_pipelines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.crm_pipelines_id_seq OWNED BY public.crm_pipelines.id;
ALTER TABLE ONLY public.crm_pipelines ALTER COLUMN id SET DEFAULT nextval('public.crm_pipelines_id_seq'::regclass);

-- CRÉER LA TABLE crm_quotes
CREATE TABLE public.crm_quotes (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_number character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    lead_id integer,
    opportunity_id integer,
    client_id integer,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    valid_until date,
    subtotal numeric(15,2) DEFAULT 0,
    tax_rate numeric(5,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    currency character varying(3) DEFAULT 'TND'::character varying,
    payment_terms text,
    terms_conditions text,
    notes text,
    commercial_id integer,
    vehicle_id integer,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by integer,
    accepted_at timestamp without time zone,
    accepted_by integer,
    rejected_at timestamp without time zone,
    rejected_by integer,
    rejection_reason text,
    deleted_at timestamp without time zone,
    is_archived boolean DEFAULT false NOT NULL,
    archived_reason text,
    archived_by integer,
    CONSTRAINT crm_quotes_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'viewed'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'expired'::character varying, 'revised'::character varying])::text[])))
);

CREATE SEQUENCE IF NOT EXISTS public.crm_quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.crm_quotes_id_seq OWNED BY public.crm_quotes.id;
ALTER TABLE ONLY public.crm_quotes ALTER COLUMN id SET DEFAULT nextval('public.crm_quotes_id_seq'::regclass);

-- Ajouter les clés primaires
ALTER TABLE ONLY public.crm_activities ADD CONSTRAINT crm_activities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_activities ADD CONSTRAINT crm_activities_uuid_key UNIQUE (uuid);

ALTER TABLE ONLY public.crm_leads ADD CONSTRAINT crm_leads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_leads ADD CONSTRAINT crm_leads_uuid_key UNIQUE (uuid);

ALTER TABLE ONLY public.crm_opportunities ADD CONSTRAINT crm_opportunities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_opportunities ADD CONSTRAINT crm_opportunities_uuid_key UNIQUE (uuid);

ALTER TABLE ONLY public.crm_pipelines ADD CONSTRAINT crm_pipelines_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_pipelines ADD CONSTRAINT crm_pipelines_uuid_key UNIQUE (uuid);

ALTER TABLE ONLY public.crm_quotes ADD CONSTRAINT crm_quotes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_quotes ADD CONSTRAINT crm_quotes_quote_number_key UNIQUE (quote_number);
ALTER TABLE ONLY public.crm_quotes ADD CONSTRAINT crm_quotes_uuid_key UNIQUE (uuid);

-- Message de succès
SELECT 'Tables CRM créées avec succès!' AS status;
