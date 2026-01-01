# 🏢 Guide de Migration Multi-Tenant pour EmailService

## ✅ Modifications Déjà Effectuées

### 1. Infrastructure Multi-Tenant Ajoutée

- **DataSource** injecté pour accéder à la base Shipnology
- **Map de transporters** pour gérer les configurations SMTP par organisation
- **Méthodes utilitaires** :
  - `getOrganisation(organisationId)` - Charge l'organisation depuis Shipnology DB
  - `getTransporterForOrganisation(organisationId)` - Obtient ou crée un transporter SMTP personnalisé
  - `getOrganisationLogoBase64(organisationId)` - Charge le logo de l'organisation ou logo par défaut
  - `getEmailFooter(organisationId)` - Génère un footer personnalisé avec infos de l'organisation

### 2. Méthodes Déjà Adaptées ✅

Les méthodes suivantes ont été modifiées pour supporter le multi-tenant :

#### `sendOtpEmail(email, otpCode, userName?, organisationId?)`
- Accepte `organisationId` optionnel
- Utilise le transporter de l'organisation ou global
- Logo et footer personnalisés
- Template adapté avec nom de l'organisation

#### `sendPersonnelCredentialsEmail(email, userName, password, fullName, role, organisationId?)`
- Accepte `organisationId` optionnel
- Logo et footer personnalisés
- Informations de contact de l'organisation dans le template

#### `sendClientCredentialsEmail(email, userName, password, companyName, interlocuteur?, organisationId?)`
- Accepte `organisationId` optionnel
- Logo et footer personnalisés
- Nom de l'organisation dans le sujet et le contenu

## 📋 Méthodes À Adapter

### Liste des méthodes restantes à adapter :

1. ✅ `sendOtpEmail` - **FAIT**
2. `sendPasswordResetSuccessEmail`
3. `sendPasswordResetByAdminEmail`
4. ✅ `sendPersonnelCredentialsEmail` - **FAIT**
5. `sendPersonnelDeactivationEmail`
6. `sendPersonnelReactivationEmail`
7. ✅ `sendClientCredentialsEmail` - **FAIT**
8. `sendClientDeactivationEmail`
9. `sendClientReactivationEmail`
10. `sendContactEmail`

### Templates à adapter :

1. ✅ `getOtpEmailTemplate` - **FAIT**
2. `getSuccessEmailTemplate`
3. `getAdminResetEmailTemplate`
4. ✅ `getPersonnelCredentialsTemplate` - **FAIT**
5. `getDeactivationEmailTemplate`
6. `getReactivationEmailTemplate`
7. ✅ `getClientCredentialsTemplate` - **FAIT**
8. `getClientDeactivationEmailTemplate`
9. `getClientReactivationEmailTemplate`
10. `getContactEmailTemplate`

## 🔧 Pattern de Migration

Pour adapter une méthode d'envoi d'email, suivez ce pattern :

### Étape 1 : Modifier la signature de la méthode

```typescript
// AVANT
async sendExampleEmail(
  email: string,
  param1: string,
  param2: string
): Promise<boolean>

// APRÈS
async sendExampleEmail(
  email: string,
  param1: string,
  param2: string,
  organisationId?: number  // ⚠️ Ajouter en dernier paramètre
): Promise<boolean>
```

### Étape 2 : Obtenir le transporter et l'organisation

```typescript
async sendExampleEmail(
  email: string,
  param1: string,
  param2: string,
  organisationId?: number
): Promise<boolean> {
  try {
    // 1. Obtenir le transporter approprié
    const transporter = await this.getTransporterForOrganisation(organisationId);
    
    if (!transporter) {
      this.logger.warn(`⚠️ Impossible d'envoyer l'email à ${email}: Service email non configuré`);
      return false;
    }
    
    // 2. Charger l'organisation si ID fourni
    const organisation = organisationId ? await this.getOrganisation(organisationId) : null;
    
    // 3. Obtenir le logo et footer personnalisés
    const logoBase64 = await this.getOrganisationLogoBase64(organisationId);
    const footer = await this.getEmailFooter(organisationId);
    
    // Suite...
```

### Étape 3 : Adapter le template

```typescript
// Appeler le template avec les nouveaux paramètres
const htmlTemplate = await this.getExampleEmailTemplate(
  param1,
  param2,
  organisation,  // ⚠️ Passer l'organisation
  footer,        // ⚠️ Passer le footer
  logoBase64     // ⚠️ Passer le logo
);
```

### Étape 4 : Configurer l'expéditeur

```typescript
// Déterminer l'expéditeur basé sur l'organisation
const fromName = organisation?.smtp_from_name 
  || organisation?.nom_affichage 
  || organisation?.nom 
  || this.getFromName();

const fromEmail = organisation?.smtp_from_email 
  || this.getFromEmail();

const orgName = organisation?.nom_affichage 
  || organisation?.nom 
  || 'Shipnology ERP';
```

### Étape 5 : Gérer les pièces jointes (logo)

```typescript
const attachments = [];

// Logo de l'organisation (si disponible en local)
if (organisation?.logo_url && !organisation.logo_url.startsWith('http')) {
  const logoPath = path.isAbsolute(organisation.logo_url) 
    ? organisation.logo_url 
    : path.join(process.cwd(), 'uploads', organisation.logo_url);
  
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: path.basename(logoPath),
      path: logoPath,
      cid: 'logo_organisation'  // ⚠️ CID pour le template
    });
  }
} else if (!organisation) {
  // Logo par défaut si pas d'organisation
  const logoPath = this.getLogoPath();
  if (logoPath && fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'logo_velosi.png',
      path: logoPath,
      cid: 'logo_velosi'
    });
  }
}
```

### Étape 6 : Envoyer l'email

```typescript
const mailOptions = {
  from: {
    name: `${fromName} - Votre Sujet`,
    address: fromEmail
  },
  to: email,
  subject: `📧 Sujet personnalisé pour ${orgName}`,
  html: htmlTemplate,
  text: `Version texte avec ${orgName}`,
  attachments: attachments
};

const result = await transporter.sendMail(mailOptions);
this.logger.log(`✅ Email envoyé à ${email} (Org: ${organisation?.nom || 'Global'}) - ID: ${result.messageId}`);
return true;
```

## 🎨 Pattern de Migration des Templates

### Étape 1 : Modifier la signature du template

```typescript
// AVANT
private getExampleEmailTemplate(
  param1: string,
  param2: string
): string

// APRÈS
private async getExampleEmailTemplate(
  param1: string,
  param2: string,
  organisation?: Organisation | null,
  footer?: string,
  logoBase64?: string
): Promise<string>  // ⚠️ Devient async et retourne Promise
```

### Étape 2 : Définir les variables personnalisées

```typescript
private async getExampleEmailTemplate(
  param1: string,
  param2: string,
  organisation?: Organisation | null,
  footer?: string,
  logoBase64?: string
): Promise<string> {
  // Nom de l'organisation à afficher
  const orgName = organisation?.nom_affichage || organisation?.nom || 'Shipnology ERP';
  
  // CID du logo (pour cid:logo_xxx dans le HTML)
  const logoCid = organisation?.logo_url ? 'logo_organisation' : 'logo_velosi';
  
  // Footer personnalisé ou par défaut
  const finalFooter = footer || await this.getEmailFooter(organisation?.id);
  
  // Informations de contact (si disponibles)
  const contactEmail = organisation?.email_contact || organisation?.email_service_technique;
  const contactPhone = organisation?.tel1 || organisation?.telephone;
  const contactWeb = organisation?.site_web;
  
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <!-- Suite du template... -->
  `;
}
```

### Étape 3 : Remplacer les références statiques

Dans le template HTML, remplacez :

```html
<!-- AVANT -->
<title>Email de Velosi ERP</title>
<img src="cid:logo_velosi" alt="Logo Velosi" />
<h1>Velosi ERP</h1>
<p>Contenu avec Velosi</p>
${this.getSimpleEmailFooter()}

<!-- APRÈS -->
<title>Email de ${orgName}</title>
<img src="cid:${logoCid}" alt="Logo ${orgName}" />
<h1>${orgName}</h1>
<p>Contenu avec ${orgName}</p>
${finalFooter}
```

### Étape 4 : Personnaliser les informations de contact

```html
<!-- AVANT -->
<div class="contact-section">
  <h3>💬 Besoin d'aide ?</h3>
  <p>Email: support@velosi.com</p>
  <p>Téléphone: +33 1 23 45 67 89</p>
</div>

<!-- APRÈS -->
<div class="contact-section">
  <h3>💬 Besoin d'aide ?</h3>
  <p><strong>Support ${orgName}</strong></p>
  ${contactEmail ? `<p>📧 Email: ${contactEmail}</p>` : ''}
  ${contactPhone ? `<p>📞 Téléphone: ${contactPhone}</p>` : ''}
  ${contactWeb ? `<p>🌐 Web: <a href="${contactWeb}">${contactWeb}</a></p>` : ''}
</div>
```

## 🚀 Exemple Complet d'Adaptation

Voici un exemple complet pour `sendPasswordResetSuccessEmail` :

```typescript
/**
 * 🏢 MULTI-TENANT: Envoyer notification de réinitialisation réussie
 */
async sendPasswordResetSuccessEmail(
  email: string, 
  userName?: string,
  organisationId?: number
): Promise<boolean> {
  try {
    // 1. Obtenir transporter et organisation
    const transporter = await this.getTransporterForOrganisation(organisationId);
    
    if (!transporter) {
      this.logger.warn(`⚠️ Impossible d'envoyer l'email à ${email}: Service email non configuré`);
      return false;
    }
    
    const organisation = organisationId ? await this.getOrganisation(organisationId) : null;
    const logoBase64 = await this.getOrganisationLogoBase64(organisationId);
    const footer = await this.getEmailFooter(organisationId);
    
    // 2. Générer le template
    const htmlTemplate = await this.getSuccessEmailTemplate(
      userName, 
      organisation, 
      footer, 
      logoBase64
    );
    
    // 3. Configurer l'expéditeur
    const fromName = organisation?.smtp_from_name || organisation?.nom_affichage || organisation?.nom || this.getFromName();
    const fromEmail = organisation?.smtp_from_email || this.getFromEmail();
    const orgName = organisation?.nom_affichage || organisation?.nom || 'Shipnology ERP';
    
    // 4. Préparer les pièces jointes
    const attachments = [];
    
    if (organisation?.logo_url && !organisation.logo_url.startsWith('http')) {
      const logoPath = path.isAbsolute(organisation.logo_url) 
        ? organisation.logo_url 
        : path.join(process.cwd(), 'uploads', organisation.logo_url);
      
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: path.basename(logoPath),
          path: logoPath,
          cid: 'logo_organisation'
        });
      }
    } else if (!organisation) {
      const logoPath = this.getLogoPath();
      if (logoPath && fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo_velosi.png',
          path: logoPath,
          cid: 'logo_velosi'
        });
      }
    }
    
    // 5. Envoyer l'email
    const mailOptions = {
      from: {
        name: `${fromName} - Confirmation`,
        address: fromEmail
      },
      to: email,
      subject: `✅ Mot de passe réinitialisé - ${orgName}`,
      html: htmlTemplate,
      text: `Votre mot de passe ${orgName} a été réinitialisé avec succès.`,
      attachments: attachments
    };

    const result = await transporter.sendMail(mailOptions);
    this.logger.log(`✅ Email confirmation réinitialisation envoyé à ${email} (Org: ${organisation?.nom || 'Global'}) - ID: ${result.messageId}`);
    return true;
  } catch (error) {
    this.logger.error(`❌ Erreur envoi email confirmation à ${email}:`, error);
    return false;
  }
}

/**
 * 🏢 MULTI-TENANT: Template email de confirmation
 */
private async getSuccessEmailTemplate(
  userName?: string,
  organisation?: Organisation | null,
  footer?: string,
  logoBase64?: string
): Promise<string> {
  const displayName = userName || 'Utilisateur';
  const orgName = organisation?.nom_affichage || organisation?.nom || 'Shipnology ERP';
  const logoCid = organisation?.logo_url ? 'logo_organisation' : 'logo_velosi';
  const finalFooter = footer || await this.getEmailFooter(organisation?.id);
  
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Confirmation - ${orgName}</title>
        <!-- Styles CSS... -->
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="cid:${logoCid}" alt="Logo ${orgName}" width="200" height="auto" />
                <h1>✅ Réinitialisation Réussie</h1>
            </div>
            
            <div class="content">
                <p>Bonjour <strong>${displayName}</strong>,</p>
                <p>Votre mot de passe <strong>${orgName}</strong> a été réinitialisé avec succès.</p>
                <!-- Contenu... -->
            </div>
            
            ${finalFooter}
        </div>
    </body>
    </html>
  `;
}
```

## 📝 Checklist de Migration

Pour chaque méthode à migrer :

- [ ] Ajouter `organisationId?: number` en dernier paramètre
- [ ] Obtenir le transporter avec `getTransporterForOrganisation(organisationId)`
- [ ] Charger l'organisation avec `getOrganisation(organisationId)`
- [ ] Obtenir le logo avec `getOrganisationLogoBase64(organisationId)`
- [ ] Obtenir le footer avec `getEmailFooter(organisationId)`
- [ ] Passer ces paramètres au template
- [ ] Modifier le template pour accepter `organisation`, `footer`, `logoBase64`
- [ ] Rendre le template `async` et retourner `Promise<string>`
- [ ] Remplacer les références statiques par des variables dynamiques
- [ ] Configurer l'expéditeur basé sur l'organisation
- [ ] Gérer les pièces jointes du logo
- [ ] Logger avec indication de l'organisation
- [ ] Tester l'envoi avec et sans `organisationId`

## 🧪 Tests

Pour tester le multi-tenant :

### Test 1 : Email avec organisation
```typescript
await emailService.sendOtpEmail(
  'user@example.com',
  '123456',
  'John Doe',
  1  // Organisation ID
);
```

### Test 2 : Email sans organisation (fallback global)
```typescript
await emailService.sendOtpEmail(
  'user@example.com',
  '123456',
  'John Doe'
  // Pas d'organisationId = utilise config .env
);
```

## ⚠️ Points d'Attention

1. **Backward Compatibility** : Toutes les méthodes restent compatibles avec l'ancien code car `organisationId` est optionnel
2. **Fallback Automatique** : Si une organisation n'a pas de config SMTP, le système utilise automatiquement la config globale (.env)
3. **Performance** : Les transporters sont mis en cache pour éviter de recréer les connexions SMTP
4. **Logs** : Tous les logs indiquent maintenant quelle organisation a envoyé l'email
5. **Sécurité** : Les mots de passe SMTP devraient être chiffrés en production (TODO dans `decryptPassword`)

## 🎯 Prochaines Étapes

1. ✅ Infrastructure de base implémentée
2. ✅ Méthodes critiques adaptées (OTP, Credentials)
3. ⏳ Adapter les méthodes restantes (suivre ce guide)
4. ⏳ Tester toutes les fonctionnalités multi-tenant
5. ⏳ Mettre à jour tous les appels aux méthodes dans les controllers/services
6. ⏳ Ajouter le chiffrement des mots de passe SMTP
7. ⏳ Documenter l'API pour les développeurs

## 📚 Ressources

- **Table Organisation** : `c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\src\entities\organisation.entity.ts`
- **Service Email** : `c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\src\services\email.service.ts`
- **Exemple Multi-Tenant** : `c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\src\services\multi-tenant-email.service.ts`
- **Config Database** : `c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\src\common\database-connection.service.ts`

---

**Date de création** : 26 Décembre 2025  
**Auteur** : GitHub Copilot + MSP  
**Version** : 1.0
