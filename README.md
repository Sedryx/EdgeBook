# EdgeBook

Journal de trading avec calcul PnL automatique par défaut et option de PnL manuel broker.

## Lancer l'application

```bash
pip install -r requirements.txt
streamlit run app.py
```

## Modes de calcul PnL

- `automatic`: calcule le PnL brut, le PnL net, le résultat en R et le statut du trade à partir des prix, de la taille, de la direction et des frais.
- `manual_broker_pnl`: utilise le PnL net réel fourni par le broker comme référence officielle, puis recalcule le résultat en R, le statut, les statistiques et les graphiques.
