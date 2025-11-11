# 🔧 Correction Erreurs 401 Dashboard

## 🎯 Problème Identifié

Certaines requêtes du dashboard reçoivent une erreur 401 "Aucun token d'authentification fourni" alors que l'utilisateur est connecté.

### Symptômes

```bash
❌ [JWT Auth Guard] Échec d'authentification: {
  url: '/api/dashboard/sales-evolution',
  method: 'GET',
  errorType: 'NO_TOKEN',
  error: "Aucun token d'authentification fourni"
}
```

ET aussi :

```bash
WebSocket connection to 'ws://localhost:4200/?token=...' failed
```

---

## 🔍 Analyse

### ✅ Ce qui Fonctionne

- Le login fonctionne correctement
- Le token JWT est bien stocké dans `localStorage.setItem('access_token', ...)`
- L'intercepteur `AuthInterceptor` est bien enregistré
- Certaines requêtes passent (exemple: `getRecentActivities`)

### ❌ Ce qui Ne Fonctionne Pas

- **Requêtes sans token** : `sales-evolution`, `stats`, `transport-distribution`, etc.
- **WebSocket** : Connexion échoue au démarrage
- **Timing** : Requêtes envoyées avant que le token soit disponible

---

## 🛠️ Solution 1 : Vérifier l'Ordre des Intercepteurs

### Problème

L'intercepteur `AuthInterceptor` est enregistré mais peut ne pas s'exécuter pour toutes les requêtes.

### Fix

**Fichier** : `velosi-front/src/app/app.config.ts`

Assurez-vous que `AuthInterceptor` est le **PREMIER** intercepteur :

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(), // ⚠️ Important : pas de withInterceptors ici
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      deps: [AuthKeycloakService],
      multi: true
    },
    // ✅ INTERCEPTEUR PRINCIPAL - PRIORITÉ 1
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    importProvidersFrom([]),
  ]
};
```

---

## 🛠️ Solution 2 : Corriger le Dashboard Component

### Problème

Le dashboard essaie de charger les données **immédiatement** au `ngOnInit`, avant que le token soit prêt.

### Fix

**Fichier** : `velosi-front/src/app/components/dashboard/dashboard.component.ts`

Ajoutez un délai et vérifiez le token avant de charger :

```typescript
ngOnInit(): void {
  this.subscriptions.add(
    this.authService.userProfile$.subscribe(user => {
      this.currentUser = user;
      
      if (user) {
        // ✅ ATTENDEZ que le profil soit chargé AVANT de charger les données
        this.detectUserRole();
        
        // ⏱️ Attendez 300ms pour s'assurer que le token est prêt
        setTimeout(() => {
          this.loadDashboardData();
        }, 300);
      }
    })
  );
}

private loadDashboardData(): void {
  // Vérifier que le token est présent
  const token = localStorage.getItem('access_token');
  if (!token) {
    console.error('❌ Token non disponible, attente...');
    // Réessayer après 500ms
    setTimeout(() => this.loadDashboardData(), 500);
    return;
  }

  console.log('✅ Token disponible, chargement des données dashboard');
  
  // Charger les données selon le rôle
  if (this.isAdministratif) {
    this.loadAdminDashboard();
  } else if (this.isCommercial) {
    this.loadCommercialDashboard();
  } else if (this.isClient) {
    this.loadClientDashboard();
  }
}
```

---

## 🛠️ Solution 3 : Désactiver Temporairement le WebSocket

### Problème

Le WebSocket essaie de se connecter **immédiatement** au chargement de la page, avant le login.

### Fix Option A : Désactiver Complètement

**Fichier** : `velosi-front/src/app/components/dashboard/dashboard.component.ts`

Commentez l'initialisation du WebSocket :

```typescript
ngOnInit(): void {
  // ❌ DÉSACTIVER TEMPORAIREMENT
  // this.setupWebSocket();
  
  // ✅ Activer seulement après authentification
  this.subscriptions.add(
    this.authService.userProfile$.subscribe(user => {
      this.currentUser = user;
      
      if (user) {
        // Activer WebSocket seulement après login réussi
        setTimeout(() => {
          this.setupWebSocket();
        }, 1000);
      }
    })
  );
}
```

### Fix Option B : Vérifier le Token Avant Connexion

```typescript
private setupWebSocket(): void {
  // ✅ Vérifier le token avant de se connecter
  const token = localStorage.getItem('access_token');
  if (!token) {
    console.warn('⚠️ WebSocket: Token non disponible, connexion différée');
    return;
  }

  try {
    const socketToken = Math.random().toString(36).substring(7);
    const wsUrl = `ws://localhost:4200/?token=${socketToken}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('✅ WebSocket connecté');
      this.wsConnected = true;
    };
    
    this.ws.onerror = (error) => {
      console.warn('⚠️ WebSocket erreur (non bloquant):', error);
      this.wsConnected = false;
    };
    
    this.ws.onclose = () => {
      console.log('🔌 WebSocket déconnecté');
      this.wsConnected = false;
    };
  } catch (error) {
    console.warn('⚠️ Erreur WebSocket (non bloquant):', error);
    this.wsConnected = false;
  }
}
```

---

## 🛠️ Solution 4 : Vérifier le Backend JWT Strategy

### Problème

Le backend attend le token dans **l'header Authorization** mais ne le trouve pas.

### Vérification

**Fichier** : `velosi-back/src/auth/jwt.strategy.ts`

Assurez-vous que la stratégie accepte **plusieurs sources** :

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. PRIORITÉ : Header Authorization
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        
        // 2. FALLBACK : Cookies
        (request: Request) => {
          const token = request?.cookies?.['access_token'] || 
                       request?.cookies?.['jwt'] ||
                       request?.cookies?.['token'];
          
          if (token) {
            console.log('JWT Strategy - Token extrait des cookies');
          }
          return token;
        }
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
      // Ajoutez passReqToCallback si besoin d'accéder à la requête
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    console.log('✅ JWT valide, payload:', {
      sub: payload.sub,
      username: payload.username,
      role: payload.role
    });

    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      userType: payload.userType
    };
  }
}
```

---

## 🛠️ Solution 5 : Test Rapide

### Test 1 : Vérifier le Token dans la Console

Ouvrez la console du navigateur et tapez :

```javascript
// 1. Vérifier le token
console.log('Token:', localStorage.getItem('access_token'));

// 2. Tester une requête manuelle
fetch('http://localhost:3000/api/dashboard/stats', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})
.then(response => response.json())
.then(data => console.log('✅ Réponse:', data))
.catch(error => console.error('❌ Erreur:', error));
```

### Test 2 : Vérifier l'Intercepteur

```javascript
// Dans la console
console.log('Intercepteurs enregistrés:',
  window['ng']?.getInjector()?.get('HTTP_INTERCEPTORS')
);
```

---

## 📊 Vérification Finale

### Checklist

Après avoir appliqué les corrections :

- [ ] Le token est stocké dans `localStorage.getItem('access_token')`
- [ ] L'intercepteur `AuthInterceptor` est le premier dans `app.config.ts`
- [ ] Le dashboard attend le profil utilisateur avant de charger
- [ ] Le WebSocket se connecte **après** le login
- [ ] Les requêtes incluent le header `Authorization: Bearer <token>`
- [ ] Le backend accepte le token via `fromAuthHeaderAsBearerToken()`
- [ ] Aucune erreur 401 dans la console

### Commandes de Test

```powershell
# 1. Redémarrer le frontend
cd velosi-front
ng serve

# 2. Redémarrer le backend
cd velosi-back
npm run start:dev

# 3. Ouvrir la console browser (F12)
# 4. Se connecter à l'application
# 5. Vérifier qu'il n'y a plus d'erreurs 401
```

---

## 🔍 Debug Avancé

Si le problème persiste, activez les logs :

### Frontend

**Fichier** : `velosi-front/src/app/interceptors/auth.interceptor.ts`

Ajoutez temporairement des logs :

```typescript
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  console.log('🔍 [Interceptor] Requête:', req.url);
  
  const token = this.getTokenFromAllSources();
  console.log('🔑 [Interceptor] Token trouvé:', !!token);
  
  if (token) {
    console.log('✅ [Interceptor] Ajout du token à la requête');
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    return next.handle(authReq);
  }
  
  console.warn('⚠️ [Interceptor] Pas de token pour:', req.url);
  return next.handle(req);
}
```

### Backend

Les logs sont déjà activés dans `jwt-auth.guard.ts`.

---

## ✅ Solution Complète Recommandée

### 1. Modifier `app.config.ts`

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      deps: [AuthKeycloakService],
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
};
```

### 2. Modifier `dashboard.component.ts`

Ajoutez la méthode `loadDashboardData()` avec vérification du token.

### 3. Désactiver WebSocket Temporairement

Commentez `setupWebSocket()` dans `ngOnInit()`.

### 4. Tester

- Reconnectez-vous
- Ouvrez le dashboard
- Vérifiez qu'il n'y a plus d'erreurs 401

---

## 📞 Support

Si le problème persiste après ces corrections :

1. Vérifiez les logs de la console browser (F12)
2. Vérifiez les logs du backend NestJS
3. Testez avec curl pour isoler le problème :

```powershell
# Récupérez le token depuis la console :
$token = "VOTRE_TOKEN_ICI"

# Testez une requête :
curl.exe -X GET "http://localhost:3000/api/dashboard/stats" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json"
```

---

**Bon debug ! 🚀**
