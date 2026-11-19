window.Ssudam = window.Ssudam || {};

(function (ns) {
  class InputManager {
    constructor(canvas, callbacks) {
      this.canvas = canvas;
      this.cb = callbacks || {};

      this.isTouchMode = false;
      this.paused = false;

      // Keyboard state
      this.keys = new Set();

      // Mouse / Pointer world aim
      this.aimWorldX = 640;
      this.aimWorldY = 340;
      this.hasMouseAim = false;

      // PC charge / throw state
      this.pcCharging = false;
      this.pcChargeStart = 0;

      // Fixed Left Joystick (in canvas CSS pixels)
      this.leftTouchId = null;
      this.joyOrigin = { x: 82, y: 400 };
      this.joyCurrent = { x: 82, y: 400 };
      this.joyOuterR = 48;
      this.joyKnobR = 20;
      this.joyDeadzone = 6;

      // Right Side: Tap = Grab, Swing (Drag >= 24px) & Release = Throw
      this.rightTouchId = null;
      this.rightStart = { x: 0, y: 0 };
      this.rightCurrent = { x: 0, y: 0 };
      this.rightDragged = false;
      this.rightDragThreshold = 24;
      this.rightMaxDrag = 115;

      this.moveX = 0;
      this.moveY = 0;

      this._bindEvents();
    }

    setPaused(paused) {
      this.paused = paused;
      if (paused) {
        this.resetTransient();
      }
    }

    resetTransient() {
      this.keys.clear();
      this.pcCharging = false;
      this.leftTouchId = null;
      this.rightTouchId = null;
      this.rightDragged = false;
      this.moveX = 0;
      this.moveY = 0;
    }

    getFixedJoystickCenter(cssW, cssH) {
      const compact = cssW < 560;
      return {
        x: compact ? 62 : 92,
        y: cssH - (compact ? 74 : 92),
      };
    }

    clientToCanvasCss(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
        rect,
      };
    }

    clientToWorld(clientX, clientY) {
      const { x, y, rect } = this.clientToCanvasCss(clientX, clientY);
      const vp = ns.getViewportTransform(rect.width, rect.height);
      const w = vp.layout.WORLD_W;
      const h = vp.layout.WORLD_H;
      return {
        x: Math.max(0, Math.min(w, (x - vp.offsetX) / vp.scale)),
        y: Math.max(0, Math.min(h, (y - vp.offsetY) / vp.scale)),
      };
    }

    _bindEvents() {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyP' || e.code === 'Escape') {
          if (this.cb.onTogglePause) {
            e.preventDefault();
            this.cb.onTogglePause();
          }
          return;
        }
        if (this.paused) return;

        if ((e.code === 'KeyQ' || e.code === 'Digit1') && !e.repeat) {
          e.preventDefault();
          if (this.cb.onUseVacuum) this.cb.onUseVacuum();
          return;
        }

        if ((e.code === 'KeyE' || e.code === 'Digit2') && !e.repeat) {
          e.preventDefault();
          if (this.cb.onUseHelper) this.cb.onUseHelper();
          return;
        }

        if (
          e.code === 'ArrowUp' ||
          e.code === 'ArrowDown' ||
          e.code === 'ArrowLeft' ||
          e.code === 'ArrowRight' ||
          e.code === 'Space'
        ) {
          e.preventDefault();
        }

        if (e.code === 'Space' && !e.repeat) {
          this.isTouchMode = false;
          this._startPcAction();
          return;
        }

        if (
          e.code === 'KeyW' ||
          e.code === 'KeyA' ||
          e.code === 'KeyS' ||
          e.code === 'KeyD' ||
          e.code.startsWith('Arrow')
        ) {
          this.isTouchMode = false;
          this.keys.add(e.code);
          this._recomputeKeyboardMove();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
          if (this.pcCharging) {
            this._releasePcAction();
          }
          return;
        }
        if (this.keys.has(e.code)) {
          this.keys.delete(e.code);
          this._recomputeKeyboardMove();
        }
      });

      window.addEventListener('blur', () => this.resetTransient());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.resetTransient();
      });

      this.canvas.addEventListener('mousemove', (e) => {
        if (this.isTouchMode) return;
        const pos = this.clientToWorld(e.clientX, e.clientY);
        this.aimWorldX = pos.x;
        this.aimWorldY = pos.y;
        this.hasMouseAim = true;
      });

      this.canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || this.paused) return;
        this.isTouchMode = false;
        const pos = this.clientToWorld(e.clientX, e.clientY);
        this.aimWorldX = pos.x;
        this.aimWorldY = pos.y;
        this.hasMouseAim = true;
        this._startPcAction();
      });

      window.addEventListener('mouseup', (e) => {
        if (e.button !== 0) return;
        if (this.pcCharging) {
          this._releasePcAction();
        }
      });

      // Multi-touch mobile & tablet support (Fixed Joystick + Swing-Only Throw)
      this.canvas.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          this.isTouchMode = true;
          if (this.cb.onUnlockAudio) this.cb.onUnlockAudio();
          if (this.paused) return;

          const rect = this.canvas.getBoundingClientRect();
          const midX = rect.left + rect.width * 0.44;
          const fixedCenter = this.getFixedJoystickCenter(rect.width, rect.height);

          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const cssPos = this.clientToCanvasCss(t.clientX, t.clientY);

            if (t.clientX < midX && this.leftTouchId === null) {
              this.leftTouchId = t.identifier;
              this.joyOrigin = fixedCenter;
              this.joyCurrent = { x: cssPos.x, y: cssPos.y };
              this._recomputeTouchMove();
            } else if (this.rightTouchId === null) {
              this.rightTouchId = t.identifier;
              this.rightStart = { x: cssPos.x, y: cssPos.y };
              this.rightCurrent = { x: cssPos.x, y: cssPos.y };
              this.rightDragged = false;

              if (this.cb.onTouchActionStart) {
                this.cb.onTouchActionStart();
              }
            }
          }
        },
        { passive: false }
      );

      this.canvas.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
          if (this.paused) return;

          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const cssPos = this.clientToCanvasCss(t.clientX, t.clientY);

            if (t.identifier === this.leftTouchId) {
              this.joyCurrent = { x: cssPos.x, y: cssPos.y };
              this._recomputeTouchMove();
            } else if (t.identifier === this.rightTouchId) {
              this.rightCurrent = { x: cssPos.x, y: cssPos.y };
              const dx = this.rightCurrent.x - this.rightStart.x;
              const dy = this.rightCurrent.y - this.rightStart.y;
              if (Math.hypot(dx, dy) >= this.rightDragThreshold) {
                this.rightDragged = true;
              }
            }
          }
        },
        { passive: false }
      );

      const handleTouchEnd = (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.leftTouchId) {
            this.leftTouchId = null;
            this.moveX = 0;
            this.moveY = 0;
          } else if (t.identifier === this.rightTouchId) {
            const wasDragged = this.rightDragged;
            const aim = this.getTouchDragThrow();
            this.rightTouchId = null;
            this.rightDragged = false;

            if (!this.paused && this.cb.onTouchActionEnd) {
              this.cb.onTouchActionEnd(wasDragged, aim);
            }
          }
        }
      };

      this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      this.canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    _startPcAction() {
      if (this.cb.onUnlockAudio) this.cb.onUnlockAudio();
      if (this.paused) return;
      const isHolding = this.cb.isHolding ? this.cb.isHolding() : false;
      if (!isHolding) {
        if (this.cb.onPcGrab) {
          this.cb.onPcGrab(this.aimWorldX, this.aimWorldY);
        }
      } else {
        this.pcCharging = true;
        this.pcChargeStart = performance.now();
      }
    }

    _releasePcAction() {
      const elapsed = Math.max(0, performance.now() - this.pcChargeStart);
      this.pcCharging = false;
      if (this.paused) return;
      const power = elapsed < 160 ? 0.65 : Math.min(1.0, 0.58 + (elapsed - 160) / 500);
      if (this.cb.onPcThrow) {
        this.cb.onPcThrow(this.aimWorldX, this.aimWorldY, power);
      }
    }

    _recomputeKeyboardMove() {
      let x = 0;
      let y = 0;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
      const len = Math.hypot(x, y);
      if (len > 0) {
        this.moveX = x / len;
        this.moveY = y / len;
      } else {
        this.moveX = 0;
        this.moveY = 0;
      }
    }

    _recomputeTouchMove() {
      const dx = this.joyCurrent.x - this.joyOrigin.x;
      const dy = this.joyCurrent.y - this.joyOrigin.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= this.joyDeadzone) {
        this.moveX = 0;
        this.moveY = 0;
        return;
      }
      const clamped = Math.min(dist, this.joyOuterR);
      const strength = (clamped - this.joyDeadzone) / (this.joyOuterR - this.joyDeadzone);
      this.moveX = (dx / dist) * strength;
      this.moveY = (dy / dist) * strength;
    }

    getPcChargeRatio() {
      if (!this.pcCharging) return 0;
      const elapsed = Math.max(0, performance.now() - this.pcChargeStart);
      if (elapsed < 160) return 0.58;
      return Math.min(1.0, 0.58 + (elapsed - 160) / 500);
    }

    getTouchDragThrow() {
      if (this.rightTouchId === null) return null;
      const dx = this.rightCurrent.x - this.rightStart.x;
      const dy = this.rightCurrent.y - this.rightStart.y;
      const dist = Math.hypot(dx, dy);
      if (dist < this.rightDragThreshold) return null;
      const power = Math.min(1.0, 0.48 + ((dist - this.rightDragThreshold) / this.rightMaxDrag) * 0.52);
      return {
        dirX: dx / dist,
        dirY: dy / dist,
        power,
      };
    }

    getTouchOverlayState() {
      if (!this.isTouchMode) return null;
      const rect = this.canvas.getBoundingClientRect();
      const fixedCenter = this.getFixedJoystickCenter(rect.width || 390, rect.height || 844);
      return {
        leftActive: this.leftTouchId !== null,
        joyOrigin: this.leftTouchId !== null ? this.joyOrigin : fixedCenter,
        joyCurrent: this.leftTouchId !== null ? this.joyCurrent : fixedCenter,
        joyOuterR: this.joyOuterR,
        joyKnobR: this.joyKnobR,
        rightActive: this.rightTouchId !== null,
        rightDragged: this.rightDragged,
        rightStart: this.rightStart,
        rightCurrent: this.rightCurrent,
      };
    }
  }

  ns.Input = InputManager;
})(window.Ssudam);
