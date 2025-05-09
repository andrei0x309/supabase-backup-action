import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import archiver from 'archiver';
import fs from 'node:fs';


const SUPABASE_POSTRGE_URL = process.env.SUPABASE_POSTRGE_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || '';
const DELETE_OLDER_BACKUPS = process.env.DELETE_OLDER_BACKUPS || 'true';
const DELETE_OLDER_BACKUPS_DAYS = process.env.DELETE_OLDER_BACKUPS_DAYS
const SUPABASE_FOLDER_NAME = process.env.SUPABASE_FOLDER_NAME || '';

const getBackupName = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `database-backup-${year}-${month}-${day}.zip`;
};

const zipBackup = async () => {
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });
  const dirPipes = ['data'];
  const outputZip = fs.createWriteStream(getBackupName());

  await new Promise((resolve, reject) => {
    let arch = archive;
    dirPipes.forEach((dir) => {
      arch = arch.directory(dir, false);
    });
 
    arch.on('error', (err: unknown) => reject(err)).pipe(outputZip);

    outputZip.on('close', () => resolve(true));
    arch.finalize();
  });
}

const deleteOldBackups = async (folderPath: string, supabase: SupabaseClient) => {
    
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .list(folderPath ? folderPath : undefined);

    if (error) {
      console.error('Error listing files:', error);
      return;
    }

    if (!data) {
        console.log('No files found in the specified path.');
        return;
    }

    const filesToDelete: string[] = [];
     const now = new Date();
    const numDaysAgo = Number(DELETE_OLDER_BACKUPS_DAYS) || 7;

    const daysAgo = new Date(now.setDate(now.getDate() - numDaysAgo));


    // Iterate through the files and filter
    for (const file of data) {
      const filePath = folderPath ? `${folderPath}/${file.name}` : file.name;
      const fileTimestamp = new Date(file.created_at); // Or file.updated_at

      // Check if the file name matches the pattern AND is older than 7 days
      if (
        file.name.startsWith('database-backup') &&
        file.name.endsWith('.zip') &&
        fileTimestamp < daysAgo
      ) {
        console.log(`Found old backup to delete: ${filePath} (Created: ${fileTimestamp.toISOString()})`);
        filesToDelete.push(filePath);
      }
    }

    // Delete the identified files
    if (filesToDelete.length > 0) {
      console.log(`Attempting to delete ${filesToDelete.length} files...`);
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove(filesToDelete);

      if (deleteError) {
        console.error('Error deleting files:', deleteError);
      } else {
        console.log('Successfully deleted files:', deleteData);
      }
    } else {
      console.log('No old backup files found matching criteria.');
    }
}


const main = async () => {
  if (!SUPABASE_POSTRGE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_BUCKET) {
    throw new Error('Missing environment variables');
  }

  // check Number of days is valid
  const numDays = Number(DELETE_OLDER_BACKUPS_DAYS);
  if (isNaN(numDays) || numDays < 1 || numDays > 365) {
    throw new Error('DELETE_OLDER_BACKUPS_DAYS must be a number between 1 and 365');
  }

  const folderPath = SUPABASE_FOLDER_NAME;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Zip the backup
    await zipBackup();
    const file = fs.readFileSync(getBackupName());
    // Check Bucket Exists
    const { error: bucketExistsError } = await supabase.storage.getBucket(SUPABASE_BUCKET);
    if (bucketExistsError) {
      // Create Bucket
      await supabase.storage.createBucket(SUPABASE_BUCKET, {
        public: false,
      });
    }
    // Upload the backup to Supabase Storage
    const { error: uploadError } = await supabase.storage.from(SUPABASE_BUCKET).upload(folderPath ? `${folderPath}/${getBackupName()}` : getBackupName(), file, {
      contentType: 'application/zip',
      upsert: true,
    });

    if (uploadError) {
      console.error('Error uploading backup:', uploadError);
      process.exit(1);
    }
    console.log('Backup uploaded successfully.');
    if (DELETE_OLDER_BACKUPS === 'true') {
      await deleteOldBackups(folderPath, supabase);
    }


  } catch (err) {
    console.error('An unexpected error occurred:', err);
    throw err;
  }
}

// Run the main function
main();