// 学童名
const GAKUDO_NAME =

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

function getChildren(e) {
  const grades = ['1', '2', '3'];
  const children = [];
  for (const grade of grades) {
    const name = getValue(e, `児童${grade}　氏名`);
    if (isEmpty(name)) {
      continue;
    }
    const child =  {
      'name': name,
      'grade': getValue(e, `児童${grade}　学年`)
    }
    children.push(child);
  }
  return children;
}

function getDates(e) {
  const dates = [];
  const saturdays = [];
  const keys = ['欠席日 1', '欠席日 2', '欠席日 3', '欠席日 4', '欠席日 5'];
  for (const key of keys) {
    const dt = getValue(e, key);
    if (isEmpty(dt)) {
      continue;
    }
    const absDate = new Date(dt);
    console.log(absDate, absDate.getDay())
    if (absDate.getDay() === 6) {
      saturdays.push(dt)
    } else {
      dates.push(dt)
    }
  }
  return [dates, saturdays];
}

/**
 * Google Form (Spreadsheet) から送られてくる情報を欠席情報に変換する
 */
function getItem(e) {
  const item = {};
  item.ts = getValue(e, 'タイムスタンプ');
  item.children = getChildren(e);
  item.reason = getValue(e, '欠席理由');
  const [dates, saturdays] = getDates(e);
  item.dates = dates;
  item.saturdays = saturdays;
  return item;
}

/**
 * 通知メッセージ文字列を作成する
 */
function getMessage(child, dates, reason, ts, gakudoName) {
  const msgs = []
  if (gakudoName) {
    msgs.push(`所属学童： ${gakudoName}`);
  }
  msgs.push(`児童氏名： ${child.name}`);
  msgs.push(`児童学年： ${child.grade}`);
  msgs.push(`欠席日時： ${dates}`);
  msgs.push(`欠席理由： ${reason}`);
  msgs.push(`送信日時： ${ts}`);
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
    const msg = getMessage(child, dates, item.reason, item.ts, null)
    msgs.push(msg);
  }
  if (item.saturdays.length > 0) {
    for (const child of item.children) {
      const msg = getMessage(child, item.saturdays, item.reason, item.ts, GAKUDO_NAME)
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
