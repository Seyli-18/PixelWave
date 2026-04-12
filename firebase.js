/* ============================================================
   PIXELWAVE — firebase.js
   Module Firebase centralisé : Auth + Firestore
   Importé par shared.js via <script type="module">

   Structure Firestore :
   ├── scores/{gameId}/entries/{docId}  { name, score, classId, ts }
   └── reviews/{gameId}/entries/{docId} { author, text, stars, ts }
   ============================================================ */

import { initializeApp, getApps } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  query, orderBy, limit, serverTimestamp, where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

/* ── Config (même projet que ton index.html) ── */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDccH-NoPxlJJAmBYq_xoYE0f7_IFZvTlE",
  authDomain:        "pixelwave-1dd12.firebaseapp.com",
  projectId:         "pixelwave-1dd12",
  storageBucket:     "pixelwave-1dd12.firebasestorage.app",
  messagingSenderId: "643733344941",
  appId:             "1:643733344941:web:5d55206f213c55c52bec24",
  measurementId:     "G-WHG2T4QYZR"
};

/* ── Init (singleton — évite le double init si index.html le fait aussi) ── */
const app  = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const db   = getFirestore(app);
const auth = getAuth(app);

/* ══════════════════════════════════════════
   SCORES
   ══════════════════════════════════════════ */

/**
 * Enregistre un score dans Firestore.
 * @param {string} gameId   - ex: 'snake', 'pacman'
 * @param {string} name     - pseudo du joueur
 * @param {number} score    - valeur numérique
 * @param {string} [classId] - identifiant de classe (optionnel)
 */
export async function saveScore(gameId, name, score, classId = '') {
  try {
    await addDoc(collection(db, 'scores', gameId, 'entries'), {
      name:    name.slice(0, 20),
      score:   Number(score),
      classId: classId.slice(0, 30),
      ts:      serverTimestamp()
    });
  } catch (e) {
    console.warn('[PixelWave] saveScore error:', e);
    // Fallback localStorage si hors-ligne
    _localSaveScore(gameId, name, score, classId);
  }
}

/**
 * Récupère le top 10 global ou par classe.
 * @param {string} gameId
 * @param {string} [classId] - si fourni, filtre par classe
 * @returns {Promise<Array<{name,score,ts}>>}
 */
export async function getTopScores(gameId, classId = '') {
  try {
    let q;
    if (classId) {
      q = query(
        collection(db, 'scores', gameId, 'entries'),
        where('classId', '==', classId),
        orderBy('score', 'desc'),
        limit(10)
      );
    } else {
      q = query(
        collection(db, 'scores', gameId, 'entries'),
        orderBy('score', 'desc'),
        limit(10)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[PixelWave] getTopScores error:', e);
    return _localGetScores(gameId, classId);
  }
}

/* ══════════════════════════════════════════
   REVIEWS
   ══════════════════════════════════════════ */

/**
 * Enregistre un avis.
 */
export async function saveReview(gameId, author, text, stars) {
  try {
    await addDoc(collection(db, 'reviews', gameId, 'entries'), {
      author: author.slice(0, 20),
      text:   text.slice(0, 400),
      stars:  Math.max(1, Math.min(5, Number(stars))),
      ts:     serverTimestamp()
    });
  } catch (e) {
    console.warn('[PixelWave] saveReview error:', e);
    _localSaveReview(gameId, author, text, stars);
  }
}

/**
 * Récupère les 20 derniers avis.
 */
export async function getReviews(gameId) {
  try {
    const q = query(
      collection(db, 'reviews', gameId, 'entries'),
      orderBy('ts', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[PixelWave] getReviews error:', e);
    return _localGetReviews(gameId);
  }
}

/* ══════════════════════════════════════════
   AUTH GOOGLE
   ══════════════════════════════════════════ */

export async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

export function onUser(cb) {
  onAuthStateChanged(auth, cb);
}

/* ══════════════════════════════════════════
   FALLBACK localStorage (hors-ligne / erreur)
   ══════════════════════════════════════════ */

function _lsKey(k) { try { return JSON.parse(localStorage.getItem(k)) ?? []; } catch { return []; } }
function _lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function _localSaveScore(gameId, name, score, classId) {
  const key = `pw_scores_${gameId}`;
  const arr = _lsKey(key);
  arr.push({ name, score, classId, ts: Date.now() });
  arr.sort((a, b) => b.score - a.score);
  _lsSet(key, arr.slice(0, 50));
}

function _localGetScores(gameId, classId) {
  const key = `pw_scores_${gameId}`;
  let arr = _lsKey(key);
  if (classId) arr = arr.filter(s => s.classId === classId);
  return arr.sort((a, b) => b.score - a.score).slice(0, 10);
}

function _localSaveReview(gameId, author, text, stars) {
  const key = `pw_reviews_${gameId}`;
  const arr = _lsKey(key);
  arr.unshift({ author, text, stars, ts: Date.now() });
  _lsSet(key, arr.slice(0, 100));
}

function _localGetReviews(gameId) {
  return _lsKey(`pw_reviews_${gameId}`).slice(0, 20);
}