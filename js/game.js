window.Ssudam = window.Ssudam || {};

(function (ns) {
  const {
    ROBOT,
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
  } = ns.CONFIG;

  const SHIRT_COLORS_MALE = ['#3b82f6', '#0284c7', '#14b8a6', '#f97316', '#64748b', '#1d4ed8'];
  const SHIRT_COLORS_FEMALE = ['#ec4899', '#8b5cf6', '#f43f5e', '#06b6d4', '#f59e0b', '#10b981'];
  const HAIR_COLORS = ['#1e293b', '#451a03', '#78350f', '#334155', '#713f12'];
  const FEMALE_HAIR_STYLES = ['long', 'ponytail', 'bob'];
  const HALLOWEEN_VARIANTS = ['witch', 'pumpkin_head', 'ghost', 'dracula'];

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  class SsudamGame {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.renderer = new ns.Renderer(this.canvas);
      this.audio = new ns.Audio();
      this.leaderboard = new ns.Leaderboard();

      this.dom = {
        topCornerNav: document.getElementById('top-corner-nav'),
        btnOpenRanking: document.getElementById('btn-open-ranking'),
        hud: document.getElementById('hud'),
        hudStage: document.getElementById('hud-stage'),
        hudTimer: document.getElementById('hud-timer'),
        hudNextRank: document.getElementById('hud-next-rank'),
        hudScore: document.getElementById('hud-score'),
        hudCombo: document.getElementById('hud-combo'),
        hudOverloadBox: document.getElementById('hud-overload-box'),
        hudOverloadText: document.getElementById('hud-overload-text'),
        hudOverloadFill: document.getElementById('hud-overload-fill'),
        hudFeverBox: document.getElementById('hud-fever-box'),
        hudFeverText: document.getElementById('hud-fever-text'),
        hudFeverFill: document.getElementById('hud-fever-fill'),
        btnMute: document.getElementById('btn-mute'),
        btnPause: document.getElementById('btn-pause'),
        skillDock: document.getElementById('skill-dock'),
        btnVacuum: document.getElementById('btn-skill-vacuum'),
        vacuumCount: document.getElementById('vacuum-count'),
        vacuumActiveBar: document.getElementById('vacuum-active-bar'),
        btnHelper: document.getElementById('btn-skill-helper'),
        helperCount: document.getElementById('helper-count'),
        toast: document.getElementById('toast-banner'),
        hofName: document.getElementById('hof-name'),
        hofScore: document.getElementById('hof-score'),
        overlayTitle: document.getElementById('overlay-title'),
        overlayPause: document.getElementById('overlay-pause'),
        overlayClear: document.getElementById('overlay-clear'),
        overlayGameOver: document.getElementById('overlay-gameover'),
        overlayRanking: document.getElementById('overlay-ranking'),
        btnCloseRanking: document.getElementById('btn-close-ranking'),
        rankingSourceBadge: document.getElementById('ranking-source-badge'),
        rankingRuleNote: document.getElementById('ranking-rule-note'),
        rankingScrollArea: document.getElementById('ranking-scroll-area'),
        rankingList: document.getElementById('ranking-list'),
        clearTitle: document.getElementById('clear-title'),
        clearStars: document.getElementById('clear-stars'),
        clearScore: document.getElementById('clear-score'),
        clearTrash: document.getElementById('clear-trash'),
        clearCulprits: document.getElementById('clear-culprits'),
        clearMaxCombo: document.getElementById('clear-max-combo'),
        clearNewRecord: document.getElementById('clear-new-record'),
        clearUnlockBadge: document.getElementById('clear-unlock-badge'),
        btnNextStage: document.getElementById('btn-next-stage'),
        btnRetryClear: document.getElementById('btn-retry-clear'),
        btnMenuClear: document.getElementById('btn-menu-clear'),
        goTitle: document.getElementById('go-title'),
        goSubtitle: document.getElementById('go-subtitle'),
        goScore: document.getElementById('go-score'),
        goTime: document.getElementById('go-time'),
        goTrash: document.getElementById('go-trash'),
        goCulprits: document.getElementById('go-culprits'),
        goMaxCombo: document.getElementById('go-max-combo'),
        goNewRecord: document.getElementById('go-new-record'),
        rankSubmitBox: document.getElementById('rank-submit-box'),
        rankSubmitTitle: document.getElementById('rank-submit-title'),
        rankNickname: document.getElementById('rank-nickname'),
        btnSubmitRank: document.getElementById('btn-submit-rank'),
        rankSubmitStatus: document.getElementById('rank-submit-status'),
        btnRetryGo: document.getElementById('btn-retry-go'),
        btnViewRankingGo: document.getElementById('btn-view-ranking-go'),
        btnMenuGo: document.getElementById('btn-menu-go'),
        btnResume: document.getElementById('btn-resume'),
        btnRestartPause: document.getElementById('btn-restart-pause'),
        btnMenuPause: document.getElementById('btn-menu-pause'),
        bestEndless: document.getElementById('best-endless'),
      };

      this.input = new ns.Input(this.canvas, {
        isHolding: () => this.robot.held !== null,
        onUnlockAudio: () => this.audio.unlock(),
        onTogglePause: () => this.togglePause(),
        onUseVacuum: () => this.activateVacuum(),
        onUseHelper: () => this.activateHelper(),
        onPcGrab: (wx, wy) => this.handleGrabAction(wx, wy, true),
        onPcThrow: (wx, wy, power) => this.handlePcThrow(wx, wy, power),
        onTouchActionStart: () => this.handleTouchActionStart(),
        onTouchActionEnd: (wasDragged, dragAim) => this.handleTouchActionEnd(wasDragged, dragAim),
      });

      this.mode = 'TITLE'; // TITLE | PLAYING | PAUSED | STAGE_CLEAR | BREAKING_DOWN | GAME_OVER
      this.currentStageId = 'stage1';
      this.stage = STAGES.stage1;
      this.nextId = 1;

      this.time = 0;
      this.elapsed = 0;
      this.score = 0;
      this.comboCount = 0;
      this.comboTimer = 0;
      this.maxCombo = 0;
      this.trashCleared = 0;
      this.culpritsHandled = 0;

      this.feverGauge = 0;
      this.feverActive = false;
      this.feverTimer = 0;

      // Skills state
      this.vacuumCharges = SKILLS.vacuumStart;
      this.vacuumTimer = 0;
      this.helperCharges = SKILLS.helperStart;
      this.helpers = [];
      this.helperDustTimer = 0;

      this.overloadRatio = 0;
      this.breakdownTimer = 0;
      this.smokeTimer = 0;
      this.toastTimer = 0;

      this.littererSpawnTimer = 1.2;
      this.citizenSpawnTimer = 1.0;

      this.shake = { x: 0, y: 0, trauma: 0 };
      this.layout = ns.getLayoutForViewport(this.renderer.cssW, this.renderer.cssH);
      this.smartBin = {
        x: this.layout.SMART_BIN.x,
        y: this.layout.SMART_BIN.y,
        width: this.layout.SMART_BIN.width,
        height: this.layout.SMART_BIN.height,
        bounce: 0,
        flashIndex: 0,
        flashTimer: 0,
      };
      this.humanBin = {
        x: this.layout.HUMAN_BIN.x,
        y: this.layout.HUMAN_BIN.y,
        width: this.layout.HUMAN_BIN.width,
        height: this.layout.HUMAN_BIN.height,
        bounce: 0,
        lidOpen: 0,
        slamTimer: 0,
      };

      this.robot = this._createRobot();
      this.trashes = [];
      this.people = [];
      this.particles = [];
      this.popups = [];
      this._hudCache = {};

      this._bindUI();
      this._syncLayout(false);
      this._refreshTitleScores();
      this._refreshGlobalRankings();
      this._seedIdleScene();

      window.addEventListener('resize', () => {
        this.renderer.resize();
        this._syncLayout(true);
      });
      this._lastFrame = performance.now();
      requestAnimationFrame((now) => this._loop(now));
    }

    _syncLayout(clampEntities = true) {
      const nextLayout = ns.getLayoutForViewport(this.renderer.cssW, this.renderer.cssH);
      const changed = !this.layout || this.layout.mode !== nextLayout.mode;
      this.layout = nextLayout;
      document.body.dataset.layout = nextLayout.mode;

      const metrics = ns.getTouchControlMetrics(this.renderer.cssW, this.renderer.cssH, nextLayout);
      if (this.dom && this.dom.skillDock) {
        if (metrics.skillDockBottom !== null) {
          this.dom.skillDock.style.setProperty('--skill-dock-bottom', `${metrics.skillDockBottom}px`);
        } else {
          this.dom.skillDock.style.removeProperty('--skill-dock-bottom');
        }
      }

      this.smartBin.x = nextLayout.SMART_BIN.x;
      this.smartBin.y = nextLayout.SMART_BIN.y;
      this.smartBin.width = nextLayout.SMART_BIN.width;
      this.smartBin.height = nextLayout.SMART_BIN.height;

      this.humanBin.x = nextLayout.HUMAN_BIN.x;
      this.humanBin.y = nextLayout.HUMAN_BIN.y;
      this.humanBin.width = nextLayout.HUMAN_BIN.width;
      this.humanBin.height = nextLayout.HUMAN_BIN.height;

      if (changed && clampEntities && this.robot) {
        const P = nextLayout.PLAZA;
        this.robot.x = clamp(this.robot.x, P.left + 26, P.right - 26);
        this.robot.y = clamp(this.robot.y, P.top + 32, P.bottom - 24);
        for (const tr of this.trashes) {
          tr.x = clamp(tr.x, P.left + 20, P.right - 20);
          tr.y = clamp(tr.y, P.top + 30, P.bottom - 20);
        }
        for (const p of this.people) {
          if (p.yeetFlying) continue;
          p.x = clamp(p.x, P.left + 25, P.right - 25);
          p.y = clamp(p.y, P.top + 35, P.bottom - 25);
          if (typeof p.targetX === 'number') {
            p.targetX = clamp(p.targetX, P.left + 40, P.right - 40);
            p.targetY = clamp(p.targetY, P.top + 40, P.bottom - 40);
          }
        }
      }
    }

    _createRobot() {
      const startX = this.layout && this.layout.ROBOT_START ? this.layout.ROBOT_START.x : ROBOT.startX;
      const startY = this.layout && this.layout.ROBOT_START ? this.layout.ROBOT_START.y : ROBOT.startY;
      return {
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        facingX: 0,
        facingY: -1,
        wheelAngle: 0,
        eyeMode: 'normal',
        eyeOverrideTimer: 0,
        blink: false,
        blinkTimer: 2.5,
        handX: startX + 44,
        handY: startY - 30,
        armStrikeTimer: 0,
        strikeX: startX + 44,
        strikeY: startY - 30,
        gripperOpen: 1,
        reachRadius: ROBOT.armReach,
        held: null,
        innocentDropTimer: 0,
        stunTimer: 0,
        slipTimer: 0,
        slipCooldown: 0,
        slipVx: 0,
        slipVy: 0,
      };
    }

    _bindUI() {
      const stageCards = document.querySelectorAll('.stage-card[data-stage]');
      stageCards.forEach((btn) => {
        btn.addEventListener('click', () => {
          const sid = btn.dataset.stage;
          if (btn.classList.contains('locked') || btn.disabled) return;
          this.audio.unlock();
          this.startStage(sid);
        });
      });

      this.dom.btnMute.addEventListener('click', () => {
        this.dom.btnMute.blur();
        const muted = this.audio.toggleMute();
        this.dom.btnMute.textContent = muted ? '🔇' : '🔊';
      });

      this.dom.btnPause.addEventListener('click', () => {
        this.dom.btnPause.blur();
        this.togglePause();
      });
      this.dom.btnResume.addEventListener('click', () => this.togglePause());
      this.dom.btnRestartPause.addEventListener('click', () => this.startStage(this.currentStageId));
      this.dom.btnMenuPause.addEventListener('click', () => this.returnToTitle());

      this.dom.btnNextStage.addEventListener('click', () => {
        if (this.stage.nextStage) {
          this.startStage(this.stage.nextStage);
        }
      });
      this.dom.btnRetryClear.addEventListener('click', () => this.startStage(this.currentStageId));
      this.dom.btnMenuClear.addEventListener('click', () => this.returnToTitle());

      this.dom.btnRetryGo.addEventListener('click', () => this.startStage(this.currentStageId));
      this.dom.btnMenuGo.addEventListener('click', () => this.returnToTitle());
      this.dom.btnViewRankingGo.addEventListener('click', () => this.openRankingModal());
      this.dom.btnOpenRanking.addEventListener('click', () => this.openRankingModal());
      this.dom.btnCloseRanking.addEventListener('click', () => this.closeRankingModal());
      this.dom.overlayRanking.addEventListener('click', (e) => {
        if (e.target === this.dom.overlayRanking) this.closeRankingModal();
      });
      this.dom.btnSubmitRank.addEventListener('click', () => this._handleRankSubmit());
      this.dom.rankNickname.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') this._handleRankSubmit();
      });

      this._setupDragScroll(this.dom.rankingScrollArea);

      // Skill buttons (prevent touch propagation to canvas)
      this.dom.btnVacuum.addEventListener(
        'touchstart',
        (e) => {
          e.stopPropagation();
        },
        { passive: true }
      );
      this.dom.btnHelper.addEventListener(
        'touchstart',
        (e) => {
          e.stopPropagation();
        },
        { passive: true }
      );
      this.dom.btnVacuum.addEventListener('click', () => {
        this.dom.btnVacuum.blur();
        this.audio.unlock();
        this.activateVacuum();
      });
      this.dom.btnHelper.addEventListener('click', () => {
        this.dom.btnHelper.blur();
        this.audio.unlock();
        this.activateHelper();
      });
    }

    _refreshTitleScores() {
      const progress = ns.CONFIG.loadProgress();
      const unlocked = progress.unlockedStage || 1;

      STAGE_ORDER.forEach((sid) => {
        const cfg = STAGES[sid];
        const card = document.querySelector(`.stage-card[data-stage="${sid}"]`);
        const bestEl = document.getElementById(`best-${sid}`);
        const starsEl = document.getElementById(`stars-${sid}`);
        const lockEl = card ? card.querySelector('.stage-lock') : null;
        const rec = progress.stages[sid] || {};
        const isLocked = cfg.stageNum > unlocked;

        if (card) {
          card.classList.toggle('locked', isLocked);
          card.disabled = isLocked;
        }
        if (lockEl) {
          lockEl.classList.toggle('hidden', !isLocked);
        }
        if (bestEl) {
          bestEl.textContent = rec.bestScore ? `최고: ${rec.bestScore.toLocaleString()}점` : '최고: 0점';
        }
        if (starsEl) {
          const st = rec.bestStars || 0;
          starsEl.textContent = '★'.repeat(st) + '☆'.repeat(3 - st);
        }
      });

      const endRec = progress.stages.endless || {};
      if (!endRec.bestScore) {
        this.dom.bestEndless.textContent = '최고: 0점';
      } else if (endRec.bestTime) {
        this.dom.bestEndless.textContent = `최고: ${endRec.bestScore.toLocaleString()}점 (${formatTime(endRec.bestTime)})`;
      } else {
        this.dom.bestEndless.textContent = `최고: ${endRec.bestScore.toLocaleString()}점`;
      }
    }

    _seedIdleScene() {
      this.trashes = [];
      this.people = [];
      this.helpers = [];
      for (let i = 0; i < 5; i++) {
        this._spawnCitizen(true);
      }
    }

    _hideAllOverlays() {
      this.dom.overlayTitle.classList.add('hidden');
      this.dom.overlayPause.classList.add('hidden');
      this.dom.overlayClear.classList.add('hidden');
      this.dom.overlayGameOver.classList.add('hidden');
    }

    returnToTitle() {
      this.mode = 'TITLE';
      this.input.setPaused(true);
      this._hideAllOverlays();
      this.dom.hud.classList.add('hidden');
      this.dom.skillDock.classList.add('hidden');
      this.dom.toast.classList.add('hidden');
      this.dom.topCornerNav.classList.remove('hidden');
      this.dom.overlayTitle.classList.remove('hidden');
      this.robot = this._createRobot();
      this.particles = [];
      this.popups = [];
      this._seedIdleScene();
      this._refreshTitleScores();
      this._refreshGlobalRankings();
    }

    startStage(stageId) {
      const stageCfg = STAGES[stageId] || STAGES.stage1;
      const progress = ns.CONFIG.loadProgress();
      if (!stageCfg.endless && stageCfg.stageNum > progress.unlockedStage) {
        return;
      }

      this.currentStageId = stageCfg.id;
      this.stage = stageCfg;
      this.mode = 'PLAYING';
      this._syncLayout(false);
      this.input.setPaused(false);
      this.input.resetTransient();

      this._hideAllOverlays();
      this.dom.topCornerNav.classList.add('hidden');
      this.dom.hud.classList.remove('hidden');
      this.dom.skillDock.classList.remove('hidden');
      this._lastTargetedRank = null;
      if (this.stage.endless) {
        this._refreshGlobalRankings();
      }

      this.elapsed = 0;
      this.score = 0;
      this.comboCount = 0;
      this.comboTimer = 0;
      this.maxCombo = 0;
      this.trashCleared = 0;
      this.culpritsHandled = 0;
      this.feverGauge = 0;
      this.feverActive = false;
      this.feverTimer = 0;

      this.vacuumCharges = SKILLS.vacuumStart;
      this.vacuumTimer = 0;
      this.helperCharges = SKILLS.helperStart;
      this.helpers = [];
      this.helperDustTimer = 0;

      this.overloadRatio = 0;
      this.breakdownTimer = 0;
      this.shake.trauma = 0;

      this.robot = this._createRobot();
      this.trashes = [];
      this.people = [];
      this.particles = [];
      this.popups = [];
      this._hudCache = {};

      this.smartBin.bounce = 0;
      this.smartBin.flashTimer = 0;
      this.humanBin.bounce = 0;
      this.humanBin.lidOpen = 0;
      this.humanBin.slamTimer = 0;

      for (let i = 0; i < this.stage.startLitterers; i++) {
        this._spawnLitterer(i === 0);
      }
      for (let i = 0; i < Math.min(3, this.stage.maxCitizens); i++) {
        this._spawnCitizen(true);
      }
      this.littererSpawnTimer = 2.1;
      this.citizenSpawnTimer = 1.6;

      this.dom.hudStage.textContent = this.stage.name;
      this._showToast(this.stage.introBanner, '', 2.8);
      this._syncHud();
    }

    togglePause() {
      if (!this.dom.overlayRanking.classList.contains('hidden')) {
        this.closeRankingModal();
        return;
      }
      if (this.mode === 'PLAYING') {
        this.mode = 'PAUSED';
        this.input.setPaused(true);
        this.dom.topCornerNav.classList.remove('hidden');
        this.dom.overlayPause.classList.remove('hidden');
      } else if (this.mode === 'PAUSED') {
        this.mode = 'PLAYING';
        this.input.setPaused(false);
        this.dom.overlayRanking.classList.add('hidden');
        this.dom.topCornerNav.classList.add('hidden');
        this.dom.overlayPause.classList.add('hidden');
      }
    }

    _showToast(text, variant = '', duration = 2.2) {
      this.dom.toast.textContent = text;
      this.dom.toast.className = `toast-banner ${variant}`.trim();
      this.toastTimer = duration;
    }

    _getCurrentStageContext() {
      if (!this.stage.endless) {
        return {
          costume: this.stage.costume,
          trashPool: this.stage.trashPool,
          isNight: this.stage.isNight,
          rareWeight: this.stage.rareWeight || 0,
        };
      }
      // Endless smoothly cycles through Stages 1..8 every 28s
      const idx = Math.floor(this.elapsed / 28) % STAGE_ORDER.length;
      const sub = STAGES[STAGE_ORDER[idx]];
      return {
        costume: sub.costume,
        trashPool: sub.trashPool,
        isNight: sub.isNight,
        rareWeight: sub.rareWeight || 0.14,
      };
    }

    _getCurrentFeverMax() {
      if (!this.stage.endless) {
        return this.stage.feverMaxGauge || 100;
      }
      return Math.round(115 + Math.min(1, this.elapsed / 240) * 125);
    }

    activateVacuum() {
      if (this.mode !== 'PLAYING' || this.vacuumCharges <= 0 || this.vacuumTimer > 0) return;
      this.vacuumCharges -= 1;
      this.vacuumTimer = SKILLS.vacuumDuration;
      this.audio.vacuumStart();
      this._showToast('🌀 청소기 스킬 가동! (5초간 주변 쓰레기 자동 흡입)', 'skill', 2.0);
      this._spawnPopup(this.robot.x, this.robot.y - 62, '🌀 청소기 ON!', '#38bdf8', 1.15);
      this._syncHud();
    }

    activateHelper() {
      if (this.mode !== 'PLAYING' || this.helperCharges <= 0 || this.helpers.length > 0) return;
      this.helperCharges -= 1;
      this.audio.helperSweep();

      const count = SKILLS.helperCount;
      const P = this.layout.PLAZA;
      const topY = P.top + 38;
      const botY = P.bottom - 24;
      const stepY = (botY - topY) / Math.max(1, count - 1);

      this.helpers = [];
      for (let i = 0; i < count; i++) {
        this.helpers.push({
          rowIdx: i,
          x: P.right + 56,
          y: topY + i * stepY,
        });
      }

      const ctxInfo = this._getCurrentStageContext();
      this._showToast(
        ctxInfo.isNight
          ? '🧹 야간 환경미화원 출동! (형광복 싸리빗 대청소!)'
          : '🧹 환경미화원 출동! (주황복 싸리빗 싹쓸이!)',
        'skill',
        2.3
      );
      this._syncHud();
    }

    _loop(now) {
      requestAnimationFrame((next) => this._loop(next));
      const dt = Math.min(0.05, Math.max(0.001, (now - this._lastFrame) / 1000));
      this._lastFrame = now;
      this.time += dt;

      try {
        if (this.mode === 'TITLE') {
          this._updateIdlePeople(dt);
          this._updateRobotIdleVisuals(dt);
        } else if (this.mode === 'PLAYING') {
          this._updatePlaying(dt);
        } else if (this.mode === 'BREAKING_DOWN') {
          this._updateBreakdown(dt);
        }

        const state = this._buildRenderState();
        this.renderer.render(state);
      } catch (err) {
        console.error('SsudamGame loop error:', err);
      }
    }

    _updateIdlePeople(dt) {
      const P = this.layout.PLAZA;
      for (const p of this.people) {
        p.walkPhase += dt * 7;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < P.left + 30 || p.x > P.right - 30) p.vx *= -1;
        if (p.y < P.top + 30 || p.y > P.bottom - 30) p.vy *= -1;
      }
    }

    _updateRobotIdleVisuals(dt) {
      this.robot.blinkTimer -= dt;
      if (this.robot.blinkTimer <= 0) {
        this.robot.blink = !this.robot.blink;
        this.robot.blinkTimer = this.robot.blink ? 0.12 : randRange(2.2, 4.5);
      }
      this.robot.handX = this.robot.x + 56 + Math.sin(this.time * 2) * 14;
      this.robot.handY = this.robot.y - 28 + Math.cos(this.time * 2.5) * 10;
    }

    _updatePlaying(dt) {
      this.elapsed += dt;

      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) {
          this.dom.toast.classList.add('hidden');
        }
      }

      if (!this.stage.endless && this.elapsed >= this.stage.duration) {
        this._triggerStageClear();
        return;
      }

      if (this.comboCount > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.comboCount = 0;
        }
      }

      const feverMax = this._getCurrentFeverMax();
      if (this.feverActive) {
        this.feverTimer -= dt;
        this.feverGauge = Math.max(0, (this.feverTimer / FEVER.durationSec) * feverMax);
        if (this.feverTimer <= 0) {
          this.feverActive = false;
          this.feverGauge = 0;
        }
      }

      // Vacuum countdown & suction
      if (this.vacuumTimer > 0) {
        this.vacuumTimer = Math.max(0, this.vacuumTimer - dt);
        this._updateVacuumSuction(dt);
      }

      // Helper sweepers update
      if (this.helpers.length > 0) {
        this._updateHelpers(dt);
      }

      this.smartBin.bounce = Math.max(0, this.smartBin.bounce - dt * 5);
      this.smartBin.flashTimer = Math.max(0, this.smartBin.flashTimer - dt);
      this.humanBin.bounce = Math.max(0, this.humanBin.bounce - dt * 5);
      this.humanBin.slamTimer = Math.max(0, this.humanBin.slamTimer - dt);

      const holdingCulprit =
        this.robot.held && this.robot.held.kind === 'person' && this.robot.held.entity.isCulprit;
      const distHuman = Math.hypot(this.robot.x - this.humanBin.x, this.robot.y - this.humanBin.y);
      const wantLidOpen = holdingCulprit && distHuman < 280 ? 1 : 0;
      this.humanBin.lidOpen += (wantLidOpen - this.humanBin.lidOpen) * Math.min(1, dt * 10);

      this._updateRobot(dt);
      this._updateSpawners(dt);
      this._updateTrashes(dt);
      this._updatePeople(dt);
      this._updateParticlesAndPopups(dt);
      this._updateOverload(dt);

      this._syncHud();
    }

    _updateVacuumSuction(dt) {
      const vacRad = this.feverActive ? SKILLS.vacuumFeverRadius : SKILLS.vacuumRadius;
      for (let i = this.trashes.length - 1; i >= 0; i--) {
        const tr = this.trashes[i];
        if (tr.held || tr.isHostileToRobot) continue;
        const dx = this.robot.x - tr.x;
        const dy = this.robot.y - tr.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= vacRad) {
          if (dist <= 38) {
            this.trashes.splice(i, 1);
            this.audio.vacuumSuck();
            this._rewardTrash(tr, false, true);
          } else {
            const pullSpeed = 420;
            tr.x += (dx / dist) * pullSpeed * dt;
            tr.y += (dy / dist) * pullSpeed * dt;
            tr.rot += 12 * dt;
          }
        }
      }
    }

    _updateHelpers(dt) {
      const P = this.layout.PLAZA;
      let sweepX = P.right + 100;
      for (const h of this.helpers) {
        h.x -= SKILLS.helperSpeed * dt;
        sweepX = Math.min(sweepX, h.x);
      }

      // Emit dust & clean sparkles along broom line
      this.helperDustTimer -= dt;
      if (this.helperDustTimer <= 0) {
        this.helperDustTimer = 0.1;
        for (const h of this.helpers) {
          this._spawnParticle(h.x - 24, h.y + 8, 6, '#d6d3d1', randRange(5, 8.5), 0.44, 'dust');
          if (Math.random() < 0.35) {
            this._spawnParticle(h.x - 22, h.y + 4, 14, '#fde047', 3.5, 0.35, 'confetti');
          }
        }
      }

      // Sweep all unheld trash passed by the broom line!
      for (let i = this.trashes.length - 1; i >= 0; i--) {
        const tr = this.trashes[i];
        if (tr.held || tr.isHostileToRobot) continue;
        if (tr.x >= sweepX - 30) {
          this.trashes.splice(i, 1);
          this._rewardTrashByHelper(tr);
        }
      }

      // Finish sweep once past left boundary — ensure ZERO trash remains!
      if (sweepX <= P.left - 72) {
        for (let i = this.trashes.length - 1; i >= 0; i--) {
          const tr = this.trashes[i];
          if (tr.held || tr.isHostileToRobot) continue;
          this.trashes.splice(i, 1);
          this._rewardTrashByHelper(tr);
        }
        this.helpers = [];
        this._spawnPopup(this.layout.WORLD_W * 0.5, P.top + 110, '🧹 거리 대청소 완료!!', '#4ade80', 1.25);
      }
    }

    _rewardTrashByHelper(tr) {
      const def = TRASH_TYPES[tr.type] || TRASH_TYPES.bottle;
      this.trashCleared += 1;
      const base = def.isRare ? SCORE.trashAuto * 2 : SCORE.trashAuto;
      const feverMul = this.feverActive ? 2 : 1;
      const gained = base * feverMul;
      this.score += gained;
      this._burstConfetti(tr.x, tr.y, '#4ade80', 2);
    }

    _updateRobot(dt) {
      const r = this.robot;
      r.reachRadius = ROBOT.armReach * (this.feverActive ? ROBOT.feverReachMul : 1);

      if (r.stunTimer > 0) r.stunTimer -= dt;
      if (r.slipTimer > 0) r.slipTimer -= dt;
      if (r.slipCooldown > 0) r.slipCooldown -= dt;

      let moveSpeed = ROBOT.speed * (this.feverActive ? ROBOT.feverSpeedMul : 1);
      if (r.stunTimer > 0) moveSpeed *= 0.38;

      if (r.slipTimer > 0) {
        r.vx = r.slipVx;
        r.vy = r.slipVy;
        r.slipVx *= 0.94;
        r.slipVy *= 0.94;
      } else {
        r.vx = this.input.moveX * moveSpeed;
        r.vy = this.input.moveY * moveSpeed;
      }

      const P = this.layout.PLAZA;
      r.x = clamp(r.x + r.vx * dt, P.left + 26, P.right - 26);
      r.y = clamp(r.y + r.vy * dt, P.top + 32, P.bottom - 24);

      const spd = Math.hypot(r.vx, r.vy);
      if (spd > 10 && r.slipTimer <= 0) {
        r.facingX = r.vx / spd;
        r.facingY = r.vy / spd;
        r.wheelAngle += spd * dt * 0.09;
      }

      // Stage 6 Vomit Slip Check!
      if (this.vacuumTimer <= 0 && r.slipCooldown <= 0 && spd > 25) {
        for (const tr of this.trashes) {
          if (tr.held || tr.z > 6) continue;
          const def = TRASH_TYPES[tr.type];
          if (def && def.isSlippery && Math.hypot(r.x - tr.x, r.y - tr.y) <= 44) {
            r.slipTimer = 0.55;
            r.slipCooldown = 1.7;
            r.slipVx = r.facingX * 390;
            r.slipVy = r.facingY * 390;
            r.eyeMode = 'oops';
            r.eyeOverrideTimer = 0.7;
            this.audio.slip();
            this._spawnPopup(r.x, r.y - 54, '🤢 미끌!!', '#a3e635', 1.15);
            break;
          }
        }
      }

      r.blinkTimer -= dt;
      if (r.blinkTimer <= 0) {
        r.blink = !r.blink;
        r.blinkTimer = r.blink ? 0.11 : randRange(2.4, 4.6);
      }

      if (r.eyeOverrideTimer > 0) {
        r.eyeOverrideTimer -= dt;
      } else if (this.feverActive) {
        r.eyeMode = 'fever';
      } else if (this.overloadRatio >= 0.7) {
        r.eyeMode = 'danger';
      } else if (r.held && r.held.kind === 'person') {
        r.eyeMode = 'chase';
      } else {
        r.eyeMode = 'normal';
      }

      // Angry citizen drop & counter-throw!
      if (r.held && r.held.kind === 'person' && !r.held.entity.isCulprit) {
        r.innocentDropTimer -= dt;
        if (r.innocentDropTimer <= 0) {
          const person = r.held.entity;
          person.held = false;
          person.x = clamp(r.x + (person.x >= r.x ? 54 : -54), P.left + 32, P.right - 32);
          person.y = clamp(r.y + 12, P.top + 38, P.bottom - 24);
          r.held = null;

          // Turn into angry culprit and throw trash at robot!
          person.angry = true;
          person.isCulprit = true;
          person.role = 'litterer';
          person.dropsRemaining = 0;
          person.exiting = true;
          person.targetX = person.x < this.layout.WORLD_W * 0.5 ? P.left - 45 : P.right + 45;
          person.targetY = randRange(P.top + 50, P.bottom - 50);
          person.bubbleText = '받아라!! 💢';
          person.bubbleTimer = 1.8;

          this._throwHostileTrashAtRobot(person);
        }
      }

      // Auto-deposit near bin
      if (r.held) {
        if (r.held.kind === 'trash') {
          const d = Math.hypot(r.x - this.smartBin.x, r.y - (this.smartBin.y + 30));
          if (d <= this.layout.SMART_BIN.autoRadius) {
            this._depositTrash(r.held.entity, false);
          }
        } else if (r.held.kind === 'person' && r.held.entity.isCulprit) {
          const d = Math.hypot(r.x - this.humanBin.x, r.y - (this.humanBin.y + 30));
          if (d <= this.layout.HUMAN_BIN.autoRadius) {
            this._depositCulpritInHumanBin(r.held.entity, false);
          }
        }
      }

      // Smooth IK hand tracking
      let targetHandX;
      let targetHandY;
      if (r.armStrikeTimer > 0) {
        r.armStrikeTimer -= dt;
        targetHandX = r.strikeX;
        targetHandY = r.strikeY;
        r.gripperOpen = 0.2;
      } else if (r.held) {
        const aimAngle = this.input.isTouchMode
          ? Math.atan2(r.facingY, r.facingX)
          : Math.atan2(this.input.aimWorldY - r.y, this.input.aimWorldX - r.x);
        targetHandX = r.x + Math.cos(aimAngle) * 44;
        targetHandY = r.y - 26 + Math.sin(aimAngle) * 26;
        r.gripperOpen = 0.05;
      } else {
        if (!this.input.isTouchMode && this.input.hasMouseAim) {
          const dx = this.input.aimWorldX - r.x;
          const dy = this.input.aimWorldY - (r.y - 18);
          const dist = Math.hypot(dx, dy);
          const clampDist = Math.min(dist, r.reachRadius * 0.72);
          const ux = dist > 0.001 ? dx / dist : 0;
          const uy = dist > 0.001 ? dy / dist : -1;
          targetHandX = r.x + ux * clampDist;
          targetHandY = r.y - 18 + uy * clampDist;
        } else {
          const hover = this._findBestTarget(r.x, r.y, false);
          if (hover) {
            const dx = hover.x - r.x;
            const dy = hover.y - r.y;
            const dist = Math.hypot(dx, dy);
            const clampDist = Math.min(dist, 68);
            targetHandX = r.x + (dx / Math.max(1, dist)) * clampDist;
            targetHandY = r.y - 18 + (dy / Math.max(1, dist)) * clampDist;
          } else {
            targetHandX = r.x + r.facingX * 48;
            targetHandY = r.y - 26 + r.facingY * 26;
          }
        }
        r.gripperOpen += (1 - r.gripperOpen) * Math.min(1, dt * 12);
      }

      const smooth = Math.min(1, dt * 18);
      r.handX += (targetHandX - r.handX) * smooth;
      r.handY += (targetHandY - r.handY) * smooth;
    }

    _throwHostileTrashAtRobot(person) {
      const ctxInfo = this._getCurrentStageContext();
      const nonRarePool = ctxInfo.trashPool.filter((id) => TRASH_TYPES[id] && !TRASH_TYPES[id].isRare);
      const chosenType = pickRandom(nonRarePool.length ? nonRarePool : ['can', 'bottle']);

      const startX = person.x;
      const startY = person.y - 10;
      const flightTime = 0.36;
      const vx = (this.robot.x - startX) / flightTime;
      const vy = (this.robot.y - startY) / flightTime;

      this.audio.angryThrow();
      this._spawnPopup(person.x, person.y - 52, '💢 야! 받아라!!', '#ef4444', 1.1);

      this.trashes.push({
        id: this.nextId++,
        type: chosenType,
        x: startX,
        y: startY,
        z: 24,
        vx,
        vy,
        vz: 260 * flightTime,
        rot: 0,
        vRot: 12,
        age: 0,
        thrown: true,
        isHostileToRobot: true,
        throwOriginX: startX,
        throwOriginY: startY,
        held: false,
      });
    }

    _updateSpawners(dt) {
      const progress = this.stage.endless
        ? Math.min(1, this.elapsed / 200)
        : Math.min(1, this.elapsed / this.stage.duration);

      const effectiveMaxLitterers = this.stage.endless
        ? Math.round(
            this.stage.maxLitterersStart +
              (this.stage.maxLitterers - this.stage.maxLitterersStart) * progress
          )
        : Math.max(
            this.stage.startLitterers,
            Math.round(
              this.stage.startLitterers +
                (this.stage.maxLitterers - this.stage.startLitterers) * progress
            )
          );

      const spawnInterval =
        this.stage.spawnIntervalStart +
        (this.stage.spawnIntervalEnd - this.stage.spawnIntervalStart) * progress;

      const activeLitterers = this.people.filter(
        (p) => p.role === 'litterer' && !p.yeetFlying && !p.held
      ).length;

      this.littererSpawnTimer -= dt;
      if (this.littererSpawnTimer <= 0) {
        this.littererSpawnTimer = spawnInterval;
        if (activeLitterers < effectiveMaxLitterers) {
          this._spawnLitterer(false);
        }
      }

      const activeCitizens = this.people.filter((p) => p.role === 'citizen').length;
      this.citizenSpawnTimer -= dt;
      if (this.citizenSpawnTimer <= 0) {
        this.citizenSpawnTimer = this.stage.citizenSpawnInterval;
        if (activeCitizens < this.stage.maxCitizens) {
          this._spawnCitizen(false);
        }
      }
    }

    _pickLittererArchetype() {
      const a = this.stage.archetypes;
      const r = Math.random();
      if (r < a.standard) return 'standard';
      if (r < a.standard + a.runner) return 'runner';
      return 'boss';
    }

    _getSpawnEdgePoint(fromStationBias = false) {
      const P = this.layout.PLAZA;
      if (fromStationBias || Math.random() < 0.36) {
        return {
          x: this.layout.WORLD_W * 0.5 + randRange(-70, 70),
          y: P.top + 8,
        };
      }
      if (Math.random() < 0.5) {
        return {
          x: P.left + 12,
          y: randRange(P.top + 40, P.bottom - 50),
        };
      }
      return {
        x: P.right - 12,
        y: randRange(P.top + 40, P.bottom - 50),
      };
    }

    _pickBalancedGender() {
      let males = 0;
      let females = 0;
      for (const p of this.people) {
        if (p.yeetFlying) continue;
        if (p.gender === 'female') females += 1;
        else males += 1;
      }
      if (females < males) return 'female';
      if (males < females) return 'male';
      return Math.random() < 0.5 ? 'female' : 'male';
    }

    _spawnLitterer(nearCenter = false) {
      const P = this.layout.PLAZA;
      const archetype = this._pickLittererArchetype();
      const ctxInfo = this._getCurrentStageContext();
      const gender = this._pickBalancedGender();
      const hairStyle = gender === 'female' ? pickRandom(FEMALE_HAIR_STYLES) : 'short';
      const shirtPool = gender === 'female' ? SHIRT_COLORS_FEMALE : SHIRT_COLORS_MALE;
      const start = nearCenter
        ? { x: randRange(P.left + 120, P.right - 120), y: randRange(P.top + 80, P.top + 220) }
        : this._getSpawnEdgePoint(true);

      const speed = archetype === 'runner' ? 152 : archetype === 'boss' ? 88 : 108;
      const dropsRemaining = archetype === 'boss' ? 3 : Math.random() < 0.5 ? 2 : 1;
      const costumeVariant =
        ctxInfo.costume === 'halloween'
          ? archetype === 'boss'
            ? 'pumpkin_head'
            : pickRandom(HALLOWEEN_VARIANTS)
          : null;

      this.people.push({
        id: this.nextId++,
        role: 'litterer',
        archetype,
        gender,
        hairStyle,
        costume: ctxInfo.costume,
        costumeVariant,
        x: start.x,
        y: start.y,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rot: 0,
        vRot: 0,
        speed,
        targetX: randRange(P.left + 90, P.right - 90),
        targetY: randRange(P.top + 70, P.bottom - 75),
        waitTimer: nearCenter ? 0.5 : randRange(0.4, 1.1),
        dropsRemaining,
        isCulprit: false,
        angry: false,
        ghostTimer: randRange(0, 4),
        ghostInvisible: false,
        dizzyTimer: 0,
        bubbleText: '',
        bubbleTimer: 0,
        shirtColor: archetype === 'boss' ? '#1e293b' : archetype === 'runner' ? '#f97316' : pickRandom(shirtPool),
        hairColor: pickRandom(HAIR_COLORS),
        scale: archetype === 'boss' ? 1.25 : 1.0,
        walkPhase: randRange(0, Math.PI * 2),
        yeetFlying: false,
        held: false,
        exiting: false,
      });
    }

    _spawnCitizen(inside = false) {
      const P = this.layout.PLAZA;
      const ctxInfo = this._getCurrentStageContext();
      const gender = this._pickBalancedGender();
      const hairStyle = gender === 'female' ? pickRandom(FEMALE_HAIR_STYLES) : 'short';
      const shirtPool = gender === 'female' ? SHIRT_COLORS_FEMALE : SHIRT_COLORS_MALE;
      const start = inside
        ? { x: randRange(P.left + 80, P.right - 80), y: randRange(P.top + 50, P.bottom - 50) }
        : this._getSpawnEdgePoint(false);
      const target = {
        x: randRange(P.left + 80, P.right - 80),
        y: randRange(P.top + 50, P.bottom - 50),
      };
      const dx = target.x - start.x;
      const dy = target.y - start.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const spd = randRange(58, 86);
      const costumeVariant = ctxInfo.costume === 'halloween' ? pickRandom(HALLOWEEN_VARIANTS) : null;

      this.people.push({
        id: this.nextId++,
        role: 'citizen',
        archetype: 'standard',
        gender,
        hairStyle,
        costume: ctxInfo.costume,
        costumeVariant,
        x: start.x,
        y: start.y,
        z: 0,
        vx: (dx / dist) * spd,
        vy: (dy / dist) * spd,
        vz: 0,
        rot: 0,
        vRot: 0,
        speed: spd,
        targetX: target.x,
        targetY: target.y,
        waitTimer: randRange(2.0, 4.5),
        dropsRemaining: 0,
        isCulprit: false,
        angry: false,
        ghostTimer: 0,
        ghostInvisible: false,
        dizzyTimer: 0,
        bubbleText: '',
        bubbleTimer: 0,
        shirtColor: pickRandom(shirtPool),
        hairColor: pickRandom(HAIR_COLORS),
        scale: 0.96,
        walkPhase: randRange(0, Math.PI * 2),
        yeetFlying: false,
        held: false,
        exiting: false,
        lifeTimer: randRange(9, 15),
      });
    }

    _pickTrashTypeFromContext(ctxInfo) {
      const pool = ctxInfo.trashPool || ['bottle', 'can'];
      const rares = pool.filter((id) => TRASH_TYPES[id] && TRASH_TYPES[id].isRare);
      const normals = pool.filter((id) => TRASH_TYPES[id] && !TRASH_TYPES[id].isRare);
      if (rares.length > 0 && Math.random() < (ctxInfo.rareWeight || 0.16)) {
        return pickRandom(rares);
      }
      return pickRandom(normals.length ? normals : pool);
    }

    _dropTrashFrom(person) {
      const P = this.layout.PLAZA;
      const ctxInfo = this._getCurrentStageContext();

      // Stage 8 Halloween Pumpkin Boss Candy Bomb!
      if (person.costume === 'halloween' && person.archetype === 'boss') {
        const bombTypes = ['candy', 'candy', 'candy', 'pumpkin'];
        bombTypes.forEach((t, idx) => {
          const ang = (Math.PI * 2 * idx) / bombTypes.length + randRange(-0.2, 0.2);
          const tx = clamp(person.x + Math.cos(ang) * 42, P.left + 26, P.right - 26);
          const ty = clamp(person.y + Math.sin(ang) * 32, P.top + 36, P.bottom - 26);
          this.trashes.push({
            id: this.nextId++,
            type: t,
            x: tx,
            y: ty,
            z: 20,
            vx: Math.cos(ang) * 85,
            vy: Math.sin(ang) * 65,
            vz: 120,
            rot: randRange(-0.4, 0.4),
            vRot: randRange(-4, 4),
            age: 0,
            thrown: false,
            isHostileToRobot: false,
            throwOriginX: tx,
            throwOriginY: ty,
            held: false,
          });
        });
        person.bubbleText = '트릭 오어 트릿!! 🎃';
        person.bubbleTimer = 1.6;
      } else {
        const chosenType = this._pickTrashTypeFromContext(ctxInfo);
        const angle = randRange(0, Math.PI * 2);
        const tx = clamp(person.x + Math.cos(angle) * 26, P.left + 26, P.right - 26);
        const ty = clamp(person.y + Math.sin(angle) * 20, P.top + 36, P.bottom - 26);

        this.trashes.push({
          id: this.nextId++,
          type: chosenType,
          x: tx,
          y: ty,
          z: 18,
          vx: Math.cos(angle) * 42,
          vy: Math.sin(angle) * 32,
          vz: 95,
          rot: randRange(-0.4, 0.4),
          vRot: randRange(-3, 3),
          age: 0,
          thrown: false,
          isHostileToRobot: false,
          throwOriginX: tx,
          throwOriginY: ty,
          held: false,
        });
      }

      person.isCulprit = true;
      person.dropsRemaining -= 1;
      person.waitTimer = person.archetype === 'boss' ? 1.5 : 1.25;
      person.targetX = randRange(P.left + 90, P.right - 90);
      person.targetY = randRange(P.top + 65, P.bottom - 65);
      if (person.dropsRemaining <= 0) {
        person.exiting = true;
        const exitEdge = Math.random() < 0.5 ? P.left - 35 : P.right + 35;
        person.targetX = exitEdge;
        person.targetY = randRange(P.top + 50, P.bottom - 50);
      }
    }

    _updateTrashes(dt) {
      for (let i = this.trashes.length - 1; i >= 0; i--) {
        const tr = this.trashes[i];
        if (tr.held) continue;

        tr.age += dt;
        if (tr.z > 0 || tr.vz !== 0 || Math.abs(tr.vx) > 2 || Math.abs(tr.vy) > 2) {
          tr.x += tr.vx * dt;
          tr.y += tr.vy * dt;
          tr.z += tr.vz * dt;
          tr.vz -= 640 * dt;
          tr.rot += tr.vRot * dt;

          // Hostile counter-thrown trash hitting 쓰담쓰담!
          if (tr.isHostileToRobot) {
            const dBot = Math.hypot(tr.x - this.robot.x, tr.y - this.robot.y);
            if (dBot <= 42 && tr.z < 58) {
              tr.isHostileToRobot = false;
              tr.thrown = false;
              tr.vx = randRange(-60, 60);
              tr.vy = randRange(40, 85);
              tr.vz = 75;
              this.comboCount = 0;
              this.robot.stunTimer = 0.55;
              this.robot.eyeMode = 'oops';
              this.robot.eyeOverrideTimer = 0.9;
              this.shake.trauma = Math.min(1, this.shake.trauma + 0.38);
              this.audio.innocentOops();
              this._spawnPopup(this.robot.x, this.robot.y - 62, '💢 시민의 반격! 콤보 초기화!', '#ef4444', 1.1);
              this._burstConfetti(this.robot.x, this.robot.y - 16, '#ef4444', 10);
            }
          }

          // Check mid-flight Smart Bin capture
          if (!tr.isHostileToRobot && tr.thrown && tr.z < 55) {
            const dBin = Math.hypot(tr.x - this.smartBin.x, tr.y - this.smartBin.y);
            if (dBin <= this.layout.SMART_BIN.magnetRadius) {
              const throwDist = Math.hypot(tr.throwOriginX - this.smartBin.x, tr.throwOriginY - this.smartBin.y);
              this.trashes.splice(i, 1);
              this._rewardTrash(tr, throwDist > 135, false);
              continue;
            }
          }

          const P = this.layout.PLAZA;
          if (tr.x < P.left + 20) {
            tr.x = P.left + 20;
            tr.vx = Math.abs(tr.vx) * 0.5;
          } else if (tr.x > P.right - 20) {
            tr.x = P.right - 20;
            tr.vx = -Math.abs(tr.vx) * 0.5;
          }
          if (tr.y < P.top + 30) {
            tr.y = P.top + 30;
            tr.vy = Math.abs(tr.vy) * 0.5;
          } else if (tr.y > P.bottom - 20) {
            tr.y = P.bottom - 20;
            tr.vy = -Math.abs(tr.vy) * 0.5;
          }

          if (tr.z <= 0) {
            tr.z = 0;
            tr.isHostileToRobot = false;
            if (Math.abs(tr.vz) > 130) {
              tr.vz = -tr.vz * 0.32;
              tr.vx *= 0.45;
              tr.vy *= 0.45;
              tr.vRot *= 0.4;
            } else {
              tr.vz = 0;
              tr.vx = 0;
              tr.vy = 0;
              tr.vRot = 0;
              tr.thrown = false;
            }
          }
        }
      }
    }

    _updatePeople(dt) {
      for (let i = this.people.length - 1; i >= 0; i--) {
        const p = this.people[i];
        if (p.held) continue;

        if (p.bubbleTimer > 0) {
          p.bubbleTimer -= dt;
        }

        // Stage 8 Ghost periodic fade!
        if (p.costume === 'halloween' && p.costumeVariant === 'ghost' && p.isCulprit && !p.yeetFlying) {
          p.ghostTimer = (p.ghostTimer + dt) % 4.0;
          const wasInv = p.ghostInvisible;
          p.ghostInvisible = p.ghostTimer > 2.4;
          if (!wasInv && p.ghostInvisible) {
            p.bubbleText = '우우~ 못 잡겠지~?';
            p.bubbleTimer = 1.2;
          }
        } else {
          p.ghostInvisible = false;
        }

        if (p.yeetFlying) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vz -= 220 * dt;
          p.rot += p.vRot * dt;
          if (Math.random() < 0.55) {
            this._spawnParticle(p.x, p.y, p.z, '#fde047', 4, 0.35, 'confetti');
          }
          if (p.x < -120 || p.x > this.layout.WORLD_W + 120 || p.y < -120 || p.y > this.layout.WORLD_H + 140) {
            this.people.splice(i, 1);
          }
          continue;
        }

        const P = this.layout.PLAZA;
        if (p.z > 0 || p.vz !== 0) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vz -= 640 * dt;
          p.rot += p.vRot * dt;

          const dHuman = Math.hypot(p.x - this.humanBin.x, p.y - this.humanBin.y);
          if (p.isCulprit && p.z < 70 && dHuman <= this.layout.HUMAN_BIN.magnetRadius) {
            const throwDist = Math.hypot((p.throwOriginX || p.x) - this.humanBin.x, (p.throwOriginY || p.y) - this.humanBin.y);
            this.people.splice(i, 1);
            this._rewardCulpritHumanBin(p, throwDist > 135);
            continue;
          }

          if (p.isCulprit && (p.x < P.left - 8 || p.x > P.right + 8 || p.y > P.bottom + 8)) {
            this._triggerHomeRunYeet(p);
            continue;
          }

          if (p.y < P.top + 20) {
            p.y = P.top + 20;
            p.vy = Math.abs(p.vy) * 0.4;
          }

          if (p.z <= 0) {
            p.z = 0;
            p.vz = 0;
            p.vx = 0;
            p.vy = 0;
            p.rot = 0;
            p.vRot = 0;
            p.dizzyTimer = 1.65;
            p.bubbleText = '어지러워...';
            p.bubbleTimer = 1.3;
          }
          continue;
        }

        if (p.dizzyTimer > 0) {
          p.dizzyTimer -= dt;
          continue;
        }

        if (p.role === 'citizen') {
          p.lifeTimer -= dt;
          p.walkPhase += dt * 7;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.x < P.left + 25 || p.x > P.right - 25) p.vx *= -1;
          if (p.y < P.top + 35 || p.y > P.bottom - 25) p.vy *= -1;
          if (p.lifeTimer <= 0) {
            this.people.splice(i, 1);
          }
          continue;
        }

        if (p.archetype === 'runner' && p.isCulprit && !p.exiting) {
          const dr = Math.hypot(p.x - this.robot.x, p.y - this.robot.y);
          if (dr < 210) {
            const awayX = (p.x - this.robot.x) / Math.max(1, dr);
            const awayY = (p.y - this.robot.y) / Math.max(1, dr);
            p.targetX = clamp(p.x + awayX * 220, P.left + 60, P.right - 60);
            p.targetY = clamp(p.y + awayY * 220, P.top + 60, P.bottom - 60);
          }
        }

        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 14) {
          const spd = p.isCulprit && p.exiting ? p.speed * 1.15 : p.speed;
          const dirX = dx / dist;
          const dirY = dy / dist;
          p.vx = dirX * spd;
          p.vy = dirY * spd;
          // Drunk lateral zigzag wobble!
          const wobble = p.costume === 'drunk' ? Math.sin(p.walkPhase * 0.7) * 44 : 0;
          p.x = clamp(p.x + (p.vx - dirY * wobble) * dt, P.left - 55, P.right + 55);
          p.y = clamp(p.y + (p.vy + dirX * wobble) * dt, P.top + 8, P.bottom - 18);
          p.walkPhase += dt * (spd * 0.085);
        } else {
          p.vx = 0;
          p.vy = 0;
          if (p.exiting) {
            this.people.splice(i, 1);
            continue;
          }
          p.waitTimer -= dt;
          if (p.waitTimer <= 0) {
            if (p.dropsRemaining > 0) {
              this._dropTrashFrom(p);
            } else {
              p.exiting = true;
            }
          }
        }
      }
    }

    _findBestTarget(aimX, aimY, allowInnocent = false) {
      const reach = this.robot.reachRadius;
      let best = null;
      let bestScore = -Infinity;

      for (const p of this.people) {
        if (!p.isCulprit || p.held || p.yeetFlying || p.z > 20) continue;
        const dRobot = Math.hypot(p.x - this.robot.x, p.y - this.robot.y);
        if (dRobot > reach + 18) continue;
        const dAim = Math.hypot(p.x - aimX, p.y - aimY);
        const score = 320 - dAim * 1.15 - dRobot * 0.35;
        if (score > bestScore) {
          bestScore = score;
          best = { kind: 'person', entity: p, x: p.x, y: p.y, radius: 24, isCulprit: true };
        }
      }

      for (const tr of this.trashes) {
        if (tr.held || tr.thrown || tr.isHostileToRobot || tr.z > 20) continue;
        const dRobot = Math.hypot(tr.x - this.robot.x, tr.y - this.robot.y);
        if (dRobot > reach + 14) continue;
        const dAim = Math.hypot(tr.x - aimX, tr.y - aimY);
        const score = 260 - dAim * 1.1 - dRobot * 0.4;
        if (score > bestScore) {
          bestScore = score;
          best = { kind: 'trash', entity: tr, x: tr.x, y: tr.y, radius: 28, isCulprit: false };
        }
      }

      // Check innocent citizen if clicked directly or no valid target exists nearby
      if (allowInnocent) {
        let bestInnocent = null;
        let bestInnocentDist = Infinity;
        for (const p of this.people) {
          if (p.isCulprit || p.held || p.yeetFlying) continue;
          const dRobot = Math.hypot(p.x - this.robot.x, p.y - this.robot.y);
          const dAim = Math.hypot(p.x - aimX, p.y - aimY);
          if (dRobot <= reach + 12 && dAim <= 56 && dAim < bestInnocentDist) {
            bestInnocentDist = dAim;
            bestInnocent = { kind: 'person', entity: p, x: p.x, y: p.y, radius: 22, isCulprit: false };
          }
        }
        // If player deliberately clicked right onto an innocent citizen while no trash/culprit is under cursor
        if (bestInnocent && (!best || bestInnocentDist < Math.hypot(best.x - aimX, best.y - aimY) * 0.65)) {
          return bestInnocent;
        }
      }

      return best;
    }

    handleGrabAction(aimX, aimY, allowInnocent = false) {
      if (this.mode !== 'PLAYING' || this.robot.held) return;

      const target = this._findBestTarget(aimX, aimY, allowInnocent);
      if (!target) {
        this.robot.armStrikeTimer = 0.14;
        const dx = aimX - this.robot.x;
        const dy = aimY - this.robot.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const len = Math.min(d, this.robot.reachRadius * 0.85);
        this.robot.strikeX = this.robot.x + (dx / d) * len;
        this.robot.strikeY = this.robot.y + (dy / d) * len;
        this.audio.armExtend();
        return;
      }

      this._grabEntity(target);
    }

    _grabEntity(target) {
      const r = this.robot;
      r.armStrikeTimer = 0.16;
      r.strikeX = target.x;
      r.strikeY = target.y;
      target.entity.held = true;
      r.held = { kind: target.kind, entity: target.entity };

      if (target.kind === 'person') {
        const p = target.entity;
        if (p.isCulprit) {
          p.bubbleText = p.costume === 'drunk' ? pickRandom(DRUNK_BUBBLES) : pickRandom(CULPRIT_BUBBLES);
          p.bubbleTimer = 3.2;
          this.audio.grab(true);
          this._spawnPopup(p.x, p.y - 45, p.angry ? '복수 검거!!' : '현행범 검거!', '#f87171', 1.0);
        } else {
          // Innocent citizen gets angry and prepares to throw trash at robot!
          p.angry = true;
          p.bubbleText = pickRandom(ANGRY_BUBBLES);
          p.bubbleTimer = 2.4;
          r.eyeMode = 'oops';
          r.eyeOverrideTimer = 0.9;
          r.innocentDropTimer = 0.36;
          this.audio.innocentOops();
          this._spawnPopup(r.x, r.y - 60, '어?! 일반시민이다!!', '#f87171', 1.0);
        }
      } else {
        target.entity.thrown = false;
        this.audio.grab(false);
      }
    }

    handlePcThrow(aimX, aimY, power) {
      if (this.mode !== 'PLAYING' || !this.robot.held) return;
      const dx = aimX - this.robot.x;
      const dy = aimY - this.robot.y;
      const dist = Math.hypot(dx, dy);
      const dirX = dist > 1 ? dx / dist : this.robot.facingX;
      const dirY = dist > 1 ? dy / dist : this.robot.facingY;
      const clampedDist = clamp(dist, 165, 220 + power * 260);
      this._throwHeldTo(this.robot.x + dirX * clampedDist, this.robot.y + dirY * clampedDist, power);
    }

    handleTouchActionStart() {
      if (this.mode !== 'PLAYING') return;
      if (!this.robot.held) {
        const best = this._findBestTarget(this.robot.x, this.robot.y, false);
        if (best) {
          this._grabEntity(best);
        } else {
          // Only grab innocent on touch if directly adjacent (< 82px) with no valid target in reach
          let adjInnocent = null;
          for (const p of this.people) {
            if (p.isCulprit || p.held || p.yeetFlying) continue;
            if (Math.hypot(p.x - this.robot.x, p.y - this.robot.y) <= 82) {
              adjInnocent = { kind: 'person', entity: p, x: p.x, y: p.y, radius: 22, isCulprit: false };
              break;
            }
          }
          if (adjInnocent) {
            this._grabEntity(adjInnocent);
          } else {
            this.robot.armStrikeTimer = 0.14;
            this.robot.strikeX = this.robot.x + this.robot.facingX * 110;
            this.robot.strikeY = this.robot.y + this.robot.facingY * 110;
            this.audio.armExtend();
          }
        }
        this._justGrabbedTouch = true;
      } else {
        this._justGrabbedTouch = false;
      }
    }

    handleTouchActionEnd(wasDragged, dragAim) {
      if (this.mode !== 'PLAYING') return;
      if (this._justGrabbedTouch) {
        this._justGrabbedTouch = false;
        return;
      }
      if (!this.robot.held) return;

      // Touch/tablet throw requires swinging/dragging in a direction (prevents accidental tap-spam auto-aim)
      if (wasDragged && dragAim) {
        const dist = 210 + dragAim.power * 260;
        this._throwHeldTo(this.robot.x + dragAim.dirX * dist, this.robot.y + dragAim.dirY * dist, dragAim.power);
      }
    }

    _throwHeldTo(targetX, targetY, power) {
      const held = this.robot.held;
      if (!held) return;
      this.robot.held = null;
      this.audio.throwItem(power);

      let finalX = targetX;
      let finalY = targetY;
      if (held.kind === 'trash') {
        if (Math.hypot(targetX - this.smartBin.x, targetY - this.smartBin.y) <= this.layout.SMART_BIN.magnetRadius + 24) {
          finalX = this.smartBin.x;
          finalY = this.smartBin.y;
        }
      } else if (held.kind === 'person' && held.entity.isCulprit) {
        if (Math.hypot(targetX - this.humanBin.x, targetY - this.humanBin.y) <= this.layout.HUMAN_BIN.magnetRadius + 26) {
          finalX = this.humanBin.x;
          finalY = this.humanBin.y;
        }
      }

      const startX = this.robot.handX;
      const startY = this.robot.handY;
      const flightTime = 0.34 + power * 0.16;
      const vx = (finalX - startX) / flightTime;
      const vy = (finalY - startY) / flightTime;
      const vz = 320 * flightTime;

      const ent = held.entity;
      ent.held = false;
      ent.x = startX;
      ent.y = startY;
      ent.z = 26;
      ent.vx = vx;
      ent.vy = vy;
      ent.vz = vz;
      ent.vRot = (Math.random() < 0.5 ? -1 : 1) * 11;
      ent.throwOriginX = this.robot.x;
      ent.throwOriginY = this.robot.y;

      if (held.kind === 'trash') {
        ent.thrown = true;
      } else {
        ent.bubbleText = '으아아악!!';
        ent.bubbleTimer = 1.6;
      }
    }

    _depositTrash(tr, isRanged) {
      this.robot.held = null;
      const idx = this.trashes.indexOf(tr);
      if (idx >= 0) this.trashes.splice(idx, 1);
      this._rewardTrash(tr, isRanged, false);
    }

    _rewardTrash(tr, isRanged, viaVacuum = false) {
      const def = TRASH_TYPES[tr.type] || TRASH_TYPES.bottle;
      this._advanceCombo();
      let base = isRanged ? SCORE.trashThrow : SCORE.trashAuto;
      if (def.isRare) {
        base *= 2;
      }
      const gained = this._applyPoints(base, FEVER.trashGain);
      this.trashCleared += 1;

      if (!viaVacuum) {
        this.smartBin.bounce = 1;
        this.smartBin.flashIndex = def.binIndex;
        this.smartBin.flashTimer = 0.45;
      }
      this.robot.eyeMode = 'happy';
      this.robot.eyeOverrideTimer = 0.42;

      if (def.isRare) {
        this.audio.rareBonus();
        this._burstConfetti(viaVacuum ? this.robot.x : this.smartBin.x, (viaVacuum ? this.robot.y : this.smartBin.y) - 20, '#fde047', 16);
        this._spawnPopup(
          viaVacuum ? this.robot.x : this.smartBin.x,
          (viaVacuum ? this.robot.y : this.smartBin.y) - 56,
          `✨ 희귀 ${def.label.replace(' (희귀)', '')} 2배! +${gained}`,
          '#fde047',
          1.18
        );
      } else {
        if (!viaVacuum) this.audio.binDeposit(this.comboCount);
        const px = viaVacuum ? this.robot.x : this.smartBin.x;
        const py = viaVacuum ? this.robot.y : this.smartBin.y;
        this._burstConfetti(px, py - 20, def.color, viaVacuum ? 7 : 12);
        this._spawnPopup(
          px,
          py - 52,
          viaVacuum ? `🌀 흡입 +${gained}` : isRanged ? `🎯 나이스 슛! +${gained}` : `♻️ 수거 +${gained}`,
          isRanged ? '#fde047' : viaVacuum ? '#38bdf8' : '#4ade80',
          isRanged ? 1.15 : 0.98
        );
      }
    }

    _rollCulpritSkillDrops(px, py, allowHelper = false) {
      // Vacuum: 10% chance (+1 up to 3)
      if (this.vacuumCharges < SKILLS.vacuumMax && Math.random() < SKILLS.vacuumDropChance) {
        this.vacuumCharges += 1;
        this.audio.skillCharge();
        this._spawnPopup(px, py - 88, '🌀 청소기 스킬 +1 충전!', '#38bdf8', 1.12);
      }
      // Helper: 1% chance (+1 up to 2) ONLY when dumped into 인간쓰레기통!
      if (allowHelper && this.helperCharges < SKILLS.helperMax && Math.random() < SKILLS.helperDropChance) {
        this.helperCharges += 1;
        this.audio.skillCharge();
        this._spawnPopup(px, py - 114, '🍀 1% 대박! 조력자 +1 충전!', '#fb923c', 1.2);
      }
    }

    _depositCulpritInHumanBin(p, isRanged) {
      this.robot.held = null;
      const idx = this.people.indexOf(p);
      if (idx >= 0) this.people.splice(idx, 1);
      this._rewardCulpritHumanBin(p, isRanged);
    }

    _rewardCulpritHumanBin(p, isRanged) {
      this._advanceCombo();
      let base = isRanged ? SCORE.culpritBinThrow : SCORE.culpritBinAuto;
      let feverAmt = FEVER.culpritGain;
      if (p.archetype === 'boss') {
        base += SCORE.bossBonus;
        feverAmt = FEVER.bossGain;
        this._clearNearestTrashBonus(this.humanBin.x, this.humanBin.y);
      }
      const gained = this._applyPoints(base, feverAmt);
      this.culpritsHandled += 1;

      this.humanBin.bounce = 1;
      this.humanBin.slamTimer = 0.6;
      this.humanBin.lidOpen = 0;
      this.shake.trauma = Math.min(1, this.shake.trauma + 0.45);
      this.robot.eyeMode = 'happy';
      this.robot.eyeOverrideTimer = 0.6;

      this.audio.humanBinSlam();
      this._burstConfetti(this.humanBin.x, this.humanBin.y - 22, '#facc15', 18);
      this._spawnPopup(
        this.humanBin.x,
        this.humanBin.y - 60,
        isRanged ? `🏀 슈퍼 덩크!! +${gained}` : `🗑️ 인간쓰레기통 입성! +${gained}`,
        '#fde047',
        1.22
      );
      this._rollCulpritSkillDrops(this.humanBin.x, this.humanBin.y, true);
    }

    _triggerHomeRunYeet(p) {
      p.yeetFlying = true;
      p.vx *= 2.1;
      p.vy = p.vy * 1.4 - 220;
      p.vz = 320;
      p.vRot = 18;
      p.bubbleText = '잘못했어요~~★';
      p.bubbleTimer = 1.5;

      this._advanceCombo();
      let base = SCORE.culpritYeet;
      let feverAmt = FEVER.culpritGain;
      if (p.archetype === 'boss') {
        base += SCORE.bossBonus;
        feverAmt = FEVER.bossGain;
        this._clearNearestTrashBonus(p.x, p.y);
      }
      const gained = this._applyPoints(base, feverAmt);
      this.culpritsHandled += 1;
      this.shake.trauma = Math.min(1, this.shake.trauma + 0.35);
      this.robot.eyeMode = 'happy';
      this.robot.eyeOverrideTimer = 0.55;

      const P = this.layout.PLAZA;
      const popX = clamp(p.x, 120, this.layout.WORLD_W - 120);
      const popY = clamp(p.y - 40, P.top + 30, P.bottom - 50);
      this.audio.yeetHomeRun();
      this._burstConfetti(
        clamp(p.x, 40, this.layout.WORLD_W - 40),
        clamp(p.y, P.top + 10, P.bottom - 20),
        '#f97316',
        16
      );
      this._spawnPopup(popX, popY, `⚾ 광장 밖 홈런!! +${gained}`, '#fb923c', 1.22);
      this._rollCulpritSkillDrops(popX, popY, false);
    }

    _clearNearestTrashBonus(refX, refY) {
      let closestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < this.trashes.length; i++) {
        const tr = this.trashes[i];
        if (tr.held || tr.isHostileToRobot) continue;
        const d = Math.hypot(tr.x - refX, tr.y - refY);
        if (d < bestDist) {
          bestDist = d;
          closestIdx = i;
        }
      }
      if (closestIdx >= 0) {
        const removed = this.trashes.splice(closestIdx, 1)[0];
        this._burstConfetti(removed.x, removed.y, '#4ade80', 10);
        this._spawnPopup(removed.x, removed.y - 25, '보스 처치 보너스 정리!', '#4ade80', 0.95);
      }
    }

    _advanceCombo() {
      this.comboCount += 1;
      this.comboTimer = COMBO.windowSec;
      if (this.comboCount > this.maxCombo) {
        this.maxCombo = this.comboCount;
      }
    }

    _applyPoints(basePoints, feverGain) {
      const mult = Math.min(COMBO.maxMultiplier, 1 + Math.max(0, this.comboCount - 1) * COMBO.step);
      const feverMul = this.feverActive ? 2 : 1;
      const gained = Math.round(basePoints * mult * feverMul);
      this.score += gained;

      const feverMax = this._getCurrentFeverMax();
      if (!this.feverActive) {
        this.feverGauge = Math.min(feverMax, this.feverGauge + feverGain);
        if (this.feverGauge >= feverMax) {
          this.feverActive = true;
          this.feverTimer = FEVER.durationSec;
          this.audio.feverStart();
          this._showToast('⚡ FEVER TIME! 이동속도·팔 리치 UP · 점수 2배!', 'fever', 2.4);
          this._burstConfetti(this.robot.x, this.robot.y - 20, '#fde047', 22);
        }
      }
      return gained;
    }

    _updateOverload(dt) {
      let weight = 0;
      for (const tr of this.trashes) {
        if (tr.held) continue;
        const def = TRASH_TYPES[tr.type] || TRASH_TYPES.bottle;
        weight += def.weight;
      }
      this.overloadRatio = Math.min(1, weight / this.stage.overloadLimit);

      if (this.overloadRatio >= 0.7 && this.overloadRatio < 1) {
        this.audio.warningBeep();
        this.smokeTimer -= dt;
        if (this.smokeTimer <= 0) {
          this.smokeTimer = 0.22;
          this._spawnParticle(this.robot.x - 10, this.robot.y - 36, 10, '#64748b', 7, 0.75, 'smoke');
        }
      }

      if (this.overloadRatio >= 1) {
        this._startBreakdown();
      }
    }

    _startBreakdown() {
      this.mode = 'BREAKING_DOWN';
      this.breakdownTimer = 1.35;
      this.input.setPaused(true);
      this.dom.skillDock.classList.add('hidden');
      this.robot.eyeMode = 'broken';
      this.shake.trauma = 1.0;
      this.audio.breakdown();
      this._showToast('💥 과부하 100%! 쓰담쓰담 로봇 고장!!', 'warning', 2.0);
      this._spawnPopup(this.robot.x, this.robot.y - 68, '과부하 고장!! X_X', '#ef4444', 1.3);
    }

    _updateBreakdown(dt) {
      this.breakdownTimer -= dt;
      this.robot.eyeMode = 'broken';

      if (Math.random() < 0.5) {
        this._spawnParticle(
          this.robot.x + randRange(-25, 25),
          this.robot.y + randRange(-35, 5),
          15,
          '#fde047',
          5,
          0.35,
          'spark'
        );
        this._spawnParticle(
          this.robot.x + randRange(-18, 18),
          this.robot.y - 34,
          10,
          '#475569',
          10,
          0.8,
          'smoke'
        );
      }

      this._updateParticlesAndPopups(dt);

      if (this.breakdownTimer <= 0) {
        this._finishGameOver();
      }
    }

    _finishGameOver() {
      this.mode = 'GAME_OVER';
      this.dom.skillDock.classList.add('hidden');
      this.dom.topCornerNav.classList.remove('hidden');
      const res = ns.CONFIG.saveStageResult(this.currentStageId, this.score, this.elapsed, false, 0);

      this.dom.goTitle.textContent = '💥 쓰담쓰담 과부하 고장!';
      this.dom.goSubtitle.textContent =
        this.stage.endless
          ? '경쟁전 기록을 순위표에 등록해 보세요!'
          : '광장에 쓰레기가 너무 많이 쌓여 로봇이 멈췄습니다...';
      this.dom.goScore.textContent = `${this.score.toLocaleString()}점`;
      this.dom.goTime.textContent = formatTime(this.elapsed);
      this.dom.goTrash.textContent = `${this.trashCleared}개`;
      this.dom.goCulprits.textContent = `${this.culpritsHandled}명`;
      this.dom.goMaxCombo.textContent = `${this.maxCombo} COMBO`;
      this.dom.goNewRecord.classList.toggle('hidden', !res.isNewRecord);

      if (this.stage.endless) {
        const projRank = this.leaderboard.getProjectedRank(this.score);
        this.dom.rankSubmitBox.classList.remove('hidden');
        this.dom.btnViewRankingGo.classList.remove('hidden');
        this.dom.rankSubmitTitle.textContent =
          projRank <= 30
            ? `🏆 현재 예상 순위 ${projRank}등! 닉네임을 등록하세요`
            : '🏆 경쟁전 기록을 등록하세요 (TOP 30 도전!)';
        this.dom.rankNickname.value = this.leaderboard.getSavedNickname();
        this.dom.btnSubmitRank.disabled = false;
        this.dom.btnSubmitRank.textContent = '등록';
        this.dom.rankSubmitStatus.classList.add('hidden');
      } else {
        this.dom.rankSubmitBox.classList.add('hidden');
        this.dom.btnViewRankingGo.classList.add('hidden');
      }

      this.dom.overlayGameOver.classList.remove('hidden');
      this._refreshTitleScores();
    }

    _triggerStageClear() {
      this.mode = 'STAGE_CLEAR';
      this.input.setPaused(true);
      this.dom.skillDock.classList.add('hidden');
      this.dom.topCornerNav.classList.remove('hidden');
      this.audio.stageClear();

      const [s1, s2, s3] = this.stage.starThresholds;
      const starCount = this.score >= s3 ? 3 : this.score >= s2 ? 2 : this.score >= s1 ? 1 : 1;
      const starsStr = '★'.repeat(starCount) + '☆'.repeat(3 - starCount);
      const res = ns.CONFIG.saveStageResult(this.currentStageId, this.score, this.elapsed, true, starCount);

      this.dom.clearTitle.textContent = `${this.stage.name} 클리어!`;
      this.dom.clearStars.textContent = starsStr;
      this.dom.clearScore.textContent = `${this.score.toLocaleString()}점`;
      this.dom.clearTrash.textContent = `${this.trashCleared}개`;
      this.dom.clearCulprits.textContent = `${this.culpritsHandled}명`;
      this.dom.clearMaxCombo.textContent = `${this.maxCombo} COMBO`;
      this.dom.clearNewRecord.classList.toggle('hidden', !res.isNewRecord);

      if (res.newlyUnlockedStage) {
        this.dom.clearUnlockBadge.textContent = `🔓 STAGE ${res.newlyUnlockedStage} 해금!`;
        this.dom.clearUnlockBadge.classList.remove('hidden');
      } else {
        this.dom.clearUnlockBadge.classList.add('hidden');
      }

      this.dom.btnNextStage.classList.toggle('hidden', !this.stage.nextStage);
      this.dom.overlayClear.classList.remove('hidden');
      this._refreshTitleScores();
    }

    _spawnParticle(x, y, z, color, size, life, kind = 'confetti') {
      if (this.particles.length >= 110) {
        if (kind === 'confetti' || kind === 'dust') return;
        this.particles.shift();
      }
      const ang = randRange(0, Math.PI * 2);
      const spd = kind === 'smoke' || kind === 'dust' ? randRange(12, 38) : randRange(65, 190);
      this.particles.push({
        x,
        y,
        z,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.65,
        vz: kind === 'smoke' || kind === 'dust' ? randRange(24, 52) : randRange(80, 200),
        size,
        color,
        life,
        maxLife: life,
        kind,
      });
    }

    _burstConfetti(x, y, baseColor, count = 14) {
      const colors = [baseColor, '#fde047', '#38bdf8', '#ffffff', '#4ade80'];
      for (let i = 0; i < count; i++) {
        this._spawnParticle(x, y, 24, pickRandom(colors), randRange(3, 5.5), randRange(0.45, 0.75), 'confetti');
      }
      this._spawnParticle(x, y, 10, baseColor, 20, 0.35, 'ring');
    }

    _spawnPopup(x, y, text, color = '#fde047', scale = 1) {
      if (this.popups.length >= 14) {
        this.popups.shift();
      }
      this.popups.push({
        x,
        y,
        text,
        color,
        scale,
        life: 1.05,
        maxLife: 1.05,
      });
    }

    _updateParticlesAndPopups(dt) {
      this.shake.trauma = Math.max(0, this.shake.trauma - dt * 2.4);
      if (this.shake.trauma > 0) {
        const mag = this.shake.trauma * this.shake.trauma * 12;
        this.shake.x = (Math.random() * 2 - 1) * mag;
        this.shake.y = (Math.random() * 2 - 1) * mag;
      } else {
        this.shake.x = 0;
        this.shake.y = 0;
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.life -= dt;
        if (pt.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.z = Math.max(0, pt.z + pt.vz * dt);
        if (pt.kind !== 'smoke' && pt.kind !== 'dust' && pt.kind !== 'ring') {
          pt.vz -= 420 * dt;
        }
      }

      for (let i = this.popups.length - 1; i >= 0; i--) {
        const pop = this.popups[i];
        pop.life -= dt;
        pop.y -= 36 * dt;
        if (pop.life <= 0) {
          this.popups.splice(i, 1);
        }
      }
    }

    _syncHud() {
      const c = this._hudCache;
      const timerStr = this.stage.endless
        ? `생존 ${formatTime(this.elapsed)}`
        : formatTime(Math.max(0, this.stage.duration - this.elapsed));
      if (c.timerStr !== timerStr) {
        c.timerStr = timerStr;
        this.dom.hudTimer.textContent = timerStr;
      }

      const showNextRank = Boolean(this.stage.endless);
      if (c.showNextRank !== showNextRank) {
        c.showNextRank = showNextRank;
        this.dom.hudNextRank.classList.toggle('hidden', !showNextRank);
      }
      if (showNextRank) {
        const target = this.leaderboard.getNextRankTarget(this.score);
        let rankStr = '👑 1등 도전!';
        if (target) {
          const curTargetNum = target.isFirstPlace ? 0 : target.rank;
          if (this._lastTargetedRank !== null && curTargetNum < this._lastTargetedRank) {
            this.audio.rareBonus();
            this._spawnPopup(this.robot.x, this.robot.y - 72, `🎉 ${this._lastTargetedRank}등 돌파!!`, '#fde047', 1.25);
          }
          this._lastTargetedRank = curTargetNum;
          rankStr = target.isFirstPlace
            ? '👑 전체 1등 돌파 중!'
            : `🔥 ${target.rank}등까지 ${target.gap.toLocaleString()}점`;
        }
        if (c.rankStr !== rankStr) {
          c.rankStr = rankStr;
          this.dom.hudNextRank.textContent = rankStr;
        }
      }

      if (c.score !== this.score) {
        c.score = this.score;
        this.dom.hudScore.textContent = this.score.toLocaleString();
      }

      const showCombo = this.comboCount >= 2;
      if (c.showCombo !== showCombo) {
        c.showCombo = showCombo;
        this.dom.hudCombo.classList.toggle('hidden', !showCombo);
      }
      if (showCombo && c.comboCount !== this.comboCount) {
        c.comboCount = this.comboCount;
        const mult = Math.min(COMBO.maxMultiplier, 1 + (this.comboCount - 1) * COMBO.step);
        this.dom.hudCombo.textContent = `${this.comboCount} COMBO (x${mult.toFixed(1)})`;
      }

      const ovPct = Math.round(this.overloadRatio * 100);
      if (c.ovPct !== ovPct) {
        c.ovPct = ovPct;
        this.dom.hudOverloadText.textContent = `${ovPct}%`;
        this.dom.hudOverloadFill.style.width = `${ovPct}%`;
      }
      const isDanger = this.overloadRatio >= 0.7;
      if (c.isDanger !== isDanger) {
        c.isDanger = isDanger;
        this.dom.hudOverloadBox.classList.toggle('danger', isDanger);
      }

      const feverMax = this._getCurrentFeverMax();
      const fvPct = Math.min(100, Math.round((this.feverGauge / feverMax) * 100));
      const fvText = this.feverActive ? 'FEVER x2!' : `${fvPct}%`;
      if (c.fvText !== fvText) {
        c.fvText = fvText;
        this.dom.hudFeverText.textContent = fvText;
      }
      if (c.fvPct !== fvPct) {
        c.fvPct = fvPct;
        this.dom.hudFeverFill.style.width = `${fvPct}%`;
      }
      if (c.feverActive !== this.feverActive) {
        c.feverActive = this.feverActive;
        this.dom.hudFeverBox.classList.toggle('fever-active', this.feverActive);
      }

      // Sync Skill Dock
      const vacActive = this.vacuumTimer > 0;
      const vacText = vacActive ? `${this.vacuumTimer.toFixed(1)}초` : `${this.vacuumCharges} / ${SKILLS.vacuumMax}`;
      if (c.vacText !== vacText) {
        c.vacText = vacText;
        this.dom.vacuumCount.textContent = vacText;
      }
      const vacDisabled = this.vacuumCharges <= 0 && !vacActive;
      if (c.vacDisabled !== vacDisabled) {
        c.vacDisabled = vacDisabled;
        this.dom.btnVacuum.disabled = vacDisabled;
      }
      if (c.vacActive !== vacActive) {
        c.vacActive = vacActive;
        this.dom.btnVacuum.classList.toggle('active', vacActive);
      }
      const vacBarPct = vacActive ? Math.round((this.vacuumTimer / SKILLS.vacuumDuration) * 100) : 0;
      if (c.vacBarPct !== vacBarPct) {
        c.vacBarPct = vacBarPct;
        this.dom.vacuumActiveBar.style.width = `${vacBarPct}%`;
      }

      const helperRunning = this.helpers.length > 0;
      const helperText = helperRunning ? '청소 중!' : `${this.helperCharges} / ${SKILLS.helperMax}`;
      if (c.helperText !== helperText) {
        c.helperText = helperText;
        this.dom.helperCount.textContent = helperText;
      }
      const helperDisabled = this.helperCharges <= 0 || helperRunning;
      if (c.helperDisabled !== helperDisabled) {
        c.helperDisabled = helperDisabled;
        this.dom.btnHelper.disabled = helperDisabled;
      }
      if (c.helperRunning !== helperRunning) {
        c.helperRunning = helperRunning;
        this.dom.btnHelper.classList.toggle('active', helperRunning);
      }
    }

    async _refreshGlobalRankings(highlightNameKey = null) {
      const res = await this.leaderboard.fetchTop30();
      const rows = res.rows || [];

      if (rows.length > 0) {
        this.dom.hofName.textContent = rows[0].name;
        this.dom.hofScore.textContent = `${rows[0].score.toLocaleString()}점 (${formatTime(rows[0].timeSec)})`;
      } else {
        this.dom.hofName.textContent = '도전자 대기 중';
        this.dom.hofScore.textContent = '첫 1등의 주인공이 되어보세요!';
      }

      if (!this.dom.overlayRanking.classList.contains('hidden')) {
        this._renderRankingModal(res, highlightNameKey);
      }
    }

    async openRankingModal(highlightNameKey = null) {
      this.dom.overlayRanking.classList.remove('hidden');
      const res = await this.leaderboard.fetchTop30();
      this._renderRankingModal(res, highlightNameKey);
    }

    closeRankingModal() {
      this.dom.overlayRanking.classList.add('hidden');
    }

    _createLaurelSvg(rank) {
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 44 36');
      svg.setAttribute('class', 'laurel-svg');

      const leafColor =
        rank === 1 ? '#b91c1c' : rank === 2 ? '#475569' : rank === 3 ? '#b45309' : '#16a34a';
      const strokeColor =
        rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#d97706' : '#15803d';

      const leftBranch = document.createElementNS(svgNS, 'path');
      leftBranch.setAttribute('d', 'M14,31 C6,24 5,13 13,5');
      leftBranch.setAttribute('fill', 'none');
      leftBranch.setAttribute('stroke', strokeColor);
      leftBranch.setAttribute('stroke-width', '2.2');
      leftBranch.setAttribute('stroke-linecap', 'round');
      svg.appendChild(leftBranch);

      const rightBranch = document.createElementNS(svgNS, 'path');
      rightBranch.setAttribute('d', 'M30,31 C38,24 39,13 31,5');
      rightBranch.setAttribute('fill', 'none');
      rightBranch.setAttribute('stroke', strokeColor);
      rightBranch.setAttribute('stroke-width', '2.2');
      rightBranch.setAttribute('stroke-linecap', 'round');
      svg.appendChild(rightBranch);

      const leafCoords = [
        [8, 23, -30],
        [7, 16, -15],
        [9, 9, 10],
        [36, 23, 30],
        [37, 16, 15],
        [35, 9, -10],
      ];
      for (const [cx, cy, rot] of leafCoords) {
        const leaf = document.createElementNS(svgNS, 'ellipse');
        leaf.setAttribute('cx', String(cx));
        leaf.setAttribute('cy', String(cy));
        leaf.setAttribute('rx', '3.5');
        leaf.setAttribute('ry', '1.8');
        leaf.setAttribute('fill', leafColor);
        leaf.setAttribute('transform', `rotate(${rot} ${cx} ${cy})`);
        svg.appendChild(leaf);
      }
      return svg;
    }

    _renderRankingModal(res, highlightNameKey = null) {
      const rows = res.rows || [];
      const listEl = this.dom.rankingList;
      listEl.textContent = '';

      if (res.source === 'firebase') {
        this.dom.rankingSourceBadge.textContent = '🌐 실시간 글로벌 순위';
      } else {
        this.dom.rankingSourceBadge.textContent = '📱 기기 로컬 순위';
      }

      if (res.permissionDenied) {
        this.dom.rankingRuleNote.textContent =
          '참고: Firebase 보안 규칙에 ssudam_rankings 허용 설정이 없어 현재 기기 순위로 표시됩니다.';
        this.dom.rankingRuleNote.classList.remove('hidden');
      } else {
        this.dom.rankingRuleNote.classList.add('hidden');
      }

      if (rows.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'ranking-empty';
        empty.textContent = '아직 등록된 경쟁전 기록이 없습니다. 첫 1등에 도전하세요!';
        listEl.appendChild(empty);
        return;
      }

      let myEl = null;
      rows.forEach((row, idx) => {
        const rank = idx + 1;
        const li = document.createElement('li');
        li.className = 'rank-item';
        if (rank === 1) li.classList.add('rank-1');
        else if (rank === 2) li.classList.add('rank-2');
        else if (rank === 3) li.classList.add('rank-3');
        else if (rank <= 10) li.classList.add('rank-top10');

        const isMe = highlightNameKey && row.nameKey === highlightNameKey;
        if (isMe) {
          li.classList.add('is-me');
          myEl = li;
        }

        const badgeWrap = document.createElement('div');
        badgeWrap.className = 'rank-badge-wrap';
        if (rank <= 10) {
          badgeWrap.appendChild(this._createLaurelSvg(rank));
        }
        const numSpan = document.createElement('span');
        numSpan.className = 'rank-num-text';
        numSpan.textContent =
          rank === 1 ? '👑1' : rank === 2 ? '🥈2' : rank === 3 ? '🥉3' : String(rank);
        badgeWrap.appendChild(numSpan);

        const mainDiv = document.createElement('div');
        mainDiv.className = 'rank-main';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'rank-name';
        nameSpan.textContent = row.name;
        mainDiv.appendChild(nameSpan);

        if (isMe) {
          const mePill = document.createElement('span');
          mePill.className = 'me-pill';
          mePill.textContent = 'ME';
          mainDiv.appendChild(mePill);
        }

        const rightDiv = document.createElement('div');
        rightDiv.className = 'rank-right';
        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'rank-score';
        scoreSpan.textContent = `${row.score.toLocaleString()}점`;
        const timeSpan = document.createElement('span');
        timeSpan.className = 'rank-time';
        timeSpan.textContent = `생존 ${formatTime(row.timeSec)}`;
        rightDiv.append(scoreSpan, timeSpan);

        li.append(badgeWrap, mainDiv, rightDiv);
        listEl.appendChild(li);
      });

      if (myEl) {
        setTimeout(() => {
          myEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
      } else {
        this.dom.rankingScrollArea.scrollTop = 0;
      }
    }

    async _handleRankSubmit() {
      if (this.dom.btnSubmitRank.disabled) return;
      const rawName = this.dom.rankNickname.value;
      this.dom.btnSubmitRank.disabled = true;
      this.dom.btnSubmitRank.textContent = '등록 중...';

      const res = await this.leaderboard.submitScore(rawName, this.score, this.elapsed);
      this.dom.rankSubmitStatus.classList.remove('hidden');

      if (res.alreadyHigher) {
        this.dom.rankSubmitStatus.textContent = `이미 더 높은 최고 기록(${res.existingScore.toLocaleString()}점)이 등록되어 있습니다!`;
        this.dom.btnSubmitRank.textContent = '확인됨';
      } else {
        const rankText = res.rank ? `현재 ${res.rank}등` : '등록 완료';
        this.dom.rankSubmitStatus.textContent = `✅ '${res.name}' 기록 반영 완료! (${rankText})`;
        this.dom.btnSubmitRank.textContent = '등록 완료';
        if (res.rank && res.rank <= 10) {
          this.audio.stageClear();
        }
      }

      await this._refreshGlobalRankings(res.name.toLowerCase());
      await this.openRankingModal(res.name.toLowerCase());
    }

    _setupDragScroll(el) {
      if (!el) return;
      let isDown = false;
      let startY = 0;
      let startTop = 0;

      el.addEventListener('mousedown', (e) => {
        isDown = true;
        startY = e.clientY;
        startTop = el.scrollTop;
        el.classList.add('dragging');
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const dy = e.clientY - startY;
        el.scrollTop = startTop - dy;
      });

      window.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        el.classList.remove('dragging');
      });
    }

    _buildAimGuide() {
      if (this.mode !== 'PLAYING' || !this.robot.held) return null;

      if (this.input.isTouchMode) {
        const drag = this.input.getTouchDragThrow();
        if (!drag) return null;
        const dist = 210 + drag.power * 260;
        return {
          fromX: this.robot.handX,
          fromY: this.robot.handY,
          targetX: this.robot.x + drag.dirX * dist,
          targetY: this.robot.y + drag.dirY * dist,
          power: drag.power,
        };
      }

      if (this.input.pcCharging) {
        const power = this.input.getPcChargeRatio();
        const dx = this.input.aimWorldX - this.robot.x;
        const dy = this.input.aimWorldY - this.robot.y;
        const dist = Math.hypot(dx, dy);
        const dirX = dist > 1 ? dx / dist : this.robot.facingX;
        const dirY = dist > 1 ? dy / dist : this.robot.facingY;
        const clampedDist = clamp(dist, 165, 220 + power * 260);
        return {
          fromX: this.robot.handX,
          fromY: this.robot.handY,
          targetX: this.robot.x + dirX * clampedDist,
          targetY: this.robot.y + dirY * clampedDist,
          power,
        };
      }

      return null;
    }

    _buildRenderState() {
      const hoverTarget =
        this.mode === 'PLAYING' && !this.robot.held
          ? this._findBestTarget(
              this.input.isTouchMode ? this.robot.x : this.input.aimWorldX,
              this.input.isTouchMode ? this.robot.y : this.input.aimWorldY,
              !this.input.isTouchMode
            )
          : null;

      const ctxInfo = this._getCurrentStageContext();
      const feverMax = this._getCurrentFeverMax();

      return {
        time: this.time,
        layout: this.layout,
        theme: this.mode === 'TITLE' ? 'bright_day' : this.stage.theme,
        isNight: ctxInfo.isNight,
        cyclePhase: (this.elapsed % (28 * STAGE_ORDER.length)) / (28 * STAGE_ORDER.length),
        overloadRatio: this.overloadRatio,
        feverActive: this.feverActive,
        feverRatio: this.feverGauge / feverMax,
        vacuumActive: this.vacuumTimer > 0,
        vacuumRadius: this.feverActive ? SKILLS.vacuumFeverRadius : SKILLS.vacuumRadius,
        shake: this.shake,
        smartBin: this.smartBin,
        humanBin: this.humanBin,
        robot: this.robot,
        trashes: this.trashes,
        people: this.people,
        helpers: this.helpers,
        particles: this.particles,
        popups: this.popups,
        aimGuide: this._buildAimGuide(),
        hoverTarget,
        touchOverlay:
          this.mode === 'PLAYING'
            ? this.input.getTouchOverlayState(this.layout.mode === 'portrait' || this.input.hasCoarsePointer)
            : null,
      };
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    ns.game = new SsudamGame();
  });
})(window.Ssudam);
