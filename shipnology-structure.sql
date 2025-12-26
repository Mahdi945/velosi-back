--
-- PostgreSQL database dump
--


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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: traffictype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.traffictype AS ENUM (
    'import',
    'export'
);


--
-- Name: TYPE traffictype; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.traffictype IS 'Enum pour d├®finir le sens du traffic: import/export';


--
-- Name: user_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_type_enum AS ENUM (
    'personnel',
    'client'
);


--
-- Name: generate_correspondant_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_correspondant_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  next_number INTEGER;
  new_code VARCHAR(50);
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    -- Trouver le prochain num├®ro disponible
    SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1
    INTO next_number
    FROM correspondants
    WHERE code ~ '^COR[0-9]+$';
    
    -- G├®n├®rer le code avec padding
    new_code := 'COR' || LPAD(next_number::TEXT, 6, '0');
    NEW.code := new_code;
  END IF;
  
  RETURN NEW;
END;
$_$;


--
-- Name: trg_update_conversation_after_message_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_update_conversation_after_message_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    conv_participant1_id INT;
    conv_participant2_id INT;
    conv_participant1_type VARCHAR(20);
    conv_participant2_type VARCHAR(20);
BEGIN
    -- Normaliser les participants (variables avec noms non ambigus)
    IF (NEW.sender_id < NEW.receiver_id) OR 
       (NEW.sender_id = NEW.receiver_id AND NEW.sender_type < NEW.receiver_type) THEN
        conv_participant1_id := NEW.sender_id;
        conv_participant1_type := NEW.sender_type;
        conv_participant2_id := NEW.receiver_id;
        conv_participant2_type := NEW.receiver_type;
    ELSE
        conv_participant1_id := NEW.receiver_id;
        conv_participant1_type := NEW.receiver_type;
        conv_participant2_id := NEW.sender_id;
        conv_participant2_type := NEW.sender_type;
    END IF;
    
    -- Ins├®rer ou mettre ├á jour la conversation
    INSERT INTO vechat_conversations (
        participant1_id, participant1_type,
        participant2_id, participant2_type,
        last_message_id, last_message_at,
        unread_count_participant1, unread_count_participant2,
        created_at, updated_at
    ) VALUES (
        conv_participant1_id, conv_participant1_type,
        conv_participant2_id, conv_participant2_type,
        NEW.id, NEW.created_at,
        CASE WHEN NEW.receiver_id = conv_participant1_id AND NEW.receiver_type = conv_participant1_type THEN 1 ELSE 0 END,
        CASE WHEN NEW.receiver_id = conv_participant2_id AND NEW.receiver_type = conv_participant2_type THEN 1 ELSE 0 END,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT (participant1_id, participant1_type, participant2_id, participant2_type)
    DO UPDATE SET
        last_message_id = EXCLUDED.last_message_id,
        last_message_at = EXCLUDED.last_message_at,
        unread_count_participant1 = vechat_conversations.unread_count_participant1 + 
            (CASE WHEN NEW.receiver_id = vechat_conversations.participant1_id AND NEW.receiver_type = vechat_conversations.participant1_type THEN 1 ELSE 0 END),
        unread_count_participant2 = vechat_conversations.unread_count_participant2 + 
            (CASE WHEN NEW.receiver_id = vechat_conversations.participant2_id AND NEW.receiver_type = vechat_conversations.participant2_type THEN 1 ELSE 0 END),
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$;


--
-- Name: trg_update_conversation_after_message_read(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_update_conversation_after_message_read() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
        UPDATE vechat_conversations 
        SET 
            unread_count_participant1 = CASE 
                WHEN NEW.receiver_id = vechat_conversations.participant1_id AND NEW.receiver_type = vechat_conversations.participant1_type 
                THEN GREATEST(0, vechat_conversations.unread_count_participant1 - 1) 
                ELSE vechat_conversations.unread_count_participant1 
            END,
            unread_count_participant2 = CASE 
                WHEN NEW.receiver_id = vechat_conversations.participant2_id AND NEW.receiver_type = vechat_conversations.participant2_type 
                THEN GREATEST(0, vechat_conversations.unread_count_participant2 - 1) 
                ELSE vechat_conversations.unread_count_participant2 
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE (vechat_conversations.participant1_id = NEW.sender_id AND vechat_conversations.participant1_type = NEW.sender_type 
               AND vechat_conversations.participant2_id = NEW.receiver_id AND vechat_conversations.participant2_type = NEW.receiver_type)
           OR (vechat_conversations.participant1_id = NEW.receiver_id AND vechat_conversations.participant1_type = NEW.receiver_type 
               AND vechat_conversations.participant2_id = NEW.sender_id AND vechat_conversations.participant2_type = NEW.sender_type);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_armateurs_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_armateurs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updatedat = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_correspondant_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_correspondant_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_correspondants_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_correspondants_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_fournisseurs_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_fournisseurs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_lead_status_on_quote_accepted(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_lead_status_on_quote_accepted() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- V├®rifier si la cotation vient d'├¬tre accept├®e
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        
        -- Mettre ├á jour le statut du prospect si un lead_id existe
        IF NEW.lead_id IS NOT NULL THEN
            UPDATE crm_leads 
            SET 
                status = 'client',
                updated_at = NOW()
            WHERE id = NEW.lead_id;
            
            RAISE NOTICE 'Prospect #% mis ├á jour vers statut CLIENT suite ├á acceptation cotation #%', 
                NEW.lead_id, NEW.id;
        END IF;
        
        -- Mettre ├á jour le prospect via l'opportunit├® si elle existe
        IF NEW.opportunity_id IS NOT NULL AND NEW.lead_id IS NULL THEN
            UPDATE crm_leads 
            SET 
                status = 'client',
                updated_at = NOW()
            WHERE id = (
                SELECT lead_id 
                FROM crm_opportunities 
                WHERE id = NEW.opportunity_id
            );
            
            RAISE NOTICE 'Prospect mis ├á jour vers statut CLIENT via opportunit├® #% suite ├á acceptation cotation #%', 
                NEW.opportunity_id, NEW.id;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_lead_status_on_quote_accepted(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_lead_status_on_quote_accepted() IS 'Fonction trigger qui met automatiquement ├á jour le statut d''un prospect vers CLIENT lorsqu''une cotation est accept├®e';


--
-- Name: update_login_history_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_login_history_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updatedat = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_type_frais_annexes_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_type_frais_annexes_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AutorisationsTVA; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AutorisationsTVA" (
    id integer NOT NULL,
    client_id integer NOT NULL,
    "numeroAutorisation" character varying(50) NOT NULL,
    "dateDebutValidite" date,
    "dateFinValidite" date,
    "dateAutorisation" date,
    "typeDocument" character varying(20) DEFAULT 'AUTORISATION'::character varying,
    "referenceDocument" character varying(100),
    "statutAutorisation" character varying(20) DEFAULT 'ACTIF'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    "imagePath" text
);


--
-- Name: TABLE "AutorisationsTVA"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."AutorisationsTVA" IS 'Table principale des autorisations TVA';


--
-- Name: COLUMN "AutorisationsTVA".client_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AutorisationsTVA".client_id IS 'R├®f├®rence vers le client propri├®taire de l''autorisation';


--
-- Name: COLUMN "AutorisationsTVA"."numeroAutorisation"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AutorisationsTVA"."numeroAutorisation" IS 'Num├®ro unique d''autorisation TVA';


--
-- Name: COLUMN "AutorisationsTVA"."dateDebutValidite"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AutorisationsTVA"."dateDebutValidite" IS 'Date de d├®but de validit├® de l''autorisation';


--
-- Name: COLUMN "AutorisationsTVA"."dateFinValidite"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AutorisationsTVA"."dateFinValidite" IS 'Date de fin de validit├® de l''autorisation';


--
-- Name: COLUMN "AutorisationsTVA"."dateAutorisation"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AutorisationsTVA"."dateAutorisation" IS 'Date d''├®mission de l''autorisation';


--
-- Name: COLUMN "AutorisationsTVA"."typeDocument"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AutorisationsTVA"."typeDocument" IS 'Type de document (AUTORISATION, CERTIFICAT, ATTESTATION, DECISION, AUTRE)';


--
-- Name: COLUMN "AutorisationsTVA"."referenceDocument"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AutorisationsTVA"."referenceDocument" IS 'R├®f├®rence officielle du document';


--
-- Name: COLUMN "AutorisationsTVA"."statutAutorisation"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AutorisationsTVA"."statutAutorisation" IS 'Statut de l''autorisation (ACTIF, EXPIRE, SUSPENDU, ANNULE)';


--
-- Name: COLUMN "AutorisationsTVA"."imagePath"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."AutorisationsTVA"."imagePath" IS 'Chemin ou URL du fichier image scann├® de l''autorisation TVA';


--
-- Name: AutorisationsTVA_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AutorisationsTVA_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AutorisationsTVA_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AutorisationsTVA_id_seq" OWNED BY public."AutorisationsTVA".id;


--
-- Name: BCsusTVA; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BCsusTVA" (
    id integer NOT NULL,
    autorisation_id integer NOT NULL,
    "numeroBonCommande" character varying(50) NOT NULL,
    "dateBonCommande" date NOT NULL,
    "montantBonCommande" numeric(15,3) NOT NULL,
    description text,
    statut character varying(20) DEFAULT 'ACTIF'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    "imagePath" text
);


--
-- Name: TABLE "BCsusTVA"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."BCsusTVA" IS 'Table des bons de commande li├®s aux autorisations TVA';


--
-- Name: COLUMN "BCsusTVA".autorisation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BCsusTVA".autorisation_id IS 'R├®f├®rence vers l''autorisation TVA parent (obligatoire)';


--
-- Name: COLUMN "BCsusTVA"."numeroBonCommande"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BCsusTVA"."numeroBonCommande" IS 'Num├®ro du bon de commande';


--
-- Name: COLUMN "BCsusTVA"."dateBonCommande"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BCsusTVA"."dateBonCommande" IS 'Date d''├®mission du bon de commande';


--
-- Name: COLUMN "BCsusTVA"."montantBonCommande"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BCsusTVA"."montantBonCommande" IS 'Montant total du bon de commande';


--
-- Name: COLUMN "BCsusTVA".description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BCsusTVA".description IS 'Description ou observations du bon de commande';


--
-- Name: COLUMN "BCsusTVA".statut; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BCsusTVA".statut IS 'Statut du bon de commande (ACTIF, EXPIRE, SUSPENDU, ANNULE)';


--
-- Name: COLUMN "BCsusTVA"."imagePath"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BCsusTVA"."imagePath" IS 'Chemin ou URL du fichier image du bon de commande';


--
-- Name: BCsusTVA_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."BCsusTVA_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: BCsusTVA_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."BCsusTVA_id_seq" OWNED BY public."BCsusTVA".id;


--
-- Name: aeroports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aeroports (
    id integer NOT NULL,
    libelle character varying(200) NOT NULL,
    abbreviation character varying(10),
    ville character varying(100),
    pays character varying(100) NOT NULL,
    isactive boolean DEFAULT true,
    createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updatedat timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: aeroports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aeroports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aeroports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aeroports_id_seq OWNED BY public.aeroports.id;


--
-- Name: armateurs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.armateurs (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    nom character varying(100) NOT NULL,
    abreviation character varying(50),
    adresse character varying(255),
    ville character varying(100),
    pays character varying(100),
    codepostal character varying(20),
    telephone character varying(20),
    telephonesecondaire character varying(20),
    fax character varying(20),
    email character varying(100),
    siteweb character varying(150),
    tarif20pieds numeric(10,2) DEFAULT 0.00,
    tarif40pieds numeric(10,2) DEFAULT 0.00,
    tarif45pieds numeric(10,2) DEFAULT 0.00,
    logo text,
    notes text,
    isactive boolean DEFAULT true,
    createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updatedat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    createdby integer,
    updatedby integer
);


--
-- Name: TABLE armateurs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.armateurs IS 'Table des compagnies maritimes (armateurs)';


--
-- Name: COLUMN armateurs.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.armateurs.code IS 'Code unique de l''armateur';


--
-- Name: COLUMN armateurs.nom; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.armateurs.nom IS 'Nom complet de la compagnie maritime';


--
-- Name: COLUMN armateurs.abreviation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.armateurs.abreviation IS 'Abr├®viation du nom de l''armateur';


--
-- Name: COLUMN armateurs.tarif20pieds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.armateurs.tarif20pieds IS 'Tarif pour conteneur 20 pieds';


--
-- Name: COLUMN armateurs.tarif40pieds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.armateurs.tarif40pieds IS 'Tarif pour conteneur 40 pieds';


--
-- Name: COLUMN armateurs.tarif45pieds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.armateurs.tarif45pieds IS 'Tarif pour conteneur 45 pieds';


--
-- Name: COLUMN armateurs.isactive; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.armateurs.isactive IS 'Statut actif/inactif de l''armateur';


--
-- Name: armateurs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.armateurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: armateurs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.armateurs_id_seq OWNED BY public.armateurs.id;


--
-- Name: biometric_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biometric_credentials (
    id integer NOT NULL,
    personnel_id integer,
    client_id integer,
    user_type public.user_type_enum NOT NULL,
    credential_id text NOT NULL,
    public_key text NOT NULL,
    counter bigint DEFAULT 0 NOT NULL,
    device_name character varying(255) DEFAULT 'Appareil inconnu'::character varying NOT NULL,
    device_type character varying(50),
    browser_info text,
    is_resident_key boolean DEFAULT false NOT NULL,
    user_handle text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at timestamp without time zone,
    CONSTRAINT chk_biometric_user CHECK ((((personnel_id IS NOT NULL) AND (client_id IS NULL)) OR ((personnel_id IS NULL) AND (client_id IS NOT NULL))))
);


--
-- Name: TABLE biometric_credentials; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.biometric_credentials IS '­ƒöÉ Credentials WebAuthn multi-appareils avec support Resident Keys';


--
-- Name: COLUMN biometric_credentials.credential_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.biometric_credentials.credential_id IS 'ID unique du credential WebAuthn (g├®n├®r├® par le navigateur/appareil)';


--
-- Name: COLUMN biometric_credentials.public_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.biometric_credentials.public_key IS 'Cl├® publique du credential (format JWK ou PEM)';


--
-- Name: COLUMN biometric_credentials.counter; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.biometric_credentials.counter IS 'Compteur anti-replay WebAuthn';


--
-- Name: COLUMN biometric_credentials.device_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.biometric_credentials.device_name IS 'Nom de l''appareil';


--
-- Name: COLUMN biometric_credentials.is_resident_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.biometric_credentials.is_resident_key IS 'true = Connexion possible sans username (Passkey)';


--
-- Name: COLUMN biometric_credentials.user_handle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.biometric_credentials.user_handle IS 'Handle utilisateur pour Resident Keys';


--
-- Name: biometric_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.biometric_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: biometric_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.biometric_credentials_id_seq OWNED BY public.biometric_credentials.id;


--
-- Name: client; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client (
    id integer NOT NULL,
    nom character varying(255) NOT NULL,
    interlocuteur character varying(255),
    categorie character varying(50),
    type_client character varying(50),
    adresse character varying(255),
    code_postal character varying(20),
    ville character varying(100),
    pays character varying(100),
    id_fiscal character varying(50),
    nature character varying(10),
    c_douane character varying(50),
    nbr_jour_ech integer DEFAULT 0,
    etat_fiscal character varying(50),
    n_auto character varying(50),
    date_auto date,
    franchise_sur numeric(10,2) DEFAULT 0,
    date_fin date,
    blocage boolean DEFAULT false,
    devise character varying(10),
    timbre boolean DEFAULT false,
    compte_cpt character varying(100),
    sec_activite character varying(100),
    charge_com character varying(100),
    stop_envoie_solde boolean DEFAULT false,
    maj_web boolean DEFAULT false,
    d_initial numeric(15,3) DEFAULT 0,
    c_initial numeric(15,3) DEFAULT 0,
    solde numeric(15,3) DEFAULT 0,
    mot_de_passe character varying(255) DEFAULT 'changeme'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    keycloak_id uuid,
    photo character varying(255) DEFAULT NULL::character varying,
    statut character varying(255) DEFAULT 'actif'::character varying,
    first_login boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    auto_delete boolean DEFAULT false NOT NULL,
    is_permanent boolean DEFAULT false NOT NULL,
    charge_com_ids integer[] DEFAULT '{}'::integer[],
    banque character varying(255),
    iban character varying(34),
    rib character varying(23),
    swift character varying(11),
    bic character varying(11),
    is_fournisseur boolean DEFAULT false,
    code_fournisseur character varying(20),
    biometric_hash character varying(500),
    biometric_enabled boolean DEFAULT false NOT NULL,
    biometric_registered_at timestamp without time zone,
    statut_en_ligne boolean DEFAULT false,
    last_activity timestamp without time zone,
    organisation_id integer NOT NULL DEFAULT 1
);


--
-- Name: COLUMN client.etat_fiscal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.etat_fiscal IS '├ëtat fiscal du client: ASSUJETTI_TVA, SUSPENSION_TVA, EXONERE';


--
-- Name: COLUMN client.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.updated_at IS 'Timestamp de la derni├¿re modification, utilis├® pour la suppression automatique apr├¿s 7 jours de d├®sactivation';


--
-- Name: COLUMN client.auto_delete; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.auto_delete IS 'Indique si le compte doit ├¬tre supprim├® automatiquement apr├¿s 7 jours de d├®sactivation';


--
-- Name: COLUMN client.is_permanent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.is_permanent IS 'Indique si le client est permanent (acc├¿s site web) ou temporaire (pas d''acc├¿s site)';


--
-- Name: COLUMN client.charge_com_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.charge_com_ids IS 'Array des IDs des commerciaux assign├®s au client (relation 1-N)';


--
-- Name: COLUMN client.banque; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.banque IS 'Nom de la banque du client';


--
-- Name: COLUMN client.iban; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.iban IS 'IBAN - International Bank Account Number';


--
-- Name: COLUMN client.rib; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.rib IS 'RIB - Relev├® d''Identit├® Bancaire (format FR)';


--
-- Name: COLUMN client.swift; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.swift IS 'Code SWIFT - Society for Worldwide Interbank Financial Telecommunication';


--
-- Name: COLUMN client.bic; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.bic IS 'BIC - Bank Identifier Code';


--
-- Name: COLUMN client.is_fournisseur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.is_fournisseur IS 'Indique si le client est ├®galement fournisseur';


--
-- Name: COLUMN client.code_fournisseur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.code_fournisseur IS 'Code du fournisseur associ├® (si is_fournisseur = true)';


--
-- Name: COLUMN client.biometric_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.biometric_hash IS 'Hash s├®curis├® de l''empreinte biom├®trique';


--
-- Name: COLUMN client.biometric_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.biometric_enabled IS 'Indique si l''authentification biom├®trique est activ├®e';


--
-- Name: COLUMN client.biometric_registered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.biometric_registered_at IS 'Date d''enregistrement de l''empreinte biom├®trique';


--
-- Name: COLUMN client.statut_en_ligne; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.statut_en_ligne IS 'Indique si le client est actuellement connect├® (true) ou hors ligne (false)';


--
-- Name: COLUMN client.last_activity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.last_activity IS 'Timestamp de la derni├¿re activit├® du client pour g├®rer l''expiration de session';


--
-- Name: client_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_id_seq OWNED BY public.client.id;


--
-- Name: contact_client; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_client (
    id integer NOT NULL,
    id_client integer NOT NULL,
    nom character varying(255),
    prenom character varying(255),
    tel1 character varying(255),
    tel2 character varying(255),
    tel3 character varying(255),
    fax character varying(255),
    mail1 character varying(255),
    mail2 character varying(255),
    fonction character varying(255),
    is_principal boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: COLUMN contact_client.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contact_client.id IS 'Identifiant unique du contact';


--
-- Name: COLUMN contact_client.id_client; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contact_client.id_client IS 'R├®f├®rence vers le client';


--
-- Name: COLUMN contact_client.nom; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contact_client.nom IS 'Nom de famille du contact';


--
-- Name: COLUMN contact_client.prenom; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contact_client.prenom IS 'Pr├®nom du contact';


--
-- Name: COLUMN contact_client.is_principal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contact_client.is_principal IS 'Indique si ce contact est le contact principal du client (pour emails, etc.)';


--
-- Name: COLUMN contact_client.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contact_client.created_at IS 'Date de cr├®ation du contact';


--
-- Name: COLUMN contact_client.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contact_client.updated_at IS 'Date de derni├¿re mise ├á jour du contact';


--
-- Name: contact_client_new_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contact_client_new_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contact_client_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contact_client_new_id_seq OWNED BY public.contact_client.id;


--
-- Name: correspondants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.correspondants (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    nature character varying(20) DEFAULT 'LOCAL'::character varying NOT NULL,
    libelle character varying(255) NOT NULL,
    logo character varying(255),
    adresse text,
    ville character varying(100),
    code_postal character varying(20),
    pays character varying(100),
    telephone character varying(50),
    telephone_secondaire character varying(50),
    fax character varying(50),
    email character varying(100),
    site_web character varying(255),
    etat_fiscal character varying(50),
    tx_foids_volume numeric(10,3) DEFAULT 0.000,
    matricule_fiscal character varying(100),
    type_mf character varying(50),
    timbre character varying(20),
    echeance integer DEFAULT 0,
    debit_initial numeric(15,3) DEFAULT 0.000,
    credit_initial numeric(15,3) DEFAULT 0.000,
    solde numeric(15,3) DEFAULT 0.000,
    devise character varying(10) DEFAULT 'TND'::character varying,
    competence_maritime boolean DEFAULT false,
    competence_routier boolean DEFAULT false,
    competence_aerien boolean DEFAULT false,
    notes text,
    statut character varying(20) DEFAULT 'actif'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_nature CHECK (((nature)::text = ANY ((ARRAY['LOCAL'::character varying, 'ETRANGER'::character varying])::text[]))),
    CONSTRAINT chk_statut CHECK (((statut)::text = ANY ((ARRAY['actif'::character varying, 'inactif'::character varying])::text[])))
);


--
-- Name: TABLE correspondants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.correspondants IS 'Table des correspondants (soci├®t├®s de transport et logistique)';


--
-- Name: COLUMN correspondants.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.code IS 'Code unique auto-g├®n├®r├® (COR000001, COR000002, ...)';


--
-- Name: COLUMN correspondants.nature; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.nature IS 'Nature du correspondant: LOCAL ou ETRANGER';


--
-- Name: COLUMN correspondants.libelle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.libelle IS 'Nom du correspondant';


--
-- Name: COLUMN correspondants.logo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.logo IS 'Chemin vers le fichier logo';


--
-- Name: COLUMN correspondants.tx_foids_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.tx_foids_volume IS 'Taux FOIDS/VOLUME en pourcentage';


--
-- Name: COLUMN correspondants.matricule_fiscal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.matricule_fiscal IS 'Matricule fiscal (M.F)';


--
-- Name: COLUMN correspondants.timbre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.timbre IS 'Timbre (Oui/Non)';


--
-- Name: COLUMN correspondants.echeance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.echeance IS '├ëch├®ance en jours';


--
-- Name: COLUMN correspondants.devise; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.devise IS 'Devise pour les transactions (TND, EUR, USD, etc.)';


--
-- Name: COLUMN correspondants.competence_maritime; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.competence_maritime IS 'Comp├®tence dans le transport maritime';


--
-- Name: COLUMN correspondants.competence_routier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.competence_routier IS 'Comp├®tence dans le transport routier';


--
-- Name: COLUMN correspondants.competence_aerien; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.correspondants.competence_aerien IS 'Comp├®tence dans le transport a├®rien';


--
-- Name: correspondants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.correspondants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: correspondants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.correspondants_id_seq OWNED BY public.correspondants.id;


--
-- Name: crm_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_activities (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'scheduled'::character varying,
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
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attachments jsonb DEFAULT '[]'::jsonb,
    assigned_to_ids integer[] DEFAULT '{}'::integer[],
    CONSTRAINT crm_activities_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT crm_activities_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'postponed'::character varying, 'no_show'::character varying])::text[]))),
    CONSTRAINT crm_activities_type_check CHECK (((type)::text = ANY ((ARRAY['call'::character varying, 'email'::character varying, 'meeting'::character varying, 'task'::character varying, 'note'::character varying, 'appointment'::character varying, 'follow_up'::character varying, 'presentation'::character varying, 'proposal'::character varying, 'negotiation'::character varying, 'visit'::character varying, 'demo'::character varying])::text[])))
);


--
-- Name: TABLE crm_activities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_activities IS 'Activit├®s CRM - Appels, emails, rendez-vous, taches';


--
-- Name: COLUMN crm_activities.attachments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_activities.attachments IS 'Tableau JSON contenant les m├®tadonn├®es des fichiers joints: 
[
  {
    fileName: string,
    originalName: string,
    filePath: string,
    fileSize: number,
    mimeType: string,
    uploadedAt: timestamp
  }
]';


--
-- Name: COLUMN crm_activities.assigned_to_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_activities.assigned_to_ids IS 'Array des IDs des commerciaux assign├®s ├á l''activit├® (relation 1-N)';


--
-- Name: crm_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_activities_id_seq OWNED BY public.crm_activities.id;


--
-- Name: crm_activity_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_activity_participants (
    id integer NOT NULL,
    activity_id integer,
    participant_type character varying(20),
    personnel_id integer,
    full_name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(20),
    response_status character varying(20) DEFAULT 'pending'::character varying,
    response_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT crm_activity_participants_participant_type_check CHECK (((participant_type)::text = ANY ((ARRAY['internal'::character varying, 'client'::character varying, 'partner'::character varying, 'vendor'::character varying])::text[]))),
    CONSTRAINT crm_activity_participants_response_status_check CHECK (((response_status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'tentative'::character varying])::text[])))
);


--
-- Name: TABLE crm_activity_participants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_activity_participants IS 'Participants aux activit├®s CRM';


--
-- Name: crm_activity_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_activity_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_activity_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_activity_participants_id_seq OWNED BY public.crm_activity_participants.id;


--
-- Name: crm_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_leads (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    full_name character varying(200) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    company character varying(255) NOT NULL,
    "position" character varying(100),
    website character varying(255),
    industry character varying(100),
    employee_count integer,
    source character varying(50) DEFAULT 'website'::character varying,
    status character varying(50) DEFAULT 'new'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    transport_needs text[],
    annual_volume numeric(12,2),
    current_provider character varying(255),
    contract_end_date date,
    street character varying(300),
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country text DEFAULT 'TUN'::character varying,
    is_local boolean DEFAULT true,
    assigned_to integer,
    estimated_value numeric(12,2),
    tags text[],
    notes text,
    last_contact_date timestamp without time zone,
    next_followup_date timestamp without time zone,
    qualified_date timestamp without time zone,
    converted_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_by integer,
    traffic public.traffictype,
    deleted_at timestamp without time zone,
    is_archived boolean DEFAULT false,
    archived_reason text,
    archived_by integer,
    currency character varying(3) DEFAULT 'TND'::character varying,
    assigned_to_ids integer[] DEFAULT '{}'::integer[],
    CONSTRAINT crm_leads_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT crm_leads_source_check CHECK (((source)::text = ANY ((ARRAY['website'::character varying, 'email'::character varying, 'phone'::character varying, 'referral'::character varying, 'social_media'::character varying, 'trade_show'::character varying, 'cold_call'::character varying, 'partner'::character varying, 'advertisement'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: TABLE crm_leads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_leads IS 'Table des prospects - Contacts potentiels non encore clients';


--
-- Name: COLUMN crm_leads.country; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_leads.country IS 'Nom du pays (saisie libre sans limitation de caract├¿res)';


--
-- Name: COLUMN crm_leads.traffic; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_leads.traffic IS 'Type de traffic: import ou export';


--
-- Name: COLUMN crm_leads.currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_leads.currency IS 'Devise pour estimatedValue et annualVolume';


--
-- Name: COLUMN crm_leads.assigned_to_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_leads.assigned_to_ids IS 'Array des IDs des commerciaux assign├®s au prospect (relation 1-N)';


--
-- Name: crm_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_leads_id_seq OWNED BY public.crm_leads.id;


--
-- Name: crm_opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_opportunities (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    lead_id integer,
    client_id integer,
    value numeric(12,2) DEFAULT 0 NOT NULL,
    probability integer DEFAULT 0,
    stage character varying(50) DEFAULT 'prospecting'::character varying,
    expected_close_date date,
    actual_close_date date,
    origin_address text,
    destination_address text,
    transport_type character varying(50),
    service_frequency character varying(50),
    special_requirements text,
    assigned_to integer,
    source character varying(50) DEFAULT 'inbound'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    tags text[],
    competitors text[],
    lost_reason text,
    lost_to_competitor character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_by integer,
    traffic public.traffictype,
    engine_type integer,
    won_description text,
    deleted_at timestamp without time zone,
    is_archived boolean DEFAULT false,
    archived_reason text,
    archived_by integer,
    currency character varying(3) DEFAULT 'TND'::character varying,
    assigned_to_ids integer[] DEFAULT '{}'::integer[],
    CONSTRAINT crm_opportunities_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT crm_opportunities_probability_check CHECK (((probability >= 0) AND (probability <= 100))),
    CONSTRAINT crm_opportunities_stage_check CHECK (((stage)::text = ANY ((ARRAY['prospecting'::character varying, 'qualification'::character varying, 'needs_analysis'::character varying, 'proposal'::character varying, 'negotiation'::character varying, 'closed_won'::character varying, 'closed_lost'::character varying])::text[])))
);


--
-- Name: TABLE crm_opportunities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_opportunities IS 'Table des opportunit├®s - Prospects qualifi├®s avec potentiel de vente';


--
-- Name: COLUMN crm_opportunities.traffic; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_opportunities.traffic IS 'Type de traffic: import ou export';


--
-- Name: COLUMN crm_opportunities.currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_opportunities.currency IS 'Devise pour le champ value';


--
-- Name: COLUMN crm_opportunities.assigned_to_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_opportunities.assigned_to_ids IS 'Array des IDs des commerciaux assign├®s ├á l''opportunit├® (relation 1-N)';


--
-- Name: crm_opportunities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_opportunities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_opportunities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_opportunities_id_seq OWNED BY public.crm_opportunities.id;


--
-- Name: crm_pipeline_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_pipeline_stages (
    id integer NOT NULL,
    pipeline_id integer,
    name character varying(255) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#6c757d'::character varying,
    stage_order integer NOT NULL,
    probability integer DEFAULT 0,
    is_active boolean DEFAULT true,
    stage_enum character varying(50),
    required_fields text[],
    auto_advance_days integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT crm_pipeline_stages_probability_check CHECK (((probability >= 0) AND (probability <= 100))),
    CONSTRAINT crm_pipeline_stages_stage_enum_check CHECK (((stage_enum)::text = ANY ((ARRAY['prospecting'::character varying, 'qualification'::character varying, 'needs_analysis'::character varying, 'proposal'::character varying, 'negotiation'::character varying, 'closed_won'::character varying, 'closed_lost'::character varying])::text[])))
);


--
-- Name: TABLE crm_pipeline_stages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_pipeline_stages IS '├ëtapes des pipelines de vente';


--
-- Name: crm_pipeline_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_pipeline_stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_pipeline_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_pipeline_stages_id_seq OWNED BY public.crm_pipeline_stages.id;


--
-- Name: crm_pipelines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_pipelines (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer NOT NULL
);


--
-- Name: TABLE crm_pipelines; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_pipelines IS 'Pipelines de vente personnalisables';


--
-- Name: crm_pipelines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_pipelines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_pipelines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_pipelines_id_seq OWNED BY public.crm_pipelines.id;


--
-- Name: crm_quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_quote_items (
    id integer NOT NULL,
    quote_id integer,
    description text NOT NULL,
    category character varying(50),
    origin_street character varying(300),
    origin_city character varying(100),
    origin_postal_code character varying(20),
    origin_country character varying(3) DEFAULT 'TUN'::character varying,
    destination_street character varying(300),
    destination_city character varying(100),
    destination_postal_code character varying(20),
    destination_country character varying(3) DEFAULT 'TUN'::character varying,
    distance_km numeric(8,2),
    weight_kg numeric(10,2),
    volume_m3 numeric(10,3),
    quantity numeric(10,2) DEFAULT 1,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    line_order integer DEFAULT 1,
    notes text,
    engin_id integer,
    vehicle_description character varying(200),
    cargo_designation text,
    packages_count integer,
    vehicle_type character varying(50),
    purchase_price numeric(10,2) DEFAULT 0,
    selling_price numeric(10,2) DEFAULT 0,
    margin numeric(10,2) DEFAULT 0,
    item_type character varying(50) DEFAULT 'freight'::character varying,
    service_type character varying(50),
    length_cm numeric(8,2),
    width_cm numeric(8,2),
    height_cm numeric(8,2),
    volumetric_weight numeric(10,2),
    currency character varying(3) DEFAULT NULL::character varying,
    conversion_rate numeric(10,4) DEFAULT NULL::numeric,
    unit character varying(50),
    tax_rate numeric(5,2) DEFAULT 19.0 NOT NULL,
    tax_amount numeric(12,2) DEFAULT 0 NOT NULL,
    is_taxable boolean DEFAULT true NOT NULL,
    taxable_account character varying(200),
    non_taxable_account character varying(200),
    is_debours boolean DEFAULT false NOT NULL,
    ca_type character varying(50) DEFAULT 'Oui'::character varying,
    CONSTRAINT chk_quote_items_quantity_positive CHECK ((quantity > (0)::numeric)),
    CONSTRAINT chk_quote_items_vehicle_type CHECK (((vehicle_type)::text = ANY ((ARRAY['van'::character varying, 'truck_3_5t'::character varying, 'truck_7_5t'::character varying, 'truck_12t'::character varying, 'truck_19t'::character varying, 'truck_26t'::character varying, 'semi_trailer'::character varying, 'container'::character varying])::text[])))
);


--
-- Name: TABLE crm_quote_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_quote_items IS 'Lignes de d├®tail des devis avec services transport';


--
-- Name: COLUMN crm_quote_items.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.description IS 'Description du service ou de la ligne';


--
-- Name: COLUMN crm_quote_items.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.category IS 'Cat├®gorie de transport: groupage (LCL), complet (FCL), routier, aerien_normale, aerien_expresse';


--
-- Name: COLUMN crm_quote_items.origin_city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.origin_city IS 'Ville d''origine';


--
-- Name: COLUMN crm_quote_items.destination_city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.destination_city IS 'Ville de destination';


--
-- Name: COLUMN crm_quote_items.weight_kg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.weight_kg IS 'Poids en kilogrammes';


--
-- Name: COLUMN crm_quote_items.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.quantity IS 'Quantit├® du service ou marchandise';


--
-- Name: COLUMN crm_quote_items.unit_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.unit_price IS 'Prix unitaire HT';


--
-- Name: COLUMN crm_quote_items.total_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.total_price IS 'Prix total HT de la ligne';


--
-- Name: COLUMN crm_quote_items.vehicle_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.vehicle_description IS 'Description du v├®hicule';


--
-- Name: COLUMN crm_quote_items.cargo_designation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.cargo_designation IS 'D├®signation de la marchandise';


--
-- Name: COLUMN crm_quote_items.packages_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.packages_count IS 'Nombre de colis';


--
-- Name: COLUMN crm_quote_items.vehicle_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.vehicle_type IS 'Type de v├®hicule utilis├®';


--
-- Name: COLUMN crm_quote_items.purchase_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.purchase_price IS 'Prix d''achat unitaire';


--
-- Name: COLUMN crm_quote_items.margin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.margin IS 'Marge sur la ligne';


--
-- Name: COLUMN crm_quote_items.item_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.item_type IS 'Type de ligne: freight (fret) ou additional_cost (frais annexe)';


--
-- Name: COLUMN crm_quote_items.service_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.service_type IS 'Type de service: "avec_livraison" ou "sans_livraison"';


--
-- Name: COLUMN crm_quote_items.length_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.length_cm IS 'Longueur du colis en centim├¿tres (pour calcul volume)';


--
-- Name: COLUMN crm_quote_items.width_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.width_cm IS 'Largeur du colis en centim├¿tres (pour calcul volume)';


--
-- Name: COLUMN crm_quote_items.height_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.height_cm IS 'Hauteur du colis en centim├¿tres (pour calcul volume)';


--
-- Name: COLUMN crm_quote_items.volumetric_weight; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.volumetric_weight IS 'Poids volum├®trique en kg (calcul├® selon cat├®gorie: a├®rien normal /6000, express /5000, groupage /1000000)';


--
-- Name: COLUMN crm_quote_items.unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.unit IS 'Unit├® de mesure (ex: 40HC, 20GP, TONNE, M3, PIECE, FORFAIT, etc.)';


--
-- Name: COLUMN crm_quote_items.tax_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.tax_rate IS 'Taux de TVA appliqu├® ├á cette ligne (ex: 19.00, 7.00, 0.00)';


--
-- Name: COLUMN crm_quote_items.tax_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.tax_amount IS 'Montant de TVA calcul├® pour cette ligne';


--
-- Name: COLUMN crm_quote_items.is_taxable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.is_taxable IS 'Indique si cette ligne est soumise ├á la TVA';


--
-- Name: COLUMN crm_quote_items.taxable_account; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.taxable_account IS 'Libell├® du compte comptable G.Taxable (ex: PRESTATIONS DE SERVICE IMPORT)';


--
-- Name: COLUMN crm_quote_items.non_taxable_account; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.non_taxable_account IS 'Libell├® du compte comptable Non Taxable (ex: PRESTATIONS DE SERVICE EN SUISSE)';


--
-- Name: COLUMN crm_quote_items.is_debours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.is_debours IS 'Indique si cette ligne est un d├®bours (frais avanc├®s sans marge)';


--
-- Name: COLUMN crm_quote_items.ca_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quote_items.ca_type IS 'Type de CA: "Oui" (normal), "Non" (ligne info), "Oui d├®bours" (CA sans marge)';


--
-- Name: crm_quote_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_quote_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_quote_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_quote_items_id_seq OWNED BY public.crm_quote_items.id;


--
-- Name: crm_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_quotes (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quote_number character varying(50) NOT NULL,
    opportunity_id integer,
    lead_id integer,
    client_id integer,
    title character varying(255),
    status character varying(50) DEFAULT 'draft'::character varying,
    valid_until date NOT NULL,
    sent_at timestamp without time zone,
    viewed_at timestamp without time zone,
    accepted_at timestamp without time zone,
    rejected_at timestamp without time zone,
    client_name character varying(255) NOT NULL,
    client_company character varying(255) NOT NULL,
    client_email character varying(255) NOT NULL,
    client_phone character varying(20),
    client_address text,
    subtotal numeric(12,2) DEFAULT 0,
    tax_rate numeric(5,2) DEFAULT 19.00,
    tax_amount numeric(12,2) DEFAULT 0,
    total numeric(12,2) DEFAULT 0,
    payment_terms character varying(100),
    delivery_terms character varying(100),
    terms_conditions text,
    notes text,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer NOT NULL,
    approved_by integer,
    commercial_id integer,
    country character varying(20) DEFAULT 'TUN'::character varying,
    tiers character varying(100),
    attention_to character varying(200),
    pickup_location text,
    delivery_location text,
    transit_time character varying(100),
    departure_frequency character varying(100),
    client_type character varying(50),
    import_export character varying(50),
    file_status character varying(50),
    terms character varying(100),
    payment_method character varying(100),
    payment_conditions text,
    requester character varying(200),
    vehicle_id integer,
    freight_purchased numeric(12,2) DEFAULT 0,
    freight_offered numeric(12,2) DEFAULT 0,
    freight_margin numeric(12,2) DEFAULT 0,
    additional_costs_purchased numeric(12,2) DEFAULT 0,
    additional_costs_offered numeric(12,2) DEFAULT 0,
    total_purchases numeric(12,2) DEFAULT 0,
    total_offers numeric(12,2) DEFAULT 0,
    total_margin numeric(12,2) DEFAULT 0,
    internal_instructions text,
    customer_request text,
    exchange_notes text,
    qr_code_data text,
    deleted_at timestamp without time zone,
    is_archived boolean DEFAULT false,
    archived_reason text,
    archived_by integer,
    type character varying(50) DEFAULT 'cotation'::character varying,
    armateur_id integer,
    navire_id integer,
    port_enlevement_id integer,
    port_livraison_id integer,
    aeroport_enlevement_id integer,
    aeroport_livraison_id integer,
    hbl character varying(100),
    mbl character varying(100),
    condition character varying(100),
    commercial_ids integer[] DEFAULT '{}'::integer[],
    updated_by integer,
    organisation_id integer NOT NULL,
    CONSTRAINT crm_quotes_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'viewed'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT crm_quotes_type_check CHECK (((type)::text = ANY ((ARRAY['cotation'::character varying, 'fiche_dossier'::character varying])::text[])))
);


--
-- Name: TABLE crm_quotes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_quotes IS 'Table des devis - Propositions commerciales envoy├®es';


--
-- Name: COLUMN crm_quotes.commercial_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.commercial_id IS 'Commercial assign├® au devis';


--
-- Name: COLUMN crm_quotes.country; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.country IS 'Code pays (ISO 20 lettres)';


--
-- Name: COLUMN crm_quotes.tiers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.tiers IS 'Tiers';


--
-- Name: COLUMN crm_quotes.attention_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.attention_to IS 'L''attention de';


--
-- Name: COLUMN crm_quotes.pickup_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.pickup_location IS 'Lieu d''enl├¿vement';


--
-- Name: COLUMN crm_quotes.delivery_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.delivery_location IS 'Lieu de livraison';


--
-- Name: COLUMN crm_quotes.transit_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.transit_time IS 'Temps de transit estim├®';


--
-- Name: COLUMN crm_quotes.departure_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.departure_frequency IS 'Fr├®quence de d├®part';


--
-- Name: COLUMN crm_quotes.client_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.client_type IS 'Type de client (Client, Prospect, Correspondant)';


--
-- Name: COLUMN crm_quotes.import_export; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.import_export IS 'Type de flux (Import/Export)';


--
-- Name: COLUMN crm_quotes.file_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.file_status IS 'Statut du dossier (COMPLET, etc.)';


--
-- Name: COLUMN crm_quotes.terms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.terms IS 'Termes du devis';


--
-- Name: COLUMN crm_quotes.payment_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.payment_method IS 'M├®thode de paiement';


--
-- Name: COLUMN crm_quotes.payment_conditions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.payment_conditions IS 'Conditions de paiement';


--
-- Name: COLUMN crm_quotes.requester; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.requester IS 'Demandeur';


--
-- Name: COLUMN crm_quotes.vehicle_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.vehicle_id IS 'Engin assign├®';


--
-- Name: COLUMN crm_quotes.freight_purchased; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.freight_purchased IS 'Fret Achet├®';


--
-- Name: COLUMN crm_quotes.freight_offered; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.freight_offered IS 'Fret Offert';


--
-- Name: COLUMN crm_quotes.freight_margin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.freight_margin IS 'Marge sur le Fret';


--
-- Name: COLUMN crm_quotes.additional_costs_purchased; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.additional_costs_purchased IS 'Achats Frais Annexes';


--
-- Name: COLUMN crm_quotes.additional_costs_offered; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.additional_costs_offered IS 'Frais Annexes Offerts';


--
-- Name: COLUMN crm_quotes.total_purchases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.total_purchases IS 'Total Achats';


--
-- Name: COLUMN crm_quotes.total_offers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.total_offers IS 'Total Offres';


--
-- Name: COLUMN crm_quotes.total_margin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.total_margin IS 'Marge Totale';


--
-- Name: COLUMN crm_quotes.internal_instructions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.internal_instructions IS 'Instructions Internes';


--
-- Name: COLUMN crm_quotes.customer_request; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.customer_request IS 'Demande du Client';


--
-- Name: COLUMN crm_quotes.exchange_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.exchange_notes IS 'Notes d''├ëchange';


--
-- Name: COLUMN crm_quotes.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.type IS 'Type de document: cotation (statut != accepted) ou fiche_dossier (statut = accepted avec infos transport compl├¿tes)';


--
-- Name: COLUMN crm_quotes.armateur_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.armateur_id IS 'Armateur assign├® pour le transport maritime';


--
-- Name: COLUMN crm_quotes.navire_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.navire_id IS 'Navire assign├® pour le transport maritime';


--
-- Name: COLUMN crm_quotes.port_enlevement_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.port_enlevement_id IS 'Port d''enl├¿vement';


--
-- Name: COLUMN crm_quotes.port_livraison_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.port_livraison_id IS 'Port de livraison';


--
-- Name: COLUMN crm_quotes.aeroport_enlevement_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.aeroport_enlevement_id IS 'A├®roport d''enl├¿vement';


--
-- Name: COLUMN crm_quotes.aeroport_livraison_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.aeroport_livraison_id IS 'A├®roport de livraison';


--
-- Name: COLUMN crm_quotes.hbl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.hbl IS 'House Bill of Lading (Connaissement maison)';


--
-- Name: COLUMN crm_quotes.mbl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.mbl IS 'Master Bill of Lading (Connaissement principal)';


--
-- Name: COLUMN crm_quotes.condition; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.condition IS 'Condition d''enl├¿vement/livraison (ex: Contact)';


--
-- Name: COLUMN crm_quotes.commercial_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.commercial_ids IS 'Array des IDs des commerciaux assign├®s ├á la cotation (relation 1-N)';


--
-- Name: COLUMN crm_quotes.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.updated_by IS 'ID du personnel qui a effectu├® la derni├¿re modification';


--
-- Name: COLUMN crm_quotes.organisation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_quotes.organisation_id IS 'ID de l''organisation propriétaire du devis pour le multi-tenant et l''accès public';


--
-- Name: crm_quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_quotes_id_seq OWNED BY public.crm_quotes.id;


--
-- Name: crm_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_tags (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(7) DEFAULT '#6c757d'::character varying,
    description text,
    category character varying(50),
    usage_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer
);


--
-- Name: TABLE crm_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_tags IS 'Tags pour cat├®goriser les ├®l├®ments CRM';


--
-- Name: crm_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_tags_id_seq OWNED BY public.crm_tags.id;


--
-- Name: engin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.engin (
    id integer NOT NULL,
    libelle character varying(200) NOT NULL,
    conteneur_remorque character varying(100),
    poids_vide numeric(10,2),
    pied character varying(50),
    description text,
    is_active boolean DEFAULT true
);


--
-- Name: TABLE engin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.engin IS 'Table des engins/v├®hicules de transport avec sp├®cifications techniques';


--
-- Name: COLUMN engin.pied; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.engin.pied IS 'Taille en pieds pour les conteneurs (20, 40, 45, etc.)';


--
-- Name: engin_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.engin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: engin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.engin_id_seq OWNED BY public.engin.id;


--
-- Name: fournisseurs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fournisseurs (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    nom character varying(100) NOT NULL,
    type_fournisseur character varying(20) DEFAULT 'local'::character varying,
    categorie character varying(20) DEFAULT 'personne_morale'::character varying,
    activite character varying(250),
    nature_identification character varying(20) DEFAULT 'mf'::character varying,
    numero_identification character varying(20),
    code_fiscal character varying(20),
    type_mf smallint DEFAULT 0,
    adresse character varying(300),
    adresse2 character varying(100),
    adresse3 character varying(300),
    ville character varying(30),
    code_postal character varying(10),
    pays character varying(40) DEFAULT 'Tunisie'::character varying,
    nom_contact character varying(40),
    telephone character varying(20),
    fax character varying(20),
    email character varying(50),
    rib_iban character varying(50),
    swift character varying(50),
    adresse_banque character varying(100),
    code_pays_payeur character varying(8),
    modalite_paiement character varying(30),
    delai_paiement integer DEFAULT 0,
    timbre_fiscal boolean DEFAULT false,
    est_fournisseur_marchandise boolean DEFAULT true,
    a_charge_fixe boolean DEFAULT false,
    compte_comptable character varying(20),
    logo character varying(255),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fournisseurs_categorie_check CHECK (((categorie)::text = ANY ((ARRAY['personne_morale'::character varying, 'personne_physique'::character varying])::text[]))),
    CONSTRAINT fournisseurs_nature_identification_check CHECK (((nature_identification)::text = ANY ((ARRAY['mf'::character varying, 'cin'::character varying, 'passeport'::character varying, 'carte_sejour'::character varying, 'autre'::character varying])::text[]))),
    CONSTRAINT fournisseurs_type_fournisseur_check CHECK (((type_fournisseur)::text = ANY ((ARRAY['local'::character varying, 'etranger'::character varying])::text[])))
);


--
-- Name: TABLE fournisseurs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fournisseurs IS 'Table des fournisseurs de l''ERP';


--
-- Name: COLUMN fournisseurs.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fournisseurs.code IS 'Code unique auto-g├®n├®r├® (FRN001, FRN002, etc.)';


--
-- Name: COLUMN fournisseurs.type_fournisseur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fournisseurs.type_fournisseur IS 'Type: local ou etranger';


--
-- Name: COLUMN fournisseurs.categorie; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fournisseurs.categorie IS 'Cat├®gorie: personne_morale ou personne_physique';


--
-- Name: COLUMN fournisseurs.nature_identification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fournisseurs.nature_identification IS 'Type d''identification: mf, cin, passeport, carte_sejour, autre';


--
-- Name: COLUMN fournisseurs.numero_identification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fournisseurs.numero_identification IS 'Num├®ro MF, CIN, Passeport, etc.';


--
-- Name: COLUMN fournisseurs.type_mf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fournisseurs.type_mf IS 'Type de mouvement fournisseur';


--
-- Name: COLUMN fournisseurs.code_pays_payeur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fournisseurs.code_pays_payeur IS 'Code pays pour transferts bancaires';


--
-- Name: COLUMN fournisseurs.modalite_paiement; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fournisseurs.modalite_paiement IS 'Modalit├® de paiement (Ch├¿que, Virement, Comptant, etc.)';


--
-- Name: COLUMN fournisseurs.timbre_fiscal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fournisseurs.timbre_fiscal IS 'Application du timbre fiscal (true/false)';


--
-- Name: COLUMN fournisseurs.compte_comptable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fournisseurs.compte_comptable IS 'R├®f├®rence dans le plan comptable (ex: 401xxx)';


--
-- Name: fournisseurs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fournisseurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fournisseurs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fournisseurs_id_seq OWNED BY public.fournisseurs.id;


--
-- Name: industries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industries (
    id integer NOT NULL,
    libelle character varying(100) NOT NULL
);


--
-- Name: industries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.industries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: industries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.industries_id_seq OWNED BY public.industries.id;


--
-- Name: login_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_type character varying(20) NOT NULL,
    username character varying(255),
    full_name character varying(255),
    login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    logout_time timestamp without time zone,
    session_duration integer,
    ip_address character varying(45),
    user_agent text,
    device_type character varying(50),
    device_name character varying(255),
    os_name character varying(100),
    os_version character varying(50),
    browser_name character varying(100),
    browser_version character varying(50),
    latitude numeric(10,8),
    longitude numeric(11,8),
    city character varying(100),
    country character varying(100),
    login_method character varying(50) DEFAULT 'password'::character varying,
    status character varying(20) DEFAULT 'success'::character varying,
    failure_reason character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT login_history_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['personnel'::character varying, 'client'::character varying])::text[])))
);


--
-- Name: TABLE login_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.login_history IS 'Historique complet de connexion - V1.0 - 2025-12-11';


--
-- Name: COLUMN login_history.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.user_id IS 'ID du personnel ou client';


--
-- Name: COLUMN login_history.user_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.user_type IS 'Type utilisateur: personnel ou client';


--
-- Name: COLUMN login_history.session_duration; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.session_duration IS 'Dur├®e de session en secondes';


--
-- Name: COLUMN login_history.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.ip_address IS 'Adresse IP de connexion (IPv4 ou IPv6)';


--
-- Name: COLUMN login_history.login_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.login_method IS 'M├®thode de connexion utilis├®e';


--
-- Name: COLUMN login_history.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.status IS 'Statut de la connexion';


--
-- Name: login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_history_id_seq OWNED BY public.login_history.id;


--
-- Name: navires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.navires (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    libelle character varying(255) NOT NULL,
    nationalite character varying(100),
    conducteur character varying(255),
    longueur numeric(10,2),
    largeur numeric(10,2),
    tirant_air numeric(10,2),
    tirant_eau numeric(10,2),
    jauge_brute integer,
    jauge_net integer,
    code_omi character varying(50),
    pav character varying(100),
    armateur_id integer,
    statut character varying(20) DEFAULT 'actif'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_by integer
);


--
-- Name: TABLE navires; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.navires IS 'Table des navires avec relation vers les armateurs';


--
-- Name: COLUMN navires.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.code IS 'Code unique du navire (auto-g├®n├®r├®)';


--
-- Name: COLUMN navires.libelle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.libelle IS 'Nom du navire';


--
-- Name: COLUMN navires.nationalite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.nationalite IS 'Nationalit├® du navire';


--
-- Name: COLUMN navires.conducteur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.conducteur IS 'Nom du conducteur/capitaine';


--
-- Name: COLUMN navires.longueur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.longueur IS 'Longueur en m├¿tres';


--
-- Name: COLUMN navires.largeur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.largeur IS 'Largeur en m├¿tres';


--
-- Name: COLUMN navires.tirant_air; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.tirant_air IS 'Tirant d''air en m├¿tres';


--
-- Name: COLUMN navires.tirant_eau; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.tirant_eau IS 'Tirant d''eau en m├¿tres';


--
-- Name: COLUMN navires.jauge_brute; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.jauge_brute IS 'Jauge brute (tonnage brut)';


--
-- Name: COLUMN navires.jauge_net; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.jauge_net IS 'Jauge nette (tonnage net)';


--
-- Name: COLUMN navires.code_omi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.code_omi IS 'Code OMI du navire';


--
-- Name: COLUMN navires.pav; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.pav IS 'Pavillon du navire';


--
-- Name: COLUMN navires.armateur_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.navires.armateur_id IS 'ID de l''armateur propri├®taire';


--
-- Name: navires_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.navires_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: navires_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.navires_id_seq OWNED BY public.navires.id;


--
-- Name: objectif_com; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objectif_com (
    id integer NOT NULL,
    id_personnel integer NOT NULL,
    titre character varying,
    description text,
    objectif_ca numeric(15,2),
    objectif_clients integer,
    date_debut date,
    date_fin date,
    statut character varying DEFAULT 'en_cours'::character varying,
    progression numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: objectif_com_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.objectif_com_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: objectif_com_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.objectif_com_id_seq OWNED BY public.objectif_com.id;


--
-- Name: personnel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personnel (
    id integer NOT NULL,
    nom character varying(50) NOT NULL,
    prenom character varying(50) NOT NULL,
    nom_utilisateur character varying(50) NOT NULL,
    role character varying(50) NOT NULL,
    telephone character varying(20),
    email character varying(100),
    statut character varying(20) DEFAULT 'actif'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    mot_de_passe character varying(255) DEFAULT 'changeme'::character varying NOT NULL,
    keycloak_id uuid,
    genre character varying(10),
    photo character varying(255) DEFAULT NULL::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    first_login boolean DEFAULT true NOT NULL,
    auto_delete boolean DEFAULT false NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    last_location_update timestamp without time zone,
    location_tracking_enabled boolean DEFAULT false,
    location_accuracy numeric(8,2),
    location_source character varying(50) DEFAULT 'unknown'::character varying,
    is_location_active boolean DEFAULT false,
    biometric_hash character varying(500),
    biometric_enabled boolean DEFAULT false NOT NULL,
    biometric_registered_at timestamp without time zone,
    is_superviseur boolean DEFAULT false NOT NULL,
    statut_en_ligne boolean DEFAULT false,
    last_activity timestamp without time zone,
    organisation_id integer NOT NULL DEFAULT 1,
    CONSTRAINT personnel_genre_check CHECK (((genre)::text = ANY ((ARRAY['Homme'::character varying, 'Femme'::character varying])::text[])))
);


--
-- Name: COLUMN personnel.auto_delete; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.auto_delete IS 'Indique si le compte doit ├¬tre supprim├® automatiquement apr├¿s 7 jours de d├®sactivation';


--
-- Name: COLUMN personnel.latitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.latitude IS 'Latitude GPS du personnel (-90 ├á +90)';


--
-- Name: COLUMN personnel.longitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.longitude IS 'Longitude GPS du personnel (-180 ├á +180)';


--
-- Name: COLUMN personnel.last_location_update; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.last_location_update IS 'Timestamp de la derni├¿re mise ├á jour de position';


--
-- Name: COLUMN personnel.location_tracking_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.location_tracking_enabled IS 'Indique si le suivi GPS est activ├® pour ce personnel';


--
-- Name: COLUMN personnel.location_accuracy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.location_accuracy IS 'Pr├®cision de la localisation en m├¿tres';


--
-- Name: COLUMN personnel.location_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.location_source IS 'Source de la localisation (gps, network, passive)';


--
-- Name: COLUMN personnel.is_location_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.is_location_active IS 'Indique si la localisation est actuellement active (derni├¿re position < 5 min)';


--
-- Name: COLUMN personnel.biometric_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.biometric_hash IS 'Hash s├®curis├® de l''empreinte biom├®trique';


--
-- Name: COLUMN personnel.biometric_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.biometric_enabled IS 'Indique si l''authentification biom├®trique est activ├®e';


--
-- Name: COLUMN personnel.biometric_registered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.biometric_registered_at IS 'Date d''enregistrement de l''empreinte biom├®trique';


--
-- Name: COLUMN personnel.is_superviseur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.is_superviseur IS 'Indique si le personnel a le statut de superviseur. Les superviseurs peuvent cr├®er et g├®rer du personnel administratif.';


--
-- Name: COLUMN personnel.statut_en_ligne; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.statut_en_ligne IS 'Indique si l''utilisateur est actuellement connect├® (true) ou hors ligne (false)';


--
-- Name: COLUMN personnel.last_activity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.last_activity IS 'Timestamp de la derni├¿re activit├® de l''utilisateur pour g├®rer l''expiration de session';


--
-- Name: personnel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personnel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personnel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personnel_id_seq OWNED BY public.personnel.id;


--
-- Name: ports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ports (
    id integer NOT NULL,
    libelle character varying(200) NOT NULL,
    abbreviation character varying(10),
    ville character varying(100),
    pays character varying(100) NOT NULL,
    isactive boolean DEFAULT true,
    createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updatedat timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ports_id_seq OWNED BY public.ports.id;


--
-- Name: type_frais_annexes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.type_frais_annexes (
    id integer NOT NULL,
    description character varying(200) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE type_frais_annexes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.type_frais_annexes IS 'Table des types de frais annexes disponibles pour les cotations';


--
-- Name: COLUMN type_frais_annexes.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.type_frais_annexes.description IS 'Description du type de frais annexe';


--
-- Name: COLUMN type_frais_annexes.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.type_frais_annexes.is_active IS 'Indique si le type est actif/disponible';


--
-- Name: type_frais_annexes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.type_frais_annexes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: type_frais_annexes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.type_frais_annexes_id_seq OWNED BY public.type_frais_annexes.id;


--
-- Name: v_autorisations_avec_client; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_autorisations_avec_client AS
 SELECT a.id AS autorisation_id,
    a."numeroAutorisation",
    a."dateDebutValidite",
    a."dateFinValidite",
    a."dateAutorisation",
    a."typeDocument",
    a."referenceDocument",
    a."statutAutorisation",
    a.is_active AS autorisation_active,
    a.created_at AS autorisation_created_at,
    c.id AS client_id,
    c.nom AS client_nom,
    c.etat_fiscal,
    ( SELECT count(*) AS count
           FROM public."BCsusTVA" bc
          WHERE ((bc.autorisation_id = a.id) AND (bc.is_active = true))) AS nombre_bons_commande,
    ( SELECT COALESCE(sum(bc."montantBonCommande"), (0)::numeric) AS "coalesce"
           FROM public."BCsusTVA" bc
          WHERE ((bc.autorisation_id = a.id) AND (bc.is_active = true) AND ((bc.statut)::text = 'ACTIF'::text))) AS montant_total_bons
   FROM (public."AutorisationsTVA" a
     LEFT JOIN public.client c ON ((c.id = a.client_id)))
  WHERE (a.is_active = true);


--
-- Name: v_bons_commande_avec_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_bons_commande_avec_details AS
 SELECT bc.id AS bon_commande_id,
    bc."numeroBonCommande",
    bc."dateBonCommande",
    bc."montantBonCommande",
    bc.description,
    bc.statut AS bon_statut,
    bc.is_active AS bon_active,
    bc.created_at AS bon_created_at,
    a.id AS autorisation_id,
    a."numeroAutorisation",
    a."dateDebutValidite",
    a."dateFinValidite",
    a."statutAutorisation",
    c.id AS client_id,
    c.nom AS client_nom,
    c.etat_fiscal
   FROM ((public."BCsusTVA" bc
     LEFT JOIN public."AutorisationsTVA" a ON ((a.id = bc.autorisation_id)))
     LEFT JOIN public.client c ON ((c.id = a.client_id)))
  WHERE (bc.is_active = true);


--
-- Name: vechat_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vechat_conversations (
    id integer NOT NULL,
    participant1_id integer NOT NULL,
    participant1_type character varying(20) NOT NULL,
    participant2_id integer NOT NULL,
    participant2_type character varying(20) NOT NULL,
    last_message_id integer,
    last_message_at timestamp without time zone,
    unread_count_participant1 integer DEFAULT 0,
    unread_count_participant2 integer DEFAULT 0,
    is_archived_by_participant1 boolean DEFAULT false,
    is_archived_by_participant2 boolean DEFAULT false,
    is_muted_by_participant1 boolean DEFAULT false,
    is_muted_by_participant2 boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vechat_conversations_participant1_type_check CHECK (((participant1_type)::text = ANY ((ARRAY['personnel'::character varying, 'client'::character varying])::text[]))),
    CONSTRAINT vechat_conversations_participant2_type_check CHECK (((participant2_type)::text = ANY ((ARRAY['personnel'::character varying, 'client'::character varying])::text[])))
);


--
-- Name: vechat_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vechat_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vechat_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vechat_conversations_id_seq OWNED BY public.vechat_conversations.id;


--
-- Name: vechat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vechat_messages (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    sender_type character varying(20) NOT NULL,
    receiver_type character varying(20) NOT NULL,
    message text,
    message_type character varying(20) DEFAULT 'text'::character varying,
    file_url character varying(500),
    file_name character varying(255),
    file_size bigint,
    file_type character varying(100),
    is_read boolean DEFAULT false,
    is_deleted_by_sender boolean DEFAULT false,
    is_deleted_by_receiver boolean DEFAULT false,
    reply_to_message_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp without time zone,
    is_delivered boolean DEFAULT false,
    delivered_at timestamp without time zone,
    is_edited boolean DEFAULT false,
    edited_at timestamp without time zone,
    original_message text,
    location_latitude numeric(10,8),
    location_longitude numeric(11,8),
    location_accuracy numeric(10,2),
    audio_duration integer,
    audio_waveform text,
    CONSTRAINT check_delivered_before_read CHECK (((delivered_at IS NULL) OR (read_at IS NULL) OR (delivered_at <= read_at))),
    CONSTRAINT check_edited_date CHECK (((edited_at IS NULL) OR (edited_at >= created_at))),
    CONSTRAINT vechat_messages_message_type_check CHECK (((message_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'file'::character varying, 'video'::character varying, 'voice'::character varying, 'audio'::character varying, 'location'::character varying])::text[]))),
    CONSTRAINT vechat_messages_receiver_type_check CHECK (((receiver_type)::text = ANY ((ARRAY['personnel'::character varying, 'client'::character varying])::text[]))),
    CONSTRAINT vechat_messages_sender_type_check CHECK (((sender_type)::text = ANY ((ARRAY['personnel'::character varying, 'client'::character varying])::text[])))
);


--
-- Name: COLUMN vechat_messages.is_delivered; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vechat_messages.is_delivered IS 'Indique si le message a ├®t├® d├®livr├® au destinataire';


--
-- Name: COLUMN vechat_messages.delivered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vechat_messages.delivered_at IS 'Horodatage de la d├®livrance du message';


--
-- Name: COLUMN vechat_messages.is_edited; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vechat_messages.is_edited IS 'Indique si le message a ├®t├® modifi├®';


--
-- Name: COLUMN vechat_messages.edited_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vechat_messages.edited_at IS 'Horodatage de la derni├¿re modification';


--
-- Name: COLUMN vechat_messages.original_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vechat_messages.original_message IS 'Contenu original du message avant modification';


--
-- Name: COLUMN vechat_messages.location_latitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vechat_messages.location_latitude IS 'Latitude du message de localisation (degr├®s d├®cimaux)';


--
-- Name: COLUMN vechat_messages.location_longitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vechat_messages.location_longitude IS 'Longitude du message de localisation (degr├®s d├®cimaux)';


--
-- Name: COLUMN vechat_messages.location_accuracy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vechat_messages.location_accuracy IS 'Pr├®cision de la localisation en m├¿tres';


--
-- Name: COLUMN vechat_messages.audio_duration; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vechat_messages.audio_duration IS 'Dur├®e du message audio en secondes';


--
-- Name: COLUMN vechat_messages.audio_waveform; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vechat_messages.audio_waveform IS 'Donn├®es de forme d''onde audio au format JSON';


--
-- Name: vechat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vechat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vechat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vechat_messages_id_seq OWNED BY public.vechat_messages.id;


--
-- Name: view_engins_actifs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.view_engins_actifs AS
 SELECT id,
    libelle,
    conteneur_remorque,
    poids_vide,
    pied,
    description
   FROM public.engin
  WHERE (is_active = true)
  ORDER BY libelle;


--
-- Name: view_leads_by_sales; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.view_leads_by_sales AS
 SELECT p.id AS personnel_id,
    (((p.prenom)::text || ' '::text) || (p.nom)::text) AS sales_person,
    count(l.id) AS total_leads,
    count(
        CASE
            WHEN ((l.status)::text = 'new'::text) THEN 1
            ELSE NULL::integer
        END) AS new_leads,
    count(
        CASE
            WHEN ((l.status)::text = 'qualified'::text) THEN 1
            ELSE NULL::integer
        END) AS qualified_leads,
    count(
        CASE
            WHEN ((l.status)::text = 'converted'::text) THEN 1
            ELSE NULL::integer
        END) AS converted_leads,
    sum(l.estimated_value) AS total_estimated_value
   FROM (public.personnel p
     LEFT JOIN public.crm_leads l ON ((p.id = l.assigned_to)))
  WHERE (((p.role)::text = 'commercial'::text) OR ((p.role)::text = 'administratif'::text))
  GROUP BY p.id, p.prenom, p.nom;


--
-- Name: view_opportunities_pipeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.view_opportunities_pipeline AS
 SELECT stage,
    count(id) AS opportunity_count,
    sum(value) AS total_value,
    avg(probability) AS avg_probability,
    sum(((value * (probability)::numeric) / (100)::numeric)) AS weighted_value
   FROM public.crm_opportunities o
  WHERE ((stage)::text <> ALL ((ARRAY['closed_won'::character varying, 'closed_lost'::character varying])::text[]))
  GROUP BY stage
  ORDER BY
        CASE stage
            WHEN 'prospecting'::text THEN 1
            WHEN 'qualification'::text THEN 2
            WHEN 'needs_analysis'::text THEN 3
            WHEN 'proposal'::text THEN 4
            WHEN 'negotiation'::text THEN 5
            ELSE NULL::integer
        END;


--
-- Name: view_prospects_with_traffic; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.view_prospects_with_traffic AS
 SELECT id,
    uuid,
    full_name,
    email,
    phone,
    company,
    "position",
    website,
    industry,
    employee_count,
    source,
    status,
    priority,
    transport_needs,
    annual_volume,
    current_provider,
    contract_end_date,
    street,
    city,
    state,
    postal_code,
    country,
    is_local,
    assigned_to,
    estimated_value,
    tags,
    notes,
    last_contact_date,
    next_followup_date,
    qualified_date,
    converted_date,
    created_at,
    updated_at,
    created_by,
    updated_by,
    traffic,
    traffic AS traffic_type,
        CASE
            WHEN (traffic = 'import'::public.traffictype) THEN 'Import'::text
            WHEN (traffic = 'export'::public.traffictype) THEN 'Export'::text
            ELSE 'Non d├®fini'::text
        END AS traffic_label
   FROM public.crm_leads l;


--
-- Name: AutorisationsTVA id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutorisationsTVA" ALTER COLUMN id SET DEFAULT nextval('public."AutorisationsTVA_id_seq"'::regclass);


--
-- Name: BCsusTVA id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BCsusTVA" ALTER COLUMN id SET DEFAULT nextval('public."BCsusTVA_id_seq"'::regclass);


--
-- Name: aeroports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aeroports ALTER COLUMN id SET DEFAULT nextval('public.aeroports_id_seq'::regclass);


--
-- Name: armateurs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.armateurs ALTER COLUMN id SET DEFAULT nextval('public.armateurs_id_seq'::regclass);


--
-- Name: biometric_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_credentials ALTER COLUMN id SET DEFAULT nextval('public.biometric_credentials_id_seq'::regclass);


--
-- Name: client id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client ALTER COLUMN id SET DEFAULT nextval('public.client_id_seq'::regclass);


--
-- Name: contact_client id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_client ALTER COLUMN id SET DEFAULT nextval('public.contact_client_new_id_seq'::regclass);


--
-- Name: correspondants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correspondants ALTER COLUMN id SET DEFAULT nextval('public.correspondants_id_seq'::regclass);


--
-- Name: crm_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities ALTER COLUMN id SET DEFAULT nextval('public.crm_activities_id_seq'::regclass);


--
-- Name: crm_activity_participants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activity_participants ALTER COLUMN id SET DEFAULT nextval('public.crm_activity_participants_id_seq'::regclass);


--
-- Name: crm_leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_leads ALTER COLUMN id SET DEFAULT nextval('public.crm_leads_id_seq'::regclass);


--
-- Name: crm_opportunities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities ALTER COLUMN id SET DEFAULT nextval('public.crm_opportunities_id_seq'::regclass);


--
-- Name: crm_pipeline_stages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_pipeline_stages ALTER COLUMN id SET DEFAULT nextval('public.crm_pipeline_stages_id_seq'::regclass);


--
-- Name: crm_pipelines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_pipelines ALTER COLUMN id SET DEFAULT nextval('public.crm_pipelines_id_seq'::regclass);


--
-- Name: crm_quote_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quote_items ALTER COLUMN id SET DEFAULT nextval('public.crm_quote_items_id_seq'::regclass);


--
-- Name: crm_quotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes ALTER COLUMN id SET DEFAULT nextval('public.crm_quotes_id_seq'::regclass);


--
-- Name: crm_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_tags ALTER COLUMN id SET DEFAULT nextval('public.crm_tags_id_seq'::regclass);


--
-- Name: engin id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engin ALTER COLUMN id SET DEFAULT nextval('public.engin_id_seq'::regclass);


--
-- Name: fournisseurs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fournisseurs ALTER COLUMN id SET DEFAULT nextval('public.fournisseurs_id_seq'::regclass);


--
-- Name: industries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industries ALTER COLUMN id SET DEFAULT nextval('public.industries_id_seq'::regclass);


--
-- Name: login_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history ALTER COLUMN id SET DEFAULT nextval('public.login_history_id_seq'::regclass);


--
-- Name: navires id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navires ALTER COLUMN id SET DEFAULT nextval('public.navires_id_seq'::regclass);


--
-- Name: objectif_com id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectif_com ALTER COLUMN id SET DEFAULT nextval('public.objectif_com_id_seq'::regclass);


--
-- Name: personnel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel ALTER COLUMN id SET DEFAULT nextval('public.personnel_id_seq'::regclass);


--
-- Name: ports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports ALTER COLUMN id SET DEFAULT nextval('public.ports_id_seq'::regclass);


--
-- Name: type_frais_annexes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_frais_annexes ALTER COLUMN id SET DEFAULT nextval('public.type_frais_annexes_id_seq'::regclass);


--
-- Name: vechat_conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vechat_conversations ALTER COLUMN id SET DEFAULT nextval('public.vechat_conversations_id_seq'::regclass);


--
-- Name: vechat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vechat_messages ALTER COLUMN id SET DEFAULT nextval('public.vechat_messages_id_seq'::regclass);


--
-- Name: AutorisationsTVA AutorisationsTVA_numeroAutorisation_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutorisationsTVA"
    ADD CONSTRAINT "AutorisationsTVA_numeroAutorisation_key" UNIQUE ("numeroAutorisation");


--
-- Name: AutorisationsTVA AutorisationsTVA_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutorisationsTVA"
    ADD CONSTRAINT "AutorisationsTVA_pkey" PRIMARY KEY (id);


--
-- Name: BCsusTVA BCsusTVA_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BCsusTVA"
    ADD CONSTRAINT "BCsusTVA_pkey" PRIMARY KEY (id);


--
-- Name: AutorisationsTVA UQ_AutorisationsTVA_numeroAutorisation; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutorisationsTVA"
    ADD CONSTRAINT "UQ_AutorisationsTVA_numeroAutorisation" UNIQUE ("numeroAutorisation");


--
-- Name: BCsusTVA UQ_BCsusTVA_numeroBonCommande_autorisation; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BCsusTVA"
    ADD CONSTRAINT "UQ_BCsusTVA_numeroBonCommande_autorisation" UNIQUE (autorisation_id, "numeroBonCommande");


--
-- Name: aeroports aeroports_abbreviation_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aeroports
    ADD CONSTRAINT aeroports_abbreviation_key UNIQUE (abbreviation);


--
-- Name: aeroports aeroports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aeroports
    ADD CONSTRAINT aeroports_pkey PRIMARY KEY (id);


--
-- Name: armateurs armateurs_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.armateurs
    ADD CONSTRAINT armateurs_code_key UNIQUE (code);


--
-- Name: armateurs armateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.armateurs
    ADD CONSTRAINT armateurs_pkey PRIMARY KEY (id);


--
-- Name: biometric_credentials biometric_credentials_credential_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_credentials
    ADD CONSTRAINT biometric_credentials_credential_id_key UNIQUE (credential_id);


--
-- Name: biometric_credentials biometric_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_credentials
    ADD CONSTRAINT biometric_credentials_pkey PRIMARY KEY (id);


--
-- Name: client client_keycloak_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_keycloak_id_key UNIQUE (keycloak_id);


--
-- Name: client client_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_pkey PRIMARY KEY (id);


--
-- Name: contact_client contact_client_new_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_client
    ADD CONSTRAINT contact_client_new_pkey PRIMARY KEY (id);


--
-- Name: correspondants correspondants_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correspondants
    ADD CONSTRAINT correspondants_code_key UNIQUE (code);


--
-- Name: correspondants correspondants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correspondants
    ADD CONSTRAINT correspondants_pkey PRIMARY KEY (id);


--
-- Name: crm_activities crm_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_pkey PRIMARY KEY (id);


--
-- Name: crm_activities crm_activities_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_uuid_key UNIQUE (uuid);


--
-- Name: crm_activity_participants crm_activity_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activity_participants
    ADD CONSTRAINT crm_activity_participants_pkey PRIMARY KEY (id);


--
-- Name: crm_leads crm_leads_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_email_key UNIQUE (email);


--
-- Name: crm_leads crm_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_pkey PRIMARY KEY (id);


--
-- Name: crm_leads crm_leads_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_uuid_key UNIQUE (uuid);


--
-- Name: crm_opportunities crm_opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_pkey PRIMARY KEY (id);


--
-- Name: crm_opportunities crm_opportunities_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_uuid_key UNIQUE (uuid);


--
-- Name: crm_pipeline_stages crm_pipeline_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_pipeline_stages
    ADD CONSTRAINT crm_pipeline_stages_pkey PRIMARY KEY (id);


--
-- Name: crm_pipelines crm_pipelines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_pipelines
    ADD CONSTRAINT crm_pipelines_pkey PRIMARY KEY (id);


--
-- Name: crm_pipelines crm_pipelines_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_pipelines
    ADD CONSTRAINT crm_pipelines_uuid_key UNIQUE (uuid);


--
-- Name: crm_quote_items crm_quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quote_items
    ADD CONSTRAINT crm_quote_items_pkey PRIMARY KEY (id);


--
-- Name: crm_quotes crm_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_pkey PRIMARY KEY (id);


--
-- Name: crm_quotes crm_quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_quote_number_key UNIQUE (quote_number);


--
-- Name: crm_quotes crm_quotes_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_uuid_key UNIQUE (uuid);


--
-- Name: crm_tags crm_tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_tags
    ADD CONSTRAINT crm_tags_name_key UNIQUE (name);


--
-- Name: crm_tags crm_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_tags
    ADD CONSTRAINT crm_tags_pkey PRIMARY KEY (id);


--
-- Name: engin engin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engin
    ADD CONSTRAINT engin_pkey PRIMARY KEY (id);


--
-- Name: fournisseurs fournisseurs_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fournisseurs
    ADD CONSTRAINT fournisseurs_code_key UNIQUE (code);


--
-- Name: fournisseurs fournisseurs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fournisseurs
    ADD CONSTRAINT fournisseurs_pkey PRIMARY KEY (id);


--
-- Name: industries industries_libelle_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_libelle_key UNIQUE (libelle);


--
-- Name: industries industries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_pkey PRIMARY KEY (id);


--
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);


--
-- Name: navires navires_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navires
    ADD CONSTRAINT navires_code_key UNIQUE (code);


--
-- Name: navires navires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navires
    ADD CONSTRAINT navires_pkey PRIMARY KEY (id);


--
-- Name: objectif_com objectif_com_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectif_com
    ADD CONSTRAINT objectif_com_pkey PRIMARY KEY (id);


--
-- Name: personnel personnel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel
    ADD CONSTRAINT personnel_pkey PRIMARY KEY (id);


--
-- Name: ports ports_abbreviation_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_abbreviation_key UNIQUE (abbreviation);


--
-- Name: ports ports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_pkey PRIMARY KEY (id);


--
-- Name: type_frais_annexes type_frais_annexes_description_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_frais_annexes
    ADD CONSTRAINT type_frais_annexes_description_key UNIQUE (description);


--
-- Name: type_frais_annexes type_frais_annexes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_frais_annexes
    ADD CONSTRAINT type_frais_annexes_pkey PRIMARY KEY (id);


--
-- Name: vechat_conversations unique_conversation; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vechat_conversations
    ADD CONSTRAINT unique_conversation UNIQUE (participant1_id, participant1_type, participant2_id, participant2_type);


--
-- Name: vechat_conversations vechat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vechat_conversations
    ADD CONSTRAINT vechat_conversations_pkey PRIMARY KEY (id);


--
-- Name: vechat_messages vechat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vechat_messages
    ADD CONSTRAINT vechat_messages_pkey PRIMARY KEY (id);


--
-- Name: idx_activities_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_assigned_to ON public.crm_activities USING btree (assigned_to);


--
-- Name: idx_activities_assigned_to_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_assigned_to_ids ON public.crm_activities USING gin (assigned_to_ids);


--
-- Name: idx_activities_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_due_date ON public.crm_activities USING btree (due_date);


--
-- Name: idx_activities_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_lead_id ON public.crm_activities USING btree (lead_id);


--
-- Name: idx_activities_opportunity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_opportunity_id ON public.crm_activities USING btree (opportunity_id);


--
-- Name: idx_activities_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_scheduled_at ON public.crm_activities USING btree (scheduled_at);


--
-- Name: idx_activities_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_status ON public.crm_activities USING btree (status);


--
-- Name: idx_activities_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_type ON public.crm_activities USING btree (type);


--
-- Name: idx_activity_participants_activity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_participants_activity_id ON public.crm_activity_participants USING btree (activity_id);


--
-- Name: idx_activity_participants_personnel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_participants_personnel_id ON public.crm_activity_participants USING btree (personnel_id);


--
-- Name: idx_aeroports_abbreviation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aeroports_abbreviation ON public.aeroports USING btree (abbreviation);


--
-- Name: idx_aeroports_isactive; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aeroports_isactive ON public.aeroports USING btree (isactive);


--
-- Name: idx_aeroports_libelle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aeroports_libelle ON public.aeroports USING btree (libelle);


--
-- Name: idx_aeroports_pays; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aeroports_pays ON public.aeroports USING btree (pays);


--
-- Name: idx_aeroports_ville; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aeroports_ville ON public.aeroports USING btree (ville);


--
-- Name: idx_armateurs_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_armateurs_code ON public.armateurs USING btree (code);


--
-- Name: idx_armateurs_isactive; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_armateurs_isactive ON public.armateurs USING btree (isactive);


--
-- Name: idx_armateurs_nom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_armateurs_nom ON public.armateurs USING btree (nom);


--
-- Name: idx_armateurs_pays; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_armateurs_pays ON public.armateurs USING btree (pays);


--
-- Name: idx_armateurs_ville; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_armateurs_ville ON public.armateurs USING btree (ville);


--
-- Name: idx_autorisations_tva_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autorisations_tva_active ON public."AutorisationsTVA" USING btree (is_active);


--
-- Name: idx_autorisations_tva_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autorisations_tva_client ON public."AutorisationsTVA" USING btree (client_id);


--
-- Name: idx_autorisations_tva_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autorisations_tva_dates ON public."AutorisationsTVA" USING btree ("dateDebutValidite", "dateFinValidite");


--
-- Name: idx_autorisations_tva_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autorisations_tva_numero ON public."AutorisationsTVA" USING btree ("numeroAutorisation");


--
-- Name: idx_autorisations_tva_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autorisations_tva_statut ON public."AutorisationsTVA" USING btree ("statutAutorisation");


--
-- Name: idx_bcsus_tva_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bcsus_tva_active ON public."BCsusTVA" USING btree (is_active);


--
-- Name: idx_bcsus_tva_autorisation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bcsus_tva_autorisation ON public."BCsusTVA" USING btree (autorisation_id);


--
-- Name: idx_bcsus_tva_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bcsus_tva_date ON public."BCsusTVA" USING btree ("dateBonCommande");


--
-- Name: idx_bcsus_tva_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bcsus_tva_numero ON public."BCsusTVA" USING btree ("numeroBonCommande");


--
-- Name: idx_bcsus_tva_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bcsus_tva_statut ON public."BCsusTVA" USING btree (statut);


--
-- Name: idx_biometric_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biometric_client ON public.biometric_credentials USING btree (client_id) WHERE (client_id IS NOT NULL);


--
-- Name: idx_biometric_credential_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biometric_credential_id ON public.biometric_credentials USING btree (credential_id);


--
-- Name: idx_biometric_last_used; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biometric_last_used ON public.biometric_credentials USING btree (last_used_at);


--
-- Name: idx_biometric_personnel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biometric_personnel ON public.biometric_credentials USING btree (personnel_id) WHERE (personnel_id IS NOT NULL);


--
-- Name: idx_biometric_user_handle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biometric_user_handle ON public.biometric_credentials USING btree (user_handle) WHERE (user_handle IS NOT NULL);


--
-- Name: idx_client_auto_delete_statut_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_auto_delete_statut_updated_at ON public.client USING btree (auto_delete, statut, updated_at) WHERE (auto_delete = true);


--
-- Name: idx_client_charge_com_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_charge_com_ids ON public.client USING gin (charge_com_ids);


--
-- Name: idx_client_etat_fiscal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_etat_fiscal ON public.client USING btree (etat_fiscal);


--
-- Name: idx_client_first_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_first_login ON public.client USING btree (first_login);


--
-- Name: idx_client_is_fournisseur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_is_fournisseur ON public.client USING btree (is_fournisseur) WHERE (is_fournisseur = true);


--
-- Name: idx_client_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_last_activity ON public.client USING btree (last_activity);


--
-- Name: idx_client_photo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_photo ON public.client USING btree (photo);


--
-- Name: idx_client_statut_en_ligne; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_statut_en_ligne ON public.client USING btree (statut_en_ligne);


--
-- Name: idx_client_statut_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_statut_updated_at ON public.client USING btree (statut, updated_at);


--
-- Name: idx_clients_is_permanent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_is_permanent ON public.client USING btree (is_permanent);


--
-- Name: COLUMN client.organisation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';


--
-- Name: idx_client_organisation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_organisation_id ON public.client USING btree (organisation_id);


--
-- Name: idx_client_org_id_fiscal; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_client_org_id_fiscal ON public.client USING btree (organisation_id, id_fiscal) WHERE ((id_fiscal IS NOT NULL) AND (btrim((id_fiscal)::text) <> ''::text));


--
-- Name: idx_client_org_c_douane; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_client_org_c_douane ON public.client USING btree (organisation_id, c_douane) WHERE ((c_douane IS NOT NULL) AND (btrim((c_douane)::text) <> ''::text));


--
-- Name: idx_client_org_iban; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_client_org_iban ON public.client USING btree (organisation_id, iban) WHERE ((iban IS NOT NULL) AND (btrim((iban)::text) <> ''::text));


--
-- Name: idx_client_org_compte_cpt; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_client_org_compte_cpt ON public.client USING btree (organisation_id, compte_cpt) WHERE ((compte_cpt IS NOT NULL) AND (btrim((compte_cpt)::text) <> ''::text));


--
-- Name: idx_contact_client_id_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_client_id_client ON public.contact_client USING btree (id_client);


--
-- Name: idx_contact_client_is_principal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_client_is_principal ON public.contact_client USING btree (is_principal);


--
-- Name: idx_contact_client_mail1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_client_mail1 ON public.contact_client USING btree (mail1);


--
-- Name: idx_contact_client_mail2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_client_mail2 ON public.contact_client USING btree (mail2);


--
-- Name: idx_correspondants_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correspondants_code ON public.correspondants USING btree (code);


--
-- Name: idx_correspondants_libelle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correspondants_libelle ON public.correspondants USING btree (libelle);


--
-- Name: idx_correspondants_nature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correspondants_nature ON public.correspondants USING btree (nature);


--
-- Name: idx_correspondants_pays; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correspondants_pays ON public.correspondants USING btree (pays);


--
-- Name: idx_correspondants_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correspondants_statut ON public.correspondants USING btree (statut);


--
-- Name: idx_correspondants_ville; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correspondants_ville ON public.correspondants USING btree (ville);


--
-- Name: idx_crm_quotes_aeroport_enlevement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_quotes_aeroport_enlevement_id ON public.crm_quotes USING btree (aeroport_enlevement_id);


--
-- Name: idx_crm_quotes_aeroport_livraison_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_quotes_aeroport_livraison_id ON public.crm_quotes USING btree (aeroport_livraison_id);


--
-- Name: idx_crm_quotes_armateur_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_quotes_armateur_id ON public.crm_quotes USING btree (armateur_id);


--
-- Name: idx_crm_quotes_navire_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_quotes_navire_id ON public.crm_quotes USING btree (navire_id);


--
-- Name: idx_crm_quotes_port_enlevement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_quotes_port_enlevement_id ON public.crm_quotes USING btree (port_enlevement_id);


--
-- Name: idx_crm_quotes_port_livraison_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_quotes_port_livraison_id ON public.crm_quotes USING btree (port_livraison_id);


--
-- Name: idx_crm_quotes_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_quotes_type ON public.crm_quotes USING btree (type);


--
-- Name: idx_crm_quotes_organisation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_quotes_organisation_id ON public.crm_quotes USING btree (organisation_id);


--
-- Name: idx_engin_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engin_is_active ON public.engin USING btree (is_active);


--
-- Name: idx_engin_libelle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engin_libelle ON public.engin USING btree (libelle);


--
-- Name: idx_fournisseurs_categorie; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fournisseurs_categorie ON public.fournisseurs USING btree (categorie);


--
-- Name: idx_fournisseurs_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fournisseurs_code ON public.fournisseurs USING btree (code);


--
-- Name: idx_fournisseurs_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fournisseurs_is_active ON public.fournisseurs USING btree (is_active);


--
-- Name: idx_fournisseurs_nom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fournisseurs_nom ON public.fournisseurs USING btree (nom);


--
-- Name: idx_fournisseurs_numero_identification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fournisseurs_numero_identification ON public.fournisseurs USING btree (numero_identification);


--
-- Name: idx_fournisseurs_pays; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fournisseurs_pays ON public.fournisseurs USING btree (pays);


--
-- Name: idx_fournisseurs_type_fournisseur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fournisseurs_type_fournisseur ON public.fournisseurs USING btree (type_fournisseur);


--
-- Name: idx_fournisseurs_ville; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fournisseurs_ville ON public.fournisseurs USING btree (ville);


--
-- Name: idx_leads_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_assigned_to ON public.crm_leads USING btree (assigned_to);


--
-- Name: idx_leads_assigned_to_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_assigned_to_ids ON public.crm_leads USING gin (assigned_to_ids);


--
-- Name: idx_leads_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_company ON public.crm_leads USING btree (company);


--
-- Name: idx_leads_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_country ON public.crm_leads USING btree (country);


--
-- Name: idx_leads_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_created_at ON public.crm_leads USING btree (created_at);


--
-- Name: idx_leads_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_currency ON public.crm_leads USING btree (currency);


--
-- Name: idx_leads_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_deleted_at ON public.crm_leads USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_leads_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_email ON public.crm_leads USING btree (email);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_status ON public.crm_leads USING btree (status);


--
-- Name: idx_leads_traffic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_traffic ON public.crm_leads USING btree (traffic);


--
-- Name: idx_login_history_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_history_client ON public.login_history USING btree (user_id) WHERE ((user_type)::text = 'client'::text);


--
-- Name: idx_login_history_login_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_history_login_time ON public.login_history USING btree (login_time DESC);


--
-- Name: idx_login_history_personnel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_history_personnel ON public.login_history USING btree (user_id) WHERE ((user_type)::text = 'personnel'::text);


--
-- Name: idx_login_history_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_history_status ON public.login_history USING btree (status);


--
-- Name: idx_login_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_history_user ON public.login_history USING btree (user_id, user_type);


--
-- Name: idx_navires_armateur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navires_armateur ON public.navires USING btree (armateur_id);


--
-- Name: idx_navires_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navires_code ON public.navires USING btree (code);


--
-- Name: idx_navires_libelle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navires_libelle ON public.navires USING btree (libelle);


--
-- Name: idx_navires_nationalite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navires_nationalite ON public.navires USING btree (nationalite);


--
-- Name: idx_navires_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_navires_statut ON public.navires USING btree (statut);


--
-- Name: idx_objectif_com_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectif_com_is_active ON public.objectif_com USING btree (is_active);


--
-- Name: idx_objectif_com_personnel_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectif_com_personnel_active ON public.objectif_com USING btree (id_personnel, is_active);


--
-- Name: idx_opportunities_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_assigned_to ON public.crm_opportunities USING btree (assigned_to);


--
-- Name: idx_opportunities_assigned_to_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_assigned_to_ids ON public.crm_opportunities USING gin (assigned_to_ids);


--
-- Name: idx_opportunities_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_currency ON public.crm_opportunities USING btree (currency);


--
-- Name: idx_opportunities_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_deleted_at ON public.crm_opportunities USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_opportunities_expected_close_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_expected_close_date ON public.crm_opportunities USING btree (expected_close_date);


--
-- Name: idx_opportunities_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_stage ON public.crm_opportunities USING btree (stage);


--
-- Name: idx_opportunities_traffic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_traffic ON public.crm_opportunities USING btree (traffic);


--
-- Name: idx_opportunities_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_value ON public.crm_opportunities USING btree (value);


--
-- Name: idx_personnel_auto_delete_statut_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personnel_auto_delete_statut_updated_at ON public.personnel USING btree (auto_delete, statut, updated_at) WHERE (auto_delete = true);


--
-- Name: idx_personnel_first_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personnel_first_login ON public.personnel USING btree (first_login);


--
-- Name: idx_personnel_geolocation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personnel_geolocation ON public.personnel USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_personnel_is_superviseur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personnel_is_superviseur ON public.personnel USING btree (is_superviseur);


--
-- Name: idx_personnel_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personnel_last_activity ON public.personnel USING btree (last_activity);


--
-- Name: idx_personnel_last_location_update; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personnel_last_location_update ON public.personnel USING btree (last_location_update DESC) WHERE (last_location_update IS NOT NULL);


--
-- Name: idx_personnel_location_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personnel_location_tracking ON public.personnel USING btree (location_tracking_enabled, is_location_active) WHERE (location_tracking_enabled = true);


--
-- Name: idx_personnel_photo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personnel_photo ON public.personnel USING btree (photo);


--
-- Name: idx_personnel_role_superviseur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personnel_role_superviseur ON public.personnel USING btree (role, is_superviseur);


--
-- Name: idx_personnel_statut_en_ligne; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personnel_statut_en_ligne ON public.personnel USING btree (statut_en_ligne);


--
-- Name: COLUMN personnel.organisation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personnel.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';


--
-- Name: idx_personnel_organisation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personnel_organisation_id ON public.personnel USING btree (organisation_id);


--
-- Name: idx_personnel_org_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_personnel_org_username ON public.personnel USING btree (organisation_id, nom_utilisateur);


--
-- Name: idx_personnel_org_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_personnel_org_email ON public.personnel USING btree (organisation_id, email) WHERE ((email IS NOT NULL) AND (btrim((email)::text) <> ''::text));


--
-- Name: idx_pipeline_stages_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pipeline_stages_order ON public.crm_pipeline_stages USING btree (stage_order);


--
-- Name: idx_pipeline_stages_pipeline_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pipeline_stages_pipeline_id ON public.crm_pipeline_stages USING btree (pipeline_id);


--
-- Name: idx_ports_abbreviation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ports_abbreviation ON public.ports USING btree (abbreviation);


--
-- Name: idx_ports_isactive; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ports_isactive ON public.ports USING btree (isactive);


--
-- Name: idx_ports_libelle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ports_libelle ON public.ports USING btree (libelle);


--
-- Name: idx_ports_pays; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ports_pays ON public.ports USING btree (pays);


--
-- Name: idx_ports_ville; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ports_ville ON public.ports USING btree (ville);


--
-- Name: idx_quote_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_items_category ON public.crm_quote_items USING btree (category);


--
-- Name: idx_quote_items_destination_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_items_destination_city ON public.crm_quote_items USING btree (destination_city);


--
-- Name: idx_quote_items_item_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_items_item_type ON public.crm_quote_items USING btree (item_type);


--
-- Name: idx_quote_items_line_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_items_line_order ON public.crm_quote_items USING btree (line_order);


--
-- Name: idx_quote_items_origin_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_items_origin_city ON public.crm_quote_items USING btree (origin_city);


--
-- Name: idx_quote_items_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_items_quote_id ON public.crm_quote_items USING btree (quote_id);


--
-- Name: idx_quote_items_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_items_unit ON public.crm_quote_items USING btree (unit);


--
-- Name: idx_quotes_client_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_client_type ON public.crm_quotes USING btree (client_type);


--
-- Name: idx_quotes_commercial_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_commercial_id ON public.crm_quotes USING btree (commercial_id);


--
-- Name: idx_quotes_commercial_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_commercial_ids ON public.crm_quotes USING gin (commercial_ids);


--
-- Name: idx_quotes_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_country ON public.crm_quotes USING btree (country);


--
-- Name: idx_quotes_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_created_by ON public.crm_quotes USING btree (created_by);


--
-- Name: idx_quotes_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_deleted_at ON public.crm_quotes USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_quotes_quote_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_quote_number ON public.crm_quotes USING btree (quote_number);


--
-- Name: idx_quotes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_status ON public.crm_quotes USING btree (status);


--
-- Name: idx_quotes_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_updated_by ON public.crm_quotes USING btree (updated_by);


--
-- Name: idx_quotes_valid_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_valid_until ON public.crm_quotes USING btree (valid_until);


--
-- Name: idx_quotes_vehicle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_vehicle_id ON public.crm_quotes USING btree (vehicle_id);


--
-- Name: idx_type_frais_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_type_frais_active ON public.type_frais_annexes USING btree (is_active);


--
-- Name: idx_vechat_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_conversation ON public.vechat_messages USING btree (sender_id, receiver_id, sender_type, receiver_type);


--
-- Name: idx_vechat_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_created_at ON public.vechat_messages USING btree (created_at);


--
-- Name: idx_vechat_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_last_message ON public.vechat_conversations USING btree (last_message_at);


--
-- Name: idx_vechat_messages_audio_duration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_messages_audio_duration ON public.vechat_messages USING btree (audio_duration) WHERE (audio_duration IS NOT NULL);


--
-- Name: idx_vechat_messages_delivered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_messages_delivered ON public.vechat_messages USING btree (is_delivered);


--
-- Name: idx_vechat_messages_edited; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_messages_edited ON public.vechat_messages USING btree (is_edited);


--
-- Name: idx_vechat_messages_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_messages_location ON public.vechat_messages USING btree (location_latitude, location_longitude) WHERE ((location_latitude IS NOT NULL) AND (location_longitude IS NOT NULL));


--
-- Name: idx_vechat_messages_message_type_audio_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_messages_message_type_audio_location ON public.vechat_messages USING btree (message_type) WHERE ((message_type)::text = ANY ((ARRAY['audio'::character varying, 'location'::character varying])::text[]));


--
-- Name: idx_vechat_participant1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_participant1 ON public.vechat_conversations USING btree (participant1_id, participant1_type);


--
-- Name: idx_vechat_participant2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_participant2 ON public.vechat_conversations USING btree (participant2_id, participant2_type);


--
-- Name: idx_vechat_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_receiver ON public.vechat_messages USING btree (receiver_id, receiver_type);


--
-- Name: idx_vechat_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_sender ON public.vechat_messages USING btree (sender_id, sender_type);


--
-- Name: idx_vechat_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vechat_unread ON public.vechat_messages USING btree (receiver_id, receiver_type, is_read);


--
-- Name: AutorisationsTVA trg_autorisations_tva_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_autorisations_tva_updated BEFORE UPDATE ON public."AutorisationsTVA" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: BCsusTVA trg_bcsus_tva_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bcsus_tva_updated BEFORE UPDATE ON public."BCsusTVA" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: crm_quotes trg_update_lead_status_on_quote_accepted; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_lead_status_on_quote_accepted AFTER INSERT OR UPDATE OF status ON public.crm_quotes FOR EACH ROW EXECUTE FUNCTION public.update_lead_status_on_quote_accepted();


--
-- Name: TRIGGER trg_update_lead_status_on_quote_accepted ON crm_quotes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trg_update_lead_status_on_quote_accepted ON public.crm_quotes IS 'Trigger qui d├®clenche la mise ├á jour du statut prospect automatiquement lors de l''acceptation d''une cotation';


--
-- Name: vechat_messages trg_vechat_update_conversation_after_message_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_vechat_update_conversation_after_message_insert AFTER INSERT ON public.vechat_messages FOR EACH ROW EXECUTE FUNCTION public.trg_update_conversation_after_message_insert();


--
-- Name: vechat_messages trg_vechat_update_conversation_after_message_read; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_vechat_update_conversation_after_message_read AFTER UPDATE ON public.vechat_messages FOR EACH ROW EXECUTE FUNCTION public.trg_update_conversation_after_message_read();


--
-- Name: crm_activities trigger_activities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_activities_updated_at BEFORE UPDATE ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: correspondants trigger_generate_correspondant_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_correspondant_code BEFORE INSERT ON public.correspondants FOR EACH ROW EXECUTE FUNCTION public.generate_correspondant_code();


--
-- Name: crm_leads trigger_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_leads_updated_at BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: crm_opportunities trigger_opportunities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_opportunities_updated_at BEFORE UPDATE ON public.crm_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: crm_pipeline_stages trigger_pipeline_stages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_pipeline_stages_updated_at BEFORE UPDATE ON public.crm_pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: crm_pipelines trigger_pipelines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_pipelines_updated_at BEFORE UPDATE ON public.crm_pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: crm_quotes trigger_quotes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_quotes_updated_at BEFORE UPDATE ON public.crm_quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: armateurs trigger_update_armateurs_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_armateurs_timestamp BEFORE UPDATE ON public.armateurs FOR EACH ROW EXECUTE FUNCTION public.update_armateurs_updated_at();


--
-- Name: correspondants trigger_update_correspondants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_correspondants_updated_at BEFORE UPDATE ON public.correspondants FOR EACH ROW EXECUTE FUNCTION public.update_correspondants_updated_at();


--
-- Name: fournisseurs trigger_update_fournisseurs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_fournisseurs_updated_at BEFORE UPDATE ON public.fournisseurs FOR EACH ROW EXECUTE FUNCTION public.update_fournisseurs_updated_at();


--
-- Name: login_history trigger_update_login_history_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_login_history_updated_at BEFORE UPDATE ON public.login_history FOR EACH ROW EXECUTE FUNCTION public.update_login_history_updated_at();


--
-- Name: type_frais_annexes trigger_update_type_frais_annexes_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_type_frais_annexes_timestamp BEFORE UPDATE ON public.type_frais_annexes FOR EACH ROW EXECUTE FUNCTION public.update_type_frais_annexes_timestamp();


--
-- Name: aeroports update_aeroports_updatedat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_aeroports_updatedat BEFORE UPDATE ON public.aeroports FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: ports update_ports_updatedat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ports_updatedat BEFORE UPDATE ON public.ports FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: AutorisationsTVA FK_AutorisationsTVA_Client; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutorisationsTVA"
    ADD CONSTRAINT "FK_AutorisationsTVA_Client" FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- Name: BCsusTVA FK_BCsusTVA_Autorisation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BCsusTVA"
    ADD CONSTRAINT "FK_BCsusTVA_Autorisation" FOREIGN KEY (autorisation_id) REFERENCES public."AutorisationsTVA"(id) ON DELETE CASCADE;


--
-- Name: contact_client contact_client_new_id_client_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_client
    ADD CONSTRAINT contact_client_new_id_client_fkey FOREIGN KEY (id_client) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- Name: crm_activities crm_activities_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.personnel(id);


--
-- Name: crm_activities crm_activities_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: crm_activities crm_activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: crm_activities crm_activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id);


--
-- Name: crm_activities crm_activities_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.crm_opportunities(id);


--
-- Name: crm_activities crm_activities_parent_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_parent_activity_id_fkey FOREIGN KEY (parent_activity_id) REFERENCES public.crm_activities(id);


--
-- Name: crm_activities crm_activities_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.crm_quotes(id);


--
-- Name: crm_activity_participants crm_activity_participants_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activity_participants
    ADD CONSTRAINT crm_activity_participants_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.crm_activities(id) ON DELETE CASCADE;


--
-- Name: crm_activity_participants crm_activity_participants_personnel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_activity_participants
    ADD CONSTRAINT crm_activity_participants_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES public.personnel(id);


--
-- Name: crm_leads crm_leads_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.personnel(id);


--
-- Name: crm_leads crm_leads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: crm_leads crm_leads_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.personnel(id);


--
-- Name: crm_opportunities crm_opportunities_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.personnel(id);


--
-- Name: crm_opportunities crm_opportunities_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: crm_opportunities crm_opportunities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: crm_opportunities crm_opportunities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id);


--
-- Name: crm_opportunities crm_opportunities_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.personnel(id);


--
-- Name: crm_pipeline_stages crm_pipeline_stages_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_pipeline_stages
    ADD CONSTRAINT crm_pipeline_stages_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.crm_pipelines(id) ON DELETE CASCADE;


--
-- Name: crm_pipelines crm_pipelines_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_pipelines
    ADD CONSTRAINT crm_pipelines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: crm_quote_items crm_quote_items_engin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quote_items
    ADD CONSTRAINT crm_quote_items_engin_id_fkey FOREIGN KEY (engin_id) REFERENCES public.engin(id);


--
-- Name: crm_quote_items crm_quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quote_items
    ADD CONSTRAINT crm_quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.crm_quotes(id) ON DELETE CASCADE;


--
-- Name: crm_quotes crm_quotes_aeroport_enlevement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_aeroport_enlevement_id_fkey FOREIGN KEY (aeroport_enlevement_id) REFERENCES public.aeroports(id) ON DELETE SET NULL;


--
-- Name: crm_quotes crm_quotes_aeroport_livraison_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_aeroport_livraison_id_fkey FOREIGN KEY (aeroport_livraison_id) REFERENCES public.aeroports(id) ON DELETE SET NULL;


--
-- Name: crm_quotes crm_quotes_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.personnel(id);


--
-- Name: crm_quotes crm_quotes_armateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_armateur_id_fkey FOREIGN KEY (armateur_id) REFERENCES public.armateurs(id) ON DELETE SET NULL;


--
-- Name: crm_quotes crm_quotes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: crm_quotes crm_quotes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: crm_quotes crm_quotes_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id);


--
-- Name: crm_quotes crm_quotes_navire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_navire_id_fkey FOREIGN KEY (navire_id) REFERENCES public.navires(id) ON DELETE SET NULL;


--
-- Name: crm_quotes crm_quotes_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.crm_opportunities(id);


--
-- Name: crm_quotes crm_quotes_port_enlevement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_port_enlevement_id_fkey FOREIGN KEY (port_enlevement_id) REFERENCES public.ports(id) ON DELETE SET NULL;


--
-- Name: crm_quotes crm_quotes_port_livraison_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_port_livraison_id_fkey FOREIGN KEY (port_livraison_id) REFERENCES public.ports(id) ON DELETE SET NULL;


--
-- Name: crm_tags crm_tags_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_tags
    ADD CONSTRAINT crm_tags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: biometric_credentials fk_biometric_client; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_credentials
    ADD CONSTRAINT fk_biometric_client FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- Name: biometric_credentials fk_biometric_personnel; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_credentials
    ADD CONSTRAINT fk_biometric_personnel FOREIGN KEY (personnel_id) REFERENCES public.personnel(id) ON DELETE CASCADE;


--
-- Name: crm_leads fk_leads_archived_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT fk_leads_archived_by FOREIGN KEY (archived_by) REFERENCES public.personnel(id) ON DELETE SET NULL;


--
-- Name: navires fk_navire_armateur; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navires
    ADD CONSTRAINT fk_navire_armateur FOREIGN KEY (armateur_id) REFERENCES public.armateurs(id) ON DELETE SET NULL;


--
-- Name: objectif_com fk_objectif_personnel; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectif_com
    ADD CONSTRAINT fk_objectif_personnel FOREIGN KEY (id_personnel) REFERENCES public.personnel(id) ON DELETE CASCADE;


--
-- Name: crm_opportunities fk_opportunities_archived_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT fk_opportunities_archived_by FOREIGN KEY (archived_by) REFERENCES public.personnel(id) ON DELETE SET NULL;


--
-- Name: crm_quotes fk_quotes_archived_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT fk_quotes_archived_by FOREIGN KEY (archived_by) REFERENCES public.personnel(id) ON DELETE SET NULL;


--
-- Name: crm_quotes fk_quotes_commercial; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT fk_quotes_commercial FOREIGN KEY (commercial_id) REFERENCES public.personnel(id) ON DELETE SET NULL;


--
-- Name: crm_quotes fk_quotes_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT fk_quotes_updated_by FOREIGN KEY (updated_by) REFERENCES public.personnel(id) ON DELETE SET NULL;


--
-- Name: crm_quotes fk_quotes_vehicle; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT fk_quotes_vehicle FOREIGN KEY (vehicle_id) REFERENCES public.engin(id) ON DELETE SET NULL;


--
-- Name: vechat_conversations vechat_conversations_last_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vechat_conversations
    ADD CONSTRAINT vechat_conversations_last_message_id_fkey FOREIGN KEY (last_message_id) REFERENCES public.vechat_messages(id) ON DELETE SET NULL;


--
-- Name: vechat_messages vechat_messages_reply_to_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vechat_messages
    ADD CONSTRAINT vechat_messages_reply_to_message_id_fkey FOREIGN KEY (reply_to_message_id) REFERENCES public.vechat_messages(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict gQojIvhwNuzUAqSTEOhx6QXU777C7IBSWfxl8N5sJULxz0GHS5crLSiWtS3hUg0

