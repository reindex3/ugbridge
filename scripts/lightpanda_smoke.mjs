import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { join } from 'node:path';

const HOST = '127.0.0.1';
const PORT = 4173;
const BASE_URL = `http://${HOST}:${PORT}`;
const SERVER_TIMEOUT_MS = 15000;
const PROBE_TIMEOUT_MS = 500;

const checks = [
  {
    name: 'home loads',
    path: '/',
    waitScript:
      "document.body && document.body.textContent.includes('Privacy-first local profile') && document.querySelector('#dictionary-search')",
    expected: [
      'UG Bridge',
      'Privacy-first local profile',
      'Local study profile',
      'Dictionary search',
    ],
  },
  {
    name: 'converter restores shared text',
    path: '/?view=convert&d=uly-to-uey&text=salam',
    waitScript: "document.body && document.body.textContent.includes('سالام')",
    expected: ['salam', 'سالام'],
  },
  {
    name: 'dictionary search renders results',
    path: '/?view=dictionary&q=yaxshi',
    waitScript: "document.body && document.body.textContent.includes('ياخشى')",
    expected: ['Dictionary search', 'ياخشى', 'yaxshi'],
  },
  {
    name: 'learn reference highlights categories',
    path: '/?view=learn',
    waitScript:
      "(() => { const tileFor = (text) => Array.from(document.querySelectorAll('section div')).find((item) => item.firstElementChild && item.firstElementChild.textContent === text); const ch = tileFor('ch'); const a = tileFor('a'); return Boolean(ch && a && ch.classList.contains('bg-indigo-100') && ch.classList.contains('border-2') && a.classList.contains('bg-emerald-100') && a.classList.contains('border-2')); })()",
    expected: ['ULY to UEY + IPA reference', 'ch', 'a', 'ا'],
  },
  {
    name: 'learn breakdown highlights vowels',
    path: '/?view=learn&text=yaxshimisiz',
    waitScript:
      "(() => { const vowelBadge = Array.from(document.querySelectorAll('span')).find((item) => item.textContent === 'vowel'); const tile = vowelBadge && vowelBadge.closest('div'); const shapeHeading = Array.from(document.querySelectorAll('h2')).find((item) => item.textContent === 'Word shape study'); const shapeSection = shapeHeading && shapeHeading.closest('section'); const vowelCell = shapeSection && Array.from(shapeSection.querySelectorAll('dl')).find((item) => Array.from(item.querySelectorAll('dd')).some((dd) => dd.textContent === 'a'))?.parentElement; return Boolean(tile && vowelCell && tile.classList.contains('bg-emerald-100') && tile.classList.contains('border-2') && vowelCell.classList.contains('bg-emerald-100') && vowelCell.classList.contains('ring-2')); })()",
    expected: ['yaxshimisiz', 'vowel', 'Word shape study'],
  },
  {
    name: 'alphabet detail covers right-joining vowel forms',
    path: '/?view=alphabet',
    waitScript:
      "(() => { const body = document.body; if (!body) return false; const buttons = Array.from(document.querySelectorAll('button')); const button = buttons.find((item) => item.textContent && item.textContent.includes('ö')); if (button && !body.textContent.includes('dölet')) button.click(); return body.textContent.includes('dölet') && body.textContent.includes('دۆلەت') && body.textContent.includes('isolated'); })()",
    expected: ['Learn alphabet', 'ö', 'isolated', 'dölet', 'دۆلەت'],
  },
];

const viteBin = join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vite.cmd' : 'vite',
);

const server = spawn(
  viteBin,
  ['--host', HOST, '--port', String(PORT), '--strictPort'],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

let serverOutput = '';
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForServer();

  for (const check of checks) {
    const dump = await lightpandaFetch(check);
    for (const expected of check.expected) {
      if (!dump.includes(expected)) {
        throw new Error(`${check.name}: missing "${expected}"`);
      }
    }
    console.log(`✓ ${check.name}`);
  }
} finally {
  server.kill('SIGTERM');
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < SERVER_TIMEOUT_MS) {
    if (server.exitCode !== null) {
      throw new Error(`Vite server exited early:\n${serverOutput}`);
    }

    if (await canConnectToServer()) {
      return;
    } else {
      // Keep waiting until Vite accepts connections.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for Vite server:\n${serverOutput}`);
}

function canConnectToServer() {
  return new Promise((resolve) => {
    const socket = createConnection({ host: HOST, port: PORT });
    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
  });
}

function lightpandaFetch(check) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'lightpanda',
      [
        'fetch',
        `${BASE_URL}${check.path}`,
        '--dump',
        'semantic_tree_text',
        '--wait-ms',
        '10000',
        '--wait-script',
        check.waitScript,
        '--terminate-ms',
        '15000',
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(
        new Error(
          `${check.name}: lightpanda exited ${code}\n${stderr || stdout}`,
        ),
      );
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
