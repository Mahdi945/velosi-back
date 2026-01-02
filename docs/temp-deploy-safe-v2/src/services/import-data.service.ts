import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Port } from '../entities/port.entity';
import { Aeroport } from '../entities/aeroport.entity';
import axios from 'axios';
import * as Papa from 'papaparse';

@Injectable()
export class ImportDataService {
  private readonly logger = new Logger(ImportDataService.name);

  constructor(
    @InjectRepository(Port)
    private readonly portRepository: Repository<Port>,
    @InjectRepository(Aeroport)
    private readonly aeroportRepository: Repository<Aeroport>,
  ) {}

  /**
   * Importer tous les ports depuis UN/LOCODE (Ports Maritimes avec noms complets)
   * Source: UN/LOCODE CSV (https://unece.org/trade/cefact/unlocode-code-list-country-and-territory)
   * Contient des milliers de ports maritimes du monde entier
   */
  async importPortsFromWorldPortIndex(): Promise<{ success: number; errors: number; message: string }> {
    this.logger.log('Début de l\'importation des ports maritimes depuis UN/LOCODE avec noms complets...');
    
    try {
      // URL du fichier UN/LOCODE complet (contient tous les codes de transport)
      const unlocodeUrl = 'https://service.unece.org/trade/locode/loc241csv.zip';
      
      // Alternative: Utiliser un fichier CSV direct depuis GitHub
      const csvUrl = 'https://raw.githubusercontent.com/datasets/un-locode/master/data/code-list.csv';
      
      this.logger.log('Téléchargement du fichier UN/LOCODE depuis GitHub...');
      
      const response = await axios.get(csvUrl, {
        timeout: 120000, // 2 minutes timeout
        maxContentLength: 100 * 1024 * 1024, // 100MB max
      });

      this.logger.log('Fichier téléchargé, parsing en cours...');

      return new Promise((resolve, reject) => {
        Papa.parse(response.data, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            this.logger.log(`${results.data.length} entrées trouvées dans UN/LOCODE`);
            
            let successCount = 0;
            let errorCount = 0;
            let skippedCount = 0;

            for (const row of results.data) {
              try {
                // Structure UN/LOCODE:
                // - Country: Code pays (2 lettres)
                // - Location: Code lieu (3 lettres)
                // - Name: Nom complet de la ville/port
                // - Function: Code fonction (1=Port, 2=Rail, 3=Road, 4=Airport, 5=Postal, 6=Multimodal, 7=Fixed transport)
                // - Coordinates: Coordonnées géographiques
                
                const rowData = row as any;
                const countryCode = rowData.Country || rowData.country || '';
                const locationCode = rowData.Location || rowData.location || '';
                const name = rowData.Name || rowData.name || rowData.NameWoDiacritics || '';
                const functionCode = rowData.Function || rowData.function || '';
                
                // Ne garder que les ports maritimes (fonction contient '1')
                if (!functionCode.includes('1')) {
                  skippedCount++;
                  continue;
                }
                
                // Construire l'abréviation UN/LOCODE (format: FRPAR pour Paris, France)
                const abbreviation = `${countryCode}${locationCode}`.toUpperCase();
                
                if (!abbreviation || abbreviation.length < 5 || !name) {
                  skippedCount++;
                  continue;
                }

                // Récupérer le nom complet du pays depuis l'API REST Countries
                let countryName = countryCode;
                try {
                  const countryResponse = await axios.get(
                    `https://restcountries.com/v3.1/alpha/${countryCode}`,
                    { timeout: 5000 }
                  );
                  
                  if (countryResponse.data && countryResponse.data.length > 0) {
                    // Utiliser le nom français si disponible, sinon le nom commun en anglais
                    countryName = countryResponse.data[0].translations?.fra?.common || 
                                 countryResponse.data[0].name?.common || 
                                 countryCode;
                  }
                } catch (countryError) {
                  // Si l'API REST Countries échoue, utiliser un mapping manuel pour les pays principaux
                  const countryMap: Record<string, string> = {
                    'TN': 'Tunisie', 'FR': 'France', 'IT': 'Italie', 'ES': 'Espagne',
                    'DE': 'Allemagne', 'NL': 'Pays-Bas', 'BE': 'Belgique', 'GB': 'Royaume-Uni',
                    'US': 'États-Unis', 'CN': 'Chine', 'SG': 'Singapour', 'AE': 'Émirats Arabes Unis',
                    'MA': 'Maroc', 'EG': 'Égypte', 'DZ': 'Algérie', 'LY': 'Libye',
                    'SA': 'Arabie Saoudite', 'IN': 'Inde', 'JP': 'Japon', 'KR': 'Corée du Sud',
                    'BR': 'Brésil', 'MX': 'Mexique', 'CA': 'Canada', 'AU': 'Australie',
                    'ZA': 'Afrique du Sud', 'NG': 'Nigeria', 'KE': 'Kenya', 'GH': 'Ghana',
                    'TR': 'Turquie', 'GR': 'Grèce', 'PT': 'Portugal', 'RU': 'Russie',
                    'UA': 'Ukraine', 'PL': 'Pologne', 'RO': 'Roumanie', 'NO': 'Norvège',
                    'SE': 'Suède', 'DK': 'Danemark', 'FI': 'Finlande', 'IE': 'Irlande'
                  };
                  countryName = countryMap[countryCode] || countryCode;
                }

                // Vérifier si le port existe déjà
                const existingPort = await this.portRepository.findOne({
                  where: { abbreviation }
                });

                if (existingPort) {
                  skippedCount++;
                  continue;
                }

                // Créer le nom du port
                const portLibelle = name.includes('Port') ? name : `Port de ${name}`;

                // Créer le nouveau port
                const newPort = this.portRepository.create({
                  libelle: portLibelle,
                  abbreviation: abbreviation,
                  ville: name, // Nom de la ville extrait du CSV
                  pays: countryName,
                  isActive: false, // Non contacté par défaut
                });

                await this.portRepository.save(newPort);
                successCount++;

                // Log de progression tous les 100 ports
                if (successCount % 100 === 0) {
                  this.logger.log(`${successCount} ports importés...`);
                }

              } catch (error) {
                this.logger.warn(`Erreur lors de l'import d'un port: ${error.message}`);
                errorCount++;
              }
            }

            this.logger.log(`Import terminé: ${successCount} ports importés, ${errorCount} erreurs, ${skippedCount} ignorés`);
            
            resolve({
              success: successCount,
              errors: errorCount,
              message: `Import réussi: ${successCount} ports maritimes importés avec villes et pays en texte complet`
            });
          },
          error: (error) => {
            this.logger.error(`Erreur lors du parsing CSV: ${error.message}`);
            reject(error);
          }
        });
      });

    } catch (error) {
      this.logger.error(`Erreur lors de l'import: ${error.message}`);
      // Fallback: utiliser les ports hardcodés avec noms complets
      this.logger.log('Fallback: utilisation de la base de ports majeurs...');
      return this.importMajorPortsHardcoded();
    }
  }

  /**
   * Importer les ports majeurs mondiaux avec noms complets (ÉTENDU)
   */
  private async importMajorPortsHardcoded(): Promise<{ success: number; errors: number; message: string }> {
    this.logger.log('Import des ports majeurs avec noms complets de villes et pays...');
    
    const majorPorts = [
        // Ports Européens
        { libelle: 'Port de Rotterdam', abbreviation: 'NLRTM', ville: 'Rotterdam', pays: 'Pays-Bas' },
        { libelle: 'Port d\'Anvers', abbreviation: 'BEANR', ville: 'Anvers', pays: 'Belgique' },
        { libelle: 'Port de Hambourg', abbreviation: 'DEHAM', ville: 'Hambourg', pays: 'Allemagne' },
        { libelle: 'Port du Havre', abbreviation: 'FRLEH', ville: 'Le Havre', pays: 'France' },
        { libelle: 'Port de Marseille', abbreviation: 'FRMRS', ville: 'Marseille', pays: 'France' },
        { libelle: 'Port de Gênes', abbreviation: 'ITGOA', ville: 'Gênes', pays: 'Italie' },
        { libelle: 'Port de Barcelone', abbreviation: 'ESBCN', ville: 'Barcelone', pays: 'Espagne' },
        { libelle: 'Port de Valence', abbreviation: 'ESVLC', ville: 'Valence', pays: 'Espagne' },
        { libelle: 'Port d\'Algésiras', abbreviation: 'ESALG', ville: 'Algésiras', pays: 'Espagne' },
        { libelle: 'Port de Felixstowe', abbreviation: 'GBFXT', ville: 'Felixstowe', pays: 'Royaume-Uni' },
        { libelle: 'Port de Southampton', abbreviation: 'GBSOU', ville: 'Southampton', pays: 'Royaume-Uni' },
        { libelle: 'Port de Brême', abbreviation: 'DEBRE', ville: 'Brême', pays: 'Allemagne' },
        { libelle: 'Port de Dunkerque', abbreviation: 'FRDKK', ville: 'Dunkerque', pays: 'France' },
        
        // Ports Asiatiques
        { libelle: 'Port de Shanghai', abbreviation: 'CNSHA', ville: 'Shanghai', pays: 'Chine' },
        { libelle: 'Port de Singapour', abbreviation: 'SGSIN', ville: 'Singapour', pays: 'Singapour' },
        { libelle: 'Port de Shenzhen', abbreviation: 'CNSZX', ville: 'Shenzhen', pays: 'Chine' },
        { libelle: 'Port de Ningbo', abbreviation: 'CNNGB', ville: 'Ningbo', pays: 'Chine' },
        { libelle: 'Port de Hong Kong', abbreviation: 'HKHKG', ville: 'Hong Kong', pays: 'Hong Kong' },
        { libelle: 'Port de Busan', abbreviation: 'KRPUS', ville: 'Busan', pays: 'Corée du Sud' },
        { libelle: 'Port de Guangzhou', abbreviation: 'CNCAN', ville: 'Guangzhou', pays: 'Chine' },
        { libelle: 'Port de Qingdao', abbreviation: 'CNTAO', ville: 'Qingdao', pays: 'Chine' },
        { libelle: 'Port de Tianjin', abbreviation: 'CNTSN', ville: 'Tianjin', pays: 'Chine' },
        { libelle: 'Port de Dubai', abbreviation: 'AEDXB', ville: 'Dubaï', pays: 'Émirats Arabes Unis' },
        { libelle: 'Port de Tokyo', abbreviation: 'JPTYO', ville: 'Tokyo', pays: 'Japon' },
        { libelle: 'Port de Yokohama', abbreviation: 'JPYOK', ville: 'Yokohama', pays: 'Japon' },
        { libelle: 'Port de Kaohsiung', abbreviation: 'TWKHH', ville: 'Kaohsiung', pays: 'Taïwan' },
        
        // Ports Américains
        { libelle: 'Port de Los Angeles', abbreviation: 'USLAX', ville: 'Los Angeles', pays: 'États-Unis' },
        { libelle: 'Port de Long Beach', abbreviation: 'USLGB', ville: 'Long Beach', pays: 'États-Unis' },
        { libelle: 'Port de New York', abbreviation: 'USNYC', ville: 'New York', pays: 'États-Unis' },
        { libelle: 'Port de Savannah', abbreviation: 'USSAV', ville: 'Savannah', pays: 'États-Unis' },
        { libelle: 'Port de Houston', abbreviation: 'USHOU', ville: 'Houston', pays: 'États-Unis' },
        { libelle: 'Port de Miami', abbreviation: 'USMIA', ville: 'Miami', pays: 'États-Unis' },
        { libelle: 'Port de Seattle', abbreviation: 'USSEA', ville: 'Seattle', pays: 'États-Unis' },
        { libelle: 'Port de Santos', abbreviation: 'BRSSZ', ville: 'Santos', pays: 'Brésil' },
        { libelle: 'Port de Balboa', abbreviation: 'PABLB', ville: 'Balboa', pays: 'Panama' },
        { libelle: 'Port de Cartagena', abbreviation: 'COCTG', ville: 'Cartagena', pays: 'Colombie' },
        { libelle: 'Port de Vancouver', abbreviation: 'CAVAN', ville: 'Vancouver', pays: 'Canada' },
        
        // Ports Africains
        { libelle: 'Port de Tanger Med', abbreviation: 'MATNG', ville: 'Tanger', pays: 'Maroc' },
        { libelle: 'Port de Casablanca', abbreviation: 'MACAS', ville: 'Casablanca', pays: 'Maroc' },
        { libelle: 'Port de Durban', abbreviation: 'ZADUR', ville: 'Durban', pays: 'Afrique du Sud' },
        { libelle: 'Port du Cap', abbreviation: 'ZACPT', ville: 'Le Cap', pays: 'Afrique du Sud' },
        { libelle: 'Port d\'Abidjan', abbreviation: 'CIABJ', ville: 'Abidjan', pays: 'Côte d\'Ivoire' },
        { libelle: 'Port de Lagos', abbreviation: 'NGLOS', ville: 'Lagos', pays: 'Nigeria' },
        { libelle: 'Port de Mombasa', abbreviation: 'KEMBA', ville: 'Mombasa', pays: 'Kenya' },
        { libelle: 'Port de Dakar', abbreviation: 'SNDKR', ville: 'Dakar', pays: 'Sénégal' },
        
        // Ports Tunisiens (COMPLET)
        { libelle: 'Port de Radès', abbreviation: 'TNRAD', ville: 'Radès', pays: 'Tunisie' },
        { libelle: 'Port de Bizerte', abbreviation: 'TNBIZ', ville: 'Bizerte', pays: 'Tunisie' },
        { libelle: 'Port de Sfax', abbreviation: 'TNSFA', ville: 'Sfax', pays: 'Tunisie' },
        { libelle: 'Port de Sousse', abbreviation: 'TNSUS', ville: 'Sousse', pays: 'Tunisie' },
        { libelle: 'Port de Gabès', abbreviation: 'TNGAB', ville: 'Gabès', pays: 'Tunisie' },
        { libelle: 'Port de Zarzis', abbreviation: 'TNZAR', ville: 'Zarzis', pays: 'Tunisie' },
        { libelle: 'Port de La Goulette', abbreviation: 'TNTUN', ville: 'Tunis', pays: 'Tunisie' },
        { libelle: 'Port de Skhira', abbreviation: 'TNSKH', ville: 'Skhira', pays: 'Tunisie' },
        
        // Autres Ports Méditerranéens
        { libelle: 'Port du Pirée', abbreviation: 'GRPIR', ville: 'Le Pirée', pays: 'Grèce' },
        { libelle: 'Port d\'Istanbul', abbreviation: 'TRIST', ville: 'Istanbul', pays: 'Turquie' },
        { libelle: 'Port d\'Alexandrie', abbreviation: 'EGALY', ville: 'Alexandrie', pays: 'Égypte' },
        { libelle: 'Port de Port-Saïd', abbreviation: 'EGPSD', ville: 'Port-Saïd', pays: 'Égypte' },
        { libelle: 'Port de Beyrouth', abbreviation: 'LBBEY', ville: 'Beyrouth', pays: 'Liban' },
        { libelle: 'Port de Haïfa', abbreviation: 'ILHFA', ville: 'Haïfa', pays: 'Israël' },
        { libelle: 'Port d\'Ashdod', abbreviation: 'ILASD', ville: 'Ashdod', pays: 'Israël' },
        { libelle: 'Port d\'Alger', abbreviation: 'DZALG', ville: 'Alger', pays: 'Algérie' },
        { libelle: 'Port d\'Oran', abbreviation: 'DZORN', ville: 'Oran', pays: 'Algérie' },
        { libelle: 'Port de Tripoli', abbreviation: 'LYTIP', ville: 'Tripoli', pays: 'Libye' },
        
        // Ports du Moyen-Orient
        { libelle: 'Port de Jebel Ali', abbreviation: 'AEJEA', ville: 'Dubaï', pays: 'Émirats Arabes Unis' },
        { libelle: 'Port de Dammam', abbreviation: 'SADAM', ville: 'Dammam', pays: 'Arabie Saoudite' },
        { libelle: 'Port de Jeddah', abbreviation: 'SAJED', ville: 'Djeddah', pays: 'Arabie Saoudite' },
        
        // Ports Océanie
        { libelle: 'Port de Sydney', abbreviation: 'AUSYD', ville: 'Sydney', pays: 'Australie' },
        { libelle: 'Port de Melbourne', abbreviation: 'AUMEL', ville: 'Melbourne', pays: 'Australie' },
        { libelle: 'Port d\'Auckland', abbreviation: 'NZAKL', ville: 'Auckland', pays: 'Nouvelle-Zélande' },
      ];

      let success = 0;
      let errors = 0;

      for (const portData of majorPorts) {
        try {
          // Vérifier si le port existe déjà
          const existing = await this.portRepository.findOne({
            where: { abbreviation: portData.abbreviation }
          });

          if (!existing) {
            await this.portRepository.save({
              ...portData,
              isActive: false // Par défaut: Non contacté
            });
            success++;
          }
        } catch (error) {
          errors++;
          this.logger.warn(`Erreur lors de l'import du port ${portData.libelle}: ${error.message}`);
        }
      }

      this.logger.log(`Import des ports terminé: ${success} ports importés avec noms complets`);
      return {
        success,
        errors,
        message: `Import réussi: ${success} ports majeurs importés avec villes et pays en texte complet`
      };
  }

  /**
   * Importer les aéroports depuis OpenFlights
   */
  async importAeroportsFromOpenFlights(): Promise<{ success: number; errors: number; message: string }> {
    this.logger.log('Début de l\'importation des aéroports depuis OpenFlights...');
    
    try {
      const url = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';
      const response = await axios.get(url);
      
      let success = 0;
      let errors = 0;

      // Parser le CSV
      const lines = response.data.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          // Format: Airport ID,Name,City,Country,IATA,ICAO,Lat,Lon,Alt,Tz,DST,Tz DB,Type,Source
          const parts = this.parseCSVLine(line);
          
          if (parts.length < 5) continue;

          const [id, name, city, country, iata, icao] = parts;

          // Ne garder que les aéroports avec code IATA valide
          if (!iata || iata === '\\N' || iata.length !== 3) continue;

          // Vérifier si l'aéroport existe déjà
          const existing = await this.aeroportRepository.findOne({
            where: { abbreviation: iata }
          });

          if (!existing) {
            await this.aeroportRepository.save({
              libelle: name.replace(/"/g, ''),
              abbreviation: iata,
              ville: city.replace(/"/g, ''),
              pays: country.replace(/"/g, ''),
              isActive: true
            });
            success++;
          }
        } catch (error) {
          errors++;
          this.logger.warn(`Erreur lors de l'import d'un aéroport: ${error.message}`);
        }
      }

      this.logger.log(`Import terminé: ${success} aéroports importés, ${errors} erreurs`);
      return {
        success,
        errors,
        message: `Import réussi: ${success} aéroports importés, ${errors} erreurs`
      };

    } catch (error) {
      this.logger.error('Erreur lors de l\'import des aéroports', error);
      throw new Error(`Erreur lors de l'import: ${error.message}`);
    }
  }

  /**
   * Importer les aéroports depuis OurAirports avec noms complets de villes et pays
   */
  async importAeroportsFromOurAirports(): Promise<{ success: number; errors: number; message: string }> {
    this.logger.log('Début de l\'importation des aéroports avec noms complets depuis OurAirports...');
    
    try {
      const url = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
      this.logger.log(`Téléchargement depuis: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 120000,
        headers: {
          'User-Agent': 'Velosi-ERP/1.0'
        }
      });
      
      let success = 0;
      let errors = 0;
      let processed = 0;

      // Mapping des codes ISO pays vers noms complets en français
      const countryNames: { [key: string]: string } = {
        'TN': 'Tunisie', 'FR': 'France', 'ES': 'Espagne', 'IT': 'Italie', 'DE': 'Allemagne',
        'GB': 'Royaume-Uni', 'US': 'États-Unis', 'CN': 'Chine', 'JP': 'Japon', 'KR': 'Corée du Sud',
        'IN': 'Inde', 'BR': 'Brésil', 'MX': 'Mexique', 'CA': 'Canada', 'AU': 'Australie',
        'NL': 'Pays-Bas', 'BE': 'Belgique', 'CH': 'Suisse', 'AT': 'Autriche', 'PT': 'Portugal',
        'GR': 'Grèce', 'TR': 'Turquie', 'EG': 'Égypte', 'MA': 'Maroc', 'DZ': 'Algérie',
        'SA': 'Arabie Saoudite', 'AE': 'Émirats Arabes Unis', 'QA': 'Qatar', 'KW': 'Koweït',
        'SG': 'Singapour', 'TH': 'Thaïlande', 'MY': 'Malaisie', 'ID': 'Indonésie', 'PH': 'Philippines',
        'VN': 'Vietnam', 'ZA': 'Afrique du Sud', 'KE': 'Kenya', 'NG': 'Nigeria', 'AR': 'Argentine',
        'CL': 'Chili', 'CO': 'Colombie', 'PE': 'Pérou', 'RU': 'Russie', 'UA': 'Ukraine',
        'PL': 'Pologne', 'RO': 'Roumanie', 'CZ': 'Tchéquie', 'HU': 'Hongrie', 'SE': 'Suède',
        'NO': 'Norvège', 'DK': 'Danemark', 'FI': 'Finlande', 'IE': 'Irlande', 'NZ': 'Nouvelle-Zélande',
        'IL': 'Israël', 'LB': 'Liban', 'JO': 'Jordanie', 'IQ': 'Irak', 'PK': 'Pakistan',
        'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'NP': 'Népal', 'HK': 'Hong Kong', 'TW': 'Taïwan',
        'PA': 'Panama', 'CR': 'Costa Rica', 'DO': 'République Dominicaine', 'CU': 'Cuba'
      };

      // Parser le CSV avec papaparse
      const parsed = Papa.parse(response.data, {
        header: true,
        skipEmptyLines: true
      });

      this.logger.log(`${parsed.data.length} aéroports trouvés dans le CSV`);

      for (const row of parsed.data as any[]) {
        try {
          processed++;
          
          // Ne garder que les aéroports avec code IATA
          if (!row.iata_code || row.iata_code === '') continue;

          // Ne garder que les grands et moyens aéroports
          if (!['large_airport', 'medium_airport'].includes(row.type)) continue;

          // Obtenir le nom complet du pays
          const countryCode = row.iso_country || '';
          const countryName = countryNames[countryCode] || countryCode;
          
          // Utiliser municipality comme nom de ville (nom complet)
          const cityName = row.municipality || row.name || '';

          // Vérifier si l'aéroport existe déjà
          const existing = await this.aeroportRepository.findOne({
            where: { abbreviation: row.iata_code }
          });

          if (!existing) {
            await this.aeroportRepository.save({
              libelle: row.name,
              abbreviation: row.iata_code,
              ville: cityName.substring(0, 100),
              pays: countryName.substring(0, 100),
              isActive: false // Par défaut: Non contacté
            });
            success++;
            
            if (success % 500 === 0) {
              this.logger.log(`${success} aéroports importés sur ${processed} entrées traitées...`);
            }
          }
        } catch (error) {
          errors++;
          if (errors % 100 === 0) {
            this.logger.warn(`${errors} erreurs rencontrées...`);
          }
        }
      }

      this.logger.log(`Import terminé: ${success} aéroports importés avec noms complets, ${errors} erreurs sur ${processed} entrées`);
      return {
        success,
        errors,
        message: `Import réussi: ${success} aéroports importés avec villes et pays en texte complet`
      };

    } catch (error) {
      this.logger.error('Erreur lors de l\'import des aéroports', error);
      throw new Error(`Erreur lors de l'import: ${error.message}`);
    }
  }

  /**
   * Parser une ligne CSV (gestion des guillemets)
   */
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Nettoyer les données (supprimer les doublons)
   */
  async cleanupDuplicates(): Promise<{ portsRemoved: number; aeroportsRemoved: number }> {
    this.logger.log('Nettoyage des doublons...');
    
    // Pour les ports
    const portsToKeep = await this.portRepository
      .createQueryBuilder('port')
      .select('MIN(port.id)', 'id')
      .addSelect('port.abbreviation')
      .groupBy('port.abbreviation')
      .getRawMany();

    const portsIds = portsToKeep.map(p => p.id);
    const portsRemoved = await this.portRepository
      .createQueryBuilder()
      .delete()
      .where('id NOT IN (:...ids)', { ids: portsIds })
      .execute();

    // Pour les aéroports
    const aeroportsToKeep = await this.aeroportRepository
      .createQueryBuilder('aeroport')
      .select('MIN(aeroport.id)', 'id')
      .addSelect('aeroport.abbreviation')
      .groupBy('aeroport.abbreviation')
      .getRawMany();

    const aeroportsIds = aeroportsToKeep.map(a => a.id);
    const aeroportsRemoved = await this.aeroportRepository
      .createQueryBuilder()
      .delete()
      .where('id NOT IN (:...ids)', { ids: aeroportsIds })
      .execute();

    this.logger.log(`Nettoyage terminé: ${portsRemoved.affected} ports supprimés, ${aeroportsRemoved.affected} aéroports supprimés`);
    
    return {
      portsRemoved: portsRemoved.affected || 0,
      aeroportsRemoved: aeroportsRemoved.affected || 0
    };
  }

  /**
   * Supprimer tous les ports
   */
  async deleteAllPorts(): Promise<{ deleted: number }> {
    this.logger.log('Suppression de tous les ports...');
    
    const result = await this.portRepository
      .createQueryBuilder()
      .delete()
      .execute();

    this.logger.log(`${result.affected} ports supprimés`);
    
    return { deleted: result.affected || 0 };
  }

  /**
   * Supprimer tous les aéroports
   */
  async deleteAllAeroports(): Promise<{ deleted: number }> {
    this.logger.log('Suppression de tous les aéroports...');
    
    const result = await this.aeroportRepository
      .createQueryBuilder()
      .delete()
      .execute();

    this.logger.log(`${result.affected} aéroports supprimés`);
    
    return { deleted: result.affected || 0 };
  }

  /**
   * Obtenir les statistiques
   */
  async getStats(): Promise<{
    totalPorts: number;
    activePorts: number;
    totalAeroports: number;
    activeAeroports: number;
  }> {
    const totalPorts = await this.portRepository.count();
    const activePorts = await this.portRepository.count({ where: { isActive: true } });
    const totalAeroports = await this.aeroportRepository.count();
    const activeAeroports = await this.aeroportRepository.count({ where: { isActive: true } });

    return {
      totalPorts,
      activePorts,
      totalAeroports,
      activeAeroports
    };
  }
}
