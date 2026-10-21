/**
 * 商途 Merchant Road — v0.2
 * Original homage. No official IP assets.
 */
(function () {
  "use strict";

  const SAVE_KEY = "merchant-road-v02";
  const SAVE_LEGACY = "merchant-road-v01";
  const WIN_NET = 5000;
  const START_CASH = 800;
  const START_HP = 100;
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

  const CITIES = {
    hekou: {
      id: "hekou",
      name: "河口鎮",
      temper: "fair",
      token: { x: 95, y: 145 },
      buy:  { salt: 0.85, rice: 0.90, cloth: 1.05, tea: 0.88, porcelain: 1.25, spice: 1.30, iron: 1.15 },
      sell: { salt: 0.70, rice: 0.75, cloth: 0.95, tea: 0.80, porcelain: 1.10, spice: 1.15, iron: 1.00 },
    },
    qingshan: {
      id: "qingshan",
      name: "青山驛",
      temper: "impatient",
      token: { x: 235, y: 68 },
      buy:  { salt: 1.20, rice: 1.10, cloth: 0.92, tea: 1.15, porcelain: 0.82, spice: 1.35, iron: 0.88 },
      sell: { salt: 1.05, rice: 0.95, cloth: 0.80, tea: 1.00, porcelain: 0.70, spice: 1.20, iron: 0.75 },
    },
    nanpu: {
      id: "nanpu",
      name: "南浦港",
      temper: "greedy",
      token: { x: 310, y: 152 },
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

  const NPC_COLORS = {
    fair: "#3a8ea8",
    greedy: "#c45c26",
    impatient: "#3d7a4a",
  };

  /** @type {any} */
  let state;
  /** @type {any} */
  let bargain = null;
  /** @type {any} */
  let bandit = null;

  function freshState() {
    return {
      cash: START_CASH,
      day: 1,
      stamina: 100,
      hp: START_HP,
      city: "hekou",
      cargo: Object.fromEntries(GOODS.map((g) => [g.id, 0])),
      log: ["第 1 日：你在河口鎮接下小車，開始商途。"],
      won: false,
      fightsWon: 0,
    };
  }

  function migrate(s) {
    if (typeof s.hp !== "number") s.hp = START_HP;
    if (typeof s.fightsWon !== "number") s.fightsWon = 0;
    if (!s.cargo) s.cargo = Object.fromEntries(GOODS.map((g) => [g.id, 0]));
    return s;
  }

  function load() {
    try {
      let raw = localStorage.getItem(SAVE_KEY);
      if (!raw) raw = localStorage.getItem(SAVE_LEGACY);
      if (!raw) return freshState();
      const s = JSON.parse(raw);
      if (!s || typeof s.cash !== "number") return freshState();
      return migrate(s);
    } catch {
      return freshState();
    }
  }

  function persistQuiet() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function save() {
    persistQuiet();
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

  function paintNpcPortrait(temper) {
    const svg = document.querySelector("#npcPortrait svg circle");
    if (svg) svg.setAttribute("fill", NPC_COLORS[temper] || "#3a8ea8");
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
      list,
      fair: Math.round(fair),
      countersLeft: t.counters,
      soft: t.soft,
      counterPrice: null,
      temper: city.temper,
    };
    const g = GOODS.find((x) => x.id === goodId);
    paintNpcPortrait(city.temper);
    document.getElementById("bargainTitle").textContent =
      side === "buy" ? `買入 · ${g.name}` : `賣出 · ${g.name}`;
    document.getElementById("bargainNpc").textContent = npcGreeting(city.temper, side);
    document.getElementById("bargainMeta").textContent =
      `牌價 ${list} 文／件 · 貨艙 ${cartUsed()}/${CART_SLOTS} · 現金 ${state.cash}`;
    document.getElementById("bidInput").value = String(list);
    document.getElementById("bidAcceptCounter").hidden = true;
    document.getElementById("bidOffer").hidden = false;
    document.getElementById("bargainDlg").showModal();
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
      accept = bid >= fair || bid >= list * (t.soft ? 0.97 : 1.02);
    } else {
      accept = bid <= fair || bid <= list * (t.soft ? 1.03 : 0.98);
    }

    if (accept) {
      settleDeal(bid);
      return;
    }

    if (bargain.countersLeft > 0) {
      bargain.countersLeft -= 1;
      const counter = Math.round((fair + list) / 2);
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
    persistQuiet();
  }

  // --- Travel + bandit ---
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
    if (state.hp < 15) {
      showEvent("傷勢過重", "先住店養傷（恢復體力時一併回血）。");
      return;
    }
    const from = CITIES[state.city].name;
    state.cash -= route.cost;
    state.stamina -= route.stamina;
    state.day += route.days;
    state.city = destId;
    pushLog(`由 ${from} 赴 ${CITIES[destId].name}，耗 ${route.days} 日、${route.cost} 文。`);

    const roll = Math.random();
    if (roll < 0.32) {
      openBandit();
    } else if (roll < 0.55) {
      const tax = 25 + Math.floor(Math.random() * 35);
      const paid = Math.min(state.cash, tax);
      state.cash -= paid;
      pushLog(`遇關卡抽成，失 ${paid} 文。`);
      showEvent("關卡抽成", `路上有人攔路抽成，你失了 ${paid} 文。`);
      finishTravel();
    } else if (roll < 0.78) {
      state.stamina = Math.min(100, state.stamina + 15);
      pushLog("天朗氣清，車隊好走，體力回升。");
      showEvent("好天氣", "風和日麗，體力 +15。");
      finishTravel();
    } else {
      const find = 20 + Math.floor(Math.random() * 50);
      state.cash += find;
      pushLog(`路旁拾得商人遺囊，得 ${find} 文。`);
      showEvent("意外之財", `你拾得遺囊，得 ${find} 文。`);
      finishTravel();
    }
  }

  function finishTravel() {
    checkWin();
    render();
    persistQuiet();
  }

  function openBandit() {
    const toll = 40 + Math.floor(Math.random() * 50);
    const bHp = 28 + Math.floor(Math.random() * 18);
    bandit = {
      toll,
      banditHp: bHp,
      banditMax: bHp,
      playerHp: state.hp,
      resolved: false,
    };
    document.getElementById("banditTitle").textContent = "綠林響馬";
    document.getElementById("banditBody").textContent =
      `一夥響馬擋路，刀光一晃：「留下 ${toll} 文過路費——定係試吓刀？」`;
    document.getElementById("banditHpRow").hidden = true;
    document.getElementById("banditActions").hidden = false;
    document.getElementById("banditContinue").hidden = true;
    document.getElementById("banditDlg").showModal();
  }

  function updateBanditHpUi() {
    document.getElementById("banditHpRow").hidden = false;
    document.getElementById("playerHpLabel").textContent = `${bandit.playerHp} 血`;
    document.getElementById("banditHpLabel").textContent = `${bandit.banditHp} 血`;
  }

  function resolveBanditEnd(msg, logMsg) {
    bandit.resolved = true;
    state.hp = Math.max(1, Math.min(START_HP, bandit.playerHp));
    document.getElementById("banditBody").textContent = msg;
    document.getElementById("banditActions").hidden = true;
    document.getElementById("banditContinue").hidden = false;
    pushLog(logMsg);
  }

  function banditFight() {
    if (!bandit || bandit.resolved) return;
    // player strike
    const pHit = 8 + Math.floor(Math.random() * 12);
    bandit.banditHp -= pHit;
    let narrative = `你揮棍砸中響馬，造成 ${pHit} 傷！`;

    if (bandit.banditHp <= 0) {
      const loot = 30 + Math.floor(Math.random() * 60);
      state.cash += loot;
      state.fightsWon += 1;
      state.stamina = Math.max(0, state.stamina - 8);
      updateBanditHpUi();
      resolveBanditEnd(
        `響馬敗走！你搜得 ${loot} 文。體力 −8。`,
        `擊退響馬，得 ${loot} 文。`
      );
      return;
    }

    // bandit strike
    const bHit = 6 + Math.floor(Math.random() * 10);
    bandit.playerHp -= bHit;
    narrative += ` 對方回砍，你失 ${bHit} 血。`;
    updateBanditHpUi();
    document.getElementById("banditBody").textContent = narrative;

    if (bandit.playerHp <= 0) {
      bandit.playerHp = 1;
      const loss = Math.min(state.cash, Math.floor(state.cash * 0.25) + 20);
      state.cash -= loss;
      state.stamina = Math.max(0, state.stamina - 20);
      resolveBanditEnd(
        `你負傷倒地，響馬搶走 ${loss} 文後散去。重傷！`,
        `敗於響馬，失 ${loss} 文。`
      );
    }
  }

  function banditPay() {
    if (!bandit || bandit.resolved) return;
    const paid = Math.min(state.cash, bandit.toll);
    state.cash -= paid;
    resolveBanditEnd(
      `你咬牙交出 ${paid} 文。響馬嘿嘿一笑，讓路。`,
      `交過路費 ${paid} 文。`
    );
    document.getElementById("banditHpRow").hidden = true;
  }

  function banditFlee() {
    if (!bandit || bandit.resolved) return;
    const ok = Math.random() < 0.55;
    state.stamina = Math.max(0, state.stamina - 15);
    if (ok) {
      resolveBanditEnd(
        "你拋下幾袋空穀袋迷惑對方，僥倖逃脫。體力 −15。",
        "落荒逃脫響馬。"
      );
    } else {
      const loss = Math.min(state.cash, 35 + Math.floor(Math.random() * 40));
      state.cash -= loss;
      bandit.playerHp = Math.max(1, bandit.playerHp - 10);
      resolveBanditEnd(
        `逃唔甩！被追上搶走 ${loss} 文，還挨了一刀。體力 −15。`,
        `逃失敗，失 ${loss} 文。`
      );
    }
    document.getElementById("banditHpRow").hidden = true;
  }

  function closeBandit() {
    document.getElementById("banditDlg").close();
    bandit = null;
    finishTravel();
  }

  function restInTown() {
    if (state.cash < 15) {
      showEvent("住不起店", "歇息需 15 文。");
      return;
    }
    state.cash -= 15;
    state.stamina = Math.min(100, state.stamina + 40);
    state.hp = Math.min(START_HP, state.hp + 25);
    state.day += 1;
    pushLog("在客棧歇息，體力與氣血恢復。");
    render();
    persistQuiet();
  }

  function showEvent(title, body) {
    document.getElementById("eventTitle").textContent = title;
    document.getElementById("eventBody").textContent = body;
    document.getElementById("eventDlg").showModal();
  }

  // --- Render ---
  function moveCart() {
    const city = CITIES[state.city];
    const cart = document.getElementById("playerCart");
    if (cart) {
      cart.setAttribute("transform", `translate(${city.token.x},${city.token.y})`);
    }
    document.querySelectorAll(".city-pad").forEach((el) => {
      el.classList.toggle("here", el.getAttribute("data-city") === state.city);
    });
  }

  function render() {
    const city = CITIES[state.city];
    const nw = netWorth();
    document.getElementById("stats").innerHTML =
      `<div><strong>${state.cash}</strong> 文</div>` +
      `<div>淨值 <strong>${nw}</strong>／${WIN_NET}</div>` +
      `<div>D${state.day} · 力 ${state.stamina} · <span class="hp-pill">血 ${state.hp}</span> · 艙 ${cartUsed()}/${CART_SLOTS}</div>`;

    document.getElementById("locationHint").textContent =
      `你在 ${city.name} · 牙人：${temperLabel(city.temper)}` +
      (state.fightsWon ? ` · 退匪 ${state.fightsWon} 次` : "");

    moveCart();
    renderMarket();
    renderTravel();
    renderCart();
    renderMore();
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
          <div class="goods-name"><span class="goods-ico">${g.icon}</span> ${g.name} ${have ? `<span class="badge">×${have}</span>` : ""}</div>
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
    let html = `<div class="card"><h3>選擇去向</h3>
      <p class="meta">上路或會遇響馬——可硬拼／交錢／逃跑。</p>`;
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
        <p class="meta">花 15 文，過 1 日，體力 +40、氣血 +25。</p>
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
        <span class="goods-name"><span class="goods-ico">${g.icon}</span> ${g.name} ×${q}</span>
        <span class="prices">本城可賣 ${listSell(state.city, g.id)}／件</span>
      </div>`;
    });
    html += `</div>
      <div class="card">
        <h3>怎麼賺？</h3>
        <p class="meta">河口鹽米茶較平 → 賣去青山／南浦。青山瓷器鐵器平 → 賣去河口。南浦香料平 → 賣入內陸。</p>
      </div>`;
    el.innerHTML = html;
  }

  function renderMore() {
    const el = document.getElementById("tab-more");
    let html = `<div class="card"><h3>流水帳</h3>`;
    state.log.slice(0, 12).forEach((line) => {
      html += `<div class="log-line">${escapeHtml(line)}</div>`;
    });
    html += `</div>`;

    html += `<div class="card stub">
      <h3>僱傭傭兵 <span class="soon">即將推出</span></h3>
      <p class="meta">請護衛同行，降低響馬機率、提高硬拚勝率。下一切片會加入。</p>
    </div>`;
    html += `<div class="card stub">
      <h3>投城／勢力 <span class="soon">即將推出</span></h3>
      <p class="meta">累積聲望、影響城門開關——長線系統，非本季範圍。</p>
    </div>`;
    html += `<div class="card stub">
      <h3>完整戰鬥 <span class="soon">即將推出</span></h3>
      <p class="meta">而家只有路上響馬輕量骰子戰。完整打怪與裝備之後再加。</p>
    </div>`;
    html += `<div class="card">
      <h3>關於商途</h3>
      <p class="meta">原創絲路經商致敬小品 · v0.2 圖形升級 + 響馬遭遇。<br/>非巨商 Online／任何官方 IP。完整功能對等＝多年項目；我哋按切片出。</p>
    </div>`;
    el.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

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
        localStorage.removeItem(SAVE_LEGACY);
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
    document.getElementById("btnFight").addEventListener("click", banditFight);
    document.getElementById("btnPay").addEventListener("click", banditPay);
    document.getElementById("btnFlee").addEventListener("click", banditFlee);
    document.getElementById("btnBanditOk").addEventListener("click", closeBandit);
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    state = load();
    bindChrome();
    render();
  }
})();
