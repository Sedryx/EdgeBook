# EdgeBook

EdgeBook est un journal de trading desktop construit avec Tauri, React, Rust et SQLite.

L'application stocke les donnees localement sur la machine de l'utilisateur. Le PnL est calcule automatiquement par defaut, avec un mode broker manuel lorsque le PnL net fourni par le broker doit etre la reference officielle.

## Fonctionnalites

- Journal de trades avec PnL automatique ou PnL broker manuel.
- Balance de compte manuelle, mise a jour automatiquement avec les trades clotures.
- Dashboard avec equity curve, repartition long/short, resultats, PnL par marche et stats avancees.
- Fiche de trade avec strategie, tags, psychologie, erreur, notes et screenshot.
- Collage de screenshot via `Ctrl+V` dans l'onglet Journal, avec fallback `Select image`.
- Calendar avec PnL par jour.
- Review automatique des pertes, overrides broker, screenshots manquants, erreurs et risques hors regles.
- Export CSV et backup JSON.
- Themes, densite, langue et devise personnalisables.
- Risk rules: risque max par trade, perte max journaliere, trades max par jour, objectif mensuel.

## Prerequis Arch Linux

```bash
sudo pacman -Syu
sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool nodejs npm
```

Rust est requis pour Tauri:

```bash
rustc --version
cargo --version
```

## Installation

```bash
npm install
```

## Developpement

```bash
npm run desktop:dev
```

## Checks et tests

```bash
npm run check
npm run test
```

`npm run test` execute le build frontend puis les tests Rust.

## Build installable

```bash
npm run desktop:build
```

Les bundles sont generes dans:

```bash
src-tauri/target/release/bundle/
```

La configuration Linux actuelle genere `.deb` et `.rpm`.

Pour AppImage ou d'autres formats, modifier `src-tauri/tauri.conf.json` dans `bundle.targets`.

## Docker

Le Dockerfile sert de build/CI Linux. Il ne lance pas une fenetre desktop interactive.

```bash
docker build -t edgebook-build .
```

Le build Docker execute:

```bash
npm ci
npm run test
npm run desktop:build
```

## Modes PnL

- `automatic`: calcule le PnL brut, le PnL net, le resultat en R et le statut du trade avec prix, taille, direction et frais.
- `manual_broker_pnl`: utilise le PnL net broker comme valeur officielle, puis recalcule le resultat en R, le statut et les statistiques.

## Donnees locales

La base SQLite desktop est stockee dans le dossier application de Tauri, pas dans `data/trading_journal.db`.

Le fichier `data/trading_journal.db` appartient a l'ancien prototype Python/Streamlit.

## Ancien prototype Streamlit

Les fichiers Python restent presents comme prototype historique:

```bash
source .venv/bin/activate
streamlit run app.py
```

Pour le produit final telechargeable, utiliser la version Tauri.
