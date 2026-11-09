// 云函数：verifyCode（CloudBase PostgreSQL 版）
// 部署后在「HTTP 访问服务」里绑定，前端用 fetch 直接调用
// 环境变量需要配置：PGHOST / PGPORT / PGDATABASE / PGUSER / PGPASSWORD

const { Pool } = require('pg')

// 有效兑换码（只在服务端，前端看不到）
const VALID_CODES = [
  'TQ-8K3M-2P9X','TQ-5N7Q-1W4Z','TQ-3L6R-9D2C','TQ-7F4T-8B5H','TQ-2J9V-6K3M',
  'TQ-4P8W-1N7Q','TQ-9D3C-5F2T','TQ-6M4X-8R1B','TQ-1H7K-3L9V','TQ-5Z2N-6W4P',
  'TQ-YYHA-GLG2','TQ-UFN9-TQNW','TQ-4JPL-VV2K','TQ-S5FH-7R2C','TQ-4A4Q-9KW7',
  'TQ-HVJ5-VDAN','TQ-3SUF-LZQ4','TQ-UKAE-UWUP','TQ-S7QK-CWQU','TQ-HLM8-QHJB',
]

let pool = null
let tableReady = false

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.PGHOST || process.env.PG_HOST,
      port: Number(process.env.PGPORT || process.env.PG_PORT || 5432),
      database: process.env.PGDATABASE || process.env.PG_DATABASE,
      user: process.env.PGUSER || process.env.PG_USER,
      password: process.env.PGPASSWORD || process.env.PG_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 3,
    })
  }
  return pool
}

async function ensureTable() {
  if (tableReady) return
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS redeem_used (
      code TEXT PRIMARY KEY,
      used_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  tableReady = true
}

function out(obj) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
    body: JSON.stringify(obj),
  }
}

exports.main = async (event) => {
  const q = event.queryStringParameters || {}
  const code = String(q.code || event.code || '').trim().toUpperCase()

  if (!code) return out({ ok: false, msg: '请输入兑换码' })

  if (!VALID_CODES.includes(code)) {
    return out({ ok: false, msg: '兑换码无效，请检查后重试' })
  }

  try {
    await ensureTable()
    const p = getPool()

    // 原子占用：主键冲突说明已被用过
    const res = await p.query(
      'INSERT INTO redeem_used (code) VALUES ($1) ON CONFLICT (code) DO NOTHING RETURNING code',
      [code]
    )

    if (res.rowCount === 0) {
      return out({ ok: false, msg: '该兑换码已被使用，如有疑问请联系客服' })
    }

    return out({ ok: true, msg: '验证成功' })
  } catch (err) {
    console.error('verifyCode error:', err)
    return out({ ok: false, msg: '系统异常，请稍后重试' })
  }
}
