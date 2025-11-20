--
-- PostgreSQL database dump
--

\restrict IVEYjmzbrCwwg1Yxib7igu7bpUATU4uIqwbMKD87pVLJddL9LSaVHXNHM2yCOLj

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
-- Name: keycloak; Type: SCHEMA; Schema: -; Owner: msp
--

CREATE SCHEMA keycloak;


ALTER SCHEMA keycloak OWNER TO msp;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: traffictype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.traffictype AS ENUM (
    'import',
    'export'
);


ALTER TYPE public.traffictype OWNER TO postgres;

--
-- Name: TYPE traffictype; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TYPE public.traffictype IS 'Enum pour définir le sens du traffic: import/export';


--
-- Name: generate_correspondant_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_correspondant_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  next_number INTEGER;
  new_code VARCHAR(50);
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    -- Trouver le prochain numéro disponible
    SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1
    INTO next_number
    FROM correspondants
    WHERE code ~ '^COR[0-9]+$';
    
    -- Générer le code avec padding
    new_code := 'COR' || LPAD(next_number::TEXT, 6, '0');
    NEW.code := new_code;
  END IF;
  
  RETURN NEW;
END;
$_$;


ALTER FUNCTION public.generate_correspondant_code() OWNER TO postgres;

--
-- Name: trg_update_conversation_after_message_insert(); Type: FUNCTION; Schema: public; Owner: postgres
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
    
    -- Insérer ou mettre à jour la conversation
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


ALTER FUNCTION public.trg_update_conversation_after_message_insert() OWNER TO postgres;

--
-- Name: trg_update_conversation_after_message_read(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.trg_update_conversation_after_message_read() OWNER TO postgres;

--
-- Name: update_armateurs_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_armateurs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updatedat = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_armateurs_updated_at() OWNER TO postgres;

--
-- Name: update_correspondant_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_correspondant_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_correspondant_updated_at() OWNER TO postgres;

--
-- Name: update_correspondants_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_correspondants_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_correspondants_updated_at() OWNER TO postgres;

--
-- Name: update_fournisseurs_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_fournisseurs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_fournisseurs_updated_at() OWNER TO postgres;

--
-- Name: update_lead_status_on_quote_accepted(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_lead_status_on_quote_accepted() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Vérifier si la cotation vient d'être acceptée
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        
        -- Mettre à jour le statut du prospect si un lead_id existe
        IF NEW.lead_id IS NOT NULL THEN
            UPDATE crm_leads 
            SET 
                status = 'client',
                updated_at = NOW()
            WHERE id = NEW.lead_id;
            
            RAISE NOTICE 'Prospect #% mis à jour vers statut CLIENT suite à acceptation cotation #%', 
                NEW.lead_id, NEW.id;
        END IF;
        
        -- Mettre à jour le prospect via l'opportunité si elle existe
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
            
            RAISE NOTICE 'Prospect mis à jour vers statut CLIENT via opportunité #% suite à acceptation cotation #%', 
                NEW.opportunity_id, NEW.id;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_lead_status_on_quote_accepted() OWNER TO postgres;

--
-- Name: FUNCTION update_lead_status_on_quote_accepted(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_lead_status_on_quote_accepted() IS 'Fonction trigger qui met automatiquement à jour le statut d''un prospect vers CLIENT lorsqu''une cotation est acceptée';


--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updatedat = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

--
-- Name: update_type_frais_annexes_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_type_frais_annexes_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_type_frais_annexes_timestamp() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_event_entity; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.admin_event_entity (
    id character varying(36) NOT NULL,
    admin_event_time bigint,
    realm_id character varying(255),
    operation_type character varying(255),
    auth_realm_id character varying(255),
    auth_client_id character varying(255),
    auth_user_id character varying(255),
    ip_address character varying(255),
    resource_path character varying(2550),
    representation text,
    error character varying(255),
    resource_type character varying(64),
    details_json text
);


ALTER TABLE keycloak.admin_event_entity OWNER TO msp;

--
-- Name: associated_policy; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.associated_policy (
    policy_id character varying(36) NOT NULL,
    associated_policy_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.associated_policy OWNER TO msp;

--
-- Name: authentication_execution; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.authentication_execution (
    id character varying(36) NOT NULL,
    alias character varying(255),
    authenticator character varying(36),
    realm_id character varying(36),
    flow_id character varying(36),
    requirement integer,
    priority integer,
    authenticator_flow boolean DEFAULT false NOT NULL,
    auth_flow_id character varying(36),
    auth_config character varying(36)
);


ALTER TABLE keycloak.authentication_execution OWNER TO msp;

--
-- Name: authentication_flow; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.authentication_flow (
    id character varying(36) NOT NULL,
    alias character varying(255),
    description character varying(255),
    realm_id character varying(36),
    provider_id character varying(36) DEFAULT 'basic-flow'::character varying NOT NULL,
    top_level boolean DEFAULT false NOT NULL,
    built_in boolean DEFAULT false NOT NULL
);


ALTER TABLE keycloak.authentication_flow OWNER TO msp;

--
-- Name: authenticator_config; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.authenticator_config (
    id character varying(36) NOT NULL,
    alias character varying(255),
    realm_id character varying(36)
);


ALTER TABLE keycloak.authenticator_config OWNER TO msp;

--
-- Name: authenticator_config_entry; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.authenticator_config_entry (
    authenticator_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.authenticator_config_entry OWNER TO msp;

--
-- Name: broker_link; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.broker_link (
    identity_provider character varying(255) NOT NULL,
    storage_provider_id character varying(255),
    realm_id character varying(36) NOT NULL,
    broker_user_id character varying(255),
    broker_username character varying(255),
    token text,
    user_id character varying(255) NOT NULL
);


ALTER TABLE keycloak.broker_link OWNER TO msp;

--
-- Name: client; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.client (
    id character varying(36) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    full_scope_allowed boolean DEFAULT false NOT NULL,
    client_id character varying(255),
    not_before integer,
    public_client boolean DEFAULT false NOT NULL,
    secret character varying(255),
    base_url character varying(255),
    bearer_only boolean DEFAULT false NOT NULL,
    management_url character varying(255),
    surrogate_auth_required boolean DEFAULT false NOT NULL,
    realm_id character varying(36),
    protocol character varying(255),
    node_rereg_timeout integer DEFAULT 0,
    frontchannel_logout boolean DEFAULT false NOT NULL,
    consent_required boolean DEFAULT false NOT NULL,
    name character varying(255),
    service_accounts_enabled boolean DEFAULT false NOT NULL,
    client_authenticator_type character varying(255),
    root_url character varying(255),
    description character varying(255),
    registration_token character varying(255),
    standard_flow_enabled boolean DEFAULT true NOT NULL,
    implicit_flow_enabled boolean DEFAULT false NOT NULL,
    direct_access_grants_enabled boolean DEFAULT false NOT NULL,
    always_display_in_console boolean DEFAULT false NOT NULL
);


ALTER TABLE keycloak.client OWNER TO msp;

--
-- Name: client_attributes; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.client_attributes (
    client_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


ALTER TABLE keycloak.client_attributes OWNER TO msp;

--
-- Name: client_auth_flow_bindings; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.client_auth_flow_bindings (
    client_id character varying(36) NOT NULL,
    flow_id character varying(36),
    binding_name character varying(255) NOT NULL
);


ALTER TABLE keycloak.client_auth_flow_bindings OWNER TO msp;

--
-- Name: client_initial_access; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.client_initial_access (
    id character varying(36) NOT NULL,
    realm_id character varying(36) NOT NULL,
    "timestamp" integer,
    expiration integer,
    count integer,
    remaining_count integer
);


ALTER TABLE keycloak.client_initial_access OWNER TO msp;

--
-- Name: client_node_registrations; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.client_node_registrations (
    client_id character varying(36) NOT NULL,
    value integer,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.client_node_registrations OWNER TO msp;

--
-- Name: client_scope; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.client_scope (
    id character varying(36) NOT NULL,
    name character varying(255),
    realm_id character varying(36),
    description character varying(255),
    protocol character varying(255)
);


ALTER TABLE keycloak.client_scope OWNER TO msp;

--
-- Name: client_scope_attributes; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.client_scope_attributes (
    scope_id character varying(36) NOT NULL,
    value character varying(2048),
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.client_scope_attributes OWNER TO msp;

--
-- Name: client_scope_client; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.client_scope_client (
    client_id character varying(255) NOT NULL,
    scope_id character varying(255) NOT NULL,
    default_scope boolean DEFAULT false NOT NULL
);


ALTER TABLE keycloak.client_scope_client OWNER TO msp;

--
-- Name: client_scope_role_mapping; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.client_scope_role_mapping (
    scope_id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.client_scope_role_mapping OWNER TO msp;

--
-- Name: component; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.component (
    id character varying(36) NOT NULL,
    name character varying(255),
    parent_id character varying(36),
    provider_id character varying(36),
    provider_type character varying(255),
    realm_id character varying(36),
    sub_type character varying(255)
);


ALTER TABLE keycloak.component OWNER TO msp;

--
-- Name: component_config; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.component_config (
    id character varying(36) NOT NULL,
    component_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


ALTER TABLE keycloak.component_config OWNER TO msp;

--
-- Name: composite_role; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.composite_role (
    composite character varying(36) NOT NULL,
    child_role character varying(36) NOT NULL
);


ALTER TABLE keycloak.composite_role OWNER TO msp;

--
-- Name: credential; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.credential (
    id character varying(36) NOT NULL,
    salt bytea,
    type character varying(255),
    user_id character varying(36),
    created_date bigint,
    user_label character varying(255),
    secret_data text,
    credential_data text,
    priority integer
);


ALTER TABLE keycloak.credential OWNER TO msp;

--
-- Name: databasechangelog; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.databasechangelog (
    id character varying(255) NOT NULL,
    author character varying(255) NOT NULL,
    filename character varying(255) NOT NULL,
    dateexecuted timestamp without time zone NOT NULL,
    orderexecuted integer NOT NULL,
    exectype character varying(10) NOT NULL,
    md5sum character varying(35),
    description character varying(255),
    comments character varying(255),
    tag character varying(255),
    liquibase character varying(20),
    contexts character varying(255),
    labels character varying(255),
    deployment_id character varying(10)
);


ALTER TABLE keycloak.databasechangelog OWNER TO msp;

--
-- Name: databasechangeloglock; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.databasechangeloglock (
    id integer NOT NULL,
    locked boolean NOT NULL,
    lockgranted timestamp without time zone,
    lockedby character varying(255)
);


ALTER TABLE keycloak.databasechangeloglock OWNER TO msp;

--
-- Name: default_client_scope; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.default_client_scope (
    realm_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL,
    default_scope boolean DEFAULT false NOT NULL
);


ALTER TABLE keycloak.default_client_scope OWNER TO msp;

--
-- Name: event_entity; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.event_entity (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    details_json character varying(2550),
    error character varying(255),
    ip_address character varying(255),
    realm_id character varying(255),
    session_id character varying(255),
    event_time bigint,
    type character varying(255),
    user_id character varying(255),
    details_json_long_value text
);


ALTER TABLE keycloak.event_entity OWNER TO msp;

--
-- Name: fed_user_attribute; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.fed_user_attribute (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    value character varying(2024),
    long_value_hash bytea,
    long_value_hash_lower_case bytea,
    long_value text
);


ALTER TABLE keycloak.fed_user_attribute OWNER TO msp;

--
-- Name: fed_user_consent; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.fed_user_consent (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    created_date bigint,
    last_updated_date bigint,
    client_storage_provider character varying(36),
    external_client_id character varying(255)
);


ALTER TABLE keycloak.fed_user_consent OWNER TO msp;

--
-- Name: fed_user_consent_cl_scope; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.fed_user_consent_cl_scope (
    user_consent_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.fed_user_consent_cl_scope OWNER TO msp;

--
-- Name: fed_user_credential; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.fed_user_credential (
    id character varying(36) NOT NULL,
    salt bytea,
    type character varying(255),
    created_date bigint,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    user_label character varying(255),
    secret_data text,
    credential_data text,
    priority integer
);


ALTER TABLE keycloak.fed_user_credential OWNER TO msp;

--
-- Name: fed_user_group_membership; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.fed_user_group_membership (
    group_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE keycloak.fed_user_group_membership OWNER TO msp;

--
-- Name: fed_user_required_action; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.fed_user_required_action (
    required_action character varying(255) DEFAULT ' '::character varying NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE keycloak.fed_user_required_action OWNER TO msp;

--
-- Name: fed_user_role_mapping; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.fed_user_role_mapping (
    role_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE keycloak.fed_user_role_mapping OWNER TO msp;

--
-- Name: federated_identity; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.federated_identity (
    identity_provider character varying(255) NOT NULL,
    realm_id character varying(36),
    federated_user_id character varying(255),
    federated_username character varying(255),
    token text,
    user_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.federated_identity OWNER TO msp;

--
-- Name: federated_user; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.federated_user (
    id character varying(255) NOT NULL,
    storage_provider_id character varying(255),
    realm_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.federated_user OWNER TO msp;

--
-- Name: group_attribute; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.group_attribute (
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255),
    group_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.group_attribute OWNER TO msp;

--
-- Name: group_role_mapping; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.group_role_mapping (
    role_id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.group_role_mapping OWNER TO msp;

--
-- Name: identity_provider; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.identity_provider (
    internal_id character varying(36) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    provider_alias character varying(255),
    provider_id character varying(255),
    store_token boolean DEFAULT false NOT NULL,
    authenticate_by_default boolean DEFAULT false NOT NULL,
    realm_id character varying(36),
    add_token_role boolean DEFAULT true NOT NULL,
    trust_email boolean DEFAULT false NOT NULL,
    first_broker_login_flow_id character varying(36),
    post_broker_login_flow_id character varying(36),
    provider_display_name character varying(255),
    link_only boolean DEFAULT false NOT NULL,
    organization_id character varying(255),
    hide_on_login boolean DEFAULT false
);


ALTER TABLE keycloak.identity_provider OWNER TO msp;

--
-- Name: identity_provider_config; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.identity_provider_config (
    identity_provider_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.identity_provider_config OWNER TO msp;

--
-- Name: identity_provider_mapper; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.identity_provider_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    idp_alias character varying(255) NOT NULL,
    idp_mapper_name character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.identity_provider_mapper OWNER TO msp;

--
-- Name: idp_mapper_config; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.idp_mapper_config (
    idp_mapper_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.idp_mapper_config OWNER TO msp;

--
-- Name: jgroups_ping; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.jgroups_ping (
    address character varying(200) NOT NULL,
    name character varying(200),
    cluster_name character varying(200) NOT NULL,
    ip character varying(200) NOT NULL,
    coord boolean
);


ALTER TABLE keycloak.jgroups_ping OWNER TO msp;

--
-- Name: keycloak_group; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.keycloak_group (
    id character varying(36) NOT NULL,
    name character varying(255),
    parent_group character varying(36) NOT NULL,
    realm_id character varying(36),
    type integer DEFAULT 0 NOT NULL
);


ALTER TABLE keycloak.keycloak_group OWNER TO msp;

--
-- Name: keycloak_role; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.keycloak_role (
    id character varying(36) NOT NULL,
    client_realm_constraint character varying(255),
    client_role boolean DEFAULT false NOT NULL,
    description character varying(255),
    name character varying(255),
    realm_id character varying(255),
    client character varying(36),
    realm character varying(36)
);


ALTER TABLE keycloak.keycloak_role OWNER TO msp;

--
-- Name: migration_model; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.migration_model (
    id character varying(36) NOT NULL,
    version character varying(36),
    update_time bigint DEFAULT 0 NOT NULL
);


ALTER TABLE keycloak.migration_model OWNER TO msp;

--
-- Name: offline_client_session; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.offline_client_session (
    user_session_id character varying(36) NOT NULL,
    client_id character varying(255) NOT NULL,
    offline_flag character varying(4) NOT NULL,
    "timestamp" integer,
    data text,
    client_storage_provider character varying(36) DEFAULT 'local'::character varying NOT NULL,
    external_client_id character varying(255) DEFAULT 'local'::character varying NOT NULL,
    version integer DEFAULT 0
);


ALTER TABLE keycloak.offline_client_session OWNER TO msp;

--
-- Name: offline_user_session; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.offline_user_session (
    user_session_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    created_on integer NOT NULL,
    offline_flag character varying(4) NOT NULL,
    data text,
    last_session_refresh integer DEFAULT 0 NOT NULL,
    broker_session_id character varying(1024),
    version integer DEFAULT 0
);


ALTER TABLE keycloak.offline_user_session OWNER TO msp;

--
-- Name: org; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.org (
    id character varying(255) NOT NULL,
    enabled boolean NOT NULL,
    realm_id character varying(255) NOT NULL,
    group_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(4000),
    alias character varying(255) NOT NULL,
    redirect_url character varying(2048)
);


ALTER TABLE keycloak.org OWNER TO msp;

--
-- Name: org_domain; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.org_domain (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    verified boolean NOT NULL,
    org_id character varying(255) NOT NULL
);


ALTER TABLE keycloak.org_domain OWNER TO msp;

--
-- Name: policy_config; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.policy_config (
    policy_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


ALTER TABLE keycloak.policy_config OWNER TO msp;

--
-- Name: protocol_mapper; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.protocol_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    protocol character varying(255) NOT NULL,
    protocol_mapper_name character varying(255) NOT NULL,
    client_id character varying(36),
    client_scope_id character varying(36)
);


ALTER TABLE keycloak.protocol_mapper OWNER TO msp;

--
-- Name: protocol_mapper_config; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.protocol_mapper_config (
    protocol_mapper_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.protocol_mapper_config OWNER TO msp;

--
-- Name: realm; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.realm (
    id character varying(36) NOT NULL,
    access_code_lifespan integer,
    user_action_lifespan integer,
    access_token_lifespan integer,
    account_theme character varying(255),
    admin_theme character varying(255),
    email_theme character varying(255),
    enabled boolean DEFAULT false NOT NULL,
    events_enabled boolean DEFAULT false NOT NULL,
    events_expiration bigint,
    login_theme character varying(255),
    name character varying(255),
    not_before integer,
    password_policy character varying(2550),
    registration_allowed boolean DEFAULT false NOT NULL,
    remember_me boolean DEFAULT false NOT NULL,
    reset_password_allowed boolean DEFAULT false NOT NULL,
    social boolean DEFAULT false NOT NULL,
    ssl_required character varying(255),
    sso_idle_timeout integer,
    sso_max_lifespan integer,
    update_profile_on_soc_login boolean DEFAULT false NOT NULL,
    verify_email boolean DEFAULT false NOT NULL,
    master_admin_client character varying(36),
    login_lifespan integer,
    internationalization_enabled boolean DEFAULT false NOT NULL,
    default_locale character varying(255),
    reg_email_as_username boolean DEFAULT false NOT NULL,
    admin_events_enabled boolean DEFAULT false NOT NULL,
    admin_events_details_enabled boolean DEFAULT false NOT NULL,
    edit_username_allowed boolean DEFAULT false NOT NULL,
    otp_policy_counter integer DEFAULT 0,
    otp_policy_window integer DEFAULT 1,
    otp_policy_period integer DEFAULT 30,
    otp_policy_digits integer DEFAULT 6,
    otp_policy_alg character varying(36) DEFAULT 'HmacSHA1'::character varying,
    otp_policy_type character varying(36) DEFAULT 'totp'::character varying,
    browser_flow character varying(36),
    registration_flow character varying(36),
    direct_grant_flow character varying(36),
    reset_credentials_flow character varying(36),
    client_auth_flow character varying(36),
    offline_session_idle_timeout integer DEFAULT 0,
    revoke_refresh_token boolean DEFAULT false NOT NULL,
    access_token_life_implicit integer DEFAULT 0,
    login_with_email_allowed boolean DEFAULT true NOT NULL,
    duplicate_emails_allowed boolean DEFAULT false NOT NULL,
    docker_auth_flow character varying(36),
    refresh_token_max_reuse integer DEFAULT 0,
    allow_user_managed_access boolean DEFAULT false NOT NULL,
    sso_max_lifespan_remember_me integer DEFAULT 0 NOT NULL,
    sso_idle_timeout_remember_me integer DEFAULT 0 NOT NULL,
    default_role character varying(255)
);


ALTER TABLE keycloak.realm OWNER TO msp;

--
-- Name: realm_attribute; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.realm_attribute (
    name character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    value text
);


ALTER TABLE keycloak.realm_attribute OWNER TO msp;

--
-- Name: realm_default_groups; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.realm_default_groups (
    realm_id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.realm_default_groups OWNER TO msp;

--
-- Name: realm_enabled_event_types; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.realm_enabled_event_types (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.realm_enabled_event_types OWNER TO msp;

--
-- Name: realm_events_listeners; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.realm_events_listeners (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.realm_events_listeners OWNER TO msp;

--
-- Name: realm_localizations; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.realm_localizations (
    realm_id character varying(255) NOT NULL,
    locale character varying(255) NOT NULL,
    texts text NOT NULL
);


ALTER TABLE keycloak.realm_localizations OWNER TO msp;

--
-- Name: realm_required_credential; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.realm_required_credential (
    type character varying(255) NOT NULL,
    form_label character varying(255),
    input boolean DEFAULT false NOT NULL,
    secret boolean DEFAULT false NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.realm_required_credential OWNER TO msp;

--
-- Name: realm_smtp_config; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.realm_smtp_config (
    realm_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.realm_smtp_config OWNER TO msp;

--
-- Name: realm_supported_locales; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.realm_supported_locales (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.realm_supported_locales OWNER TO msp;

--
-- Name: redirect_uris; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.redirect_uris (
    client_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.redirect_uris OWNER TO msp;

--
-- Name: required_action_config; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.required_action_config (
    required_action_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.required_action_config OWNER TO msp;

--
-- Name: required_action_provider; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.required_action_provider (
    id character varying(36) NOT NULL,
    alias character varying(255),
    name character varying(255),
    realm_id character varying(36),
    enabled boolean DEFAULT false NOT NULL,
    default_action boolean DEFAULT false NOT NULL,
    provider_id character varying(255),
    priority integer
);


ALTER TABLE keycloak.required_action_provider OWNER TO msp;

--
-- Name: resource_attribute; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.resource_attribute (
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255),
    resource_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.resource_attribute OWNER TO msp;

--
-- Name: resource_policy; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.resource_policy (
    resource_id character varying(36) NOT NULL,
    policy_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.resource_policy OWNER TO msp;

--
-- Name: resource_scope; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.resource_scope (
    resource_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.resource_scope OWNER TO msp;

--
-- Name: resource_server; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.resource_server (
    id character varying(36) NOT NULL,
    allow_rs_remote_mgmt boolean DEFAULT false NOT NULL,
    policy_enforce_mode smallint NOT NULL,
    decision_strategy smallint DEFAULT 1 NOT NULL
);


ALTER TABLE keycloak.resource_server OWNER TO msp;

--
-- Name: resource_server_perm_ticket; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.resource_server_perm_ticket (
    id character varying(36) NOT NULL,
    owner character varying(255) NOT NULL,
    requester character varying(255) NOT NULL,
    created_timestamp bigint NOT NULL,
    granted_timestamp bigint,
    resource_id character varying(36) NOT NULL,
    scope_id character varying(36),
    resource_server_id character varying(36) NOT NULL,
    policy_id character varying(36)
);


ALTER TABLE keycloak.resource_server_perm_ticket OWNER TO msp;

--
-- Name: resource_server_policy; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.resource_server_policy (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    type character varying(255) NOT NULL,
    decision_strategy smallint,
    logic smallint,
    resource_server_id character varying(36) NOT NULL,
    owner character varying(255)
);


ALTER TABLE keycloak.resource_server_policy OWNER TO msp;

--
-- Name: resource_server_resource; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.resource_server_resource (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255),
    icon_uri character varying(255),
    owner character varying(255) NOT NULL,
    resource_server_id character varying(36) NOT NULL,
    owner_managed_access boolean DEFAULT false NOT NULL,
    display_name character varying(255)
);


ALTER TABLE keycloak.resource_server_resource OWNER TO msp;

--
-- Name: resource_server_scope; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.resource_server_scope (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    icon_uri character varying(255),
    resource_server_id character varying(36) NOT NULL,
    display_name character varying(255)
);


ALTER TABLE keycloak.resource_server_scope OWNER TO msp;

--
-- Name: resource_uris; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.resource_uris (
    resource_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.resource_uris OWNER TO msp;

--
-- Name: revoked_token; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.revoked_token (
    id character varying(255) NOT NULL,
    expire bigint NOT NULL
);


ALTER TABLE keycloak.revoked_token OWNER TO msp;

--
-- Name: role_attribute; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.role_attribute (
    id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255)
);


ALTER TABLE keycloak.role_attribute OWNER TO msp;

--
-- Name: scope_mapping; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.scope_mapping (
    client_id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.scope_mapping OWNER TO msp;

--
-- Name: scope_policy; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.scope_policy (
    scope_id character varying(36) NOT NULL,
    policy_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.scope_policy OWNER TO msp;

--
-- Name: user_attribute; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.user_attribute (
    name character varying(255) NOT NULL,
    value character varying(255),
    user_id character varying(36) NOT NULL,
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    long_value_hash bytea,
    long_value_hash_lower_case bytea,
    long_value text
);


ALTER TABLE keycloak.user_attribute OWNER TO msp;

--
-- Name: user_consent; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.user_consent (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    user_id character varying(36) NOT NULL,
    created_date bigint,
    last_updated_date bigint,
    client_storage_provider character varying(36),
    external_client_id character varying(255)
);


ALTER TABLE keycloak.user_consent OWNER TO msp;

--
-- Name: user_consent_client_scope; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.user_consent_client_scope (
    user_consent_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.user_consent_client_scope OWNER TO msp;

--
-- Name: user_entity; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.user_entity (
    id character varying(36) NOT NULL,
    email character varying(255),
    email_constraint character varying(255),
    email_verified boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    federation_link character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    realm_id character varying(255),
    username character varying(255),
    created_timestamp bigint,
    service_account_client_link character varying(255),
    not_before integer DEFAULT 0 NOT NULL
);


ALTER TABLE keycloak.user_entity OWNER TO msp;

--
-- Name: user_federation_config; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.user_federation_config (
    user_federation_provider_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.user_federation_config OWNER TO msp;

--
-- Name: user_federation_mapper; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.user_federation_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    federation_provider_id character varying(36) NOT NULL,
    federation_mapper_type character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.user_federation_mapper OWNER TO msp;

--
-- Name: user_federation_mapper_config; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.user_federation_mapper_config (
    user_federation_mapper_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.user_federation_mapper_config OWNER TO msp;

--
-- Name: user_federation_provider; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.user_federation_provider (
    id character varying(36) NOT NULL,
    changed_sync_period integer,
    display_name character varying(255),
    full_sync_period integer,
    last_sync integer,
    priority integer,
    provider_name character varying(255),
    realm_id character varying(36)
);


ALTER TABLE keycloak.user_federation_provider OWNER TO msp;

--
-- Name: user_group_membership; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.user_group_membership (
    group_id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL,
    membership_type character varying(255) NOT NULL
);


ALTER TABLE keycloak.user_group_membership OWNER TO msp;

--
-- Name: user_required_action; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.user_required_action (
    user_id character varying(36) NOT NULL,
    required_action character varying(255) DEFAULT ' '::character varying NOT NULL
);


ALTER TABLE keycloak.user_required_action OWNER TO msp;

--
-- Name: user_role_mapping; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.user_role_mapping (
    role_id character varying(255) NOT NULL,
    user_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.user_role_mapping OWNER TO msp;

--
-- Name: web_origins; Type: TABLE; Schema: keycloak; Owner: msp
--

CREATE TABLE keycloak.web_origins (
    client_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.web_origins OWNER TO msp;

--
-- Name: AutorisationsTVA; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."AutorisationsTVA" OWNER TO postgres;

--
-- Name: TABLE "AutorisationsTVA"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."AutorisationsTVA" IS 'Table principale des autorisations TVA';


--
-- Name: COLUMN "AutorisationsTVA".client_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."AutorisationsTVA".client_id IS 'Référence vers le client propriétaire de l''autorisation';


--
-- Name: COLUMN "AutorisationsTVA"."numeroAutorisation"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."AutorisationsTVA"."numeroAutorisation" IS 'Numéro unique d''autorisation TVA';


--
-- Name: COLUMN "AutorisationsTVA"."dateDebutValidite"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."AutorisationsTVA"."dateDebutValidite" IS 'Date de début de validité de l''autorisation';


--
-- Name: COLUMN "AutorisationsTVA"."dateFinValidite"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."AutorisationsTVA"."dateFinValidite" IS 'Date de fin de validité de l''autorisation';


--
-- Name: COLUMN "AutorisationsTVA"."dateAutorisation"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."AutorisationsTVA"."dateAutorisation" IS 'Date d''émission de l''autorisation';


--
-- Name: COLUMN "AutorisationsTVA"."typeDocument"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."AutorisationsTVA"."typeDocument" IS 'Type de document (AUTORISATION, CERTIFICAT, ATTESTATION, DECISION, AUTRE)';


--
-- Name: COLUMN "AutorisationsTVA"."referenceDocument"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."AutorisationsTVA"."referenceDocument" IS 'Référence officielle du document';


--
-- Name: COLUMN "AutorisationsTVA"."statutAutorisation"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."AutorisationsTVA"."statutAutorisation" IS 'Statut de l''autorisation (ACTIF, EXPIRE, SUSPENDU, ANNULE)';


--
-- Name: COLUMN "AutorisationsTVA"."imagePath"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."AutorisationsTVA"."imagePath" IS 'Chemin ou URL du fichier image scanné de l''autorisation TVA';


--
-- Name: AutorisationsTVA_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AutorisationsTVA_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AutorisationsTVA_id_seq" OWNER TO postgres;

--
-- Name: AutorisationsTVA_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AutorisationsTVA_id_seq" OWNED BY public."AutorisationsTVA".id;


--
-- Name: BCsusTVA; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."BCsusTVA" OWNER TO postgres;

--
-- Name: TABLE "BCsusTVA"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."BCsusTVA" IS 'Table des bons de commande liés aux autorisations TVA';


--
-- Name: COLUMN "BCsusTVA".autorisation_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."BCsusTVA".autorisation_id IS 'Référence vers l''autorisation TVA parent (obligatoire)';


--
-- Name: COLUMN "BCsusTVA"."numeroBonCommande"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."BCsusTVA"."numeroBonCommande" IS 'Numéro du bon de commande';


--
-- Name: COLUMN "BCsusTVA"."dateBonCommande"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."BCsusTVA"."dateBonCommande" IS 'Date d''émission du bon de commande';


--
-- Name: COLUMN "BCsusTVA"."montantBonCommande"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."BCsusTVA"."montantBonCommande" IS 'Montant total du bon de commande';


--
-- Name: COLUMN "BCsusTVA".description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."BCsusTVA".description IS 'Description ou observations du bon de commande';


--
-- Name: COLUMN "BCsusTVA".statut; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."BCsusTVA".statut IS 'Statut du bon de commande (ACTIF, EXPIRE, SUSPENDU, ANNULE)';


--
-- Name: COLUMN "BCsusTVA"."imagePath"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."BCsusTVA"."imagePath" IS 'Chemin ou URL du fichier image du bon de commande';


--
-- Name: BCsusTVA_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."BCsusTVA_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."BCsusTVA_id_seq" OWNER TO postgres;

--
-- Name: BCsusTVA_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."BCsusTVA_id_seq" OWNED BY public."BCsusTVA".id;


--
-- Name: aeroports; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.aeroports OWNER TO postgres;

--
-- Name: aeroports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.aeroports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.aeroports_id_seq OWNER TO postgres;

--
-- Name: aeroports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.aeroports_id_seq OWNED BY public.aeroports.id;


--
-- Name: armateurs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.armateurs OWNER TO postgres;

--
-- Name: TABLE armateurs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.armateurs IS 'Table des compagnies maritimes (armateurs)';


--
-- Name: COLUMN armateurs.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.armateurs.code IS 'Code unique de l''armateur';


--
-- Name: COLUMN armateurs.nom; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.armateurs.nom IS 'Nom complet de la compagnie maritime';


--
-- Name: COLUMN armateurs.abreviation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.armateurs.abreviation IS 'Abréviation du nom de l''armateur';


--
-- Name: COLUMN armateurs.tarif20pieds; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.armateurs.tarif20pieds IS 'Tarif pour conteneur 20 pieds';


--
-- Name: COLUMN armateurs.tarif40pieds; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.armateurs.tarif40pieds IS 'Tarif pour conteneur 40 pieds';


--
-- Name: COLUMN armateurs.tarif45pieds; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.armateurs.tarif45pieds IS 'Tarif pour conteneur 45 pieds';


--
-- Name: COLUMN armateurs.isactive; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.armateurs.isactive IS 'Statut actif/inactif de l''armateur';


--
-- Name: armateurs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.armateurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.armateurs_id_seq OWNER TO postgres;

--
-- Name: armateurs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.armateurs_id_seq OWNED BY public.armateurs.id;


--
-- Name: client; Type: TABLE; Schema: public; Owner: postgres
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
    code_fournisseur character varying(20)
);


ALTER TABLE public.client OWNER TO postgres;

--
-- Name: COLUMN client.etat_fiscal; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.etat_fiscal IS 'État fiscal du client: ASSUJETTI_TVA, SUSPENSION_TVA, EXONERE';


--
-- Name: COLUMN client.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.updated_at IS 'Timestamp de la dernière modification, utilisé pour la suppression automatique après 7 jours de désactivation';


--
-- Name: COLUMN client.auto_delete; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.auto_delete IS 'Indique si le compte doit être supprimé automatiquement après 7 jours de désactivation';


--
-- Name: COLUMN client.is_permanent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.is_permanent IS 'Indique si le client est permanent (accès site web) ou temporaire (pas d''accès site)';


--
-- Name: COLUMN client.charge_com_ids; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.charge_com_ids IS 'Array des IDs des commerciaux assignés au client (relation 1-N)';


--
-- Name: COLUMN client.banque; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.banque IS 'Nom de la banque du client';


--
-- Name: COLUMN client.iban; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.iban IS 'IBAN - International Bank Account Number';


--
-- Name: COLUMN client.rib; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.rib IS 'RIB - Relevé d''Identité Bancaire (format FR)';


--
-- Name: COLUMN client.swift; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.swift IS 'Code SWIFT - Society for Worldwide Interbank Financial Telecommunication';


--
-- Name: COLUMN client.bic; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.bic IS 'BIC - Bank Identifier Code';


--
-- Name: COLUMN client.is_fournisseur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.is_fournisseur IS 'Indique si le client est également fournisseur';


--
-- Name: COLUMN client.code_fournisseur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client.code_fournisseur IS 'Code du fournisseur associé (si is_fournisseur = true)';


--
-- Name: client_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_id_seq OWNER TO postgres;

--
-- Name: client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_id_seq OWNED BY public.client.id;


--
-- Name: contact_client; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.contact_client OWNER TO postgres;

--
-- Name: COLUMN contact_client.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contact_client.id IS 'Identifiant unique du contact';


--
-- Name: COLUMN contact_client.id_client; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contact_client.id_client IS 'Référence vers le client';


--
-- Name: COLUMN contact_client.nom; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contact_client.nom IS 'Nom de famille du contact';


--
-- Name: COLUMN contact_client.prenom; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contact_client.prenom IS 'Prénom du contact';


--
-- Name: COLUMN contact_client.is_principal; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contact_client.is_principal IS 'Indique si ce contact est le contact principal du client (pour emails, etc.)';


--
-- Name: COLUMN contact_client.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contact_client.created_at IS 'Date de création du contact';


--
-- Name: COLUMN contact_client.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contact_client.updated_at IS 'Date de dernière mise à jour du contact';


--
-- Name: contact_client_new_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contact_client_new_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contact_client_new_id_seq OWNER TO postgres;

--
-- Name: contact_client_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contact_client_new_id_seq OWNED BY public.contact_client.id;


--
-- Name: correspondants; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.correspondants OWNER TO postgres;

--
-- Name: TABLE correspondants; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.correspondants IS 'Table des correspondants (sociétés de transport et logistique)';


--
-- Name: COLUMN correspondants.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.code IS 'Code unique auto-généré (COR000001, COR000002, ...)';


--
-- Name: COLUMN correspondants.nature; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.nature IS 'Nature du correspondant: LOCAL ou ETRANGER';


--
-- Name: COLUMN correspondants.libelle; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.libelle IS 'Nom du correspondant';


--
-- Name: COLUMN correspondants.logo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.logo IS 'Chemin vers le fichier logo';


--
-- Name: COLUMN correspondants.tx_foids_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.tx_foids_volume IS 'Taux FOIDS/VOLUME en pourcentage';


--
-- Name: COLUMN correspondants.matricule_fiscal; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.matricule_fiscal IS 'Matricule fiscal (M.F)';


--
-- Name: COLUMN correspondants.timbre; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.timbre IS 'Timbre (Oui/Non)';


--
-- Name: COLUMN correspondants.echeance; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.echeance IS 'Échéance en jours';


--
-- Name: COLUMN correspondants.devise; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.devise IS 'Devise pour les transactions (TND, EUR, USD, etc.)';


--
-- Name: COLUMN correspondants.competence_maritime; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.competence_maritime IS 'Compétence dans le transport maritime';


--
-- Name: COLUMN correspondants.competence_routier; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.competence_routier IS 'Compétence dans le transport routier';


--
-- Name: COLUMN correspondants.competence_aerien; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.correspondants.competence_aerien IS 'Compétence dans le transport aérien';


--
-- Name: correspondants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.correspondants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.correspondants_id_seq OWNER TO postgres;

--
-- Name: correspondants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.correspondants_id_seq OWNED BY public.correspondants.id;


--
-- Name: crm_activities; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.crm_activities OWNER TO postgres;

--
-- Name: TABLE crm_activities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.crm_activities IS 'Activités CRM - Appels, emails, rendez-vous, taches';


--
-- Name: COLUMN crm_activities.attachments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_activities.attachments IS 'Tableau JSON contenant les métadonnées des fichiers joints: 
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
-- Name: COLUMN crm_activities.assigned_to_ids; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_activities.assigned_to_ids IS 'Array des IDs des commerciaux assignés à l''activité (relation 1-N)';


--
-- Name: crm_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_activities_id_seq OWNER TO postgres;

--
-- Name: crm_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_activities_id_seq OWNED BY public.crm_activities.id;


--
-- Name: crm_activity_participants; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.crm_activity_participants OWNER TO postgres;

--
-- Name: TABLE crm_activity_participants; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.crm_activity_participants IS 'Participants aux activités CRM';


--
-- Name: crm_activity_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_activity_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_activity_participants_id_seq OWNER TO postgres;

--
-- Name: crm_activity_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_activity_participants_id_seq OWNED BY public.crm_activity_participants.id;


--
-- Name: crm_leads; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.crm_leads OWNER TO postgres;

--
-- Name: TABLE crm_leads; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.crm_leads IS 'Table des prospects - Contacts potentiels non encore clients';


--
-- Name: COLUMN crm_leads.country; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_leads.country IS 'Nom du pays (saisie libre sans limitation de caractères)';


--
-- Name: COLUMN crm_leads.traffic; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_leads.traffic IS 'Type de traffic: import ou export';


--
-- Name: COLUMN crm_leads.currency; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_leads.currency IS 'Devise pour estimatedValue et annualVolume';


--
-- Name: COLUMN crm_leads.assigned_to_ids; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_leads.assigned_to_ids IS 'Array des IDs des commerciaux assignés au prospect (relation 1-N)';


--
-- Name: crm_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_leads_id_seq OWNER TO postgres;

--
-- Name: crm_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_leads_id_seq OWNED BY public.crm_leads.id;


--
-- Name: crm_opportunities; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.crm_opportunities OWNER TO postgres;

--
-- Name: TABLE crm_opportunities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.crm_opportunities IS 'Table des opportunités - Prospects qualifiés avec potentiel de vente';


--
-- Name: COLUMN crm_opportunities.traffic; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_opportunities.traffic IS 'Type de traffic: import ou export';


--
-- Name: COLUMN crm_opportunities.currency; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_opportunities.currency IS 'Devise pour le champ value';


--
-- Name: COLUMN crm_opportunities.assigned_to_ids; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_opportunities.assigned_to_ids IS 'Array des IDs des commerciaux assignés à l''opportunité (relation 1-N)';


--
-- Name: crm_opportunities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_opportunities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_opportunities_id_seq OWNER TO postgres;

--
-- Name: crm_opportunities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_opportunities_id_seq OWNED BY public.crm_opportunities.id;


--
-- Name: crm_pipeline_stages; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.crm_pipeline_stages OWNER TO postgres;

--
-- Name: TABLE crm_pipeline_stages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.crm_pipeline_stages IS 'Étapes des pipelines de vente';


--
-- Name: crm_pipeline_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_pipeline_stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_pipeline_stages_id_seq OWNER TO postgres;

--
-- Name: crm_pipeline_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_pipeline_stages_id_seq OWNED BY public.crm_pipeline_stages.id;


--
-- Name: crm_pipelines; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.crm_pipelines OWNER TO postgres;

--
-- Name: TABLE crm_pipelines; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.crm_pipelines IS 'Pipelines de vente personnalisables';


--
-- Name: crm_pipelines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_pipelines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_pipelines_id_seq OWNER TO postgres;

--
-- Name: crm_pipelines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_pipelines_id_seq OWNED BY public.crm_pipelines.id;


--
-- Name: crm_quote_items; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT chk_quote_items_quantity_positive CHECK ((quantity > (0)::numeric)),
    CONSTRAINT chk_quote_items_vehicle_type CHECK (((vehicle_type)::text = ANY ((ARRAY['van'::character varying, 'truck_3_5t'::character varying, 'truck_7_5t'::character varying, 'truck_12t'::character varying, 'truck_19t'::character varying, 'truck_26t'::character varying, 'semi_trailer'::character varying, 'container'::character varying])::text[])))
);


ALTER TABLE public.crm_quote_items OWNER TO postgres;

--
-- Name: TABLE crm_quote_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.crm_quote_items IS 'Lignes de détail des devis avec services transport';


--
-- Name: COLUMN crm_quote_items.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.description IS 'Description du service ou de la ligne';


--
-- Name: COLUMN crm_quote_items.category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.category IS 'Catégorie de transport: groupage (LCL), complet (FCL), routier, aerien_normale, aerien_expresse';


--
-- Name: COLUMN crm_quote_items.origin_city; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.origin_city IS 'Ville d''origine';


--
-- Name: COLUMN crm_quote_items.destination_city; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.destination_city IS 'Ville de destination';


--
-- Name: COLUMN crm_quote_items.weight_kg; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.weight_kg IS 'Poids en kilogrammes';


--
-- Name: COLUMN crm_quote_items.quantity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.quantity IS 'Quantité du service ou marchandise';


--
-- Name: COLUMN crm_quote_items.unit_price; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.unit_price IS 'Prix unitaire HT';


--
-- Name: COLUMN crm_quote_items.total_price; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.total_price IS 'Prix total HT de la ligne';


--
-- Name: COLUMN crm_quote_items.vehicle_description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.vehicle_description IS 'Description du véhicule';


--
-- Name: COLUMN crm_quote_items.cargo_designation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.cargo_designation IS 'Désignation de la marchandise';


--
-- Name: COLUMN crm_quote_items.packages_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.packages_count IS 'Nombre de colis';


--
-- Name: COLUMN crm_quote_items.vehicle_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.vehicle_type IS 'Type de véhicule utilisé';


--
-- Name: COLUMN crm_quote_items.purchase_price; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.purchase_price IS 'Prix d''achat unitaire';


--
-- Name: COLUMN crm_quote_items.margin; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.margin IS 'Marge sur la ligne';


--
-- Name: COLUMN crm_quote_items.item_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.item_type IS 'Type de ligne: freight (fret) ou additional_cost (frais annexe)';


--
-- Name: COLUMN crm_quote_items.service_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.service_type IS 'Type de service: "avec_livraison" ou "sans_livraison"';


--
-- Name: COLUMN crm_quote_items.length_cm; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.length_cm IS 'Longueur du colis en centimètres (pour calcul volume)';


--
-- Name: COLUMN crm_quote_items.width_cm; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.width_cm IS 'Largeur du colis en centimètres (pour calcul volume)';


--
-- Name: COLUMN crm_quote_items.height_cm; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.height_cm IS 'Hauteur du colis en centimètres (pour calcul volume)';


--
-- Name: COLUMN crm_quote_items.volumetric_weight; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quote_items.volumetric_weight IS 'Poids volumétrique en kg (calculé selon catégorie: aérien normal /6000, express /5000, groupage /1000000)';


--
-- Name: crm_quote_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_quote_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_quote_items_id_seq OWNER TO postgres;

--
-- Name: crm_quote_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_quote_items_id_seq OWNED BY public.crm_quote_items.id;


--
-- Name: crm_quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crm_quotes (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quote_number character varying(50) NOT NULL,
    opportunity_id integer,
    lead_id integer,
    client_id integer,
    title character varying(255) NOT NULL,
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
    CONSTRAINT crm_quotes_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'viewed'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT crm_quotes_type_check CHECK (((type)::text = ANY ((ARRAY['cotation'::character varying, 'fiche_dossier'::character varying])::text[])))
);


ALTER TABLE public.crm_quotes OWNER TO postgres;

--
-- Name: TABLE crm_quotes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.crm_quotes IS 'Table des devis - Propositions commerciales envoyées';


--
-- Name: COLUMN crm_quotes.commercial_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.commercial_id IS 'Commercial assigné au devis';


--
-- Name: COLUMN crm_quotes.country; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.country IS 'Code pays (ISO 20 lettres)';


--
-- Name: COLUMN crm_quotes.tiers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.tiers IS 'Tiers';


--
-- Name: COLUMN crm_quotes.attention_to; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.attention_to IS 'L''attention de';


--
-- Name: COLUMN crm_quotes.pickup_location; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.pickup_location IS 'Lieu d''enlèvement';


--
-- Name: COLUMN crm_quotes.delivery_location; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.delivery_location IS 'Lieu de livraison';


--
-- Name: COLUMN crm_quotes.transit_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.transit_time IS 'Temps de transit estimé';


--
-- Name: COLUMN crm_quotes.departure_frequency; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.departure_frequency IS 'Fréquence de départ';


--
-- Name: COLUMN crm_quotes.client_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.client_type IS 'Type de client (Client, Prospect, Correspondant)';


--
-- Name: COLUMN crm_quotes.import_export; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.import_export IS 'Type de flux (Import/Export)';


--
-- Name: COLUMN crm_quotes.file_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.file_status IS 'Statut du dossier (COMPLET, etc.)';


--
-- Name: COLUMN crm_quotes.terms; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.terms IS 'Termes du devis';


--
-- Name: COLUMN crm_quotes.payment_method; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.payment_method IS 'Méthode de paiement';


--
-- Name: COLUMN crm_quotes.payment_conditions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.payment_conditions IS 'Conditions de paiement';


--
-- Name: COLUMN crm_quotes.requester; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.requester IS 'Demandeur';


--
-- Name: COLUMN crm_quotes.vehicle_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.vehicle_id IS 'Engin assigné';


--
-- Name: COLUMN crm_quotes.freight_purchased; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.freight_purchased IS 'Fret Acheté';


--
-- Name: COLUMN crm_quotes.freight_offered; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.freight_offered IS 'Fret Offert';


--
-- Name: COLUMN crm_quotes.freight_margin; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.freight_margin IS 'Marge sur le Fret';


--
-- Name: COLUMN crm_quotes.additional_costs_purchased; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.additional_costs_purchased IS 'Achats Frais Annexes';


--
-- Name: COLUMN crm_quotes.additional_costs_offered; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.additional_costs_offered IS 'Frais Annexes Offerts';


--
-- Name: COLUMN crm_quotes.total_purchases; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.total_purchases IS 'Total Achats';


--
-- Name: COLUMN crm_quotes.total_offers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.total_offers IS 'Total Offres';


--
-- Name: COLUMN crm_quotes.total_margin; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.total_margin IS 'Marge Totale';


--
-- Name: COLUMN crm_quotes.internal_instructions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.internal_instructions IS 'Instructions Internes';


--
-- Name: COLUMN crm_quotes.customer_request; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.customer_request IS 'Demande du Client';


--
-- Name: COLUMN crm_quotes.exchange_notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.exchange_notes IS 'Notes d''Échange';


--
-- Name: COLUMN crm_quotes.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.type IS 'Type de document: cotation (statut != accepted) ou fiche_dossier (statut = accepted avec infos transport complètes)';


--
-- Name: COLUMN crm_quotes.armateur_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.armateur_id IS 'Armateur assigné pour le transport maritime';


--
-- Name: COLUMN crm_quotes.navire_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.navire_id IS 'Navire assigné pour le transport maritime';


--
-- Name: COLUMN crm_quotes.port_enlevement_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.port_enlevement_id IS 'Port d''enlèvement';


--
-- Name: COLUMN crm_quotes.port_livraison_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.port_livraison_id IS 'Port de livraison';


--
-- Name: COLUMN crm_quotes.aeroport_enlevement_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.aeroport_enlevement_id IS 'Aéroport d''enlèvement';


--
-- Name: COLUMN crm_quotes.aeroport_livraison_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.aeroport_livraison_id IS 'Aéroport de livraison';


--
-- Name: COLUMN crm_quotes.hbl; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.hbl IS 'House Bill of Lading (Connaissement maison)';


--
-- Name: COLUMN crm_quotes.mbl; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.mbl IS 'Master Bill of Lading (Connaissement principal)';


--
-- Name: COLUMN crm_quotes.condition; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.condition IS 'Condition d''enlèvement/livraison (ex: Contact)';


--
-- Name: COLUMN crm_quotes.commercial_ids; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.crm_quotes.commercial_ids IS 'Array des IDs des commerciaux assignés à la cotation (relation 1-N)';


--
-- Name: crm_quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_quotes_id_seq OWNER TO postgres;

--
-- Name: crm_quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_quotes_id_seq OWNED BY public.crm_quotes.id;


--
-- Name: crm_tags; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.crm_tags OWNER TO postgres;

--
-- Name: TABLE crm_tags; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.crm_tags IS 'Tags pour catégoriser les éléments CRM';


--
-- Name: crm_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crm_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crm_tags_id_seq OWNER TO postgres;

--
-- Name: crm_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crm_tags_id_seq OWNED BY public.crm_tags.id;


--
-- Name: engin; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.engin OWNER TO postgres;

--
-- Name: TABLE engin; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.engin IS 'Table des engins/véhicules de transport avec spécifications techniques';


--
-- Name: COLUMN engin.pied; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.engin.pied IS 'Taille en pieds pour les conteneurs (20, 40, 45, etc.)';


--
-- Name: engin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.engin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.engin_id_seq OWNER TO postgres;

--
-- Name: engin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.engin_id_seq OWNED BY public.engin.id;


--
-- Name: fournisseurs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.fournisseurs OWNER TO postgres;

--
-- Name: TABLE fournisseurs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.fournisseurs IS 'Table des fournisseurs de l''ERP';


--
-- Name: COLUMN fournisseurs.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fournisseurs.code IS 'Code unique auto-généré (FRN001, FRN002, etc.)';


--
-- Name: COLUMN fournisseurs.type_fournisseur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fournisseurs.type_fournisseur IS 'Type: local ou etranger';


--
-- Name: COLUMN fournisseurs.categorie; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fournisseurs.categorie IS 'Catégorie: personne_morale ou personne_physique';


--
-- Name: COLUMN fournisseurs.nature_identification; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fournisseurs.nature_identification IS 'Type d''identification: mf, cin, passeport, carte_sejour, autre';


--
-- Name: COLUMN fournisseurs.numero_identification; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fournisseurs.numero_identification IS 'Numéro MF, CIN, Passeport, etc.';


--
-- Name: COLUMN fournisseurs.type_mf; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fournisseurs.type_mf IS 'Type de mouvement fournisseur';


--
-- Name: COLUMN fournisseurs.code_pays_payeur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fournisseurs.code_pays_payeur IS 'Code pays pour transferts bancaires';


--
-- Name: COLUMN fournisseurs.modalite_paiement; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fournisseurs.modalite_paiement IS 'Modalité de paiement (Chèque, Virement, Comptant, etc.)';


--
-- Name: COLUMN fournisseurs.timbre_fiscal; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fournisseurs.timbre_fiscal IS 'Application du timbre fiscal (true/false)';


--
-- Name: COLUMN fournisseurs.compte_comptable; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fournisseurs.compte_comptable IS 'Référence dans le plan comptable (ex: 401xxx)';


--
-- Name: fournisseurs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fournisseurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fournisseurs_id_seq OWNER TO postgres;

--
-- Name: fournisseurs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fournisseurs_id_seq OWNED BY public.fournisseurs.id;


--
-- Name: industries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.industries (
    id integer NOT NULL,
    libelle character varying(100) NOT NULL
);


ALTER TABLE public.industries OWNER TO postgres;

--
-- Name: industries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.industries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.industries_id_seq OWNER TO postgres;

--
-- Name: industries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.industries_id_seq OWNED BY public.industries.id;


--
-- Name: keycloak_id_backup_20251104; Type: TABLE; Schema: public; Owner: msp
--

CREATE TABLE public.keycloak_id_backup_20251104 (
    table_name character varying(50),
    record_id integer,
    old_keycloak_id uuid,
    backup_date timestamp without time zone DEFAULT now()
);


ALTER TABLE public.keycloak_id_backup_20251104 OWNER TO msp;

--
-- Name: navires; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.navires OWNER TO postgres;

--
-- Name: TABLE navires; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.navires IS 'Table des navires avec relation vers les armateurs';


--
-- Name: COLUMN navires.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.code IS 'Code unique du navire (auto-généré)';


--
-- Name: COLUMN navires.libelle; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.libelle IS 'Nom du navire';


--
-- Name: COLUMN navires.nationalite; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.nationalite IS 'Nationalité du navire';


--
-- Name: COLUMN navires.conducteur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.conducteur IS 'Nom du conducteur/capitaine';


--
-- Name: COLUMN navires.longueur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.longueur IS 'Longueur en mètres';


--
-- Name: COLUMN navires.largeur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.largeur IS 'Largeur en mètres';


--
-- Name: COLUMN navires.tirant_air; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.tirant_air IS 'Tirant d''air en mètres';


--
-- Name: COLUMN navires.tirant_eau; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.tirant_eau IS 'Tirant d''eau en mètres';


--
-- Name: COLUMN navires.jauge_brute; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.jauge_brute IS 'Jauge brute (tonnage brut)';


--
-- Name: COLUMN navires.jauge_net; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.jauge_net IS 'Jauge nette (tonnage net)';


--
-- Name: COLUMN navires.code_omi; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.code_omi IS 'Code OMI du navire';


--
-- Name: COLUMN navires.pav; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.pav IS 'Pavillon du navire';


--
-- Name: COLUMN navires.armateur_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navires.armateur_id IS 'ID de l''armateur propriétaire';


--
-- Name: navires_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.navires_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.navires_id_seq OWNER TO postgres;

--
-- Name: navires_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.navires_id_seq OWNED BY public.navires.id;


--
-- Name: objectif_com; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.objectif_com OWNER TO postgres;

--
-- Name: objectif_com_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.objectif_com_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.objectif_com_id_seq OWNER TO postgres;

--
-- Name: objectif_com_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.objectif_com_id_seq OWNED BY public.objectif_com.id;


--
-- Name: personnel; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT personnel_genre_check CHECK (((genre)::text = ANY ((ARRAY['Homme'::character varying, 'Femme'::character varying])::text[])))
);


ALTER TABLE public.personnel OWNER TO postgres;

--
-- Name: COLUMN personnel.auto_delete; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.personnel.auto_delete IS 'Indique si le compte doit être supprimé automatiquement après 7 jours de désactivation';


--
-- Name: COLUMN personnel.latitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.personnel.latitude IS 'Latitude GPS du personnel (-90 à +90)';


--
-- Name: COLUMN personnel.longitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.personnel.longitude IS 'Longitude GPS du personnel (-180 à +180)';


--
-- Name: COLUMN personnel.last_location_update; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.personnel.last_location_update IS 'Timestamp de la dernière mise à jour de position';


--
-- Name: COLUMN personnel.location_tracking_enabled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.personnel.location_tracking_enabled IS 'Indique si le suivi GPS est activé pour ce personnel';


--
-- Name: COLUMN personnel.location_accuracy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.personnel.location_accuracy IS 'Précision de la localisation en mètres';


--
-- Name: COLUMN personnel.location_source; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.personnel.location_source IS 'Source de la localisation (gps, network, passive)';


--
-- Name: COLUMN personnel.is_location_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.personnel.is_location_active IS 'Indique si la localisation est actuellement active (dernière position < 5 min)';


--
-- Name: personnel_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personnel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personnel_id_seq OWNER TO postgres;

--
-- Name: personnel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personnel_id_seq OWNED BY public.personnel.id;


--
-- Name: ports; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.ports OWNER TO postgres;

--
-- Name: ports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ports_id_seq OWNER TO postgres;

--
-- Name: ports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ports_id_seq OWNED BY public.ports.id;


--
-- Name: type_frais_annexes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.type_frais_annexes (
    id integer NOT NULL,
    description character varying(200) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.type_frais_annexes OWNER TO postgres;

--
-- Name: TABLE type_frais_annexes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.type_frais_annexes IS 'Table des types de frais annexes disponibles pour les cotations';


--
-- Name: COLUMN type_frais_annexes.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.type_frais_annexes.description IS 'Description du type de frais annexe';


--
-- Name: COLUMN type_frais_annexes.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.type_frais_annexes.is_active IS 'Indique si le type est actif/disponible';


--
-- Name: type_frais_annexes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.type_frais_annexes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.type_frais_annexes_id_seq OWNER TO postgres;

--
-- Name: type_frais_annexes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.type_frais_annexes_id_seq OWNED BY public.type_frais_annexes.id;


--
-- Name: v_autorisations_avec_client; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_autorisations_avec_client OWNER TO postgres;

--
-- Name: v_bons_commande_avec_details; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.v_bons_commande_avec_details OWNER TO postgres;

--
-- Name: vechat_conversations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.vechat_conversations OWNER TO postgres;

--
-- Name: vechat_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vechat_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vechat_conversations_id_seq OWNER TO postgres;

--
-- Name: vechat_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vechat_conversations_id_seq OWNED BY public.vechat_conversations.id;


--
-- Name: vechat_messages; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.vechat_messages OWNER TO postgres;

--
-- Name: COLUMN vechat_messages.is_delivered; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vechat_messages.is_delivered IS 'Indique si le message a été délivré au destinataire';


--
-- Name: COLUMN vechat_messages.delivered_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vechat_messages.delivered_at IS 'Horodatage de la délivrance du message';


--
-- Name: COLUMN vechat_messages.is_edited; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vechat_messages.is_edited IS 'Indique si le message a été modifié';


--
-- Name: COLUMN vechat_messages.edited_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vechat_messages.edited_at IS 'Horodatage de la dernière modification';


--
-- Name: COLUMN vechat_messages.original_message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vechat_messages.original_message IS 'Contenu original du message avant modification';


--
-- Name: COLUMN vechat_messages.location_latitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vechat_messages.location_latitude IS 'Latitude du message de localisation (degrés décimaux)';


--
-- Name: COLUMN vechat_messages.location_longitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vechat_messages.location_longitude IS 'Longitude du message de localisation (degrés décimaux)';


--
-- Name: COLUMN vechat_messages.location_accuracy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vechat_messages.location_accuracy IS 'Précision de la localisation en mètres';


--
-- Name: COLUMN vechat_messages.audio_duration; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vechat_messages.audio_duration IS 'Durée du message audio en secondes';


--
-- Name: COLUMN vechat_messages.audio_waveform; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vechat_messages.audio_waveform IS 'Données de forme d''onde audio au format JSON';


--
-- Name: vechat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vechat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vechat_messages_id_seq OWNER TO postgres;

--
-- Name: vechat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vechat_messages_id_seq OWNED BY public.vechat_messages.id;


--
-- Name: view_engins_actifs; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.view_engins_actifs OWNER TO postgres;

--
-- Name: view_leads_by_sales; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.view_leads_by_sales OWNER TO postgres;

--
-- Name: view_opportunities_pipeline; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.view_opportunities_pipeline OWNER TO postgres;

--
-- Name: view_prospects_with_traffic; Type: VIEW; Schema: public; Owner: postgres
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
            ELSE 'Non défini'::text
        END AS traffic_label
   FROM public.crm_leads l;


ALTER VIEW public.view_prospects_with_traffic OWNER TO postgres;

--
-- Name: AutorisationsTVA id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AutorisationsTVA" ALTER COLUMN id SET DEFAULT nextval('public."AutorisationsTVA_id_seq"'::regclass);


--
-- Name: BCsusTVA id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BCsusTVA" ALTER COLUMN id SET DEFAULT nextval('public."BCsusTVA_id_seq"'::regclass);


--
-- Name: aeroports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aeroports ALTER COLUMN id SET DEFAULT nextval('public.aeroports_id_seq'::regclass);


--
-- Name: armateurs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.armateurs ALTER COLUMN id SET DEFAULT nextval('public.armateurs_id_seq'::regclass);


--
-- Name: client id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client ALTER COLUMN id SET DEFAULT nextval('public.client_id_seq'::regclass);


--
-- Name: contact_client id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_client ALTER COLUMN id SET DEFAULT nextval('public.contact_client_new_id_seq'::regclass);


--
-- Name: correspondants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.correspondants ALTER COLUMN id SET DEFAULT nextval('public.correspondants_id_seq'::regclass);


--
-- Name: crm_activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activities ALTER COLUMN id SET DEFAULT nextval('public.crm_activities_id_seq'::regclass);


--
-- Name: crm_activity_participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activity_participants ALTER COLUMN id SET DEFAULT nextval('public.crm_activity_participants_id_seq'::regclass);


--
-- Name: crm_leads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_leads ALTER COLUMN id SET DEFAULT nextval('public.crm_leads_id_seq'::regclass);


--
-- Name: crm_opportunities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities ALTER COLUMN id SET DEFAULT nextval('public.crm_opportunities_id_seq'::regclass);


--
-- Name: crm_pipeline_stages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_pipeline_stages ALTER COLUMN id SET DEFAULT nextval('public.crm_pipeline_stages_id_seq'::regclass);


--
-- Name: crm_pipelines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_pipelines ALTER COLUMN id SET DEFAULT nextval('public.crm_pipelines_id_seq'::regclass);


--
-- Name: crm_quote_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quote_items ALTER COLUMN id SET DEFAULT nextval('public.crm_quote_items_id_seq'::regclass);


--
-- Name: crm_quotes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes ALTER COLUMN id SET DEFAULT nextval('public.crm_quotes_id_seq'::regclass);


--
-- Name: crm_tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_tags ALTER COLUMN id SET DEFAULT nextval('public.crm_tags_id_seq'::regclass);


--
-- Name: engin id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.engin ALTER COLUMN id SET DEFAULT nextval('public.engin_id_seq'::regclass);


--
-- Name: fournisseurs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fournisseurs ALTER COLUMN id SET DEFAULT nextval('public.fournisseurs_id_seq'::regclass);


--
-- Name: industries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.industries ALTER COLUMN id SET DEFAULT nextval('public.industries_id_seq'::regclass);


--
-- Name: navires id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.navires ALTER COLUMN id SET DEFAULT nextval('public.navires_id_seq'::regclass);


--
-- Name: objectif_com id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objectif_com ALTER COLUMN id SET DEFAULT nextval('public.objectif_com_id_seq'::regclass);


--
-- Name: personnel id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personnel ALTER COLUMN id SET DEFAULT nextval('public.personnel_id_seq'::regclass);


--
-- Name: ports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ports ALTER COLUMN id SET DEFAULT nextval('public.ports_id_seq'::regclass);


--
-- Name: type_frais_annexes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_frais_annexes ALTER COLUMN id SET DEFAULT nextval('public.type_frais_annexes_id_seq'::regclass);


--
-- Name: vechat_conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vechat_conversations ALTER COLUMN id SET DEFAULT nextval('public.vechat_conversations_id_seq'::regclass);


--
-- Name: vechat_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vechat_messages ALTER COLUMN id SET DEFAULT nextval('public.vechat_messages_id_seq'::regclass);


--
-- Name: org_domain ORG_DOMAIN_pkey; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.org_domain
    ADD CONSTRAINT "ORG_DOMAIN_pkey" PRIMARY KEY (id, name);


--
-- Name: org ORG_pkey; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.org
    ADD CONSTRAINT "ORG_pkey" PRIMARY KEY (id);


--
-- Name: keycloak_role UK_J3RWUVD56ONTGSUHOGM184WW2-2; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.keycloak_role
    ADD CONSTRAINT "UK_J3RWUVD56ONTGSUHOGM184WW2-2" UNIQUE (name, client_realm_constraint);


--
-- Name: client_auth_flow_bindings c_cli_flow_bind; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_auth_flow_bindings
    ADD CONSTRAINT c_cli_flow_bind PRIMARY KEY (client_id, binding_name);


--
-- Name: client_scope_client c_cli_scope_bind; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_scope_client
    ADD CONSTRAINT c_cli_scope_bind PRIMARY KEY (client_id, scope_id);


--
-- Name: client_initial_access cnstr_client_init_acc_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_initial_access
    ADD CONSTRAINT cnstr_client_init_acc_pk PRIMARY KEY (id);


--
-- Name: realm_default_groups con_group_id_def_groups; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_default_groups
    ADD CONSTRAINT con_group_id_def_groups UNIQUE (group_id);


--
-- Name: broker_link constr_broker_link_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.broker_link
    ADD CONSTRAINT constr_broker_link_pk PRIMARY KEY (identity_provider, user_id);


--
-- Name: component_config constr_component_config_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.component_config
    ADD CONSTRAINT constr_component_config_pk PRIMARY KEY (id);


--
-- Name: component constr_component_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.component
    ADD CONSTRAINT constr_component_pk PRIMARY KEY (id);


--
-- Name: fed_user_required_action constr_fed_required_action; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.fed_user_required_action
    ADD CONSTRAINT constr_fed_required_action PRIMARY KEY (required_action, user_id);


--
-- Name: fed_user_attribute constr_fed_user_attr_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.fed_user_attribute
    ADD CONSTRAINT constr_fed_user_attr_pk PRIMARY KEY (id);


--
-- Name: fed_user_consent constr_fed_user_consent_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.fed_user_consent
    ADD CONSTRAINT constr_fed_user_consent_pk PRIMARY KEY (id);


--
-- Name: fed_user_credential constr_fed_user_cred_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.fed_user_credential
    ADD CONSTRAINT constr_fed_user_cred_pk PRIMARY KEY (id);


--
-- Name: fed_user_group_membership constr_fed_user_group; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.fed_user_group_membership
    ADD CONSTRAINT constr_fed_user_group PRIMARY KEY (group_id, user_id);


--
-- Name: fed_user_role_mapping constr_fed_user_role; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.fed_user_role_mapping
    ADD CONSTRAINT constr_fed_user_role PRIMARY KEY (role_id, user_id);


--
-- Name: federated_user constr_federated_user; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.federated_user
    ADD CONSTRAINT constr_federated_user PRIMARY KEY (id);


--
-- Name: realm_default_groups constr_realm_default_groups; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_default_groups
    ADD CONSTRAINT constr_realm_default_groups PRIMARY KEY (realm_id, group_id);


--
-- Name: realm_enabled_event_types constr_realm_enabl_event_types; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_enabled_event_types
    ADD CONSTRAINT constr_realm_enabl_event_types PRIMARY KEY (realm_id, value);


--
-- Name: realm_events_listeners constr_realm_events_listeners; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_events_listeners
    ADD CONSTRAINT constr_realm_events_listeners PRIMARY KEY (realm_id, value);


--
-- Name: realm_supported_locales constr_realm_supported_locales; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_supported_locales
    ADD CONSTRAINT constr_realm_supported_locales PRIMARY KEY (realm_id, value);


--
-- Name: identity_provider constraint_2b; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.identity_provider
    ADD CONSTRAINT constraint_2b PRIMARY KEY (internal_id);


--
-- Name: client_attributes constraint_3c; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_attributes
    ADD CONSTRAINT constraint_3c PRIMARY KEY (client_id, name);


--
-- Name: event_entity constraint_4; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.event_entity
    ADD CONSTRAINT constraint_4 PRIMARY KEY (id);


--
-- Name: federated_identity constraint_40; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.federated_identity
    ADD CONSTRAINT constraint_40 PRIMARY KEY (identity_provider, user_id);


--
-- Name: realm constraint_4a; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm
    ADD CONSTRAINT constraint_4a PRIMARY KEY (id);


--
-- Name: user_federation_provider constraint_5c; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_federation_provider
    ADD CONSTRAINT constraint_5c PRIMARY KEY (id);


--
-- Name: client constraint_7; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client
    ADD CONSTRAINT constraint_7 PRIMARY KEY (id);


--
-- Name: scope_mapping constraint_81; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.scope_mapping
    ADD CONSTRAINT constraint_81 PRIMARY KEY (client_id, role_id);


--
-- Name: client_node_registrations constraint_84; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_node_registrations
    ADD CONSTRAINT constraint_84 PRIMARY KEY (client_id, name);


--
-- Name: realm_attribute constraint_9; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_attribute
    ADD CONSTRAINT constraint_9 PRIMARY KEY (name, realm_id);


--
-- Name: realm_required_credential constraint_92; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_required_credential
    ADD CONSTRAINT constraint_92 PRIMARY KEY (realm_id, type);


--
-- Name: keycloak_role constraint_a; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.keycloak_role
    ADD CONSTRAINT constraint_a PRIMARY KEY (id);


--
-- Name: admin_event_entity constraint_admin_event_entity; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.admin_event_entity
    ADD CONSTRAINT constraint_admin_event_entity PRIMARY KEY (id);


--
-- Name: authenticator_config_entry constraint_auth_cfg_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.authenticator_config_entry
    ADD CONSTRAINT constraint_auth_cfg_pk PRIMARY KEY (authenticator_id, name);


--
-- Name: authentication_execution constraint_auth_exec_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.authentication_execution
    ADD CONSTRAINT constraint_auth_exec_pk PRIMARY KEY (id);


--
-- Name: authentication_flow constraint_auth_flow_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.authentication_flow
    ADD CONSTRAINT constraint_auth_flow_pk PRIMARY KEY (id);


--
-- Name: authenticator_config constraint_auth_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.authenticator_config
    ADD CONSTRAINT constraint_auth_pk PRIMARY KEY (id);


--
-- Name: user_role_mapping constraint_c; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_role_mapping
    ADD CONSTRAINT constraint_c PRIMARY KEY (role_id, user_id);


--
-- Name: composite_role constraint_composite_role; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.composite_role
    ADD CONSTRAINT constraint_composite_role PRIMARY KEY (composite, child_role);


--
-- Name: identity_provider_config constraint_d; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.identity_provider_config
    ADD CONSTRAINT constraint_d PRIMARY KEY (identity_provider_id, name);


--
-- Name: policy_config constraint_dpc; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.policy_config
    ADD CONSTRAINT constraint_dpc PRIMARY KEY (policy_id, name);


--
-- Name: realm_smtp_config constraint_e; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_smtp_config
    ADD CONSTRAINT constraint_e PRIMARY KEY (realm_id, name);


--
-- Name: credential constraint_f; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.credential
    ADD CONSTRAINT constraint_f PRIMARY KEY (id);


--
-- Name: user_federation_config constraint_f9; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_federation_config
    ADD CONSTRAINT constraint_f9 PRIMARY KEY (user_federation_provider_id, name);


--
-- Name: resource_server_perm_ticket constraint_fapmt; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT constraint_fapmt PRIMARY KEY (id);


--
-- Name: resource_server_resource constraint_farsr; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_resource
    ADD CONSTRAINT constraint_farsr PRIMARY KEY (id);


--
-- Name: resource_server_policy constraint_farsrp; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_policy
    ADD CONSTRAINT constraint_farsrp PRIMARY KEY (id);


--
-- Name: associated_policy constraint_farsrpap; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.associated_policy
    ADD CONSTRAINT constraint_farsrpap PRIMARY KEY (policy_id, associated_policy_id);


--
-- Name: resource_policy constraint_farsrpp; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_policy
    ADD CONSTRAINT constraint_farsrpp PRIMARY KEY (resource_id, policy_id);


--
-- Name: resource_server_scope constraint_farsrs; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_scope
    ADD CONSTRAINT constraint_farsrs PRIMARY KEY (id);


--
-- Name: resource_scope constraint_farsrsp; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_scope
    ADD CONSTRAINT constraint_farsrsp PRIMARY KEY (resource_id, scope_id);


--
-- Name: scope_policy constraint_farsrsps; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.scope_policy
    ADD CONSTRAINT constraint_farsrsps PRIMARY KEY (scope_id, policy_id);


--
-- Name: user_entity constraint_fb; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_entity
    ADD CONSTRAINT constraint_fb PRIMARY KEY (id);


--
-- Name: user_federation_mapper_config constraint_fedmapper_cfg_pm; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_federation_mapper_config
    ADD CONSTRAINT constraint_fedmapper_cfg_pm PRIMARY KEY (user_federation_mapper_id, name);


--
-- Name: user_federation_mapper constraint_fedmapperpm; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_federation_mapper
    ADD CONSTRAINT constraint_fedmapperpm PRIMARY KEY (id);


--
-- Name: fed_user_consent_cl_scope constraint_fgrntcsnt_clsc_pm; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.fed_user_consent_cl_scope
    ADD CONSTRAINT constraint_fgrntcsnt_clsc_pm PRIMARY KEY (user_consent_id, scope_id);


--
-- Name: user_consent_client_scope constraint_grntcsnt_clsc_pm; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_consent_client_scope
    ADD CONSTRAINT constraint_grntcsnt_clsc_pm PRIMARY KEY (user_consent_id, scope_id);


--
-- Name: user_consent constraint_grntcsnt_pm; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_consent
    ADD CONSTRAINT constraint_grntcsnt_pm PRIMARY KEY (id);


--
-- Name: keycloak_group constraint_group; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.keycloak_group
    ADD CONSTRAINT constraint_group PRIMARY KEY (id);


--
-- Name: group_attribute constraint_group_attribute_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.group_attribute
    ADD CONSTRAINT constraint_group_attribute_pk PRIMARY KEY (id);


--
-- Name: group_role_mapping constraint_group_role; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.group_role_mapping
    ADD CONSTRAINT constraint_group_role PRIMARY KEY (role_id, group_id);


--
-- Name: identity_provider_mapper constraint_idpm; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.identity_provider_mapper
    ADD CONSTRAINT constraint_idpm PRIMARY KEY (id);


--
-- Name: idp_mapper_config constraint_idpmconfig; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.idp_mapper_config
    ADD CONSTRAINT constraint_idpmconfig PRIMARY KEY (idp_mapper_id, name);


--
-- Name: jgroups_ping constraint_jgroups_ping; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.jgroups_ping
    ADD CONSTRAINT constraint_jgroups_ping PRIMARY KEY (address);


--
-- Name: migration_model constraint_migmod; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.migration_model
    ADD CONSTRAINT constraint_migmod PRIMARY KEY (id);


--
-- Name: offline_client_session constraint_offl_cl_ses_pk3; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.offline_client_session
    ADD CONSTRAINT constraint_offl_cl_ses_pk3 PRIMARY KEY (user_session_id, client_id, client_storage_provider, external_client_id, offline_flag);


--
-- Name: offline_user_session constraint_offl_us_ses_pk2; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.offline_user_session
    ADD CONSTRAINT constraint_offl_us_ses_pk2 PRIMARY KEY (user_session_id, offline_flag);


--
-- Name: protocol_mapper constraint_pcm; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.protocol_mapper
    ADD CONSTRAINT constraint_pcm PRIMARY KEY (id);


--
-- Name: protocol_mapper_config constraint_pmconfig; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.protocol_mapper_config
    ADD CONSTRAINT constraint_pmconfig PRIMARY KEY (protocol_mapper_id, name);


--
-- Name: redirect_uris constraint_redirect_uris; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.redirect_uris
    ADD CONSTRAINT constraint_redirect_uris PRIMARY KEY (client_id, value);


--
-- Name: required_action_config constraint_req_act_cfg_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.required_action_config
    ADD CONSTRAINT constraint_req_act_cfg_pk PRIMARY KEY (required_action_id, name);


--
-- Name: required_action_provider constraint_req_act_prv_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.required_action_provider
    ADD CONSTRAINT constraint_req_act_prv_pk PRIMARY KEY (id);


--
-- Name: user_required_action constraint_required_action; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_required_action
    ADD CONSTRAINT constraint_required_action PRIMARY KEY (required_action, user_id);


--
-- Name: resource_uris constraint_resour_uris_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_uris
    ADD CONSTRAINT constraint_resour_uris_pk PRIMARY KEY (resource_id, value);


--
-- Name: role_attribute constraint_role_attribute_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.role_attribute
    ADD CONSTRAINT constraint_role_attribute_pk PRIMARY KEY (id);


--
-- Name: revoked_token constraint_rt; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.revoked_token
    ADD CONSTRAINT constraint_rt PRIMARY KEY (id);


--
-- Name: user_attribute constraint_user_attribute_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_attribute
    ADD CONSTRAINT constraint_user_attribute_pk PRIMARY KEY (id);


--
-- Name: user_group_membership constraint_user_group; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_group_membership
    ADD CONSTRAINT constraint_user_group PRIMARY KEY (group_id, user_id);


--
-- Name: web_origins constraint_web_origins; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.web_origins
    ADD CONSTRAINT constraint_web_origins PRIMARY KEY (client_id, value);


--
-- Name: databasechangeloglock databasechangeloglock_pkey; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.databasechangeloglock
    ADD CONSTRAINT databasechangeloglock_pkey PRIMARY KEY (id);


--
-- Name: client_scope_attributes pk_cl_tmpl_attr; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_scope_attributes
    ADD CONSTRAINT pk_cl_tmpl_attr PRIMARY KEY (scope_id, name);


--
-- Name: client_scope pk_cli_template; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_scope
    ADD CONSTRAINT pk_cli_template PRIMARY KEY (id);


--
-- Name: resource_server pk_resource_server; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server
    ADD CONSTRAINT pk_resource_server PRIMARY KEY (id);


--
-- Name: client_scope_role_mapping pk_template_scope; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_scope_role_mapping
    ADD CONSTRAINT pk_template_scope PRIMARY KEY (scope_id, role_id);


--
-- Name: default_client_scope r_def_cli_scope_bind; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.default_client_scope
    ADD CONSTRAINT r_def_cli_scope_bind PRIMARY KEY (realm_id, scope_id);


--
-- Name: realm_localizations realm_localizations_pkey; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_localizations
    ADD CONSTRAINT realm_localizations_pkey PRIMARY KEY (realm_id, locale);


--
-- Name: resource_attribute res_attr_pk; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_attribute
    ADD CONSTRAINT res_attr_pk PRIMARY KEY (id);


--
-- Name: keycloak_group sibling_names; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.keycloak_group
    ADD CONSTRAINT sibling_names UNIQUE (realm_id, parent_group, name);


--
-- Name: identity_provider uk_2daelwnibji49avxsrtuf6xj33; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.identity_provider
    ADD CONSTRAINT uk_2daelwnibji49avxsrtuf6xj33 UNIQUE (provider_alias, realm_id);


--
-- Name: client uk_b71cjlbenv945rb6gcon438at; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client
    ADD CONSTRAINT uk_b71cjlbenv945rb6gcon438at UNIQUE (realm_id, client_id);


--
-- Name: client_scope uk_cli_scope; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_scope
    ADD CONSTRAINT uk_cli_scope UNIQUE (realm_id, name);


--
-- Name: user_entity uk_dykn684sl8up1crfei6eckhd7; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_entity
    ADD CONSTRAINT uk_dykn684sl8up1crfei6eckhd7 UNIQUE (realm_id, email_constraint);


--
-- Name: user_consent uk_external_consent; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_consent
    ADD CONSTRAINT uk_external_consent UNIQUE (client_storage_provider, external_client_id, user_id);


--
-- Name: resource_server_resource uk_frsr6t700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_resource
    ADD CONSTRAINT uk_frsr6t700s9v50bu18ws5ha6 UNIQUE (name, owner, resource_server_id);


--
-- Name: resource_server_perm_ticket uk_frsr6t700s9v50bu18ws5pmt; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT uk_frsr6t700s9v50bu18ws5pmt UNIQUE (owner, requester, resource_server_id, resource_id, scope_id);


--
-- Name: resource_server_policy uk_frsrpt700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_policy
    ADD CONSTRAINT uk_frsrpt700s9v50bu18ws5ha6 UNIQUE (name, resource_server_id);


--
-- Name: resource_server_scope uk_frsrst700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_scope
    ADD CONSTRAINT uk_frsrst700s9v50bu18ws5ha6 UNIQUE (name, resource_server_id);


--
-- Name: user_consent uk_local_consent; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_consent
    ADD CONSTRAINT uk_local_consent UNIQUE (client_id, user_id);


--
-- Name: org uk_org_alias; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.org
    ADD CONSTRAINT uk_org_alias UNIQUE (realm_id, alias);


--
-- Name: org uk_org_group; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.org
    ADD CONSTRAINT uk_org_group UNIQUE (group_id);


--
-- Name: org uk_org_name; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.org
    ADD CONSTRAINT uk_org_name UNIQUE (realm_id, name);


--
-- Name: realm uk_orvsdmla56612eaefiq6wl5oi; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm
    ADD CONSTRAINT uk_orvsdmla56612eaefiq6wl5oi UNIQUE (name);


--
-- Name: user_entity uk_ru8tt6t700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_entity
    ADD CONSTRAINT uk_ru8tt6t700s9v50bu18ws5ha6 UNIQUE (realm_id, username);


--
-- Name: AutorisationsTVA AutorisationsTVA_numeroAutorisation_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AutorisationsTVA"
    ADD CONSTRAINT "AutorisationsTVA_numeroAutorisation_key" UNIQUE ("numeroAutorisation");


--
-- Name: AutorisationsTVA AutorisationsTVA_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AutorisationsTVA"
    ADD CONSTRAINT "AutorisationsTVA_pkey" PRIMARY KEY (id);


--
-- Name: BCsusTVA BCsusTVA_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BCsusTVA"
    ADD CONSTRAINT "BCsusTVA_pkey" PRIMARY KEY (id);


--
-- Name: AutorisationsTVA UQ_AutorisationsTVA_numeroAutorisation; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AutorisationsTVA"
    ADD CONSTRAINT "UQ_AutorisationsTVA_numeroAutorisation" UNIQUE ("numeroAutorisation");


--
-- Name: BCsusTVA UQ_BCsusTVA_numeroBonCommande_autorisation; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BCsusTVA"
    ADD CONSTRAINT "UQ_BCsusTVA_numeroBonCommande_autorisation" UNIQUE (autorisation_id, "numeroBonCommande");


--
-- Name: aeroports aeroports_abbreviation_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aeroports
    ADD CONSTRAINT aeroports_abbreviation_key UNIQUE (abbreviation);


--
-- Name: aeroports aeroports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aeroports
    ADD CONSTRAINT aeroports_pkey PRIMARY KEY (id);


--
-- Name: armateurs armateurs_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.armateurs
    ADD CONSTRAINT armateurs_code_key UNIQUE (code);


--
-- Name: armateurs armateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.armateurs
    ADD CONSTRAINT armateurs_pkey PRIMARY KEY (id);


--
-- Name: client client_keycloak_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_keycloak_id_key UNIQUE (keycloak_id);


--
-- Name: client client_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_pkey PRIMARY KEY (id);


--
-- Name: contact_client contact_client_new_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_client
    ADD CONSTRAINT contact_client_new_pkey PRIMARY KEY (id);


--
-- Name: correspondants correspondants_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.correspondants
    ADD CONSTRAINT correspondants_code_key UNIQUE (code);


--
-- Name: correspondants correspondants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.correspondants
    ADD CONSTRAINT correspondants_pkey PRIMARY KEY (id);


--
-- Name: crm_activities crm_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_pkey PRIMARY KEY (id);


--
-- Name: crm_activities crm_activities_uuid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_uuid_key UNIQUE (uuid);


--
-- Name: crm_activity_participants crm_activity_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activity_participants
    ADD CONSTRAINT crm_activity_participants_pkey PRIMARY KEY (id);


--
-- Name: crm_leads crm_leads_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_email_key UNIQUE (email);


--
-- Name: crm_leads crm_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_pkey PRIMARY KEY (id);


--
-- Name: crm_leads crm_leads_uuid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_uuid_key UNIQUE (uuid);


--
-- Name: crm_opportunities crm_opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_pkey PRIMARY KEY (id);


--
-- Name: crm_opportunities crm_opportunities_uuid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_uuid_key UNIQUE (uuid);


--
-- Name: crm_pipeline_stages crm_pipeline_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_pipeline_stages
    ADD CONSTRAINT crm_pipeline_stages_pkey PRIMARY KEY (id);


--
-- Name: crm_pipelines crm_pipelines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_pipelines
    ADD CONSTRAINT crm_pipelines_pkey PRIMARY KEY (id);


--
-- Name: crm_pipelines crm_pipelines_uuid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_pipelines
    ADD CONSTRAINT crm_pipelines_uuid_key UNIQUE (uuid);


--
-- Name: crm_quote_items crm_quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quote_items
    ADD CONSTRAINT crm_quote_items_pkey PRIMARY KEY (id);


--
-- Name: crm_quotes crm_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_pkey PRIMARY KEY (id);


--
-- Name: crm_quotes crm_quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_quote_number_key UNIQUE (quote_number);


--
-- Name: crm_quotes crm_quotes_uuid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_uuid_key UNIQUE (uuid);


--
-- Name: crm_tags crm_tags_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_tags
    ADD CONSTRAINT crm_tags_name_key UNIQUE (name);


--
-- Name: crm_tags crm_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_tags
    ADD CONSTRAINT crm_tags_pkey PRIMARY KEY (id);


--
-- Name: engin engin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.engin
    ADD CONSTRAINT engin_pkey PRIMARY KEY (id);


--
-- Name: fournisseurs fournisseurs_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fournisseurs
    ADD CONSTRAINT fournisseurs_code_key UNIQUE (code);


--
-- Name: fournisseurs fournisseurs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fournisseurs
    ADD CONSTRAINT fournisseurs_pkey PRIMARY KEY (id);


--
-- Name: industries industries_libelle_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_libelle_key UNIQUE (libelle);


--
-- Name: industries industries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_pkey PRIMARY KEY (id);


--
-- Name: navires navires_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.navires
    ADD CONSTRAINT navires_code_key UNIQUE (code);


--
-- Name: navires navires_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.navires
    ADD CONSTRAINT navires_pkey PRIMARY KEY (id);


--
-- Name: objectif_com objectif_com_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objectif_com
    ADD CONSTRAINT objectif_com_pkey PRIMARY KEY (id);


--
-- Name: personnel personnel_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personnel
    ADD CONSTRAINT personnel_email_key UNIQUE (email);


--
-- Name: personnel personnel_keycloak_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personnel
    ADD CONSTRAINT personnel_keycloak_id_key UNIQUE (keycloak_id);


--
-- Name: personnel personnel_nom_utilisateur_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personnel
    ADD CONSTRAINT personnel_nom_utilisateur_key UNIQUE (nom_utilisateur);


--
-- Name: personnel personnel_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personnel
    ADD CONSTRAINT personnel_pkey PRIMARY KEY (id);


--
-- Name: ports ports_abbreviation_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_abbreviation_key UNIQUE (abbreviation);


--
-- Name: ports ports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_pkey PRIMARY KEY (id);


--
-- Name: type_frais_annexes type_frais_annexes_description_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_frais_annexes
    ADD CONSTRAINT type_frais_annexes_description_key UNIQUE (description);


--
-- Name: type_frais_annexes type_frais_annexes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.type_frais_annexes
    ADD CONSTRAINT type_frais_annexes_pkey PRIMARY KEY (id);


--
-- Name: vechat_conversations unique_conversation; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vechat_conversations
    ADD CONSTRAINT unique_conversation UNIQUE (participant1_id, participant1_type, participant2_id, participant2_type);


--
-- Name: vechat_conversations vechat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vechat_conversations
    ADD CONSTRAINT vechat_conversations_pkey PRIMARY KEY (id);


--
-- Name: vechat_messages vechat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vechat_messages
    ADD CONSTRAINT vechat_messages_pkey PRIMARY KEY (id);


--
-- Name: fed_user_attr_long_values; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX fed_user_attr_long_values ON keycloak.fed_user_attribute USING btree (long_value_hash, name);


--
-- Name: fed_user_attr_long_values_lower_case; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX fed_user_attr_long_values_lower_case ON keycloak.fed_user_attribute USING btree (long_value_hash_lower_case, name);


--
-- Name: idx_admin_event_time; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_admin_event_time ON keycloak.admin_event_entity USING btree (realm_id, admin_event_time);


--
-- Name: idx_assoc_pol_assoc_pol_id; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_assoc_pol_assoc_pol_id ON keycloak.associated_policy USING btree (associated_policy_id);


--
-- Name: idx_auth_config_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_auth_config_realm ON keycloak.authenticator_config USING btree (realm_id);


--
-- Name: idx_auth_exec_flow; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_auth_exec_flow ON keycloak.authentication_execution USING btree (flow_id);


--
-- Name: idx_auth_exec_realm_flow; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_auth_exec_realm_flow ON keycloak.authentication_execution USING btree (realm_id, flow_id);


--
-- Name: idx_auth_flow_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_auth_flow_realm ON keycloak.authentication_flow USING btree (realm_id);


--
-- Name: idx_cl_clscope; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_cl_clscope ON keycloak.client_scope_client USING btree (scope_id);


--
-- Name: idx_client_att_by_name_value; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_client_att_by_name_value ON keycloak.client_attributes USING btree (name, substr(value, 1, 255));


--
-- Name: idx_client_id; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_client_id ON keycloak.client USING btree (client_id);


--
-- Name: idx_client_init_acc_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_client_init_acc_realm ON keycloak.client_initial_access USING btree (realm_id);


--
-- Name: idx_clscope_attrs; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_clscope_attrs ON keycloak.client_scope_attributes USING btree (scope_id);


--
-- Name: idx_clscope_cl; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_clscope_cl ON keycloak.client_scope_client USING btree (client_id);


--
-- Name: idx_clscope_protmap; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_clscope_protmap ON keycloak.protocol_mapper USING btree (client_scope_id);


--
-- Name: idx_clscope_role; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_clscope_role ON keycloak.client_scope_role_mapping USING btree (scope_id);


--
-- Name: idx_compo_config_compo; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_compo_config_compo ON keycloak.component_config USING btree (component_id);


--
-- Name: idx_component_provider_type; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_component_provider_type ON keycloak.component USING btree (provider_type);


--
-- Name: idx_component_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_component_realm ON keycloak.component USING btree (realm_id);


--
-- Name: idx_composite; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_composite ON keycloak.composite_role USING btree (composite);


--
-- Name: idx_composite_child; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_composite_child ON keycloak.composite_role USING btree (child_role);


--
-- Name: idx_defcls_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_defcls_realm ON keycloak.default_client_scope USING btree (realm_id);


--
-- Name: idx_defcls_scope; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_defcls_scope ON keycloak.default_client_scope USING btree (scope_id);


--
-- Name: idx_event_time; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_event_time ON keycloak.event_entity USING btree (realm_id, event_time);


--
-- Name: idx_fedidentity_feduser; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fedidentity_feduser ON keycloak.federated_identity USING btree (federated_user_id);


--
-- Name: idx_fedidentity_user; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fedidentity_user ON keycloak.federated_identity USING btree (user_id);


--
-- Name: idx_fu_attribute; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_attribute ON keycloak.fed_user_attribute USING btree (user_id, realm_id, name);


--
-- Name: idx_fu_cnsnt_ext; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_cnsnt_ext ON keycloak.fed_user_consent USING btree (user_id, client_storage_provider, external_client_id);


--
-- Name: idx_fu_consent; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_consent ON keycloak.fed_user_consent USING btree (user_id, client_id);


--
-- Name: idx_fu_consent_ru; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_consent_ru ON keycloak.fed_user_consent USING btree (realm_id, user_id);


--
-- Name: idx_fu_credential; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_credential ON keycloak.fed_user_credential USING btree (user_id, type);


--
-- Name: idx_fu_credential_ru; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_credential_ru ON keycloak.fed_user_credential USING btree (realm_id, user_id);


--
-- Name: idx_fu_group_membership; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_group_membership ON keycloak.fed_user_group_membership USING btree (user_id, group_id);


--
-- Name: idx_fu_group_membership_ru; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_group_membership_ru ON keycloak.fed_user_group_membership USING btree (realm_id, user_id);


--
-- Name: idx_fu_required_action; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_required_action ON keycloak.fed_user_required_action USING btree (user_id, required_action);


--
-- Name: idx_fu_required_action_ru; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_required_action_ru ON keycloak.fed_user_required_action USING btree (realm_id, user_id);


--
-- Name: idx_fu_role_mapping; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_role_mapping ON keycloak.fed_user_role_mapping USING btree (user_id, role_id);


--
-- Name: idx_fu_role_mapping_ru; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_fu_role_mapping_ru ON keycloak.fed_user_role_mapping USING btree (realm_id, user_id);


--
-- Name: idx_group_att_by_name_value; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_group_att_by_name_value ON keycloak.group_attribute USING btree (name, ((value)::character varying(250)));


--
-- Name: idx_group_attr_group; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_group_attr_group ON keycloak.group_attribute USING btree (group_id);


--
-- Name: idx_group_role_mapp_group; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_group_role_mapp_group ON keycloak.group_role_mapping USING btree (group_id);


--
-- Name: idx_id_prov_mapp_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_id_prov_mapp_realm ON keycloak.identity_provider_mapper USING btree (realm_id);


--
-- Name: idx_ident_prov_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_ident_prov_realm ON keycloak.identity_provider USING btree (realm_id);


--
-- Name: idx_idp_for_login; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_idp_for_login ON keycloak.identity_provider USING btree (realm_id, enabled, link_only, hide_on_login, organization_id);


--
-- Name: idx_idp_realm_org; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_idp_realm_org ON keycloak.identity_provider USING btree (realm_id, organization_id);


--
-- Name: idx_keycloak_role_client; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_keycloak_role_client ON keycloak.keycloak_role USING btree (client);


--
-- Name: idx_keycloak_role_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_keycloak_role_realm ON keycloak.keycloak_role USING btree (realm);


--
-- Name: idx_offline_uss_by_broker_session_id; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_offline_uss_by_broker_session_id ON keycloak.offline_user_session USING btree (broker_session_id, realm_id);


--
-- Name: idx_offline_uss_by_last_session_refresh; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_offline_uss_by_last_session_refresh ON keycloak.offline_user_session USING btree (realm_id, offline_flag, last_session_refresh);


--
-- Name: idx_offline_uss_by_user; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_offline_uss_by_user ON keycloak.offline_user_session USING btree (user_id, realm_id, offline_flag);


--
-- Name: idx_org_domain_org_id; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_org_domain_org_id ON keycloak.org_domain USING btree (org_id);


--
-- Name: idx_perm_ticket_owner; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_perm_ticket_owner ON keycloak.resource_server_perm_ticket USING btree (owner);


--
-- Name: idx_perm_ticket_requester; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_perm_ticket_requester ON keycloak.resource_server_perm_ticket USING btree (requester);


--
-- Name: idx_protocol_mapper_client; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_protocol_mapper_client ON keycloak.protocol_mapper USING btree (client_id);


--
-- Name: idx_realm_attr_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_realm_attr_realm ON keycloak.realm_attribute USING btree (realm_id);


--
-- Name: idx_realm_clscope; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_realm_clscope ON keycloak.client_scope USING btree (realm_id);


--
-- Name: idx_realm_def_grp_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_realm_def_grp_realm ON keycloak.realm_default_groups USING btree (realm_id);


--
-- Name: idx_realm_evt_list_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_realm_evt_list_realm ON keycloak.realm_events_listeners USING btree (realm_id);


--
-- Name: idx_realm_evt_types_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_realm_evt_types_realm ON keycloak.realm_enabled_event_types USING btree (realm_id);


--
-- Name: idx_realm_master_adm_cli; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_realm_master_adm_cli ON keycloak.realm USING btree (master_admin_client);


--
-- Name: idx_realm_supp_local_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_realm_supp_local_realm ON keycloak.realm_supported_locales USING btree (realm_id);


--
-- Name: idx_redir_uri_client; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_redir_uri_client ON keycloak.redirect_uris USING btree (client_id);


--
-- Name: idx_req_act_prov_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_req_act_prov_realm ON keycloak.required_action_provider USING btree (realm_id);


--
-- Name: idx_res_policy_policy; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_res_policy_policy ON keycloak.resource_policy USING btree (policy_id);


--
-- Name: idx_res_scope_scope; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_res_scope_scope ON keycloak.resource_scope USING btree (scope_id);


--
-- Name: idx_res_serv_pol_res_serv; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_res_serv_pol_res_serv ON keycloak.resource_server_policy USING btree (resource_server_id);


--
-- Name: idx_res_srv_res_res_srv; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_res_srv_res_res_srv ON keycloak.resource_server_resource USING btree (resource_server_id);


--
-- Name: idx_res_srv_scope_res_srv; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_res_srv_scope_res_srv ON keycloak.resource_server_scope USING btree (resource_server_id);


--
-- Name: idx_rev_token_on_expire; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_rev_token_on_expire ON keycloak.revoked_token USING btree (expire);


--
-- Name: idx_role_attribute; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_role_attribute ON keycloak.role_attribute USING btree (role_id);


--
-- Name: idx_role_clscope; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_role_clscope ON keycloak.client_scope_role_mapping USING btree (role_id);


--
-- Name: idx_scope_mapping_role; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_scope_mapping_role ON keycloak.scope_mapping USING btree (role_id);


--
-- Name: idx_scope_policy_policy; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_scope_policy_policy ON keycloak.scope_policy USING btree (policy_id);


--
-- Name: idx_update_time; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_update_time ON keycloak.migration_model USING btree (update_time);


--
-- Name: idx_usconsent_clscope; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_usconsent_clscope ON keycloak.user_consent_client_scope USING btree (user_consent_id);


--
-- Name: idx_usconsent_scope_id; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_usconsent_scope_id ON keycloak.user_consent_client_scope USING btree (scope_id);


--
-- Name: idx_user_attribute; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_user_attribute ON keycloak.user_attribute USING btree (user_id);


--
-- Name: idx_user_attribute_name; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_user_attribute_name ON keycloak.user_attribute USING btree (name, value);


--
-- Name: idx_user_consent; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_user_consent ON keycloak.user_consent USING btree (user_id);


--
-- Name: idx_user_credential; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_user_credential ON keycloak.credential USING btree (user_id);


--
-- Name: idx_user_email; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_user_email ON keycloak.user_entity USING btree (email);


--
-- Name: idx_user_group_mapping; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_user_group_mapping ON keycloak.user_group_membership USING btree (user_id);


--
-- Name: idx_user_reqactions; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_user_reqactions ON keycloak.user_required_action USING btree (user_id);


--
-- Name: idx_user_role_mapping; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_user_role_mapping ON keycloak.user_role_mapping USING btree (user_id);


--
-- Name: idx_user_service_account; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_user_service_account ON keycloak.user_entity USING btree (realm_id, service_account_client_link);


--
-- Name: idx_usr_fed_map_fed_prv; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_usr_fed_map_fed_prv ON keycloak.user_federation_mapper USING btree (federation_provider_id);


--
-- Name: idx_usr_fed_map_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_usr_fed_map_realm ON keycloak.user_federation_mapper USING btree (realm_id);


--
-- Name: idx_usr_fed_prv_realm; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_usr_fed_prv_realm ON keycloak.user_federation_provider USING btree (realm_id);


--
-- Name: idx_web_orig_client; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX idx_web_orig_client ON keycloak.web_origins USING btree (client_id);


--
-- Name: user_attr_long_values; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX user_attr_long_values ON keycloak.user_attribute USING btree (long_value_hash, name);


--
-- Name: user_attr_long_values_lower_case; Type: INDEX; Schema: keycloak; Owner: msp
--

CREATE INDEX user_attr_long_values_lower_case ON keycloak.user_attribute USING btree (long_value_hash_lower_case, name);


--
-- Name: idx_activities_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_assigned_to ON public.crm_activities USING btree (assigned_to);


--
-- Name: idx_activities_assigned_to_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_assigned_to_ids ON public.crm_activities USING gin (assigned_to_ids);


--
-- Name: idx_activities_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_due_date ON public.crm_activities USING btree (due_date);


--
-- Name: idx_activities_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_lead_id ON public.crm_activities USING btree (lead_id);


--
-- Name: idx_activities_opportunity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_opportunity_id ON public.crm_activities USING btree (opportunity_id);


--
-- Name: idx_activities_scheduled_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_scheduled_at ON public.crm_activities USING btree (scheduled_at);


--
-- Name: idx_activities_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_status ON public.crm_activities USING btree (status);


--
-- Name: idx_activities_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_type ON public.crm_activities USING btree (type);


--
-- Name: idx_activity_participants_activity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_participants_activity_id ON public.crm_activity_participants USING btree (activity_id);


--
-- Name: idx_activity_participants_personnel_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_participants_personnel_id ON public.crm_activity_participants USING btree (personnel_id);


--
-- Name: idx_aeroports_abbreviation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_aeroports_abbreviation ON public.aeroports USING btree (abbreviation);


--
-- Name: idx_aeroports_isactive; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_aeroports_isactive ON public.aeroports USING btree (isactive);


--
-- Name: idx_aeroports_libelle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_aeroports_libelle ON public.aeroports USING btree (libelle);


--
-- Name: idx_aeroports_pays; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_aeroports_pays ON public.aeroports USING btree (pays);


--
-- Name: idx_aeroports_ville; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_aeroports_ville ON public.aeroports USING btree (ville);


--
-- Name: idx_armateurs_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_armateurs_code ON public.armateurs USING btree (code);


--
-- Name: idx_armateurs_isactive; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_armateurs_isactive ON public.armateurs USING btree (isactive);


--
-- Name: idx_armateurs_nom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_armateurs_nom ON public.armateurs USING btree (nom);


--
-- Name: idx_armateurs_pays; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_armateurs_pays ON public.armateurs USING btree (pays);


--
-- Name: idx_armateurs_ville; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_armateurs_ville ON public.armateurs USING btree (ville);


--
-- Name: idx_autorisations_tva_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_autorisations_tva_active ON public."AutorisationsTVA" USING btree (is_active);


--
-- Name: idx_autorisations_tva_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_autorisations_tva_client ON public."AutorisationsTVA" USING btree (client_id);


--
-- Name: idx_autorisations_tva_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_autorisations_tva_dates ON public."AutorisationsTVA" USING btree ("dateDebutValidite", "dateFinValidite");


--
-- Name: idx_autorisations_tva_numero; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_autorisations_tva_numero ON public."AutorisationsTVA" USING btree ("numeroAutorisation");


--
-- Name: idx_autorisations_tva_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_autorisations_tva_statut ON public."AutorisationsTVA" USING btree ("statutAutorisation");


--
-- Name: idx_bcsus_tva_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bcsus_tva_active ON public."BCsusTVA" USING btree (is_active);


--
-- Name: idx_bcsus_tva_autorisation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bcsus_tva_autorisation ON public."BCsusTVA" USING btree (autorisation_id);


--
-- Name: idx_bcsus_tva_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bcsus_tva_date ON public."BCsusTVA" USING btree ("dateBonCommande");


--
-- Name: idx_bcsus_tva_numero; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bcsus_tva_numero ON public."BCsusTVA" USING btree ("numeroBonCommande");


--
-- Name: idx_bcsus_tva_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bcsus_tva_statut ON public."BCsusTVA" USING btree (statut);


--
-- Name: idx_client_auto_delete_statut_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_auto_delete_statut_updated_at ON public.client USING btree (auto_delete, statut, updated_at) WHERE (auto_delete = true);


--
-- Name: idx_client_charge_com_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_charge_com_ids ON public.client USING gin (charge_com_ids);


--
-- Name: idx_client_etat_fiscal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_etat_fiscal ON public.client USING btree (etat_fiscal);


--
-- Name: idx_client_first_login; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_first_login ON public.client USING btree (first_login);


--
-- Name: idx_client_is_fournisseur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_is_fournisseur ON public.client USING btree (is_fournisseur) WHERE (is_fournisseur = true);


--
-- Name: idx_client_photo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_photo ON public.client USING btree (photo);


--
-- Name: idx_client_statut_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_statut_updated_at ON public.client USING btree (statut, updated_at);


--
-- Name: idx_clients_is_permanent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_is_permanent ON public.client USING btree (is_permanent);


--
-- Name: idx_contact_client_id_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_client_id_client ON public.contact_client USING btree (id_client);


--
-- Name: idx_contact_client_is_principal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_client_is_principal ON public.contact_client USING btree (is_principal);


--
-- Name: idx_contact_client_mail1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_client_mail1 ON public.contact_client USING btree (mail1);


--
-- Name: idx_contact_client_mail2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_client_mail2 ON public.contact_client USING btree (mail2);


--
-- Name: idx_correspondants_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_correspondants_code ON public.correspondants USING btree (code);


--
-- Name: idx_correspondants_libelle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_correspondants_libelle ON public.correspondants USING btree (libelle);


--
-- Name: idx_correspondants_nature; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_correspondants_nature ON public.correspondants USING btree (nature);


--
-- Name: idx_correspondants_pays; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_correspondants_pays ON public.correspondants USING btree (pays);


--
-- Name: idx_correspondants_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_correspondants_statut ON public.correspondants USING btree (statut);


--
-- Name: idx_correspondants_ville; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_correspondants_ville ON public.correspondants USING btree (ville);


--
-- Name: idx_crm_quotes_aeroport_enlevement_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crm_quotes_aeroport_enlevement_id ON public.crm_quotes USING btree (aeroport_enlevement_id);


--
-- Name: idx_crm_quotes_aeroport_livraison_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crm_quotes_aeroport_livraison_id ON public.crm_quotes USING btree (aeroport_livraison_id);


--
-- Name: idx_crm_quotes_armateur_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crm_quotes_armateur_id ON public.crm_quotes USING btree (armateur_id);


--
-- Name: idx_crm_quotes_navire_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crm_quotes_navire_id ON public.crm_quotes USING btree (navire_id);


--
-- Name: idx_crm_quotes_port_enlevement_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crm_quotes_port_enlevement_id ON public.crm_quotes USING btree (port_enlevement_id);


--
-- Name: idx_crm_quotes_port_livraison_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crm_quotes_port_livraison_id ON public.crm_quotes USING btree (port_livraison_id);


--
-- Name: idx_crm_quotes_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crm_quotes_type ON public.crm_quotes USING btree (type);


--
-- Name: idx_engin_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_engin_is_active ON public.engin USING btree (is_active);


--
-- Name: idx_engin_libelle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_engin_libelle ON public.engin USING btree (libelle);


--
-- Name: idx_fournisseurs_categorie; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fournisseurs_categorie ON public.fournisseurs USING btree (categorie);


--
-- Name: idx_fournisseurs_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fournisseurs_code ON public.fournisseurs USING btree (code);


--
-- Name: idx_fournisseurs_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fournisseurs_is_active ON public.fournisseurs USING btree (is_active);


--
-- Name: idx_fournisseurs_nom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fournisseurs_nom ON public.fournisseurs USING btree (nom);


--
-- Name: idx_fournisseurs_numero_identification; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fournisseurs_numero_identification ON public.fournisseurs USING btree (numero_identification);


--
-- Name: idx_fournisseurs_pays; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fournisseurs_pays ON public.fournisseurs USING btree (pays);


--
-- Name: idx_fournisseurs_type_fournisseur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fournisseurs_type_fournisseur ON public.fournisseurs USING btree (type_fournisseur);


--
-- Name: idx_fournisseurs_ville; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fournisseurs_ville ON public.fournisseurs USING btree (ville);


--
-- Name: idx_leads_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_assigned_to ON public.crm_leads USING btree (assigned_to);


--
-- Name: idx_leads_assigned_to_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_assigned_to_ids ON public.crm_leads USING gin (assigned_to_ids);


--
-- Name: idx_leads_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_company ON public.crm_leads USING btree (company);


--
-- Name: idx_leads_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_country ON public.crm_leads USING btree (country);


--
-- Name: idx_leads_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_created_at ON public.crm_leads USING btree (created_at);


--
-- Name: idx_leads_currency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_currency ON public.crm_leads USING btree (currency);


--
-- Name: idx_leads_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_deleted_at ON public.crm_leads USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_leads_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_email ON public.crm_leads USING btree (email);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_status ON public.crm_leads USING btree (status);


--
-- Name: idx_leads_traffic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_traffic ON public.crm_leads USING btree (traffic);


--
-- Name: idx_navires_armateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_navires_armateur ON public.navires USING btree (armateur_id);


--
-- Name: idx_navires_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_navires_code ON public.navires USING btree (code);


--
-- Name: idx_navires_libelle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_navires_libelle ON public.navires USING btree (libelle);


--
-- Name: idx_navires_nationalite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_navires_nationalite ON public.navires USING btree (nationalite);


--
-- Name: idx_navires_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_navires_statut ON public.navires USING btree (statut);


--
-- Name: idx_objectif_com_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objectif_com_is_active ON public.objectif_com USING btree (is_active);


--
-- Name: idx_objectif_com_personnel_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objectif_com_personnel_active ON public.objectif_com USING btree (id_personnel, is_active);


--
-- Name: idx_opportunities_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_assigned_to ON public.crm_opportunities USING btree (assigned_to);


--
-- Name: idx_opportunities_assigned_to_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_assigned_to_ids ON public.crm_opportunities USING gin (assigned_to_ids);


--
-- Name: idx_opportunities_currency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_currency ON public.crm_opportunities USING btree (currency);


--
-- Name: idx_opportunities_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_deleted_at ON public.crm_opportunities USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_opportunities_expected_close_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_expected_close_date ON public.crm_opportunities USING btree (expected_close_date);


--
-- Name: idx_opportunities_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_stage ON public.crm_opportunities USING btree (stage);


--
-- Name: idx_opportunities_traffic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_traffic ON public.crm_opportunities USING btree (traffic);


--
-- Name: idx_opportunities_value; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opportunities_value ON public.crm_opportunities USING btree (value);


--
-- Name: idx_personnel_auto_delete_statut_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_personnel_auto_delete_statut_updated_at ON public.personnel USING btree (auto_delete, statut, updated_at) WHERE (auto_delete = true);


--
-- Name: idx_personnel_first_login; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_personnel_first_login ON public.personnel USING btree (first_login);


--
-- Name: idx_personnel_geolocation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_personnel_geolocation ON public.personnel USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_personnel_last_location_update; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_personnel_last_location_update ON public.personnel USING btree (last_location_update DESC) WHERE (last_location_update IS NOT NULL);


--
-- Name: idx_personnel_location_tracking; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_personnel_location_tracking ON public.personnel USING btree (location_tracking_enabled, is_location_active) WHERE (location_tracking_enabled = true);


--
-- Name: idx_personnel_photo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_personnel_photo ON public.personnel USING btree (photo);


--
-- Name: idx_pipeline_stages_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pipeline_stages_order ON public.crm_pipeline_stages USING btree (stage_order);


--
-- Name: idx_pipeline_stages_pipeline_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pipeline_stages_pipeline_id ON public.crm_pipeline_stages USING btree (pipeline_id);


--
-- Name: idx_ports_abbreviation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ports_abbreviation ON public.ports USING btree (abbreviation);


--
-- Name: idx_ports_isactive; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ports_isactive ON public.ports USING btree (isactive);


--
-- Name: idx_ports_libelle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ports_libelle ON public.ports USING btree (libelle);


--
-- Name: idx_ports_pays; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ports_pays ON public.ports USING btree (pays);


--
-- Name: idx_ports_ville; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ports_ville ON public.ports USING btree (ville);


--
-- Name: idx_quote_items_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_items_category ON public.crm_quote_items USING btree (category);


--
-- Name: idx_quote_items_destination_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_items_destination_city ON public.crm_quote_items USING btree (destination_city);


--
-- Name: idx_quote_items_item_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_items_item_type ON public.crm_quote_items USING btree (item_type);


--
-- Name: idx_quote_items_line_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_items_line_order ON public.crm_quote_items USING btree (line_order);


--
-- Name: idx_quote_items_origin_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_items_origin_city ON public.crm_quote_items USING btree (origin_city);


--
-- Name: idx_quote_items_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_items_quote_id ON public.crm_quote_items USING btree (quote_id);


--
-- Name: idx_quotes_client_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_client_type ON public.crm_quotes USING btree (client_type);


--
-- Name: idx_quotes_commercial_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_commercial_id ON public.crm_quotes USING btree (commercial_id);


--
-- Name: idx_quotes_commercial_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_commercial_ids ON public.crm_quotes USING gin (commercial_ids);


--
-- Name: idx_quotes_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_country ON public.crm_quotes USING btree (country);


--
-- Name: idx_quotes_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_created_by ON public.crm_quotes USING btree (created_by);


--
-- Name: idx_quotes_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_deleted_at ON public.crm_quotes USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_quotes_quote_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_quote_number ON public.crm_quotes USING btree (quote_number);


--
-- Name: idx_quotes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_status ON public.crm_quotes USING btree (status);


--
-- Name: idx_quotes_valid_until; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_valid_until ON public.crm_quotes USING btree (valid_until);


--
-- Name: idx_quotes_vehicle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_vehicle_id ON public.crm_quotes USING btree (vehicle_id);


--
-- Name: idx_type_frais_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_type_frais_active ON public.type_frais_annexes USING btree (is_active);


--
-- Name: idx_vechat_conversation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_conversation ON public.vechat_messages USING btree (sender_id, receiver_id, sender_type, receiver_type);


--
-- Name: idx_vechat_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_created_at ON public.vechat_messages USING btree (created_at);


--
-- Name: idx_vechat_last_message; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_last_message ON public.vechat_conversations USING btree (last_message_at);


--
-- Name: idx_vechat_messages_audio_duration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_messages_audio_duration ON public.vechat_messages USING btree (audio_duration) WHERE (audio_duration IS NOT NULL);


--
-- Name: idx_vechat_messages_delivered; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_messages_delivered ON public.vechat_messages USING btree (is_delivered);


--
-- Name: idx_vechat_messages_edited; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_messages_edited ON public.vechat_messages USING btree (is_edited);


--
-- Name: idx_vechat_messages_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_messages_location ON public.vechat_messages USING btree (location_latitude, location_longitude) WHERE ((location_latitude IS NOT NULL) AND (location_longitude IS NOT NULL));


--
-- Name: idx_vechat_messages_message_type_audio_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_messages_message_type_audio_location ON public.vechat_messages USING btree (message_type) WHERE ((message_type)::text = ANY ((ARRAY['audio'::character varying, 'location'::character varying])::text[]));


--
-- Name: idx_vechat_participant1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_participant1 ON public.vechat_conversations USING btree (participant1_id, participant1_type);


--
-- Name: idx_vechat_participant2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_participant2 ON public.vechat_conversations USING btree (participant2_id, participant2_type);


--
-- Name: idx_vechat_receiver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_receiver ON public.vechat_messages USING btree (receiver_id, receiver_type);


--
-- Name: idx_vechat_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_sender ON public.vechat_messages USING btree (sender_id, sender_type);


--
-- Name: idx_vechat_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vechat_unread ON public.vechat_messages USING btree (receiver_id, receiver_type, is_read);


--
-- Name: AutorisationsTVA trg_autorisations_tva_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_autorisations_tva_updated BEFORE UPDATE ON public."AutorisationsTVA" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: BCsusTVA trg_bcsus_tva_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bcsus_tva_updated BEFORE UPDATE ON public."BCsusTVA" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: crm_quotes trg_update_lead_status_on_quote_accepted; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_lead_status_on_quote_accepted AFTER INSERT OR UPDATE OF status ON public.crm_quotes FOR EACH ROW EXECUTE FUNCTION public.update_lead_status_on_quote_accepted();


--
-- Name: TRIGGER trg_update_lead_status_on_quote_accepted ON crm_quotes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER trg_update_lead_status_on_quote_accepted ON public.crm_quotes IS 'Trigger qui déclenche la mise à jour du statut prospect automatiquement lors de l''acceptation d''une cotation';


--
-- Name: vechat_messages trg_vechat_update_conversation_after_message_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_vechat_update_conversation_after_message_insert AFTER INSERT ON public.vechat_messages FOR EACH ROW EXECUTE FUNCTION public.trg_update_conversation_after_message_insert();


--
-- Name: vechat_messages trg_vechat_update_conversation_after_message_read; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_vechat_update_conversation_after_message_read AFTER UPDATE ON public.vechat_messages FOR EACH ROW EXECUTE FUNCTION public.trg_update_conversation_after_message_read();


--
-- Name: crm_activities trigger_activities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_activities_updated_at BEFORE UPDATE ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: correspondants trigger_generate_correspondant_code; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_generate_correspondant_code BEFORE INSERT ON public.correspondants FOR EACH ROW EXECUTE FUNCTION public.generate_correspondant_code();


--
-- Name: crm_leads trigger_leads_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_leads_updated_at BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: crm_opportunities trigger_opportunities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_opportunities_updated_at BEFORE UPDATE ON public.crm_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: crm_pipeline_stages trigger_pipeline_stages_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_pipeline_stages_updated_at BEFORE UPDATE ON public.crm_pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: crm_pipelines trigger_pipelines_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_pipelines_updated_at BEFORE UPDATE ON public.crm_pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: crm_quotes trigger_quotes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_quotes_updated_at BEFORE UPDATE ON public.crm_quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: armateurs trigger_update_armateurs_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_armateurs_timestamp BEFORE UPDATE ON public.armateurs FOR EACH ROW EXECUTE FUNCTION public.update_armateurs_updated_at();


--
-- Name: correspondants trigger_update_correspondants_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_correspondants_updated_at BEFORE UPDATE ON public.correspondants FOR EACH ROW EXECUTE FUNCTION public.update_correspondants_updated_at();


--
-- Name: fournisseurs trigger_update_fournisseurs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_fournisseurs_updated_at BEFORE UPDATE ON public.fournisseurs FOR EACH ROW EXECUTE FUNCTION public.update_fournisseurs_updated_at();


--
-- Name: type_frais_annexes trigger_update_type_frais_annexes_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_type_frais_annexes_timestamp BEFORE UPDATE ON public.type_frais_annexes FOR EACH ROW EXECUTE FUNCTION public.update_type_frais_annexes_timestamp();


--
-- Name: aeroports update_aeroports_updatedat; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_aeroports_updatedat BEFORE UPDATE ON public.aeroports FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: ports update_ports_updatedat; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_ports_updatedat BEFORE UPDATE ON public.ports FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: identity_provider fk2b4ebc52ae5c3b34; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.identity_provider
    ADD CONSTRAINT fk2b4ebc52ae5c3b34 FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: client_attributes fk3c47c64beacca966; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_attributes
    ADD CONSTRAINT fk3c47c64beacca966 FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: federated_identity fk404288b92ef007a6; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.federated_identity
    ADD CONSTRAINT fk404288b92ef007a6 FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: client_node_registrations fk4129723ba992f594; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_node_registrations
    ADD CONSTRAINT fk4129723ba992f594 FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: redirect_uris fk_1burs8pb4ouj97h5wuppahv9f; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.redirect_uris
    ADD CONSTRAINT fk_1burs8pb4ouj97h5wuppahv9f FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: user_federation_provider fk_1fj32f6ptolw2qy60cd8n01e8; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_federation_provider
    ADD CONSTRAINT fk_1fj32f6ptolw2qy60cd8n01e8 FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: realm_required_credential fk_5hg65lybevavkqfki3kponh9v; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_required_credential
    ADD CONSTRAINT fk_5hg65lybevavkqfki3kponh9v FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: resource_attribute fk_5hrm2vlf9ql5fu022kqepovbr; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_attribute
    ADD CONSTRAINT fk_5hrm2vlf9ql5fu022kqepovbr FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: user_attribute fk_5hrm2vlf9ql5fu043kqepovbr; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_attribute
    ADD CONSTRAINT fk_5hrm2vlf9ql5fu043kqepovbr FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: user_required_action fk_6qj3w1jw9cvafhe19bwsiuvmd; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_required_action
    ADD CONSTRAINT fk_6qj3w1jw9cvafhe19bwsiuvmd FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: keycloak_role fk_6vyqfe4cn4wlq8r6kt5vdsj5c; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.keycloak_role
    ADD CONSTRAINT fk_6vyqfe4cn4wlq8r6kt5vdsj5c FOREIGN KEY (realm) REFERENCES keycloak.realm(id);


--
-- Name: realm_smtp_config fk_70ej8xdxgxd0b9hh6180irr0o; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_smtp_config
    ADD CONSTRAINT fk_70ej8xdxgxd0b9hh6180irr0o FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: realm_attribute fk_8shxd6l3e9atqukacxgpffptw; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_attribute
    ADD CONSTRAINT fk_8shxd6l3e9atqukacxgpffptw FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: composite_role fk_a63wvekftu8jo1pnj81e7mce2; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.composite_role
    ADD CONSTRAINT fk_a63wvekftu8jo1pnj81e7mce2 FOREIGN KEY (composite) REFERENCES keycloak.keycloak_role(id);


--
-- Name: authentication_execution fk_auth_exec_flow; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.authentication_execution
    ADD CONSTRAINT fk_auth_exec_flow FOREIGN KEY (flow_id) REFERENCES keycloak.authentication_flow(id);


--
-- Name: authentication_execution fk_auth_exec_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.authentication_execution
    ADD CONSTRAINT fk_auth_exec_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: authentication_flow fk_auth_flow_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.authentication_flow
    ADD CONSTRAINT fk_auth_flow_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: authenticator_config fk_auth_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.authenticator_config
    ADD CONSTRAINT fk_auth_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: user_role_mapping fk_c4fqv34p1mbylloxang7b1q3l; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_role_mapping
    ADD CONSTRAINT fk_c4fqv34p1mbylloxang7b1q3l FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: client_scope_attributes fk_cl_scope_attr_scope; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_scope_attributes
    ADD CONSTRAINT fk_cl_scope_attr_scope FOREIGN KEY (scope_id) REFERENCES keycloak.client_scope(id);


--
-- Name: client_scope_role_mapping fk_cl_scope_rm_scope; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_scope_role_mapping
    ADD CONSTRAINT fk_cl_scope_rm_scope FOREIGN KEY (scope_id) REFERENCES keycloak.client_scope(id);


--
-- Name: protocol_mapper fk_cli_scope_mapper; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.protocol_mapper
    ADD CONSTRAINT fk_cli_scope_mapper FOREIGN KEY (client_scope_id) REFERENCES keycloak.client_scope(id);


--
-- Name: client_initial_access fk_client_init_acc_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.client_initial_access
    ADD CONSTRAINT fk_client_init_acc_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: component_config fk_component_config; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.component_config
    ADD CONSTRAINT fk_component_config FOREIGN KEY (component_id) REFERENCES keycloak.component(id);


--
-- Name: component fk_component_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.component
    ADD CONSTRAINT fk_component_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: realm_default_groups fk_def_groups_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_default_groups
    ADD CONSTRAINT fk_def_groups_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: user_federation_mapper_config fk_fedmapper_cfg; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_federation_mapper_config
    ADD CONSTRAINT fk_fedmapper_cfg FOREIGN KEY (user_federation_mapper_id) REFERENCES keycloak.user_federation_mapper(id);


--
-- Name: user_federation_mapper fk_fedmapperpm_fedprv; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_federation_mapper
    ADD CONSTRAINT fk_fedmapperpm_fedprv FOREIGN KEY (federation_provider_id) REFERENCES keycloak.user_federation_provider(id);


--
-- Name: user_federation_mapper fk_fedmapperpm_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_federation_mapper
    ADD CONSTRAINT fk_fedmapperpm_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: associated_policy fk_frsr5s213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.associated_policy
    ADD CONSTRAINT fk_frsr5s213xcx4wnkog82ssrfy FOREIGN KEY (associated_policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: scope_policy fk_frsrasp13xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.scope_policy
    ADD CONSTRAINT fk_frsrasp13xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog82sspmt; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog82sspmt FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: resource_server_resource fk_frsrho213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_resource
    ADD CONSTRAINT fk_frsrho213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog83sspmt; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog83sspmt FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog84sspmt; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog84sspmt FOREIGN KEY (scope_id) REFERENCES keycloak.resource_server_scope(id);


--
-- Name: associated_policy fk_frsrpas14xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.associated_policy
    ADD CONSTRAINT fk_frsrpas14xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: scope_policy fk_frsrpass3xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.scope_policy
    ADD CONSTRAINT fk_frsrpass3xcx4wnkog82ssrfy FOREIGN KEY (scope_id) REFERENCES keycloak.resource_server_scope(id);


--
-- Name: resource_server_perm_ticket fk_frsrpo2128cx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrpo2128cx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: resource_server_policy fk_frsrpo213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_policy
    ADD CONSTRAINT fk_frsrpo213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: resource_scope fk_frsrpos13xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_scope
    ADD CONSTRAINT fk_frsrpos13xcx4wnkog82ssrfy FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: resource_policy fk_frsrpos53xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_policy
    ADD CONSTRAINT fk_frsrpos53xcx4wnkog82ssrfy FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: resource_policy fk_frsrpp213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_policy
    ADD CONSTRAINT fk_frsrpp213xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: resource_scope fk_frsrps213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_scope
    ADD CONSTRAINT fk_frsrps213xcx4wnkog82ssrfy FOREIGN KEY (scope_id) REFERENCES keycloak.resource_server_scope(id);


--
-- Name: resource_server_scope fk_frsrso213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_server_scope
    ADD CONSTRAINT fk_frsrso213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: composite_role fk_gr7thllb9lu8q4vqa4524jjy8; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.composite_role
    ADD CONSTRAINT fk_gr7thllb9lu8q4vqa4524jjy8 FOREIGN KEY (child_role) REFERENCES keycloak.keycloak_role(id);


--
-- Name: user_consent_client_scope fk_grntcsnt_clsc_usc; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_consent_client_scope
    ADD CONSTRAINT fk_grntcsnt_clsc_usc FOREIGN KEY (user_consent_id) REFERENCES keycloak.user_consent(id);


--
-- Name: user_consent fk_grntcsnt_user; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_consent
    ADD CONSTRAINT fk_grntcsnt_user FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: group_attribute fk_group_attribute_group; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.group_attribute
    ADD CONSTRAINT fk_group_attribute_group FOREIGN KEY (group_id) REFERENCES keycloak.keycloak_group(id);


--
-- Name: group_role_mapping fk_group_role_group; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.group_role_mapping
    ADD CONSTRAINT fk_group_role_group FOREIGN KEY (group_id) REFERENCES keycloak.keycloak_group(id);


--
-- Name: realm_enabled_event_types fk_h846o4h0w8epx5nwedrf5y69j; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_enabled_event_types
    ADD CONSTRAINT fk_h846o4h0w8epx5nwedrf5y69j FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: realm_events_listeners fk_h846o4h0w8epx5nxev9f5y69j; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_events_listeners
    ADD CONSTRAINT fk_h846o4h0w8epx5nxev9f5y69j FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: identity_provider_mapper fk_idpm_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.identity_provider_mapper
    ADD CONSTRAINT fk_idpm_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: idp_mapper_config fk_idpmconfig; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.idp_mapper_config
    ADD CONSTRAINT fk_idpmconfig FOREIGN KEY (idp_mapper_id) REFERENCES keycloak.identity_provider_mapper(id);


--
-- Name: web_origins fk_lojpho213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.web_origins
    ADD CONSTRAINT fk_lojpho213xcx4wnkog82ssrfy FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: scope_mapping fk_ouse064plmlr732lxjcn1q5f1; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.scope_mapping
    ADD CONSTRAINT fk_ouse064plmlr732lxjcn1q5f1 FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: protocol_mapper fk_pcm_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.protocol_mapper
    ADD CONSTRAINT fk_pcm_realm FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: credential fk_pfyr0glasqyl0dei3kl69r6v0; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.credential
    ADD CONSTRAINT fk_pfyr0glasqyl0dei3kl69r6v0 FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: protocol_mapper_config fk_pmconfig; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.protocol_mapper_config
    ADD CONSTRAINT fk_pmconfig FOREIGN KEY (protocol_mapper_id) REFERENCES keycloak.protocol_mapper(id);


--
-- Name: default_client_scope fk_r_def_cli_scope_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.default_client_scope
    ADD CONSTRAINT fk_r_def_cli_scope_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: required_action_provider fk_req_act_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.required_action_provider
    ADD CONSTRAINT fk_req_act_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: resource_uris fk_resource_server_uris; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.resource_uris
    ADD CONSTRAINT fk_resource_server_uris FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: role_attribute fk_role_attribute_id; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.role_attribute
    ADD CONSTRAINT fk_role_attribute_id FOREIGN KEY (role_id) REFERENCES keycloak.keycloak_role(id);


--
-- Name: realm_supported_locales fk_supported_locales_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.realm_supported_locales
    ADD CONSTRAINT fk_supported_locales_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: user_federation_config fk_t13hpu1j94r2ebpekr39x5eu5; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_federation_config
    ADD CONSTRAINT fk_t13hpu1j94r2ebpekr39x5eu5 FOREIGN KEY (user_federation_provider_id) REFERENCES keycloak.user_federation_provider(id);


--
-- Name: user_group_membership fk_user_group_user; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.user_group_membership
    ADD CONSTRAINT fk_user_group_user FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: policy_config fkdc34197cf864c4e43; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.policy_config
    ADD CONSTRAINT fkdc34197cf864c4e43 FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: identity_provider_config fkdc4897cf864c4e43; Type: FK CONSTRAINT; Schema: keycloak; Owner: msp
--

ALTER TABLE ONLY keycloak.identity_provider_config
    ADD CONSTRAINT fkdc4897cf864c4e43 FOREIGN KEY (identity_provider_id) REFERENCES keycloak.identity_provider(internal_id);


--
-- Name: AutorisationsTVA FK_AutorisationsTVA_Client; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AutorisationsTVA"
    ADD CONSTRAINT "FK_AutorisationsTVA_Client" FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- Name: BCsusTVA FK_BCsusTVA_Autorisation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BCsusTVA"
    ADD CONSTRAINT "FK_BCsusTVA_Autorisation" FOREIGN KEY (autorisation_id) REFERENCES public."AutorisationsTVA"(id) ON DELETE CASCADE;


--
-- Name: contact_client contact_client_new_id_client_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_client
    ADD CONSTRAINT contact_client_new_id_client_fkey FOREIGN KEY (id_client) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- Name: crm_activities crm_activities_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.personnel(id);


--
-- Name: crm_activities crm_activities_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: crm_activities crm_activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: crm_activities crm_activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id);


--
-- Name: crm_activities crm_activities_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.crm_opportunities(id);


--
-- Name: crm_activities crm_activities_parent_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_parent_activity_id_fkey FOREIGN KEY (parent_activity_id) REFERENCES public.crm_activities(id);


--
-- Name: crm_activities crm_activities_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.crm_quotes(id);


--
-- Name: crm_activity_participants crm_activity_participants_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activity_participants
    ADD CONSTRAINT crm_activity_participants_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.crm_activities(id) ON DELETE CASCADE;


--
-- Name: crm_activity_participants crm_activity_participants_personnel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_activity_participants
    ADD CONSTRAINT crm_activity_participants_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES public.personnel(id);


--
-- Name: crm_leads crm_leads_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.personnel(id);


--
-- Name: crm_leads crm_leads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: crm_leads crm_leads_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.personnel(id);


--
-- Name: crm_opportunities crm_opportunities_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.personnel(id);


--
-- Name: crm_opportunities crm_opportunities_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: crm_opportunities crm_opportunities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: crm_opportunities crm_opportunities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id);


--
-- Name: crm_opportunities crm_opportunities_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.personnel(id);


--
-- Name: crm_pipeline_stages crm_pipeline_stages_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_pipeline_stages
    ADD CONSTRAINT crm_pipeline_stages_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.crm_pipelines(id) ON DELETE CASCADE;


--
-- Name: crm_pipelines crm_pipelines_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_pipelines
    ADD CONSTRAINT crm_pipelines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: crm_quote_items crm_quote_items_engin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quote_items
    ADD CONSTRAINT crm_quote_items_engin_id_fkey FOREIGN KEY (engin_id) REFERENCES public.engin(id);


--
-- Name: crm_quote_items crm_quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quote_items
    ADD CONSTRAINT crm_quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.crm_quotes(id) ON DELETE CASCADE;


--
-- Name: crm_quotes crm_quotes_aeroport_enlevement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_aeroport_enlevement_id_fkey FOREIGN KEY (aeroport_enlevement_id) REFERENCES public.aeroports(id) ON DELETE SET NULL;


--
-- Name: crm_quotes crm_quotes_aeroport_livraison_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_aeroport_livraison_id_fkey FOREIGN KEY (aeroport_livraison_id) REFERENCES public.aeroports(id) ON DELETE SET NULL;


--
-- Name: crm_quotes crm_quotes_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.personnel(id);


--
-- Name: crm_quotes crm_quotes_armateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_armateur_id_fkey FOREIGN KEY (armateur_id) REFERENCES public.armateurs(id) ON DELETE SET NULL;


--
-- Name: crm_quotes crm_quotes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: crm_quotes crm_quotes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: crm_quotes crm_quotes_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id);


--
-- Name: crm_quotes crm_quotes_navire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_navire_id_fkey FOREIGN KEY (navire_id) REFERENCES public.navires(id) ON DELETE SET NULL;


--
-- Name: crm_quotes crm_quotes_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.crm_opportunities(id);


--
-- Name: crm_quotes crm_quotes_port_enlevement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_port_enlevement_id_fkey FOREIGN KEY (port_enlevement_id) REFERENCES public.ports(id) ON DELETE SET NULL;


--
-- Name: crm_quotes crm_quotes_port_livraison_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_port_livraison_id_fkey FOREIGN KEY (port_livraison_id) REFERENCES public.ports(id) ON DELETE SET NULL;


--
-- Name: crm_tags crm_tags_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_tags
    ADD CONSTRAINT crm_tags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.personnel(id);


--
-- Name: crm_leads fk_leads_archived_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT fk_leads_archived_by FOREIGN KEY (archived_by) REFERENCES public.personnel(id) ON DELETE SET NULL;


--
-- Name: navires fk_navire_armateur; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.navires
    ADD CONSTRAINT fk_navire_armateur FOREIGN KEY (armateur_id) REFERENCES public.armateurs(id) ON DELETE SET NULL;


--
-- Name: objectif_com fk_objectif_personnel; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objectif_com
    ADD CONSTRAINT fk_objectif_personnel FOREIGN KEY (id_personnel) REFERENCES public.personnel(id) ON DELETE CASCADE;


--
-- Name: crm_opportunities fk_opportunities_archived_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT fk_opportunities_archived_by FOREIGN KEY (archived_by) REFERENCES public.personnel(id) ON DELETE SET NULL;


--
-- Name: crm_quotes fk_quotes_archived_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT fk_quotes_archived_by FOREIGN KEY (archived_by) REFERENCES public.personnel(id) ON DELETE SET NULL;


--
-- Name: crm_quotes fk_quotes_commercial; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT fk_quotes_commercial FOREIGN KEY (commercial_id) REFERENCES public.personnel(id) ON DELETE SET NULL;


--
-- Name: crm_quotes fk_quotes_vehicle; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT fk_quotes_vehicle FOREIGN KEY (vehicle_id) REFERENCES public.engin(id) ON DELETE SET NULL;


--
-- Name: vechat_conversations vechat_conversations_last_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vechat_conversations
    ADD CONSTRAINT vechat_conversations_last_message_id_fkey FOREIGN KEY (last_message_id) REFERENCES public.vechat_messages(id) ON DELETE SET NULL;


--
-- Name: vechat_messages vechat_messages_reply_to_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vechat_messages
    ADD CONSTRAINT vechat_messages_reply_to_message_id_fkey FOREIGN KEY (reply_to_message_id) REFERENCES public.vechat_messages(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict IVEYjmzbrCwwg1Yxib7igu7bpUATU4uIqwbMKD87pVLJddL9LSaVHXNHM2yCOLj

