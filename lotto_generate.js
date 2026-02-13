// =============================================================================
// 大樂透號碼產生器 — JavaScript 版
// 移植自 generate_tickets_lotto.py / monte_carlo_lotto_cny_special.py
// =============================================================================

// 大樂透規則常數
const NUMBER_RANGE = Array.from({ length: 49 }, (_, i) => i + 1); // 1~49
const PICK_COUNT = 6;
const COST_PER_BET = 50;

// =============================================================================
// 工具函式
// =============================================================================
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function sample(arr, n) {
    return shuffle(arr).slice(0, n);
}

function combinations(arr, k) {
    const result = [];
    function helper(start, combo) {
        if (combo.length === k) {
            result.push([...combo]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            helper(i + 1, combo);
            combo.pop();
        }
    }
    helper(0, []);
    return result;
}

// =============================================================================
// 策略產生器
// =============================================================================

function strategyFullCover(favorite = []) {
    // 包牌9注：49 號碼隨機打散，分成 9 注
    const allNumbers = shuffle(NUMBER_RANGE);
    const tickets = [];

    // 前 8 注，每注 6 個
    for (let i = 0; i < 8; i++) {
        tickets.push(allNumbers.slice(i * 6, (i + 1) * 6).sort((a, b) => a - b));
    }

    // 第 9 注：剩餘 1 個號碼 + 從 favorite 補 5 個
    const lastNumber = allNumbers[48];
    const selected = [lastNumber];

    for (const n of favorite) {
        if (!selected.includes(n) && n >= 1 && n <= 49) {
            selected.push(n);
        }
        if (selected.length >= PICK_COUNT) break;
    }

    // favorite 不夠的話從 1~49 隨機補
    if (selected.length < PICK_COUNT) {
        const available = NUMBER_RANGE.filter(n => !selected.includes(n));
        selected.push(...sample(available, PICK_COUNT - selected.length));
    }

    tickets.push(selected.sort((a, b) => a - b));
    return tickets; // 9 注
}

function strategyNGroup(nNumbers = 7, nGroups = 1, favorite = []) {
    // N 組碰：從 favorite 池中每組取 nNumbers 個做 C(nNumbers, 6)
    let pool = favorite.filter(n => n >= 1 && n <= 49);

    // pool 不足時從 1~49 補足
    if (pool.length < nNumbers) {
        const available = NUMBER_RANGE.filter(n => !pool.includes(n));
        pool = pool.concat(sample(available, nNumbers - pool.length));
    }

    const allTickets = [];
    for (let g = 0; g < nGroups; g++) {
        const selected = sample(pool, nNumbers).sort((a, b) => a - b);
        const combos = combinations(selected, PICK_COUNT);
        for (const combo of combos) {
            allTickets.push(combo.sort((a, b) => a - b));
        }
    }
    return allTickets;
}

function strategyWeightedRandom(nBets = 9, favorite = [], hot = [], cold = []) {
    // 加權隨機：從加權池中隨機抽取多組號碼
    const pool = [...NUMBER_RANGE, ...favorite, ...hot, ...cold];

    const tickets = [];
    for (let b = 0; b < nBets; b++) {
        const selected = [];
        const temp = [...pool];
        while (selected.length < PICK_COUNT && temp.length > 0) {
            const idx = Math.floor(Math.random() * temp.length);
            const num = temp.splice(idx, 1)[0];
            if (!selected.includes(num)) {
                selected.push(num);
            }
        }
        tickets.push(selected.sort((a, b) => a - b));
    }
    return tickets;
}

function strategyFixedSubset(locked, mode = 'sequential') {
    // 鎖定號碼子集全覆蓋
    const lockedSet = new Set(locked);
    const remaining = NUMBER_RANGE.filter(n => !lockedSet.has(n));

    // 產生所有非空子集
    const subsets = [];
    for (let r = 1; r <= locked.length; r++) {
        const combos = combinations(locked, r);
        for (const combo of combos) {
            subsets.push(combo);
        }
    }

    const tickets = [];
    const covered = new Set(locked);

    if (mode === 'sequential') {
        const fillPool = shuffle(remaining);
        let fillIdx = 0;

        for (const subset of subsets) {
            const need = PICK_COUNT - subset.length;
            const fillNums = fillPool.slice(fillIdx, fillIdx + need);
            fillIdx += need;
            const ticket = [...subset, ...fillNums].sort((a, b) => a - b);
            tickets.push(ticket);
            ticket.forEach(n => covered.add(n));
        }
    } else {
        // random
        for (const subset of subsets) {
            const need = PICK_COUNT - subset.length;
            const fillNums = sample(remaining, need);
            const ticket = [...subset, ...fillNums].sort((a, b) => a - b);
            tickets.push(ticket);
            ticket.forEach(n => covered.add(n));
        }
    }

    // 補足未覆蓋的號碼
    let uncovered = shuffle(NUMBER_RANGE.filter(n => !covered.has(n)));
    while (uncovered.length > 0) {
        if (uncovered.length >= PICK_COUNT) {
            tickets.push(uncovered.slice(0, PICK_COUNT).sort((a, b) => a - b));
            uncovered = uncovered.slice(PICK_COUNT);
        } else {
            const ticket = [...uncovered];
            const available = NUMBER_RANGE.filter(n => !lockedSet.has(n) && !ticket.includes(n));
            ticket.push(...sample(available, PICK_COUNT - ticket.length));
            tickets.push(ticket.sort((a, b) => a - b));
            uncovered = [];
        }
    }

    return tickets;
}

// =============================================================================
// 格式化輸出
// =============================================================================
function formatTicketsList(tickets) {
    return tickets.map((t, i) =>
        `注 ${String(i + 1).padStart(3, ' ')}: [${t.join(', ')}]`
    ).join('\n');
}

function formatTicketsPython(tickets) {
    let lines = ['tickets = ['];
    for (const t of tickets) {
        lines.push(`    [${t.join(', ')}],`);
    }
    lines.push(']');
    return lines.join('\n');
}

// =============================================================================
// 主要產生函式
// =============================================================================
function generateLottoTickets(strategyName, options = {}) {
    const { favorite = [], hot = [], cold = [], locked = [10, 1, 3],
            nNumbers = 7, nGroups = 1, nBets = 9 } = options;

    let tickets;
    switch (strategyName) {
        case '包牌9注':
            tickets = strategyFullCover(favorite);
            break;
        case '加權隨機9注':
            tickets = strategyWeightedRandom(nBets, favorite, hot, cold);
            break;
        case '7碰1組(7注)':
            tickets = strategyNGroup(nNumbers, 1, favorite);
            break;
        case '7碰3組(21注)':
            tickets = strategyNGroup(nNumbers, 3, favorite);
            break;
        case '鎖碼子集+依序補':
            tickets = strategyFixedSubset(locked, 'sequential');
            break;
        case '鎖碼子集+隨機補':
            tickets = strategyFixedSubset(locked, 'random');
            break;
        default:
            throw new Error(`未知策略: ${strategyName}`);
    }

    return {
        tickets,
        textFormat: formatTicketsList(tickets),
        pythonFormat: formatTicketsPython(tickets),
        nBets: tickets.length,
        cost: tickets.length * COST_PER_BET,
    };
}

// 解析數字輸入（逗號或空格分隔）
function parseNumbers(str) {
    if (!str || !str.trim()) return [];
    return str.split(/[,，\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}
