# 🔐 Intégration du Journal de Connexion dans AuthService

## ⚠️ INSTRUCTIONS IMPORTANTES

Le fichier `auth.service.ts` est trop volumineux pour être modifié automatiquement.
Vous devez **ajouter manuellement** les appels au service LoginHistory aux endroits appropriés.

---

## 📝 Modifications à effectuer dans `auth.service.ts`

### 1️⃣ Dans la méthode `login()` - Ligne ~180

**APRÈS** la validation réussie de l'utilisateur, **AJOUTER** :

```typescript
async login(dto: LoginDto, req?: any): Promise<AuthResult> {
  const user = await this.validateUser(dto.usernameOrEmail, dto.password);
  
  // ... code existant pour les tokens ...

  // 🔥 AJOUTER ICI - Enregistrer la connexion dans l'historique
  if (this.loginHistoryService && req) {
    try {
      const userType = user.userType === 'personnel' ? UserType.PERSONNEL : UserType.CLIENT;
      const username = user.userType === 'personnel' ? user.nom_utilisateur : user.nom;
      const fullName = user.userType === 'personnel' ? `${user.prenom} ${user.nom}` : user.nom;
      
      await this.loginHistoryService.createLoginFromRequest(
        req,
        user.id,
        userType,
        username,
        fullName,
        LoginMethod.PASSWORD,
        LoginStatus.SUCCESS
      );
      
      this.logger.log(`✅ Connexion enregistrée dans l'historique pour ${username}`);
    } catch (error) {
      this.logger.warn(`⚠️ Erreur lors de l'enregistrement de la connexion dans l'historique:`, error);
      // Ne pas bloquer la connexion si l'historique échoue
    }
  }

  // ... retour des tokens ...
}
```

---

### 2️⃣ Dans la méthode `validateUser()` - Ligne ~90

**EN CAS D'ÉCHEC** de la validation, **AJOUTER** :

```typescript
async validateUser(username: string, password: string, req?: any): Promise<any> {
  // ... code de validation existant ...

  // 🔥 SI AUCUN UTILISATEUR TROUVÉ - AJOUTER AVANT LE throw final
  
  // Enregistrer la tentative échouée
  if (this.loginHistoryService && req) {
    try {
      // Chercher l'ID de l'utilisateur s'il existe
      const failedUser = await this.personnelRepository
        .createQueryBuilder('personnel')
        .where('LOWER(personnel.nom_utilisateur) = LOWER(:username)', { username })
        .orWhere('LOWER(personnel.email) = LOWER(:username)', { username })
        .getOne();

      if (failedUser) {
        await this.loginHistoryService.createLoginFromRequest(
          req,
          failedUser.id,
          UserType.PERSONNEL,
          failedUser.nom_utilisateur,
          failedUser.fullName,
          LoginMethod.PASSWORD,
          LoginStatus.FAILED,
          'Mot de passe incorrect'
        );
      }
    } catch (error) {
      this.logger.warn(`⚠️ Erreur lors de l'enregistrement de l'échec:`, error);
    }
  }

  throw new UnauthorizedException('Nom d\'utilisateur ou mot de passe incorrect');
}
```

---

### 3️⃣ Dans le `AuthController` - Modifier l'endpoint `/login`

**Fichier: `auth.controller.ts`**

Ajouter le paramètre `@Req()` pour passer la requête HTTP au service :

```typescript
import { Controller, Post, Body, UseGuards, Request, Req } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

@Controller('auth')
export class AuthController {
  
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: ExpressRequest) {
    return this.authService.login(loginDto, req);
  }
}
```

---

### 4️⃣ Pour l'authentification biométrique

**Fichier: `biometric.service.ts` ou `biometric.controller.ts`**

Ajouter l'enregistrement lors de la connexion biométrique :

```typescript
// Dans la méthode verifyAuthentication ou authenticate
if (this.loginHistoryService && req) {
  await this.loginHistoryService.createLoginFromRequest(
    req,
    userId,
    userType,
    username,
    fullName,
    LoginMethod.BIOMETRIC,  // ⚠️ Important: BIOMETRIC au lieu de PASSWORD
    LoginStatus.SUCCESS
  );
}
```

---

### 5️⃣ Pour l'authentification OTP (optionnel)

```typescript
// Lors de la validation OTP réussie
if (this.loginHistoryService && req) {
  await this.loginHistoryService.createLoginFromRequest(
    req,
    userId,
    userType,
    username,
    fullName,
    LoginMethod.OTP,  // ⚠️ Important: OTP
    LoginStatus.SUCCESS
  );
}
```

---

## 🚀 Après l'implémentation

### Tester l'enregistrement :

1. **Exécuter la migration SQL** :
   ```bash
   psql -U msp -d velosi -f migrations/create_login_history.sql
   ```

2. **Redémarrer le backend** :
   ```bash
   npm run start:dev
   ```

3. **Se connecter** et vérifier les logs :
   ```
   ✅ Connexion enregistrée dans l'historique pour admin
   ```

4. **Tester l'API** :
   ```bash
   curl http://localhost:3000/login-history/personnel/1
   ```

---

## 📊 Endpoints disponibles

Une fois implémenté, vous aurez accès à :

- `GET /login-history/personnel/:id` - Historique d'un personnel
- `GET /login-history/client/:id` - Historique d'un client
- `GET /login-history/personnel/:id/last` - Dernière connexion
- `GET /login-history/personnel/:id/statistics` - Statistiques
- `GET /login-history/personnel/:id/active-sessions` - Sessions actives

---

## ⚠️ Points d'attention

1. **Le service est @Optional()** - Si non disponible, l'app continue de fonctionner
2. **Les erreurs d'historique ne bloquent jamais la connexion**
3. **Les informations d'appareil sont extraites du User-Agent**
4. **L'IP est extraite des headers `x-forwarded-for` ou `x-real-ip`**

---

## 🎯 Checklist d'implémentation

- [ ] Imports ajoutés dans `auth.service.ts`
- [ ] LoginHistoryService injecté dans le constructeur
- [ ] Appel ajouté dans `login()` (connexion réussie)
- [ ] Appel ajouté dans `validateUser()` (échec)
- [ ] Paramètre `@Req()` ajouté dans `auth.controller.ts`
- [ ] Migration SQL exécutée
- [ ] Backend redémarré
- [ ] Tests de connexion effectués
- [ ] API testée avec Postman/curl
