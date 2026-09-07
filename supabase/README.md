# Coffre ARÉO (Supabase Storage)

## Ce que ça fait
- Bucket `areo-media` : photos/vidéos sources + futurs MP4
- Table `areo_videos` : historique compte (max 3 géré côté app plus tard)
- Connecté → fichiers dans `{user_id}/...`
- Invité → fichiers dans `guest/{id}/...`

## À faire une fois (2 min)
1. Ouvre ton projet Supabase **LockIn**
2. **SQL Editor** → New query
3. Colle le contenu de `supabase/migrations/001_areo_storage.sql`
4. **Run**
5. Vérifie : **Storage** → bucket `areo-media` apparaît

Ensuite dans l’app : Étape Médias → fichiers → **Lancer le rendu** = upload réel vers le coffre.
