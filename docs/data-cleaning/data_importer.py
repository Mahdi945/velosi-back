"""
Script d'importation de données depuis les APIs internationales
Remplit les 4 tables (ports, aeroports, armateurs, navires) avec des données essentielles
"""

import requests
import psycopg2
from typing import Dict, List, Optional
import logging
from datetime import datetime
import time
import re

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
        self.opendatasoft_url = "https://public.opendatasoft.com/api/records/1.0/search/"
        self.wikidata_url = "https://www.wikidata.org/w/api.php"
        
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
        country_mapping = {
            'France': 'France', 'Spain': 'Espagne', 'Italy': 'Italie',
            'Germany': 'Allemagne', 'Belgium': 'Belgique', 'Netherlands': 'Pays-Bas',
            'United Kingdom': 'Royaume-Uni', 'Portugal': 'Portugal', 'Greece': 'Grèce',
            'Morocco': 'Maroc', 'Algeria': 'Algérie', 'Tunisia': 'Tunisie',
            'Egypt': 'Égypte', 'Turkey': 'Turquie', 'United States': 'États-Unis',
            'China': 'Chine', 'Japan': 'Japon', 'South Korea': 'Corée du Sud',
            'Singapore': 'Singapour', 'United Arab Emirates': 'Émirats Arabes Unis',
            'Saudi Arabia': 'Arabie Saoudite', 'Switzerland': 'Suisse',
            'Austria': 'Autriche', 'Poland': 'Pologne', 'Denmark': 'Danemark',
            'Norway': 'Norvège', 'Sweden': 'Suède', 'Finland': 'Finlande'
        }
        return country_mapping.get(country, country)
    
    # ==================== IMPORTATION DES PORTS ====================
    
    def import_all_ports(self, batch_size: int = 100):
        """
        Importe TOUS les ports maritimes depuis l'API World Port Index
        
        Args:
            batch_size: Nombre de ports par requête (max 100 pour OpenDataSoft)
        """
        logger.info("=" * 80)
        logger.info("🚢 IMPORTATION DE TOUS LES PORTS MARITIMES MONDIAUX")
        logger.info("=" * 80)
        
        self.connect_db()
        cursor = self.conn.cursor()
        
        try:
            start = 0
            total_fetched = 0
            has_more = True
            
            while has_more:
                logger.info(f"📥 Récupération des ports {start} à {start + batch_size}...")
                
                try:
                    params = {
                        'dataset': 'world-port-index',
                        'rows': batch_size,
                        'start': start,
                        'sort': 'port_name'
                    }
                    
                    response = requests.get(self.opendatasoft_url, params=params, timeout=15)
                    
                    if response.status_code == 200:
                        data = response.json()
                        records = data.get('records', [])
                        total_available = data.get('nhits', 0)
                        
                        if not records:
                            has_more = False
                            break
                        
                        logger.info(f"  📊 Total disponible: {total_available}, Traitement de {len(records)} ports")
                        
                        for record in records:
                            fields = record.get('fields', {})
                            
                            port_name = fields.get('port_name', '')
                            wpi_number = fields.get('world_port_index_number', '')
                            
                            if not port_name:
                                continue
                            
                            # Créer une abréviation unique
                            abbreviation = wpi_number[:10] if wpi_number else f"P{start + records.index(record)}"
                            
                            # Vérifier si le port existe déjà
                            cursor.execute(
                                "SELECT id FROM ports WHERE libelle = %s OR abbreviation = %s",
                                (port_name, abbreviation)
                            )
                            
                            if cursor.fetchone():
                                self.stats['ports']['skipped'] += 1
                                continue
                            
                            # Insérer le port
                            try:
                                insert_query = """
                                    INSERT INTO ports (libelle, abbreviation, ville, pays, isactive, createdat, updatedat)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                                """
                                
                                ville = fields.get('main_port_name', '') or fields.get('port_name', '')
                                pays = self.normalize_country_name(fields.get('country', ''))
                                
                                cursor.execute(insert_query, (
                                    port_name,
                                    abbreviation,
                                    ville[:100] if ville else '',
                                    pays[:100] if pays else '',
                                    True,
                                    datetime.now(),
                                    datetime.now()
                                ))
                                
                                self.stats['ports']['imported'] += 1
                                if self.stats['ports']['imported'] % 50 == 0:
                                    logger.info(f"  ✅ {self.stats['ports']['imported']} ports importés...")
                                
                            except Exception as e:
                                self.stats['ports']['errors'] += 1
                                if self.stats['ports']['errors'] < 10:
                                    logger.warning(f"  ⚠️ Erreur insertion port {port_name}: {e}")
                                self.conn.rollback()
                                continue
                        
                        self.conn.commit()
                        total_fetched += len(records)
                        start += batch_size
                        
                        # Vérifier s'il reste des données
                        if start >= total_available:
                            has_more = False
                    else:
                        logger.error(f"❌ Erreur API: {response.status_code}")
                        has_more = False
                    
                    time.sleep(0.3)  # Respect de l'API
                    
                except Exception as e:
                    logger.error(f"❌ Erreur lors de la récupération: {e}")
                    has_more = False
            
            cursor.close()
            logger.info(f"✅ TOTAL Ports importés: {self.stats['ports']['imported']}, ignorés: {self.stats['ports']['skipped']}, erreurs: {self.stats['ports']['errors']}")
            
        finally:
            self.close_db()
    
    # ==================== IMPORTATION DES AÉROPORTS ====================
    
    def import_all_airports(self, batch_size: int = 100):
        """
        Importe TOUS les aéroports mondiaux depuis l'API
        
        Args:
            batch_size: Nombre d'aéroports par requête
        """
        logger.info("=" * 80)
        logger.info("✈️ IMPORTATION DE TOUS LES AÉROPORTS MONDIAUX")
        logger.info("=" * 80)
        
        self.connect_db()
        cursor = self.conn.cursor()
        
        try:
            start = 0
            total_fetched = 0
            has_more = True
            
            while has_more:
                logger.info(f"📥 Récupération des aéroports {start} à {start + batch_size}...")
                
                try:
                    params = {
                        'dataset': 'airports-code',
                        'rows': batch_size,
                        'start': start,
                        'sort': 'name'
                    }
                    
                    response = requests.get(self.opendatasoft_url, params=params, timeout=15)
                    
                    if response.status_code == 200:
                        data = response.json()
                        records = data.get('records', [])
                        total_available = data.get('nhits', 0)
                        
                        if not records:
                            has_more = False
                            break
                        
                        logger.info(f"  📊 Total disponible: {total_available}, Traitement de {len(records)} aéroports")
                        
                        for record in records:
                            fields = record.get('fields', {})
                            
                            airport_name = fields.get('name', '')
                            iata_code = fields.get('iata', fields.get('code_iata', ''))
                            
                            # Valider le code IATA (3 lettres)
                            if not iata_code or len(iata_code) != 3 or not airport_name:
                                continue
                            
                            # Vérifier si l'aéroport existe déjà
                            cursor.execute(
                                "SELECT id FROM aeroports WHERE abbreviation = %s OR libelle = %s",
                                (iata_code, airport_name)
                            )
                            
                            if cursor.fetchone():
                                self.stats['aeroports']['skipped'] += 1
                                continue
                            
                            # Normaliser le nom
                            clean_name = airport_name
                            if '(' in clean_name:
                                clean_name = clean_name.split('(')[0].strip()
                            if clean_name.endswith(' Airport'):
                                clean_name = clean_name.replace(' Airport', ' Aéroport')
                            
                            # Insérer l'aéroport
                            try:
                                insert_query = """
                                    INSERT INTO aeroports (libelle, abbreviation, ville, pays, isactive, createdat, updatedat)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                                """
                                
                                ville = fields.get('city', '')
                                pays = self.normalize_country_name(fields.get('country', ''))
                                
                                cursor.execute(insert_query, (
                                    clean_name[:200],
                                    iata_code,
                                    ville[:100] if ville else '',
                                    pays[:100] if pays else '',
                                    True,
                                    datetime.now(),
                                    datetime.now()
                                ))
                                
                                self.stats['aeroports']['imported'] += 1
                                if self.stats['aeroports']['imported'] % 100 == 0:
                                    logger.info(f"  ✅ {self.stats['aeroports']['imported']} aéroports importés...")
                                
                            except Exception as e:
                                self.stats['aeroports']['errors'] += 1
                                if self.stats['aeroports']['errors'] < 10:
                                    logger.warning(f"  ⚠️ Erreur insertion aéroport {airport_name}: {e}")
                                self.conn.rollback()
                                continue
                        
                        self.conn.commit()
                        total_fetched += len(records)
                        start += batch_size
                        
                        # Vérifier s'il reste des données
                        if start >= total_available:
                            has_more = False
                    else:
                        logger.error(f"❌ Erreur API: {response.status_code}")
                        has_more = False
                    
                    time.sleep(0.3)
                    
                except Exception as e:
                    logger.error(f"❌ Erreur lors de la récupération: {e}")
                    has_more = False
            
            cursor.close()
            logger.info(f"✅ TOTAL Aéroports importés: {self.stats['aeroports']['imported']}, ignorés: {self.stats['aeroports']['skipped']}, erreurs: {self.stats['aeroports']['errors']}")
            
        finally:
            self.close_db()
    
    # ==================== IMPORTATION DES ARMATEURS ====================
    
    def import_all_shipping_companies(self):
        """
        Importe les compagnies maritimes depuis Wikidata
        """
        logger.info("=" * 80)
        logger.info("🏢 IMPORTATION DES ARMATEURS VIA WIKIDATA")
        logger.info("=" * 80)
        
        # Rechercher les compagnies maritimes sur Wikidata
        # Query SPARQL pour récupérer toutes les compagnies maritimes
        sparql_query = """
        SELECT ?company ?companyLabel ?countryLabel ?website WHERE {
          ?company wdt:P31/wdt:P279* wd:Q1229765.  # Instance de compagnie maritime
          OPTIONAL { ?company wdt:P17 ?country. }
          OPTIONAL { ?company wdt:P856 ?website. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
        }
        LIMIT 500
        """
        
        logger.info("📡 Requête Wikidata pour les compagnies maritimes...")
        
        try:
            wikidata_sparql_url = "https://query.wikidata.org/sparql"
            response = requests.get(
                wikidata_sparql_url,
                params={'query': sparql_query, 'format': 'json'},
                headers={'User-Agent': 'VelosiDataImporter/1.0'},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                bindings = data.get('results', {}).get('bindings', [])
                logger.info(f"  ✅ {len(bindings)} compagnies trouvées sur Wikidata")
                
                major_companies = []
                for binding in bindings:
                    nom = binding.get('companyLabel', {}).get('value', '')
                    pays = binding.get('countryLabel', {}).get('value', 'Inconnu')
                    site = binding.get('website', {}).get('value', '')
                    
                    if nom and nom != '':
                        major_companies.append({
                            'nom': nom,
                            'pays': pays,
                            'site': site
                        })
            else:
                logger.warning(f"⚠️ Erreur Wikidata ({response.status_code}), utilisation de la liste par défaut")
                major_companies = self._get_default_shipping_companies()
        
        except Exception as e:
            logger.warning(f"⚠️ Erreur Wikidata: {e}, utilisation de la liste par défaut")
            major_companies = self._get_default_shipping_companies()
        
        if not major_companies:
            major_companies = self._get_default_shipping_companies()
        
        self.connect_db()
        cursor = self.conn.cursor()
        
        try:
            for company in major_companies:
                nom = company['nom']
                
                # Générer le code unique
                code = re.sub(r'[^A-Z0-9]', '', nom.upper())[:10]
                if not code:
                    code = nom[:10].upper()
                
                # Vérifier si l'armateur existe déjà
                cursor.execute(
                    "SELECT id FROM armateurs WHERE nom = %s OR code = %s",
                    (nom, code)
                )
                
                if cursor.fetchone():
                    self.stats['armateurs']['skipped'] += 1
                    logger.info(f"  ⏭️ Armateur existant: {nom}")
                    continue
                
                # Générer l'abréviation
                words = nom.split()
                abbr = ''.join([w[0] for w in words if w[0].isupper()])[:10]
                if not abbr:
                    abbr = nom[:10].upper()
                
                try:
                    insert_query = """
                        INSERT INTO armateurs 
                        (code, nom, abreviation, pays, siteweb, isactive, createdat, updatedat)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    cursor.execute(insert_query, (
                        code,
                        nom,
                        abbr,
                        company['pays'],
                        company['site'],
                        True,
                        datetime.now(),
                        datetime.now()
                    ))
                    
                    self.stats['armateurs']['imported'] += 1
                    logger.info(f"  ✅ Armateur ajouté: {nom} ({abbr})")
                    
                except Exception as e:
                    self.stats['armateurs']['errors'] += 1
                    logger.warning(f"  ⚠️ Erreur insertion armateur {nom}: {e}")
                    self.conn.rollback()
                    continue
            
            self.conn.commit()
            cursor.close()
            logger.info(f"✅ Armateurs importés: {self.stats['armateurs']['imported']}, ignorés: {self.stats['armateurs']['skipped']}")
            
        finally:
            self.close_db()
    
    def _get_default_shipping_companies(self) -> List[Dict]:
        """Retourne une liste de compagnies maritimes par défaut"""
        return [
            {'nom': 'CMA CGM', 'pays': 'France', 'site': 'https://www.cma-cgm.com'},
            {'nom': 'MSC Mediterranean Shipping Company', 'pays': 'Suisse', 'site': 'https://www.msc.com'},
            {'nom': 'Maersk Line', 'pays': 'Danemark', 'site': 'https://www.maersk.com'},
            {'nom': 'COSCO Shipping Lines', 'pays': 'Chine', 'site': 'https://www.coscon.com'},
            {'nom': 'Hapag-Lloyd', 'pays': 'Allemagne', 'site': 'https://www.hapag-lloyd.com'},
            {'nom': 'ONE Ocean Network Express', 'pays': 'Japon', 'site': 'https://www.one-line.com'},
            {'nom': 'Evergreen Line', 'pays': 'Taïwan', 'site': 'https://www.evergreen-line.com'},
            {'nom': 'Yang Ming Marine Transport', 'pays': 'Taïwan', 'site': 'https://www.yangming.com'},
            {'nom': 'HMM Hyundai Merchant Marine', 'pays': 'Corée du Sud', 'site': 'https://www.hmm21.com'},
            {'nom': 'PIL Pacific International Lines', 'pays': 'Singapour', 'site': 'https://www.pilship.com'},
            {'nom': 'Zim Integrated Shipping Services', 'pays': 'Israël', 'site': 'https://www.zim.com'},
            {'nom': 'Wan Hai Lines', 'pays': 'Taïwan', 'site': 'https://www.wanhai.com'},
            {'nom': 'OOCL Orient Overseas Container Line', 'pays': 'Hong Kong', 'site': 'https://www.oocl.com'},
            {'nom': 'Compagnie Maritime Nantaise', 'pays': 'France', 'site': 'https://www.cmn-shipping.com'},
            {'nom': 'Louis Dreyfus Armateurs', 'pays': 'France', 'site': 'https://www.lda.fr'},
            {'nom': 'Marfret', 'pays': 'France', 'site': 'https://www.marfret.com'},
            {'nom': 'Arkas Line', 'pays': 'Turquie', 'site': 'https://www.arkas.com.tr'},
            {'nom': 'Grimaldi Lines', 'pays': 'Italie', 'site': 'https://www.grimaldi-lines.com'},
            {'nom': 'Contship Italia', 'pays': 'Italie', 'site': 'https://www.contshipitalia.com'},
            {'nom': 'COMANAV', 'pays': 'Maroc', 'site': 'https://www.comanav.co.ma'},
            {'nom': 'Mediterranean Shipping Company', 'pays': 'Suisse', 'site': 'https://www.msc.com'},
            {'nom': 'Compagnie Générale Maritime', 'pays': 'France', 'site': ''},
            {'nom': 'Delmas', 'pays': 'France', 'site': 'https://www.delmas.com'},
            {'nom': 'Safmarine', 'pays': 'Afrique du Sud', 'site': 'https://www.safmarine.com'},
            {'nom': 'Hamburg Süd', 'pays': 'Allemagne', 'site': 'https://www.hamburgsud-line.com'}
        ]
    
    # ==================== IMPORTATION DES NAVIRES ====================
    
    def import_vessels_from_api(self, limit: int = 1000):
        """
        Importe des navires depuis des sources publiques
        Note: Les APIs de navires complètes (AIS, MarineTraffic) nécessitent des abonnements.
        Cette fonction importe une liste étendue de navires réels connus.
        
        Args:
            limit: Nombre maximum de navires à importer
        """
        logger.info("=" * 80)
        logger.info("⛴️ IMPORTATION DES NAVIRES")
        logger.info("=" * 80)
        
        # Navires majeurs connus avec leurs armateurs
        major_vessels = [
            {
                'code': 'CMACGM001',
                'libelle': 'CMA CGM ANTOINE DE SAINT EXUPERY',
                'armateur_nom': 'CMA CGM',
                'nationalite': 'France',
                'pav': 'France',
                'longueur': 400.0,
                'largeur': 59.0,
                'jauge_brute': 187625,
                'code_omi': 'IMO9454436'
            },
            {
                'code': 'MSCGUL001',
                'libelle': 'MSC GULSUN',
                'armateur_nom': 'MSC Mediterranean Shipping Company',
                'nationalite': 'Suisse',
                'pav': 'Panama',
                'longueur': 399.9,
                'largeur': 61.5,
                'jauge_brute': 232618,
                'code_omi': 'IMO9839432'
            },
            {
                'code': 'MAERSK01',
                'libelle': 'MADRID MAERSK',
                'armateur_nom': 'Maersk Line',
                'nationalite': 'Danemark',
                'pav': 'Danemark',
                'longueur': 399.0,
                'largeur': 58.6,
                'jauge_brute': 214286,
                'code_omi': 'IMO9778150'
            },
            {
                'code': 'COSCO001',
                'libelle': 'COSCO SHIPPING UNIVERSE',
                'armateur_nom': 'COSCO Shipping Lines',
                'nationalite': 'Chine',
                'pav': 'Chine',
                'longueur': 400.0,
                'largeur': 58.8,
                'jauge_brute': 199685,
                'code_omi': 'IMO9795668'
            },
            {
                'code': 'HAPAG001',
                'libelle': 'SAJIR',
                'armateur_nom': 'Hapag-Lloyd',
                'nationalite': 'Allemagne',
                'pav': 'Allemagne',
                'longueur': 399.9,
                'largeur': 58.8,
                'jauge_brute': 192496,
                'code_omi': 'IMO9837865'
            },
            {
                'code': 'ONE001',
                'libelle': 'ONE INNOVATION',
                'armateur_nom': 'ONE Ocean Network Express',
                'nationalite': 'Japon',
                'pav': 'Panama',
                'longueur': 400.0,
                'largeur': 61.3,
                'jauge_brute': 215542,
                'code_omi': 'IMO9875726'
            },
            {
                'code': 'EVER001',
                'libelle': 'EVER GIVEN',
                'armateur_nom': 'Evergreen Line',
                'nationalite': 'Taïwan',
                'pav': 'Panama',
                'longueur': 399.94,
                'largeur': 58.8,
                'jauge_brute': 219079,
                'code_omi': 'IMO9811000'
            }
        ]
        
        self.connect_db()
        cursor = self.conn.cursor()
        
        try:
            for vessel in major_vessels:
                # Trouver l'ID de l'armateur
                cursor.execute(
                    "SELECT id FROM armateurs WHERE nom LIKE %s LIMIT 1",
                    (f"%{vessel['armateur_nom']}%",)
                )
                
                armateur_result = cursor.fetchone()
                if not armateur_result:
                    logger.warning(f"  ⚠️ Armateur non trouvé pour: {vessel['libelle']}")
                    self.stats['navires']['skipped'] += 1
                    continue
                
                armateur_id = armateur_result[0]
                
                # Vérifier si le navire existe déjà
                cursor.execute(
                    "SELECT id FROM navires WHERE code = %s OR code_omi = %s",
                    (vessel['code'], vessel['code_omi'])
                )
                
                if cursor.fetchone():
                    self.stats['navires']['skipped'] += 1
                    logger.info(f"  ⏭️ Navire existant: {vessel['libelle']}")
                    continue
                
                try:
                    insert_query = """
                        INSERT INTO navires 
                        (code, libelle, nationalite, longueur, largeur, 
                         jauge_brute, code_omi, pav, armateur_id, statut, 
                         created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    cursor.execute(insert_query, (
                        vessel['code'],
                        vessel['libelle'],
                        vessel['nationalite'],
                        vessel['longueur'],
                        vessel['largeur'],
                        vessel['jauge_brute'],
                        vessel['code_omi'],
                        vessel['pav'],
                        armateur_id,
                        'actif',
                        datetime.now(),
                        datetime.now()
                    ))
                    
                    self.stats['navires']['imported'] += 1
                    logger.info(f"  ✅ Navire ajouté: {vessel['libelle']} ({vessel['code_omi']})")
                    
                except Exception as e:
                    self.stats['navires']['errors'] += 1
                    logger.warning(f"  ⚠️ Erreur insertion navire {vessel['libelle']}: {e}")
                    self.conn.rollback()
                    continue
            
            self.conn.commit()
            cursor.close()
            logger.info(f"✅ Navires importés: {self.stats['navires']['imported']}, ignorés: {self.stats['navires']['skipped']}")
            
        finally:
            self.close_db()
    
    # ==================== IMPORTATION COMPLÈTE ====================
    
    def import_all(self):
        """Importe toutes les données essentielles"""
        logger.info("=" * 80)
        logger.info("🚀 IMPORTATION COMPLÈTE DES DONNÉES VELOSI")
        logger.info("=" * 80)
        
        start_time = datetime.now()
        
        # Ordre d'importation
        self.import_all_shipping_companies()  # 1. Armateurs d'abord (Wikidata + défaut)
        self.import_vessels_from_api()        # 2. Navires (dépendent des armateurs)
        self.import_all_ports()               # 3. TOUS les ports (World Port Index)
        self.import_all_airports()            # 4. TOUS les aéroports (Airports Code)
        
        end_time = datetime.now()
        duration = end_time - start_time
        
        # Résumé final
        logger.info("=" * 80)
        logger.info("📊 RÉSUMÉ DE L'IMPORTATION")
        logger.info("=" * 80)
        logger.info(f"⏱️ Durée totale: {duration}")
        logger.info("")
        logger.info("📋 Statistiques par entité:")
        
        total_imported = 0
        total_skipped = 0
        total_errors = 0
        
        for entity, stats in self.stats.items():
            logger.info(f"  {entity.capitalize()}:")
            logger.info(f"    ✅ Importés: {stats['imported']}")
            logger.info(f"    ⏭️ Ignorés: {stats['skipped']}")
            logger.info(f"    ❌ Erreurs: {stats['errors']}")
            
            total_imported += stats['imported']
            total_skipped += stats['skipped']
            total_errors += stats['errors']
        
        logger.info("")
        logger.info(f"📊 Total général:")
        logger.info(f"  ✅ {total_imported} entrées importées")
        logger.info(f"  ⏭️ {total_skipped} entrées ignorées (déjà existantes)")
        logger.info(f"  ❌ {total_errors} erreurs")
        logger.info("=" * 80)


def main():
    """Fonction principale"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Importation de données depuis les APIs internationales'
    )
    
    parser.add_argument('--db-host', default='localhost', help='Hôte de la base de données')
    parser.add_argument('--db-name', default='velosi', help='Nom de la base de données')
    parser.add_argument('--db-user', default='postgres', help='Utilisateur de la base de données')
    parser.add_argument('--db-password', required=True, help='Mot de passe de la base de données')
    parser.add_argument('--db-port', type=int, default=5432, help='Port de la base de données')
    
    parser.add_argument(
        '--entity',
        choices=['all', 'ports', 'aeroports', 'armateurs', 'navires'],
        default='all',
        help='Entité à importer (défaut: all)'
    )
    
    args = parser.parse_args()
    
    # Configuration de la base de données
    db_config = {
        'host': args.db_host,
        'database': args.db_name,
        'user': args.db_user,
        'password': args.db_password,
        'port': args.db_port
    }
    
    # Créer l'importateur
    importer = VelosiDataImporter(db_config)
    
    # Exécuter l'importation
    if args.entity == 'all':
        importer.import_all()
    elif args.entity == 'ports':
        importer.import_all_ports()
    elif args.entity == 'aeroports':
        importer.import_all_airports()
    elif args.entity == 'armateurs':
        importer.import_all_shipping_companies()
    elif args.entity == 'navires':
        importer.import_vessels_from_api()
    
    logger.info("✅ Importation terminée avec succès!")


if __name__ == "__main__":
    main()
