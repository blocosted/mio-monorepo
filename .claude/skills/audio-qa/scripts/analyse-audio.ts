#!/usr/bin/env bun
/**
 * Analyse objective d'un fichier audio pour Mio.
 *
 * Mesure ce qui distingue une histoire audio professionnelle d'un assemblage :
 * niveau perçu, dynamique, marge de sursaut, écrêtage, et distribution des blancs.
 *
 * Usage :
 *   bun analyse-audio.ts <fichier> [--charte <charte.json>]
 *
 * Sortie : JSON sur stdout. Les seuils viennent de la charte si elle est fournie,
 * sinon des valeurs par défaut ci-dessous (à valider à l'oreille, pas à recopier).
 */

interface Seuils {
  lufsIntegre: [number, number];
  truePeakMax: number;
  lraMax: number;
  margeSursautMax: number;
  silenceTeteSec: [number, number];
  silenceQueueSec: [number, number];
  blancMedianSec: [number, number];
  blancP90MaxSec: number;
  blancMaxSec: number;
  seuilSilenceDb: number;
  dureeMinSilenceSec: number;
}

const SEUILS_DEFAUT: Seuils = {
  // Plus bas que la norme podcast (-16) : une histoire du soir s'écoute à faible volume,
  // souvent sur un petit haut-parleur, dans une pièce sombre.
  lufsIntegre: [-19, -17],
  truePeakMax: -1.5,
  // Une plage dynamique large oblige l'auditeur à monter le son pour les murmures,
  // et le fait sursauter sur les cris. Pour ce produit, une dynamique resserrée est
  // une qualité, pas un défaut.
  lraMax: 8,
  // Écart maximal entre le pic de niveau court terme et le niveau intégré.
  margeSursautMax: 5,
  silenceTeteSec: [0.2, 1.0],
  silenceQueueSec: [1.0, 3.0],
  blancMedianSec: [0.25, 0.5],
  blancP90MaxSec: 0.9,
  blancMaxSec: 2.5,
  seuilSilenceDb: -40,
  dureeMinSilenceSec: 0.25
};

async function run(cmd: string[]): Promise<{ stdout: string; stderr: string }> {
  const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ]);
  await proc.exited;
  return { stdout, stderr };
}

function nombre(source: string, motif: RegExp): number | null {
  const m = source.match(motif);
  return m?.[1] !== undefined ? Number.parseFloat(m[1]) : null;
}

async function sonder(fichier: string) {
  const { stdout } = await run([
    'ffprobe', '-v', 'error',
    '-show_entries', 'format=duration,bit_rate,format_name',
    '-show_entries', 'stream=codec_name,sample_rate,channels',
    '-of', 'json', fichier
  ]);
  const j = JSON.parse(stdout || '{}');
  const flux = j.streams?.[0] ?? {};
  return {
    dureeSec: Number.parseFloat(j.format?.duration ?? '0'),
    debitBps: j.format?.bit_rate ? Number.parseInt(j.format.bit_rate, 10) : null,
    conteneur: j.format?.format_name ?? null,
    codec: flux.codec_name ?? null,
    frequenceHz: flux.sample_rate ? Number.parseInt(flux.sample_rate, 10) : null,
    canaux: flux.channels ?? null
  };
}

/** EBU R128 : niveau intégré, plage de loudness, true peak, et pic court terme. */
async function loudness(fichier: string) {
  const { stderr } = await run([
    'ffmpeg', '-hide_banner', '-nostats', '-i', fichier,
    '-af', 'ebur128=peak=true:framelog=verbose', '-f', 'null', '-'
  ]);

  // Le résumé final est le bloc le plus fiable pour I / LRA / true peak.
  const resume = stderr.slice(stderr.lastIndexOf('Summary:'));
  const integre = nombre(resume, /I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/);
  const lra = nombre(resume, /LRA:\s*(-?\d+(?:\.\d+)?)\s*LU/);
  const truePeak = nombre(resume, /Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS/);

  // Le pic court terme se lit sur les lignes de trame : t: … M: … S: …
  let sMax: number | null = null;
  for (const m of stderr.matchAll(/\sS:\s*(-?\d+(?:\.\d+)?|-inf)\s/g)) {
    const v = m[1] === '-inf' ? null : Number.parseFloat(m[1] as string);
    if (v !== null && Number.isFinite(v) && (sMax === null || v > sMax)) sMax = v;
  }

  return {
    lufsIntegre: integre,
    lra,
    truePeakDbtp: truePeak,
    courtTermeMaxLufs: sMax,
    margeSursautLu: sMax !== null && integre !== null ? +(sMax - integre).toFixed(2) : null
  };
}

/** astats : écrêtage, offset continu, platitude du signal. */
async function statistiques(fichier: string) {
  const { stderr } = await run([
    'ffmpeg', '-hide_banner', '-nostats', '-i', fichier,
    '-af', 'astats=measure_perchannel=none', '-f', 'null', '-'
  ]);
  const global = stderr.slice(stderr.lastIndexOf('Overall'));
  return {
    picDb: nombre(global, /Peak level dB:\s*(-?\d+(?:\.\d+)?)/),
    rmsDb: nombre(global, /RMS level dB:\s*(-?\d+(?:\.\d+)?)/),
    facteurPlatitude: nombre(global, /Flat factor:\s*(-?\d+(?:\.\d+)?)/),
    nbEchantillonsCretes: nombre(global, /Peak count:\s*(\d+)/),
    offsetContinu: nombre(global, /DC offset:\s*(-?\d+(?:\.\d+)?)/)
  };
}

/** Distribution des blancs : c'est ce qui fait entendre « mal monté ». */
async function blancs(fichier: string, dureeSec: number, s: Seuils) {
  const { stderr } = await run([
    'ffmpeg', '-hide_banner', '-nostats', '-i', fichier,
    '-af', `silencedetect=noise=${s.seuilSilenceDb}dB:d=${s.dureeMinSilenceSec}`,
    '-f', 'null', '-'
  ]);

  const debuts = [...stderr.matchAll(/silence_start:\s*(-?\d+(?:\.\d+)?)/g)].map((m) =>
    Number.parseFloat(m[1] as string)
  );
  const fins = [...stderr.matchAll(/silence_end:\s*(-?\d+(?:\.\d+)?)/g)].map((m) =>
    Number.parseFloat(m[1] as string)
  );
  const durees = [...stderr.matchAll(/silence_duration:\s*(\d+(?:\.\d+)?)/g)].map((m) =>
    Number.parseFloat(m[1] as string)
  );

  // Silence de tête : un silence qui commence quasiment à zéro.
  const premierDebut = debuts[0];
  const teteSec = premierDebut !== undefined && premierDebut < 0.05 ? (fins[0] ?? dureeSec) : 0;

  // Silence de queue : un silence non refermé, ou refermé à la toute fin.
  const dernierDebut = debuts.at(-1);
  const queueSec =
    dernierDebut !== undefined && fins.length < debuts.length
      ? +(dureeSec - dernierDebut).toFixed(3)
      : 0;

  // Les blancs internes excluent tête et queue : ce sont eux qui rythment le récit.
  const internes = durees.filter((_, i) => {
    const d = debuts[i];
    if (d === undefined) return false;
    const estTete = d < 0.05;
    const estQueue = i === debuts.length - 1 && fins.length < debuts.length;
    return !estTete && !estQueue;
  });

  const tri = [...internes].sort((a, b) => a - b);
  const quantile = (q: number) =>
    tri.length === 0 ? null : +(tri[Math.min(tri.length - 1, Math.floor(q * tri.length))] as number).toFixed(3);

  return {
    nbBlancsInternes: internes.length,
    totalSilenceSec: +internes.reduce((a, b) => a + b, 0).toFixed(2),
    partSilencePct: dureeSec > 0 ? +((internes.reduce((a, b) => a + b, 0) / dureeSec) * 100).toFixed(1) : null,
    medianeSec: quantile(0.5),
    p90Sec: quantile(0.9),
    maxSec: tri.length ? +(tri.at(-1) as number).toFixed(3) : null,
    silenceTeteSec: +teteSec.toFixed(3),
    silenceQueueSec: queueSec
  };
}

function verdicts(mes: Awaited<ReturnType<typeof mesurer>>, s: Seuils) {
  const v: { critere: string; valeur: number | null; attendu: string; statut: 'ok' | 'hors-charte' | 'non-mesure' }[] = [];
  const test = (critere: string, valeur: number | null, ok: boolean, attendu: string) =>
    v.push({ critere, valeur, attendu, statut: valeur === null ? 'non-mesure' : ok ? 'ok' : 'hors-charte' });

  const l = mes.loudness;
  const b = mes.blancs;
  test('Niveau intégré (LUFS)', l.lufsIntegre,
    l.lufsIntegre !== null && l.lufsIntegre >= s.lufsIntegre[0] && l.lufsIntegre <= s.lufsIntegre[1],
    `${s.lufsIntegre[0]} à ${s.lufsIntegre[1]}`);
  test('True peak (dBTP)', l.truePeakDbtp,
    l.truePeakDbtp !== null && l.truePeakDbtp <= s.truePeakMax, `≤ ${s.truePeakMax}`);
  test('Plage de loudness (LU)', l.lra, l.lra !== null && l.lra <= s.lraMax, `≤ ${s.lraMax}`);
  test('Marge de sursaut (LU)', l.margeSursautLu,
    l.margeSursautLu !== null && l.margeSursautLu <= s.margeSursautMax, `≤ ${s.margeSursautMax}`);
  test('Silence de tête (s)', b.silenceTeteSec,
    b.silenceTeteSec >= s.silenceTeteSec[0] && b.silenceTeteSec <= s.silenceTeteSec[1],
    `${s.silenceTeteSec[0]} à ${s.silenceTeteSec[1]}`);
  test('Silence de queue (s)', b.silenceQueueSec,
    b.silenceQueueSec >= s.silenceQueueSec[0] && b.silenceQueueSec <= s.silenceQueueSec[1],
    `${s.silenceQueueSec[0]} à ${s.silenceQueueSec[1]}`);
  test('Blanc médian (s)', b.medianeSec,
    b.medianeSec !== null && b.medianeSec >= s.blancMedianSec[0] && b.medianeSec <= s.blancMedianSec[1],
    `${s.blancMedianSec[0]} à ${s.blancMedianSec[1]}`);
  test('Blanc p90 (s)', b.p90Sec, b.p90Sec !== null && b.p90Sec <= s.blancP90MaxSec, `≤ ${s.blancP90MaxSec}`);
  test('Blanc maximum (s)', b.maxSec, b.maxSec !== null && b.maxSec <= s.blancMaxSec, `≤ ${s.blancMaxSec}`);
  test('Écrêtage (échantillons en crête)', mes.stats.nbEchantillonsCretes,
    mes.stats.nbEchantillonsCretes !== null && mes.stats.nbEchantillonsCretes === 0, '0');
  return v;
}

async function mesurer(fichier: string, s: Seuils) {
  const format = await sonder(fichier);
  const [l, st, b] = await Promise.all([
    loudness(fichier),
    statistiques(fichier),
    blancs(fichier, format.dureeSec, s)
  ]);
  return { fichier, format, loudness: l, stats: st, blancs: b };
}

const args = Bun.argv.slice(2);
const fichier = args.find((a) => !a.startsWith('--'));
if (!fichier) {
  console.error('Usage : bun analyse-audio.ts <fichier> [--charte <charte.json>]');
  process.exit(1);
}

const idxCharte = args.indexOf('--charte');
let seuils = SEUILS_DEFAUT;
if (idxCharte !== -1 && args[idxCharte + 1]) {
  seuils = { ...SEUILS_DEFAUT, ...(await Bun.file(args[idxCharte + 1] as string).json()) };
}

const mesures = await mesurer(fichier, seuils);
const resultat = {
  ...mesures,
  seuils,
  verdicts: verdicts(mesures, seuils),
  horsCharte: verdicts(mesures, seuils).filter((v) => v.statut === 'hors-charte').length,
  analyseLe: new Date().toISOString()
};
console.log(JSON.stringify(resultat, null, 2));
