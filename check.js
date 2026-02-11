// =============================================================================
// 威力彩對獎程式 — JavaScript 版
// 移植自 check_power_lottery.py
// =============================================================================

// 獎金表
const PRIZE_TABLE = {
    '6,1': { name: '頭獎', prize: null },
    '6,0': { name: '貳獎', prize: null },
    '5,1': { name: '參獎', prize: 150000 },
    '5,0': { name: '肆獎', prize: 20000 },
    '4,1': { name: '伍獎', prize: 4000 },
    '4,0': { name: '陸獎', prize: 800 },
    '3,1': { name: '柒獎', prize: 400 },
    '3,0': { name: '捌獎', prize: 200 },
    '2,1': { name: '玖獎', prize: 100 },
    '1,1': { name: '拾獎', prize: 100 },
};

const COST_PER_BET = 100;

// =============================================================================
// 解析文字格式的投注資料
// =============================================================================
function parseTicketText(text) {
    const brackets = [];
    const regex = /\[([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        brackets.push(match[1]);
    }

    if (brackets.length % 2 !== 0) {
        throw new Error(`格式錯誤：找到 ${brackets.length} 組括號，應為偶數`);
    }

    const groups = [];
    for (let i = 0; i < brackets.length; i += 2) {
        const first = brackets[i].split(',').map(s => parseInt(s.trim(), 10));
        const second = brackets[i + 1].split(',').map(s => parseInt(s.trim(), 10));
        groups.push({ first, second });
    }
    return groups;
}

// =============================================================================
// 展開分組為個別注數
// =============================================================================
function expandTicketGroups(groups) {
    const tickets = [];
    for (const g of groups) {
        for (const sec of g.second) {
            tickets.push({ first: g.first, second: sec });
        }
    }
    return tickets;
}

// =============================================================================
// 對獎
// =============================================================================
function checkPowerLottery(winningFirst, winningSecond, tickets, jackpot1st = 0, jackpot2nd = 0) {
    const winSet = new Set(winningFirst);
    const results = [];
    let totalPrize = 0;
    const prizeCount = {};

    for (let i = 0; i < tickets.length; i++) {
        const t = tickets[i];
        const firstSet = new Set(t.first);
        const matchFirst = [...firstSet].filter(n => winSet.has(n));
        const matchSecond = t.second === winningSecond ? 1 : 0;
        const mf = matchFirst.length;

        const key = `${mf},${matchSecond}`;
        let prize = 0;
        let prizeName = '未中獎';

        if (PRIZE_TABLE[key]) {
            prizeName = PRIZE_TABLE[key].name;
            if (key === '6,1') {
                prize = jackpot1st;
            } else if (key === '6,0') {
                prize = jackpot2nd;
            } else {
                prize = PRIZE_TABLE[key].prize;
            }
            totalPrize += prize;
            prizeCount[prizeName] = (prizeCount[prizeName] || 0) + 1;
        }

        results.push({
            index: i + 1,
            first: t.first,
            second: t.second,
            matchFirst,
            matchSecond: matchSecond === 1,
            matchFirstCount: mf,
            prizeName,
            prize,
            isWin: prize > 0,
        });
    }

    const nBets = tickets.length;
    const cost = nBets * COST_PER_BET;

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
function formatCheckResultHTML(winningFirst, winningSecond, checkResult) {
    const { results, totalPrize, cost, profit, nBets, winCount, prizeCount } = checkResult;

    let html = '';

    // 開獎號碼
    html += '<div class="mb-4">';
    html += '<div class="text-sm text-slate-400 mb-2">開獎號碼</div>';
    html += '<div class="flex flex-wrap items-center gap-1">';
    for (const n of winningFirst) {
        html += `<span class="ball ball-first">${n}</span>`;
    }
    html += '<span class="text-slate-500 mx-2">+</span>';
    html += `<span class="ball ball-second">${winningSecond}</span>`;
    html += '</div></div>';

    // 逐注結果
    html += '<div class="result-box mt-4">';
    for (const r of results) {
        const matchStr = r.matchFirst.length > 0 ? r.matchFirst.join(', ') : '';
        const secStr = r.matchSecond ? '二區✓' : '二區✗';
        const cls = r.isWin ? 'prize-hit' : 'prize-miss';

        html += `<div class="${cls}">`;
        html += `第${String(r.index).padStart(3, ' ')}注: [${r.first.join(', ')}] + ${r.second}`;
        html += ` → 第一區中${r.matchFirstCount}個`;
        if (matchStr) html += `[${matchStr}]`;
        html += ` ${secStr}`;
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
