/**
 * Cloudflare Worker - 兑换码验证服务
 * 部署步骤：Cloudflare Dashboard → Workers → 创建 → 粘贴代码 → 绑定 KV → 部署
 * KV 绑定变量名：REDEEM_CODES
 */

// 有效兑换码列表
const VALID_CODES = [
  'TQ-8K3M-2P9X','TQ-5N7Q-1W4Z','TQ-3L6R-9D2C','TQ-7F4T-8B5H','TQ-2J9V-6K3M',
  'TQ-4P8W-1N7Q','TQ-9D3C-5F2T','TQ-6M4X-8R1B','TQ-1H7K-3L9V','TQ-5Z2N-6W4P',
  'TQ-YYHA-GLG2','TQ-UFN9-TQNW','TQ-4JPL-VV2K','TQ-S5FH-7R2C','TQ-4A4Q-9KW7',
  'TQ-HVJ5-VDAN','TQ-3SUF-LZQ4','TQ-UKAE-UWUP','TQ-S7QK-CWQU','TQ-HLM8-QHJB',
];

// CORS 响应头
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json;charset=utf-8',
};

export default {
  async fetch(request, env) {
    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS, status: 204 });
    }

    const url = new URL(request.url);
    const code = (url.searchParams.get('code') || '').trim().toUpperCase();

    if (!code) {
      return json({ ok: false, msg: '请输入兑换码' });
    }

    // 检查码是否在有效列表
    if (!VALID_CODES.includes(code)) {
      return json({ ok: false, msg: '兑换码无效，请检查后重试' });
    }

    // 检查 KV 中是否已使用
    const used = await env.REDEEM_CODES.get(code);
    if (used) {
      return json({ ok: false, msg: '该兑换码已被使用，如有疑问请联系客服' });
    }

    // 标记为已使用（写入 KV）
    await env.REDEEM_CODES.put(code, '1', { metadata: { usedAt: new Date().toISOString() } });

    return json({ ok: true, msg: '验证成功' });
  },
};

function json(data) {
  return new Response(JSON.stringify(data), { headers: CORS });
}
