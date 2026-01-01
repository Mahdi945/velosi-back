--
-- PostgreSQL database dump
--

\restrict Ne8j6PmXqCyE05tqPFhJ878EGiy8fkVDZMuQk510KecAh0xOg0anZmXWvEkZX2a

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: generate_database_name(character varying); Type: FUNCTION; Schema: public; Owner: msp
--

CREATE FUNCTION public.generate_database_name(nom_org character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
  nom_clean VARCHAR;
BEGIN
  -- Convertir en minuscules
  nom_clean := LOWER(nom_org);
  
  -- Remplacer espaces par underscores
  nom_clean := REPLACE(nom_clean, ' ', '_');
  
  -- Supprimer caractÃƒÂ¨res spÃƒÂ©ciaux
  nom_clean := REGEXP_REPLACE(nom_clean, '[^a-z0-9_]', '', 'g');
  
  -- Ajouter prÃƒÂ©fixe
  nom_clean := 'shipnology_' || nom_clean;
  
  -- Limiter ÃƒÂ  63 caractÃƒÂ¨res (limite PostgreSQL)
  IF LENGTH(nom_clean) > 63 THEN
    nom_clean := SUBSTRING(nom_clean, 1, 63);
  END IF;
  
  RETURN nom_clean;
END;
$$;


ALTER FUNCTION public.generate_database_name(nom_org character varying) OWNER TO msp;

--
-- Name: generate_setup_token(); Type: FUNCTION; Schema: public; Owner: msp
--

CREATE FUNCTION public.generate_setup_token() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
  chars VARCHAR := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result VARCHAR := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || SUBSTR(chars, (RANDOM() * (LENGTH(chars) - 1))::INTEGER + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION public.generate_setup_token() OWNER TO msp;

--
-- Name: update_admin_msp_updated_at(); Type: FUNCTION; Schema: public; Owner: msp
--

CREATE FUNCTION public.update_admin_msp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_admin_msp_updated_at() OWNER TO msp;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: msp
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO msp;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_msp; Type: TABLE; Schema: public; Owner: msp
--

CREATE TABLE public.admin_msp (
    id integer NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    nom_utilisateur character varying(100) NOT NULL,
    mot_de_passe character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'admin'::character varying,
    statut character varying(20) DEFAULT 'actif'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    derniere_connexion timestamp without time zone,
    created_by integer,
    notes text,
    CONSTRAINT admin_msp_role_check CHECK (((role)::text = ANY ((ARRAY['super_admin'::character varying, 'admin'::character varying, 'viewer'::character varying])::text[]))),
    CONSTRAINT admin_msp_statut_check CHECK (((statut)::text = ANY ((ARRAY['actif'::character varying, 'inactif'::character varying, 'suspendu'::character varying])::text[])))
);


ALTER TABLE public.admin_msp OWNER TO msp;

--
-- Name: admin_msp_id_seq; Type: SEQUENCE; Schema: public; Owner: msp
--

CREATE SEQUENCE public.admin_msp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_msp_id_seq OWNER TO msp;

--
-- Name: admin_msp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: msp
--

ALTER SEQUENCE public.admin_msp_id_seq OWNED BY public.admin_msp.id;


--
-- Name: organisations; Type: TABLE; Schema: public; Owner: msp
--

CREATE TABLE public.organisations (
    id integer NOT NULL,
    nom character varying(255) NOT NULL,
    nom_affichage character varying(100),
    database_name character varying(100) NOT NULL,
    logo_url character varying(500),
    email_contact character varying(255) NOT NULL,
    telephone character varying(50),
    adresse text,
    statut character varying(20) DEFAULT 'en_attente'::character varying,
    date_creation timestamp without time zone DEFAULT now(),
    date_derniere_connexion timestamp without time zone,
    plan character varying(50) DEFAULT 'standard'::character varying,
    date_expiration_abonnement date,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    smtp_host character varying(255),
    smtp_port integer DEFAULT 587,
    smtp_user character varying(255),
    smtp_password character varying(255),
    smtp_from_email character varying(255),
    smtp_from_name character varying(255),
    smtp_use_tls boolean DEFAULT false,
    smtp_enabled boolean DEFAULT false,
    slug character varying(100),
    tel1 character varying(50),
    tel2 character varying(50),
    tel3 character varying(50),
    site_web character varying(255),
    email_service_technique character varying(255),
    database_created boolean DEFAULT false,
    has_users boolean DEFAULT false,
    setup_completed boolean DEFAULT false,
    CONSTRAINT organisations_statut_check CHECK (((statut)::text = ANY ((ARRAY['actif'::character varying, 'inactif'::character varying, 'en_attente'::character varying, 'suspendu'::character varying])::text[])))
);


ALTER TABLE public.organisations OWNER TO msp;

--
-- Name: COLUMN organisations.statut; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.statut IS 'Statut de l''organisation: actif (opérationnel), en_attente (en cours de setup), suspendu (bloqué), inactif (désactivé)';


--
-- Name: COLUMN organisations.smtp_password; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.smtp_password IS 'Mot de passe SMTP chiffré. Ne jamais stocker en clair en production.';


--
-- Name: COLUMN organisations.smtp_enabled; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.smtp_enabled IS 'Si true, utiliser la config SMTP personnalisée. Si false, utiliser la config globale du système.';


--
-- Name: COLUMN organisations.slug; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.slug IS 'Identifiant URL-friendly unique pour l''organisation (ex: "velosi", "transport-rapide")';


--
-- Name: COLUMN organisations.tel1; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.tel1 IS 'Premier numéro de téléphone pour le footer des documents';


--
-- Name: COLUMN organisations.tel2; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.tel2 IS 'Deuxième numéro de téléphone pour le footer des documents';


--
-- Name: COLUMN organisations.tel3; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.tel3 IS 'Troisième numéro de téléphone pour le footer des documents';


--
-- Name: COLUMN organisations.site_web; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.site_web IS 'URL du site web de l''organisation';


--
-- Name: COLUMN organisations.email_service_technique; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.email_service_technique IS 'Email du service technique/aide pour le footer';


--
-- Name: COLUMN organisations.database_created; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.database_created IS 'Indique si la base de données a été créée physiquement';


--
-- Name: COLUMN organisations.has_users; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.has_users IS 'Indique si l''organisation a au moins un utilisateur';


--
-- Name: COLUMN organisations.setup_completed; Type: COMMENT; Schema: public; Owner: msp
--

COMMENT ON COLUMN public.organisations.setup_completed IS 'Indique si la configuration initiale a été complétée';


--
-- Name: organisations_id_seq; Type: SEQUENCE; Schema: public; Owner: msp
--

CREATE SEQUENCE public.organisations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organisations_id_seq OWNER TO msp;

--
-- Name: organisations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: msp
--

ALTER SEQUENCE public.organisations_id_seq OWNED BY public.organisations.id;


--
-- Name: setup_tokens; Type: TABLE; Schema: public; Owner: msp
--

CREATE TABLE public.setup_tokens (
    id integer NOT NULL,
    token character varying(255) NOT NULL,
    email_destinataire character varying(255) NOT NULL,
    nom_contact character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    used_at timestamp without time zone,
    organisation_id integer,
    generated_by integer,
    notes text
);


ALTER TABLE public.setup_tokens OWNER TO msp;

--
-- Name: setup_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: msp
--

CREATE SEQUENCE public.setup_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.setup_tokens_id_seq OWNER TO msp;

--
-- Name: setup_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: msp
--

ALTER SEQUENCE public.setup_tokens_id_seq OWNED BY public.setup_tokens.id;


--
-- Name: admin_msp id; Type: DEFAULT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.admin_msp ALTER COLUMN id SET DEFAULT nextval('public.admin_msp_id_seq'::regclass);


--
-- Name: organisations id; Type: DEFAULT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.organisations ALTER COLUMN id SET DEFAULT nextval('public.organisations_id_seq'::regclass);


--
-- Name: setup_tokens id; Type: DEFAULT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.setup_tokens ALTER COLUMN id SET DEFAULT nextval('public.setup_tokens_id_seq'::regclass);


--
-- Data for Name: admin_msp; Type: TABLE DATA; Schema: public; Owner: msp
--

COPY public.admin_msp (id, nom, prenom, email, nom_utilisateur, mot_de_passe, role, statut, created_at, updated_at, derniere_connexion, created_by, notes) FROM stdin;
1	Admin	MSPP	admin@msp-erp.com	admin_msp	$2a$12$U6bDwYKDaQ6VJj4G5tySUeVEMVNJIXmeUfEjqJBTSJQUrBK2fGx6i	super_admin	actif	2025-12-17 16:32:42.427526	2025-12-26 09:41:09.383581	2025-12-26 09:41:09.369	\N	edede
\.


--
-- Data for Name: organisations; Type: TABLE DATA; Schema: public; Owner: msp
--

COPY public.organisations (id, nom, nom_affichage, database_name, logo_url, email_contact, telephone, adresse, statut, date_creation, date_derniere_connexion, plan, date_expiration_abonnement, created_at, updated_at, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, smtp_use_tls, smtp_enabled, slug, tel1, tel2, tel3, site_web, email_service_technique, database_created, has_users, setup_completed) FROM stdin;
17	danino	danino	danino	/uploads/logos/logo-1766148618622-46573257.png	mahdibeyy@gmail.com	+21656327280	14 rue sokrat	actif	2025-12-19 12:57:19.145	2025-12-21 02:14:52.203	premium	\N	2025-12-19 12:57:19.16085	2025-12-19 12:57:19.16085	smtp.gmail.com	587	mahdibey2002@gmail.com	wgblqbzuzdmqlggy	no-reply@shipnology.com	Danino	f	t	\N	\N	\N	\N	\N	\N	f	f	t
24	hyt	hyt	hyt	/uploads/logos/logo-1766599907552-115202825.png	mahdibeyyy@gmail.com	+21656327288	14 sokrat street	inactif	2025-12-24 17:51:06.515	\N	premium	\N	2025-12-24 17:51:06.521916	2025-12-24 17:51:06.521916	smtp.gmail.com	587	ahmed@gmail.com	Barella45@	ahmed@gmail.com	hyt	t	t	\N	+21656327280	+21656327281	+21656327289	www.hyt.com	\N	f	f	t
1	Velosi	Velosi	velosi	/uploads/logos/org_1_logo_1766392612734.png	contactt@velosi.com	+216 11111111	\N	actif	2025-12-08 00:00:00	2025-12-21 01:37:04.688	premium	\N	2025-12-17 16:10:18.314328	2025-12-17 16:10:18.314328	smtp.gmail.com	587	velosierp@gmail.com	qaasamaktyqqrzet	noreply@msp.com	Velosi	t	t	velosiii	+2162222222	+21656327280	+21656327289	www.velosi.com	support@velosi.com	t	t	t
22	cocacola	cocacola	cocacola	\N	mahdibey2002@gmail.com	+21656327280554	25 avenue borguiba	actif	2025-12-24 17:01:03.28	\N	\N	\N	2025-12-24 17:01:03.31225	2025-12-24 17:01:03.31225	smtp.gmail.com	587	mahdibey2002@gmail.com	fjpcsmekbgfilutd	noreply@cocaola.com	cocacola	f	t	\N	+21656321212	+216563272121	+216563272121	www.cocacola.com	\N	t	f	t
\.


--
-- Data for Name: setup_tokens; Type: TABLE DATA; Schema: public; Owner: msp
--

COPY public.setup_tokens (id, token, email_destinataire, nom_contact, created_at, expires_at, used, used_at, organisation_id, generated_by, notes) FROM stdin;
10	be840baa-c621-420d-8d1f-9e31fd2d80f1	mahdibeyy@gmail.com	\N	2025-12-19 12:57:19.24056	2025-12-20 12:57:19.233	t	2025-12-19 13:50:24.534	17	\N	\N
16	9df8041e-eded-492c-aa20-dd295c086fe7	mahdibeyyy@gmail.com	\N	2025-12-24 17:51:06.622774	2025-12-25 17:51:06.606	t	2025-12-24 19:11:51.913	24	\N	\N
\.


--
-- Name: admin_msp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: msp
--

SELECT pg_catalog.setval('public.admin_msp_id_seq', 2, true);


--
-- Name: organisations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: msp
--

SELECT pg_catalog.setval('public.organisations_id_seq', 24, true);


--
-- Name: setup_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: msp
--

SELECT pg_catalog.setval('public.setup_tokens_id_seq', 16, true);


--
-- Name: admin_msp admin_msp_email_key; Type: CONSTRAINT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.admin_msp
    ADD CONSTRAINT admin_msp_email_key UNIQUE (email);


--
-- Name: admin_msp admin_msp_nom_utilisateur_key; Type: CONSTRAINT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.admin_msp
    ADD CONSTRAINT admin_msp_nom_utilisateur_key UNIQUE (nom_utilisateur);


--
-- Name: admin_msp admin_msp_pkey; Type: CONSTRAINT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.admin_msp
    ADD CONSTRAINT admin_msp_pkey PRIMARY KEY (id);


--
-- Name: organisations organisations_database_name_key; Type: CONSTRAINT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_database_name_key UNIQUE (database_name);


--
-- Name: organisations organisations_pkey; Type: CONSTRAINT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_pkey PRIMARY KEY (id);


--
-- Name: organisations organisations_slug_key; Type: CONSTRAINT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_slug_key UNIQUE (slug);


--
-- Name: setup_tokens setup_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.setup_tokens
    ADD CONSTRAINT setup_tokens_pkey PRIMARY KEY (id);


--
-- Name: setup_tokens setup_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.setup_tokens
    ADD CONSTRAINT setup_tokens_token_key UNIQUE (token);


--
-- Name: idx_admin_msp_email; Type: INDEX; Schema: public; Owner: msp
--

CREATE INDEX idx_admin_msp_email ON public.admin_msp USING btree (email);


--
-- Name: idx_admin_msp_statut; Type: INDEX; Schema: public; Owner: msp
--

CREATE INDEX idx_admin_msp_statut ON public.admin_msp USING btree (statut);


--
-- Name: idx_admin_msp_username; Type: INDEX; Schema: public; Owner: msp
--

CREATE INDEX idx_admin_msp_username ON public.admin_msp USING btree (nom_utilisateur);


--
-- Name: idx_organisations_database_name; Type: INDEX; Schema: public; Owner: msp
--

CREATE INDEX idx_organisations_database_name ON public.organisations USING btree (database_name);


--
-- Name: idx_organisations_email; Type: INDEX; Schema: public; Owner: msp
--

CREATE INDEX idx_organisations_email ON public.organisations USING btree (email_contact);


--
-- Name: idx_organisations_slug; Type: INDEX; Schema: public; Owner: msp
--

CREATE INDEX idx_organisations_slug ON public.organisations USING btree (slug);


--
-- Name: idx_organisations_statut; Type: INDEX; Schema: public; Owner: msp
--

CREATE INDEX idx_organisations_statut ON public.organisations USING btree (statut);


--
-- Name: idx_setup_tokens_email; Type: INDEX; Schema: public; Owner: msp
--

CREATE INDEX idx_setup_tokens_email ON public.setup_tokens USING btree (email_destinataire);


--
-- Name: idx_setup_tokens_expires; Type: INDEX; Schema: public; Owner: msp
--

CREATE INDEX idx_setup_tokens_expires ON public.setup_tokens USING btree (expires_at);


--
-- Name: idx_setup_tokens_token; Type: INDEX; Schema: public; Owner: msp
--

CREATE INDEX idx_setup_tokens_token ON public.setup_tokens USING btree (token);


--
-- Name: idx_setup_tokens_used; Type: INDEX; Schema: public; Owner: msp
--

CREATE INDEX idx_setup_tokens_used ON public.setup_tokens USING btree (used);


--
-- Name: admin_msp trigger_update_admin_msp_updated_at; Type: TRIGGER; Schema: public; Owner: msp
--

CREATE TRIGGER trigger_update_admin_msp_updated_at BEFORE UPDATE ON public.admin_msp FOR EACH ROW EXECUTE FUNCTION public.update_admin_msp_updated_at();


--
-- Name: admin_msp admin_msp_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.admin_msp
    ADD CONSTRAINT admin_msp_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_msp(id);


--
-- Name: setup_tokens setup_tokens_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: msp
--

ALTER TABLE ONLY public.setup_tokens
    ADD CONSTRAINT setup_tokens_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Ne8j6PmXqCyE05tqPFhJ878EGiy8fkVDZMuQk510KecAh0xOg0anZmXWvEkZX2a

