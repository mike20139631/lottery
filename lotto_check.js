// =============================================================================
// 大樂透對獎程式 — JavaScript 版
// 移植自 monte_carlo_lotto.py
// =============================================================================

// 獎金表 (中幾碼, 是否中特別號) => { name, prize }
// prize: null 表示浮動獎金
const LOTTO_PRIZE_TABLE = {
    '6,0': { name: '頭獎', prize: null },
    '5,1': { name: '貳獎', prize: null },
    '5,0': { name: '參獎', prize: null },
    '4,1': { name: '肆獎', prize: null },
    '4,0': { name: '伍獎', prize: 2000 },
    '3,1': { name: '陸獎', prize: 1000 },
    '2,1': { name: '柒獎', prize: 400 },
    '3,0': { name: '普獎', prize: 400 },
};

const LOTTO_COST_PER_BET = 50;

// =============================================================================
// 解析文字格式的投注資料
// =============================================================================
function parseLottoTicketText(text) {
    // 支援兩種格式：
    // 1. tickets = [ [1,2,3,4,5,6], ... ]  (Python 格式)
    // 2. 注 1: [1, 2, 3, 4, 5, 6]          (文字格式)
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
// 對獎
// =============================================================================
function checkLotto(winningNums, specialNum, tickets, jackpot1st = 0, prize2nd = 0, prize3rd = 0, prize4th = 0) {
    const winSet = new Set(winningNums);
    const results = [];
    let totalPrize = 0;
    const prizeCount = {};

    for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const ticketSet = new Set(ticket);
        const matchNums = [...ticketSet].filter(n => winSet.has(n));
        const matchCount = matchNums.length;
        const matchSpecial = ticketSet.has(specialNum) ? 1 : 0;

        const key = `${matchCount},${matchSpecial}`;
        let prize = 0;
        let prizeName = '未中獎';

        if (LOTTO_PRIZE_TABLE[key]) {
            prizeName = LOTTO_PRIZE_TABLE[key].name;
            if (key === '6,0') {
                prize = jackpot1st;
            } else if (key === '5,1') {
                prize = prize2nd;
            } else if (key === '5,0') {
                prize = prize3rd;
            } else if (key === '4,1') {
                prize = prize4th;
            } else {
                prize = LOTTO_PRIZE_TABLE[key].prize;
            }
            totalPrize += prize;
            prizeCount[prizeName] = (prizeCount[prizeName] || 0) + 1;
        }

        results.push({
            index: i + 1,
            numbers: ticket,
            matchNums,
            matchCount,
            matchSpecial: matchSpecial === 1,
            prizeName,
            prize,
            isWin: prize > 0,
        });
    }

    const nBets = tickets.length;
    const cost = nBets * LOTTO_COST_PER_BET;

    return {
        results,
        totalPrize,
        cost,
        profit: totalPrize - cost,
        nBets,
        winCount: results.filter(r => r.isWin).length,
        prizeCount,
    };
}

// =============================================================================
// 格式化結果為 HTML
// =============================================================================
function formatLottoCheckHTML(winningNums, specialNum, checkResult) {
    const { results, totalPrize, cost, profit, nBets, winCount, prizeCount } = checkResult;

    let html = '';

    // 開獎號碼
    html += '<div class="mb-4">';
    html += '<div class="text-sm text-slate-400 mb-2">開獎號碼</div>';
    html += '<div class="flex flex-wrap items-center gap-1">';
    for (const n of winningNums) {
        html += `<span class="ball ball-first">${n}</span>`;
    }
    html += '<span class="text-slate-500 mx-2">+</span>';
    html += `<span class="ball ball-second">${specialNum}</span>`;
    html += '<span class="text-slate-500 text-xs ml-1">特別號</span>';
    html += '</div></div>';

    // 逐注結果
    html += '<div class="result-box mt-4">';
    for (const r of results) {
        const matchStr = r.matchNums.length > 0 ? r.matchNums.join(', ') : '';
        const specStr = r.matchSpecial ? '特✓' : '特✗';
        const cls = r.isWin ? 'prize-hit' : 'prize-miss';

        html += `<div class="${cls}">`;
        html += `第${String(r.index).padStart(3, ' ')}注: [${r.numbers.join(', ')}]`;
        html += ` → 中${r.matchCount}碼`;
        if (matchStr) html += `[${matchStr}]`;
        html += ` ${specStr}`;
        if (r.isWin) {
            html += ` → 🎉 ${r.prizeName} ${r.prize.toLocaleString()}元`;
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

    // 各獎項
    if (Object.keys(prizeCount).length > 0) {
        html += `<tr><td class="text-slate-400" colspan="2" style="padding-top:0.75rem"><strong>各獎項統計</strong></td></tr>`;
        for (const [name, count] of Object.entries(prizeCount)) {
            html += `<tr><td class="text-slate-400 pl-4">${name}</td><td class="text-yellow-300">${count} 注</td></tr>`;
        }
    }

    const sign = profit >= 0 ? '+' : '';
    const profitColor = profit >= 0 ? 'text-green-400' : 'text-red-400';
    html += `<tr><td class="text-slate-400" style="padding-top:0.75rem">總獎金</td><td class="text-yellow-400 font-bold" style="padding-top:0.75rem">${totalPrize.toLocaleString()} 元</td></tr>`;
    html += `<tr><td class="text-slate-400">總成本</td><td class="text-white">${cost.toLocaleString()} 元</td></tr>`;
    html += `<tr><td class="text-slate-400">損益</td><td class="${profitColor} font-bold">${sign}${profit.toLocaleString()} 元</td></tr>`;
    html += '</table></div>';

    return html;
}

// 解析數字輸入
function parseNumbers(str) {
    if (!str || !str.trim()) return [];
    return str.split(/[,，\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}
