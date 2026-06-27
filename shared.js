// ── SHARED UTILITIES ──
const fmt  = n => '$' + Math.round(n).toLocaleString();
const fmt2 = n => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const parseVal = id => parseFloat(document.getElementById(id).value.replace(/,/g, '')) || 0;
const pct = n => (n * 100).toFixed(1) + '%';

function formatCommaInput(el) {
  const raw = el.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
  const num = parseFloat(raw);
  if (!isNaN(num)) el.value = num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.comma-input').forEach(el => {
    el.addEventListener('blur', () => formatCommaInput(el));
    el.addEventListener('focus', () => { el.value = el.value.replace(/,/g, ''); });
  });
});

function makeCard(label, value, cls = '', sub = '') {
  return `<div class="result-card">
    <div class="result-label">${label}</div>
    <div class="result-value ${cls}">${value}</div>
    ${sub ? `<div class="result-sub">${sub}</div>` : ''}
  </div>`;
}

// ── ALERT ──
function showAlert(msg, isError) {
  const icon = document.getElementById('alert-icon');
  icon.textContent = isError ? '⚠ Input Error' : '⚠ Heads Up';
  icon.className = 'alert-icon' + (isError ? '' : ' warn');
  document.getElementById('alert-msg').textContent = msg;
  document.getElementById('alert-modal').classList.add('show');
}
function closeAlert() {
  document.getElementById('alert-modal').classList.remove('show');
}

function checkLTV(loan, price) {
  if (!price || price <= 0) return false;
  const ltv = loan / price;
  if (ltv > 1.0) {
    showAlert('Loan amount exceeds purchase price. Please input a down payment.', true);
    return true;
  }
  if (ltv > 0.95) {
    showAlert('You have less than 5% down payment. Contact a lending professional to see if you qualify for low down payment programs.', false);
    return false;
  }
  return false;
}

// ── APR CALC ──
function calcAPR(loan, annualRate, termYears, price, pmiMonthly) {
  const r  = annualRate / 12;
  const n  = termYears * 12;
  const pi = loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const origination = 1525;
  const settlement  = 1700 + (price / 1000);
  const discountPt  = loan * 0.01;
  const prepaidInt  = loan * annualRate / 365 * 15;
  const totalCosts  = origination + settlement + discountPt + prepaidInt;
  const financedAmt = loan - totalCosts;
  if (financedAmt <= 0) return annualRate * 100;

  const hasPMI   = pmiMonthly > 0;
  const target78 = price * 0.78;

  if (!hasPMI) {
    let guess = annualRate / 12;
    for (let i = 0; i < 300; i++) {
      const pow  = Math.pow(1 + guess, n);
      const f    = pi * (1 - 1 / pow) / guess - financedAmt;
      const df   = pi * (1 / (guess * guess) * (1 / pow - 1) + n / (guess * pow * (1 + guess)));
      const next = guess - f / df;
      if (Math.abs(next - guess) < 1e-12) { guess = next; break; }
      guess = Math.max(next, 1e-10);
    }
    return guess * 12 * 100;
  }

  const cashFlows = [-financedAmt];
  let balance = loan;
  for (let m = 1; m <= n; m++) {
    const intCharge = balance * r;
    const prinPmt   = pi - intCharge;
    balance -= prinPmt;
    if (balance < 0) balance = 0;
    cashFlows.push(pi + (balance > target78 ? pmiMonthly : 0));
  }
  let guess = annualRate / 12;
  for (let i = 0; i < 300; i++) {
    let npv = cashFlows[0], dnpv = 0;
    for (let m = 1; m < cashFlows.length; m++) {
      const disc = Math.pow(1 + guess, m);
      npv  += cashFlows[m] / disc;
      dnpv -= m * cashFlows[m] / (disc * (1 + guess));
    }
    if (Math.abs(dnpv) < 1e-20) break;
    const next = guess - npv / dnpv;
    if (Math.abs(next - guess) < 1e-12) { guess = next; break; }
    guess = Math.max(next, 1e-10);
  }
  return guess * 12 * 100;
}

function fmtAPR(apr) { return apr.toFixed(3) + '% APR*'; }

// ── CONTACT MODAL ──
function showContactModal() {
  const el = document.getElementById('contact-modal');
  if (el) el.classList.add('show');
}
function closeContactModal() {
  const el = document.getElementById('contact-modal');
  if (el) el.classList.remove('show');
}
