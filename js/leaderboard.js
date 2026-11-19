window.Ssudam = window.Ssudam || {};

(function (ns) {
  const COLLECTION = 'ssudam_rankings';
  const LOCAL_RANK_KEY = 'ssudam_local_rankings_v1';
  const LAST_NICK_KEY = 'ssudam_last_nick_v1';

  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBWo6A1fNgaj7FOWYviDcUaS7gLDttFTMw',
    authDomain: 'dlro-s-game.firebaseapp.com',
    projectId: 'dlro-s-game',
    storageBucket: 'dlro-s-game.firebasestorage.app',
    messagingSenderId: '383142943189',
    appId: '1:383142943189:web:af99262690742e9475c55c',
  };

  function sanitizeNick(raw) {
    const trimmed = String(raw || '').trim();
    const sliced = Array.from(trimmed || '익명').slice(0, 8).join('');
    return sliced || '익명';
  }

  function normalizeRankList(rows) {
    const bestByKey = new Map();
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const name = sanitizeNick(row.name);
      const nameKey = (typeof row.nameKey === 'string' && row.nameKey) || name.toLowerCase();
      const score = Number.isFinite(Number(row.score)) ? Math.max(0, Math.floor(Number(row.score))) : 0;
      const timeSec = Number.isFinite(Number(row.timeSec)) ? Math.max(0, Math.floor(Number(row.timeSec))) : 0;
      const prev = bestByKey.get(nameKey);
      if (!prev || score > prev.score || (score === prev.score && timeSec > prev.timeSec)) {
        bestByKey.set(nameKey, { name, nameKey, score, timeSec });
      }
    }
    return Array.from(bestByKey.values())
      .sort((a, b) => b.score - a.score || b.timeSec - a.timeSec)
      .slice(0, 30);
  }

  class LeaderboardService {
    constructor() {
      this.db = null;
      this.cachedTop30 = [];
      this.source = 'local';
      this.permissionDenied = false;
      this._initFirebase();
      this.cachedTop30 = this._loadLocal();
    }

    _initFirebase() {
      try {
        if (!window.firebase || typeof window.firebase.firestore !== 'function') return;
        if (!window.firebase.apps || window.firebase.apps.length === 0) {
          window.firebase.initializeApp(FIREBASE_CONFIG);
        }
        this.db = window.firebase.firestore();
      } catch (_err) {
        this.db = null;
      }
    }

    getSavedNickname() {
      try {
        return window.localStorage.getItem(LAST_NICK_KEY) || '';
      } catch (_err) {
        return '';
      }
    }

    saveNickname(name) {
      try {
        window.localStorage.setItem(LAST_NICK_KEY, name);
      } catch (_err) {
        // ignore storage errors
      }
    }

    _loadLocal() {
      try {
        const raw = window.localStorage.getItem(LOCAL_RANK_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? normalizeRankList(parsed) : [];
      } catch (_err) {
        return [];
      }
    }

    _saveLocalEntry(name, score, timeSec) {
      const list = this._loadLocal();
      list.push({ name, nameKey: name.toLowerCase(), score, timeSec });
      const normalized = normalizeRankList(list);
      try {
        window.localStorage.setItem(LOCAL_RANK_KEY, JSON.stringify(normalized));
      } catch (_err) {
        // ignore storage errors
      }
      return normalized;
    }

    async fetchTop30() {
      if (!this.db) {
        this.source = 'local';
        this.cachedTop30 = this._loadLocal();
        return { rows: this.cachedTop30, source: this.source, permissionDenied: this.permissionDenied };
      }

      try {
        const snapshot = await this.db
          .collection(COLLECTION)
          .orderBy('score', 'desc')
          .limit(100)
          .get();

        const rawRows = snapshot.docs.map((doc) => doc.data());
        this.cachedTop30 = normalizeRankList(rawRows);
        this.source = 'firebase';
        this.permissionDenied = false;
        return { rows: this.cachedTop30, source: 'firebase', permissionDenied: false };
      } catch (err) {
        if (err && err.code === 'permission-denied') {
          this.permissionDenied = true;
        }
        this.source = 'local';
        this.cachedTop30 = this._loadLocal();
        return { rows: this.cachedTop30, source: 'local', permissionDenied: this.permissionDenied };
      }
    }

    async submitScore(rawName, score, timeSec) {
      const name = sanitizeNick(rawName);
      const nameKey = name.toLowerCase();
      const safeScore = Number.isFinite(score) ? Math.min(10000000, Math.max(0, Math.floor(score))) : 0;
      const safeTime = Number.isFinite(timeSec) ? Math.max(0, Math.floor(timeSec)) : 0;

      this.saveNickname(name);
      const localList = this._saveLocalEntry(name, safeScore, safeTime);

      if (!this.db) {
        this.cachedTop30 = localList;
        this.source = 'local';
        const rank = localList.findIndex((r) => r.nameKey === nameKey) + 1;
        return {
          ok: true,
          updated: true,
          alreadyHigher: false,
          existingScore: safeScore,
          rank: rank > 0 ? rank : null,
          source: 'local',
          permissionDenied: false,
          name,
          score: safeScore,
        };
      }

      try {
        const existingSnap = await this.db
          .collection(COLLECTION)
          .where('nameKey', '==', nameKey)
          .get();

        let highestDoc = null;
        let highestScore = -1;
        existingSnap.docs.forEach((doc) => {
          const d = doc.data();
          const s = Number(d && d.score) || 0;
          if (s >= highestScore) {
            highestScore = s;
            highestDoc = doc;
          }
        });

        if (highestDoc && highestScore >= safeScore) {
          await this.fetchTop30();
          const rank = this.cachedTop30.findIndex((r) => r.nameKey === nameKey) + 1;
          return {
            ok: true,
            updated: false,
            alreadyHigher: true,
            existingScore: highestScore,
            rank: rank > 0 ? rank : null,
            source: 'firebase',
            permissionDenied: false,
            name,
            score: safeScore,
          };
        }

        const payload = {
          name,
          nameKey,
          score: safeScore,
          timeSec: safeTime,
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        };

        if (highestDoc) {
          try {
            await highestDoc.ref.update(payload);
          } catch (_updateErr) {
            // If Firestore rules allow create-only without update, add a new doc; deduplication keeps highest
            await this.db.collection(COLLECTION).add(payload);
          }
        } else {
          await this.db.collection(COLLECTION).add(payload);
        }

        await this.fetchTop30();
        const rank = this.cachedTop30.findIndex((r) => r.nameKey === nameKey) + 1;
        return {
          ok: true,
          updated: true,
          alreadyHigher: false,
          existingScore: safeScore,
          rank: rank > 0 ? rank : null,
          source: 'firebase',
          permissionDenied: false,
          name,
          score: safeScore,
        };
      } catch (err) {
        if (err && err.code === 'permission-denied') {
          this.permissionDenied = true;
        }
        this.cachedTop30 = localList;
        this.source = 'local';
        const rank = localList.findIndex((r) => r.nameKey === nameKey) + 1;
        return {
          ok: true,
          updated: true,
          alreadyHigher: false,
          existingScore: safeScore,
          rank: rank > 0 ? rank : null,
          source: 'local',
          permissionDenied: this.permissionDenied,
          name,
          score: safeScore,
        };
      }
    }

    getProjectedRank(score) {
      const list = this.cachedTop30;
      if (!list || list.length === 0) return 1;
      let rank = 1;
      for (const row of list) {
        if (row.score > score) rank += 1;
      }
      return rank;
    }

    getNextRankTarget(currentScore) {
      const list = this.cachedTop30;
      if (!list || list.length === 0) return null;
      // Find the lowest-ranked entry whose score is strictly higher than currentScore
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].score > currentScore) {
          return {
            rank: i + 1,
            name: list[i].name,
            score: list[i].score,
            gap: list[i].score - currentScore,
            isFirstPlace: false,
          };
        }
      }
      return {
        rank: 1,
        name: list[0].name,
        score: list[0].score,
        gap: 0,
        isFirstPlace: true,
      };
    }
  }

  ns.Leaderboard = LeaderboardService;
})(window.Ssudam);
