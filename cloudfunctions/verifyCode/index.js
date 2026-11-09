// 云函数：verifyCode
// 功能：验证兑换码，防止重复使用
// 数据库集合：redeem_codes，字段：code(字符串), used(布尔值), usedAt(时间)

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const code = (event.code || '').trim().toUpperCase()

  if (!code) {
    return { ok: false, msg: '请输入兑换码' }
  }

  try {
    // 查询该兑换码
    const res = await db.collection('redeem_codes')
      .where({ code: code })
      .limit(1)
      .get()

    if (res.data.length === 0) {
      return { ok: false, msg: '兑换码无效，请检查后重试' }
    }

    const record = res.data[0]

    if (record.used === true) {
      return { ok: false, msg: '该兑换码已被使用，如有疑问请联系客服' }
    }

    // 标记为已使用（原子操作：只有 used=false 时才更新）
    const updateRes = await db.collection('redeem_codes')
      .where({
        _id: record._id,
        used: false,
      })
      .update({
        data: {
          used: true,
          usedAt: db.serverDate(),
        },
      })

    // 如果没有更新到任何记录，说明并发情况下被别人抢先使用了
    if (updateRes.stats.updated === 0) {
      return { ok: false, msg: '该兑换码已被使用，如有疑问请联系客服' }
    }

    return { ok: true, msg: '验证成功' }
  } catch (err) {
    console.error('verifyCode error:', err)
    return { ok: false, msg: '系统异常，请稍后重试' }
  }
}
