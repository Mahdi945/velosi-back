"""
Script d'importation de données depuis les APIs internationales - VERSION AMÉLIORÉE
Remplit les 4 tables (ports, aeroports, armateurs, navires) avec des données complètes et de qualité
"""

import requests
import psycopg2
from typing import Dict, List, Optional
import logging
from datetime import datetime
import time
import re
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class VelosiDataImporter:
    """Classe pour importer des données depuis les APIs internationales"""
    
    def __init__(self, db_config: Dict[str, str]):
        """
        Initialise l'importateur
        
        Args:
            db_config: Configuration de la base de données PostgreSQL
        """
        self.db_config = db_config
        self.conn = None
        
        # URLs des APIs
        self.wikidata_sparql_url = "https://query.wikidata.org/sparql"
        
        # Statistiques d'importation
        self.stats = {
            'ports': {'imported': 0, 'skipped': 0, 'errors': 0},
            'aeroports': {'imported': 0, 'skipped': 0, 'errors': 0},
            'armateurs': {'imported': 0, 'skipped': 0, 'errors': 0},
            'navires': {'imported': 0, 'skipped': 0, 'errors': 0}
        }
    
    def connect_db(self):
        """Établit la connexion à la base de données"""
        try:
            self.conn = psycopg2.connect(
                host=self.db_config['host'],
                database=self.db_config['database'],
                user=self.db_config['user'],
                password=self.db_config['password'],
                port=self.db_config.get('port', 5432)
            )
            logger.info("✅ Connexion à la base de données établie")
        except Exception as e:
            logger.error(f"❌ Erreur de connexion à la base de données: {e}")
            raise
    
    def close_db(self):
        """Ferme la connexion à la base de données"""
        if self.conn:
            self.conn.close()
            logger.info("🔒 Connexion fermée")
    
    def normalize_country_name(self, country: str) -> str:
        """Normalise le nom du pays en français"""
        if not country:
            return "Inconnu"
            
        country_mapping = {
            # Anglais vers français
            'France': 'France', 'Spain': 'Espagne', 'Italy': 'Italie',
            'Germany': 'Allemagne', 'Belgium': 'Belgique', 'Netherlands': 'Pays-Bas',
            'United Kingdom': 'Royaume-Uni', 'UK': 'Royaume-Uni', 'England': 'Royaume-Uni',
            'Portugal': 'Portugal', 'Greece': 'Grèce',
            'Morocco': 'Maroc', 'Algeria': 'Algérie', 'Tunisia': 'Tunisie',
            'Egypt': 'Égypte', 'Turkey': 'Turquie', 'Türkiye': 'Turquie',
            'United States': 'États-Unis', 'USA': 'États-Unis', 'US': 'États-Unis',
            'China': 'Chine', "People's Republic of China": 'Chine',
            'Japan': 'Japon', 'South Korea': 'Corée du Sud', 'Republic of Korea': 'Corée du Sud',
            'Singapore': 'Singapour',
            'United Arab Emirates': 'Émirats Arabes Unis', 'UAE': 'Émirats Arabes Unis',
            'Saudi Arabia': 'Arabie Saoudite',
            'Switzerland': 'Suisse', 'Austria': 'Autriche', 'Poland': 'Pologne',
            'Denmark': 'Danemark', 'Norway': 'Norvège', 'Sweden': 'Suède',
            'Finland': 'Finlande', 'Russia': 'Russie', 'Russian Federation': 'Russie',
            'Canada': 'Canada', 'Mexico': 'Mexique', 'Brazil': 'Brésil',
            'Argentina': 'Argentine', 'Chile': 'Chili', 'India': 'Inde',
            'Australia': 'Australie', 'New Zealand': 'Nouvelle-Zélande',
            'South Africa': 'Afrique du Sud', 'Nigeria': 'Nigéria',
            'Kenya': 'Kenya', 'Ghana': 'Ghana', 'Ethiopia': 'Éthiopie',
            'Israel': 'Israël', 'Iran': 'Iran', 'Iraq': 'Irak',
            'Pakistan': 'Pakistan', 'Bangladesh': 'Bangladesh',
            'Thailand': 'Thaïlande', 'Vietnam': 'Vietnam', 'Malaysia': 'Malaisie',
            'Indonesia': 'Indonésie', 'Philippines': 'Philippines',
            'Ireland': 'Irlande', 'Scotland': 'Écosse', 'Wales': 'Pays de Galles',
            'Czech Republic': 'République Tchèque', 'Hungary': 'Hongrie',
            'Romania': 'Roumanie', 'Bulgaria': 'Bulgarie', 'Croatia': 'Croatie',
            'Serbia': 'Serbie', 'Slovenia': 'Slovénie', 'Slovakia': 'Slovaquie',
        }
        return country_mapping.get(country, country)
    
    def generate_armateur_code_from_name(self, nom: str) -> str:
        """
        Génère un code armateur cohérent à partir du nom (format backend: ARM001, ARM002...)
        Mais pour la compatibilité, on génère un code basé sur le nom en attendant
        """
        # Supprimer les caractères spéciaux et garder seulement lettres/chiffres
        code = re.sub(r'[^A-Z0-9]', '', nom.upper())
        # Limiter à 10 caractères maximum (contrainte DB)
        return code[:10] if code else 'ARM'
    
    def generate_abbreviation(self, nom: str) -> str:
        """
        Génère une abréviation à partir du nom (premières lettres des mots en majuscules)
        """
        if not nom:
            return ""
        
        # Prendre les premières lettres des mots en majuscule
        words = [w for w in nom.split() if w and len(w) > 1]
        if not words:
            return nom[:3].upper()
        
        # Si c'est un nom court, prendre les 3 premières lettres
        if len(words) == 1 and len(words[0]) <= 5:
            return words[0][:3].upper()
        
        # Sinon, première lettre de chaque mot (max 10 caractères)
        abbrev = ''.join([w[0].upper() for w in words[:10]])
        return abbrev[:10]
    
    # ==================== IMPORTATION DES ARMATEURS ====================
    
    def import_professional_shipping_companies(self):
        """
        Importe les VRAIES compagnies maritimes professionnelles depuis Wikidata
        """
        print("="*80)
        logger.info("🏢 IMPORTATION DES COMPAGNIES MARITIMES PROFESSIONNELLES")
        print("="*80)
        
        # Requête SPARQL optimisée pour les vraies compagnies maritimes
        sparql_query = """
        SELECT DISTINCT ?item ?itemLabel ?countryLabel ?cityLabel ?hqLabel ?website WHERE {
          # Cibler les compagnies maritimes
          { ?item wdt:P31/wdt:P279* wd:Q1792644. }  # Shipping company
          UNION 
          { ?item wdt:P31/wdt:P279* wd:Q161726. }   # Freight company
          UNION
          { ?item wdt:P452 wd:Q7892674. }           # Industry: shipping
          UNION
          { ?item wdt:P452 wd:Q308604. }            # Industry: container shipping
          
          # EXCLURE les navires individuels, bateaux, yachts, barges
          FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q11446. }      # Pas de navires
          FILTER NOT EXISTS { ?item wdt:P31 wd:Q1229765. }               # Pas de yachts
          FILTER NOT EXISTS { ?item wdt:P31 wd:Q1229456. }               # Pas de bateaux à moteur
          FILTER NOT EXISTS { ?item wdt:P31 wd:Q174736. }                # Pas de ferries
          
          # Récupérer pays (OBLIGATOIRE)
          ?item wdt:P17 ?country.
          
          # Récupérer ville du siège (OPTIONNEL mais prioritaire)
          OPTIONAL { 
            ?item wdt:P159 ?hq.
            ?hq wdt:P131* ?city.
            ?city wdt:P31/wdt:P279* wd:Q515.  # Ville
          }
          
          # Site web
          OPTIONAL { ?item wdt:P856 ?website. }
          
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr,de,es,it,zh". }
        }
        ORDER BY ?countryLabel ?itemLabel
        LIMIT 1000
        """
        
        try:
            logger.info("📡 Requête Wikidata pour les compagnies maritimes professionnelles...")
            response = requests.get(
                self.wikidata_sparql_url,
                params={
                    'query': sparql_query,
                    'format': 'json'
                },
                headers={'User-Agent': 'VelosiERP/1.0'},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            results = data.get('results', {}).get('bindings', [])
            logger.info(f"  ✅ {len(results)} compagnies maritimes trouvées sur Wikidata")
            
            if len(results) == 0:
                logger.warning("  ⚠️ Aucune compagnie trouvée, utilisation du fallback...")
                results = self.get_fallback_shipping_companies()
            
        except Exception as e:
            logger.error(f"  ❌ Erreur lors de la requête Wikidata: {e}")
            logger.info("  🔄 Utilisation des données de secours...")
            results = self.get_fallback_shipping_companies()
        
        # Connexion à la DB et import
        self.connect_db()
        cursor = self.conn.cursor()
        
        try:
            for item in results:
                try:
                    # Extraction des données
                    nom = item.get('itemLabel', {}).get('value', 'Unknown')
                    
                    # Ignorer les entrées avec des identifiants Wikidata comme nom
                    if nom.startswith('Q') and nom[1:].isdigit():
                        continue
                    
                    # Pays (OBLIGATOIRE maintenant)
                    pays = item.get('countryLabel', {}).get('value')
                    if not pays or pays == 'Unknown' or pays.startswith('Q'):
                        pays = None
                    else:
                        pays = self.normalize_country_name(pays)
                    
                    # Si pas de pays, on skip cette entrée
                    if not pays:
                        self.stats['armateurs']['skipped'] += 1
                        continue
                    
                    # Ville
                    ville = item.get('cityLabel', {}).get('value') or item.get('hqLabel', {}).get('value')
                    if ville and (ville.startswith('Q') or ville == 'Unknown'):
                        ville = None
                    
                    # Site web
                    siteweb = item.get('website', {}).get('value')
                    
                    # Génération du code et abréviation
                    code = self.generate_armateur_code_from_name(nom)
                    abreviation = self.generate_abbreviation(nom)
                    
                    # Vérifier si l'armateur existe déjà
                    cursor.execute(
                        "SELECT id FROM armateurs WHERE LOWER(nom) = LOWER(%s) OR code = %s LIMIT 1",
                        (nom, code)
                    )
                    existing = cursor.fetchone()
                    
                    if existing:
                        logger.info(f"  ⏭️ Armateur existant: {nom}")
                        self.stats['armateurs']['skipped'] += 1
                        continue
                    
                    # Insérer l'armateur
                    cursor.execute("""
                        INSERT INTO armateurs 
                        (code, nom, abreviation, ville, pays, siteweb, isactive, createdat, updatedat)
                        VALUES (%s, %s, %s, %s, %s, %s, true, NOW(), NOW())
                    """, (code, nom, abreviation, ville, pays, siteweb))
                    
                    self.conn.commit()
                    logger.info(f"  ✅ Armateur ajouté: {nom} ({abreviation}) - {ville or '?'}, {pays}")
                    self.stats['armateurs']['imported'] += 1
                    
                except Exception as e:
                    logger.error(f"  ❌ Erreur lors de l'ajout de l'armateur: {e}")
                    self.stats['armateurs']['errors'] += 1
                    self.conn.rollback()
                    continue
            
            logger.info(f"✅ Armateurs importés: {self.stats['armateurs']['imported']}, ignorés: {self.stats['armateurs']['skipped']}")
            
        finally:
            cursor.close()
            self.close_db()
    
    def get_fallback_shipping_companies(self) -> List[Dict]:
        """
        Retourne une liste de compagnies maritimes majeures en cas d'échec API
        """
        companies = [
            {"itemLabel": {"value": "Maersk Line"}, "countryLabel": {"value": "Denmark"}, "cityLabel": {"value": "Copenhagen"}},
            {"itemLabel": {"value": "Mediterranean Shipping Company"}, "countryLabel": {"value": "Switzerland"}, "cityLabel": {"value": "Geneva"}},
            {"itemLabel": {"value": "CMA CGM"}, "countryLabel": {"value": "France"}, "cityLabel": {"value": "Marseille"}},
            {"itemLabel": {"value": "COSCO Shipping"}, "countryLabel": {"value": "China"}, "cityLabel": {"value": "Shanghai"}},
            {"itemLabel": {"value": "Hapag-Lloyd"}, "countryLabel": {"value": "Germany"}, "cityLabel": {"value": "Hamburg"}},
            {"itemLabel": {"value": "ONE (Ocean Network Express)"}, "countryLabel": {"value": "Japan"}, "cityLabel": {"value": "Tokyo"}},
            {"itemLabel": {"value": "Evergreen Marine"}, "countryLabel": {"value": "Taiwan"}, "cityLabel": {"value": "Taipei"}},
            {"itemLabel": {"value": "Yang Ming Marine Transport"}, "countryLabel": {"value": "Taiwan"}, "cityLabel": {"value": "Keelung"}},
            {"itemLabel": {"value": "HMM (Hyundai Merchant Marine)"}, "countryLabel": {"value": "South Korea"}, "cityLabel": {"value": "Seoul"}},
            {"itemLabel": {"value": "PIL (Pacific International Lines)"}, "countryLabel": {"value": "Singapore"}, "cityLabel": {"value": "Singapore"}},
            {"itemLabel": {"value": "ZIM Integrated Shipping Services"}, "countryLabel": {"value": "Israel"}, "cityLabel": {"value": "Haifa"}},
            {"itemLabel": {"value": "Wan Hai Lines"}, "countryLabel": {"value": "Taiwan"}, "cityLabel": {"value": "Taipei"}},
            {"itemLabel": {"value": "Kuehne + Nagel"}, "countryLabel": {"value": "Switzerland"}, "cityLabel": {"value": "Schindellegi"}},
            {"itemLabel": {"value": "DB Schenker"}, "countryLabel": {"value": "Germany"}, "cityLabel": {"value": "Essen"}},
            {"itemLabel": {"value": "DHL Global Forwarding"}, "countryLabel": {"value": "Germany"}, "cityLabel": {"value": "Bonn"}},
            {"itemLabel": {"value": "DSV Panalpina"}, "countryLabel": {"value": "Denmark"}, "cityLabel": {"value": "Hedehusene"}},
            {"itemLabel": {"value": "Nippon Express"}, "countryLabel": {"value": "Japan"}, "cityLabel": {"value": "Tokyo"}},
            {"itemLabel": {"value": "GEODIS"}, "countryLabel": {"value": "France"}, "cityLabel": {"value": "Paris"}},
            {"itemLabel": {"value": "C.H. Robinson"}, "countryLabel": {"value": "United States"}, "cityLabel": {"value": "Eden Prairie"}},
            {"itemLabel": {"value": "Expeditors International"}, "countryLabel": {"value": "United States"}, "cityLabel": {"value": "Seattle"}},
            {"itemLabel": {"value": "Sinotrans"}, "countryLabel": {"value": "China"}, "cityLabel": {"value": "Beijing"}},
            {"itemLabel": {"value": "Kerry Logistics"}, "countryLabel": {"value": "China"}, "cityLabel": {"value": "Hong Kong"}},
            {"itemLabel": {"value": "CEVA Logistics"}, "countryLabel": {"value": "Netherlands"}, "cityLabel": {"value": "Baar"}},
            {"itemLabel": {"value": "Agility Logistics"}, "countryLabel": {"value": "Kuwait"}, "cityLabel": {"value": "Kuwait City"}},
            {"itemLabel": {"value": "Bolloré Logistics"}, "countryLabel": {"value": "France"}, "cityLabel": {"value": "Puteaux"}},
        ]
        
        return [{"itemLabel": {"value": c["itemLabel"]["value"]}, 
                 "countryLabel": {"value": c["countryLabel"]["value"]},
                 "cityLabel": {"value": c.get("cityLabel", {}).get("value")}}
                for c in companies]
    
    # ==================== IMPORTATION DES NAVIRES ====================
    
    def import_vessels_from_wikidata(self):
        """
        Importe les navires commerciaux depuis Wikidata avec mapping vers les armateurs
        """
        print("="*80)
        logger.info("⛴️ IMPORTATION DES NAVIRES COMMERCIAUX")
        print("="*80)
        
        # Requête SPARQL pour les VRAIS navires commerciaux
        sparql_query = """
        SELECT DISTINCT ?item ?itemLabel ?imoNumber ?flagLabel ?operatorLabel ?length ?beam WHERE {
          # Types de navires commerciaux
          { ?item wdt:P31 wd:Q17210. }          # Container ship
          UNION { ?item wdt:P31 wd:Q17479. }     # Tanker
          UNION { ?item wdt:P31 wd:Q17316023. }  # Cargo ship
          UNION { ?item wdt:P31 wd:Q756100. }    # Bulk carrier
          
          # Numéro IMO (important pour identification)
          OPTIONAL { ?item wdt:P458 ?imoNumber. }
          
          # Pavillon (nationalité)
          OPTIONAL { ?item wdt:P17 ?flag. }
          
          # Opérateur/Armateur
          OPTIONAL { ?item wdt:P137 ?operator. }
          
          # Dimensions
          OPTIONAL { ?item wdt:P2043 ?length. }
          OPTIONAL { ?item wdt:P2049 ?beam. }
          
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr". }
        }
        LIMIT 2000
        """
        
        try:
            logger.info("📡 Requête Wikidata pour les navires commerciaux...")
            response = requests.get(
                self.wikidata_sparql_url,
                params={'query': sparql_query, 'format': 'json'},
                headers={'User-Agent': 'VelosiERP/1.0'},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            results = data.get('results', {}).get('bindings', [])
            logger.info(f"  ✅ {len(results)} navires trouvés sur Wikidata")
            
            if len(results) == 0:
                logger.warning("  ⚠️ Aucun navire trouvé, utilisation du fallback...")
                results = self.get_fallback_vessels()
            
        except Exception as e:
            logger.error(f"  ❌ Erreur lors de la requête Wikidata: {e}")
            logger.info("  🔄 Utilisation des données de secours...")
            results = self.get_fallback_vessels()
        
        # Connexion à la DB et import
        self.connect_db()
        cursor = self.conn.cursor()
        
        try:
            for item in results:
                try:
                    # Extraction des données
                    libelle = item.get('itemLabel', {}).get('value', 'Unknown')
                    
                    # Ignorer les entrées avec des identifiants Wikidata comme nom
                    if libelle.startswith('Q') and libelle[1:].isdigit():
                        continue
                    
                    # Code IMO
                    code_omi = item.get('imoNumber', {}).get('value')
                    if not code_omi:
                        code_omi = None
                    
                    # Pavillon (nationalité)
                    nationalite = item.get('flagLabel', {}).get('value')
                    if nationalite:
                        nationalite = self.normalize_country_name(nationalite)
                    
                    # Opérateur/Armateur
                    operateur_nom = item.get('operatorLabel', {}).get('value')
                    armateur_id = None
                    
                    if operateur_nom and not operateur_nom.startswith('Q'):
                        # Chercher l'armateur dans la DB
                        cursor.execute(
                            "SELECT id FROM armateurs WHERE LOWER(nom) LIKE LOWER(%s) LIMIT 1",
                            (f"%{operateur_nom}%",)
                        )
                        result = cursor.fetchone()
                        if result:
                            armateur_id = result[0]
                        else:
                            logger.warning(f"  ⚠️ Armateur non trouvé pour: {libelle} (opérateur: {operateur_nom})")
                    
                    # Dimensions
                    longueur = item.get('length', {}).get('value')
                    largeur = item.get('beam', {}).get('value')
                    
                    # Génération du code navire
                    if code_omi:
                        code = f"IMO{code_omi}"
                    else:
                        code = self.generate_armateur_code_from_name(libelle)  # Réutiliser la même logique
                    
                    # Vérifier si le navire existe déjà
                    cursor.execute(
                        "SELECT id FROM navires WHERE code = %s OR LOWER(libelle) = LOWER(%s) LIMIT 1",
                        (code, libelle)
                    )
                    existing = cursor.fetchone()
                    
                    if existing:
                        logger.info(f"  ⏭️ Navire existant: {libelle}")
                        self.stats['navires']['skipped'] += 1
                        continue
                    
                    # Insérer le navire
                    cursor.execute("""
                        INSERT INTO navires 
                        (code, libelle, nationalite, code_omi, armateur_id, longueur, largeur, 
                         statut, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, 'actif', NOW(), NOW())
                    """, (code, libelle, nationalite, code_omi, armateur_id, longueur, largeur))
                    
                    self.conn.commit()
                    logger.info(f"  ✅ Navire ajouté: {libelle} ({code})")
                    self.stats['navires']['imported'] += 1
                    
                except Exception as e:
                    logger.error(f"  ❌ Erreur lors de l'ajout du navire: {e}")
                    self.stats['navires']['errors'] += 1
                    self.conn.rollback()
                    continue
            
            logger.info(f"✅ Navires importés: {self.stats['navires']['imported']}, ignorés: {self.stats['navires']['skipped']}")
            
        finally:
            cursor.close()
            self.close_db()
    
    def get_fallback_vessels(self) -> List[Dict]:
        """
        Retourne une liste de navires majeurs en cas d'échec API
        """
        vessels = [
            {"itemLabel": {"value": "CMA CGM ANTOINE DE SAINT EXUPERY"}, "imoNumber": {"value": "9454436"}, "flagLabel": {"value": "France"}, "operatorLabel": {"value": "CMA CGM"}},
            {"itemLabel": {"value": "MSC GULSUN"}, "imoNumber": {"value": "9811000"}, "flagLabel": {"value": "Panama"}, "operatorLabel": {"value": "Mediterranean Shipping Company"}},
            {"itemLabel": {"value": "MADRID MAERSK"}, "imoNumber": {"value": "9778150"}, "flagLabel": {"value": "Denmark"}, "operatorLabel": {"value": "Maersk Line"}},
            {"itemLabel": {"value": "COSCO SHIPPING UNIVERSE"}, "imoNumber": {"value": "9795668"}, "flagLabel": {"value": "China"}, "operatorLabel": {"value": "COSCO Shipping"}},
            {"itemLabel": {"value": "SAJIR"}, "imoNumber": {"value": "9837865"}, "flagLabel": {"value": "Germany"}, "operatorLabel": {"value": "Hapag-Lloyd"}},
            {"itemLabel": {"value": "ONE INNOVATION"}, "imoNumber": {"value": "9833371"}, "flagLabel": {"value": "Japan"}, "operatorLabel": {"value": "ONE"}},
            {"itemLabel": {"value": "EVER GIVEN"}, "imoNumber": {"value": "9811000"}, "flagLabel": {"value": "Panama"}, "operatorLabel": {"value": "Evergreen Marine"}},
            {"itemLabel": {"value": "HMM ALGECIRAS"}, "imoNumber": {"value": "9863524"}, "flagLabel": {"value": "South Korea"}, "operatorLabel": {"value": "HMM"}},
            {"itemLabel": {"value": "MSC MINA"}, "imoNumber": {"value": "9797272"}, "flagLabel": {"value": "Panama"}, "operatorLabel": {"value": "Mediterranean Shipping Company"}},
            {"itemLabel": {"value": "CMA CGM JACQUES SAADE"}, "imoNumber": {"value": "9839303"}, "flagLabel": {"value": "France"}, "operatorLabel": {"value": "CMA CGM"}},
        ]
        
        return [{"itemLabel": {"value": v["itemLabel"]["value"]}, 
                 "imoNumber": {"value": v.get("imoNumber", {}).get("value")},
                 "flagLabel": {"value": v.get("flagLabel", {}).get("value")},
                 "operatorLabel": {"value": v.get("operatorLabel", {}).get("value")}}
                for v in vessels]
    
    # ==================== IMPORTATION DES PORTS ====================
    
    def import_all_ports(self):
        """
        Importe les ports depuis Wikidata
        """
        print("="*80)
        logger.info("🚢 IMPORTATION DES PORTS MARITIMES")
        print("="*80)
        
        sparql_query = """
        SELECT DISTINCT ?item ?itemLabel ?countryLabel ?cityLabel ?unlocode WHERE {
          ?item wdt:P31/wdt:P279* wd:Q44782.  # Port
          
          OPTIONAL { ?item wdt:P17 ?country. }
          OPTIONAL { ?item wdt:P131 ?city. }
          OPTIONAL { ?item wdt:P1937 ?unlocode. }
          
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr". }
        }
        LIMIT 1000
        """
        
        try:
            logger.info("📡 Requête Wikidata pour les ports...")
            response = requests.get(
                self.wikidata_sparql_url,
                params={'query': sparql_query, 'format': 'json'},
                headers={'User-Agent': 'VelosiERP/1.0'},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            results = data.get('results', {}).get('bindings', [])
            logger.info(f"  ✅ {len(results)} ports trouvés")
            
            self.connect_db()
            cursor = self.conn.cursor()
            
            try:
                for item in results:
                    try:
                        libelle = item.get('itemLabel', {}).get('value', 'Unknown')
                        if libelle.startswith('Q'):
                            continue
                        
                        pays = item.get('countryLabel', {}).get('value')
                        if pays:
                            pays = self.normalize_country_name(pays)
                        
                        ville = item.get('cityLabel', {}).get('value')
                        abbreviation = item.get('unlocode', {}).get('value', '')[:10]
                        
                        # Vérifier existence
                        cursor.execute(
                            "SELECT id FROM ports WHERE LOWER(libelle) = LOWER(%s) LIMIT 1",
                            (libelle,)
                        )
                        if cursor.fetchone():
                            self.stats['ports']['skipped'] += 1
                            continue
                        
                        # Insérer
                        cursor.execute("""
                            INSERT INTO ports 
                            (libelle, abbreviation, ville, pays, isactive, createdat, updatedat)
                            VALUES (%s, %s, %s, %s, true, NOW(), NOW())
                        """, (libelle, abbreviation, ville, pays))
                        
                        self.conn.commit()
                        self.stats['ports']['imported'] += 1
                        logger.info(f"  ✅ Port ajouté: {libelle}")
                        
                    except Exception as e:
                        logger.error(f"  ❌ Erreur: {e}")
                        self.stats['ports']['errors'] += 1
                        self.conn.rollback()
                
                logger.info(f"✅ Ports importés: {self.stats['ports']['imported']}")
                
            finally:
                cursor.close()
                self.close_db()
                
        except Exception as e:
            logger.error(f"❌ Erreur Wikidata ports: {e}")
    
    # ==================== IMPORTATION DES AÉROPORTS ====================
    
    def import_all_airports(self):
        """
        Importe les aéroports depuis Wikidata
        """
        print("="*80)
        logger.info("✈️ IMPORTATION DES AÉROPORTS")
        print("="*80)
        
        sparql_query = """
        SELECT DISTINCT ?item ?itemLabel ?iataCode ?countryLabel ?cityLabel WHERE {
          ?item wdt:P31/wdt:P279* wd:Q1248784.  # Aéroport
          
          OPTIONAL { ?item wdt:P238 ?iataCode. }
          OPTIONAL { ?item wdt:P17 ?country. }
          OPTIONAL { ?item wdt:P131 ?city. }
          
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr". }
        }
        LIMIT 1000
        """
        
        try:
            logger.info("📡 Requête Wikidata pour les aéroports...")
            response = requests.get(
                self.wikidata_sparql_url,
                params={'query': sparql_query, 'format': 'json'},
                headers={'User-Agent': 'VelosiERP/1.0'},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            results = data.get('results', {}).get('bindings', [])
            logger.info(f"  ✅ {len(results)} aéroports trouvés")
            
            self.connect_db()
            cursor = self.conn.cursor()
            
            try:
                for item in results:
                    try:
                        libelle = item.get('itemLabel', {}).get('value', 'Unknown')
                        if libelle.startswith('Q'):
                            continue
                        
                        iata = item.get('iataCode', {}).get('value', '')
                        if iata and len(iata) != 3:
                            iata = ''
                        
                        pays = item.get('countryLabel', {}).get('value')
                        if pays:
                            pays = self.normalize_country_name(pays)
                        
                        ville = item.get('cityLabel', {}).get('value')
                        
                        # Vérifier existence
                        cursor.execute(
                            "SELECT id FROM aeroports WHERE LOWER(libelle) = LOWER(%s) LIMIT 1",
                            (libelle,)
                        )
                        if cursor.fetchone():
                            self.stats['aeroports']['skipped'] += 1
                            continue
                        
                        # Insérer
                        cursor.execute("""
                            INSERT INTO aeroports 
                            (libelle, abbreviation, ville, pays, isactive, createdat, updatedat)
                            VALUES (%s, %s, %s, %s, true, NOW(), NOW())
                        """, (libelle, iata, ville, pays))
                        
                        self.conn.commit()
                        self.stats['aeroports']['imported'] += 1
                        logger.info(f"  ✅ Aéroport ajouté: {libelle} ({iata})")
                        
                    except Exception as e:
                        logger.error(f"  ❌ Erreur: {e}")
                        self.stats['aeroports']['errors'] += 1
                        self.conn.rollback()
                
                logger.info(f"✅ Aéroports importés: {self.stats['aeroports']['imported']}")
                
            finally:
                cursor.close()
                self.close_db()
                
        except Exception as e:
            logger.error(f"❌ Erreur Wikidata aéroports: {e}")
    
    # ==================== EXÉCUTION PRINCIPALE ====================
    
    def import_all(self):
        """Importe toutes les données dans l'ordre"""
        start_time = datetime.now()
        
        print("="*80)
        logger.info("🚀 IMPORTATION COMPLÈTE DES DONNÉES VELOSI - VERSION AMÉLIORÉE")
        print("="*80)
        
        # 1. Armateurs d'abord (car les navires en dépendent)
        self.import_professional_shipping_companies()
        
        # 2. Navires (nécessitent les armateurs)
        self.import_vessels_from_wikidata()
        
        # 3. Ports
        self.import_all_ports()
        
        # 4. Aéroports
        self.import_all_airports()
        
        # Résumé
        end_time = datetime.now()
        duration = end_time - start_time
        
        print("="*80)
        logger.info("📊 RÉSUMÉ DE L'IMPORTATION")
        print("="*80)
        logger.info(f"⏱️ Durée totale: {duration}")
        logger.info("")
        logger.info("📋 Statistiques par entité:")
        
        for entity, stats in self.stats.items():
            logger.info(f"  {entity.capitalize()}:")
            logger.info(f"    ✅ Importés: {stats['imported']}")
            logger.info(f"    ⏭️ Ignorés: {stats['skipped']}")
            logger.info(f"    ❌ Erreurs: {stats['errors']}")
        
        total_imported = sum(s['imported'] for s in self.stats.values())
        total_skipped = sum(s['skipped'] for s in self.stats.values())
        total_errors = sum(s['errors'] for s in self.stats.values())
        
        logger.info("")
        logger.info("📊 Total général:")
        logger.info(f"  ✅ {total_imported} entrées importées")
        logger.info(f"  ⏭️ {total_skipped} entrées ignorées (déjà existantes)")
        logger.info(f"  ❌ {total_errors} erreurs")
        print("="*80)
        logger.info("✅ Importation terminée avec succès!")


# ==================== POINT D'ENTRÉE ====================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Importer les données depuis les APIs internationales')
    parser.add_argument('--db-host', default='localhost', help='Hôte PostgreSQL')
    parser.add_argument('--db-name', default='velosi', help='Nom de la base de données')
    parser.add_argument('--db-user', default='postgres', help='Utilisateur PostgreSQL')
    parser.add_argument('--db-password', required=True, help='Mot de passe PostgreSQL')
    parser.add_argument('--db-port', default='5432', help='Port PostgreSQL')
    
    args = parser.parse_args()
    
    db_config = {
        'host': args.db_host,
        'database': args.db_name,
        'user': args.db_user,
        'password': args.db_password,
        'port': args.db_port
    }
    
    importer = VelosiDataImporter(db_config)
    importer.import_all()
