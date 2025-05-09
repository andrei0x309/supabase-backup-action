# supabase-backup-action

## Description

This is an Github action that can be used to backup your Supabase database, upload the backup to Supabase Storage and delete older backups.
For small websites should run under 2 minutes, but I haven't tested it with large databases.

## Getting Started

Create a workflow file in `.github/workflows/` (e.g. `backup.yml`) with the following content:

```yaml
name: Supa-Database-Backup
on:
  workflow_dispatch:
  schedule:
    - cron: '0 1 */3 * *' # At 01:00 on every 3rd day-of-month.
jobs:   
  run_db_backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ github.head_ref }}
      - uses: andrei0x309/supabase-backup-action@v1
        with:
          supabase-postgre-url: ${{ secrets.SUPABASE_POSTRGE_URL }}
          supabase-url: ${{ secrets.SUPABASE_URL }}
          supabase-service-key: ${{ secrets.SUPABASE_SERVICE_KEY }}
          supabase-bucket: ${{ secrets.SUPABASE_BUCKET }}
          delete-older-backups: 'true'
          delete-older-backups-days: '7'
          folder-name: 'backups'
```

Link to a workflow file used by my supa blog: [backup.yml](https://github.com/andrei0x309/svelte-kit-supa-blog/blob/main/.github/workflows/backup.yml)

Be sure to add the secrets to your repository before adding the workflow file.
All necessary secrets are listed below in the `Prerequisites` section and can be found in the Supabase dashboard in different places, dashbord may provide different connect URIs, be sure to use the correct one()

### Prerequisites

- Supabase account
- Supabase database
- Supabase service key (not the anon key)
- Supabase Postgre URL

### Secrets Examples (replace `<YOUR-PASSWORD>` with your password and `<YOUR-PROJECT>` with your project name):

- Supabase Postgre URL: `postgresql://postgres.<YOUR-PROJECT>:<YOUR-PASSWORD>&@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
- Supabase URL: `https://<YOUR-PROJECT>.supabase.co`
- Supabase Service Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0` (this is a dummy key, replace it with your own)
- Supabase Bucket: `supabase-backups` (this is the name of the bucket, you can change it to whatever you want)

### Notes

- If the bucket does not exist, it will be created.
- If the folder does not exist, it will be created, if is not provided the backups will be stored in the root of the bucket.
- You can change the backup frequency by changing the cron expression in the `schedule` yaml section, for many cases once on 3 days is enough, but you can change it to what you need.

### Dependencies that the action uses

- Supabase CLI
- Composite Actions
- Postgres CLI
- Supabase Data API
- Bun
