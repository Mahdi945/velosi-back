"""
Script d'importation COMPLÈTE avec APIs MONDIALES ROBUSTES
Importe TOUS les armateurs et navires disponibles depuis plusieurs sources internationales
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


class VelosiFullDataImporter:
    """Importateur COMPLET avec APIs mondiales robustes"""
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.conn = None
        
        # URLs des APIs mondiales
        self.wikidata_sparql_url = "https://query.wikidata.org/sparql"
        
        # Cache armateurs (id -> info)
        self.armateurs_cache = {}
        
        # Statistiques
        self.stats = {
            'armateurs': {'deleted': 0, 'imported': 0, 'skipped': 0, 'errors': 0},
            'navires': {'deleted': 0, 'imported': 0, 'skipped': 0, 'errors': 0}
        }
    
    def connect_db(self):
        """Connexion DB"""
        try:
            self.conn = psycopg2.connect(
                host=self.db_config['host'],
                database=self.db_config['database'],
                user=self.db_config['user'],
                password=self.db_config['password'],
                port=self.db_config.get('port', 5432)
            )
            logger.info("✅ Connexion DB établie")
        except Exception as e:
            logger.error(f"❌ Erreur connexion: {e}")
            raise
    
    def close_db(self):
        if self.conn:
            self.conn.close()
            logger.info("🔒 Connexion fermée")
    
    def clean_text(self, text: str) -> str:
        """Nettoie un texte"""
        if not text:
            return ""
        text = re.sub(r'\s+', ' ', text.strip())
        text = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', text)
        return text
    
    def normalize_country(self, country: str) -> str:
        """Normalise pays en français"""
        if not country:
            return ""
        
        mapping = {
            'Denmark': 'Danemark', 'Switzerland': 'Suisse', 'France': 'France',
            'China': 'Chine', "People's Republic of China": 'Chine',
            'Germany': 'Allemagne', 'Japan': 'Japon', 'Taiwan': 'Taïwan',
            'South Korea': 'Corée du Sud', 'Republic of Korea': 'Corée du Sud',
            'Singapore': 'Singapour', 'Israel': 'Israël', 'Netherlands': 'Pays-Bas',
            'United States': 'États-Unis', 'USA': 'États-Unis', 'US': 'États-Unis',
            'United Kingdom': 'Royaume-Uni', 'UK': 'Royaume-Uni', 'England': 'Royaume-Uni',
            'Norway': 'Norvège', 'Sweden': 'Suède', 'Belgium': 'Belgique',
            'Italy': 'Italie', 'Spain': 'Espagne', 'Greece': 'Grèce',
            'Turkey': 'Turquie', 'Türkiye': 'Turquie', 'Hong Kong': 'Hong Kong',
            'India': 'Inde', 'United Arab Emirates': 'Émirats Arabes Unis',
            'Panama': 'Panama', 'Cyprus': 'Chypre', 'Marshall Islands': 'Îles Marshall',
            'Liberia': 'Libéria', 'Malta': 'Malte', 'Bahamas': 'Bahamas',
            'Russia': 'Russie', 'Russian Federation': 'Russie',
            'Canada': 'Canada', 'Mexico': 'Mexique', 'Brazil': 'Brésil',
            'Argentina': 'Argentine', 'Chile': 'Chili', 'Australia': 'Australie',
            'South Africa': 'Afrique du Sud', 'Egypt': 'Égypte',
            'Saudi Arabia': 'Arabie Saoudite', 'Iran': 'Iran', 'Iraq': 'Irak',
            'Indonesia': 'Indonésie', 'Malaysia': 'Malaisie', 'Thailand': 'Thaïlande',
            'Vietnam': 'Vietnam', 'Philippines': 'Philippines', 'Pakistan': 'Pakistan',
        }
        return mapping.get(country, country)
    
    def generate_clean_code(self, name: str, prefix: str = "ARM") -> str:
        """Génère code propre (max 10 car)"""
        if not name:
            return prefix + "000"
        clean = re.sub(r'[^A-Za-z0-9]', '', name.upper())
        code = clean[:6] if len(clean) >= 6 else clean
        return code[:10]
    
    def generate_abbreviation(self, name: str) -> str:
        """Génère abréviation"""
        if not name:
            return ""
        common = {'LINE', 'LINES', 'SHIPPING', 'MARINE', 'MARITIME', 'CO', 'LTD', 
                 'COMPANY', 'CORPORATION', 'GROUP', 'INTERNATIONAL', 'INC', 'LLC'}
        words = [w for w in name.upper().split() if w not in common and len(w) > 1]
        if not words:
            words = name.upper().split()[:2]
        abbrev = ''.join([w[0] for w in words[:5]])
        return abbrev[:10]
    
    # ==================== NETTOYAGE ====================
    
    def delete_all_data(self):
        """Supprime TOUTES les données existantes"""
        logger.info("🗑️ NETTOYAGE COMPLET...")
        
        self.connect_db()
        cursor = self.conn.cursor()
        
        try:
            # Navires
            cursor.execute("SELECT COUNT(*) FROM navires")
            navires_count = cursor.fetchone()[0]
            cursor.execute("DELETE FROM navires")
            self.stats['navires']['deleted'] = navires_count
            logger.info(f"  ✅ {navires_count} navires supprimés")
            
            # Armateurs
            cursor.execute("SELECT COUNT(*) FROM armateurs")
            armateurs_count = cursor.fetchone()[0]
            cursor.execute("DELETE FROM armateurs")
            self.stats['armateurs']['deleted'] = armateurs_count
            logger.info(f"  ✅ {armateurs_count} armateurs supprimés")
            
            self.conn.commit()
            
        except Exception as e:
            logger.error(f"  ❌ Erreur: {e}")
            self.conn.rollback()
        finally:
            cursor.close()
            self.close_db()
    
    # ==================== WIKIDATA ARMATEURS ====================
    
    def generate_armateur_code(self, cursor) -> str:
        """Génère le prochain code ARM### automatiquement comme le backend"""
        cursor.execute("""
            SELECT code FROM armateurs 
            WHERE code ~ '^ARM[0-9]+$' 
            ORDER BY CAST(SUBSTRING(code FROM 4) AS INTEGER) DESC 
            LIMIT 1
        """)
        result = cursor.fetchone()
        
        if result:
            last_code = result[0]
            number = int(last_code[3:]) + 1
        else:
            number = 1
        
        return f"ARM{number:03d}"
    
    def import_all_shipping_companies_wikidata(self):
        """
        Importe TOUTES les compagnies maritimes depuis Wikidata
        Requête optimisée pour récupérer le maximum de compagnies réelles
        """
        print("="*80)
        logger.info("🏢 IMPORTATION MASSIVE - COMPAGNIES MARITIMES MONDIALES")
        print("="*80)
        
        # Requête SPARQL pour TOUTES les compagnies maritimes
        sparql_query = """
        SELECT DISTINCT ?item ?itemLabel ?countryLabel ?cityLabel ?hqLabel ?website ?inception WHERE {
          {
            # Compagnies de transport maritime
            ?item wdt:P31/wdt:P279* wd:Q1792644.
          } UNION {
            # Compagnies de transport de fret
            ?item wdt:P31/wdt:P279* wd:Q161726.
          } UNION {
            # Industrie: transport maritime
            ?item wdt:P452 wd:Q7892674.
          } UNION {
            # Industrie: transport conteneurisé
            ?item wdt:P452 wd:Q308604.
          } UNION {
            # Compagnies de transport
            ?item wdt:P31 wd:Q783794.
            ?item wdt:P452 wd:Q7892674.
          }
          
          # Exclure les navires, ferries, yachts individuels
          FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q11446. }
          FILTER NOT EXISTS { ?item wdt:P31 wd:Q1229765. }
          FILTER NOT EXISTS { ?item wdt:P31 wd:Q174736. }
          
          # Pays (requis)
          ?item wdt:P17 ?country.
          
          # Siège social / ville
          OPTIONAL { 
            ?item wdt:P159 ?hq.
            ?hq wdt:P131* ?city.
          }
          
          # Site web
          OPTIONAL { ?item wdt:P856 ?website. }
          
          # Date de fondation
          OPTIONAL { ?item wdt:P571 ?inception. }
          
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr,de,es,zh,ja". }
        }
        ORDER BY ?countryLabel ?itemLabel
        LIMIT 5000
        """
        
        try:
            logger.info("📡 Requête Wikidata (limite 5000 compagnies)...")
            response = requests.get(
                self.wikidata_sparql_url,
                params={'query': sparql_query, 'format': 'json'},
                headers={'User-Agent': 'VelosiERP/2.0'},
                timeout=60
            )
            response.raise_for_status()
            data = response.json()
            
            results = data.get('results', {}).get('bindings', [])
            logger.info(f"  ✅ {len(results)} compagnies trouvées sur Wikidata")
            
            if len(results) == 0:
                logger.warning("  ⚠️ Aucune compagnie - fallback...")
                return
            
        except Exception as e:
            logger.error(f"  ❌ Erreur Wikidata: {e}")
            return
        
        # Import dans DB
        self.connect_db()
        cursor = self.conn.cursor()
        
        try:
            for item in results:
                try:
                    # Extraction données
                    nom = self.clean_text(item.get('itemLabel', {}).get('value', ''))
                    
                    # Ignorer Q-codes
                    if nom.startswith('Q') and nom[1:].isdigit():
                        continue
                    
                    # Pays
                    pays = item.get('countryLabel', {}).get('value')
                    if not pays or pays.startswith('Q'):
                        continue
                    pays = self.normalize_country(pays)
                    
                    # Ville
                    ville = item.get('cityLabel', {}).get('value') or item.get('hqLabel', {}).get('value')
                    if ville and (ville.startswith('Q') or len(ville) > 100):
                        ville = None
                    ville = self.clean_text(ville) if ville else None
                    
                    # Site web
                    siteweb = self.clean_text(item.get('website', {}).get('value', ''))
                    if len(siteweb) > 150:
                        siteweb = None
                    
                    # Abréviation (l'ancien code devient abréviation)
                    abreviation = self.generate_abbreviation(nom)
                    
                    # Vérifier existence
                    cursor.execute(
                        "SELECT id FROM armateurs WHERE LOWER(nom) = LOWER(%s) LIMIT 1",
                        (nom,)
                    )
                    if cursor.fetchone():
                        self.stats['armateurs']['skipped'] += 1
                        continue
                    
                    # Générer code automatiquement comme le backend (ARM001, ARM002...)
                    code = self.generate_armateur_code(cursor)
                    
                    # Insert
                    cursor.execute("""
                        INSERT INTO armateurs 
                        (code, nom, abreviation, ville, pays, siteweb, isactive, createdat, updatedat)
                        VALUES (%s, %s, %s, %s, %s, %s, true, NOW(), NOW())
                        RETURNING id
                    """, (code, nom, abreviation, ville, pays, siteweb))
                    
                    armateur_id = cursor.fetchone()[0]
                    self.conn.commit()
                    
                    # Cache
                    self.armateurs_cache[armateur_id] = {'nom': nom, 'pays': pays}
                    
                    self.stats['armateurs']['imported'] += 1
                    
                    if self.stats['armateurs']['imported'] % 100 == 0:
                        logger.info(f"  📦 {self.stats['armateurs']['imported']} compagnies importées...")
                    
                except Exception as e:
                    self.stats['armateurs']['errors'] += 1
                    self.conn.rollback()
            
            logger.info(f"✅ TOTAL: {self.stats['armateurs']['imported']} compagnies importées")
            
        finally:
            cursor.close()
            self.close_db()
    
    # ==================== WIKIDATA NAVIRES ====================
    
    def generate_navire_code(self, cursor) -> str:
        """Génère le prochain code NAV### automatiquement comme le backend"""
        cursor.execute("""
            SELECT code FROM navires 
            WHERE code ~ '^NAV[0-9]+$' 
            ORDER BY CAST(SUBSTRING(code FROM 4) AS INTEGER) DESC 
            LIMIT 1
        """)
        result = cursor.fetchone()
        
        if result:
            last_code = result[0]
            number = int(last_code[3:]) + 1
        else:
            number = 1
        
        return f"NAV{number:03d}"
    
    def import_all_vessels_wikidata(self):
        """
        Importe TOUS les navires commerciaux depuis Wikidata
        """
        print("="*80)
        logger.info("⛴️ IMPORTATION MASSIVE - NAVIRES COMMERCIAUX MONDIAUX")
        print("="*80)
        
        # Requête pour TOUS les navires commerciaux
        sparql_query = """
        SELECT DISTINCT ?item ?itemLabel ?imoNumber ?flagLabel ?operatorLabel 
               ?length ?beam ?draft ?tonnage WHERE {
          {
            # Porte-conteneurs
            ?item wdt:P31 wd:Q17210.
          } UNION {
            # Pétroliers
            ?item wdt:P31 wd:Q17479.
          } UNION {
            # Cargo
            ?item wdt:P31 wd:Q17316023.
          } UNION {
            # Vraquiers
            ?item wdt:P31 wd:Q756100.
          } UNION {
            # Navires de charge généraux
            ?item wdt:P31/wdt:P279* wd:Q2055880.
          } UNION {
            # Navires commerciaux
            ?item wdt:P31/wdt:P279* wd:Q2055880.
          }
          
          # Numéro IMO
          OPTIONAL { ?item wdt:P458 ?imoNumber. }
          
          # Pavillon
          OPTIONAL { ?item wdt:P17 ?flag. }
          
          # Opérateur
          OPTIONAL { ?item wdt:P137 ?operator. }
          
          # Dimensions
          OPTIONAL { ?item wdt:P2043 ?length. }
          OPTIONAL { ?item wdt:P2049 ?beam. }
          OPTIONAL { ?item wdt:P5524 ?draft. }
          OPTIONAL { ?item wdt:P1879 ?tonnage. }
          
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr,de,es,zh". }
        }
        ORDER BY ?operatorLabel ?itemLabel
        LIMIT 10000
        """
        
        try:
            logger.info("📡 Requête Wikidata (limite 10000 navires)...")
            response = requests.get(
                self.wikidata_sparql_url,
                params={'query': sparql_query, 'format': 'json'},
                headers={'User-Agent': 'VelosiERP/2.0'},
                timeout=120
            )
            response.raise_for_status()
            data = response.json()
            
            results = data.get('results', {}).get('bindings', [])
            logger.info(f"  ✅ {len(results)} navires trouvés sur Wikidata")
            
            if len(results) == 0:
                logger.warning("  ⚠️ Aucun navire trouvé")
                return
            
        except Exception as e:
            logger.error(f"  ❌ Erreur Wikidata: {e}")
            return
        
        # Import dans DB
        self.connect_db()
        cursor = self.conn.cursor()
        
        try:
            # Charger cache armateurs depuis DB
            if not self.armateurs_cache:
                cursor.execute("SELECT id, nom FROM armateurs")
                for row in cursor.fetchall():
                    self.armateurs_cache[row[0]] = {'nom': row[1]}
            
            for item in results:
                try:
                    # Libellé navire
                    libelle = self.clean_text(item.get('itemLabel', {}).get('value', ''))
                    
                    # Ignorer Q-codes et noms trop courts
                    if libelle.startswith('Q') and libelle[1:].isdigit():
                        continue
                    if len(libelle) < 3:
                        continue
                    
                    # Code IMO
                    code_omi = item.get('imoNumber', {}).get('value')
                    if code_omi and not code_omi.isdigit():
                        code_omi = None
                    
                    # Nationalité (pavillon)
                    nationalite = item.get('flagLabel', {}).get('value')
                    if nationalite and not nationalite.startswith('Q'):
                        nationalite = self.normalize_country(nationalite)
                    else:
                        nationalite = None
                    
                    # Opérateur - chercher armateur correspondant
                    operateur_nom = item.get('operatorLabel', {}).get('value')
                    armateur_id = None
                    
                    if operateur_nom and not operateur_nom.startswith('Q'):
                        operateur_clean = self.clean_text(operateur_nom)
                        
                        # Chercher dans cache
                        for aid, ainfo in self.armateurs_cache.items():
                            if operateur_clean.lower() in ainfo['nom'].lower() or \
                               ainfo['nom'].lower() in operateur_clean.lower():
                                armateur_id = aid
                                break
                        
                        # Sinon chercher en DB
                        if not armateur_id:
                            cursor.execute(
                                "SELECT id FROM armateurs WHERE LOWER(nom) LIKE LOWER(%s) LIMIT 1",
                                (f"%{operateur_clean[:20]}%",)
                            )
                            result = cursor.fetchone()
                            if result:
                                armateur_id = result[0]
                    
                    # Dimensions
                    longueur = item.get('length', {}).get('value')
                    largeur = item.get('beam', {}).get('value')
                    tirant_eau = item.get('draft', {}).get('value')
                    jauge_brute = item.get('tonnage', {}).get('value')
                    
                    # Conversion en nombres
                    try:
                        longueur = float(longueur) if longueur else None
                        largeur = float(largeur) if largeur else None
                        tirant_eau = float(tirant_eau) if tirant_eau else None
                        jauge_brute = int(float(jauge_brute)) if jauge_brute else None
                    except:
                        longueur = largeur = tirant_eau = jauge_brute = None
                    
                    # Générer code automatiquement comme le backend (NAV001, NAV002...)
                    code = self.generate_navire_code(cursor)
                    
                    # Vérifier existence par nom
                    cursor.execute(
                        "SELECT id FROM navires WHERE LOWER(libelle) = LOWER(%s) LIMIT 1",
                        (libelle,)
                    )
                    if cursor.fetchone():
                        self.stats['navires']['skipped'] += 1
                        continue
                    
                    # Insert avec clé étrangère armateur_id
                    cursor.execute("""
                        INSERT INTO navires
                        (code, libelle, nationalite, code_omi, armateur_id, 
                         longueur, largeur, tirant_eau, jauge_brute,
                         statut, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'actif', NOW(), NOW())
                    """, (code, libelle, nationalite, code_omi, armateur_id,
                          longueur, largeur, tirant_eau, jauge_brute))
                    
                    self.conn.commit()
                    self.stats['navires']['imported'] += 1
                    
                    if self.stats['navires']['imported'] % 200 == 0:
                        logger.info(f"  🚢 {self.stats['navires']['imported']} navires importés...")
                    
                except Exception as e:
                    self.stats['navires']['errors'] += 1
                    self.conn.rollback()
            
            logger.info(f"✅ TOTAL: {self.stats['navires']['imported']} navires importés")
            
        finally:
            cursor.close()
            self.close_db()
    
    # ==================== EXÉCUTION ====================
    
    def import_all_data(self):
        """Importe TOUTES les données disponibles"""
        start_time = datetime.now()
        
        print("="*80)
        logger.info("🌍 IMPORTATION MASSIVE MONDIALE - TOUTES LES DONNÉES")
        print("="*80)
        
        # 1. Nettoyage
        logger.info("\n📋 ÉTAPE 1/3: NETTOYAGE")
        self.delete_all_data()
        
        # 2. Armateurs
        logger.info("\n📋 ÉTAPE 2/3: IMPORTATION ARMATEURS")
        self.import_all_shipping_companies_wikidata()
        
        # 3. Navires
        logger.info("\n📋 ÉTAPE 3/3: IMPORTATION NAVIRES")
        self.import_all_vessels_wikidata()
        
        # Résumé
        end_time = datetime.now()
        duration = end_time - start_time
        
        print("\n" + "="*80)
        logger.info("📊 RÉSUMÉ FINAL - IMPORTATION MASSIVE")
        print("="*80)
        logger.info(f"⏱️ Durée totale: {duration}")
        logger.info("")
        logger.info("📋 Armateurs:")
        logger.info(f"  🗑️ Supprimés: {self.stats['armateurs']['deleted']}")
        logger.info(f"  ✅ Importés: {self.stats['armateurs']['imported']}")
        logger.info(f"  ⏭️ Ignorés: {self.stats['armateurs']['skipped']}")
        logger.info(f"  ❌ Erreurs: {self.stats['armateurs']['errors']}")
        logger.info("")
        logger.info("📋 Navires:")
        logger.info(f"  🗑️ Supprimés: {self.stats['navires']['deleted']}")
        logger.info(f"  ✅ Importés: {self.stats['navires']['imported']}")
        logger.info(f"  ⏭️ Ignorés: {self.stats['navires']['skipped']}")
        logger.info(f"  ❌ Erreurs: {self.stats['navires']['errors']}")
        print("="*80)
        logger.info("✅ Importation massive terminée!")


# ==================== POINT D'ENTRÉE ====================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Importation MASSIVE de toutes les compagnies maritimes et navires mondiaux'
    )
    parser.add_argument('--db-host', default='localhost')
    parser.add_argument('--db-name', default='velosi')
    parser.add_argument('--db-user', default='postgres')
    parser.add_argument('--db-password', required=True)
    parser.add_argument('--db-port', default='5432')
    
    args = parser.parse_args()
    
    db_config = {
        'host': args.db_host,
        'database': args.db_name,
        'user': args.db_user,
        'password': args.db_password,
        'port': args.db_port
    }
    
    importer = VelosiFullDataImporter(db_config)
    importer.import_all_data()
