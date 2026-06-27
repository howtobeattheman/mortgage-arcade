// shared.js — loaded before inline scripts on every calculator page
// Using var instead of const/let at top level to avoid any cross-script scope issues

var fmt   = function(n) { return '$' + Math.round(n).toLocaleString(); };
var fmt2  = function(n) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
var parseVal = function(id) { return parseFloat(document.getElementById(id).value.replace(/,/g, '')) || 0; };
var pct   = function(n) { return (n * 100).toFixed(1) + '%'; };

function formatCommaInput(el) {
  var raw = el.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
  var num = parseFloat(raw);
  if (!isNaN(num)) el.value = num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.comma-input').forEach(function(el) {
    el.addEventListener('blur', function() { formatCommaInput(el); });
    el.addEventListener('focus', function() { el.value = el.value.replace(/,/g, ''); });
  });
});

function makeCard(label, value, cls, sub) {
  cls = cls || '';
  sub = sub || '';
  return '<div class="result-card">'
    + '<div class="result-label">' + label + '</div>'
    + '<div class="result-value ' + cls + '">' + value + '</div>'
    + (sub ? '<div class="result-sub">' + sub + '</div>' : '')
    + '</div>';
}

function showAlert(msg, isError) {
  var icon = document.getElementById('alert-icon');
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
  var ltv = loan / price;
  if (ltv > 1.0) {
    showAlert('Loan amount exceeds purchase price. Please check your entries.', true);
    return true;
  }
  if (ltv > 0.95) {
    showAlert('You have less than 5% down payment. Contact a lending professional to see if you qualify for low down payment programs.', false);
    return false;
  }
  return false;
}

function calcAPR(loan, annualRate, termYears, price, pmiMonthly) {
  var r  = annualRate / 12;
  var n  = termYears * 12;
  var pi = loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  var origination = 1525;
  var settlement  = 1700 + (price / 1000);
  var discountPt  = loan * 0.01;
  var prepaidInt  = loan * annualRate / 365 * 15;
  var totalCosts  = origination + settlement + discountPt + prepaidInt;
  var financedAmt = loan - totalCosts;
  if (financedAmt <= 0) return annualRate * 100;

  var hasPMI   = pmiMonthly > 0;
  var target78 = price * 0.78;

  if (!hasPMI) {
    var guess = annualRate / 12;
    for (var i = 0; i < 300; i++) {
      var pow  = Math.pow(1 + guess, n);
      var f    = pi * (1 - 1 / pow) / guess - financedAmt;
      var df   = pi * (1 / (guess * guess) * (1 / pow - 1) + n / (guess * pow * (1 + guess)));
      var next = guess - f / df;
      if (Math.abs(next - guess) < 1e-12) { guess = next; break; }
      guess = Math.max(next, 1e-10);
    }
    return guess * 12 * 100;
  }

  var cashFlows = [-financedAmt];
  var balance = loan;
  for (var m = 1; m <= n; m++) {
    var intCharge = balance * r;
    var prinPmt   = pi - intCharge;
    balance -= prinPmt;
    if (balance < 0) balance = 0;
    cashFlows.push(pi + (balance > target78 ? pmiMonthly : 0));
  }
  var guess2 = annualRate / 12;
  for (var j = 0; j < 300; j++) {
    var npv = cashFlows[0], dnpv = 0;
    for (var k = 1; k < cashFlows.length; k++) {
      var disc = Math.pow(1 + guess2, k);
      npv  += cashFlows[k] / disc;
      dnpv -= k * cashFlows[k] / (disc * (1 + guess2));
    }
    if (Math.abs(dnpv) < 1e-20) break;
    var next2 = guess2 - npv / dnpv;
    if (Math.abs(next2 - guess2) < 1e-12) { guess2 = next2; break; }
    guess2 = Math.max(next2, 1e-10);
  }
  return guess2 * 12 * 100;
}

function fmtAPR(apr) { return apr.toFixed(3) + '% APR*'; }

function showContactModal() {
  var el = document.getElementById('contact-modal');
  if (el) el.classList.add('show');
}
function closeContactModal() {
  var el = document.getElementById('contact-modal');
  if (el) el.classList.remove('show');
}
