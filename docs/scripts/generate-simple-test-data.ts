import { DataSource } from 'typeorm';
import { Personnel } from '../../src/entities/personnel.entity';
import { Client } from '../../src/entities/client.entity';
import { ContactClient } from '../../src/entities/contact-client.entity';
import { ObjectifCom } from '../../src/entities/objectif-com.entity';
import * as bcrypt from 'bcryptjs';

// Configuration de la base de données directement
const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'msp',
  password: '87Eq8384',
  database: 'velosi',
  entities: [Personnel, Client, ContactClient, ObjectifCom],
  synchronize: false,
  logging: false,
});

// Données réalistes tunisiennes pour le personnel
const TUNISIAN_NAMES = {
  prenom_homme: [
    'Ahmed', 'Mohamed', 'Ali', 'Salim', 'Karim', 'Youssef', 'Mahmoud', 'Omar', 
    'Hamza', 'Amine', 'Fares', 'Mehdi', 'Slim', 'Rami', 'Nader', 'Walid',
    'Bassem', 'Sami', 'Hichem', 'Tarek', 'Bilel', 'Khaled', 'Moez', 'Sofien'
  ],
  prenom_femme: [
    'Fatma', 'Amal', 'Salma', 'Rim', 'Sarra', 'Ines', 'Amina', 'Wiem',
    'Nesrine', 'Mariem', 'Hela', 'Radhia', 'Sonia', 'Leila', 'Nour', 'Yasmine',
    'Dorra', 'Emna', 'Siwar', 'Mouna', 'Olfa', 'Meriem', 'Houda', 'Jihene'
  ],
  nom_famille: [
    'Ben Ali', 'Trabelsi', 'Bouazizi', 'Essid', 'Jomaa', 'Chebbi', 'Karoui',
    'Makhlouf', 'Belhaj', 'Gharbi', 'Hammami', 'Jouini', 'Khelifi', 'Lahmar',
    'Mejri', 'Nasri', 'Ouali', 'Riahi', 'Sassi', 'Touati', 'Zouari', 'Agrebi',
    'Belkahia', 'Cherni', 'Dhaoui', 'Ferchichi', 'Ghannouchi', 'Hadj', 'Laabidi'
  ]
};

// Données pour clients (tunisiens et internationaux)
const CLIENT_NAMES = {
  tunisian_companies: [
    'Transport Rapide Tunisie', 'Logistique Sahel', 'Express Cargo TN',
    'Mediterranean Shipping', 'Tunis Transport International', 'Sfax Logistics',
    'Carthage Express', 'Bizerte Transport', 'Sousse Shipping Co',
    'Africa Transport Solutions', 'Tunisia Trade Express', 'Gabès Freight'
  ],
  international_companies: [
    'Global Logistics France', 'Euro Transport SAS', 'Mediterranean Express Ltd',
    'African Trade Company', 'Sahara Shipping Corp', 'Atlas International',
    'Maghreb Transport Group', 'Continental Freight', 'Desert Express LLC',
    'North Africa Logistics', 'Trans-Med Solutions', 'Berber Trading Co'
  ]
};

// Indicatifs téléphoniques par pays
const PHONE_PREFIXES = {
  tunisia: '+216',
  france: '+33',
  algeria: '+213',
  morocco: '+212',
  libya: '+218',
  egypt: '+20',
  italy: '+39',
  spain: '+34'
};

// Domaines email réalistes
const EMAIL_DOMAINS = {
  tunisia: ['velosi.tn', 'transport.tn', 'logistique.tn', 'express.tn'],
  international: ['logistics.com', 'transport.eu', 'shipping.org', 'freight.net']
};

class SimpleTestDataGenerator {
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
  private generateEmail(name: string, isTunisian: boolean = true, isPersonnel: boolean = false): string {
    const cleanName = name.toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '');
    
    // Si c'est du personnel, toujours utiliser @velosi.tn
    if (isPersonnel) {
      return `${cleanName}@velosi.tn`;
    }
    
    const domains = isTunisian ? EMAIL_DOMAINS.tunisia : EMAIL_DOMAINS.international;
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return `${cleanName}@${domain}`;
  }

  // Nettoyer les données existantes
  async cleanExistingData(): Promise<void> {
    console.log('🧹 Nettoyage des données existantes...');
    
    await this.dataSource.query('DELETE FROM objectif_com');
    await this.dataSource.query('DELETE FROM contact_client');
    await this.dataSource.query('DELETE FROM client');
    await this.dataSource.query('DELETE FROM personnel');
    
    // Reset des séquences
    await this.dataSource.query('ALTER SEQUENCE client_id_seq RESTART WITH 1');
    await this.dataSource.query('ALTER SEQUENCE personnel_id_seq RESTART WITH 1');
    await this.dataSource.query('ALTER SEQUENCE objectif_com_id_seq RESTART WITH 1');
    
    console.log('✅ Données nettoyées');
  }

  // Générer des données de personnel tunisien
  async generatePersonnel(count: number = 15): Promise<Personnel[]> {
    const personnelRepository = this.dataSource.getRepository(Personnel);
    const personnel: Personnel[] = [];

    console.log(`🧑‍💼 Génération de ${count} membres du personnel...`);

    // D'abord créer les utilisateurs administratifs spécifiques
    console.log('📋 Création des utilisateurs administratifs spécifiques...');
    
    // Mahdi Bey
    const hashedPasswordMahdi = await bcrypt.hash('VelosiPersonnel2024!', 12);
    const mahdi = personnelRepository.create({
      nom: 'Bey',
      prenom: 'Mahdi',
      nom_utilisateur: 'mahdi.bey',
      role: 'administratif',
      telephone: '+21656327280',
      email: 'mahdi.bey@velosi.tn',
      genre: 'Homme',
      statut: 'actif',
      mot_de_passe: hashedPasswordMahdi,
      photo: 'uploads/profiles/default-avatar.png',
      first_login: true
    });
    const savedMahdi = await personnelRepository.save(mahdi);
    personnel.push(savedMahdi);
    console.log(`✅ Personnel administratif créé: Mahdi Bey - Tel: +21656327280 - Email: mahdi.bey@velosi.tn`);

    // Saber Msakni
    const hashedPasswordSaber = await bcrypt.hash('VelosiPersonnel2024!', 12);
    const saber = personnelRepository.create({
      nom: 'Msakni',
      prenom: 'Saber',
      nom_utilisateur: 'saber.msakni',
      role: 'administratif',
      telephone: this.generateTunisianPhone(), // Générer un numéro tunisien
      email: 'saber.msakni@velosi.tn',
      genre: 'Homme',
      statut: 'actif',
      mot_de_passe: hashedPasswordSaber,
      photo: 'uploads/profiles/default-avatar.png',
      first_login: true
    });
    const savedSaber = await personnelRepository.save(saber);
    personnel.push(savedSaber);
    console.log(`✅ Personnel administratif créé: Saber Msakni - Tel: ${saber.telephone} - Email: saber.msakni@velosi.tn`);

    // Ensuite générer le reste du personnel aléatoirement (réduire de 2 car on en a déjà créé 2)
    const remainingCount = count - 2;
    console.log(`🎲 Génération de ${remainingCount} membres du personnel supplémentaires...`);

    for (let i = 0; i < remainingCount; i++) {
      const genre = Math.random() > 0.7 ? 'Femme' : 'Homme';
      const prenoms = genre === 'Homme' ? TUNISIAN_NAMES.prenom_homme : TUNISIAN_NAMES.prenom_femme;
      const prenom = prenoms[Math.floor(Math.random() * prenoms.length)];
      const nom = TUNISIAN_NAMES.nom_famille[Math.floor(Math.random() * TUNISIAN_NAMES.nom_famille.length)];
      
      const roles = ['commercial', 'administratif', 'chauffeur', 'finance', 'exploitation'];
      const role = roles[Math.floor(Math.random() * roles.length)];
      
      const nomUtilisateur = `${prenom.toLowerCase()}.${nom.toLowerCase().replace(/\s+/g, '')}`;
      const email = `${nomUtilisateur}@velosi.tn`; // Tous les emails du personnel avec @velosi.tn
      const telephone = this.generateTunisianPhone();
      
      const hashedPassword = await bcrypt.hash('VelosiPersonnel2024!', 12);

      const person = personnelRepository.create({
        nom,
        prenom,
        nom_utilisateur: nomUtilisateur,
        role,
        telephone,
        email,
        genre,
        statut: 'actif',
        mot_de_passe: hashedPassword,
        photo: 'uploads/profiles/default-avatar.png',
        first_login: true
      });

      const savedPerson = await personnelRepository.save(person);
      personnel.push(savedPerson);
      
      console.log(`✅ Personnel créé: ${prenom} ${nom} (${role}) - Tel: ${telephone}`);
    }

    return personnel;
  }

  // Générer des clients (tunisiens et internationaux)
  async generateClients(count: number = 20): Promise<Client[]> {
    const clientRepository = this.dataSource.getRepository(Client);
    const clients: Client[] = [];

    console.log(`🏢 Génération de ${count} clients...`);

    for (let i = 0; i < count; i++) {
      const isTunisian = Math.random() > 0.4; // 60% tunisiens, 40% internationaux
      
      let nom: string;
      let pays: string;
      let ville: string;
      let codePostal: string;
      
      if (isTunisian) {
        nom = CLIENT_NAMES.tunisian_companies[Math.floor(Math.random() * CLIENT_NAMES.tunisian_companies.length)];
        pays = 'Tunisie';
        const villes = ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Gabès', 'Kairouan', 'Gafsa', 'Monastir'];
        ville = villes[Math.floor(Math.random() * villes.length)];
        codePostal = (Math.floor(Math.random() * 9000) + 1000).toString();
      } else {
        nom = CLIENT_NAMES.international_companies[Math.floor(Math.random() * CLIENT_NAMES.international_companies.length)];
        const paysOptions = ['France', 'Algérie', 'Maroc', 'Libye', 'Égypte', 'Italie', 'Espagne'];
        pays = paysOptions[Math.floor(Math.random() * paysOptions.length)];
        
        // Villes selon le pays
        const villesParPays = {
          'France': ['Paris', 'Lyon', 'Marseille', 'Toulouse'],
          'Algérie': ['Alger', 'Oran', 'Constantine', 'Annaba'],
          'Maroc': ['Casablanca', 'Rabat', 'Fès', 'Marrakech'],
          'Libye': ['Tripoli', 'Benghazi', 'Misrata'],
          'Égypte': ['Le Caire', 'Alexandrie', 'Gizeh'],
          'Italie': ['Rome', 'Milan', 'Naples', 'Turin'],
          'Espagne': ['Madrid', 'Barcelone', 'Valence', 'Séville']
        };
        
        ville = villesParPays[pays][Math.floor(Math.random() * villesParPays[pays].length)];
        codePostal = Math.floor(Math.random() * 90000 + 10000).toString();
      }

      const categories = ['Premium', 'Standard', 'Enterprise', 'SME'];
      const types = ['Importateur', 'Exportateur', 'Transitaire', 'Distributeur'];
      
      const interlocuteur = isTunisian 
        ? `${TUNISIAN_NAMES.prenom_homme[Math.floor(Math.random() * TUNISIAN_NAMES.prenom_homme.length)]} ${TUNISIAN_NAMES.nom_famille[Math.floor(Math.random() * TUNISIAN_NAMES.nom_famille.length)]}`
        : `Contact ${nom.split(' ')[0]}`;

      const hashedPassword = await bcrypt.hash('VelosiClient2024!', 12);

      const client = clientRepository.create({
        nom,
        interlocuteur,
        categorie: categories[Math.floor(Math.random() * categories.length)],
        type_client: types[Math.floor(Math.random() * types.length)],
        adresse: `${Math.floor(Math.random() * 999) + 1} Avenue ${Math.random() > 0.5 ? 'Habib Bourguiba' : 'de la République'}`,
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
      
      console.log(`✅ Client créé: ${nom} (${pays}) - ${ville}`);
    }

    return clients;
  }

  // Générer les contacts clients avec numéros internationaux
  async generateContactClients(clients: Client[]): Promise<ContactClient[]> {
    const contactRepository = this.dataSource.getRepository(ContactClient);
    const contacts: ContactClient[] = [];

    console.log(`📞 Génération des contacts clients...`);

    for (const client of clients) {
      // Déterminer le pays pour le format téléphonique
      let phoneCountry: keyof typeof PHONE_PREFIXES = 'tunisia';
      
      switch (client.pays) {
        case 'France': phoneCountry = 'france'; break;
        case 'Algérie': phoneCountry = 'algeria'; break;
        case 'Maroc': phoneCountry = 'morocco'; break;
        case 'Libye': phoneCountry = 'libya'; break;
        case 'Égypte': phoneCountry = 'egypt'; break;
        case 'Italie': phoneCountry = 'italy'; break;
        case 'Espagne': phoneCountry = 'spain'; break;
        default: phoneCountry = 'tunisia';
      }

      const tel1 = phoneCountry === 'tunisia' 
        ? this.generateTunisianPhone() 
        : this.generateInternationalPhone(phoneCountry);
      
      const tel2 = Math.random() > 0.6 ? (phoneCountry === 'tunisia' 
        ? this.generateTunisianPhone() 
        : this.generateInternationalPhone(phoneCountry)) : null;

      const tel3 = Math.random() > 0.8 ? (phoneCountry === 'tunisia' 
        ? this.generateTunisianPhone() 
        : this.generateInternationalPhone(phoneCountry)) : null;

      const fax = Math.random() > 0.7 ? tel1.replace(tel1.substring(-2), '00') : null;

      const mail1 = this.generateEmail(client.nom, phoneCountry === 'tunisia');
      const mail2 = Math.random() > 0.6 ? this.generateEmail(`contact.${client.nom}`, phoneCountry === 'tunisia') : null;

      const fonctions = ['Directeur Commercial', 'Responsable Logistique', 'Manager Import/Export', 'Coordinateur Transport', 'Responsable Achats'];
      const fonction = fonctions[Math.floor(Math.random() * fonctions.length)];

      const contact = contactRepository.create({
        id_client: client.id,
        tel1,
        tel2,
        tel3,
        fax,
        mail1,
        mail2,
        fonction,
        client
      });

      const savedContact = await contactRepository.save(contact);
      contacts.push(savedContact);
      
      console.log(`✅ Contact créé pour ${client.nom}: ${tel1} - ${mail1} (${fonction})`);
    }

    return contacts;
  }

  // Générer des objectifs commerciaux
  async generateObjectifs(personnel: Personnel[]): Promise<ObjectifCom[]> {
    const objectifRepository = this.dataSource.getRepository(ObjectifCom);
    const objectifs: ObjectifCom[] = [];

    console.log(`🎯 Génération des objectifs commerciaux...`);

    // Seulement pour le personnel commercial et exploitation
    const commercialPersonnel = personnel.filter(p => 
      p.role === 'commercial' || p.role === 'exploitation'
    );

    for (const person of commercialPersonnel) {
      const titres = [
        'Objectif CA Trimestriel', 'Développement Clientèle', 'Expansion Marché Export',
        'Objectif Nouveaux Clients', 'Croissance Chiffre d\'Affaires', 'Fidélisation Client'
      ];

      const descriptions = [
        'Atteindre les objectifs de chiffre d\'affaires fixés pour le trimestre',
        'Développer le portefeuille client dans la région assignée',
        'Expansion des activités d\'export vers les pays du Maghreb',
        'Acquisition de nouveaux clients dans le secteur logistique',
        'Augmentation du CA par client existant de 15%',
        'Amélioration du taux de rétention client'
      ];

      const nbObjectifs = Math.floor(Math.random() * 3) + 1; // 1 à 3 objectifs par commercial

      for (let i = 0; i < nbObjectifs; i++) {
        const dateDebut = new Date();
        dateDebut.setDate(dateDebut.getDate() - Math.floor(Math.random() * 90));

        const dateFin = new Date(dateDebut);
        dateFin.setMonth(dateFin.getMonth() + Math.floor(Math.random() * 6) + 3);

        const objectifCA = Math.floor(Math.random() * 500000) + 100000;
        const objectifClients = Math.floor(Math.random() * 20) + 5;

        const statuts = ['en_cours', 'atteint', 'non_atteint'];
        const statut = dateFin < new Date() 
          ? (Math.random() > 0.3 ? 'atteint' : 'non_atteint')
          : 'en_cours';

        const progression = statut === 'atteint' 
          ? 100 
          : statut === 'non_atteint'
            ? Math.floor(Math.random() * 70) + 10
            : Math.floor(Math.random() * 80) + 20;

        const objectif = objectifRepository.create({
          id_personnel: person.id,
          titre: titres[Math.floor(Math.random() * titres.length)],
          description: descriptions[Math.floor(Math.random() * descriptions.length)],
          objectif_ca: objectifCA,
          objectif_clients: objectifClients,
          date_debut: dateDebut,
          date_fin: dateFin,
          statut,
          progression,
          personnel: person
        });

        const savedObjectif = await objectifRepository.save(objectif);
        objectifs.push(savedObjectif);
        
        console.log(`✅ Objectif créé pour ${person.prenom} ${person.nom}: ${objectif.titre} (${statut} - ${progression}%)`);
      }
    }

    return objectifs;
  }

  // Générer toutes les données
  async generateAllData(options: {
    cleanBefore?: boolean;
    personnelCount?: number;
    clientCount?: number;
  } = {}): Promise<void> {
    const {
      cleanBefore = false,
      personnelCount = 15,
      clientCount = 20
    } = options;

    console.log('🚀 Démarrage de la génération des données de test Velosi Transport');
    console.log(`📊 Configuration: ${personnelCount} personnel, ${clientCount} clients`);
    
    try {
      if (cleanBefore) {
        await this.cleanExistingData();
      }

      // Générer les données principales
      const personnel = await this.generatePersonnel(personnelCount);
      const clients = await this.generateClients(clientCount);
      const contacts = await this.generateContactClients(clients);
      const objectifs = await this.generateObjectifs(personnel);

      console.log('\n📈 Résumé de génération:');
      console.log(`👥 Personnel: ${personnel.length}`);
      console.log(`🏢 Clients: ${clients.length}`);
      console.log(`📞 Contacts: ${contacts.length}`);
      console.log(`🎯 Objectifs: ${objectifs.length}`);

      console.log('\n✅ Génération des données terminée avec succès!');
      console.log('🔐 Mots de passe par défaut:');
      console.log('   - Personnel: VelosiPersonnel2024!');
      console.log('   - Clients: VelosiClient2024!');
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération:', error);
      throw error;
    }
  }
}

// Script principal
async function main() {
  console.log('🎬 Initialisation du générateur de données de test Velosi...');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Connexion à la base de données établie');

    const generator = new SimpleTestDataGenerator(AppDataSource);

    await generator.generateAllData({
      cleanBefore: true, // Nettoyer avant génération
      personnelCount: 15, // 15 membres du personnel
      clientCount: 25,    // 25 clients (15 tunisiens, 10 internationaux)
    });
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