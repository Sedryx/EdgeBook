$# EdgeBook

EdgeBook est un journal de trading desktop base sur Tauri, React et SQLite.

L'application garde les trades en local sur la machine de l'utilisateur. Le PnL est calcule automatiquement par defaut, avec une option de PnL net manuel broker quand la donnee broker doit faire foi.

## Prerequis desktop

Installer les dependances systeme Tauri pour Arch Linux:

```bash
sudo pacman -Syu
sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool
```

Installer Node.js et npm:

```bash
sudo pacman -S nodejs npm
```

Rust est aussi requis pour Tauri. Il est deja installe sur cette machine.

## Lancer en developpement

```bash
npm install
npm run desktop:dev
```

## Generer une application installable

```bash
npm run desktop:build
```

Les fichiers generes seront dans:

```bash
src-tauri/target/release/bundle/
```

Selon l'OS, Tauri peut produire un installateur Windows, un `.AppImage`, un `.deb`, un `.rpm` ou un bundle macOS.

## Modes de calcul PnL

- `automatic`: calcule le PnL brut, le PnL net, le resultat en R et le statut du trade a partir des prix, de la taille, de la direction et des frais.
- `manual_broker_pnl`: utilise le PnL net reel fourni par le broker comme reference officielle, puis recalcule le resultat en R, le statut, les statistiques et les graphiques.

## Ancien prototype Streamlit

Les fichiers Python restent presents comme prototype historique:

```bash
source .venv/bin/activate
streamlit run app.py
```

Pour le produit final telechargeable, utiliser la version Tauri.
$