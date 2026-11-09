/**
 * 先天能量天赋报告 - 兑换码验证后端
 * 部署方式：Google Sheets → 扩展 → Apps Script → 粘贴此代码 → 部署 → 新建部署 → 网页应用
 * 访问权限：任何人
 */

// 有效兑换码（与前端原 VALID_CODES 一致）
const VALID_CODES = [
  'TQ-8K3M-2P9X','TQ-5N7Q-1W4Z','TQ-3L6R-9D2C','TQ-7F4T-8B5H','TQ-2J9V-6K3M',
  'TQ-4P8W-1N7Q','TQ-9D3C-5F2T','TQ-6M4X-8R1B','TQ-1H7K-3L9V','TQ-5Z2N-6W4P',
  'TQ-YYHA-GLG2','TQ-UFN9-TQNW','TQ-4JPL-VV2K','TQ-S5FH-7R2C','TQ-4A4Q-9KW7',
  'TQ-HVJ5-VDAN','TQ-3SUF-LZQ4','TQ-UKAE-UWUP','TQ-S7QK-CWQU','TQ-HLM8-QHJB',
];

const SHEET_NAME = '兑换码';

/**
 * 初始化表格（首次运行时自动创建）
 * 可手动运行一次 initSheet 确保数据写入
 */
function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  sheet.clear();
  // 表头
  sheet.getRange(1, 1).setValue('兑换码');
  sheet.getRange(1, 2).setValue('已使用');
  sheet.getRange(1, 3).setValue('使用时间');
  sheet.getRange(1, 4).setValue('备注');
  // 写入所有码
  const data = VALID_CODES.map(code => [code, false, '', '']);
  sheet.getRange(2, 1, data.length, 4).setValues(data);
  // 冻结表头
  sheet.setFrozenRows(1);
  SpreadsheetApp.flush();
  return '已初始化 ' + VALID_CODES.length + ' 个兑换码';
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    initSheet();
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  return sheet;
}

/**
 * 验证兑换码（GET 请求）
 * 参数：code=兑换码
 * 返回：{ok: true/false, msg: '...'}
 */
function doGet(e) {
  const code = (e.parameter.code || '').trim().toUpperCase();
  
  if (!code) {
    return jsonOut({ ok: false, msg: '请输入兑换码' });
  }

  // 用锁防止并发（两人同时用同一码）
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
  } catch (err) {
    return jsonOut({ ok: false, msg: '系统繁忙，请稍后重试' });
  }

  try {
    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    
    // 查找该码所在行（跳过表头）
    let rowIdx = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === code) {
        rowIdx = i + 1; // 表格行号（从1开始）
        break;
      }
    }

    if (rowIdx === -1) {
      return jsonOut({ ok: false, msg: '兑换码无效，请检查后重试' });
    }

    const usedCell = sheet.getRange(rowIdx, 2);
    const isUsed = usedCell.getValue() === true;

    if (isUsed) {
      return jsonOut({ ok: false, msg: '该兑换码已被使用，如有疑问请联系客服' });
    }

    // 标记为已使用
    usedCell.setValue(true);
    sheet.getRange(rowIdx, 3).setValue(new Date());
    SpreadsheetApp.flush();

    return jsonOut({ ok: true, msg: '验证成功' });
  } finally {
    lock.releaseLock();
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 测试用：手动执行此函数验证逻辑
function testVerify() {
  const testCode = VALID_CODES[0];
  const result = doGet({ parameter: { code: testCode } });
  Logger.log(result.getContent());
}
