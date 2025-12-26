# Architecture d'Authentification Multi-Tenant Robuste

## 🚨 PROBLÈME IDENTIFIÉ

### Situation Actuelle
Le système utilise actuellement le `MultiTenantAuthService` qui :
1. ✅ **Parcourt toutes les organisations actives** pour chercher l'utilisateur
2. ✅ **Compare le mot de passe** dans chaque base de données
3. ❌ **PROBLÈME CRITIQUE** : Si deux organisations ont un utilisateur avec le même `nom_utilisateur`, le système se connecte à la **première organisation trouvée**

### Exemple du Problème
```typescript
Organisation 1: "Velosi" (database: shipnology_velosi)
  └── Superviseur: username="admin", email="admin@velosi.com"

Organisation 2: "Transport Rapide" (database: shipnology_transport_rapide)  
  └── Superviseur: username="admin", email="admin@transport-rapide.com"
```

**Résultat actuel** : Si "admin" se connecte, il se connecte à "Velosi" (première org trouvée), même s'il voulait accéder à "Transport Rapide" !

---

## ✅ SOLUTIONS PROPOSÉES

### Solution 1 : Utiliser l'Email comme Identifiant Unique (RECOMMANDÉ)

#### Avantages
- ✅ L'email est **naturellement unique** dans le contexte professionnel
- ✅ Pas besoin de demander l'organisation au login
- ✅ Expérience utilisateur simple
- ✅ Compatible avec les standards (OAuth, SSO)

#### Implémentation

**1. Modifier la table `personnel` pour rendre l'email obligatoire et unique**
```sql
-- Migration
ALTER TABLE personnel 
  ALTER COLUMN email SET NOT NULL,
  ADD CONSTRAINT unique_email_per_org UNIQUE (email);

-- Ou si vous voulez permettre le même email dans différentes organisations
-- (mais un seul par organisation)
ALTER TABLE personnel
  DROP CONSTRAINT IF EXISTS unique_email_per_org;
```

**2. Modifier le processus d'authentification**
```typescript
// multi-tenant-auth.service.ts
async login(emailOrUsername: string, password: string) {
  // 1. Déterminer si c'est un email
  const isEmail = emailOrUsername.includes('@');
  
  if (isEmail) {
    // NOUVEAU: Recherche directe par email (plus rapide, plus sûr)
    return await this.loginByEmail(emailOrUsername, password);
  } else {
    // Recherche par username (comportement actuel, mais ajouter avertissement)
    return await this.loginByUsername(emailOrUsername, password);
  }
}

async loginByEmail(email: string, password: string) {
  const organisations = await this.organisationRepository.find({
    where: { statut: 'actif' }
  });

  for (const org of organisations) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(
      org.database_name
    );

    const personnel = await connection.query(
      `SELECT * FROM personnel 
       WHERE LOWER(email) = LOWER($1) 
       AND statut = 'actif'
       LIMIT 1`,
      [email]
    );

    if (personnel && personnel.length > 0) {
      const user = personnel[0];
      const isPasswordValid = await bcrypt.compare(password, user.mot_de_passe);

      if (isPasswordValid) {
        // ✅ Utilisateur trouvé de manière unique via email
        return this.generateAuthResponse(user, org);
      }
    }
  }

  throw new UnauthorizedException('Email ou mot de passe incorrect');
}
```

**3. Interface de Login**
```typescript
// Frontend: login.component.ts
<input 
  type="email" 
  placeholder="Email" 
  formControlName="email"
  required
/>
```

---

### Solution 2 : Demander l'Organisation au Login

#### Avantages
- ✅ Contrôle total sur l'organisation cible
- ✅ Permet les usernames identiques entre organisations
- ✅ Plus sécurisé (isolation explicite)

#### Inconvénients
- ❌ UX plus complexe (2 champs au lieu d'1)
- ❌ L'utilisateur doit connaître le nom technique de son organisation

#### Implémentation

**1. Modifier le DTO de Login**
```typescript
// dto/login.dto.ts
export class MultiTenantLoginDto {
  @IsString()
  @IsNotEmpty()
  organisationSlug: string; // Ex: "velosi", "transport-rapide"

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

**2. Ajouter un champ slug à l'organisation**
```sql
-- Migration
ALTER TABLE organisations 
  ADD COLUMN slug VARCHAR(100) UNIQUE;

-- Exemple de valeurs
UPDATE organisations SET slug = 'velosi' WHERE nom = 'Velosi';
UPDATE organisations SET slug = 'transport-rapide' WHERE nom = 'Transport Rapide SARL';
```

**3. Modifier l'authentification**
```typescript
async login(organisationSlug: string, username: string, password: string) {
  // 1. Trouver l'organisation par son slug
  const organisation = await this.organisationRepository.findOne({
    where: { slug: organisationSlug, statut: 'actif' }
  });

  if (!organisation) {
    throw new UnauthorizedException('Organisation non trouvée');
  }

  // 2. Se connecter directement à SA base de données
  const connection = await this.databaseConnectionService.getOrganisationConnection(
    organisation.database_name
  );

  // 3. Chercher l'utilisateur UNIQUEMENT dans cette base
  const personnel = await connection.query(
    `SELECT * FROM personnel 
     WHERE LOWER(nom_utilisateur) = LOWER($1) 
     AND statut = 'actif'
     LIMIT 1`,
    [username]
  );

  if (!personnel || personnel.length === 0) {
    throw new UnauthorizedException('Identifiants incorrects');
  }

  const user = personnel[0];
  const isPasswordValid = await bcrypt.compare(password, user.mot_de_passe);

  if (!isPasswordValid) {
    throw new UnauthorizedException('Identifiants incorrects');
  }

  return this.generateAuthResponse(user, organisation);
}
```

**4. Interface de Login avec sélection d'organisation**
```html
<!-- login.component.html -->
<form [formGroup]="loginForm">
  <!-- Dropdown pour choisir l'organisation -->
  <select formControlName="organisation">
    <option value="velosi">Velosi</option>
    <option value="transport-rapide">Transport Rapide</option>
  </select>

  <input type="text" placeholder="Nom d'utilisateur" formControlName="username" />
  <input type="password" placeholder="Mot de passe" formControlName="password" />
  
  <button type="submit">Se connecter</button>
</form>
```

---

### Solution 3 : Combinaison Email + Fallback avec Sélection

#### Description
- Connexion par email en priorité (simple et unique)
- Si plusieurs organisations ont le même username → demander de choisir

```typescript
async intelligentLogin(usernameOrEmail: string, password: string) {
  const isEmail = usernameOrEmail.includes('@');
  
  if (isEmail) {
    // Email = unique, connexion directe
    return await this.loginByEmail(usernameOrEmail, password);
  }
  
  // Username = possibilité de doublon
  const matchingOrgs = await this.findOrganisationsWithUsername(usernameOrEmail);
  
  if (matchingOrgs.length === 0) {
    throw new UnauthorizedException('Utilisateur non trouvé');
  }
  
  if (matchingOrgs.length === 1) {
    // Un seul match = connexion automatique
    return await this.authenticateInOrganisation(
      matchingOrgs[0], 
      usernameOrEmail, 
      password
    );
  }
  
  // Plusieurs organisations avec ce username
  throw new AmbiguousUserException({
    message: 'Plusieurs organisations trouvées, veuillez préciser',
    organisations: matchingOrgs.map(org => ({
      id: org.id,
      nom: org.nom_affichage,
      slug: org.slug
    }))
  });
}
```

---

## 📧 CONFIGURATION EMAIL PAR ORGANISATION

### Problème Actuel
Le système utilise une **configuration SMTP globale** définie dans `.env` :
```env
SMTP_HOST=mail.infomaniak.com
SMTP_USER=noreply@velosi-erp.com
SMTP_FROM=noreply@velosi-erp.com
```

**Problème SaaS** : Toutes les organisations utilisent le même email d'envoi !

### Solution : Configuration SMTP par Organisation

#### 1. Modifier l'entité Organisation

```typescript
// organisation.entity.ts
@Entity('organisations')
export class Organisation {
  // ... champs existants ...

  // Configuration SMTP personnalisée
  @Column({ type: 'varchar', length: 255, nullable: true })
  smtp_host: string; // Ex: "smtp.gmail.com"

  @Column({ type: 'integer', nullable: true, default: 587 })
  smtp_port: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  smtp_user: string; // Ex: "contact@transport-rapide.com"

  @Column({ type: 'varchar', length: 255, nullable: true })
  smtp_password: string; // ⚠️ À chiffrer en production

  @Column({ type: 'varchar', length: 255, nullable: true })
  smtp_from_email: string; // Email d'expédition

  @Column({ type: 'varchar', length: 255, nullable: true })
  smtp_from_name: string; // Ex: "Transport Rapide Support"

  @Column({ type: 'boolean', default: false })
  smtp_use_tls: boolean;

  @Column({ type: 'boolean', default: false })
  smtp_enabled: boolean; // Si false, utiliser la config globale
}
```

#### 2. Migration SQL

```sql
-- migrations/add_smtp_config_to_organisations.sql
ALTER TABLE organisations
  ADD COLUMN smtp_host VARCHAR(255),
  ADD COLUMN smtp_port INTEGER DEFAULT 587,
  ADD COLUMN smtp_user VARCHAR(255),
  ADD COLUMN smtp_password VARCHAR(255),
  ADD COLUMN smtp_from_email VARCHAR(255),
  ADD COLUMN smtp_from_name VARCHAR(255),
  ADD COLUMN smtp_use_tls BOOLEAN DEFAULT false,
  ADD COLUMN smtp_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN organisations.smtp_enabled IS 'Si true, utiliser la config SMTP personnalisée. Si false, utiliser la config globale du système.';
```

#### 3. Service Email Multi-Tenant

```typescript
// email.service.ts
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private globalTransporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Transporter global (fallback)
    this.globalTransporter = this.createTransporter({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      user: this.configService.get('SMTP_USER'),
      password: this.configService.get('SMTP_PASSWORD'),
    });
  }

  /**
   * Créer un transporter pour une organisation spécifique
   */
  private createTransporterForOrganisation(org: Organisation): nodemailer.Transporter {
    if (!org.smtp_enabled || !org.smtp_host) {
      return this.globalTransporter;
    }

    this.logger.log(`Création d'un transporter SMTP pour: ${org.nom}`);

    return nodemailer.createTransport({
      host: org.smtp_host,
      port: org.smtp_port,
      secure: org.smtp_use_tls,
      auth: {
        user: org.smtp_user,
        pass: org.smtp_password, // ⚠️ Décrypter si chiffré
      },
    });
  }

  /**
   * Envoyer un email avec la config de l'organisation
   */
  async sendEmailForOrganisation(
    organisation: Organisation,
    to: string,
    subject: string,
    html: string
  ) {
    const transporter = this.createTransporterForOrganisation(organisation);

    const fromEmail = organisation.smtp_enabled 
      ? organisation.smtp_from_email 
      : this.configService.get('SMTP_FROM');

    const fromName = organisation.smtp_enabled
      ? organisation.smtp_from_name
      : 'Velosi ERP';

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });

      this.logger.log(`✅ Email envoyé à ${to} depuis ${fromEmail}`);
    } catch (error) {
      this.logger.error(`❌ Échec envoi email pour ${organisation.nom}:`, error);
      throw error;
    }
  }
}
```

#### 4. Utilisation dans le Setup

```typescript
// organisations.service.ts
async createOrganisation(dto: CreateOrganisationDto) {
  // ... création de l'organisation et de la base ...

  // Envoyer l'email de bienvenue avec le SMTP de l'organisation (ou global)
  const org = await this.organisationRepository.findOne({ where: { id: newOrg.id } });
  
  await this.emailService.sendEmailForOrganisation(
    org,
    dto.superviseur_email,
    'Bienvenue sur votre espace Velosi ERP',
    this.generateWelcomeEmail(org, superviseur)
  );
}
```

---

## 🎯 RECOMMANDATIONS FINALES

### Pour l'Authentification
**Choisir : Solution 1 (Email unique) + Avertissement si username**

```typescript
// Stratégie optimale
async login(identifier: string, password: string) {
  if (identifier.includes('@')) {
    // Email = unique et sûr
    return await this.loginByEmail(identifier, password);
  } else {
    // Username = vérifier unicité
    const matchingOrgs = await this.findUserInOrganisations(identifier);
    
    if (matchingOrgs.length > 1) {
      throw new ConflictException({
        code: 'MULTIPLE_ORGANISATIONS',
        message: 'Ce nom d\'utilisateur existe dans plusieurs organisations. Veuillez utiliser votre email.',
        organisations: matchingOrgs.map(o => o.nom_affichage)
      });
    }
    
    return await this.authenticateUser(matchingOrgs[0], identifier, password);
  }
}
```

### Pour la Configuration Email
**Approche Progressive :**

1. **Phase 1 (MVP)** : Configuration globale pour toutes les organisations
   - Plus simple à mettre en place
   - Email type : `noreply@velosi-erp.com`

2. **Phase 2 (Production)** : Configuration SMTP par organisation
   - Chaque organisation peut configurer son SMTP
   - Fallback sur la config globale si non configuré
   - Interface admin pour gérer les paramètres SMTP

3. **Phase 3 (Avancé)** : Intégration avec des providers tiers
   - SendGrid, Mailgun, AWS SES par organisation
   - Gestion des domaines personnalisés
   - Tracking des emails

---

## 🔐 SÉCURITÉ

### Pour les Mots de Passe SMTP
```typescript
import * as crypto from 'crypto';

// Chiffrer
function encryptSmtpPassword(password: string): string {
  const key = process.env.ENCRYPTION_KEY;
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Déchiffrer
function decryptSmtpPassword(encrypted: string): string {
  const key = process.env.ENCRYPTION_KEY;
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Pour le JWT
Toujours inclure `organisationId` et `databaseName` dans le payload :
```typescript
{
  sub: user.id,
  email: user.email,
  organisationId: 1,
  databaseName: "shipnology_velosi", // ✅ CRITIQUE pour le routing
  iat: 1234567890,
  exp: 1234567890
}
```

---

## 📋 CHECKLIST D'IMPLÉMENTATION

- [ ] Modifier `Organisation` entity avec champs SMTP
- [ ] Créer migration SQL pour SMTP config
- [ ] Implémenter `loginByEmail()` dans `MultiTenantAuthService`
- [ ] Ajouter détection de conflits username
- [ ] Modifier `EmailService` pour support multi-tenant
- [ ] Ajouter interface admin pour config SMTP
- [ ] Tests : connexion avec email unique
- [ ] Tests : détection de username en doublon
- [ ] Tests : envoi d'email avec config personnalisée
- [ ] Documentation utilisateur : "Utilisez votre email pour vous connecter"
