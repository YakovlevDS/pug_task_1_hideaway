//
//   A-------B-------E
//   |       |       |
//   |       |       |
//   |       |       |
//   C-------D-------F

const elWrap = document.querySelector('.wrap');
const elP = elWrap.querySelector('.p');
const elQ = elWrap.querySelector('.q');
const elR = elWrap.querySelector('.r');
const elS = elWrap.querySelector('.s');
const elT = elWrap.querySelector('.t');
const elBack = elWrap.querySelector('.back');
const elFront = elWrap.querySelector('.front');

const P = class P {
  constructor(x, y, el) {
    this.x = x;
    this.y = y;
    this.el = el;
  }
  clone() {
    return new P(this.x, this.y);
  }
  copy(p) {
    this.x = p.x;
    this.y = p.y;
    return this;
  }
  scale(sx, sy) {
    this.x *= sx;
    this.y *= sy;
    return this;
  }
  distTo(p) {
    return Math.hypot(p.y - this.y, p.x - this.x);
  }
  update() {
    this.el.style.left = `${this.x}px`;
    this.el.style.top = `${this.y}px`;
  }
  show() {
    this.el.style.display = 'unset';
  }
  hide() {
    this.el.style.display = 'none';
  }
  static MidPoint(a, b) {
    return new P((a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  static Slope(a, b) {
    return (a.y - b.y) / (a.x - b.x);
  }
};

const $w = 0.5;
const $h = 1.0;
const $A = new P(0.0, 0.0);
const $B = new P($A.x + $w, $A.y);
const $C = new P($A.x, $A.y + $h);
const $D = new P($A.x + $w, $A.y + $h);
const $E = new P($A.x + 2 * $w, $A.y);
const $F = new P($A.x + 2 * $w, $A.y + $h);

// ---- Pointer coords
const pointer = (() => {
  const { width, height } = elWrap.getBoundingClientRect();
  return new P(width * 0.5, height * 0.7);
})();
let isDragging = false;
elP.addEventListener('pointerdown', () => isDragging = true);
window.addEventListener('pointerup', () => isDragging = false);
window.addEventListener('pointermove', (e) => {
  const { x, y } = elWrap.getBoundingClientRect();
  pointer.x = e.clientX - x;
  pointer.y = e.clientY - y;
  if (isDragging) {
    fold();
  }
});

const pP = new P(0, 0, elP);
const pQ = new P(0, 0, elQ);
const pR = new P(0, 0, elR);
const pS = new P(0, 0, elS);
const pT = new P(0, 0, elT);
const pA = new P(0, 0, null);
const pB = new P(0, 0, null);
const pC = new P(0, 0, null);
const pD = new P(0, 0, null);
const pE = new P(0, 0, null);
const pF = new P(0, 0, null);

function fold() {
  const wrapRect = elWrap.getBoundingClientRect();
  pA.copy($A).scale(wrapRect.width, wrapRect.height);
  pB.copy($B).scale(wrapRect.width, wrapRect.height);
  pC.copy($C).scale(wrapRect.width, wrapRect.height);
  pD.copy($D).scale(wrapRect.width, wrapRect.height);
  pE.copy($E).scale(wrapRect.width, wrapRect.height);
  pF.copy($F).scale(wrapRect.width, wrapRect.height);

  // --- constraint pP
  {
    if (pointer.y < pD.y) {
      const d = pD.distTo(pointer);
      const D = $w * wrapRect.width;
      if (d > D) {
        const ang = Math.atan2(pointer.y - pD.y, pointer.x - pD.x);
        pP.x = D * Math.cos(ang) + pD.x;
        pP.y = D * Math.sin(ang) + pD.y;
      } else {
        pP.copy(pointer);
      }
    } else {
      const d = pB.distTo(pointer);
      const D = pB.clone().distTo(pC);
      if (d > D) {
        const low = Math.atan2($h * wrapRect.height, $w * wrapRect.width) * 1.0001;
        const high = (Math.PI - low) * 0.9999;
        const ang = Math.max(low, Math.min(high, Math.atan2(pointer.y - pB.y, pointer.x - pB.x)));
        pP.x = D * Math.cos(ang) + pB.x;
        pP.y = D * Math.sin(ang) + pB.y;
      } else {
        pP.copy(pointer);
      }
    }

    pP.update();
  }

  const mid = P.MidPoint(pC, pP);
  const slope = -1 / P.Slope(pC, pP);
  const c = mid.y - slope * mid.x;

  // y = slope * x + c 
  // x = (y - c) / slope

  pQ.y = pC.y;
  pQ.x = (pQ.y - c) / slope;
  pQ.update();

  pR.x = pC.x;
  pR.y = slope * pR.x + c;
  pR.update();

  pR.hide();
  pS.hide();
  pT.hide();

  let mode = '';

  if (pR.y > pA.y && pR.y < pC.y) { // PQR mode (P=back bot right corner)
    mode = 'PRQ';
    pR.show();
  } else {
    mode = 'PQST';

    // find S
    pS.y = pA.y;
    pS.x = (pS.y - c) / slope;
    pS.update();
    pS.show();

    // find T
    // # line ST has same slope of PQ
    const slope_PQ = P.Slope(pP, pQ);
    // y = slope * x + k
    // k = pS.y - slope * pS.x
    const k = pS.y - slope_PQ * pS.x;
    // y = slope * x + (k) ... (!1)
    // # line PR
    // (pP.y-pR.y)/(pP.x-pR.x)=(y-pR.y)/(x-pR.x)
    const m = (pP.y - pR.y) / (pP.x - pR.x);
    // y = m * (x - pR.x) + pR.y ... (!2)
    // # !2 into !1
    // m * (x - pR.x) + pR.y = slope * x + k
    // m * x - slope * x = k + m * pR.x - pR.y
    // x = (k + m * pR.x - pR.y) / (m - slope)
    pT.x = (k + m * pR.x - pR.y) / (m - slope_PQ);
    pT.y = slope_PQ * pT.x + k;
    pT.update();
    pT.show();
  }

  //// set page position
  elBack.style.left = `${pP.x}px`;
  elBack.style.top = `${pP.y}px`;
  const rot = Math.atan2(pP.y - pQ.y, pP.x - pQ.x);
  elBack.style.transformOrigin = 'top left';
  elBack.style.transform = `rotate(${rot}rad) translate(-100%, -100%)`;

  //// set clippath
  if (mode == 'PRQ') {
    const yR = wrapRect.height - pP.distTo(pR);
    const xQ = wrapRect.width / 2 - pP.distTo(pQ);
    elBack.style.clipPath = `polygon(100% 100%, 100% ${yR}px, ${xQ}px 100%)`;
    {
      const xQ = pC.distTo(pQ);
      elFront.style.clipPath = `polygon(100% 100%, 100% 0, 0 0, 0 ${yR}px, ${xQ}px 100%)`
    }
  } else {
    const xQ = wrapRect.width / 2 - pP.distTo(pQ);
    const xS = wrapRect.width / 2 - pS.distTo(pT);
    elBack.style.clipPath = `polygon(100% 100%, 100% 0, ${xS}px 0, ${xQ}px 100%)`;
    {
      const xS = pA.distTo(pS);
      const xQ = pC.distTo(pQ);
      elFront.style.clipPath = `polygon(100% 100%, 100% 0, ${xS}px 0, ${xQ}px 100%)`;
    }
  }
}

let timer;
window.addEventListener('resize', () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    pointer.x = 0;
    pointer.y = 0;
    fold();
  }, 20);
});
fold();


// // DEBUG
// const can = document.querySelector('.canvas');
// let ctx;
// window.addEventListener('resize', () => {
//   can.width = can.getBoundingClientRect().width;
//   can.height = can.getBoundingClientRect().height;
//   ctx = can.getContext('2d');
// });
// window.dispatchEvent(new Event('resize'));
// setInterval(() => {
//   const drawLine = (p, q) => {
//     ctx.beginPath();
//     ctx.moveTo(p.x, p.y);
//     ctx.lineTo(q.x, q.y);
//     ctx.stroke();
//   }
//   ctx.clearRect(0, 0, can.width, can.height);

//   drawLine(pR, pQ);
//   drawLine(pP, pQ);
//   drawLine(pP, pR);

//   drawLine(pQ, pS);
//   drawLine(pS, pT);
//   drawLine(pT, pP);
//   drawLine(pP, pQ);
// });