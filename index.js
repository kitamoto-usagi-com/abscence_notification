// 各学童用の Webhook URL
const WEBHOOK_URL = 
// 土曜保育用の Webhook URL
const WEBHOOK_URL_SAT = 


function isEmpty(x) {
  if (x == '' || x == null || x == undefined) {
    return true;
  }
  return false;
}

function getValue(e, key) {
  return e.namedValues[key][0];
}

function getFirstChild(e) {
  return {
    'name': getValue(e, '児童1　氏名'),
    'grade': getValue(e, '児童1　学年')
  }
}

// function getOtherChildren(e) {
//   const ordinals = ['2', '3'];
//   const children = [];
//   for (ordinal of ordinals) {
//     const child = {
//       'name': e.namedValues[`児童${ordinal}　氏名`],
//       'grade': getGrade(`児童${ordinal}`);
//     }
//   }
// }

/**
 * 	Google Form (Spreadsheet) から送られてくる情報を欠席情報に変換する
 */
function getItem(e) {
  const item = {};
  item.ts = getValue(e, 'タイムスタンプ');

  const child_1 = getFirstChild(e);
  // const others = getOtherChildren();
  // const children = [child_1].extend(others);
  item.children = [child_1]

  item.reason = getValue(e, '欠席理由');
  item.dates = [];
  item.saturdays = [];
  const keys = ['欠席日 1', '欠席日 2', '欠席日 3', '欠席日 4', '欠席日 5'];
  for (const key of keys) {
    const dt = getValue(e, key);
    if (isEmpty(dt)) {
      continue;
    }
    const absDate = new Date(dt);
    console.log(absDate, absDate.getDay())
    if (absDate.getDay() === 6) {
      item.saturdays.push(dt)
    } else {
      item.dates.push(dt)
    }
  }
  return item;
}

/**
 * 通知メッセージ文字列を作成する
 */
function getMessage(child, dates, reason, ts) {
  const msgs = []
  msgs.push(`児童氏名：${child.name}`);
  msgs.push(`児童学年：${child.grade}`);
  msgs.push(`欠席日時：${dates}`);
  msgs.push(`欠席理由：${reason}`);
  msgs.push(`送信日時：${ts}`);
  return msgs.join('\n');
}

/**
 * 一連の通知メッセージを作成する
 */
function getMessages(item) {
  const msgs = [];
  const satMsgs = [];
  const dates = item.dates.concat(item.saturdays);
  for (const child of item.children) {
    const msg = getMessage(child, dates, item.reason, item.ts)
    msgs.push(msg);
  }
  if (item.saturdays.length > 0) {
    for (const child of item.children) {
      const msg = getMessage(child, item.saturdays, item.reason, item.ts)
      satMsgs.push(msg);
    }
  }
  return [msgs, satMsgs]
}

/**
 * Google Space にメッセージを送信する。通常、土曜保育
 */
function sendMsg(msgs, isSaturday) {
  const url = isSaturday ? WEBHOOK_URL_SAT : WEBHOOK_URL;
  const payload = {
    "text": msgs.join('\n\n')
  }
  const options = {
    "method": "POST",
    "contentType": 'application/json; charset=utf-8',
    "payload": JSON.stringify(payload)
  }
  const response = UrlFetchApp.fetch(url, options);
  return response;
}

function main(e) {
  console.log('Start:', e);
  const item = getItem(e);
  console.log(item)
  const [msgs, satMsgs] = getMessages(item);
  const result = sendMsg(msgs, false);
  const satResult = sendMsg(satMsgs, true);
  console.log('Finished', result, satResult);
}
