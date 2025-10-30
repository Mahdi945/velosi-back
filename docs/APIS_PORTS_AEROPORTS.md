# 🌍 APIs Publiques pour Ports et Aéroports

Ce document liste les APIs publiques disponibles pour remplir automatiquement les tables `ports` et `aeroports` avec des données mondiales.

---

## 🚢 APIs pour les Ports Maritimes

### 1. **UN/LOCODE (Recommandé)**
- **Source**: Nations Unies - Code for Trade and Transport Locations
- **URL**: https://unece.org/trade/cefact/unlocode-code-list-country-and-territory
- **Format**: CSV, Excel
- **Données**: 
  - Code UN/LOCODE (5 caractères)
  - Nom du port
  - Ville
  - Pays
  - Coordonnées géographiques
- **Fréquence de mise à jour**: 2 fois par an
- **Gratuit**: ✅ Oui
- **Note**: Base de données officielle la plus complète (100 000+ localisations)

### 2. **OpenSeaMap API**
- **URL**: https://map.openseamap.org/
- **API**: http://api.openseamap.org/
- **Format**: JSON, XML
- **Données**:
  - Ports maritimes
  - Marinas
  - Coordonnées GPS
  - Informations nautiques
- **Gratuit**: ✅ Oui
- **Note**: Données communautaires, qualité variable

### 3. **World Port Index**
- **Source**: National Geospatial-Intelligence Agency (NGA)
- **URL**: https://msi.nga.mil/Publications/WPI
- **Format**: CSV, Shapefile
- **Données**:
  - ~3700 ports mondiaux
  - Informations détaillées (profondeur, capacité, etc.)
  - Coordonnées GPS
- **Gratuit**: ✅ Oui
- **Note**: Données militaires américaines, très fiables

### 4. **Global Shipping Database**
- **URL**: https://www.ship-technology.com/
- **Format**: API REST
- **Données**:
  - Ports commerciaux majeurs
  - Statistiques de trafic
  - Infrastructures portuaires
- **Gratuit**: ⚠️ Version gratuite limitée

---

## ✈️ APIs pour les Aéroports

### 1. **OpenFlights Airport Database (Recommandé)**
- **URL**: https://openflights.org/data.html
- **Direct Download**: https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat
- **Format**: CSV, JSON
- **Données**:
  - ~7000 aéroports actifs
  - Code IATA (3 lettres)
  - Code ICAO (4 lettres)
  - Nom, ville, pays
  - Coordonnées GPS
  - Altitude, timezone
- **Gratuit**: ✅ Oui (Open Database License)
- **Note**: Base de données communautaire très populaire

**Structure du fichier CSV:**
```csv
Airport ID,Name,City,Country,IATA,ICAO,Latitude,Longitude,Altitude,Timezone,DST,Tz database time zone,Type,Source
1,"Goroka Airport","Goroka","Papua New Guinea","GKA","AYGA",-6.081689834590001,145.391998291,5282,10,"U","Pacific/Port_Moresby","airport","OurAirports"
```

### 2. **OurAirports**
- **URL**: https://ourairports.com/data/
- **Direct Download**: 
  - Airports: https://davidmegginson.github.io/ourairports-data/airports.csv
  - Countries: https://davidmegginson.github.io/ourairports-data/countries.csv
- **Format**: CSV
- **Données**:
  - ~55 000 aéroports (incluant petits aérodromes)
  - Codes IATA et ICAO
  - Type d'aéroport (large, medium, small, heliport, etc.)
  - Coordonnées GPS très précises
- **Gratuit**: ✅ Oui (Public Domain)
- **Mise à jour**: Quotidienne
- **Note**: Base la plus complète et à jour

### 3. **IATA Airport Codes API**
- **URL**: https://www.iata.org/en/publications/directories/code-search/
- **API**: Nécessite un compte IATA
- **Format**: JSON, XML
- **Données**:
  - Codes IATA officiels
  - Noms standards
  - Informations de localisation
- **Gratuit**: ❌ Payant (sauf pour membres IATA)

### 4. **AviationStack API**
- **URL**: https://aviationstack.com/
- **Endpoint**: `http://api.aviationstack.com/v1/airports`
- **Format**: JSON
- **Données**:
  - ~13 000 aéroports
  - Codes IATA, ICAO, IATA Country
  - Coordonnées GPS
  - Timezone
- **Gratuit**: ⚠️ 100 requêtes/mois (plan gratuit)
- **Exemple de requête**:
```bash
curl "http://api.aviationstack.com/v1/airports?access_key=VOTRE_CLE_API"
```

### 5. **Airport Data API**
- **URL**: https://www.airport-data.com/
- **API**: Pas d'API officielle, mais données scrapables
- **Format**: HTML, peut être converti en JSON
- **Données**:
  - Base de données extensive
  - Photos d'aéroports
  - Informations détaillées
- **Gratuit**: ✅ Oui (scraping)

### 6. **Airports API (RapidAPI)**
- **URL**: https://rapidapi.com/cometari/api/airportsfinder
- **Format**: JSON
- **Données**:
  - Recherche par code IATA/ICAO
  - Recherche par ville/pays
  - Informations complètes
- **Gratuit**: ⚠️ 500 requêtes/mois

---

## 🔧 Implémentation Recommandée

### Option 1: Import Manuel (Plus Simple)

1. **Pour les Ports**: Télécharger le UN/LOCODE CSV
   - URL: https://unece.org/trade/cefact/unlocode-code-list-country-and-territory
   - Parser le CSV et insérer dans PostgreSQL

2. **Pour les Aéroports**: Télécharger OpenFlights CSV
   - URL: https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat
   - Parser et insérer dans PostgreSQL

### Option 2: Script Node.js d'Import Automatique

```typescript
// velosi-back/src/scripts/import-airports.ts
import axios from 'axios';
import * as csv from 'csv-parser';
import { createReadStream } from 'fs';

export async function importAirportsFromOpenFlights() {
  const url = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';
  const response = await axios.get(url);
  
  // Parser et insérer dans la DB
  const airports = parseAirportsCSV(response.data);
  
  for (const airport of airports) {
    if (airport.iata && airport.iata !== '\\N') {
      await this.aeroportRepository.save({
        libelle: airport.name,
        abbreviation: airport.iata,
        ville: airport.city,
        pays: airport.country,
        isActive: true
      });
    }
  }
}
```

### Option 3: Endpoint Backend pour Import en Masse

Créer un endpoint admin protégé :

```typescript
// velosi-back/src/controllers/admin/import.controller.ts
@Post('import/airports')
async importAirports() {
  // Télécharger et importer les données
  return await this.importService.importAirportsFromOpenFlights();
}

@Post('import/ports')
async importPorts() {
  // Télécharger et importer les données
  return await this.importService.importPortsFromUNLOCODE();
}
```

---

## 📊 Script SQL d'Import Direct

### Import des Aéroports depuis un CSV téléchargé

```sql
-- Créer une table temporaire
CREATE TEMP TABLE temp_airports (
    airport_id INT,
    name VARCHAR(200),
    city VARCHAR(100),
    country VARCHAR(100),
    iata VARCHAR(3),
    icao VARCHAR(4),
    latitude DECIMAL,
    longitude DECIMAL,
    altitude INT,
    timezone INT,
    dst VARCHAR(1),
    tz VARCHAR(50),
    type VARCHAR(20),
    source VARCHAR(20)
);

-- Importer depuis le CSV
COPY temp_airports FROM '/path/to/airports.csv' DELIMITER ',' CSV HEADER;

-- Insérer dans la table aeroports (seulement les aéroports actifs avec code IATA)
INSERT INTO aeroports (libelle, abbreviation, ville, pays, isactive)
SELECT 
    name,
    iata,
    city,
    country,
    true
FROM temp_airports
WHERE iata IS NOT NULL 
  AND iata != ''
  AND type IN ('large_airport', 'medium_airport')
ON CONFLICT (abbreviation) DO NOTHING;

-- Nettoyer
DROP TABLE temp_airports;
```

---

## 🎯 Recommandation Finale

**Pour démarrer rapidement:**

1. **Aéroports**: Utilisez **OpenFlights** (openflights.org/data.html)
   - Téléchargez le CSV
   - Importez directement avec la migration SQL fournie
   - ✅ 7000+ aéroports internationaux
   - ✅ Gratuit et open source
   - ✅ Mis à jour régulièrement

2. **Ports**: Utilisez les données d'exemple fournies dans la migration
   - Complétez avec **World Port Index** si besoin de plus de détails
   - ✅ Ports principaux mondiaux inclus
   - ✅ Pas de dépendance externe

**Pour une solution automatisée:**
- Créez un service backend qui télécharge et met à jour les données périodiquement
- Utilisez un CRON job pour la synchronisation mensuelle

---

## 📝 Notes Importantes

- ⚠️ Vérifiez toujours les licences des données
- ⚠️ Les données gratuites peuvent être obsolètes
- ⚠️ Certaines APIs ont des limites de taux (rate limiting)
- ✅ Les codes IATA et UN/LOCODE sont des standards internationaux
- ✅ Préférez les sources gouvernementales ou internationales pour la fiabilité

---

## 🔗 Liens Utiles

- **UN/LOCODE**: https://unece.org/trade/cefact/unlocode
- **OpenFlights**: https://openflights.org/data.html
- **OurAirports**: https://ourairports.com/data/
- **World Port Index**: https://msi.nga.mil/Publications/WPI
- **IATA Codes**: https://www.iata.org/en/publications/directories/code-search/
