import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { env } from '../../config/env.js';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

function formatStat(name, stat) {
  return {
    name,
    size: stat.size,
    mtime: stat.mtime
  };
}

export async function listBackups(req, res) {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const items = [];
    for (const f of files) {
      if (!f.endsWith('.gz')) continue;
      const st = await fs.stat(path.join(BACKUP_DIR, f));
      items.push(formatStat(f, st));
    }
    items.sort((a, b) => b.mtime - a.mtime);
    return res.json({ status: 'ok', data: items });
  } catch (error) {
    console.error('listBackups error', error);
    return res.status(500).json({ status: 'error', message: 'Could not list backups' });
  }
}

export async function downloadBackup(req, res) {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ status: 'error', message: 'name required' });
    const filePath = path.join(BACKUP_DIR, name);
    return res.download(filePath);
  } catch (error) {
    console.error('downloadBackup error', error);
    return res.status(500).json({ status: 'error', message: 'Could not download file' });
  }
}

export async function triggerFullBackup(req, res) {
  try {
    // Spawn the existing script (path relative to backend project root)
    const script = path.join(process.cwd(), 'scripts', 'db_backup.sh');
    if (!fsSync.existsSync(script)) {
      console.error('Backup script not found at', script);
      return res.status(500).json({ status: 'error', message: 'Backup script missing' });
    }

    const child = spawn(script, [], { stdio: ['ignore', 'ignore', 'ignore'], detached: true });
    child.on('error', (err) => {
      console.error('Backup child error', err);
    });
    child.unref();
    console.log('Backup started, pid=', child.pid);
    return res.json({ status: 'ok', message: 'Backup started' });
  } catch (error) {
    console.error('triggerFullBackup error', error);
    return res.status(500).json({ status: 'error', message: 'Could not start backup' });
  }
}

export async function exportTransactional(req, res) {
  try {
    const { tables = [], period = 'daily' } = req.body || {};
    if (!Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({ status: 'error', message: 'tables array required' });
    }

    const interval = period === 'weekly' ? "'7 days'" : period === 'monthly' ? "'30 days'" : "'1 day'";
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outFiles = [];

    for (const table of tables) {
      const out = path.join(BACKUP_DIR, `transactional_${table}_${timestamp}.csv.gz`);
      // Use psql COPY to export filtered rows (created_at assumed)
      const sql = `COPY (SELECT * FROM ${table} WHERE created_at >= now() - interval ${interval}) TO STDOUT WITH CSV HEADER`;
      const psql = spawn('psql', [env.databaseUrl, '-c', sql], { stdio: ['ignore', 'pipe', 'pipe'] });
      const gzip = spawn('gzip', ['-c'], { stdio: ['pipe', 'pipe', 'inherit'] });
      psql.stdout.pipe(gzip.stdin);
      const writeStream = (await import('fs')).createWriteStream(out);
      gzip.stdout.pipe(writeStream);
      // wait for completion
      await new Promise((resolve, reject) => {
        gzip.on('close', resolve);
        gzip.on('error', reject);
        psql.on('error', reject);
      });
      outFiles.push(path.basename(out));
    }

    return res.json({ status: 'ok', files: outFiles });
  } catch (error) {
    console.error('exportTransactional error', error);
    return res.status(500).json({ status: 'error', message: 'Could not export transactional data' });
  }
}

export async function deleteBackup(req, res) {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ status: 'error', message: 'name required' });
    const filePath = path.join(BACKUP_DIR, name);
    await fs.unlink(filePath);
    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('deleteBackup error', error);
    return res.status(500).json({ status: 'error', message: 'Could not delete file' });
  }
}
