<p align="center">
  <img src="apps/web/public/icon-512.png" alt="Logo Madrasti" width="96" />
</p>

<h1 align="center">Madrasti — مدرستي</h1>

<p align="center">
  <strong>La vie scolaire, simplement.</strong><br />
  Plateforme de gestion scolaire 360° qui réunit la direction, les enseignants, les parents et les élèves<br />
  autour d'un seul espace : vie scolaire, pédagogie, communication et finances — sur le web et sur mobile.
</p>

<p align="center">
  <img alt="Java 25" src="https://img.shields.io/badge/Java-25-1e3a8a" />
  <img alt="Spring Boot 4.1" src="https://img.shields.io/badge/Spring%20Boot-4.1-1e3a8a" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-1e3a8a" />
  <img alt="React Native / Expo 58" src="https://img.shields.io/badge/React%20Native-Expo%2058-1e3a8a" />
  <img alt="PostgreSQL 17" src="https://img.shields.io/badge/PostgreSQL-17-1e3a8a" />
  <img alt="FR · EN · AR" src="https://img.shields.io/badge/langues-FR%20%C2%B7%20EN%20%C2%B7%20AR-f5b700" />
</p>

<p align="center">
  <a href="#-vidéo-de-présentation">Vidéo</a> ·
  <a href="#-captures-décran">Captures</a> ·
  <a href="#-fonctionnalités">Fonctionnalités</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-démarrage">Démarrage</a>
</p>

---

## 🎯 Objectif

Dans beaucoup d'écoles, l'information est éclatée : notes dans un fichier, absences sur papier, paiements suivis à la
main, messages aux parents par téléphone ou WhatsApp. **Madrasti** (« mon école » en arabe) rassemble tout au même
endroit, avec un espace adapté à chaque profil :

| Profil | Ce que Madrasti lui apporte |
|---|---|
| **Direction & administration** | Pilotage en temps réel (moyennes, assiduité, encaissements), comptes, classes, emploi du temps, finances, conseil de classe, export MASSAR, journal d'audit |
| **Enseignants** | Appel et retards en un clic, notes et compétences, devoirs et quiz corrigés en ligne, classes en direct, rendez-vous avec les familles |
| **Parents** | Suivi de chaque enfant (notes, bulletin, absences, devoirs, comportement), justificatifs d'absence, paiement en ligne (CMI, Stripe), messagerie, notifications instantanées |
| **Élèves** | Devoirs à rendre, quiz, cours en ligne, emploi du temps, résultats |

Pensée pour le Maroc : **français, arabe (de droite à gauche) et anglais**, paiement **CMI**, code et export **MASSAR**,
SMS d'absence aux parents dans leur langue.

## 🎬 Vidéo de présentation

**[▶️ Regarder la présentation (MP4)](madrasti-presentation.mp4)** — le parcours complet de l'application,
narré en français : objectif, espaces direction, enseignant, parent et élève, application mobile, architecture.
Le fichier se trouve à la racine du dépôt et peut être projeté tel quel en réunion.

Captures et vidéo se régénèrent après une évolution de l'interface (stack de dev lancée, macOS pour la vidéo) :
`node docs/screenshots/capture.mjs` (écrans web) puis `docs/video/build.sh` (diapositives `docs/video/slides.json`,
narration voix française macOS, montage AVFoundation → `madrasti-presentation.mp4`).

## 📸 Captures d'écran

### Site public et connexion

| Accueil | Connexion | Accueil en arabe (RTL) |
|---|---|---|
| ![Accueil](docs/screenshots/01-accueil.png) | ![Connexion](docs/screenshots/02-connexion.png) | ![Accueil en arabe](docs/screenshots/03-accueil-arabe.png) |

### Espace parent

| Tableau de bord : un résumé par enfant | Bulletin trimestriel imprimable |
|---|---|
| ![Tableau de bord parent](docs/screenshots/10-parent-tableau-de-bord.png) | ![Bulletin](docs/screenshots/11-parent-bulletin.png) |
| **Emploi du temps** | **Interface en arabe, de droite à gauche** |
| ![Emploi du temps](docs/screenshots/12-parent-emploi-du-temps.png) | ![Espace parent en arabe](docs/screenshots/14-parent-arabe-rtl.png) |

### Espace enseignant

| Tableau de bord | Absences et retards |
|---|---|
| ![Tableau de bord enseignant](docs/screenshots/20-enseignant-tableau-de-bord.png) | ![Absences](docs/screenshots/21-enseignant-absences.png) |
| **Devoirs rendus et corrigés en ligne** | **Livret de compétences** |
| ![Devoirs](docs/screenshots/22-enseignant-devoirs.png) | ![Compétences](docs/screenshots/23-enseignant-competences.png) |

### Direction et administration

| Tableau de bord de la direction | Statistiques et élèves à accompagner |
|---|---|
| ![Tableau de bord direction](docs/screenshots/30-direction-tableau-de-bord.png) | ![Statistiques](docs/screenshots/31-direction-statistiques.png) |
| **Fiche élève** | **Conseil de classe** |
| ![Fiche élève](docs/screenshots/32-direction-fiche-eleve.png) | ![Conseil de classe](docs/screenshots/33-direction-conseil-de-classe.png) |
| **Finance et recouvrement** | **Journal d'audit** |
| ![Finance](docs/screenshots/40-admin-finance.png) | ![Journal d'audit](docs/screenshots/42-admin-audit.png) |

### Espace élève

| Tableau de bord | Quiz en ligne auto-corrigés |
|---|---|
| ![Tableau de bord élève](docs/screenshots/50-eleve-tableau-de-bord.png) | ![Quiz](docs/screenshots/51-eleve-quiz.png) |

### Application mobile (iOS et Android)

| Connexion | Accueil de l'enfant | Résultats | En arabe (RTL) |
|---|---|---|---|
| ![Connexion mobile](docs/screenshots/mobile-01-connexion.png) | ![Accueil mobile](docs/screenshots/mobile-02-accueil.png) | ![Résultats mobile](docs/screenshots/mobile-03-resultats.png) | ![Mobile en arabe](docs/screenshots/mobile-04-arabe.png) |

## 🏗️ Architecture

```mermaid
flowchart LR
    subgraph Clients
        W["🌐 Web<br/>React 19 · Vite<br/>TanStack Query/Router"]
        M["📱 Mobile<br/>React Native · Expo<br/>iOS & Android"]
    end
    S["📦 @madrasti/shared<br/>client API · types · requêtes<br/>traductions FR/EN/AR"]
    W --- S
    M --- S
    subgraph Serveur["Serveur (Docker)"]
        N["nginx<br/>CSP · HTTPS · /api"]
        B["API Spring Boot 4<br/>Java 25 · JWT · SSE<br/>2 instances"]
        P[("PostgreSQL 17<br/>Flyway")]
        R[("Redis<br/>notifications<br/>entre instances")]
        F[("Fichiers<br/>déposés")]
    end
    W -- "cookie HttpOnly" --> N --> B
    M -- "Bearer + jeton<br/>de rafraîchissement" --> B
    B --> P
    B --> R
    B --> F
    B -. paiement .-> CMI["CMI / Stripe"]
    B -. SMS .-> T["Twilio"]
    B -. traduction .-> A["API Claude"]
    B -. visio .-> J["Jitsi"]
```

- **Un seul backend** pour le web et le mobile : API REST documentée (OpenAPI), erreurs normalisées (RFC 9457),
  notifications temps réel par Server-Sent Events, relayées par Redis quand plusieurs instances tournent.
- **Monorepo** npm + Turborepo : le web et le mobile partagent le même client API, les mêmes types, les mêmes requêtes
  TanStack Query et les mêmes dictionnaires de traduction (`packages/shared`). Seule l'authentification diffère :
  cookie HttpOnly sur le web, jeton d'accès court + jeton de rafraîchissement rotatif dans le trousseau du téléphone.
- **Backend organisé par fonctionnalité** (`auth`, `student`, `grade`, `finance`, `messaging`…) plutôt que par couche.

### Parcours d'un paiement en ligne (exemple)

```mermaid
sequenceDiagram
    actor Parent
    participant App as Web / Mobile
    participant API as API Madrasti
    participant CMI as CMI (banque)
    Parent->>App: « Payer en ligne » sur une échéance
    App->>API: POST /api/payments/{id}/checkout
    API-->>App: formulaire signé (SHA-512)
    App->>CMI: redirection vers la page de paiement sécurisée
    CMI->>API: notification serveur (signature vérifiée)
    API->>API: échéance marquée payée, audit, notification
    CMI-->>App: retour sur Madrasti
    App->>API: confirmation (vérifiée auprès du prestataire)
    API-->>Parent: reçu + notification instantanée
```

Aucune donnée de carte ne transite par Madrasti ; la confirmation est vérifiée côté serveur et protégée contre les
doubles validations.

### Organisation du code

```
madrasti/
├── docker-compose.yml            PostgreSQL
├── backend/                      Spring Boot — package par fonctionnalité
│   └── src/main/java/ma/madrasti/
│       ├── auth/                 login, JWT, utilisateur courant
│       ├── user/                 comptes + API admin
│       ├── school/ student/ attendance/ grade/ announcement/ finance/ dashboard/
│       ├── homework/             devoirs, copies, corrections
│       ├── live/                 classes en direct (Jitsi / lien externe)
│       ├── timetable/ calendar/  emploi du temps, agenda
│       ├── messaging/ complaint/ messagerie interne, réclamations
│       ├── quiz/ report/         QCM auto-corrigés, bulletins
│       ├── services/ library/    transport-cantine-activités, bibliothèque
│       ├── admission/            pré-inscriptions (API publique /api/public/**)
│       ├── notification/         notifications + flux SSE temps réel
│       ├── sms/                  passerelles SMS (Twilio / journal), alertes, envois groupés
│       ├── expense/              dépenses, rapport financier
│       ├── storage/ gallery/ course/  fichiers, galerie photo, cours en ligne
│       ├── council/ export/ stats/    conseil de classe, export MASSAR, statistiques
│       ├── translation/          traduction des contenus (SDK Java Anthropic)
│       ├── common/               BaseEntity auditée, ProblemDetail (RFC 9457), pagination
│       └── config/               sécurité, OpenAPI, données de démo
├── packages/shared/              @madrasti/shared — services communs au web et au mobile
│   └── src/
│       ├── http.ts               client API configurable (cookie sur le web, Bearer sur mobile)
│       ├── i18n.ts, i18n/locales dictionnaires FR/EN/AR uniques pour tout le monorepo
│       ├── features/<domaine>/   api.ts · queries.ts (clés + hooks TanStack Query)
│       └── types.ts, format.ts
├── apps/web/                     Vite + React — architecture par feature
│   └── src/
│       ├── app/                  providers, QueryClient, routeur typé (gardes par rôle)
│       ├── components/ui/        composants shadcn/ui
│       ├── components/shared/    composants métier réutilisables
│       ├── components/layout/    shell applicatif, navigation par rôle
│       ├── features/<domaine>/   pages et composants (services importés de @madrasti/shared)
│       └── lib/                  adaptateur du client API, fichiers, helpers formulaires
└── apps/mobile/                  React Native + Expo
    └── src/
        ├── app/                  écrans Expo Router : (app)/(tabs)/… et écrans de détail
        ├── components/           composants d'interface (thème clair/sombre, sens RTL)
        └── lib/                  configuration API, session (SecureStore), i18n, choix de l'enfant
```

Principes : DTO en `record`, règles d'accès centralisées (`@PreAuthorize`, `StudentAccess` pour le lien parent/enfant),
erreurs normalisées en ProblemDetail et remontées champ par champ dans les formulaires, statut de paiement dérivé
(jamais désynchronisé), migrations Flyway, chargements N+1 évités via `@EntityGraph`.

## 🧰 Stack

| Couche    | Technologies |
|-----------|--------------|
| Backend   | Java 25, Spring Boot 4.1 (Web MVC, Data JPA, Security, OAuth2 Resource Server/JWT, Validation, Actuator), Flyway, PostgreSQL 17, springdoc OpenAPI, threads virtuels |
| Web       | Vite 8, React 19, TypeScript 7, Tailwind CSS v4, shadcn/ui (Base UI), TanStack Query v5, TanStack Router, React Hook Form + Zod 4, Sonner |
| Mobile    | React Native 0.88 + **Expo SDK 58** (Expo Router, SecureStore, Localization, DocumentPicker, WebBrowser), TanStack Query v5 |
| Partagé   | `@madrasti/shared` : client API, types, requêtes TanStack Query, traductions FR/EN/AR, formatage — utilisé par le web **et** le mobile |
| Monorepo  | npm workspaces + Turborepo (`apps/web`, `apps/mobile`, `packages/shared`) |
| Tests     | JUnit 5, MockMvc, AssertJ (H2 en mode PostgreSQL) · Vitest, Testing Library · Playwright |

## 🚀 Démarrage

Prérequis : Docker, JDK 25, Maven, Node 22+.

```bash
npm install                               # toutes les dépendances du monorepo (web, mobile, shared)
docker compose up -d --wait               # PostgreSQL
mvn -f backend/pom.xml spring-boot:run    # API sur http://localhost:8080
npm run web                               # Web sur http://localhost:5173
npm run mobile                            # Application mobile (Expo) : simulateur iOS, émulateur Android ou Expo Go
```

Raccourcis depuis la racine : `npm run db`, `npm run backend`, `npm test` (backend + tous les paquets via Turborepo),
`npm run typecheck`, `npm run lint`.

### Application mobile (parents et élèves)

`apps/mobile` — React Native + Expo SDK 58, Expo Router (onglets Accueil, Résultats, Devoirs, Messagerie, Plus).
Tableau de bord de l'enfant (plusieurs enfants : choix en haut d'écran), notes, bulletin, livret de compétences,
devoirs (rendu en ligne par l'élève), absences et justificatif avec pièce jointe, emploi du temps, comportement,
paiements en ligne, cantine, rendez-vous parents-professeurs, sondages, notifications, messagerie ; FR/EN/AR
(mise en page de droite à gauche en arabe). Le personnel utilise l'espace web.

- Mêmes services que le web (`@madrasti/shared`) ; seule l'authentification change : au lieu du cookie, un jeton
  d'accès de 15 min et un **jeton de rafraîchissement** de 30 jours, conservés dans le trousseau du téléphone (SecureStore).
  Le jeton de rafraîchissement est à usage unique (rotation), stocké haché côté serveur, révoqué à la déconnexion,
  à la réinitialisation du mot de passe ou à la désactivation du compte ; réutiliser un ancien jeton révoque toute la
  session et est tracé dans le journal d'audit. Le renouvellement est transparent (une seule tentative partagée par
  les requêtes simultanées).
- Paiement en ligne depuis le mobile : Stripe ou **CMI** dans le navigateur sécurisé du téléphone (pour le CMI, une page
  du serveur poste le formulaire signé, valable 30 min), retour sur une page « revenez dans l'application », puis
  confirmation vérifiée auprès du prestataire.
- API : `EXPO_PUBLIC_API_URL` (par défaut `http://localhost:8080/api`, `10.0.2.2` sur l'émulateur Android).
- Build natif de développement (nécessaire pour vérifier la mise en page RTL, qu'Expo Go n'applique pas) :
  `cd apps/mobile && npx expo run:ios` (ou `run:android`). Les dossiers `ios/` et `android/` sont générés et ignorés par git.
- Correctif local `patches/expo-modules-jsi+58.0.21.patch` (appliqué par `patch-package` au `postinstall`) :
  expo-modules-jsi 58.0.21 ne compile pas avec Swift 6.2.4 / Xcode 26.3 (erreur de concurrence stricte
  « sending 'slot' risks causing data races »). À supprimer dès qu'une version corrigée d'Expo est publiée.
- Builds et publication sur les stores : EAS avec un compte Expo (`apps/mobile/eas.json`, profils `preview` pour une
  distribution interne et `production` pour les stores, numéros de build incrémentés par EAS). Avant le premier build,
  définir l'adresse de l'API de chaque environnement :
  `npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL --value https://<domaine>/api`,
  puis `npx eas-cli build --profile production` et `npx eas-cli submit`. Les comptes Apple Developer et Google Play
  Console restent nécessaires. `ios.config.usesNonExemptEncryption: false` déclare que l'app n'utilise que le
  chiffrement standard (HTTPS), ce qui évite la question de conformité à l'export à chaque envoi.

- API docs : http://localhost:8080/swagger-ui.html
- Santé : http://localhost:8080/actuator/health

### Comptes de démonstration (profil `dev`)

Mot de passe commun : `Madrasti2026!`

| Rôle        | Email |
|-------------|-------|
| Admin       | admin@madrasti.ma |
| Direction   | direction@madrasti.ma |
| Enseignant  | prof.math@madrasti.ma |
| Parent      | parent.adari@madrasti.ma |
| Élève       | adam.adari@eleve.madrasti.ma (tous les élèves : prenom.nom@eleve.madrasti.ma) |

## ✨ Fonctionnalités

| Domaine | Fonctionnalités | Rôles |
|---------|-----------------|-------|
| **Administration** | Comptes (création, rôles, activation, mot de passe), écoles multi-établissements, classes, pré-inscriptions reçues en ligne | Admin, Direction |
| **Vie scolaire** | Élèves et fiches, emploi du temps hebdomadaire (anti-chevauchement classe/enseignant), agenda (événements, contrôles, réunions, fériés), absences & retards, **bulletins trimestriels imprimables** (moyennes, moyenne de classe, rang, mention, assiduité) | Tous selon droits |
| **Pédagogie** | Notes, devoirs rendus et corrigés en ligne, **quiz QCM auto-corrigés**, classes en direct (Jitsi intégré ou Zoom/Meet/Teams) | Enseignants, Élèves, Parents (suivi) |
| **Communication** | Annonces ciblées, **messagerie interne** (non lus, sondage 20 s), **réclamations** avec réponse de la direction | Tous |
| **Cantine** | Menus de la semaine (entrée, plat, accompagnement, dessert, **option végétarienne**, allergènes), navigation semaine par semaine, saisie par la direction | Tous (lecture), Direction |
| **Rentrée** | **Import CSV des élèves** (séparateur `;` ou `,`, UTF-8 avec ou sans BOM, modèle téléchargeable) : vérification à blanc, puis import tout-ou-rien avec rapport ligne par ligne ; comptes parents créés ou rattachés via `email_parent` | Admin, Direction |
| **Services** | **Transport, cantine/garde, activités** (inscription par les parents, places limitées, échéance générée automatiquement), **bibliothèque** (catalogue, disponibilités, prêts, retards) | Parents, Élèves, Direction |
| **Finance** | Échéances, encaissements, recouvrement, **exports CSV** (paiements, élèves) | Admin, Direction |
| **Paiement en ligne** | Bouton « Payer en ligne » pour les parents : **CMI** (3D Pay Hosting, cartes marocaines : formulaire signé SHA-512, callback serveur vérifié), **Stripe Checkout** ou prestataire **simulé** pour la démo — aucune donnée de carte ne transite par Madrasti ; confirmation vérifiée côté serveur auprès du prestataire, protégée contre les doubles validations | Parents |
| **Livret de compétences** | Référentiel par matière et par niveau, échelle à 4 niveaux (non acquis → dépassé), grille de saisie en un clic par classe et trimestre, volet « Compétences » imprimé sur le bulletin | Enseignants, Direction, Familles |
| **Journal d'audit** | Connexions (réussies et refusées), création/modification/suppression de comptes, réinitialisations de mot de passe, encaissements, paiements en ligne, imports et suppressions d'élèves ; filtre par action et recherche, avec adresse IP | Admin |
| **Espaces** | Tableau de bord direction (KPIs), espace famille, espace élève, page publique + **pré-inscription en ligne**, **mode sombre** | — |
| **Temps réel** | Notifications instantanées (Server-Sent Events) : messages, devoirs, notes, absences, annonces, cours en direct, quiz, supports, photos ; cloche avec non-lus, texte affiché dans la langue de chacun | Tous |
| **SMS** | Alerte automatique d'absence aux parents (dans leur langue), envois groupés (classe, parents, enseignants), historique ; Twilio en production, journal en développement | Admin, Direction |
| **Finance avancée** | Dépenses suivies du bon de commande au paiement, rapport annuel recettes/dépenses/solde par mois et par catégorie, export CSV | Admin, Direction |
| **Médias** | Galerie photo (albums école ou classe), cours en ligne (documents, vidéos, liens) ; fichiers stockés hors base, servis de façon authentifiée | Tous |
| **Conseil de classe & MASSAR** | Décisions et appréciations par élève (reprises sur le bulletin), code Massar, export CSV des moyennes au format colonnes MASSAR | Direction, Enseignants |
| **Pilotage** | Statistiques (moyennes par matière, répartition, absences, encaissements) et élèves à accompagner (remédiation ciblée) | Direction, Enseignants |
| **Relation école-familles** | **Rendez-vous parents-professeurs** (l'enseignant ouvre une série de créneaux sur place / visio / téléphone, le parent réserve pour son enfant, réservation atomique, annulation notifiée), **sondages** ciblés (résultats masqués avant de répondre), **justificatif d'absence** déposé par le parent (motif + PDF/photo) et validé par l'école | Parents, Enseignants, Direction |
| **Comportement** | Points positifs (participation, entraide…) et incidents avec sanction (avertissement, retenue, exclusion), tableau de classe en un clic, solde par élève, historique visible par la famille | Enseignants, Direction, Familles |
| **Documents** | **Attestation de scolarité PDF** (OpenPDF) téléchargeable par la famille depuis la fiche élève | Familles, Direction |
| **Mobile** | Application installable (PWA : manifeste, icônes, service worker) | Tous |
| **Langues** | Interface et messages d'API en **français, anglais et arabe** (mise en page de droite à gauche, polices arabes, dates et montants localisés) | Tous |
| **Traduction des contenus** | Bouton « Traduire » sur les annonces et les messages (API Claude, `claude-opus-5-5`, effort bas, repli automatique en cas de refus), cache et quota par utilisateur ; masqué sans clé API | Tous |
| Feuille de route | Import direct dans MASSAR (API du ministère non publique), publication sur l'App Store / Google Play (comptes développeur) | — |

### Visioconférence

Par défaut les salles sont créées sur `meet.jit.si` (gratuit, sans clé). Ce serveur public limite les appels
**intégrés** à 5 minutes et demande à l'animateur de se connecter : en production, pointez
`MADRASTI_JITSI_URL` vers un Jitsi auto-hébergé ou JaaS (8x8). Les enseignants peuvent aussi coller un lien Zoom,
Google Meet ou Teams (ouvert dans un nouvel onglet).

## Sécurité

- Session dans un **cookie HttpOnly, SameSite=Strict, Secure en production** (jamais lisible par le JavaScript) ;
  l'en-tête `Authorization: Bearer` reste accepté pour les clients API.
- Défense CSRF en profondeur : toute requête modifiante portée par le cookie exige l'en-tête `X-Madrasti-Client`.
- Un cookie de session invalide (expiré, secret JWT changé) n'empêche jamais de se reconnecter ni de se déconnecter.
- Application mobile : jetons de rafraîchissement rotatifs avec détection de réutilisation (voir « Application mobile »).
- Limitation de débit par IP : connexion (10/min, `MADRASTI_LOGIN_PER_MINUTE`) et formulaire public (5/min) → `429` traduit ;
  les notifications signées du prestataire de paiement en sont exemptées.
- nginx : CSP stricte (aucun script inline ; formulaires vers soi et la passerelle CMI uniquement), `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` (caméra/micro limités à Jitsi), appliqués à toutes les réponses (pages, fichiers, API).
- Journal d'audit des connexions et actions sensibles (administrateur).
- Fichiers servis uniquement aux utilisateurs connectés, sous identifiant aléatoire, types autorisés filtrés.

## Production

```bash
cp .env.example .env    # puis renseigner les secrets
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

- `backend` : image multi-étapes (couches Spring Boot, utilisateur non root, healthcheck), **2 instances** par défaut ;
  les notifications temps réel passent par **Redis** entre instances (`MADRASTI_NOTIFICATIONS_RELAY=redis`).
- `frontend` : nginx sert l'application, relaie `/api` (flux SSE sans tampon) et applique les en-têtes de sécurité.
- `postgres`, `redis`, volumes `pgdata` (base) et `uploads` (fichiers). Placez une terminaison HTTPS devant le port exposé.

Paiement en ligne réel (`MADRASTI_PUBLIC_URL` = adresse publique du site, utilisée pour les retours) :
- **CMI** : `MADRASTI_PAYMENTS_PROVIDER=cmi`, `CMI_CLIENT_ID`, `CMI_STORE_KEY` (fournis par le CMI) et `CMI_GATEWAY_URL`
  (test par défaut). Le CMI notifie `/api/public/payments/cmi/callback` : à déclarer auprès du CMI, signature vérifiée,
  réponse `ACTION=POSTAUTH` si `ProcReturnCode=00`. La CSP autorise l'envoi du formulaire vers `MADRASTI_PAYMENT_FORM_ORIGINS`.
- **Stripe** : `MADRASTI_PAYMENTS_PROVIDER=stripe` et `STRIPE_SECRET_KEY` (clé `sk_test_…` pour essayer).
- Sans configuration, le prestataire **simulé** est utilisé.

Plusieurs répliques peuvent démarrer en même temps sur une base vide : les données de démonstration sont créées sous un verrou de ligne (`app_locks`), une seule instance les insère.

## Qualité

| Niveau | Outil | Commande |
|---|---|---|
| Unitaires + intégration API | JUnit 5, MockMvc (H2) | `mvn -f backend/pom.xml test` |
| Web, partagé et mobile : unitaires, composants, couverture des traductions | Vitest, Testing Library, Jest (Expo) | `npx turbo run test:run` |
| Bout en bout | Playwright | `npm run e2e -w @madrasti/web` (stack lancée ; `E2E_BASE_URL`, `E2E_CHANNEL=chrome` si besoin) |
| CI | GitHub Actions | `.github/workflows/ci.yml` : backend, paquets JS (Turborepo), puis E2E sur la stack Docker de production |

## Internationalisation

- **Front** : react-i18next, la phrase française sert de clé (`t('Nouveau compte')`) — une clé absente retombe sur le français.
  Dictionnaires (web et mobile) : `packages/shared/src/i18n/locales/{fr,en,ar}.json` (fr ne contient que les pluriels).
  Le test `src/i18n/translations.test.ts` échoue si un texte de l'interface n'a pas sa traduction anglaise ou arabe.
- **RTL** : classes logiques Tailwind (`ps-*`, `ms-*`, `start-*`, `text-start`…), composants shadcn générés avec `rtl: true`,
  flèches inversées via `rtl:-scale-x-100`, polices Noto Sans/Kufi Arabic.
- **API** : le front envoie `Accept-Language` ; erreurs, validations et mentions de bulletin viennent de
  `backend/src/main/resources/messages{,_en,_ar}.properties` (parité des clés vérifiée par un test).
- Ajouter un texte : écrire `t('Texte français')`, puis ajouter la clé dans `en.json` et `ar.json` (le test indique les oublis).

## Profils

- `dev` (défaut) : PostgreSQL local (docker compose) + données de démo.
- `prod` : variables `MADRASTI_DB_URL`, `MADRASTI_DB_USER`, `MADRASTI_DB_PASSWORD`, `MADRASTI_JWT_SECRET` (≥ 32 octets),
  `MADRASTI_CORS_ORIGINS`, `MADRASTI_JITSI_URL`, `MADRASTI_STORAGE_DIR` (fichiers déposés, défaut `./data/uploads`).
- Traduction automatique : `ANTHROPIC_API_KEY` (désactivée si vide), `MADRASTI_TRANSLATION_MODEL`, `MADRASTI_TRANSLATION_EFFORT`.
- SMS : `MADRASTI_SMS_PROVIDER=twilio` + `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
  (par défaut `log` : les SMS sont écrits dans les logs) ; `MADRASTI_SMS_ABSENCE_ALERTS=false` pour couper les alertes.
