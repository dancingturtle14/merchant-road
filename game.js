/**
 * 商途 Merchant Road — v0.1 offline prototype
 * Original homage fiction. No official IP assets.
 */
(function () {
  "use strict";

  const SAVE_KEY = "merchant-road-v01";
  const WIN_NET = 5000;
  const START_CASH = 800;
  const CART_SLOTS = 12;

  const GOODS = [
    { id: "salt", name: "鹽", base: 28, icon: "🧂" },
    { id: "rice", name: "米", base: 22, icon: "🌾" },
    { id: "cloth", name: "布", base: 55, icon: "🧵" },
    { id: "tea", name: "茶", base: 70, icon: "🍵" },
    { id: "porcelain", name: "瓷器", base: 120, icon: "🏺" },
    { id: "spice", name: "香料", base: 140, icon: "🌶️" },
    { id: "iron", name: "鐵器", base: 95, icon: "⚒️" },
  ];

  // buyMult / sellMult relative to base (player buys from city / sells to city)
  const CITIES = {
    hekou: {
      id: "hekou",
      name: "河口鎮",
      temper: "fair",
      token: { x: 70, y: 130 },
      buy:  { salt: 0.85, rice: 0.90, cloth: 1.05, tea: 0.88, porcelain: 1.25, spice: 1.30, iron: 1.15 },
      sell: { salt: 0.70, rice: 0.75, cloth: 0.95, tea: 0.80, porcelain: 1.10, spice: 1.15, iron: 1.00 },
    },
    qingshan: {
      id: "qingshan",
      name: "青山驛",
      temper: "impatient",
      token: { x: 230, y: 55 },
      buy:  { salt: 1.20, rice: 1.10, cloth: 0.92, tea: 1.15, porcelain: 0.82, spice: 1.35, iron: 0.88 },
      sell: { salt: 1.05, rice: 0.95, cloth: 0.80, tea: 1.00, porcelain: 0.70, spice: 1.20, iron: 0.75 },
    },
    nanpu: {
      id: "nanpu",
      name: "南浦港",
      temper: "greedy",
      token: { x: 300, y: 140 },
      buy:  { salt: 1.10, rice: 1.25, cloth: 1.20, tea: 0.95, porcelain: 1.15, spice: 0.78, iron: 1.22 },
      sell: { salt: 0.95, rice: 1.10, cloth: 1.05, tea: 0.85, porcelain: 1.00, spice: 0.65, iron: 1.08 },
    },
  };

  const ROUTES = [
    { a: "hekou", b: "qingshan", days: 2, cost: 40, stamina: 18 },
    { a: "qingshan", b: "nanpu", days: 2, cost: 45, stamina: 20 },
    { a: "hekou", b: "nanpu", days: 3, cost: 70, stamina: 28 },
  ];

  const TEMPER = {
    fair: { band: 0.12, counters: 2, soft: true },
    greedy: { band: 0.08, counters: 1, soft: false },
    impatient: { band: 0.10, counters: 1, soft: false },
  };

  /** @type {GameState} */
  let state;
  /** @type {BargainSession|null} */
  let bargain = null;

  /**
   * @typedef {{
   *  cash: number, day: number, stamina: number, city: string,
   *  cargo: Record<string, number>, log: string[], won: boolean
   * }} GameState
   */

  function freshState() {
    return {
      cash: START_CASH,
      day: 1,
      stamina: 100,
      city: "hekou",
      cargo: Object.fromEntries(GOODS.map((g) => [g.id, 0])),
      log: ["第 1 日：你在河口鎮接下小車，開始商途。"],
      won: false,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return freshState();
      const s = JSON.parse(raw);
      if (!s || typeof s.cash !== "number") return freshState();
      return s;
    } catch {
      return freshState();
    }
  }

  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    pushLog("進度已儲存。");
    render();
  }

  function pushLog(msg) {
    state.log.unshift(`D${state.day} · ${msg}`);
    if (state.log.length > 40) state.log.length = 40;
  }

  function cartUsed() {
    return GOODS.reduce((n, g) => n + (state.cargo[g.id] || 0), 0);
  }

  function listBuy(cityId, goodId) {
    const g = GOODS.find((x) => x.id === goodId);
    const c = CITIES[cityId];
    return Math.max(1, Math.round(g.base * c.buy[goodId]));
  }

  function listSell(cityId, goodId) {
    const g = GOODS.find((x) => x.id === goodId);
    const c = CITIES[cityId];
    return Math.max(1, Math.round(g.base * c.sell[goodId]));
  }

  function cargoValueAt(cityId) {
    return GOODS.reduce((sum, g) => {
      const qty = state.cargo[g.id] || 0;
      return sum + qty * listSell(cityId, g.id);
    }, 0);
  }

  function netWorth() {
    return state.cash + cargoValueAt(state.city);
  }

  function checkWin() {
    if (!state.won && netWorth() >= WIN_NET) {
      state.won = true;
      pushLog(`達成目標！淨資產 ${netWorth()} 文。`);
      showEvent("商途小成", `淨資產達到 ${WIN_NET} 文！可繼續沙盒經營，或按「重新開始」。`);
    }
  }

  function routeBetween(a, b) {
    return ROUTES.find(
      (r) => (r.a === a && r.b === b) || (r.a === b && r.b === a)
    );
  }

  function neighbors(cityId) {
    return ROUTES.filter((r) => r.a === cityId || r.b === cityId).map((r) =>
      r.a === cityId ? r.b : r.a
    );
  }

  // --- Bargain ---
  function openBargain(goodId, side) {
    const city = CITIES[state.city];
    const list = side === "buy" ? listBuy(state.city, goodId) : listSell(state.city, goodId);
    const t = TEMPER[city.temper];
    const fair =
      side === "buy"
        ? list * (1 + (Math.random() * t.band - t.band * 0.3))
        : list * (1 - (Math.random() * t.band - t.band * 0.3));
    bargain = {
      goodId,
      side,
      list: list,
      fair: Math.round(fair),
      countersLeft: t.counters,
      soft: t.soft,
      counterPrice: null,
      temper: city.temper,
    };
    const g = GOODS.find((x) => x.id === goodId);
    const dlg = document.getElementById("bargainDlg");
    document.getElementById("bargainTitle").textContent =
      side === "buy" ? `買入 · ${g.name}` : `賣出 · ${g.name}`;
    document.getElementById("bargainNpc").textContent = npcGreeting(city.temper, side);
    document.getElementById("bargainMeta").textContent =
      `牌價 ${list} 文／件 · 貨艙 ${cartUsed()}/${CART_SLOTS} · 現金 ${state.cash}`;
    const input = document.getElementById("bidInput");
    input.value = String(list);
    document.getElementById("bidAcceptCounter").hidden = true;
    document.getElementById("bidOffer").hidden = false;
    dlg.showModal();
  }

  function npcGreeting(temper, side) {
    if (temper === "greedy")
      return side === "buy"
        ? "牙人眯眼：「好貨唔平——你開個價嚟睇。」"
        : "牙人撇嘴：「出口貨淹脚——開價啦。」";
    if (temper === "impatient")
      return "牙人敲桌：「快啲，後面仲有車隊。」";
    return "牙人拱手：「慢慢講價，和氣生財。」";
  }

  function stepBid(delta) {
    const input = document.getElementById("bidInput");
    const v = Math.max(1, (parseInt(input.value, 10) || 1) + delta);
    input.value = String(v);
  }

  function offerBid() {
    if (!bargain) return;
    const bid = Math.max(1, parseInt(document.getElementById("bidInput").value, 10) || 1);
    const { side, fair, list } = bargain;
    const city = CITIES[state.city];
    const t = TEMPER[city.temper];

    let accept = false;
    if (side === "buy") {
      // player wants low buy price
      accept = bid >= fair || bid >= list * (t.soft ? 0.97 : 1.02);
    } else {
      // player wants high sell price
      accept = bid <= fair || bid <= list * (t.soft ? 1.03 : 0.98);
    }

    if (accept) {
      settleDeal(bid);
      return;
    }

    if (bargain.countersLeft > 0) {
      bargain.countersLeft -= 1;
      const counter =
        side === "buy"
          ? Math.round((fair + list) / 2)
          : Math.round((fair + list) / 2);
      bargain.counterPrice = counter;
      document.getElementById("bargainNpc").textContent =
        side === "buy"
          ? `牙人搖頭：「${bid} 太低。我還你 ${counter} 文，接唔接？」`
          : `牙人搖頭：「${bid} 太貴。我俾 ${counter} 文收，得唔得？」`;
      document.getElementById("bidInput").value = String(counter);
      document.getElementById("bidAcceptCounter").hidden = false;
      document.getElementById("bargainMeta").textContent =
        `還價剩餘機會：${bargain.countersLeft} · 牌價 ${list}`;
      return;
    }

    document.getElementById("bargainNpc").textContent =
      "牙人揮袖：「唔傾啦。下回再說。」";
    pushLog(`議價失敗（${GOODS.find((g) => g.id === bargain.goodId).name}）。`);
    bargain = null;
    setTimeout(() => document.getElementById("bargainDlg").close(), 700);
  }

  function acceptCounter() {
    if (!bargain || bargain.counterPrice == null) return;
    settleDeal(bargain.counterPrice);
  }

  function settleDeal(unitPrice) {
    const g = GOODS.find((x) => x.id === bargain.goodId);
    const side = bargain.side;
    if (side === "buy") {
      if (cartUsed() >= CART_SLOTS) {
        showEvent("貨艙已滿", "賣走啲貨先再買。");
        bargain = null;
        document.getElementById("bargainDlg").close();
        return;
      }
      if (state.cash < unitPrice) {
        showEvent("銀兩不足", `要 ${unitPrice} 文，你只有 ${state.cash}。`);
        bargain = null;
        document.getElementById("bargainDlg").close();
        return;
      }
      state.cash -= unitPrice;
      state.cargo[g.id] += 1;
      pushLog(`買入 ${g.name} ×1 @ ${unitPrice} 文（${CITIES[state.city].name}）`);
    } else {
      if ((state.cargo[g.id] || 0) < 1) {
        showEvent("沒有存貨", `你沒有 ${g.name}。`);
        bargain = null;
        document.getElementById("bargainDlg").close();
        return;
      }
      state.cargo[g.id] -= 1;
      state.cash += unitPrice;
      pushLog(`賣出 ${g.name} ×1 @ ${unitPrice} 文（${CITIES[state.city].name}）`);
    }
    bargain = null;
    document.getElementById("bargainDlg").close();
    checkWin();
    render();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  // --- Travel ---
  function travelTo(destId) {
    if (destId === state.city) return;
    const route = routeBetween(state.city, destId);
    if (!route) return;
    if (state.cash < route.cost) {
      showEvent("盤纏不夠", `此路需要 ${route.cost} 文路費。`);
      return;
    }
    if (state.stamina < route.stamina) {
      showEvent("體力不支", "先在鎮上歇息（上路頁可恢復）。");
      return;
    }
    const from = CITIES[state.city].name;
    state.cash -= route.cost;
    state.stamina -= route.stamina;
    state.day += route.days;
    state.city = destId;
    pushLog(`由 ${from} 赴 ${CITIES[destId].name}，耗 ${route.days} 日、${route.cost} 文。`);

    // road events (~40%)
    if (Math.random() < 0.4) {
      rollRoadEvent();
    } else {
      // light recover on safe road
      state.stamina = Math.min(100, state.stamina + 5);
    }
    checkWin();
    render();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function rollRoadEvent() {
    const roll = Math.random();
    if (roll < 0.45) {
      const tax = 30 + Math.floor(Math.random() * 40);
      const paid = Math.min(state.cash, tax);
      state.cash -= paid;
      pushLog(`遇關卡抽成，失 ${paid} 文。`);
      showEvent("綠林／關卡", `路上有人攔路抽成，你失了 ${paid} 文。`);
    } else if (roll < 0.75) {
      state.stamina = Math.min(100, state.stamina + 15);
      state.day += 0; // flavor
      pushLog("天朗氣清，車隊好走，體力回升。");
      showEvent("好天氣", "風和日麗，體力 +15。到站時精神多了。");
    } else {
      // lucky find — small cash
      const find = 20 + Math.floor(Math.random() * 50);
      state.cash += find;
      pushLog(`路旁拾得商人遺囊，得 ${find} 文。`);
      showEvent("意外之財", `你拾得遺囊，得 ${find} 文。`);
    }
  }

  function restInTown() {
    if (state.cash < 15) {
      showEvent("住不起店", "歇息需 15 文。");
      return;
    }
    state.cash -= 15;
    state.stamina = Math.min(100, state.stamina + 40);
    state.day += 1;
    pushLog("在客棧歇息，體力恢復。");
    render();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function showEvent(title, body) {
    document.getElementById("eventTitle").textContent = title;
    document.getElementById("eventBody").textContent = body;
    document.getElementById("eventDlg").showModal();
  }

  // --- Render ---
  function render() {
    const city = CITIES[state.city];
    const nw = netWorth();
    document.getElementById("stats").innerHTML =
      `<div><strong>${state.cash}</strong> 文現金</div>` +
      `<div>淨值 <strong>${nw}</strong>／目標 ${WIN_NET}</div>` +
      `<div>第 ${state.day} 日 · 體力 ${state.stamina} · 艙 ${cartUsed()}/${CART_SLOTS}</div>`;

    document.getElementById("locationHint").textContent =
      `你在 ${city.name} · 牙人脾氣：${temperLabel(city.temper)}`;

    // token + highlight
    const tok = document.getElementById("playerToken");
    tok.setAttribute("cx", city.token.x);
    tok.setAttribute("cy", city.token.y);
    document.querySelectorAll(".city-pad").forEach((el) => {
      el.classList.toggle("here", el.getAttribute("data-city") === state.city);
    });

    renderMarket();
    renderTravel();
    renderCart();
    renderLog();
  }

  function temperLabel(t) {
    return { fair: "平和", greedy: "貪心", impatient: "急躁" }[t] || t;
  }

  function renderMarket() {
    const el = document.getElementById("tab-market");
    let html = "";
    if (state.won) {
      html += `<div class="win-banner">已達標 · 可繼續經營</div>`;
    }
    html += `<div class="card"><h3>${CITIES[state.city].name} · 市集</h3>`;
    html += `<p class="meta">點「買／賣」進入議價（非即時成交）。</p>`;
    GOODS.forEach((g) => {
      const b = listBuy(state.city, g.id);
      const s = listSell(state.city, g.id);
      const have = state.cargo[g.id] || 0;
      html += `<div class="row">
        <div>
          <div class="goods-name">${g.icon} ${g.name} ${have ? `<span class="badge">持有 ${have}</span>` : ""}</div>
          <div class="prices"><span class="buy">買 ${b}</span> · <span class="sell">賣 ${s}</span></div>
        </div>
        <div class="actions">
          <button type="button" class="primary" data-buy="${g.id}">買</button>
          <button type="button" class="ghost" data-sell="${g.id}" ${have < 1 ? "disabled" : ""}>賣</button>
        </div>
      </div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
    el.querySelectorAll("[data-buy]").forEach((btn) =>
      btn.addEventListener("click", () => openBargain(btn.getAttribute("data-buy"), "buy"))
    );
    el.querySelectorAll("[data-sell]").forEach((btn) =>
      btn.addEventListener("click", () => openBargain(btn.getAttribute("data-sell"), "sell"))
    );
  }

  function renderTravel() {
    const el = document.getElementById("tab-travel");
    let html = `<div class="card"><h3>選擇去向</h3>`;
    neighbors(state.city).forEach((dest) => {
      const r = routeBetween(state.city, dest);
      const c = CITIES[dest];
      html += `<div class="row">
        <div>
          <div class="goods-name">→ ${c.name}</div>
          <div class="prices">${r.days} 日 · 路費 ${r.cost} 文 · 體力 −${r.stamina}</div>
        </div>
      </div>
      <button type="button" class="primary travel-btn" data-go="${dest}">啟程往 ${c.name}</button>`;
    });
    html += `</div>
      <div class="card">
        <h3>客棧歇息</h3>
        <p class="meta">花 15 文，過 1 日，體力 +40（上限 100）。</p>
        <button type="button" class="ghost travel-btn" id="btnRest">住店恢復</button>
      </div>`;
    el.innerHTML = html;
    el.querySelectorAll("[data-go]").forEach((btn) =>
      btn.addEventListener("click", () => travelTo(btn.getAttribute("data-go")))
    );
    document.getElementById("btnRest").addEventListener("click", restInTown);
  }

  function renderCart() {
    const el = document.getElementById("tab-cart");
    const val = cargoValueAt(state.city);
    let html = `<div class="card"><h3>貨艙 ${cartUsed()}/${CART_SLOTS}</h3>
      <p class="meta">若在本城清倉，貨物約值 <strong>${val}</strong> 文。</p>`;
    const any = GOODS.some((g) => state.cargo[g.id] > 0);
    if (!any) html += `<p class="meta">空空如也——去市集進貨吧。</p>`;
    GOODS.forEach((g) => {
      const q = state.cargo[g.id] || 0;
      if (!q) return;
      html += `<div class="row">
        <span class="goods-name">${g.icon} ${g.name} ×${q}</span>
        <span class="prices">本城可賣 ${listSell(state.city, g.id)}／件</span>
      </div>`;
    });
    html += `</div>
      <div class="card">
        <h3>怎麼賺？</h3>
        <p class="meta">河口鹽米茶較平 → 賣去青山／南浦。青山瓷器鐵器平 → 賣去河口。南浦香料平 → 賣入內陸。議價可比牌價更好或更差。</p>
      </div>`;
    el.innerHTML = html;
  }

  function renderLog() {
    const el = document.getElementById("tab-log");
    let html = `<div class="card"><h3>流水帳</h3>`;
    state.log.forEach((line) => {
      html += `<div class="log-line">${escapeHtml(line)}</div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // --- Tabs & boot ---
  function bindChrome() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
      });
    });
    document.getElementById("btnSave").addEventListener("click", save);
    document.getElementById("btnReset").addEventListener("click", () => {
      if (confirm("確定清除進度、重新開始？")) {
        state = freshState();
        localStorage.removeItem(SAVE_KEY);
        render();
      }
    });
    document.getElementById("bidMinus").addEventListener("click", () => stepBid(-5));
    document.getElementById("bidPlus").addEventListener("click", () => stepBid(5));
    document.getElementById("bidOffer").addEventListener("click", offerBid);
    document.getElementById("bidAcceptCounter").addEventListener("click", acceptCounter);
    document.getElementById("bargainDlg").addEventListener("close", () => {
      bargain = null;
    });
  }

  // Node / headless smoke check support
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    state = load();
    bindChrome();
    render();
  }

  // Export for verification
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { GOODS, CITIES, ROUTES, WIN_NET, freshState, listBuy: (c, g, st) => {
      // unused in node without full state
    }};
  }
})();
