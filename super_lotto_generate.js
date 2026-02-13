// =============================================================================
// 威力彩號碼產生器 — JavaScript 版
// 移植自 generate_tickets_super.py / monte_carlo.py
// =============================================================================

// 威力彩規則常數
const FIRST_AREA_RANGE = Array.from({ length: 38 }, (_, i) => i + 1); // 1~38
const SECOND_AREA_RANGE = Array.from({ length: 8 }, (_, i) => i + 1); // 1~8
const FIRST_AREA_PICK = 6;
const COST_PER_BET = 100;

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
    const shuffled = shuffle(arr);
    return shuffled.slice(0, n);
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

function strategy56Full(favorite = []) {
    const firstArea = shuffle(FIRST_AREA_RANGE);

    // 分成 7 組，前 6 組各 6 個，第 7 組剩 2 個 + 隨機補 4 個
    const groups = [];
    for (let i = 0; i < 6; i++) {
        groups.push(firstArea.slice(i * 6, (i + 1) * 6).sort((a, b) => a - b));
    }
    const lastGroupBase = firstArea.slice(36); // 剩 2 個

    // 建立加權補充池
    let pool = FIRST_AREA_RANGE.filter(n => !lastGroupBase.includes(n));
    pool = pool.concat(favorite.filter(n => !lastGroupBase.includes(n)));
    const supplement = sample(pool, 4);
    groups.push([...lastGroupBase, ...supplement].sort((a, b) => a - b));

    const tickets = [];
    for (const group of groups) {
        for (const sec of SECOND_AREA_RANGE) {
            tickets.push({ first: group, second: sec });
        }
    }
    return tickets; // 56 注
}

function strategy28(favorite = []) {
    const firstArea = shuffle(FIRST_AREA_RANGE);
    const secondArea = shuffle(SECOND_AREA_RANGE);

    // 前 18 個號碼分成 3 組
    const groupsA = [];
    for (let i = 0; i < 3; i++) {
        groupsA.push(firstArea.slice(i * 6, (i + 1) * 6).sort((a, b) => a - b));
    }

    // 後 20 個號碼分成 4 組
    const remaining = firstArea.slice(18);
    const groupsB = [];
    for (let i = 0; i < 3; i++) {
        groupsB.push(remaining.slice(i * 6, (i + 1) * 6).sort((a, b) => a - b));
    }
    const lastBase = remaining.slice(18); // 2 個

    // 建立加權補充池
    let pool = FIRST_AREA_RANGE.filter(n => !lastBase.includes(n));
    pool = pool.concat(favorite.filter(n => !lastBase.includes(n)));
    const supplement = sample(pool, 4);
    groupsB.push([...lastBase, ...supplement].sort((a, b) => a - b));

    const tickets = [];
    // 前 4 個第二區 × 3 組第一區
    for (const sec of secondArea.slice(0, 4)) {
        for (const group of groupsA) {
            tickets.push({ first: group, second: sec });
        }
    }
    // 後 4 個第二區 × 4 組第一區
    for (const sec of secondArea.slice(4)) {
        for (const group of groupsB) {
            tickets.push({ first: group, second: sec });
        }
    }
    return tickets; // 28 注
}

function strategy21(selectedFirst = [], selectedSecond = []) {
    let first = [...selectedFirst];
    if (first.length < 7) {
        const available = FIRST_AREA_RANGE.filter(n => !first.includes(n));
        first = first.concat(sample(available, 7 - first.length));
    }
    first.sort((a, b) => a - b);

    let second = [...selectedSecond];
    if (second.length < 3) {
        const available = SECOND_AREA_RANGE.filter(n => !second.includes(n));
        second = second.concat(sample(available, 3 - second.length));
    }
    second.sort((a, b) => a - b);

    const tickets = [];
    const combos = combinations(first, 6);
    for (const combo of combos) {
        for (const sec of second) {
            tickets.push({ first: combo.sort((a, b) => a - b), second: sec });
        }
    }
    return tickets; // 21 注
}

function strategy8SecondFull(selectedFirst = []) {
    let first = [...selectedFirst];
    if (first.length < FIRST_AREA_PICK) {
        const available = FIRST_AREA_RANGE.filter(n => !first.includes(n));
        first = first.concat(sample(available, FIRST_AREA_PICK - first.length));
    }
    first = first.slice(0, FIRST_AREA_PICK).sort((a, b) => a - b);

    const tickets = [];
    for (const sec of SECOND_AREA_RANGE) {
        tickets.push({ first: [...first], second: sec });
    }
    return tickets; // 8 注
}

function strategy8BothFull(favorite = []) {
    const firstArea = shuffle(FIRST_AREA_RANGE);

    // 前 6 注：每注 6 碼，覆蓋 36 碼
    const groups = [];
    for (let i = 0; i < 6; i++) {
        groups.push(firstArea.slice(i * 6, (i + 1) * 6).sort((a, b) => a - b));
    }

    // 剩餘 2 碼
    const leftover = firstArea.slice(36);

    // 第 7 注：2 碼 + 從已覆蓋 36 碼中用 favorite 加權補 4 碼
    const pool7 = [...firstArea.slice(0, 36)];
    pool7.push(...favorite.filter(n => firstArea.slice(0, 36).includes(n)));
    const fill4 = sample(pool7, 4);
    groups.push([...leftover, ...fill4].sort((a, b) => a - b));

    // 第 8 注：從全部 38 碼中用 favorite 加權選 6 碼
    const pool8 = [...FIRST_AREA_RANGE];
    pool8.push(...favorite.filter(n => FIRST_AREA_RANGE.includes(n)));
    const fill6 = sample(pool8, 6);
    groups.push(fill6.sort((a, b) => a - b));

    // 8 組搭配第二區 1~8
    const secondOrder = shuffle(SECOND_AREA_RANGE);
    const tickets = [];
    for (let i = 0; i < 8; i++) {
        tickets.push({ first: groups[i], second: secondOrder[i] });
    }
    return tickets; // 8 注
}

function strategy8FirstSpread(favorite = [], hot = [], cold = []) {
    // 建立加權號碼池
    let numbers = [...FIRST_AREA_RANGE, ...favorite, ...hot, ...cold];

    const secondOrder = shuffle(SECOND_AREA_RANGE);
    const tickets = [];

    for (let i = 0; i < 8; i++) {
        const first = [];
        const temp = [...numbers];
        while (first.length < 6 && temp.length > 0) {
            const idx = Math.floor(Math.random() * temp.length);
            const num = temp.splice(idx, 1)[0];
            if (!first.includes(num)) {
                first.push(num);
                const numIdx = numbers.indexOf(num);
                if (numIdx !== -1) numbers.splice(numIdx, 1);
            }
        }
        first.sort((a, b) => a - b);
        tickets.push({ first, second: secondOrder[i] });
    }
    return tickets; // 8 注
}

// =============================================================================
// 格式化輸出
// =============================================================================
function formatTicketsGrouped(tickets) {
    // 依第一區分組
    const groups = new Map();
    for (const t of tickets) {
        const key = t.first.join(',');
        if (!groups.has(key)) groups.set(key, { first: t.first, seconds: [] });
        groups.get(key).seconds.push(t.second);
    }

    let lines = [];
    let i = 1;
    for (const [, g] of groups) {
        lines.push(`第一區組合 ${i}: [${g.first.join(', ')}]`);
        lines.push(`  搭配第二區號碼: [${g.seconds.sort((a, b) => a - b).join(', ')}]`);
        lines.push('');
        i++;
    }
    return lines.join('\n');
}

function formatTicketsPython(tickets) {
    const groups = new Map();
    for (const t of tickets) {
        const key = t.first.join(',');
        if (!groups.has(key)) groups.set(key, { first: t.first, seconds: [] });
        groups.get(key).seconds.push(t.second);
    }

    let lines = ['ticket_groups = ['];
    for (const [, g] of groups) {
        const secs = g.seconds.sort((a, b) => a - b);
        lines.push(`    ([${g.first.join(', ')}], [${secs.join(', ')}]),`);
    }
    lines.push(']');
    return lines.join('\n');
}

// =============================================================================
// 主要產生函式
// =============================================================================
function generateTickets(strategyName, options = {}) {
    const { favorite = [], hot = [], cold = [], selectedFirst = [], selectedSecond = [] } = options;

    let tickets;
    switch (strategyName) {
        case '56注全包':
            tickets = strategy56Full(favorite);
            break;
        case '28注(必中九獎)':
            tickets = strategy28(favorite);
            break;
        case '21注(7組碰)':
            tickets = strategy21(selectedFirst, selectedSecond);
            break;
        case '8注(第二區全包)':
            tickets = strategy8SecondFull(selectedFirst);
            break;
        case '8注(雙區全覆蓋)':
            tickets = strategy8BothFull(favorite);
            break;
        case '8注(第一區展開)':
            tickets = strategy8FirstSpread(
                favorite.length ? favorite : undefined,
                hot.length ? hot : undefined,
                cold.length ? cold : undefined
            );
            break;
        default:
            throw new Error(`未知策略: ${strategyName}`);
    }

    return {
        tickets,
        textFormat: formatTicketsGrouped(tickets),
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
