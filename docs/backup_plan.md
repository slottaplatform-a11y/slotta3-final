# Backup Plan (Weekly)

This is a provider-agnostic example plan for weekly Postgres backups.

## Schedule Example (cron)

Run every Sunday at 02:00:

```
0 2 * * 0 /bin/bash /path/to/slotta/scripts/backup/backup_db.sh
```

## Notes

- Store backups in a durable location (e.g., mounted volume, object storage sync).
- Use `BACKUP_STORAGE_PATH` to set the local folder.
- `DATABASE_URL` must be set in the environment.
