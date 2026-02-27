# NativeChat

**Apprenez le chinois par l'immersion, un SMS à la fois.**

NativeChat est une application de messagerie intelligente (PWA) conçue pour pratiquer le mandarin de manière naturelle. Contrairement aux applications de langues classiques, NativeChat simule des conversations réelles via une interface style "WeChat", propulsée par les derniers modèles de langage de Google et d'OpenAI.

---

## Fonctionnalités Clés

### Immersion par le Roleplay

* **Scénarios Aléatoires :** L'IA génère des situations de la vie courante (banque, restaurant, voisin, etc.) pour briser la glace.
* **Brainstorming IA :** Un mode "Améliorer" permet de transformer une idée simple en un scénario de jeu de rôle détaillé.
* **Multi-Modèles :** Choisissez dynamiquement le moteur de votre conversation (**Gemini 2.0/2.5 Flash** ou **GPT-4o/mini**) selon vos préférences.

### Outils Pédagogiques Intégrés

* **Correction Intelligente :** Analyse vos messages, souligne les erreurs et propose des versions naturelles sous forme de tableau (Hanzi / Pinyin / Traduction).
* **Explications à la demande :** Un message de l'IA est trop complexe ? Le bouton "Expliquer" décompose le vocabulaire et la grammaire.
* **Aide à la réponse :** Génère des suggestions de réponses contextuelles pour ne jamais rester bloqué.
* **Outils de lecture :** Affiche/Masque le Pinyin et la traduction instantanée sur n'importe quel message.

### Expérience Utilisateur

* **Multi-plateforme :** Optimisé pour le Web et prêt pour le mobile via **Capacitor** (Android).
* **Performance :** Réponses quasi instantanées grâce aux modèles "Flash" et au streaming de texte.
* **Cloud Sync :** Vos discussions sont synchronisées en temps réel via **Supabase** et sécurisées par **Clerk**.

---

## Installation et Configuration

### 1. Clonage et dépendances

```bash
git clone https://github.com/AxelDlv00/NativeChat.git
cd NativeChat
npm install
```

### 2. Variables d'environnement

Créez un fichier `.env` à la racine et renseignez vos clés :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=votre_cle_clerk
CLERK_SECRET_KEY=votre_secret_clerk
```

### 3. Lancement

```bash
npm run dev
```

Accédez à l'application sur `http://localhost:3000`. Configurez vos clés API OpenAI ou Gemini directement dans l'onglet **Paramètres** de l'application pour commencer à discuter.