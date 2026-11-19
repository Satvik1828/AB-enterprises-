// ============================================================
// AB ENTERPRISE — CORE APPLICATION LOGIC (index.html + owner.html)
// ============================================================

const STORAGE_KEY = "ab_enterprise_prod_v1";
const AUTH_KEY = "ab_owner_session_v1";
const CFG = window.AB_CONFIG || {};
const todayStr = () => new Date().toISOString().slice(0, 10);

const defaultData = {
  settings: {
    bizName: CFG.businessName || "AB Enterprise",
    tagline: CFG.tagline || "Quality Bricks Manufacturing & Construction Supply",
    gstin: CFG.gstin || "UNREGISTERED / CASH MEMO",
    upiId: CFG.upiId || "",
    whatsappNumber: CFG.whatsappNumber || "919876543210",
    email: CFG.email || "info@abenterprise.com",
    address: CFG.address || "AB Enterprise Brick Kiln, India",
    ownerUser: CFG.ownerUsername || "owner",
    ownerPass: CFG.ownerPassword || "ab1234",
    customLoginSet: false
  },
  bricks: [
    { id: "red-clay", name: "1st Class Red Clay Bricks", ratePer1000: 7500, stock: 45000, minStock: 10000, desc: "Standard kiln-baked red bricks with high strength." },
    { id: "fly-ash", name: "Fly Ash Bricks", ratePer1000: 6200, stock: 38000, minStock: 10000, desc: "Eco-friendly uniform size bricks." },
    { id: "wire-cut", name: "Wire-Cut Machine Bricks", ratePer1000: 9200, stock: 22000, minStock: 5000, desc: "Precision bricks for exposed & heavy walls." },
    { id: "paver", name: "Interlocking Paver Blocks", ratePer1000: 14500, stock: 15000, minStock: 4000, desc: "Heavy-duty pavers for driveways & yards." }
  ],
  destinations: [
    { id: "dest-local", name: "Local City / Town (0-8 km)", km: 6, tractorRate: 900, truckRate: 2000 },
    { id: "dest-ind", name: "Industrial Area / Ring Road (8-18 km)", km: 15, tractorRate: 1400, truckRate: 3000 },
    { id: "dest-hwy", name: "Highway Villages (18-35 km)", km: 28, tractorRate: 2100, truckRate: 4200 }
  ],
  vehicles: [
    { id: "veh-1", num: "GJ-01-TR-4421", type: "Tractor Trolley", driver: "Ramesh Bhai", phone: "9876511122" },
    { id: "veh-2", num: "GJ-01-DM-8890", type: "6-Wheel Dumper", driver: "Vikram Singh", phone: "9876533344" }
  ],
  materials: [
    { id: "clay", name: "Clay / Brick Soil", unit: "Tractor Trolleys", stock: 42, minStock: 10, defaultRate: 900 },
    { id: "coal", name: "Steam Coal / Fuel", unit: "Tons", stock: 18, minStock: 5, defaultRate: 8500 },
    { id: "flyash", name: "Raw Fly Ash", unit: "Tons", stock: 25, minStock: 6, defaultRate: 1200 },
    { id: "cement", name: "Cement", unit: "Bags", stock: 120, minStock: 30, defaultRate: 360 },
    { id: "diesel", name: "Diesel", unit: "Liters", stock: 180, minStock: 50, defaultRate: 92 }
  ],
  invoices: [
    {
      id: "AB-S-1001", type: "sale", date: todayStr(), party: "Suresh Patel", phone: "9876500011", gstin: "",
      destName: "Local City / Town (0-8 km)", addr: "Sector 4 Housing Plot 12", vehicle: "GJ-01-TR-4421 (Ramesh Bhai)", driverPhone: "9876511122",
      items: [{ itemId: "red-clay", name: "1st Class Red Clay Bricks", qty: 4000, rate: 7500, unitLabel: "1k", subtotal: 30000 }],
      freight: 900, loading: 400, discount: 0, gstPercent: 0, gstAmt: 0, grandTotal: 31300, paid: 31300, mode: "UPI / PhonePe", status: "Delivered"
    },
    {
      id: "AB-P-2001", type: "purchase", date: todayStr(), party: "Sharma Coal Depot", phone: "9876500099", gstin: "SUP-INV-778",
      destName: "Kiln Yard Inward", addr: "Kiln Unloading Point", vehicle: "Hired Truck", driverPhone: "",
      items: [{ itemId: "coal", name: "Steam Coal / Fuel (Tons)", qty: 10, rate: 8500, unitLabel: "Tons", subtotal: 85000 }],
      freight: 2500, loading: 0, discount: 0, gstPercent: 5, gstAmt: 4375, grandTotal: 91875, paid: 60000, mode: "Bank Transfer / NEFT", status: "Received"
    }
  ],
  productions: [
    { id: 3001, date: todayStr(), batch: "Kiln-A1", brickId: "red-clay", produced: 15000, waste: 400, net: 14600 }
  ],
  materialUsage: [
    { id: 5001, date: todayStr(), matId: "coal", qty: 2.5, note: "Kiln Firing Round 1" }
  ],
  expenses: [
    { id: 4001, date: todayStr(), category: "Molding / Pather Labor", amount: 18500, note: "Weekly Pather Team Payment" }
  ]
};

let state = loadLocalState();
let builderType = "sale";
let draftItems = [];

function loadLocalState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const parsed = saved ? JSON.parse(saved) : structuredClone(defaultData);
  if (!parsed.settings.customLoginSet) {
    parsed.settings.ownerUser = CFG.ownerUsername || "owner";
    parsed.settings.ownerPass = CFG.ownerPassword || "ab1234";
    parsed.settings.bizName = CFG.businessName || parsed.settings.bizName;
    parsed.settings.whatsappNumber = CFG.whatsappNumber || parsed.settings.whatsappNumber;
    parsed.settings.email = CFG.email || parsed.settings.email;
    parsed.settings.address = CFG.address || parsed.settings.address;
    parsed.settings.gstin = CFG.gstin || parsed.settings.gstin;
    parsed.settings.upiId = CFG.upiId ?? parsed.settings.upiId;
  }
  return parsed;
}

async function initCloudSync() {
  if (!CFG.firebaseDbUrl) return;
  try {
    const res = await fetch(`${CFG.firebaseDbUrl.replace(/\/$/, "")}/ab_data.json`);
    if (res.ok) {
      const cloudData = await res.json();
      if (cloudData && cloudData.bricks && cloudData.invoices) {
        state = cloudData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        renderCurrentPage();
      } else {
        await pushToCloud();
      }
    }
  } catch (err) {
    console.warn("Cloud sync offline, using localStorage:", err);
  }
}

async function pushToCloud() {
  if (!CFG.firebaseDbUrl) return;
  try {
    await fetch(`${CFG.firebaseDbUrl.replace(/\/$/, "")}/ab_data.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
      keepalive: true
    });
  } catch (err) {
    console.warn("Cloud save error:", err);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  pushToCloud();
  renderCurrentPage();
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}
function inr(n) { return "₹" + Math.round(Number(n || 0)).toLocaleString("en-IN"); }
function getBrick(id) { return state.bricks.find(b => b.id === id) || state.bricks[0]; }
function getMat(id) { return state.materials.find(m => m.id === id) || state.materials[0]; }
function formatPhone(phone) {
  let c = String(phone || "").replace(/\D/g, "");
  return c.length === 10 ? "91" + c : c;
}

function numToWordsINR(num) {
  num = Math.round(Number(num || 0));
  if (num === 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = n => n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
  const three = n => (n >= 100 ? a[Math.floor(n / 100)] + " Hundred " : "") + two(n % 100);
  let res = "";
  const cr = Math.floor(num / 10000000); num %= 10000000;
  const lk = Math.floor(num / 100000); num %= 100000;
  const th = Math.floor(num / 1000); num %= 1000;
  if (cr) res += two(cr) + " Crore ";
  if (lk) res += two(lk) + " Lakh ";
  if (th) res += two(th) + " Thousand ";
  if (num) res += three(num);
  return res.trim() + " Rupees Only";
}

function renderSharedBranding() {
  const hdr = document.getElementById("hdr-biz-name");
  if (hdr) hdr.textContent = state.settings.bizName;
  document.querySelectorAll(".biz-name-txt").forEach(el => el.textContent = state.settings.bizName);
  document.querySelectorAll(".biz-tagline-txt").forEach(el => el.textContent = state.settings.tagline);
}

function renderCurrentPage() {
  renderSharedBranding();
  if (document.getElementById("page-website")) renderPublicPage();
  if (document.getElementById("page-owner")) checkOwnerAuthAndRender();
}

// ==================== PUBLIC WEBSITE ====================
function renderPublicPage() {
  const totalBricks = state.bricks.reduce((s, b) => s + Number(b.stock), 0);
  document.getElementById("hero-stock").textContent = totalBricks.toLocaleString("en-IN");
  document.getElementById("hero-dests").textContent = state.destinations.length + "+";
  document.getElementById("contact-address-display").textContent = state.settings.address;
  document.getElementById("contact-phone-display").textContent = "+" + state.settings.whatsappNumber;
  document.getElementById("contact-email-display").textContent = state.settings.email;
  document.getElementById("contact-gst-display").textContent = state.settings.gstin || "Cash Memo";

  document.getElementById("public-products-grid").innerHTML = state.bricks.map(b => `
    <div class="card">
      <div class="brick-icon"></div>
      <h3>${escapeHtml(b.name)}</h3>
      <div class="price-tag">${inr(b.ratePer1000)} <small style="font-size:0.74rem; color:var(--muted); font-weight:500;">/ 1,000 pcs</small></div>
      <span class="badge ${b.stock <= b.minStock ? "badge-warn" : "badge-ok"}">Stock: ${Number(b.stock).toLocaleString("en-IN")} pcs</span>
      <p style="font-size:0.85rem; color:var(--muted); margin:0.65rem 0;">${escapeHtml(b.desc)}</p>
      <button class="btn btn-primary btn-sm" style="width:100%;" onclick="selectBrickForOrder('${b.id}')">Order This Brick</button>
    </div>
  `).join("");

  document.getElementById("public-dest-grid").innerHTML = state.destinations.map(d => `
    <div class="card">
      <span class="badge badge-blue">${d.km} km zone</span>
      <h4 style="margin:0.45rem 0;">${escapeHtml(d.name)}</h4>
      <p style="font-size:0.85rem; color:var(--muted);">Tractor: <strong>${inr(d.tractorRate)}</strong><br>Truck / Dumper: <strong>${inr(d.truckRate)}</strong></p>
    </div>
  `).join("") + `
    <div class="card" style="background:#fff7ed; border-color:#fed7aa;">
      <span class="badge badge-warn">Custom Route</span>
      <h4 style="margin:0.45rem 0;">Other Destinations</h4>
      <p style="font-size:0.85rem; color:var(--muted);">Outstation or custom village? Select "Other Destination" in the booking form.</p>
    </div>
  `;

  document.getElementById("ord-brick").innerHTML = state.bricks.map(b => `<option value="${b.id}">${escapeHtml(b.name)} (${inr(b.ratePer1000)}/1k)</option>`).join("");
  document.getElementById("ord-dest").innerHTML = state.destinations.map(d => `<option value="${d.id}">${escapeHtml(d.name)} (${d.km}km)</option>`).join("") + `<option value="other">Other Destination (Custom Site)</option>`;
  updatePublicEstimate();
}

function selectBrickForOrder(id) {
  document.getElementById("ord-brick").value = id;
  updatePublicEstimate();
  document.getElementById("order-section").scrollIntoView({ behavior: "smooth" });
}

function updatePublicEstimate() {
  const b = getBrick(document.getElementById("ord-brick").value);
  const qty = Number(document.getElementById("ord-qty").value) || 0;
  const destId = document.getElementById("ord-dest").value;
  const vehType = document.getElementById("ord-veh-type").value;
  const brickVal = Math.round((qty / 1000) * b.ratePer1000);
  let freight = 0;

  if (destId !== "other") {
    const d = state.destinations.find(x => x.id === destId);
    if (d) {
      const trips = vehType === "tractor" ? Math.max(1, Math.ceil(qty / 2000)) : Math.max(1, Math.ceil(qty / 5000));
      freight = trips * (vehType === "tractor" ? Number(d.tractorRate) : Number(d.truckRate));
    }
  }
  document.getElementById("est-bricks").textContent = inr(brickVal);
  document.getElementById("est-freight").textContent = destId === "other" ? "Quote on WhatsApp" : inr(freight);
  document.getElementById("ord-estimate").textContent = inr(brickVal + freight);
  document.getElementById("ord-load-info").textContent = vehType === "tractor"
    ? `Approx. ${Math.max(1, Math.ceil(qty / 2000))} Tractor Trolley load(s)`
    : `Approx. ${Math.max(1, Math.ceil(qty / 5000))} Truck/Dumper load(s)`;
}

function handlePublicOrder(e) {
  e.preventDefault();
  const name = document.getElementById("ord-name").value.trim();
  const phone = document.getElementById("ord-phone").value.trim();
  const b = getBrick(document.getElementById("ord-brick").value);
  const qty = Number(document.getElementById("ord-qty").value);
  const destId = document.getElementById("ord-dest").value;
  const vehType = document.getElementById("ord-veh-type").value;
  const addr = document.getElementById("ord-address").value.trim();

  const destObj = state.destinations.find(x => x.id === destId);
  const destName = destObj ? destObj.name : "Other Destination";
  let freight = 0;
  if (destObj) {
    const trips = vehType === "tractor" ? Math.max(1, Math.ceil(qty / 2000)) : Math.max(1, Math.ceil(qty / 5000));
    freight = trips * (vehType === "tractor" ? Number(destObj.tractorRate) : Number(destObj.truckRate));
  }
  const subtotal = Math.round((qty / 1000) * b.ratePer1000);
  const grandTotal = subtotal + freight;

  const invId = "AB-S-" + Math.floor(1000 + Math.random() * 9000);
  state.invoices.push({
    id: invId, type: "sale", date: todayStr(), party: name, phone, gstin: "",
    destName, addr, vehicle: vehType === "tractor" ? "Tractor Trolley (Pending Assign)" : "Truck/Dumper (Pending Assign)", driverPhone: "",
    items: [{ itemId: b.id, name: b.name, qty, rate: b.ratePer1000, unitLabel: "1k", subtotal }],
    freight, loading: 0, discount: 0, gstPercent: 0, gstAmt: 0, grandTotal, paid: 0, mode: "Pending Confirmation", status: "Pending"
  });
  b.stock = Math.max(0, Number(b.stock) - qty);
  saveState();

  const msg = `*New Brick Order (${invId}) — ${state.settings.bizName}*\nCustomer: ${name}\nPhone: ${phone}\nBrick: ${b.name} (${qty.toLocaleString("en-IN")} pcs)\nDestination: ${destName}\nSite: ${addr}\nEst. Total: ${inr(grandTotal)}`;
  openQuickWhatsApp(msg);
  e.target.reset();
  document.getElementById("ord-qty").value = 2000;
  updatePublicEstimate();
  alert(`Order ${invId} placed! Opening WhatsApp to send confirmation.`);
}

// ==================== OWNER AUTH & DASHBOARD ====================
function checkOwnerAuthAndRender() {
  const loggedIn = sessionStorage.getItem(AUTH_KEY) === "true";
  document.getElementById("page-login").classList.toggle("hidden", loggedIn);
  document.getElementById("page-owner").classList.toggle("hidden", !loggedIn);
  if (loggedIn) {
    const badge = document.getElementById("storage-badge");
    if (badge) {
      badge.textContent = CFG.firebaseDbUrl ? "Live Cloud Synced" : "Local Browser Storage";
      badge.className = "badge " + (CFG.firebaseDbUrl ? "badge-ok" : "badge-blue");
    }
    renderOwner();
  }
}

function handleOwnerLogin(e) {
  e.preventDefault();
  const u = document.getElementById("login-user").value.trim();
  const p = document.getElementById("login-pass").value;
  const err = document.getElementById("login-error");
  if (u === state.settings.ownerUser && p === state.settings.ownerPass) {
    sessionStorage.setItem(AUTH_KEY, "true");
    err.classList.add("hidden");
    e.target.reset();
    checkOwnerAuthAndRender();
  } else {
    err.textContent = "Invalid username or password.";
    err.classList.remove("hidden");
  }
}

function logoutOwner() {
  sessionStorage.removeItem(AUTH_KEY);
  checkOwnerAuthAndRender();
}

function switchOwnerTab(tabName, btn) {
  document.querySelectorAll(".owner-tab").forEach(t => t.classList.add("hidden"));
  document.getElementById("tab-" + tabName).classList.remove("hidden");
  document.querySelectorAll(".owner-tabs .tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function renderOwner() {
  const salesInvs = state.invoices.filter(x => x.type === "sale");
  const purchInvs = state.invoices.filter(x => x.type === "purchase");

  const totalSales = salesInvs.reduce((s, x) => s + Number(x.grandTotal), 0);
  const totalCollected = salesInvs.reduce((s, x) => s + Number(x.paid), 0);
  const receivable = Math.max(0, totalSales - totalCollected);

  const totalPurch = purchInvs.reduce((s, x) => s + Number(x.grandTotal), 0);
  const totalPurchPaid = purchInvs.reduce((s, x) => s + Number(x.paid), 0);
  const payable = Math.max(0, totalPurch - totalPurchPaid);

  const totalExp = state.expenses.reduce((s, x) => s + Number(x.amount), 0);
  const outflow = totalPurch + totalExp;
  const profit = totalSales - outflow;
  const totalBricks = state.bricks.reduce((s, b) => s + Number(b.stock), 0);

  document.getElementById("kpi-sales").textContent = inr(totalSales);
  document.getElementById("kpi-collected").textContent = inr(totalCollected);
  document.getElementById("kpi-receivable").textContent = inr(receivable);
  document.getElementById("kpi-payable").textContent = inr(payable);
  document.getElementById("kpi-outflow").textContent = inr(outflow);
  document.getElementById("kpi-purch-tot").textContent = inr(totalPurch);
  document.getElementById("kpi-profit").textContent = inr(profit);
  document.getElementById("kpi-profit").style.color = profit >= 0 ? "var(--success)" : "var(--danger)";
  document.getElementById("kpi-brick-stock").textContent = totalBricks.toLocaleString("en-IN");

  const alerts = [];
  const pending = salesInvs.filter(s => s.status === "Pending").length;
  if (pending) alerts.push(`📦 <strong>${pending} Pending Order(s)</strong> waiting dispatch.`);
  state.bricks.filter(b => b.stock <= b.minStock).forEach(b => alerts.push(`🧱 Low Brick: <strong>${escapeHtml(b.name)}</strong> (${b.stock})`));
  state.materials.filter(m => m.stock <= m.minStock).forEach(m => alerts.push(`⚠️ Low Material: <strong>${escapeHtml(m.name)}</strong> (${m.stock} ${escapeHtml(m.unit)})`));
  document.getElementById("owner-alerts").innerHTML = alerts.length ? `<div class="alert-bar">${alerts.join(" &nbsp;|&nbsp; ")}</div>` : "";

  document.getElementById("inv-f-dest").innerHTML = state.destinations.map(d => `<option value="${d.id}">${escapeHtml(d.name)} (${d.km}km)</option>`).join("") + `<option value="other">Other Destination (Custom Site)</option>`;
  document.getElementById("inv-f-veh").innerHTML = `<option value="">-- Select Saved Vehicle --</option>` + state.vehicles.map(v => `<option value="${v.id}">${escapeHtml(v.num)} (${escapeHtml(v.type)} - ${escapeHtml(v.driver)})</option>`).join("");
  document.getElementById("use-mat").innerHTML = state.materials.map(m => `<option value="${m.id}">${escapeHtml(m.name)} (Avail: ${m.stock} ${escapeHtml(m.unit)})</option>`).join("");
  document.getElementById("prod-brick").innerHTML = state.bricks.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");
  refreshDraftSelect();

  const fType = document.getElementById("inv-filter-type").value;
  const fSearch = (document.getElementById("inv-search").value || "").toLowerCase();
  document.getElementById("invoices-table-body").innerHTML = state.invoices.slice().reverse()
    .filter(inv => {
      if (fType === "sale" && inv.type !== "sale") return false;
      if (fType === "purchase" && inv.type !== "purchase") return false;
      if (fType === "due" && (inv.grandTotal - inv.paid) <= 0) return false;
      return inv.id.toLowerCase().includes(fSearch) || inv.party.toLowerCase().includes(fSearch) || inv.destName.toLowerCase().includes(fSearch);
    })
    .map(inv => {
      const due = Math.max(0, Number(inv.grandTotal) - Number(inv.paid));
      const typeBadge = inv.type === "sale" ? `<span class="badge badge-ok">SALES</span>` : `<span class="badge badge-purple">PURCHASE</span>`;
      const itemsTxt = inv.items.map(it => `${escapeHtml(it.name)} × <strong>${Number(it.qty).toLocaleString("en-IN")}</strong>`).join("<br>");
      return `
        <tr>
          <td><strong>${escapeHtml(inv.id)}</strong><br><small>${escapeHtml(inv.date)}</small></td>
          <td>${typeBadge}</td