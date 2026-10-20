import sys
import os

# Permet d'importer le dossier 'config' situé dans le dossier parent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import get_db_connection

def executer_test():
    print("🔄 Tentative de connexion à MySQL...")
    conn = get_db_connection()
    
    if conn is None:
        print("❌ Échec : Impossible de se connecter à la base de données.")
        return

    print("✅ Connexion réussie à MySQL (incendie_db) !")
    cursor = conn.cursor()
    
    try:
        # Vérification des tables existantes
        cursor.execute("SHOW TABLES;")
        tables = cursor.fetchall()
        
        print("\n📊 Tables trouvées dans la base :")
        if tables:
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("  (Aucune table trouvée pour le moment, c'est normal si tu ne les as pas encore créées !)")
            
    except Exception as e:
        print(f"❌ Erreur lors de la lecture des tables : {e}")
    finally:
        cursor.close()
        conn.close()
        print("\n🔒 Connexion fermée proprement.")

if __name__ == "__main__":
    executer_test()
