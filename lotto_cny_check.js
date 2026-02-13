// =============================================================================
// 大紅包小紅包對獎程式 — JavaScript 版
// 移植自 monte_carlo_lotto_cny_special.py
// =============================================================================

// 春節加碼規則常數
const CNY_PICK_COUNT = 6;
const CNY_COST_PER_BET = 50;
const PRIZE_BIG_RED = 1_000_000;    // 大紅包 100 萬
const PRIZE_SMALL_RED = 100_000;    // 小紅包 10 萬

// =============================================================================
// 解析文字格式的投注資料
// =============================================================================
function parseCnyTicketText(text) {
    const tickets = [];
    const regex = /\[([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const nums = match[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        if (nums.length === 6) {
            tickets.push(nums);
        }
    }
    return tickets;
}

// =============================================================================
// 解析大紅包開獎號碼
// =============================================================================
function parseBigRedGroups(text) {
    // 每組 9 個號碼，用 [...] 格式
    const groups = [];
    const regex = /\[([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const nums = match[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        if (nums.length === 9) {
            groups.push(new Set(nums));
        }
    }
    return groups;
}

// =============================================================================
// 解析小紅包開獎號碼
// =============================================================================
function parseSmallRedNums(text) {
    // 每組 1 個號碼，逗號或空格分隔，或 [...] 格式
    const bracketMatch = text.match(/\[([^\]]+)\]/);
    if (bracketMatch) {
        return bracketMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    }
    return text.split(/[,，\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

// =============================================================================
// 對獎
// =============================================================================
function checkCnyPrizes(bigRedGroups, smallRedNums, tickets) {
    // bigRedGroups: array of Set (每組 9 個大紅包號碼)
    // smallRedNums: array of number (每組 1 個小紅包號碼，與 bigRedGroups 一一對應)
    // tickets: array of array (每注 6 個號碼)

    const results = [];
    let totalPrize = 0;
    let bigRedCount = 0;
    let smallRedCount = 0;

    for (let t = 0; t < tickets.length; t++) {
        const ticket = tickets[t];
        const ticketSet = new Set(ticket);
        const ticketResults = [];

        // 對每組大紅包
        for (let g = 0; g < bigRedGroups.length; g++) {
            const bigRedSet = bigRedGroups[g];
            const matchBig = [...ticketSet].filter(n => bigRedSet.has(n));

            // 大紅包：6 碼全在 9 個大紅包號碼中
            if (matchBig.length === 6) {
                ticketResults.push({
                    type: '大紅包',
                    group: g + 1,
                    matchNums: matchBig,
                    prize: PRIZE_BIG_RED,
                });
                totalPrize += PRIZE_BIG_RED;
                bigRedCount++;
            }

            // 小紅包：5 碼在大紅包號碼 + 1 碼是小紅包號碼
            if (g < smallRedNums.length) {
                const smallRedNum = smallRedNums[g];
                const matchSmall = ticketSet.has(smallRedNum) ? 1 : 0;
                if (matchBig.length === 5 && matchSmall === 1) {
                    ticketResults.push({
                        type: '小紅包',
                        group: g + 1,
                        matchNums: [...matchBig, smallRedNum],
                        prize: PRIZE_SMALL_RED,
                    });
                    totalPrize += PRIZE_SMALL_RED;
                    smallRedCount++;
                }
            }
        }

        results.push({
            index: t + 1,
            numbers: ticket,
            wins: ticketResults,
            isWin: ticketResults.length > 0,
            ticketPrize: ticketResults.reduce((sum, w) => sum + w.prize, 0),
        });
    }

    const nBets = tickets.length;
    const cost = nBets * CNY_COST_PER_BET;

    return {
        results,
        totalPrize,
        cost,
        profit: totalPrize - cost,
        nBets,
        winCount: results.filter(r => r.isWin).length,
        bigRedCount,
        smallRedCount,
    };
}

// =============================================================================
// 格式化結果為 HTML
// =============================================================================
function formatCnyCheckHTML(checkResult) {
    const { results, totalPrize, cost, profit, nBets, winCount, bigRedCount, smallRedCount } = checkResult;

    let html = '';

    // 逐注結果
    html += '<div class="result-box mt-4">';
    for (const r of results) {
        const cls = r.isWin ? 'prize-hit' : 'prize-miss';
        html += `<div class="${cls}">`;
        html += `第${String(r.index).padStart(3, ' ')}注: [${r.numbers.join(', ')}]`;

        if (r.isWin) {
            for (const w of r.wins) {
                const emoji = w.type === '大紅包' ? '🧧' : '🎁';
                html += ` → ${emoji} ${w.type}（第${w.group}組）${w.prize.toLocaleString()}元`;
            }
        } else {
            html += ` → 未中獎`;
        }
        html += '</div>';
    }
    html += '</div>';

    // 統計
    html += '<div class="card mt-4">';
    html += `<div class="text-lg font-bold text-white mb-3">統計結果</div>`;
    html += '<table class="stats-table">';
    html += `<tr><td class="text-slate-400">投注注數</td><td class="text-white font-bold">${nBets} 注</td></tr>`;
    html += `<tr><td class="text-slate-400">中獎注數</td><td class="text-yellow-400 font-bold">${winCount} / ${nBets} 注</td></tr>`;

    if (bigRedCount > 0 || smallRedCount > 0) {
        html += `<tr><td class="text-slate-400" colspan="2" style="padding-top:0.75rem"><strong>各獎項統計</strong></td></tr>`;
        if (bigRedCount > 0) {
            html += `<tr><td class="text-slate-400 pl-4">🧧 大紅包</td><td class="text-red-400 font-bold">${bigRedCount} 注 × ${PRIZE_BIG_RED.toLocaleString()}元</td></tr>`;
        }
        if (smallRedCount > 0) {
            html += `<tr><td class="text-slate-400 pl-4">🎁 小紅包</td><td class="text-orange-400 font-bold">${smallRedCount} 注 × ${PRIZE_SMALL_RED.toLocaleString()}元</td></tr>`;
        }
    }

    const sign = profit >= 0 ? '+' : '';
    const profitColor = profit >= 0 ? 'text-green-400' : 'text-red-400';
    html += `<tr><td class="text-slate-400" style="padding-top:0.75rem">總獎金</td><td class="text-yellow-400 font-bold" style="padding-top:0.75rem">${totalPrize.toLocaleString()} 元</td></tr>`;
    html += `<tr><td class="text-slate-400">總成本</td><td class="text-white">${cost.toLocaleString()} 元</td></tr>`;
    html += `<tr><td class="text-slate-400">損益（僅加碼獎項）</td><td class="${profitColor} font-bold">${sign}${profit.toLocaleString()} 元</td></tr>`;
    html += '</table>';
    html += '<div class="text-slate-500 text-xs mt-2">※ 此處僅計算大紅包/小紅包加碼獎項，一般大樂透獎項請使用大樂透對獎程式</div>';
    html += '</div>';

    return html;
}

// 解析數字輸入
function parseNumbers(str) {
    if (!str || !str.trim()) return [];
    return str.split(/[,，\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}
