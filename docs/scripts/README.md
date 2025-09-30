# Générateur de Données de Test - Velosi Transport

Ce script génère des données de test réalistes pour l'application Velosi Transport, incluant la synchronisation avec Keycloak.

## 🎯 Fonctionnalités

- **Personnel tunisien** : Génère des employés avec des noms et prénoms tunisiens réalistes
- **Clients mixtes** : 60% de clients tunisiens, 40% de clients internationaux
- **Numéros de téléphone internationaux** : Format correct selon le pays (+216 Tunisie, +33 France, etc.)
- **Contacts clients** : Informations de contact complètes avec emails et téléphones
- **Objectifs commerciaux** : Objectifs réalistes pour le personnel commercial
- **Synchronisation Keycloak** : Création automatique des utilisateurs dans Keycloak

## 📊 Données Générées

### Personnel (15 par défaut)
- Noms et prénoms tunisiens authentiques
- Numéros de téléphone tunisiens (+216)
- Emails avec domaines tunisiens (.tn)
- Rôles variés : commercial, administratif, logistique, manager, employee
- Distribution de genre réaliste (70% hommes, 30% femmes)

### Clients (25 par défaut)
- **Clients tunisiens (60%)** :
  - Noms d'entreprises de transport tunisiennes
  - Adresses dans les principales villes tunisiennes
  - Numéros +216 avec opérateurs tunisiens réels
- **Clients internationaux (40%)** :
  - Entreprises des pays du Maghreb et d'Europe
  - Numéros avec indicatifs internationaux corrects
  - Adresses dans les pays respectifs

### Contacts Clients
- Numéros de téléphone avec indicatifs pays appropriés :
  - **Tunisie** : +216 (format opérateurs tunisiens)
  - **France** : +33 6XXXXXXXX
  - **Algérie** : +213 5XXXXXXXX  
  - **Maroc** : +212 6XXXXXXXX
  - **Autres pays** : Formats appropriés
- Emails avec domaines pertinents
- Fonctions professionnelles réalistes

### Objectifs Commerciaux
- Assignés au personnel commercial et managers uniquement
- Objectifs de CA entre 100k et 600k TND
- Objectifs clients entre 5 et 25 nouveaux clients
- Statuts réalistes (en_cours, atteint, non_atteint)
- Progressions cohérentes avec les statuts

## 🚀 Utilisation

### Installation des dépendances
```bash
cd velosi-back
npm install
```

### Exécution du script

1. **Génération complète** (recommandé pour les tests) :
```bash
npm run ts-node scripts/generate-test-data.ts
```

2. **Génération avec nettoyage préalable** :
```bash
npm run ts-node scripts/generate-test-data.ts --clean
```

3. **Génération sans synchronisation Keycloak** :
```bash
npm run ts-node scripts/generate-test-data.ts --no-keycloak
```

### Configuration personnalisée

Modifiez les paramètres dans le fichier `generate-test-data.ts` :

```typescript
await generator.generateAllData({
  cleanBefore: true,      // Nettoyer les données existantes
  personnelCount: 20,     // Nombre de personnel à générer
  clientCount: 30,        // Nombre de clients à générer
  syncKeycloak: true      // Synchroniser avec Keycloak
});
```

## 🔐 Authentification

### Mots de passe par défaut
- **Personnel** : `VelosiPersonnel2024!`
- **Clients** : `VelosiClient2024!`

### Utilisateurs de test créés
Tous les utilisateurs sont créés avec `first_login: true`, nécessitant un changement de mot de passe à la première connexion.

## 🌍 Données Internationales

### Pays supportés pour les clients
- **Tunisie** (+216) - Tunis, Sfax, Sousse, Bizerte, etc.
- **France** (+33) - Paris, Lyon, Marseille, Toulouse
- **Algérie** (+213) - Alger, Oran, Constantine, Annaba
- **Maroc** (+212) - Casablanca, Rabat, Fès, Marrakech
- **Libye** (+218) - Tripoli, Benghazi, Misrata
- **Égypte** (+20) - Le Caire, Alexandrie, Gizeh
- **Italie** (+39) - Rome, Milan, Naples, Turin
- **Espagne** (+34) - Madrid, Barcelone, Valence, Séville

### Format des numéros de téléphone
- **Tunisie** : +216 XX XXX XXX (avec vrais opérateurs : 20-29, 50-58, 90-99)
- **France** : +33 6 XX XX XX XX
- **Algérie** : +213 5 XX XX XX XX
- **Maroc** : +212 6 XX XX XX XX
- **Autres** : Formats standards internationaux

## ⚙️ Configuration Keycloak

Assurez-vous que votre fichier `.env` contient :

```env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
```

## 📝 Logs et Monitoring

Le script affiche des logs détaillés pendant l'exécution :
- ✅ Création de chaque utilisateur
- 📞 Numéros de téléphone générés
- 🔄 Progression de la synchronisation Keycloak
- 📈 Résumé final des données créées

## 🔧 Dépannage

### Erreur de connexion à la base de données
Vérifiez votre configuration `.env` et que PostgreSQL est démarré.

### Erreur de synchronisation Keycloak
- Vérifiez que Keycloak est démarré sur le port 8080
- Confirmez les credentials admin dans `.env`
- Le script continue même si Keycloak échoue

### Conflits d'unicité
Utilisez l'option `cleanBefore: true` pour nettoyer les données existantes.

## 📄 Structure des Données

### Tables créées/mises à jour :
- `personnel` - Employés tunisiens
- `client` - Clients tunisiens et internationaux  
- `contact_client` - Contacts avec téléphones internationaux
- `objectif_com` - Objectifs commerciaux

### Relations maintenues :
- Personnel ↔ Objectifs (OneToMany)
- Client ↔ Contacts (OneToMany)
- Keycloak IDs synchronisés

## 🎯 Cas d'usage

### Tests d'intégration
Données cohérentes pour tester les flux complets client-personnel-objectifs.

### Tests d'interface
Interface utilisateur avec des données réalistes et variées.

### Tests de performance
Volume de données suffisant pour tester les performances.

### Démonstrations
Données professionnelles pour les présentations client.