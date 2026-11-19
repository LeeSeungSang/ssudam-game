window.Ssudam = window.Ssudam || {};

(function (ns) {
  const { WORLD_W, WORLD_H, PLAZA, ROBOT, TRASH_TYPES } = ns.CONFIG;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpColor(hex1, hex2, t) {
    const c1 = parseInt(hex1.slice(1), 16);
    const c2 = parseInt(hex2.slice(1), 16);
    const r = Math.round(lerp((c1 >> 16) & 255, (c2 >> 16) & 255, t));
    const g = Math.round(lerp((c1 >> 8) & 255, (c2 >> 8) & 255, t));
    const b = Math.round(lerp(c1 & 255, c2 & 255, t));
    return `rgb(${r}, ${g}, ${b})`;
  }

  const THEMES = {
    bright_day: {
      skyTop: '#60a5fa',
      skyBot: '#e0f2fe',
      stationRoof: '#355070',
      stationWall: '#f1f5f9',
      stationGlass: '#93c5fd',
      plazaTileA: '#eef4fa',
      plazaTileB: '#e2ebf4',
      plazaEdge: '#cbd8e8',
      lampGlow: 0.04,
      neonAlpha: 0.0,
      halloweenAlpha: 0.0,
    },
    commute_day: {
      skyTop: '#38bdf8',
      skyBot: '#bae6fd',
      stationRoof: '#26466d',
      stationWall: '#edf3fa',
      stationGlass: '#60a5fa',
      plazaTileA: '#e7eff7',
      plazaTileB: '#dbe6f2',
      plazaEdge: '#c3d2e4',
      lampGlow: 0.08,
      neonAlpha: 0.0,
      halloweenAlpha: 0.0,
    },
    afternoon: {
      skyTop: '#2563eb',
      skyBot: '#fde68a',
      stationRoof: '#1e3a5f',
      stationWall: '#f6f5f0',
      stationGlass: '#7dd3fc',
      plazaTileA: '#f2efe9',
      plazaTileB: '#e6e0d8',
      plazaEdge: '#cfc6ba',
      lampGlow: 0.14,
      neonAlpha: 0.08,
      halloweenAlpha: 0.0,
    },
    sunset: {
      skyTop: '#be123c',
      skyBot: '#fdba74',
      stationRoof: '#3b2449',
      stationWall: '#f5e6df',
      stationGlass: '#fb923c',
      plazaTileA: '#eadcd6',
      plazaTileB: '#decbc4',
      plazaEdge: '#c3aba2',
      lampGlow: 0.45,
      neonAlpha: 0.3,
      halloweenAlpha: 0.0,
    },
    dusk: {
      skyTop: '#1e1b4b',
      skyBot: '#7c2d12',
      stationRoof: '#1e2142',
      stationWall: '#5b5272',
      stationGlass: '#f59e0b',
      plazaTileA: '#645c7a',
      plazaTileB: '#574f6c',
      plazaEdge: '#433b56',
      lampGlow: 0.68,
      neonAlpha: 0.6,
      halloweenAlpha: 0.0,
    },
    night_early: {
      skyTop: '#0b1533',
      skyBot: '#1e3a5f',
      stationRoof: '#111a36',
      stationWall: '#334469',
      stationGlass: '#38bdf8',
      plazaTileA: '#3a4766',
      plazaTileB: '#303b57',
      plazaEdge: '#232d45',
      lampGlow: 0.85,
      neonAlpha: 0.82,
      halloweenAlpha: 0.0,
    },
    friday_neon: {
      skyTop: '#060c1f',
      skyBot: '#31104c',
      stationRoof: '#0f162e',
      stationWall: '#252d52',
      stationGlass: '#ec4899',
      plazaTileA: '#2a3252',
      plazaTileB: '#222945',
      plazaEdge: '#181e36',
      lampGlow: 0.95,
      neonAlpha: 1.0,
      halloweenAlpha: 0.0,
    },
    halloween: {
      skyTop: '#140826',
      skyBot: '#4c1d95',
      stationRoof: '#1e0f38',
      stationWall: '#2d1c4d',
      stationGlass: '#f97316',
      plazaTileA: '#2c2046',
      plazaTileB: '#24183b',
      plazaEdge: '#19102b',
      lampGlow: 0.95,
      neonAlpha: 0.95,
      halloweenAlpha: 1.0,
    },
  };

  const CYCLE_ORDER = [
    THEMES.bright_day,
    THEMES.commute_day,
    THEMES.afternoon,
    THEMES.sunset,
    THEMES.dusk,
    THEMES.night_early,
    THEMES.friday_neon,
    THEMES.halloween,
  ];

  class GameRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cssW = WORLD_W;
      this.cssH = WORLD_H;
      this.dpr = 1;
      this.resize();
    }

    resize() {
      const rect = this.canvas.parentElement
        ? this.canvas.parentElement.getBoundingClientRect()
        : { width: window.innerWidth, height: window.innerHeight };
      this.cssW = Math.max(300, Math.floor(rect.width));
      this.cssH = Math.max(240, Math.floor(rect.height));
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(this.cssW * this.dpr);
      this.canvas.height = Math.floor(this.cssH * this.dpr);
    }

    _getPalette(theme, cyclePhase) {
      if (theme !== 'cycle') {
        return THEMES[theme] || THEMES.bright_day;
      }
      const scaled = (cyclePhase % 1) * CYCLE_ORDER.length;
      const idx = Math.floor(scaled);
      const frac = scaled - idx;
      const a = CYCLE_ORDER[idx % CYCLE_ORDER.length];
      const b = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
      return {
        skyTop: lerpColor(a.skyTop, b.skyTop, frac),
        skyBot: lerpColor(a.skyBot, b.skyBot, frac),
        stationRoof: lerpColor(a.stationRoof, b.stationRoof, frac),
        stationWall: lerpColor(a.stationWall, b.stationWall, frac),
        stationGlass: lerpColor(a.stationGlass, b.stationGlass, frac),
        plazaTileA: lerpColor(a.plazaTileA, b.plazaTileA, frac),
        plazaTileB: lerpColor(a.plazaTileB, b.plazaTileB, frac),
        plazaEdge: lerpColor(a.plazaEdge, b.plazaEdge, frac),
        lampGlow: lerp(a.lampGlow, b.lampGlow, frac),
        neonAlpha: lerp(a.neonAlpha, b.neonAlpha, frac),
        halloweenAlpha: lerp(a.halloweenAlpha, b.halloweenAlpha, frac),
      };
    }

    render(state) {
      const ctx = this.ctx;
      const vp = ns.getViewportTransform(this.cssW, this.cssH);
      const pal = this._getPalette(state.theme, state.cyclePhase || 0);

      ctx.save();
      ctx.scale(this.dpr, this.dpr);

      this._drawFullBleedBackdrop(ctx, vp, pal);

      ctx.save();
      ctx.translate(vp.offsetX + state.shake.x * vp.scale, vp.offsetY + state.shake.y * vp.scale);
      ctx.scale(vp.scale, vp.scale);

      this._drawSuwonStation(ctx, pal, state.time);
      this._drawPlaza(ctx, pal, state);
      this._drawSmartBin(ctx, state.smartBin, pal, state.time);
      this._drawHumanBin(ctx, state.humanBin, pal, state.time);

      this._drawRobotGroundGuides(ctx, state);

      if (state.aimGuide) {
        this._drawAimGuide(ctx, state.aimGuide);
      }

      const drawables = [];

      for (const tr of state.trashes) {
        if (tr.held) continue;
        drawables.push({
          sortY: tr.y,
          draw: () => this._drawTrash(ctx, tr, state.time),
        });
      }

      for (const p of state.people) {
        if (p.held) continue;
        drawables.push({
          sortY: p.y,
          draw: () => this._drawPerson(ctx, p, state.time),
        });
      }

      if (state.helpers) {
        for (const h of state.helpers) {
          drawables.push({
            sortY: h.y,
            draw: () => this._drawHelperWorker(ctx, h, state.isNight, state.time),
          });
        }
      }

      drawables.push({
        sortY: state.robot.y,
        draw: () => this._drawRobot(ctx, state.robot, state),
      });

      drawables.sort((a, b) => a.sortY - b.sortY);
      for (const d of drawables) {
        d.draw();
      }

      this._drawParticles(ctx, state.particles);
      this._drawPopups(ctx, state.popups);

      if (state.feverActive) {
        ctx.save();
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.45 + 0.25 * Math.sin(state.time * 10)})`;
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, WORLD_W - 10, WORLD_H - 10);
        ctx.restore();
      }

      if (state.overloadRatio >= 0.7) {
        const pulse = 0.16 + 0.12 * Math.sin(state.time * 9);
        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${pulse * 2.2})`;
        ctx.lineWidth = 16;
        ctx.strokeRect(8, 8, WORLD_W - 16, WORLD_H - 16);
        ctx.restore();
      }

      ctx.restore();

      if (state.touchOverlay) {
        this._drawTouchControls(ctx, state.touchOverlay, state.robot.held !== null);
      }

      ctx.restore();
    }

    _drawFullBleedBackdrop(ctx, vp, pal) {
      const splitY = vp.offsetY + 230 * vp.scale;
      const skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(10, splitY));
      skyGrad.addColorStop(0, pal.skyTop);
      skyGrad.addColorStop(1, pal.skyBot);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, this.cssW, Math.max(0, splitY + 4));

      ctx.fillStyle = pal.plazaEdge;
      ctx.fillRect(0, Math.max(0, splitY), this.cssW, this.cssH - Math.max(0, splitY));
    }

    _drawSuwonStation(ctx, pal, time) {
      const sky = ctx.createLinearGradient(0, 0, 0, 232);
      sky.addColorStop(0, pal.skyTop);
      sky.addColorStop(1, pal.skyBot);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WORLD_W, 232);

      // Stars & Full Moon at night/halloween
      if (pal.neonAlpha > 0.25) {
        ctx.save();
        const starSeeds = [90, 180, 260, 420, 560, 740, 890, 1020, 1140, 1210];
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < starSeeds.length; i++) {
          const twinkle = 0.45 + 0.55 * Math.sin(time * 2.5 + i * 1.7);
          ctx.globalAlpha = pal.neonAlpha * twinkle * 0.8;
          ctx.beginPath();
          ctx.arc(starSeeds[i], 22 + ((i * 29) % 55), 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Halloween Full Moon + Flying Bats
      if (pal.halloweenAlpha > 0.15) {
        ctx.save();
        ctx.globalAlpha = pal.halloweenAlpha;
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 28;
        ctx.beginPath();
        ctx.arc(1070, 58, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
        ctx.beginPath();
        ctx.arc(1062, 52, 7, 0, Math.PI * 2);
        ctx.arc(1078, 66, 5, 0, Math.PI * 2);
        ctx.fill();

        // Bats flapping across the moon & sky
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          const bx = ((time * (48 + i * 14) + i * 310) % (WORLD_W + 120)) - 60;
          const by = 42 + i * 18 + Math.sin(time * 3 + i) * 10;
          const flap = Math.sin(time * 12 + i * 2) * 7;
          ctx.beginPath();
          ctx.moveTo(bx - 12, by - flap);
          ctx.quadraticCurveTo(bx - 5, by - 5, bx, by);
          ctx.quadraticCurveTo(bx + 5, by - 5, bx + 12, by - flap);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Background skyline silhouettes
      ctx.fillStyle = pal.neonAlpha > 0.35 ? 'rgba(15, 23, 42, 0.55)' : 'rgba(148, 184, 218, 0.42)';
      const buildings = [
        [20, 70, 95, 160],
        [125, 95, 70, 135],
        [210, 55, 110, 175],
        [960, 62, 105, 168],
        [1080, 88, 82, 142],
        [1175, 68, 90, 162],
      ];
      for (const [bx, by, bw, bh] of buildings) {
        ctx.fillRect(bx, by, bw, bh);
      }

      // Main Suwon Station Building
      const stX = 280;
      const stW = 720;
      ctx.fillStyle = pal.stationWall;
      ctx.fillRect(stX, 62, stW, 170);

      // Angled Modern Glass Roof Canopy
      ctx.fillStyle = pal.stationRoof;
      ctx.beginPath();
      ctx.moveTo(stX - 36, 72);
      ctx.lineTo(WORLD_W * 0.5, 26);
      ctx.lineTo(stX + stW + 36, 72);
      ctx.lineTo(stX + stW + 24, 92);
      ctx.lineTo(stX - 24, 92);
      ctx.closePath();
      ctx.fill();

      // Glass Curtain Wall & Mullions
      ctx.fillStyle = pal.stationGlass;
      ctx.fillRect(stX + 24, 98, stW - 48, 122);
      ctx.strokeStyle = pal.stationRoof;
      ctx.lineWidth = 3;
      for (let gx = stX + 24; gx <= stX + stW - 24; gx += 60) {
        ctx.beginPath();
        ctx.moveTo(gx, 98);
        ctx.lineTo(gx, 220);
        ctx.stroke();
      }

      // Station Entrance Doors
      ctx.fillStyle = '#0f2744';
      ctx.fillRect(WORLD_W * 0.5 - 76, 152, 152, 74);
      ctx.fillStyle = pal.neonAlpha > 0.3 ? 'rgba(253, 224, 71, 0.35)' : 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(WORLD_W * 0.5 - 70, 158, 66, 66);
      ctx.fillRect(WORLD_W * 0.5 + 4, 158, 66, 66);

      // Signboard: 수원역 SUWON STATION
      const signW = 286;
      const signH = 54;
      const signX = WORLD_W * 0.5 - signW * 0.5;
      const signY = 50;
      ctx.save();
      if (pal.neonAlpha > 0.2) {
        ctx.shadowColor = pal.halloweenAlpha > 0.4 ? '#f97316' : '#ec4899';
        ctx.shadowBlur = 18 * pal.neonAlpha;
      }
      ctx.fillStyle = pal.halloweenAlpha > 0.4 ? '#2e1065' : '#0B2A5B';
      this._roundRect(ctx, signX, signY, signW, signH, 10);
      ctx.fill();
      ctx.strokeStyle = pal.halloweenAlpha > 0.4 ? '#f97316' : '#60a5fa';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '900 24px "Pretendard", "Malgun Gothic", sans-serif';
      ctx.fillText('수원역', WORLD_W * 0.5, signY + 28);
      ctx.font = '700 11px "Pretendard", sans-serif';
      ctx.fillStyle = pal.halloweenAlpha > 0.4 ? '#fdba74' : '#93c5fd';
      ctx.fillText(pal.halloweenAlpha > 0.4 ? 'SUWON STATION · HALLOWEEN' : 'SUWON STATION', WORLD_W * 0.5, signY + 45);

      // Eco Trees
      const treePositions = [110, 215, 1065, 1170];
      for (const tx of treePositions) {
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(tx - 6, 175, 12, 55);
        ctx.fillStyle = pal.halloweenAlpha > 0.4 ? '#3b0764' : '#2e7d32';
        ctx.beginPath();
        ctx.arc(tx, 162, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.halloweenAlpha > 0.4 ? '#581c87' : '#43a047';
        ctx.beginPath();
        ctx.arc(tx - 10, 152, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      // Jack-o'-lantern decorations for Halloween!
      if (pal.halloweenAlpha > 0.25) {
        const pumpkins = [258, 545, 735, 1022];
        ctx.save();
        ctx.globalAlpha = pal.halloweenAlpha;
        for (const px of pumpkins) {
          ctx.fillStyle = '#f97316';
          ctx.strokeStyle = '#7c2d12';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(px, 214, 15, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#15803d';
          ctx.fillRect(px - 2, 199, 4, 6);
          // Glowing face
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(px - 7, 210, 4, 4);
          ctx.fillRect(px + 3, 210, 4, 4);
          ctx.fillRect(px - 5, 218, 10, 3);
        }
        ctx.restore();
      }

      // Street Lamps
      for (const lx of [165, 1115]) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(lx - 3, 128, 6, 102);
        ctx.fillStyle = pal.lampGlow > 0.3 ? '#fef08a' : '#e2e8f0';
        ctx.beginPath();
        ctx.arc(lx, 124, 9, 0, Math.PI * 2);
        ctx.fill();
        if (pal.lampGlow > 0.15) {
          const grad = ctx.createRadialGradient(lx, 124, 4, lx, 155, 88);
          grad.addColorStop(0, `rgba(253, 224, 71, ${0.42 * pal.lampGlow})`);
          grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(lx, 155, 88, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    _drawPlaza(ctx, pal, state) {
      ctx.fillStyle = pal.plazaEdge;
      ctx.fillRect(0, 226, WORLD_W, WORLD_H - 226);

      const tileSize = 64;
      for (let y = PLAZA.top; y < PLAZA.bottom; y += tileSize) {
        for (let x = PLAZA.left; x < PLAZA.right; x += tileSize) {
          const ix = Math.floor((x - PLAZA.left) / tileSize);
          const iy = Math.floor((y - PLAZA.top) / tileSize);
          ctx.fillStyle = (ix + iy) % 2 === 0 ? pal.plazaTileA : pal.plazaTileB;
          ctx.fillRect(x, y, Math.min(tileSize, PLAZA.right - x), Math.min(tileSize, PLAZA.bottom - y));
        }
      }

      ctx.fillStyle = 'rgba(245, 158, 11, 0.36)';
      ctx.fillRect(PLAZA.left, PLAZA.top + 14, PLAZA.right - PLAZA.left, 10);

      ctx.save();
      ctx.strokeStyle = pal.neonAlpha > 0.3 ? 'rgba(147, 197, 253, 0.16)' : 'rgba(11, 42, 91, 0.08)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(WORLD_W * 0.5, 495, 92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = pal.neonAlpha > 0.3 ? 'rgba(147, 197, 253, 0.2)' : 'rgba(11, 42, 91, 0.12)';
      ctx.font = '800 18px "Pretendard", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SUWON CLEAN PLAZA', WORLD_W * 0.5, 501);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.strokeRect(PLAZA.left, PLAZA.top, PLAZA.right - PLAZA.left, PLAZA.bottom - PLAZA.top);
      ctx.setLineDash([]);

      const holdingCulprit =
        state.robot.held && state.robot.held.kind === 'person' && state.robot.held.entity.isCulprit;
      ctx.fillStyle = holdingCulprit
        ? `rgba(239, 68, 68, ${0.18 + 0.1 * Math.sin(state.time * 8)})`
        : 'rgba(239, 68, 68, 0.06)';
      ctx.fillRect(0, PLAZA.top, PLAZA.left, PLAZA.bottom - PLAZA.top);
      ctx.fillRect(PLAZA.right, PLAZA.top, WORLD_W - PLAZA.right, PLAZA.bottom - PLAZA.top);
      ctx.fillRect(0, PLAZA.bottom, WORLD_W, WORLD_H - PLAZA.bottom);

      ctx.fillStyle = holdingCulprit ? '#dc2626' : 'rgba(220, 38, 38, 0.65)';
      ctx.font = '800 14px "Pretendard", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚾ 광장 밖 홈런 투척 ZONE (투기자 추방!)', WORLD_W * 0.5, PLAZA.bottom + 26);
      ctx.restore();
    }

    _drawSmartBin(ctx, bin) {
      const bounceScale = 1 + bin.bounce * 0.12;
      ctx.save();
      ctx.translate(bin.x, bin.y);
      ctx.scale(bounceScale, 2 - bounceScale);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      this._roundRect(ctx, -bin.width * 0.5 + 4, 24, bin.width, 20, 8);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      this._roundRect(ctx, -bin.width * 0.5, -36, bin.width, bin.height, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      this._roundRect(ctx, 20, -48, 36, 14, 5);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(38, -41, 3.5, 0, Math.PI * 2);
      ctx.fill();

      const slots = [
        { label: '캔·병', color: '#43A047', x: -53 },
        { label: '플라스틱', color: '#1E88E5', x: 0 },
        { label: '종이류', color: '#F9A825', x: 53 },
      ];
      slots.forEach((s, idx) => {
        const isFlashing = bin.flashTimer > 0 && bin.flashIndex === idx;
        ctx.save();
        if (isFlashing) {
          ctx.shadowColor = '#fde047';
          ctx.shadowBlur = 16;
        }
        ctx.fillStyle = s.color;
        this._roundRect(ctx, s.x - 22, -26, 44, 56, 6);
        ctx.fill();
        ctx.strokeStyle = isFlashing ? '#ffffff' : 'rgba(0,0,0,0.22)';
        ctx.lineWidth = isFlashing ? 3 : 1.5;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        this._roundRect(ctx, s.x - 13, -18, 26, 10, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 10.5px "Pretendard", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.label, s.x, 18);
        ctx.restore();
      });

      ctx.fillStyle = '#0B2A5B';
      this._roundRect(ctx, -68, -72, 136, 22, 999);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 12px "Pretendard", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('♻️ 스마트 분리수거함', 0, -57);
      ctx.restore();
    }

    _drawHumanBin(ctx, bin, pal, time) {
      const bounceScale = 1 + bin.bounce * 0.15;
      ctx.save();
      ctx.translate(bin.x, bin.y);
      ctx.scale(bounceScale, 2 - bounceScale);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      this._roundRect(ctx, -bin.width * 0.5 + 4, 24, bin.width, 22, 8);
      ctx.fill();

      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3;
      this._roundRect(ctx, -bin.width * 0.5, -34, bin.width, bin.height, 10);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      this._roundRect(ctx, -bin.width * 0.5 + 3, 18, bin.width - 6, 14, 4);
      ctx.clip();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-bin.width * 0.5, 18, bin.width, 14);
      ctx.fillStyle = '#18181b';
      for (let sx = -bin.width; sx < bin.width; sx += 18) {
        ctx.beginPath();
        ctx.moveTo(sx, 18);
        ctx.lineTo(sx + 9, 18);
        ctx.lineTo(sx + 2, 32);
        ctx.lineTo(sx - 7, 32);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      const openAmt = bin.lidOpen;
      if (openAmt > 0.05) {
        ctx.fillStyle = '#09090b';
        this._roundRect(ctx, -bin.width * 0.42, -32, bin.width * 0.84, 22, 5);
        ctx.fill();
      }

      ctx.fillStyle = '#dc2626';
      this._roundRect(ctx, -56, -12, 112, 24, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13px "Pretendard", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('인간쓰레기통', 0, 5);

      ctx.save();
      ctx.translate(-bin.width * 0.5, -34);
      ctx.rotate(-openAmt * 0.72);
      ctx.fillStyle = '#52525b';
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3;
      this._roundRect(ctx, -4, -12, bin.width + 8, 15, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      this._roundRect(ctx, bin.width * 0.5 - 16, -18, 32, 7, 3);
      ctx.fill();
      ctx.restore();

      const pulse = openAmt > 0.3 ? 1 + 0.06 * Math.sin(time * 12) : 1;
      ctx.save();
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#991b1b';
      this._roundRect(ctx, -64, -74, 128, 22, 999);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.font = '900 12px "Pretendard", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚨 투기자 전용 덩크', 0, -59);
      ctx.restore();

      if (bin.slamTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, bin.slamTimer * 2);
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 4;
        ctx.font = '900 22px "Pretendard", sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText('철컹!!', 0, -90 - (0.6 - bin.slamTimer) * 28);
        ctx.fillText('철컹!!', 0, -90 - (0.6 - bin.slamTimer) * 28);
        ctx.restore();
      }
      ctx.restore();
    }

    _drawRobotGroundGuides(ctx, state) {
      const robot = state.robot;
      ctx.save();

      // Vacuum spinning suction vortex field!
      if (state.vacuumActive) {
        const rad = state.vacuumRadius || 126;
        const grad = ctx.createRadialGradient(robot.x, robot.y, 18, robot.x, robot.y, rad);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
        grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.14)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(robot.x, robot.y, rad, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(125, 211, 252, 0.72)';
        ctx.lineWidth = 3;
        for (let k = 0; k < 3; k++) {
          const baseAng = state.time * 7 + (k * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(robot.x, robot.y, rad * (0.45 + k * 0.22), baseAng, baseAng + Math.PI * 0.75);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = state.feverActive
        ? 'rgba(250, 204, 21, 0.35)'
        : 'rgba(30, 136, 229, 0.16)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(robot.x, robot.y, robot.reachRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (state.hoverTarget && !robot.held) {
        const ht = state.hoverTarget;
        const pulse = 1 + 0.12 * Math.sin(state.time * 10);
        ctx.strokeStyle = ht.isCulprit ? '#ef4444' : ht.kind === 'person' ? '#f59e0b' : '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(ht.x, ht.y + 4, ht.radius * 1.25 * pulse, ht.radius * 0.75 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawAimGuide(ctx, guide) {
      ctx.save();
      ctx.strokeStyle = `rgba(250, 204, 21, ${0.55 + guide.power * 0.4})`;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.moveTo(guide.fromX, guide.fromY);
      const midX = (guide.fromX + guide.targetX) * 0.5;
      const midY = (guide.fromY + guide.targetY) * 0.5 - 45 - guide.power * 45;
      ctx.quadraticCurveTo(midX, midY, guide.targetX, guide.targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(guide.targetX, guide.targetY, 16 + guide.power * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    _drawTrash(ctx, tr, time) {
      const def = TRASH_TYPES[tr.type] || TRASH_TYPES.bottle;
      const z = tr.z || 0;

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      const shScale = Math.max(0.45, 1 - z / 160);
      ctx.beginPath();
      ctx.ellipse(tr.x, tr.y + 8, def.radius * 0.9 * shScale, def.radius * 0.45 * shScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden sparkle ring for Rare 2x items
      if (def.isRare && z < 4) {
        const pulse = 1 + 0.14 * Math.sin(time * 7);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(tr.x, tr.y + 3, def.radius * 1.3 * pulse, def.radius * 0.72 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✨2x', tr.x, tr.y - 22 - Math.abs(Math.sin(time * 5)) * 4);
      }

      if (tr.isHostileToRobot) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y - z, def.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.translate(tr.x, tr.y - z);
      ctx.rotate(tr.rot || 0);
      this._drawTrashSprite(ctx, tr.type, def, time);
      ctx.restore();
    }

    _drawTrashSprite(ctx, type, def, time = 0) {
      switch (type) {
        case 'bottle': {
          ctx.fillStyle = '#60a5fa';
          ctx.strokeStyle = '#0f2744';
          ctx.lineWidth = 2;
          this._roundRect(ctx, -9, -15, 18, 28, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#1d4ed8';
          this._roundRect(ctx, -5, -20, 10, 7, 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-8, -4, 16, 7);
          break;
        }
        case 'can':
        case 'energy_can': {
          ctx.fillStyle = type === 'energy_can' ? '#06b6d4' : '#4ade80';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          this._roundRect(ctx, -9, -13, 18, 24, 5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(-7, -14, 14, 4);
          ctx.fillStyle = type === 'energy_can' ? '#fde047' : '#15803d';
          ctx.fillRect(-8, -3, 16, 6);
          break;
        }
        case 'coffee':
        case 'paper': {
          ctx.fillStyle = type === 'coffee' ? '#b45309' : '#f59e0b';
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-10, -11);
          ctx.lineTo(10, -11);
          ctx.lineTo(7, 13);
          ctx.lineTo(-7, 13);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          this._roundRect(ctx, -11, -15, 22, 6, 3);
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'tissue': {
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(-5, 0, 8, 0, Math.PI * 2);
          ctx.arc(5, 1, 7.5, 0, Math.PI * 2);
          ctx.arc(0, -5, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'leaf': {
          ctx.fillStyle = '#ea580c';
          ctx.strokeStyle = '#7c2d12';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(0, 0, 14, 8, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#fed7aa';
          ctx.beginPath();
          ctx.moveTo(-10, 4);
          ctx.lineTo(10, -4);
          ctx.stroke();
          break;
        }
        case 'necktie': {
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#7f1d1d';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-4, -14);
          ctx.lineTo(4, -14);
          ctx.lineTo(7, 6);
          ctx.lineTo(0, 16);
          ctx.lineTo(-7, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#fecaca';
          ctx.beginPath();
          ctx.moveTo(-4, -3);
          ctx.lineTo(4, 2);
          ctx.stroke();
          break;
        }
        case 'passport': {
          ctx.fillStyle = '#1e3a8a';
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.2;
          this._roundRect(ctx, -11, -14, 22, 28, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(0, -1, 5.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'hat': {
          ctx.fillStyle = '#fde047';
          ctx.strokeStyle = '#854d0e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 4, 17, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#facc15';
          this._roundRect(ctx, -9, -10, 18, 13, 5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-9, -1, 18, 3);
          break;
        }
        case 'ticket':
        case 'receipt':
        case 'flyer': {
          ctx.fillStyle = type === 'flyer' ? '#f472b6' : type === 'ticket' ? '#bae6fd' : '#f8fafc';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.8;
          this._roundRect(ctx, -13, -9, 26, 18, 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#475569';
          ctx.fillRect(-9, -4, 18, 3);
          ctx.fillRect(-9, 2, 12, 3);
          break;
        }
        case 'id_card': {
          ctx.fillStyle = '#e0f2fe';
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.2;
          this._roundRect(ctx, -14, -10, 28, 20, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(-10, -6, 8, 10);
          ctx.fillStyle = '#334155';
          ctx.fillRect(0, -5, 10, 3);
          ctx.fillRect(0, 1, 8, 3);
          break;
        }
        case 'soju': {
          ctx.fillStyle = '#16a34a';
          ctx.strokeStyle = '#052e16';
          ctx.lineWidth = 2;
          this._roundRect(ctx, -8, -10, 16, 24, 5);
          ctx.fill();
          ctx.stroke();
          this._roundRect(ctx, -4, -19, 8, 11, 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-7, -2, 14, 8);
          break;
        }
        case 'skewer': {
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-12, 12);
          ctx.lineTo(12, -12);
          ctx.stroke();
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(-2, 2, 5, 0, Math.PI * 2);
          ctx.arc(5, -5, 5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'vomit': {
          // Sanitized comic pastel lime puddle with cute stars!
          ctx.fillStyle = 'rgba(163, 230, 53, 0.86)';
          ctx.strokeStyle = '#4d7c0f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 2, 21, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(-7, 0, 3.5, 0, Math.PI * 2);
          ctx.arc(6, 4, 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f472b6';
          ctx.beginPath();
          ctx.arc(4, -3, 2.6, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'box': {
          ctx.fillStyle = '#d97706';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2.2;
          this._roundRect(ctx, -16, -14, 32, 26, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(-16, -3, 32, 5);
          ctx.fillRect(-3, -14, 6, 26);
          break;
        }
        case 'shopping_bag': {
          ctx.fillStyle = '#a855f7';
          ctx.strokeStyle = '#4c1d95';
          ctx.lineWidth = 2;
          this._roundRect(ctx, -13, -11, 26, 24, 3);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(0, -11, 6, Math.PI, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'candy': {
          ctx.fillStyle = '#f43f5e';
          ctx.strokeStyle = '#881337';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-16, -6);
          ctx.lineTo(-8, 0);
          ctx.lineTo(-16, 6);
          ctx.closePath();
          ctx.moveTo(16, -6);
          ctx.lineTo(8, 0);
          ctx.lineTo(16, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fb923c';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'pumpkin': {
          ctx.fillStyle = '#f97316';
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.ellipse(0, 2, 16, 13, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#15803d';
          ctx.fillRect(-2.5, -15, 5, 6);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-7, -2, 4, 4);
          ctx.fillRect(3, -2, 4, 4);
          ctx.fillRect(-5, 6, 10, 3);
          break;
        }
        case 'skull_cup': {
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          this._roundRect(ctx, -10, -12, 20, 24, 5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(-4, -2, 2.5, 0, Math.PI * 2);
          ctx.arc(4, -2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-4, 5, 8, 3);
          break;
        }
        case 'witch_hat': {
          ctx.fillStyle = '#7e22ce';
          ctx.strokeStyle = '#3b0764';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 6, 17, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-10, 5);
          ctx.lineTo(2, -17);
          ctx.lineTo(10, 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-9, 1, 18, 3);
          break;
        }
        default: {
          // Giant dark trash bag
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(0, 3, 18, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-6, -10);
          ctx.lineTo(0, -19);
          ctx.lineTo(6, -10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
      }
    }

    _drawPerson(ctx, p, time) {
      const z = p.z || 0;
      const sc = p.scale || 1;

      ctx.save();
      // Ghost semi-transparency trick in Stage 8!
      if (p.ghostInvisible) {
        ctx.globalAlpha = 0.28;
      }

      ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
      const shScale = Math.max(0.35, 1 - z / 220);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 12 * sc, 18 * sc * shScale, 8 * sc * shScale, 0, 0, Math.PI * 2);
      ctx.fill();

      if (p.isCulprit && !p.yeetFlying && z < 4) {
        const pulse = 1 + 0.08 * Math.sin(time * 9);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 11 * sc, 23 * sc * pulse, 11 * sc * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.translate(p.x, p.y - z);
      ctx.rotate(p.rot || 0);
      ctx.scale(sc, sc);
      this._drawPersonBody(ctx, p, time);
      ctx.restore();
    }

    _drawPersonBody(ctx, p, time) {
      const bob = p.held ? 0 : Math.abs(Math.sin(p.walkPhase || 0)) * 3;
      const legSwing = p.held ? Math.sin(time * 24) * 7 : Math.sin(p.walkPhase || 0) * 6;
      const costume = p.costume || 'casual';

      // Legs
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, 4 - bob);
      ctx.lineTo(-6 - legSwing * 0.4, 15);
      ctx.moveTo(6, 4 - bob);
      ctx.lineTo(6 + legSwing * 0.4, 15);
      ctx.stroke();

      // Halloween Dracula cape behind torso
      if (costume === 'halloween' && p.costumeVariant === 'dracula') {
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.moveTo(-16, -15 - bob);
        ctx.lineTo(16, -15 - bob);
        ctx.lineTo(20, 12 - bob);
        ctx.lineTo(-20, 12 - bob);
        ctx.closePath();
        ctx.fill();
      }

      // Traveler backpack
      if (costume === 'traveler') {
        ctx.fillStyle = '#0284c7';
        this._roundRect(ctx, -17, -14 - bob, 34, 18, 6);
        ctx.fill();
      }

      // Torso / Costume Outfit
      let torsoColor = p.shirtColor;
      if (costume === 'office' || costume === 'tired_office') {
        torsoColor = '#1e293b';
      } else if (costume === 'stylish') {
        torsoColor = '#18181b';
      } else if (costume === 'halloween' && p.costumeVariant === 'ghost') {
        torsoColor = '#f8fafc';
      }

      ctx.fillStyle = torsoColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      this._roundRect(ctx, -13, -15 - bob, 26, 22, 8);
      ctx.fill();
      ctx.stroke();

      // Suit collar / tie or stylish neon stripe
      if (costume === 'office' || costume === 'tired_office') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-5, -15 - bob);
        ctx.lineTo(5, -15 - bob);
        ctx.lineTo(0, -4 - bob);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = costume === 'tired_office' ? '#fb7185' : '#2563eb';
        ctx.fillRect(-1.5, -12 - bob, 3, 12);
      } else if (costume === 'stylish') {
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(-3, -14 - bob, 6, 18);
      }

      // Arms
      ctx.strokeStyle = torsoColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      if (p.held) {
        const wave = Math.sin(time * 28) * 6;
        ctx.moveTo(-13, -10);
        ctx.lineTo(-22, -20 + wave);
        ctx.moveTo(13, -10);
        ctx.lineTo(22, -20 - wave);
      } else {
        ctx.moveTo(-13, -10 - bob);
        ctx.lineTo(-17, 2 - bob + legSwing * 0.3);
        ctx.moveTo(13, -10 - bob);
        ctx.lineTo(17, 2 - bob - legSwing * 0.3);
      }
      ctx.stroke();

      // Head
      if (costume === 'halloween' && p.costumeVariant === 'pumpkin_head') {
        ctx.fillStyle = '#f97316';
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, -26 - bob, 14, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#15803d';
        ctx.fillRect(-2, -41 - bob, 4, 5);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-6, -29 - bob, 4, 4);
        ctx.fillRect(2, -29 - bob, 4, 4);
        ctx.fillRect(-5, -21 - bob, 10, 3);
      } else if (costume === 'halloween' && p.costumeVariant === 'ghost') {
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -25 - bob, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-4.5, -25 - bob, 2.5, 0, Math.PI * 2);
        ctx.arc(4.5, -25 - bob, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.angry ? '#fca5a5' : '#fde6c4';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -26 - bob, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Drunk flushed cheeks
        if (costume === 'drunk') {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
          ctx.beginPath();
          ctx.arc(-7, -23 - bob, 3.2, 0, Math.PI * 2);
          ctx.arc(7, -23 - bob, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Hair
        ctx.fillStyle = p.hairColor;
        ctx.beginPath();
        ctx.arc(0, -30 - bob, 11.5, Math.PI, Math.PI * 2);
        ctx.fill();

        // Drunk 아저씨 Necktie tied around forehead!
        if (costume === 'drunk') {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-12, -34 - bob, 24, 5);
          // Flapping tie tails on side of head!
          ctx.beginPath();
          ctx.moveTo(11, -33 - bob);
          ctx.lineTo(21, -37 - bob + Math.sin(time * 8) * 3);
          ctx.lineTo(19, -29 - bob + Math.sin(time * 8) * 3);
          ctx.closePath();
          ctx.fill();
        }

        // Traveler cap / Witch hat / Sunglasses
        if (costume === 'traveler') {
          ctx.fillStyle = '#facc15';
          this._roundRect(ctx, -13, -38 - bob, 26, 6, 3);
          ctx.fill();
        } else if (costume === 'halloween' && p.costumeVariant === 'witch') {
          ctx.fillStyle = '#7e22ce';
          ctx.beginPath();
          ctx.ellipse(0, -35 - bob, 16, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-9, -35 - bob);
          ctx.lineTo(0, -54 - bob);
          ctx.lineTo(9, -35 - bob);
          ctx.closePath();
          ctx.fill();
        }

        if (p.archetype === 'boss' || costume === 'stylish') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-9, -28 - bob, 8, 5);
          ctx.fillRect(1, -28 - bob, 8, 5);
        } else {
          ctx.fillStyle = '#0f172a';
          if (p.dizzyTimer > 0) {
            ctx.font = '900 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('@ @', 0, -23 - bob);
          } else {
            ctx.beginPath();
            ctx.arc(-4, -25 - bob, 1.8, 0, Math.PI * 2);
            ctx.arc(4, -25 - bob, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Anger '💢' mark
      if (p.angry && !p.held) {
        ctx.font = '900 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💢', 14, -40 - bob);
      }

      // Culprit '!' Alert Badge
      if (p.isCulprit && !p.held && !p.yeetFlying) {
        const bounce = Math.abs(Math.sin(time * 9)) * 4;
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -51 - bounce, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px "Pretendard", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', 0, -46 - bounce);
        ctx.restore();
      }

      // Speech Bubble
      if (p.bubbleText && p.bubbleTimer > 0) {
        ctx.save();
        ctx.font = '800 12px "Pretendard", sans-serif';
        const tw = ctx.measureText(p.bubbleText).width + 16;
        ctx.fillStyle = p.angry ? '#fee2e2' : '#ffffff';
        ctx.strokeStyle = p.angry ? '#dc2626' : '#0f172a';
        ctx.lineWidth = 2;
        this._roundRect(ctx, -tw * 0.5, -74 - bob, tw, 24, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = p.angry ? '#991b1b' : '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(p.bubbleText, 0, -58 - bob);
        ctx.restore();
      }
    }

    _drawHelperWorker(ctx, h, isNight, time) {
      const bob = Math.abs(Math.sin(time * 14 + h.rowIdx)) * 3;
      const sweepSwing = Math.sin(time * 16 + h.rowIdx * 0.7) * 0.45;

      ctx.save();
      ctx.translate(h.x, h.y);

      // Shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 14, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nighttime fluorescent glow halo
      if (isNight) {
        const grad = ctx.createRadialGradient(0, -10, 4, 0, -10, 36);
        grad.addColorStop(0, 'rgba(190, 242, 100, 0.45)');
        grad.addColorStop(1, 'rgba(190, 242, 100, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, -10, 36, 0, Math.PI * 2);
        ctx.fill();
      }

      // Legs marching left
      const leg = Math.sin(time * 14 + h.rowIdx) * 5;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5, 4 - bob);
      ctx.lineTo(-5 - leg, 14);
      ctx.moveTo(5, 4 - bob);
      ctx.lineTo(5 + leg, 14);
      ctx.stroke();

      // Uniform: Day = Orange (#f97316), Night = Fluorescent Lime-Yellow (#bef264)
      const vestColor = isNight ? '#bef264' : '#f97316';
      const trimColor = isNight ? '#ffffff' : '#fde047';
      ctx.fillStyle = vestColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      this._roundRect(ctx, -13, -15 - bob, 26, 22, 7);
      ctx.fill();
      ctx.stroke();

      // Reflective safety stripes
      ctx.fillStyle = trimColor;
      ctx.fillRect(-12, -4 - bob, 24, 3.5);
      ctx.fillRect(-12, 2 - bob, 24, 2.5);

      // Head + Safety Cap
      ctx.fillStyle = '#fde6c4';
      ctx.beginPath();
      ctx.arc(0, -25 - bob, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = vestColor;
      ctx.beginPath();
      ctx.arc(0, -29 - bob, 11, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-16, -30 - bob, 14, 4); // cap visor facing left

      // Wooden-handle Green 싸리빗 (Twig Broom) held to the left!
      ctx.save();
      ctx.translate(-10, -4 - bob);
      ctx.rotate(-0.45 + sweepSwing);

      // Wooden handle
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(14, -18);
      ctx.lineTo(-22, 16);
      ctx.stroke();

      // Green twig bristles (싸리빗)
      ctx.fillStyle = '#16a34a';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-18, 12);
      ctx.lineTo(-34, 20);
      ctx.lineTo(-24, 31);
      ctx.lineTo(-14, 17);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Bristle lines
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-21, 16);
      ctx.lineTo(-31, 22);
      ctx.moveTo(-19, 18);
      ctx.lineTo(-27, 27);
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    }

    _drawRobot(ctx, robot, state) {
      const speed = Math.hypot(robot.vx, robot.vy);
      const jitterX =
        robot.eyeMode === 'broken'
          ? (Math.random() - 0.5) * 6
          : state.overloadRatio >= 0.75
            ? Math.sin(state.time * 40) * 1.3
            : 0;
      const bob = speed > 10 && robot.eyeMode !== 'broken' ? Math.sin(state.time * 16) * 1.5 : 0;

      ctx.save();
      ctx.translate(robot.x + jitterX, robot.y + bob);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 23, 38, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      if (state.feverActive) {
        ctx.save();
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.55 + 0.35 * Math.sin(state.time * 12)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 18, 44, 21, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      const wheelOffsets = [
        [-25, 16],
        [25, 16],
        [-27, -2],
        [27, -2],
      ];
      for (const [wx, wy] of wheelOffsets) {
        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2;
        this._roundRect(ctx, wx - 8, wy - 7, 16, 15, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#71717a';
        const treadY = wy - 3 + ((Math.sin(robot.wheelAngle) * 3) | 0);
        ctx.fillRect(wx - 4, treadY, 8, 2.5);
      }

      ctx.fillStyle = '#0B2A5B';
      this._roundRect(ctx, -31, -6, 62, 24, 9);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      this._roundRect(ctx, -31, -26, 62, 38, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#43A047';
      ctx.beginPath();
      ctx.arc(21, -5, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('♻', 21, -2);

      ctx.fillStyle = '#0f172a';
      this._roundRect(ctx, -23, -15, 36, 20, 7);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      this._drawRobotEyes(ctx, robot.eyeMode, robot.blink);

      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      this._roundRect(ctx, -21, -38, 26, 13, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0B2A5B';
      ctx.font = '900 7.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AJOU', -8, -29);

      ctx.fillStyle = '#1e293b';
      this._roundRect(ctx, -16, -50, 16, 12, 4);
      ctx.fill();
      ctx.fillStyle = state.overloadRatio >= 0.7 ? '#ef4444' : '#38bdf8';
      ctx.fillRect(-15, -45, 14, 3.5);

      if (state.overloadRatio >= 0.7) {
        const sirenAlpha = 0.35 + 0.35 * Math.sin(state.time * 14);
        ctx.fillStyle = `rgba(239, 68, 68, ${sirenAlpha})`;
        ctx.beginPath();
        ctx.arc(-8, -45, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(11, 42, 91, 0.85)';
      this._roundRect(ctx, -26, 20, 52, 14, 7);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 9px "Pretendard", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('쓰담쓰담', 0, 30);

      ctx.restore();
      this._drawRobotArmAndHeld(ctx, robot, jitterX, bob, state.time);
    }

    _drawRobotEyes(ctx, eyeMode, blink) {
      const lx = -12;
      const rx = 2;
      const ey = -5;

      ctx.save();
      if (eyeMode === 'broken') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.4;
        for (const cx of [lx, rx]) {
          ctx.beginPath();
          ctx.moveTo(cx - 3.5, ey - 3.5);
          ctx.lineTo(cx + 3.5, ey + 3.5);
          ctx.moveTo(cx + 3.5, ey - 3.5);
          ctx.lineTo(cx - 3.5, ey + 3.5);
          ctx.stroke();
        }
      } else if (eyeMode === 'happy') {
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2.4;
        for (const cx of [lx, rx]) {
          ctx.beginPath();
          ctx.moveTo(cx - 4, ey + 2);
          ctx.lineTo(cx, ey - 3);
          ctx.lineTo(cx + 4, ey + 2);
          ctx.stroke();
        }
      } else if (eyeMode === 'oops') {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2.2;
        for (const cx of [lx, rx]) {
          ctx.beginPath();
          ctx.moveTo(cx - 4, ey - 2);
          ctx.lineTo(cx + 4, ey - 2);
          ctx.moveTo(cx, ey - 2);
          ctx.lineTo(cx, ey + 4);
          ctx.stroke();
        }
      } else if (eyeMode === 'fever') {
        ctx.fillStyle = '#fde047';
        ctx.font = '900 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', lx, ey + 4);
        ctx.fillText('★', rx, ey + 4);
      } else {
        const color = eyeMode === 'danger' ? '#ef4444' : eyeMode === 'chase' ? '#fbbf24' : '#7dd3fc';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 7;
        const h = blink ? 2 : eyeMode === 'chase' ? 6 : 9;
        this._roundRect(ctx, lx - 4, ey - h * 0.5, 8, h, 2.5);
        ctx.fill();
        this._roundRect(ctx, rx - 4, ey - h * 0.5, 8, h, 2.5);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawRobotArmAndHeld(ctx, robot, jitterX, bob, time) {
      const bx = robot.x + 12 + jitterX;
      const by = robot.y - 26 + bob;
      const tx = robot.handX;
      const ty = robot.handY;

      const L1 = ROBOT.l1;
      const L2 = ROBOT.l2;
      const dx = tx - bx;
      const dy = ty - by;
      const rawDist = Math.hypot(dx, dy);
      const minLen = Math.max(14, Math.abs(L1 - L2) + 4);
      const maxLen = L1 + L2 - 2;
      const dist = Math.max(minLen, Math.min(maxLen, rawDist));

      const ux = rawDist < 0.001 ? 0 : dx / rawDist;
      const uy = rawDist < 0.001 ? -1 : dy / rawDist;
      const ex = bx + ux * dist;
      const ey = by + uy * dist;

      const cosA = Math.max(-1, Math.min(1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist)));
      const baseAngle = Math.atan2(uy, ux);
      const offsetA = Math.acos(cosA);

      const j1x = bx + Math.cos(baseAngle - offsetA) * L1;
      const j1y = by + Math.sin(baseAngle - offsetA) * L1;
      const j2x = bx + Math.cos(baseAngle + offsetA) * L1;
      const j2y = by + Math.sin(baseAngle + offsetA) * L1;
      const elbowX = j1y <= j2y ? j1x : j2x;
      const elbowY = j1y <= j2y ? j1y : j2y;

      ctx.save();
      ctx.fillStyle = '#0B2A5B';
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(elbowX, elbowY);
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6.5;
      ctx.stroke();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 9.5;
      ctx.beginPath();
      ctx.moveTo(elbowX, elbowY);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 5.5;
      ctx.stroke();

      ctx.fillStyle = '#0B2A5B';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(elbowX, elbowY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (robot.held) {
        if (robot.held.kind === 'trash') {
          const tr = robot.held.entity;
          ctx.save();
          ctx.translate(ex, ey + 10);
          this._drawTrashSprite(ctx, tr.type, TRASH_TYPES[tr.type] || TRASH_TYPES.bottle, time);
          ctx.restore();
        } else if (robot.held.kind === 'person') {
          const p = robot.held.entity;
          ctx.save();
          ctx.translate(ex, ey + 24);
          ctx.scale(p.scale || 1, p.scale || 1);
          this._drawPersonBody(ctx, p, time);
          ctx.restore();
        }
      }

      const gripAngle = Math.atan2(ey - elbowY, ex - elbowX);
      const jawSpread = 0.25 + robot.gripperOpen * 0.55;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(gripAngle);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.rotate(side * jawSpread);
        ctx.beginPath();
        ctx.moveTo(2, side * 2);
        ctx.lineTo(13, side * 5);
        ctx.lineTo(18, side * 1);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      ctx.restore();
    }

    _drawParticles(ctx, particles) {
      for (const pt of particles) {
        const alpha = Math.max(0, pt.life / pt.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        const y = pt.y - (pt.z || 0);
        if (pt.kind === 'ring') {
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(pt.x, y, pt.size * (1.8 - alpha), 0, Math.PI * 2);
          ctx.stroke();
        } else if (pt.kind === 'spark') {
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(pt.x, y);
          ctx.lineTo(pt.x - pt.vx * 0.04, y - pt.vy * 0.04);
          ctx.stroke();
        } else {
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, y, pt.size * (pt.kind === 'smoke' || pt.kind === 'dust' ? 1.55 - alpha * 0.5 : 1), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    _drawPopups(ctx, popups) {
      for (const pop of popups) {
        const t = pop.life / pop.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.min(1, t * 1.6);
        ctx.font = `900 ${Math.round(18 * (pop.scale || 1))}px "Pretendard", "Malgun Gothic", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeText(pop.text, pop.x, pop.y);
        ctx.fillStyle = pop.color || '#fde047';
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      }
    }

    _drawTouchControls(ctx, touch, isHolding) {
      ctx.save();
      const joyX = touch.leftActive ? touch.joyOrigin.x : 78;
      const joyY = touch.leftActive ? touch.joyOrigin.y : this.cssH - 96;
      const knobX = touch.leftActive ? touch.joyCurrent.x : joyX;
      const knobY = touch.leftActive ? touch.joyCurrent.y : joyY;

      const jdx = knobX - joyX;
      const jdy = knobY - joyY;
      const jdist = Math.hypot(jdx, jdy);
      const clampedX = jdist > touch.joyOuterR ? joyX + (jdx / jdist) * touch.joyOuterR : knobX;
      const clampedY = jdist > touch.joyOuterR ? joyY + (jdy / jdist) * touch.joyOuterR : knobY;

      ctx.fillStyle = touch.leftActive ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(joyX, joyY, touch.joyOuterR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = touch.leftActive ? 'rgba(56, 189, 248, 0.78)' : 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, touch.joyKnobR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '700 11px "Pretendard", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('이동', joyX, joyY + touch.joyOuterR + 15);

      const actX = touch.rightActive ? touch.rightStart.x : this.cssW - 78;
      const actY = touch.rightActive ? touch.rightStart.y : this.cssH - 96;
      ctx.fillStyle = isHolding ? 'rgba(250, 204, 21, 0.28)' : 'rgba(34, 197, 94, 0.24)';
      ctx.strokeStyle = isHolding ? 'rgba(250, 204, 21, 0.85)' : 'rgba(74, 222, 128, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(actX, actY, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13.5px "Pretendard", sans-serif';
      ctx.fillText(isHolding ? '투척/드래그' : '집기!', actX, actY + 5);

      if (touch.rightActive && touch.rightDragged) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(touch.rightStart.x, touch.rightStart.y);
        ctx.lineTo(touch.rightCurrent.x, touch.rightCurrent.y);
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(touch.rightCurrent.x, touch.rightCurrent.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    _roundRect(ctx, x, y, w, h, r) {
      const radius = Math.min(r, w * 0.5, h * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
  }

  ns.Renderer = GameRenderer;
})(window.Ssudam);
