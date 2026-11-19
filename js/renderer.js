window.Ssudam = window.Ssudam || {};

(function (ns) {
  const { WORLD_W, WORLD_H, PLAZA, SMART_BIN, HUMAN_BIN, ROBOT, TRASH_TYPES } = ns.CONFIG;

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
    morning: {
      skyTop: '#7cc6fe',
      skyBot: '#dff3ff',
      stationRoof: '#355070',
      stationWall: '#eef5fc',
      stationGlass: '#8ecae6',
      plazaTileA: '#e8eef5',
      plazaTileB: '#dde6f0',
      plazaEdge: '#c5d3e3',
      lampGlow: 0.08,
      neonAlpha: 0.0,
      darkOverlay: 0.0,
    },
    midday: {
      skyTop: '#38bdf8',
      skyBot: '#bae6fd',
      stationRoof: '#1e3a5f',
      stationWall: '#f4f8fc',
      stationGlass: '#60a5fa',
      plazaTileA: '#eff4fa',
      plazaTileB: '#e2ebf4',
      plazaEdge: '#cbd8e8',
      lampGlow: 0.05,
      neonAlpha: 0.0,
      darkOverlay: 0.0,
    },
    sunset: {
      skyTop: '#fb7185',
      skyBot: '#fed7aa',
      stationRoof: '#2c2b4b',
      stationWall: '#f7ece6',
      stationGlass: '#f59e0b',
      plazaTileA: '#ede5e2',
      plazaTileB: '#e0d5d1',
      plazaEdge: '#c8b8b3',
      lampGlow: 0.42,
      neonAlpha: 0.35,
      darkOverlay: 0.09,
    },
    night: {
      skyTop: '#0b1633',
      skyBot: '#1d356b',
      stationRoof: '#111b36',
      stationWall: '#31446b',
      stationGlass: '#38bdf8',
      plazaTileA: '#33415c',
      plazaTileB: '#2b3750',
      plazaEdge: '#202b40',
      lampGlow: 0.85,
      neonAlpha: 1.0,
      darkOverlay: 0.22,
    },
  };

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
        return THEMES[theme] || THEMES.morning;
      }
      const order = [THEMES.morning, THEMES.midday, THEMES.sunset, THEMES.night];
      const scaled = (cyclePhase % 1) * order.length;
      const idx = Math.floor(scaled);
      const frac = scaled - idx;
      const a = order[idx % order.length];
      const b = order[(idx + 1) % order.length];
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
        darkOverlay: lerp(a.darkOverlay, b.darkOverlay, frac),
      };
    }

    render(state) {
      const ctx = this.ctx;
      const vp = ns.getViewportTransform(this.cssW, this.cssH);
      const pal = this._getPalette(state.theme, state.cyclePhase || 0);

      ctx.save();
      ctx.scale(this.dpr, this.dpr);

      // Full-bleed sky + plaza backdrop outside virtual bounds
      this._drawFullBleedBackdrop(ctx, vp, pal);

      // Transform into virtual 1280x800 world with camera shake
      ctx.save();
      ctx.translate(vp.offsetX + state.shake.x * vp.scale, vp.offsetY + state.shake.y * vp.scale);
      ctx.scale(vp.scale, vp.scale);

      this._drawSuwonStation(ctx, pal, state.time);
      this._drawPlaza(ctx, pal, state);
      this._drawSmartBin(ctx, state.smartBin, pal, state.time);
      this._drawHumanBin(ctx, state.humanBin, pal, state.time);

      // Robot reach ring & hover target highlight
      this._drawRobotGroundGuides(ctx, state);

      // Aim / throw trajectory preview
      if (state.aimGuide) {
        this._drawAimGuide(ctx, state.aimGuide);
      }

      // Y-sorted world entities (trash, people, robot)
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

      drawables.push({
        sortY: state.robot.y,
        draw: () => this._drawRobot(ctx, state.robot, state),
      });

      drawables.sort((a, b) => a.sortY - b.sortY);
      for (const d of drawables) {
        d.draw();
      }

      // Particles & floating score popups
      this._drawParticles(ctx, state.particles);
      this._drawPopups(ctx, state.popups);

      // Fever border vignette
      if (state.feverActive) {
        ctx.save();
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.45 + 0.25 * Math.sin(state.time * 10)})`;
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, WORLD_W - 10, WORLD_H - 10);
        ctx.restore();
      }

      // Overload red pulse vignette
      if (state.overloadRatio >= 0.7) {
        const pulse = 0.16 + 0.12 * Math.sin(state.time * 9);
        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${pulse * 2.2})`;
        ctx.lineWidth = 16;
        ctx.strokeRect(8, 8, WORLD_W - 16, WORLD_H - 16);
        ctx.restore();
      }

      ctx.restore(); // end virtual world transform

      // Touch controls drawn in CSS pixels for consistent thumb sizing on phone/tablet
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
      // Sky area inside virtual world
      const sky = ctx.createLinearGradient(0, 0, 0, 232);
      sky.addColorStop(0, pal.skyTop);
      sky.addColorStop(1, pal.skyBot);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WORLD_W, 232);

      // Stars at night
      if (pal.neonAlpha > 0.2) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${pal.neonAlpha * 0.75})`;
        const starSeeds = [90, 180, 260, 420, 560, 740, 890, 1020, 1140, 1210];
        for (let i = 0; i < starSeeds.length; i++) {
          const twinkle = 0.5 + 0.5 * Math.sin(time * 2.5 + i * 1.7);
          ctx.globalAlpha = pal.neonAlpha * twinkle;
          ctx.beginPath();
          ctx.arc(starSeeds[i], 24 + ((i * 29) % 55), 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Background skyline silhouettes
      ctx.fillStyle = pal.neonAlpha > 0.3 ? 'rgba(15, 23, 42, 0.55)' : 'rgba(148, 184, 218, 0.45)';
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

      // Prominent Signboard: 수원역 SUWON STATION
      const signW = 286;
      const signH = 54;
      const signX = WORLD_W * 0.5 - signW * 0.5;
      const signY = 50;
      ctx.save();
      if (pal.neonAlpha > 0.2) {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18 * pal.neonAlpha;
      }
      ctx.fillStyle = '#0B2A5B';
      this._roundRect(ctx, signX, signY, signW, signH, 10);
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '900 24px "Pretendard", "Malgun Gothic", sans-serif';
      ctx.fillText('수원역', WORLD_W * 0.5, signY + 28);
      ctx.font = '700 11px "Pretendard", sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText('SUWON STATION', WORLD_W * 0.5, signY + 45);

      // Eco Trees & Street Lamps flanking station
      const treePositions = [110, 215, 1065, 1170];
      for (const tx of treePositions) {
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(tx - 6, 175, 12, 55);
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(tx, 162, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#43a047';
        ctx.beginPath();
        ctx.arc(tx - 10, 152, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      const lamps = [165, 640, 1115];
      for (const lx of lamps) {
        if (lx !== 640) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(lx - 3, 128, 6, 102);
          ctx.fillStyle = pal.lampGlow > 0.3 ? '#fef08a' : '#e2e8f0';
          ctx.beginPath();
          ctx.arc(lx, 124, 9, 0, Math.PI * 2);
          ctx.fill();
          if (pal.lampGlow > 0.15) {
            const grad = ctx.createRadialGradient(lx, 124, 4, lx, 155, 85);
            grad.addColorStop(0, `rgba(253, 224, 71, ${0.42 * pal.lampGlow})`);
            grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(lx, 155, 85, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    _drawPlaza(ctx, pal, state) {
      // Base plaza area
      ctx.fillStyle = pal.plazaEdge;
      ctx.fillRect(0, 226, WORLD_W, WORLD_H - 226);

      // Main clean tile grid
      const tileSize = 64;
      for (let y = PLAZA.top; y < PLAZA.bottom; y += tileSize) {
        for (let x = PLAZA.left; x < PLAZA.right; x += tileSize) {
          const ix = Math.floor((x - PLAZA.left) / tileSize);
          const iy = Math.floor((y - PLAZA.top) / tileSize);
          ctx.fillStyle = (ix + iy) % 2 === 0 ? pal.plazaTileA : pal.plazaTileB;
          ctx.fillRect(x, y, Math.min(tileSize, PLAZA.right - x), Math.min(tileSize, PLAZA.bottom - y));
        }
      }

      // Tactile yellow guiding strip across top of plaza
      ctx.fillStyle = 'rgba(245, 158, 11, 0.38)';
      ctx.fillRect(PLAZA.left, PLAZA.top + 14, PLAZA.right - PLAZA.left, 10);

      // Subtle central emblem
      ctx.save();
      ctx.strokeStyle = pal.neonAlpha > 0.3 ? 'rgba(147, 197, 253, 0.14)' : 'rgba(11, 42, 91, 0.08)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(WORLD_W * 0.5, 495, 92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = pal.neonAlpha > 0.3 ? 'rgba(147, 197, 253, 0.18)' : 'rgba(11, 42, 91, 0.12)';
      ctx.font = '800 18px "Pretendard", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SUWON CLEAN PLAZA', WORLD_W * 0.5, 501);
      ctx.restore();

      // Yeet Boundary Zones (Left, Right, Bottom)
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.strokeRect(PLAZA.left, PLAZA.top, PLAZA.right - PLAZA.left, PLAZA.bottom - PLAZA.top);
      ctx.setLineDash([]);

      // Highlight yeet zone hint when holding a culprit
      const holdingCulprit =
        state.robot.held && state.robot.held.kind === 'person' && state.robot.held.entity.isCulprit;
      ctx.fillStyle = holdingCulprit
        ? `rgba(239, 68, 68, ${0.18 + 0.1 * Math.sin(state.time * 8)})`
        : 'rgba(239, 68, 68, 0.06)';
      ctx.fillRect(0, PLAZA.top, PLAZA.left, PLAZA.bottom - PLAZA.top);
      ctx.fillRect(PLAZA.right, PLAZA.top, WORLD_W - PLAZA.right, PLAZA.bottom - PLAZA.top);
      ctx.fillRect(0, PLAZA.bottom, WORLD_W, WORLD_H - PLAZA.bottom);

      ctx.fillStyle = holdingCulprit ? '#dc2626' : 'rgba(185, 28, 28, 0.55)';
      ctx.font = '800 14px "Pretendard", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚾ 광장 밖 홈런 투척 ZONE (투기자 추방!)', WORLD_W * 0.5, PLAZA.bottom + 30);
      ctx.restore();
    }

    _drawSmartBin(ctx, bin, pal, time) {
      const bounceScale = 1 + bin.bounce * 0.12;
      ctx.save();
      ctx.translate(bin.x, bin.y);
      ctx.scale(bounceScale, 2 - bounceScale);

      // Ground shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      this._roundRect(ctx, -bin.width * 0.5 + 4, 24, bin.width, 20, 8);
      ctx.fill();

      // White smart bin body
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      this._roundRect(ctx, -bin.width * 0.5, -36, bin.width, bin.height, 10);
      ctx.fill();
      ctx.stroke();

      // Top camera / sensor unit matching poster
      ctx.fillStyle = '#1e293b';
      this._roundRect(ctx, 20, -48, 36, 14, 5);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(38, -41, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 3 color slots: 캔·병, 플라스틱, 종이류
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

        // Slot mouth
        ctx.fillStyle = '#0f172a';
        this._roundRect(ctx, s.x - 13, -18, 26, 10, 3);
        ctx.fill();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 10.5px "Pretendard", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.label, s.x, 18);
        ctx.restore();
      });

      // Sign badge above bin
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

      // Shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      this._roundRect(ctx, -bin.width * 0.5 + 4, 24, bin.width, 22, 8);
      ctx.fill();

      // Heavy industrial dark metal body
      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3;
      this._roundRect(ctx, -bin.width * 0.5, -34, bin.width, bin.height, 10);
      ctx.fill();
      ctx.stroke();

      // Hazard yellow/black stripes band
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

      // Inner dark mouth when lid opens
      const openAmt = bin.lidOpen;
      if (openAmt > 0.05) {
        ctx.fillStyle = '#09090b';
        this._roundRect(ctx, -bin.width * 0.42, -32, bin.width * 0.84, 22, 5);
        ctx.fill();
      }

      // Label plate on front
      ctx.fillStyle = '#dc2626';
      this._roundRect(ctx, -56, -12, 112, 24, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13px "Pretendard", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('인간쓰레기통', 0, 5);

      // Hinged Metal Lid
      ctx.save();
      ctx.translate(-bin.width * 0.5, -34);
      ctx.rotate(-openAmt * 0.72);
      ctx.fillStyle = '#52525b';
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3;
      this._roundRect(ctx, -4, -12, bin.width + 8, 15, 6);
      ctx.fill();
      ctx.stroke();
      // Lid handle
      ctx.fillStyle = '#facc15';
      this._roundRect(ctx, bin.width * 0.5 - 16, -18, 32, 7, 3);
      ctx.fill();
      ctx.restore();

      // Floating badge
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

      // Comic "철컹!" slam text
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
      // Subtle arm reach circle
      ctx.strokeStyle = state.feverActive
        ? 'rgba(250, 204, 21, 0.35)'
        : 'rgba(30, 136, 229, 0.16)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(robot.x, robot.y, robot.reachRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target highlight ring under grabbable item/culprit
      if (state.hoverTarget && !robot.held) {
        const ht = state.hoverTarget;
        const pulse = 1 + 0.12 * Math.sin(state.time * 10);
        ctx.strokeStyle = ht.isCulprit ? '#ef4444' : '#22c55e';
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

      // Landing reticle
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

      // Ground shadow
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      const shScale = Math.max(0.45, 1 - z / 160);
      ctx.beginPath();
      ctx.ellipse(tr.x, tr.y + 8, def.radius * 0.9 * shScale, def.radius * 0.45 * shScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Old trash urgency pulse ring
      if (z < 2 && tr.age > 9) {
        const p = 0.5 + 0.5 * Math.sin(time * 7);
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.35 + p * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(tr.x, tr.y + 4, def.radius * 1.25, def.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.translate(tr.x, tr.y - z);
      ctx.rotate(tr.rot || 0);
      this._drawTrashSprite(ctx, tr.type, def);
      ctx.restore();
    }

    _drawTrashSprite(ctx, type, def) {
      if (type === 'bottle') {
        // Blue PET bottle
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
      } else if (type === 'can') {
        // Green soda can
        ctx.fillStyle = '#4ade80';
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 2;
        this._roundRect(ctx, -9, -13, 18, 24, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-7, -14, 14, 4);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(-8, -3, 16, 6);
      } else if (type === 'paper') {
        // Amber/white coffee cup & crumpled paper
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#78350f';
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
      } else if (type === 'box') {
        // Delivery cardboard box
        ctx.fillStyle = '#d97706';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2.2;
        this._roundRect(ctx, -16, -14, 32, 26, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(-16, -3, 32, 5);
        ctx.fillRect(-3, -14, 6, 26);
      } else {
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
      }
    }

    _drawPerson(ctx, p, time) {
      const z = p.z || 0;
      const sc = p.scale || 1;

      // Ground shadow
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
      const shScale = Math.max(0.35, 1 - z / 220);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 12 * sc, 18 * sc * shScale, 8 * sc * shScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Red guilty ground ring
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

      // Torso / Jacket
      ctx.fillStyle = p.shirtColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      this._roundRect(ctx, -13, -15 - bob, 26, 22, 8);
      ctx.fill();
      ctx.stroke();

      // Waving arms when grabbed or runner
      ctx.strokeStyle = p.shirtColor;
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
      ctx.fillStyle = '#fde6c4';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -26 - bob, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hair / Boss sunglasses / Runner cap
      ctx.fillStyle = p.hairColor;
      ctx.beginPath();
      ctx.arc(0, -30 - bob, 11.5, Math.PI, Math.PI * 2);
      ctx.fill();

      if (p.archetype === 'runner') {
        ctx.fillStyle = '#f97316';
        this._roundRect(ctx, -11, -39 - bob, 22, 7, 3);
        ctx.fill();
      } else if (p.archetype === 'boss') {
        // Boss sunglasses
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-9, -28 - bob, 8, 5);
        ctx.fillRect(1, -28 - bob, 8, 5);
      }

      // Eyes
      if (p.archetype !== 'boss') {
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

      // Culprit '!' Alert Badge
      if (p.isCulprit && !p.held && !p.yeetFlying) {
        const bounce = Math.abs(Math.sin(time * 9)) * 4;
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -49 - bounce, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px "Pretendard", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', 0, -44 - bounce);
        ctx.restore();
      }

      // Comic Speech Bubble when grabbed or dizzy
      if (p.bubbleText && p.bubbleTimer > 0) {
        ctx.save();
        ctx.font = '800 12px "Pretendard", sans-serif';
        const tw = ctx.measureText(p.bubbleText).width + 16;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        this._roundRect(ctx, -tw * 0.5, -72 - bob, tw, 24, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(p.bubbleText, 0, -56 - bob);
        ctx.restore();
      }
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

      // Ground shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 23, 38, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fever aura
      if (state.feverActive) {
        ctx.save();
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.55 + 0.35 * Math.sin(state.time * 12)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 18, 44, 21, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4 Chunky Wheels
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
        // Wheel tread tick
        ctx.fillStyle = '#71717a';
        const treadY = wy - 3 + ((Math.sin(robot.wheelAngle) * 3) | 0);
        ctx.fillRect(wx - 4, treadY, 8, 2.5);
      }

      // Lower Navy Trim
      ctx.fillStyle = '#0B2A5B';
      this._roundRect(ctx, -31, -6, 62, 24, 9);
      ctx.fill();

      // Main White Rounded Chassis
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      this._roundRect(ctx, -31, -26, 62, 38, 12);
      ctx.fill();
      ctx.stroke();

      // Green Recycle Badge on side/chest
      ctx.fillStyle = '#43A047';
      ctx.beginPath();
      ctx.arc(21, -5, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('♻', 21, -2);

      // Front Glossy LED Visor
      ctx.fillStyle = '#0f172a';
      this._roundRect(ctx, -23, -15, 36, 20, 7);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Dynamic LED Eyes
      this._drawRobotEyes(ctx, robot.eyeMode, robot.blink, state.time);

      // Top AJOU Camera Box + Rotating LiDAR Tower
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

      // LiDAR Cylinder
      ctx.fillStyle = '#1e293b';
      this._roundRect(ctx, -16, -50, 16, 12, 4);
      ctx.fill();
      ctx.fillStyle = state.overloadRatio >= 0.7 ? '#ef4444' : '#38bdf8';
      ctx.fillRect(-15, -45, 14, 3.5);

      // LiDAR Warning Beacon Glow at >= 70%
      if (state.overloadRatio >= 0.7) {
        const sirenAlpha = 0.35 + 0.35 * Math.sin(state.time * 14);
        ctx.fillStyle = `rgba(239, 68, 68, ${sirenAlpha})`;
        ctx.beginPath();
        ctx.arc(-8, -45, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nameplate "쓰담쓰담"
      ctx.fillStyle = 'rgba(11, 42, 91, 0.85)';
      this._roundRect(ctx, -26, 20, 52, 14, 7);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 9px "Pretendard", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('쓰담쓰담', 0, 30);

      ctx.restore();

      // Draw 2-Segment IK Robotic Arm & Gripper in World Coordinates
      this._drawRobotArmAndHeld(ctx, robot, jitterX, bob, state.time);
    }

    _drawRobotEyes(ctx, eyeMode, blink, time) {
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

      // Pick the elbow bend that arches higher on screen (smaller Y)
      const j1x = bx + Math.cos(baseAngle - offsetA) * L1;
      const j1y = by + Math.sin(baseAngle - offsetA) * L1;
      const j2x = bx + Math.cos(baseAngle + offsetA) * L1;
      const j2y = by + Math.sin(baseAngle + offsetA) * L1;
      const elbowX = j1y <= j2y ? j1x : j2x;
      const elbowY = j1y <= j2y ? j1y : j2y;

      // Turret base collar
      ctx.save();
      ctx.fillStyle = '#0B2A5B';
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, Math.PI * 2);
      ctx.fill();

      // Arm segment 1 (Upper link)
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

      // Arm segment 2 (Forearm link)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 9.5;
      ctx.beginPath();
      ctx.moveTo(elbowX, elbowY);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 5.5;
      ctx.stroke();

      // Elbow joint cap
      ctx.fillStyle = '#0B2A5B';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(elbowX, elbowY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw held entity suspended right inside the gripper
      if (robot.held) {
        if (robot.held.kind === 'trash') {
          const tr = robot.held.entity;
          ctx.save();
          ctx.translate(ex, ey + 10);
          this._drawTrashSprite(ctx, tr.type, TRASH_TYPES[tr.type] || TRASH_TYPES.bottle);
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

      // 2-Finger Industrial Gripper Claws at (ex, ey)
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
          ctx.arc(pt.x, y, pt.size * (pt.kind === 'smoke' ? 1.5 - alpha * 0.5 : 1), 0, Math.PI * 2);
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
      // Left floating joystick guide
      const joyX = touch.leftActive ? touch.joyOrigin.x : 82;
      const joyY = touch.leftActive ? touch.joyOrigin.y : this.cssH - 88;
      const knobX = touch.leftActive ? touch.joyCurrent.x : joyX;
      const knobY = touch.leftActive ? touch.joyCurrent.y : joyY;

      // Clamp knob inside outer ring
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
      ctx.fillText('이동', joyX, joyY + touch.joyOuterR + 16);

      // Right action / throw pad
      const actX = touch.rightActive ? touch.rightStart.x : this.cssW - 86;
      const actY = touch.rightActive ? touch.rightStart.y : this.cssH - 88;
      ctx.fillStyle = isHolding ? 'rgba(250, 204, 21, 0.28)' : 'rgba(34, 197, 94, 0.24)';
      ctx.strokeStyle = isHolding ? 'rgba(250, 204, 21, 0.85)' : 'rgba(74, 222, 128, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(actX, actY, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 14px "Pretendard", sans-serif';
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
