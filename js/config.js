window.Ssudam = window.Ssudam || {};

(function (ns) {
  const WORLD_W = 1280;
  const WORLD_H = 800;

  const PLAZA = {
    left: 64,
    right: 1216,
    top: 238,
    bottom: 748,
  };

  const SMART_BIN = {
    x: 410,
    y: 204,
    width: 174,
    height: 76,
    autoRadius: 112,
    magnetRadius: 90,
  };

  const HUMAN_BIN = {
    x: 870,
    y: 204,
    width: 144,
    height: 82,
    autoRadius: 112,
    magnetRadius: 92,
  };

  const ROBOT = {
    startX: 640,
    startY: 500,
    radius: 34,
    speed: 300,
    feverSpeedMul: 1.28,
    armReach: 152,
    feverReachMul: 1.3,
    l1: 88,
    l2: 80,
  };

  const TRASH_TYPES = {
    bottle: {
      id: 'bottle',
      label: '플라스틱 병',
      binIndex: 1, // 플라스틱
      color: '#1E88E5',
      weight: 1.0,
      radius: 17,
    },
    can: {
      id: 'can',
      label: '알루미늄 캔',
      binIndex: 0, // 캔·병
      color: '#43A047',
      weight: 1.0,
      radius: 16,
    },
    paper: {
      id: 'paper',
      label: '커피컵·종이',
      binIndex: 2, // 종이류
      color: '#F9A825',
      weight: 1.0,
      radius: 17,
    },
    box: {
      id: 'box',
      label: '배달 박스',
      binIndex: 2,
      color: '#D97706',
      weight: 1.5,
      radius: 22,
    },
    bag: {
      id: 'bag',
      label: '대형 쓰레기봉투',
      binIndex: 1,
      color: '#334155',
      weight: 1.5,
      radius: 23,
    },
  };

  const STAGES = {
    stage1: {
      id: 'stage1',
      name: '🌅 출근길 수원역',
      theme: 'morning',
      duration: 65,
      endless: false,
      startLitterers: 1,
      maxLitterers: 4,
      maxCitizens: 5,
      spawnIntervalStart: 3.5,
      spawnIntervalEnd: 1.9,
      citizenSpawnInterval: 2.8,
      overloadLimit: 14,
      archetypes: { standard: 1.0, runner: 0.0, boss: 0.0 },
      starThresholds: [1600, 3000, 4600],
      nextStage: 'stage2',
      introBanner: '🌅 STAGE 1 · 출근길 수원역 청소 개시!',
    },
    stage2: {
      id: 'stage2',
      name: '☀️ 점심시간 수원역',
      theme: 'midday',
      duration: 75,
      endless: false,
      startLitterers: 2,
      maxLitterers: 7,
      maxCitizens: 7,
      spawnIntervalStart: 2.8,
      spawnIntervalEnd: 1.45,
      citizenSpawnInterval: 2.2,
      overloadLimit: 16,
      archetypes: { standard: 0.65, runner: 0.35, boss: 0.0 },
      starThresholds: [2800, 4800, 7200],
      nextStage: 'stage3',
      introBanner: '☀️ STAGE 2 · 질주형 무단투기자 등장!',
    },
    stage3: {
      id: 'stage3',
      name: '🌃 불금 야간 수원역',
      theme: 'night',
      duration: 90,
      endless: false,
      startLitterers: 3,
      maxLitterers: 10,
      maxCitizens: 8,
      spawnIntervalStart: 2.35,
      spawnIntervalEnd: 1.15,
      citizenSpawnInterval: 2.0,
      overloadLimit: 18,
      archetypes: { standard: 0.45, runner: 0.35, boss: 0.2 },
      starThresholds: [4500, 7800, 11500],
      nextStage: null,
      introBanner: '🌃 STAGE 3 · 불금 대형 투기 빌런 출현!',
    },
    endless: {
      id: 'endless',
      name: '♾️ 24시간 무한가동',
      theme: 'cycle',
      duration: 0,
      endless: true,
      startLitterers: 2,
      maxLitterersStart: 3,
      maxLitterers: 13,
      maxCitizens: 8,
      spawnIntervalStart: 3.0,
      spawnIntervalEnd: 0.95,
      citizenSpawnInterval: 2.1,
      overloadLimit: 18,
      archetypes: { standard: 0.48, runner: 0.34, boss: 0.18 },
      nextStage: null,
      introBanner: '♾️ 무한가동 모드 · 고장 날 때까지 수원역을 지켜라!',
    },
  };

  const SCORE = {
    trashAuto: 100,
    trashThrow: 150,
    culpritBinAuto: 250,
    culpritBinThrow: 400,
    culpritYeet: 300,
    bossBonus: 150,
  };

  const COMBO = {
    windowSec: 4.6,
    maxMultiplier: 3.0,
    step: 0.2,
  };

  const FEVER = {
    maxGauge: 100,
    durationSec: 8.0,
    trashGain: 12,
    culpritGain: 22,
    bossGain: 34,
  };

  const CULPRIT_BUBBLES = [
    '살려줘요!',
    '안 버릴게요!',
    '으아아악!',
    '이 로봇 뭐야?!',
    '잘못했어요!',
    '수원역 만세!',
  ];

  const STORAGE_KEY = 'ssudam_suwon_scores_v1';

  function loadScores() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_err) {
      return {};
    }
  }

  function saveStageScore(stageId, score, elapsedSec) {
    const scores = loadScores();
    const prev = scores[stageId] || { bestScore: 0, bestTime: 0 };
    const isNewRecord = score > (prev.bestScore || 0);
    scores[stageId] = {
      bestScore: Math.max(prev.bestScore || 0, score),
      bestTime: Math.max(prev.bestTime || 0, Math.floor(elapsedSec || 0)),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (_err) {
      // ignore quota / private mode storage errors
    }
    return isNewRecord;
  }

  function getViewportTransform(cssW, cssH) {
    const safeW = Math.max(1, cssW);
    const safeH = Math.max(1, cssH);
    const scale = Math.min(safeW / WORLD_W, safeH / WORLD_H);
    const drawnW = WORLD_W * scale;
    const drawnH = WORLD_H * scale;
    const offsetX = (safeW - drawnW) * 0.5;
    // On tall portrait viewports, push the arena slightly lower so the top HUD doesn't cover the station sign
    const extraH = safeH - drawnH;
    const offsetY = extraH > 110 ? Math.min(extraH * 0.44, 105 + (extraH - 110) * 0.35) : extraH * 0.5;
    return { scale, offsetX, offsetY, cssW: safeW, cssH: safeH };
  }

  ns.getViewportTransform = getViewportTransform;

  ns.CONFIG = {
    WORLD_W,
    WORLD_H,
    PLAZA,
    SMART_BIN,
    HUMAN_BIN,
    ROBOT,
    TRASH_TYPES,
    STAGES,
    SCORE,
    COMBO,
    FEVER,
    CULPRIT_BUBBLES,
    loadScores,
    saveStageScore,
  };
})(window.Ssudam);
