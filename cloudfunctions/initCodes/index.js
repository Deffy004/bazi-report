// 云函数：initCodes
// 功能：初始化兑换码数据（只需运行一次）
// 使用方法：部署后在云函数控制台点"测试"运行一次

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const VALID_CODES = [
  'TQ-8K3M-2P9X','TQ-5N7Q-1W4Z','TQ-3L6R-9D2C','TQ-7F4T-8B5H','TQ-2J9V-6K3M',
  'TQ-4P8W-1N7Q','TQ-9D3C-5F2T','TQ-6M4X-8R1B','TQ-1H7K-3L9V','TQ-5Z2N-6W4P',
  'TQ-YYHA-GLG2','TQ-UFN9-TQNW','TQ-4JPL-VV2K','TQ-S5FH-7R2C','TQ-4A4Q-9KW7',
  'TQ-HVJ5-VDAN','TQ-3SUF-LZQ4','TQ-UKAE-UWUP','TQ-S7QK-CWQU','TQ-HLM8-QHJB',
]

exports.main = async (event, context) => {
  try {
    // 先清空已有数据
    const countRes = await db.collection('redeem_codes').count()
    if (countRes.total > 0) {
      // 分批删除
      const listRes = await db.collection('redeem_codes').limit(100).get()
      for (const item of listRes.data) {
        await db.collection('redeem_codes').doc(item._id).remove()
      }
    }

    // 批量插入新码
    const tasks = VALID_CODES.map(code => 
      db.collection('redeem_codes').add({
        data: {
          code: code,
          used: false,
          usedAt: null,
          createdAt: db.serverDate(),
        }
      })
    )

    await Promise.all(tasks)

    return { ok: true, msg: `成功初始化 ${VALID_CODES.length} 个兑换码` }
  } catch (err) {
    console.error('initCodes error:', err)
    return { ok: false, msg: '初始化失败：' + err.message }
  }
}
