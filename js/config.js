window.Ssudam = window.Ssudam || {};

(function (ns) {
  const LANDSCAPE_LAYOUT = {
    mode: 'landscape',
    WORLD_W: 1280,
    WORLD_H: 800,
    PLAZA: { left: 64, right: 1216, top: 238, bottom: 748 },
    SMART_BIN: { x: 410, y: 204, width: 174, height: 76, autoRadius: 112, magnetRadius: 90 },
    HUMAN_BIN: { x: 870, y: 204, width: 144, height: 82, autoRadius: 112, magnetRadius: 92 },
    ROBOT_START: { x: 640, y: 500 },
  };

  const PORTRAIT_LAYOUT = {
    mode: 'portrait',
    WORLD_W: 720,
    WORLD_H: 1320,
    PLAZA: { left: 42, right: 678, top: 234, bottom: 892 },
    DECK_TOP: 928,
    SMART_BIN: { x: 215, y: 198, width: 164, height: 74, autoRadius: 112, magnetRadius: 90 },
    HUMAN_BIN: { x: 510, y: 198, width: 140, height: 80, autoRadius: 112, magnetRadius: 92 },
    ROBOT_START: { x: 360, y: 590 },
  };

  const WORLD_W = LANDSCAPE_LAYOUT.WORLD_W;
  const WORLD_H = LANDSCAPE_LAYOUT.WORLD_H;
  const PLAZA = LANDSCAPE_LAYOUT.PLAZA;
  const SMART_BIN = LANDSCAPE_LAYOUT.SMART_BIN;
  const HUMAN_BIN = LANDSCAPE_LAYOUT.HUMAN_BIN;

  const ROBOT = {
    startX: 640,
    startY: 500,
    radius: 34,
    speed: 305,
    feverSpeedMul: 1.28,
    armReach: 155,
    feverReachMul: 1.3,
    l1: 88,
    l2: 80,
  };

  const TRASH_VISUAL_SCALE = 1.5;

  const TRASH_TYPES = {
    tissue: { id: 'tissue', label: '휴지뭉치', binIndex: 2, color: '#e2e8f0', weight: 0.9, radius: 20 },
    leaf: { id: 'leaf', label: '낙엽', binIndex: 2, color: '#ea580c', weight: 0.85, radius: 20 },
    bottle: { id: 'bottle', label: '플라스틱 병', binIndex: 1, color: '#1E88E5', weight: 1.0, radius: 23 },
    can: { id: 'can', label: '알루미늄 캔', binIndex: 0, color: '#43A047', weight: 1.0, radius: 22 },
    paper: { id: 'paper', label: '서류·종이', binIndex: 2, color: '#F9A825', weight: 1.0, radius: 23 },
    coffee: { id: 'coffee', label: '커피컵', binIndex: 1, color: '#d97706', weight: 1.0, radius: 23 },
    necktie: { id: 'necktie', label: '넥타이', binIndex: 2, color: '#ef4444', weight: 1.0, radius: 23 },
    passport: { id: 'passport', label: '여권 (희귀)', binIndex: 2, color: '#1e3a8a', weight: 1.0, radius: 23, isRare: true },
    hat: { id: 'hat', label: '여행 모자', binIndex: 2, color: '#eab308', weight: 1.0, radius: 24 },
    ticket: { id: 'ticket', label: '기차표', binIndex: 2, color: '#38bdf8', weight: 0.9, radius: 20 },
    receipt: { id: 'receipt', label: '영수증', binIndex: 2, color: '#f1f5f9', weight: 0.85, radius: 20 },
    id_card: { id: 'id_card', label: '신분증 (희귀)', binIndex: 1, color: '#0284c7', weight: 1.0, radius: 22, isRare: true },
    soju: { id: 'soju', label: '빈 술병', binIndex: 0, color: '#16a34a', weight: 1.1, radius: 23 },
    skewer: { id: 'skewer', label: '꼬치·컵', binIndex: 2, color: '#f59e0b', weight: 1.0, radius: 22 },
    vomit: { id: 'vomit', label: '으악 토사물', binIndex: 2, color: '#a3e635', weight: 1.25, radius: 30, isSlippery: true },
    box: { id: 'box', label: '배달 박스', binIndex: 2, color: '#b45309', weight: 1.45, radius: 30 },
    flyer: { id: 'flyer', label: '전단지', binIndex: 2, color: '#ec4899', weight: 0.9, radius: 20 },
    energy_can: { id: 'energy_can', label: '에너지캔', binIndex: 0, color: '#22d3ee', weight: 1.0, radius: 22 },
    shopping_bag: { id: 'shopping_bag', label: '쇼핑백', binIndex: 2, color: '#a855f7', weight: 1.25, radius: 27 },
    bag: { id: 'bag', label: '대형 쓰레기봉투', binIndex: 1, color: '#334155', weight: 1.5, radius: 31 },
    candy: { id: 'candy', label: '할로윈 캔디', binIndex: 1, color: '#f43f5e', weight: 0.95, radius: 22 },
    pumpkin: { id: 'pumpkin', label: '미니 호박 (희귀)', binIndex: 2, color: '#f97316', weight: 1.2, radius: 26, isRare: true },
    skull_cup: { id: 'skull_cup', label: '해골 컵', binIndex: 1, color: '#e2e8f0', weight: 1.0, radius: 23 },
    witch_hat: { id: 'witch_hat', label: '마녀 모자', binIndex: 2, color: '#7e22ce', weight: 1.1, radius: 26 },
  };

  const STAGE_ORDER = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7', 'stage8'];

  const STAGES = {
    stage1: {
      id: 'stage1',
      stageNum: 1,
      name: '☀️ 1. 한가한 낮',
      theme: 'bright_day',
      isNight: false,
      costume: 'casual',
      duration: 55,
      endless: false,
      startLitterers: 2,
      maxLitterers: 5,
      maxCitizens: 5,
      spawnIntervalStart: 3.1,
      spawnIntervalEnd: 1.75,
      citizenSpawnInterval: 2.6,
      overloadLimit: 42,
      feverMaxGauge: 100,
      archetypes: { standard: 1.0, runner: 0.0, boss: 0.0 },
      trashPool: ['tissue', 'leaf', 'bottle', 'can'],
      starThresholds: [1800, 3200, 5000],
      nextStage: 'stage2',
      introBanner: '☀️ STAGE 1 · 한가한 낮의 수원역! 휴지와 낙엽을 치워주세요!',
    },
    stage2: {
      id: 'stage2',
      stageNum: 2,
      name: '💼 2. 출근시간',
      theme: 'commute_day',
      isNight: false,
      costume: 'office',
      duration: 60,
      endless: false,
      startLitterers: 2,
      maxLitterers: 6,
      maxCitizens: 6,
      spawnIntervalStart: 2.7,
      spawnIntervalEnd: 1.5,
      citizenSpawnInterval: 2.3,
      overloadLimit: 44,
      feverMaxGauge: 115,
      archetypes: { standard: 0.72, runner: 0.28, boss: 0.0 },
      trashPool: ['coffee', 'coffee', 'necktie', 'paper', 'bottle', 'tissue'],
      starThresholds: [2500, 4400, 6800],
      nextStage: 'stage3',
      introBanner: '💼 STAGE 2 · 바쁜 출근길! 커피컵과 날아간 넥타이를 수거하세요!',
    },
    stage3: {
      id: 'stage3',
      stageNum: 3,
      name: '🧳 3. 여행 가는 사람들',
      theme: 'afternoon',
      isNight: false,
      costume: 'traveler',
      duration: 65,
      endless: false,
      startLitterers: 3,
      maxLitterers: 7,
      maxCitizens: 7,
      spawnIntervalStart: 2.45,
      spawnIntervalEnd: 1.35,
      citizenSpawnInterval: 2.2,
      overloadLimit: 46,
      feverMaxGauge: 130,
      archetypes: { standard: 0.62, runner: 0.38, boss: 0.0 },
      trashPool: ['hat', 'ticket', 'can', 'bottle', 'passport'],
      rareWeight: 0.17,
      starThresholds: [3200, 5600, 8400],
      nextStage: 'stage4',
      introBanner: '🧳 STAGE 3 · 설레는 여행길! ✨반짝이는 여권은 2배 점수!',
    },
    stage4: {
      id: 'stage4',
      stageNum: 4,
      name: '🌇 4. 퇴근시간',
      theme: 'sunset',
      isNight: false,
      costume: 'tired_office',
      duration: 70,
      endless: false,
      startLitterers: 3,
      maxLitterers: 8,
      maxCitizens: 7,
      spawnIntervalStart: 2.25,
      spawnIntervalEnd: 1.25,
      citizenSpawnInterval: 2.1,
      overloadLimit: 48,
      feverMaxGauge: 145,
      archetypes: { standard: 0.54, runner: 0.36, boss: 0.1 },
      trashPool: ['necktie', 'coffee', 'receipt', 'box', 'bag'],
      starThresholds: [4000, 6800, 10200],
      nextStage: 'stage5',
      introBanner: '🌇 STAGE 4 · 노을 지는 퇴근길! 지친 직장인들 사이 쓰레기 급증!',
    },
    stage5: {
      id: 'stage5',
      stageNum: 5,
      name: '🌆 5. 술마시러 가는 길',
      theme: 'dusk',
      isNight: true,
      costume: 'evening_out',
      duration: 75,
      endless: false,
      startLitterers: 3,
      maxLitterers: 9,
      maxCitizens: 7,
      spawnIntervalStart: 2.1,
      spawnIntervalEnd: 1.15,
      citizenSpawnInterval: 2.0,
      overloadLimit: 50,
      feverMaxGauge: 160,
      archetypes: { standard: 0.5, runner: 0.36, boss: 0.14 },
      trashPool: ['soju', 'skewer', 'tissue', 'can', 'id_card'],
      rareWeight: 0.17,
      starThresholds: [4800, 8200, 12000],
      nextStage: 'stage6',
      introBanner: '🌆 STAGE 5 · 해가 진 야간 출동! 형광복 조력자 & ✨신분증 2배!',
    },
    stage6: {
      id: 'stage6',
      stageNum: 6,
      name: '🍻 6. 술취해서 텐션 UP',
      theme: 'night_early',
      isNight: true,
      costume: 'drunk',
      duration: 80,
      endless: false,
      startLitterers: 4,
      maxLitterers: 10,
      maxCitizens: 7,
      spawnIntervalStart: 1.95,
      spawnIntervalEnd: 1.05,
      citizenSpawnInterval: 2.0,
      overloadLimit: 52,
      feverMaxGauge: 180,
      archetypes: { standard: 0.48, runner: 0.34, boss: 0.18 },
      trashPool: ['necktie', 'soju', 'soju', 'vomit', 'vomit', 'box', 'tissue'],
      starThresholds: [5800, 9600, 14000],
      nextStage: 'stage7',
      introBanner: '🍻 STAGE 6 · 머리띠 넥타이 취객 주의! 토사물 밟으면 미끌~!',
    },
    stage7: {
      id: 'stage7',
      stageNum: 7,
      name: '🎆 7. 불금 수원역',
      theme: 'friday_neon',
      isNight: true,
      costume: 'stylish',
      duration: 85,
      endless: false,
      startLitterers: 4,
      maxLitterers: 11,
      maxCitizens: 8,
      spawnIntervalStart: 1.8,
      spawnIntervalEnd: 0.96,
      citizenSpawnInterval: 1.9,
      overloadLimit: 54,
      feverMaxGauge: 200,
      archetypes: { standard: 0.4, runner: 0.38, boss: 0.22 },
      trashPool: ['flyer', 'energy_can', 'shopping_bag', 'soju', 'bag'],
      starThresholds: [7000, 11500, 16500],
      nextStage: 'stage8',
      introBanner: '🎆 STAGE 7 · 네온 빛나는 불금! 멋부린 인파 속 대청소!',
    },
    stage8: {
      id: 'stage8',
      stageNum: 8,
      name: '🎃 8. 할로윈 파티',
      theme: 'halloween',
      isNight: true,
      costume: 'halloween',
      duration: 95,
      endless: false,
      startLitterers: 4,
      maxLitterers: 12,
      maxCitizens: 8,
      spawnIntervalStart: 1.65,
      spawnIntervalEnd: 0.88,
      citizenSpawnInterval: 1.9,
      overloadLimit: 56,
      feverMaxGauge: 220,
      archetypes: { standard: 0.36, runner: 0.4, boss: 0.24 },
      trashPool: ['candy', 'skull_cup', 'witch_hat', 'bag', 'pumpkin'],
      rareWeight: 0.18,
      starThresholds: [8500, 13800, 19500],
      nextStage: null,
      introBanner: '🎃 FINAL STAGE 8 · 할로윈 수원역! 투명 유령 & 호박 보스 출현!',
    },
    endless: {
      id: 'endless',
      stageNum: 0,
      name: '♾️ 24시간 무한가동 (경쟁전)',
      theme: 'cycle',
      isNight: false,
      costume: 'cycle',
      duration: 0,
      endless: true,
      startLitterers: 3,
      maxLitterersStart: 4,
      maxLitterers: 14,
      maxCitizens: 8,
      spawnIntervalStart: 2.5,
      spawnIntervalEnd: 0.85,
      citizenSpawnInterval: 2.0,
      overloadLimit: 54,
      feverMaxGauge: 115,
      archetypes: { standard: 0.45, runner: 0.35, boss: 0.2 },
      trashPool: Object.keys(TRASH_TYPES),
      rareWeight: 0.15,
      nextStage: null,
      introBanner: '♾️ 24시간 무한가동 (경쟁전) · 1~8단계 테마 순환! 최고 순위에 도전!',
    },
  };

  const SKILLS = {
    vacuumMax: 3,
    vacuumStart: 2,
    vacuumDuration: 5.0,
    vacuumDropChance: 0.1,
    vacuumRadius: 48,
    vacuumFeverRadius: 58,
    helperMax: 2,
    helperStart: 1,
    helperDropChance: 0.01,
    helperCount: 7,
    helperSpeed: 365,
  };

  const SCORE = {
    trashAuto: 100,
    trashThrow: 150,
    culpritBinAuto: 250,
    culpritBinThrow: 400,
    culpritYeet: 300,
    bossBonus: 180,
  };

  const COMBO = {
    windowSec: 4.8,
    maxMultiplier: 3.0,
    step: 0.2,
  };

  const FEVER = {
    durationSec: 8.0,
    trashGain: 14,
    culpritGain: 24,
    bossGain: 38,
  };

  const CULPRIT_BUBBLES = [
    '살려줘요!',
    '안 버릴게요!',
    '으아아악!',
    '이 로봇 뭐야?!',
    '잘못했어요!',
    '수원역 만세!',
  ];

  const DRUNK_BUBBLES = [
    '어~ 기사양반 수원역이야~?',
    '한 잔만 더~~!',
    '내 넥타이 어디갔어?!',
    '딸꾹! 나 안 취했어~',
  ];

  const ANGRY_BUBBLES = [
    '뭐하는 거야!! 이 고철!!',
    '나 안 버렸거든?! 받아라!!',
    '이 로봇 미쳤나!!',
  ];

  const STORAGE_KEY_V2 = 'ssudam_suwon_scores_v2';
  const STORAGE_KEY_V1 = 'ssudam_suwon_scores_v1';

  function loadProgress() {
    const base = { unlockedStage: 1, stages: {} };
    try {
      const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
      if (rawV2) {
        const parsed = JSON.parse(rawV2);
        if (parsed && typeof parsed === 'object') {
          base.unlockedStage = Math.max(1, Math.min(8, Number(parsed.unlockedStage) || 1));
          base.stages = parsed.stages && typeof parsed.stages === 'object' ? parsed.stages : {};
          return base;
        }
      }
      // Safe fallback migration from v1 endless score if present
      const rawV1 = window.localStorage.getItem(STORAGE_KEY_V1);
      if (rawV1) {
        const old = JSON.parse(rawV1);
        if (old && old.endless) {
          base.stages.endless = old.endless;
        }
      }
    } catch (_err) {
      // ignore storage errors
    }
    return base;
  }

  function saveStageResult(stageId, score, elapsedSec, cleared, starCount) {
    const progress = loadProgress();
    const stageCfg = STAGES[stageId];
    const prev = progress.stages[stageId] || { bestScore: 0, bestTime: 0, bestStars: 0 };
    const isNewRecord = score > (prev.bestScore || 0);

    progress.stages[stageId] = {
      bestScore: Math.max(prev.bestScore || 0, score),
      bestTime: Math.max(prev.bestTime || 0, Math.floor(elapsedSec || 0)),
      bestStars: Math.max(prev.bestStars || 0, cleared ? starCount || 1 : 0),
    };

    let newlyUnlockedStage = null;
    if (cleared && stageCfg && stageCfg.stageNum >= 1 && stageCfg.stageNum < 8) {
      const nextNum = stageCfg.stageNum + 1;
      if (nextNum > progress.unlockedStage) {
        progress.unlockedStage = nextNum;
        newlyUnlockedStage = nextNum;
      }
    }

    try {
      window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(progress));
    } catch (_err) {
      // ignore storage errors
    }
    return { isNewRecord, newlyUnlockedStage };
  }

  function getLayoutForViewport(cssW, cssH) {
    const safeW = Math.max(1, cssW);
    const safeH = Math.max(1, cssH);
    return safeW / safeH < 0.92 ? PORTRAIT_LAYOUT : LANDSCAPE_LAYOUT;
  }

  function getViewportTransform(cssW, cssH, layoutOverride = null) {
    const safeW = Math.max(1, cssW);
    const safeH = Math.max(1, cssH);
    const layout = layoutOverride || getLayoutForViewport(safeW, safeH);
    const w = layout.WORLD_W;
    const h = layout.WORLD_H;

    if (layout.mode === 'portrait') {
      const topReserve = Math.min(138, safeH * 0.19);
      const scale = Math.min(safeW / w, Math.max(100, safeH - topReserve) / h);
      const drawnW = w * scale;
      const drawnH = h * scale;
      const offsetX = (safeW - drawnW) * 0.5;
      const offsetY = Math.max(topReserve, safeH - drawnH);
      return { scale, offsetX, offsetY, cssW: safeW, cssH: safeH, layout };
    }

    const scale = Math.min(safeW / w, safeH / h);
    const drawnW = w * scale;
    const drawnH = h * scale;
    const offsetX = (safeW - drawnW) * 0.5;
    const offsetY = (safeH - drawnH) * 0.5;
    return { scale, offsetX, offsetY, cssW: safeW, cssH: safeH, layout };
  }

  function getTouchControlMetrics(cssW, cssH, layoutOverride = null) {
    const safeW = Math.max(1, cssW);
    const safeH = Math.max(1, cssH);
    const layout = layoutOverride || getLayoutForViewport(safeW, safeH);

    if (layout.mode === 'portrait') {
      const vp = getViewportTransform(safeW, safeH, layout);
      const deckWorldY = layout.DECK_TOP || 928;
      const deckTopCss = vp.offsetY + deckWorldY * vp.scale;
      const isShort = safeH <= 700;
      const skillEstH = isShort ? 44 : 54;
      const skillTopGap = isShort ? 5 : 8;
      const skillBottomCss = deckTopCss + skillTopGap + skillEstH;
      const skillDockBottom = Math.max(96, Math.round(safeH - skillBottomCss));

      const lowerTop = skillBottomCss + (isShort ? 4 : 6);
      const lowerBottom = safeH - (isShort ? 4 : 8);
      const lowerH = Math.max(88, lowerBottom - lowerTop);
      const padY = Math.round((lowerTop + lowerBottom) * 0.5);

      const joyOuterR = Math.round(Math.max(46, Math.min(68, Math.min(lowerH * 0.45, safeW * 0.165))));
      const joyKnobR = Math.round(joyOuterR * 0.43);
      const actR = Math.max(44, joyOuterR - 2);
      const joyX = Math.round(safeW * 0.28);
      const actX = Math.round(safeW * 0.72);

      return {
        mode: 'portrait',
        deckTopCss,
        skillDockBottom,
        joyX,
        joyY: padY,
        joyOuterR,
        joyKnobR,
        actX,
        actY: padY,
        actR,
        midSplitX: safeW * 0.5,
      };
    }

    const joyOuterR = safeW < 900 ? 58 : 66;
    const joyKnobR = Math.round(joyOuterR * 0.43);
    const actR = safeW < 900 ? 55 : 62;
    const joyX = Math.round(Math.max(joyOuterR + 36, Math.min(safeW * 0.21, safeW * 0.5 - 245)));
    const actX = Math.round(safeW - joyX);
    const padY = Math.round(safeH - (joyOuterR + 34));

    return {
      mode: 'landscape',
      deckTopCss: null,
      skillDockBottom: null,
      joyX,
      joyY: padY,
      joyOuterR,
      joyKnobR,
      actX,
      actY: padY,
      actR,
      midSplitX: safeW * 0.5,
    };
  }

  ns.getLayoutForViewport = getLayoutForViewport;
  ns.getViewportTransform = getViewportTransform;
  ns.getTouchControlMetrics = getTouchControlMetrics;

  ns.CONFIG = {
    LANDSCAPE_LAYOUT,
    PORTRAIT_LAYOUT,
    WORLD_W,
    WORLD_H,
    PLAZA,
    SMART_BIN,
    HUMAN_BIN,
    ROBOT,
    TRASH_VISUAL_SCALE,
    TRASH_TYPES,
    STAGE_ORDER,
    STAGES,
    SKILLS,
    SCORE,
    COMBO,
    FEVER,
    CULPRIT_BUBBLES,
    DRUNK_BUBBLES,
    ANGRY_BUBBLES,
    loadProgress,
    saveStageResult,
  };
})(window.Ssudam);
