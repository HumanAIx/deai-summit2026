#!/usr/bin/env node

/**
 * Clears all broken nobg photo URLs so they can be re-processed.
 * Run from your Mac terminal: node scripts/clear-nobg-photos.mjs
 */

const API_URL = 'http://localhost:3000/api';
const API_KEY = '1865980a-f7ff-4598-bab7-2d1141a66a86';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

async function main() {
  console.log('Fetching speakers...\n');

  const res = await fetch(`${API_URL}/members?is_speaker=true&limit=100`, { headers });
  const json = await res.json();
  const members = (json.data || []).filter(m => m.person_photo_nobg);

  console.log(`Speakers with nobg photos to clear: ${members.length}\n`);

  for (const m of members) {
    const name = `${m.person_firstname} ${m.person_surname}`.trim();
    process.stdout.write(`Clearing ${name}... `);

    try {
      const delRes = await fetch(`${API_URL}/members/${m.id}/photo/nobackground`, {
        method: 'DELETE',
        headers,
      });
      const delJson = await delRes.json();
      console.log(delJson.success ? '✓' : `✗ ${delJson.message}`);
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }

  console.log('\nDone. Now run: node scripts/remove-speaker-backgrounds.mjs');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
