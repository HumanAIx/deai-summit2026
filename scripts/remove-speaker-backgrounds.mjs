#!/usr/bin/env node

/**
 * Removes backgrounds from all DeAISummit speaker photos.
 * Run from your Mac terminal: node scripts/remove-speaker-backgrounds.mjs
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
  const members = json.data || [];

  const needProcessing = members.filter(m => m.person_photo && !m.person_photo_nobg);
  const alreadyDone = members.filter(m => m.person_photo_nobg);
  const noPhoto = members.filter(m => !m.person_photo);

  console.log(`Total speakers:        ${members.length}`);
  console.log(`Already processed:     ${alreadyDone.length}`);
  console.log(`No photo uploaded:     ${noPhoto.length}`);
  console.log(`Need bg removal:       ${needProcessing.length}`);
  console.log('');

  if (needProcessing.length === 0) {
    console.log('Nothing to do — all speaker photos already processed.');
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < needProcessing.length; i++) {
    const m = needProcessing[i];
    const name = `${m.person_firstname} ${m.person_surname}`.trim();
    const progress = `[${i + 1}/${needProcessing.length}]`;

    process.stdout.write(`${progress} ${name}... `);

    try {
      const bgRes = await fetch(`${API_URL}/members/${m.id}/photo/nobackground`, { headers });
      const bgJson = await bgRes.json();

      if (bgJson.success && bgJson.data?.imageUrl) {
        console.log(`✓ done`);
        success++;
      } else {
        console.log(`✗ ${bgJson.message || 'unknown error'}`);
        failed++;
      }
    } catch (e) {
      console.log(`✗ ${e.message}`);
      failed++;
    }
  }

  console.log(`\nComplete: ${success} succeeded, ${failed} failed`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
