import { DataSource } from 'typeorm';
import { Client } from '../../src/entities/client.entity';
import { ContactClient } from '../../src/entities/contact-client.entity';
import * as bcrypt from 'bcryptjs';

// Configuration de la base de données directement
const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'msp',
  password: '87Eq8384',
  database: 'velosi',
  entities: [Client, ContactClient],
  synchronize: false,
  logging: false,
});

// Noms uniques de clients tunisiens
const TUNISIAN_COMPANIES = [
  'Transport Express Tunis SARL',
  'Logistique Sahel & Cie',
  'Carthage Shipping Services',
  'Mediterranean Transport Co',
  'Tunisia Trade Express SARL',
  'Sfax Logistics International',
  'Bizerte Maritime Transport',
  'Sousse Freight Solutions',
  'Africa Transport Velosi',
  'Gabès Express Freight',
  'Monastir Shipping Company',
  'Kairouan Transport Services',
  'Nabeul Logistics SARL',
  'Gafsa Transport & Trading',
  'Ben Arous Express Co'
];

// Noms uniques de clients internationaux
const INTERNATIONAL_COMPANIES = [
  'Global Logistics France SAS',
  'Euro Mediterranean Express Ltd',
  'Atlas International Morocco',
  'Sahara Shipping Algeria Corp',
  'Continental Freight Services',
  'Trans-Maghreb Solutions SARL',
  'North Africa Trading Co',
  'Desert Express Libya LLC',
  'Nile Transport Egypt Ltd',
  'Iberian Logistics Spain SA'
];

// Indicatifs téléphoniques par pays
const PHONE_PREFIXES = {
  tunisia: '+216',
  france: '+33',
  algeria: '+213',
  morocco: '+212',
  libya: '+218',
  egypt: '+20',
  spain: '+34'
};

class ClientDataGenerator {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  // Générer un numéro de téléphone tunisien réaliste
  private generateTunisianPhone(): string {
    const operators = ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '50', '52', '53', '54', '55', '56', '58', '90', '92', '93', '94', '95', '96', '97', '98', '99'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    const number = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${PHONE_PREFIXES.tunisia}${operator}${number}`;
  }

  // Générer un numéro de téléphone international
  private generateInternationalPhone(country: keyof typeof PHONE_PREFIXES): string {
    const prefix = PHONE_PREFIXES[country];
    let number = '';
    
    switch (country) {
      case 'france':
        number = '6' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        break;
      case 'algeria':
        number = '5' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        break;
      case 'morocco':
        number = '6' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        break;
      default:
        number = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    }
    
    return `${prefix}${number}`;
  }

  // Générer un email réaliste
  private generateEmail(name: string, isTunisian: boolean = true): string {
    const cleanName = name.toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '');
    
    const domains = isTunisian 
      ? ['velosi.tn', 'transport.tn', 'logistique.tn', 'express.tn']
      : ['logistics.com', 'transport.eu', 'shipping.org', 'freight.net'];
    
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${cleanName}@${domain}`;
  }

  // Vider les tables clients et contacts
  async cleanClientData(): Promise<void> {
    console.log('🧹 Suppression des données clients existantes...');
    
    await this.dataSource.query('DELETE FROM contact_client');
    await this.dataSource.query('DELETE FROM client');
    
    // Reset des séquences
    await this.dataSource.query('ALTER SEQUENCE client_id_seq RESTART WITH 1');
    
    console.log('✅ Tables clients vidées');
  }

  // Générer 25 clients avec noms uniques
  async generateClients(): Promise<Client[]> {
    const clientRepository = this.dataSource.getRepository(Client);
    const contactRepository = this.dataSource.getRepository(ContactClient);
    const clients: Client[] = [];

    console.log('🏢 Génération de 25 clients avec noms uniques...');

    // Mélanger les noms pour avoir un ordre aléatoire
    const allCompanies = [...TUNISIAN_COMPANIES, ...INTERNATIONAL_COMPANIES];
    const shuffledCompanies = allCompanies.sort(() => Math.random() - 0.5);

    for (let i = 0; i < 25; i++) {
      const companyName = shuffledCompanies[i];
      const isTunisian = TUNISIAN_COMPANIES.includes(companyName);
      
      // Déterminer la catégorie : Local ou Étranger (première lettre majuscule)
      const categorie = isTunisian ? 'Local' : 'Étranger';
      
      // Déterminer le type : Particulier ou Entreprise (première lettre majuscule)
      const types = ['Particulier', 'Entreprise'];
      const type_client = types[Math.floor(Math.random() * types.length)];
      
      let pays: string;
      let ville: string;
      let codePostal: string;
      let phoneCountry: keyof typeof PHONE_PREFIXES = 'tunisia';
      
      if (isTunisian) {
        pays = 'Tunisie';
        const villes = ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Gabès', 'Kairouan', 'Gafsa', 'Monastir'];
        ville = villes[Math.floor(Math.random() * villes.length)];
        codePostal = (Math.floor(Math.random() * 9000) + 1000).toString();
        phoneCountry = 'tunisia';
      } else {
        // Déterminer le pays selon le nom de l'entreprise
        if (companyName.includes('France')) {
          pays = 'France';
          ville = ['Paris', 'Lyon', 'Marseille', 'Toulouse'][Math.floor(Math.random() * 4)];
          phoneCountry = 'france';
        } else if (companyName.includes('Morocco')) {
          pays = 'Maroc';
          ville = ['Casablanca', 'Rabat', 'Fès', 'Marrakech'][Math.floor(Math.random() * 4)];
          phoneCountry = 'morocco';
        } else if (companyName.includes('Algeria')) {
          pays = 'Algérie';
          ville = ['Alger', 'Oran', 'Constantine', 'Annaba'][Math.floor(Math.random() * 4)];
          phoneCountry = 'algeria';
        } else if (companyName.includes('Libya')) {
          pays = 'Libye';
          ville = ['Tripoli', 'Benghazi', 'Misrata'][Math.floor(Math.random() * 3)];
          phoneCountry = 'libya';
        } else if (companyName.includes('Egypt')) {
          pays = 'Égypte';
          ville = ['Le Caire', 'Alexandrie', 'Gizeh'][Math.floor(Math.random() * 3)];
          phoneCountry = 'egypt';
        } else if (companyName.includes('Spain')) {
          pays = 'Espagne';
          ville = ['Madrid', 'Barcelone', 'Valence', 'Séville'][Math.floor(Math.random() * 4)];
          phoneCountry = 'spain';
        } else {
          pays = 'France';
          ville = 'Paris';
          phoneCountry = 'france';
        }
        
        codePostal = Math.floor(Math.random() * 90000 + 10000).toString();
      }

      // Interlocuteur selon le pays
      const interlocuteur = isTunisian 
        ? ['Ahmed Ben Ali', 'Mohamed Trabelsi', 'Fatma Essid', 'Salim Gharbi', 'Amina Jouini'][Math.floor(Math.random() * 5)]
        : `Contact ${companyName.split(' ')[0]}`;

      const hashedPassword = await bcrypt.hash('VelosiClient2024!', 12);

      // Créer le cliente
      const client = clientRepository.create({
        nom: companyName,
        interlocuteur,
        categorie,
        type_client,
        adresse: `${Math.floor(Math.random() * 999) + 1} Avenue ${isTunisian ? 'Habib Bourguiba' : 'de la République'}`,
        code_postal: codePostal,
        ville,
        pays,
        id_fiscal: `${pays.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 1000000000)}`,
        nature: 'Société',
        etat_fiscal: 'Régulier',
        devise: isTunisian ? 'TND' : (Math.random() > 0.5 ? 'EUR' : 'USD'),
        solde: Math.floor(Math.random() * 50000) - 25000,
        statut: 'actif',
        mot_de_passe: hashedPassword,
        photo: 'uploads/profiles/default-avatar.png',
        first_login: true,
        blocage: false,
        timbre: Math.random() > 0.7,
        nbr_jour_ech: Math.floor(Math.random() * 90) + 15
      });

      const savedClient = await clientRepository.save(client);
      clients.push(savedClient);

      // Créer le contact client correspondant
      const tel1 = phoneCountry === 'tunisia' 
        ? this.generateTunisianPhone() 
        : this.generateInternationalPhone(phoneCountry);

      const tel2 = Math.random() > 0.6 ? (phoneCountry === 'tunisia' 
        ? this.generateTunisianPhone() 
        : this.generateInternationalPhone(phoneCountry)) : null;

      const mail1 = this.generateEmail(companyName, isTunisian);
      const mail2 = Math.random() > 0.6 ? this.generateEmail(`contact.${companyName}`, isTunisian) : null;

      const fonctions = ['Directeur Commercial', 'Responsable Logistique', 'Manager Import/Export', 'Coordinateur Transport', 'Responsable Achats'];
      const fonction = fonctions[Math.floor(Math.random() * fonctions.length)];

      const contact = contactRepository.create({
        id_client: savedClient.id,
        tel1,
        tel2,
        tel3: null,
        fax: Math.random() > 0.7 ? tel1.replace(tel1.substring(-2), '00') : null,
        mail1,
        mail2,
        fonction,
        client: savedClient
      });

      await contactRepository.save(contact);
      
      console.log(`✅ Client créé: ${companyName} (${categorie}) - ${type_client} - ${pays} - ${ville} - Tel: ${tel1}`);
    }

    return clients;
  }

  // Générer toutes les données
  async generateAllData(): Promise<void> {
    console.log('🚀 Génération des données clients Velosi Transport');
    console.log('===============================================');
    
    try {
      await this.cleanClientData();
      const clients = await this.generateClients();

      console.log('\n📈 Résumé de génération:');
      console.log(`🏢 Clients créés: ${clients.length}`);
      console.log(`📞 Contacts créés: ${clients.length}`);
      
      // Statistiques par catégorie
      const locaux = clients.filter(c => c.categorie === 'Local').length;
      const etrangers = clients.filter(c => c.categorie === 'Étranger').length;
      const particuliers = clients.filter(c => c.type_client === 'Particulier').length;
      const entreprises = clients.filter(c => c.type_client === 'Entreprise').length;

      console.log(`📊 Répartition:`);
      console.log(`   - Locaux: ${locaux}, Étrangers: ${etrangers}`);
      console.log(`   - Particuliers: ${particuliers}, Entreprises: ${entreprises}`);

      console.log('\n✅ Génération terminée avec succès!');
      console.log('🔐 Mot de passe par défaut: VelosiClient2024!');
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération:', error);
      throw error;
    }
  }
}

// Script principal
async function main() {
  console.log('🎬 Initialisation du générateur de clients Velosi...');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Connexion à la base de données établie');

    const generator = new ClientDataGenerator(AppDataSource);
    await generator.generateAllData();
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Connexion à la base de données fermée');
  }

  console.log('🏁 Script terminé');
}

// Exécution si appelé directement
if (require.main === module) {
  main();
}