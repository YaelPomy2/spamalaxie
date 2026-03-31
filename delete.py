import os
import shutil

# Dossiers à vider
dossiers = ["./analysis/fallback", "./analysis/mails_bruts", "./analysis/npm-nlp_analysis","./analysis/textes", "./analysis/transfer" ]
for dossier in dossiers:
    if not os.path.exists(dossier):
        print(f"Le dossier {dossier} n'existe pas.")
        continue

    for element in os.listdir(dossier):
        chemin = os.path.join(dossier, element)

        try:
            if os.path.isfile(chemin) or os.path.islink(chemin):
                os.remove(chemin)
            elif os.path.isdir(chemin):
                shutil.rmtree(chemin)
        except Exception as e:
            print(f"Erreur lors de la suppression de {chemin}: {e}")

    print(f"Contenu du dossier {dossier} supprimé.")