--
-- PostgreSQL database dump
--

\restrict ZtbeFAmD5falKNsYZh7HLI6fGkoU6jBxp4eBgPkp0SZvcKl6WHshpqqIjyYr7nO

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: crm_quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crm_quotes (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
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
    CONSTRAINT crm_quotes_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'viewed'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
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
-- Name: crm_quotes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes ALTER COLUMN id SET DEFAULT nextval('public.crm_quotes_id_seq'::regclass);


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
-- Name: idx_quotes_client_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_client_type ON public.crm_quotes USING btree (client_type);


--
-- Name: idx_quotes_commercial_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_commercial_id ON public.crm_quotes USING btree (commercial_id);


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
-- Name: crm_quotes trg_update_lead_status_on_quote_accepted; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_lead_status_on_quote_accepted AFTER INSERT OR UPDATE OF status ON public.crm_quotes FOR EACH ROW EXECUTE FUNCTION public.update_lead_status_on_quote_accepted();


--
-- Name: TRIGGER trg_update_lead_status_on_quote_accepted ON crm_quotes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER trg_update_lead_status_on_quote_accepted ON public.crm_quotes IS 'Trigger qui déclenche la mise à jour du statut prospect automatiquement lors de l''acceptation d''une cotation';


--
-- Name: crm_quotes trigger_quotes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_quotes_updated_at BEFORE UPDATE ON public.crm_quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: crm_quotes crm_quotes_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.personnel(id);


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
-- Name: crm_quotes crm_quotes_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crm_quotes
    ADD CONSTRAINT crm_quotes_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.crm_opportunities(id);


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
-- PostgreSQL database dump complete
--

\unrestrict ZtbeFAmD5falKNsYZh7HLI6fGkoU6jBxp4eBgPkp0SZvcKl6WHshpqqIjyYr7nO

