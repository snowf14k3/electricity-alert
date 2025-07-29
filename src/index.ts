import { Hono , Context} from 'hono'
import { WorkerMailer } from 'worker-mailer'

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// cloudflare env
const SENDER_ADDRESS = "mail@mail.com";
const MAIL_USERNAME = SENDER_ADDRESS;
const MAIL_PASSWORD = 'smtpPwd';
const host = "smtp.qq.com";
const port = 587;

const css = 
`
body {
  font-family: 'Arial', sans-serif;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  margin: 0;
  padding: 20px;
}
body::after {
  content: "©2019 - 2025 By 0x0AB8 - Powered By CloudFlare Worker";
  position: fixed;
  bottom: 10px;
  right: 10px;
  opacity: 0.5;
  font-size: 10px;
  color: #999;
  z-index: 9999;
}
.dashboard {
  width: 100%;
  max-width: 800px;
}
.dorm-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}
.dorm-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 0;
}
.dorm-status {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
}
.status-normal {
  background-color: #e8f5e9;
  color: #2e7d32;
}
.status-warning {
  background-color: #fff3e0;
  color: #e65100;
}
.status-danger {
  background-color: #ffebee;
  color: #c62828;
  animation: blink 1.5s infinite;
}
.electricity-data {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin: 15px 0;
}
.data-item {
  flex: 1;
  min-width: 120px;
}
.data-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}
.data-value {
  font-size: 22px;
  font-weight: bold;
  color: #2c3e50;
}
.remaining-value {
  color: #e74c3c;
}
.notification-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-top: 20px;
}
.notification-header {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}
.email-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 10px;
  box-sizing: border-box;
}
.notification-btn {
  background-color: "#4285F4";
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.3s;
}
.notification-btn:hover {
  background-color: #3367d6;
}
.notification-btn.active {
  background-color: #34a853;
}
@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}
.last-update {
  font-size: 12px;
  color: #95a5a6;
  margin-top: 15px;
}
.chart {
  width: 100%;
  height: 300px;
}
`;

// 用于添加多个电量宿舍卡片
function addCards(roomfullname: string , use : string , sumbuy: number,moreInfo: any,i: number,isMail: boolean): string {
  let textContent = "";
  let className = "";
  if (sumbuy === 0) {
    textContent = '已断电';
    className = 'status-danger';
  } else if (sumbuy < 20) {
    textContent = '电量不足';
    className = 'status-warning';
  } else {
    textContent = '供电正常';
    className = 'status-normal';
  }

  const charts = isMail ? `` : `<div class="data-item">
      <div class="data-label">近6日用电</div>
      <div class="chart" id="chart-${i}"></div>
    </div>`;

  return `
  <div class="dorm-card">
    <div class="card-header">
      <h3 class="dorm-title">${roomfullname}</h3>
      <span class="dorm-status ${className}">${textContent}</span>
    </div>
    <div class="electricity-data">
      <div class="data-item">
        <div class="data-label">累计用电</div>
        <div class="data-value">${use} 度</div>
      </div>
      <div class="data-item">
        <div class="data-label">剩余电量</div>
        <div class="data-value">${sumbuy} 度</div>
      </div>
    </div>
    ${charts}
    <div class="last-update">
      最后更新: <span>${moreInfo.lastupdate}</span>
    </div>
  </div>
  `;
}

async function moreInfo(room: any,xh: string,code: string){
    // 房间验证
  const roomverify = room.roomverify;
  const timestamp = Date.now();
  const reqexp = await fetch("https://xqh5.17wanxiao.com/smartWaterAndElectricityService/SWAEServlet", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `param=%7B%22cmd%22%3A%22getstuindexpage%22%2C%22roomverify%22%3A%22${roomverify}%22%2C%22account%22%3A%22${xh}%22%2C%22timestamp%22%3A%22${timestamp}%22%7D&customercode=${code}&method=getstuindexpage`
  });
  const rspexp: any = await reqexp.json();
  const bodyexp = JSON.parse(rspexp.body);

  // 似乎只有第一个
  const modlist = bodyexp.modlist[0];

  const weekuselist = modlist.weekuselist;

  return {
    lastupdate: modlist.collecdate,
    weekuselist: weekuselist
  };
}

app.get('/',async(c) => {
  const html = 
  `
  <html>
  <head>
    <style>
      ${css}
    </style>
  </head>
  <title>宿舍电量监控系统</title>
  <body>
    <center style="font-size: xxx-large">宿舍电量监控系统</center>
    <h1>介绍</h1>
    <p>你是否曾经因为忘记检查电费，而遭遇晚上断电，还恰好处于充值系统的维护时间？ /(ㄒoㄒ)/~~ 于是，为了避免悲剧再次发生，这个使用 Cloudflare worker 定时执行、借助 smtp 发送低电费提醒的 在线预警 平台就诞生了！</p>
    <p style="font-size: x-large">本系统在每天 12 点和 19 点，自动查询在完美校园上所绑定的所有房间的剩余度数，若低于设定的20度，就通过 邮箱 向指定的 邮箱 推送消息。</p>
    <img src="https://cdn.luogu.com.cn/upload/image_hosting/gv5m228z.png">
   
    <h1>使用方法</h1>
    <p style="color: red">1. 通过学号访问自己在完美校园中的绑定:  https://本链接/学校代码/学号 </p>
    <p>比如 https://本链接/3131/学号  , 这里的3131就表示的为 广西科技师范学院 </p>
    <p>2. 在下面输入你的邮箱,开启通知即可</p>
    <p>学校代码在查看后面查看 : <a href="https://github.com/zuwei522/perfect-campus_electricity-alert/blob/ef06292f46acbbd322480095eef2f1be2382c44e/school-list.md">github</a></p>
    
  </body>
  </html>
  `
  ;
  return c.html(html);
});

// 查看 某学校某学号下绑定的宿舍电量情况
app.get('/:code/:xh', async(c) => {
  const xh = c.req.param('xh');
  const code = c.req.param('code');

  // 后面再改到前端去请求吧
  const response = await fetch("https://xqh5.17wanxiao.com/smartWaterAndElectricityService/SWAEServlet", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `param=%7B%22cmd%22%3A%22getbindroom%22%2C%22account%22%3A%22${xh}%22%7D&customercode=${code}&method=getbindroom`
  });
  // 没响应喵
  if(!response) return c.html("没响应喵~ 可能是完美校园封禁了IP");
  const rsp: any = await response.json();
  const body = JSON.parse(rsp.body);
  if(!body.existflag || body.existflag === "0") return c.html(`<h1>你的学校不支持查询 或 没有找到学号下 绑定的房间 喵~</h1> <p>${JSON.stringify(response)}</p>`);

  const existflag = parseInt(body.existflag);

  let cards = "";
  
  let dormData = [];
  // 多个绑定宿舍添加
  if (existflag > 1) {
    for (let i = 0; i < existflag; i++) {
      const element = body.roomlist[i].detaillist[0];
      const roomfullname = body.roomlist[i].roomfullname;
      const odd = element.odd;
      const use = element.use;

      const moreInfoReq = await moreInfo(body.roomlist[i] ,xh , code)

      dormData.push({id: i , list: moreInfoReq.weekuselist});
      cards += addCards(roomfullname ,use as string , odd as number , moreInfoReq, i , false);
    }
  }else {
    const roomfullname = body.roomfullname as string;
    const moreInfoReq = await moreInfo(body ,xh , code);

    dormData.push({id: 0, list: moreInfoReq.weekuselist});

    cards += addCards(roomfullname , body.detaillist[0].use as string , body.detaillist[0].odd as number, moreInfoReq, 0 , false);
  }

  const dormFinalData = JSON.stringify(dormData);

  // 订阅是否存在
  let mail = await isNotification(c, xh);
  const buttonText = mail ? "关闭邮箱通知" : "开启邮件通知";
  const btnColor = mail ? "#e74c3c" : "#4285F4";

  const click = mail ?
  // 已订阅
  `
      fly.post('/removeNotification', {xh: '${xh}'} , {headers:{
        "content-type":"application/x-www-form-urlencoded"
      }})
      .then(function (response) { 
        window.location.reload();
      })
      .catch(function (error) {
        console.log(error);
      });
  `
  :
  // 未订阅
  `
      const mail = document.getElementById('emailInput').value;
      if(!mail) {
        alert("邮箱不能为空");
        return;
      }
      if(!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))) {
        alert("邮箱不合法，请重新输入");
        return;
      }
      fly.post('/addNotification', {xh: '${xh}' , code: '${code}' , mail: mail} , {headers:{
        "content-type":"application/x-www-form-urlencoded"
      }})
      .then(function (response) { 
        window.location.reload();
      })
      .catch(function (error) {
        console.log(error);
      });
  `
  ;

  if(!mail) mail = "";

  // script处代码
  const rawScript = 
  `
  const fly = new Fly();
  document.getElementById('notificationBtn').style.backgroundColor = "${btnColor}";
  const notificationBtn = document.getElementById('notificationBtn');
  notificationBtn.addEventListener('click', function() {
    ${click}
  });
  const dormData = ${dormFinalData};
  dormData.forEach(dorm => {
    const chart = echarts.init(document.getElementById(\`chart-\${dorm.id}\`));
    const name = dorm.list.map(m => m.weekday + m.daydate);
    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: '{c}度',
      },
      xAxis: {
        type: 'category',
        data: name,
        axisLine: {
          lineStyle: {
            color: '#666'
          }
        },
        axisTick: {
          alignWithLabel: true
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: ['#eee'],
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '用电量 (度)',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#666'
          }
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: ['#eee'],
            type: 'dashed'
          }
        }
      },
      series: [{
        color: [
          "#edafda",
        ],
        type: 'line',
        data: dorm.list.map(m => m.use),
        lineStyle: {
          width: 3
        },
        areaStyle: {},
        itemStyle: {
          borderWidth: 2
        },
        symbol: "emptyDiamond",
      }]
    };
    chart.setOption(option);
    chart.hideLoading();
    window.addEventListener('resize', function() {
      chart.resize();
    });
  });
  `;

  // 返回网页
  const html = 
  `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://unpkg.com/flyio/dist/fly.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
      <title>宿舍电量监控系统</title>
      <style>
        ${css}
      </style>
    </head>
    <body>
      <div class="dashboard">
        ${cards}
        <div class="notification-card">
          <div class="notification-header">电量提醒订阅</div>
          <input type="email" class="email-input" id="emailInput" placeholder="输入邮箱接收所有宿舍电量提醒" value="${mail}">
          <button type="button" class="notification-btn" id="notificationBtn" >${buttonText}</button>
        </div>
      </div>
    </body>
    <script>
      ${rawScript}
    </script>
    </html>
  `;
  return c.html(html);
});

async function isNotification(c: Context ,xh: string){
  const stmt = c.env.DB.prepare(
    'SELECT mail FROM users WHERE xh = ? LIMIT 1'
  ).bind(xh);
  const row = await stmt.first();
  return row?.mail;
}

// 用户开启订阅通知
app.post('/addNotification', async(c) => {
  const body = await c.req.parseBody();
  
  if (!body['mail'] || !body['xh'] || !body['code']) {
    c.status(400);
    return c.json({
      "status": "error",
      "message": "Missing mail xh code form data"
    });
  }

  const mail = body.mail as string;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRegex.test(mail)) {
    c.status(400);
    return c.json({
      "status": "error",
      "message": "invalid Email"
    });
  }

  const xh = body.xh as string;
  const code = body.code as string;

  const { success } = await c.env.DB.prepare(
    'INSERT INTO users (xh, code,mail) VALUES (?, ?,?)'
  ).bind(xh, code, mail).run();

  return c.json({
    "status": success,
  });
});

// 用户是否开启订阅通知
app.post('/isNotification' , async(c) => {
  const body = await c.req.parseBody();
  if (!body['xh']) {
    c.status(400);
    return c.json({
      "status": "error",
      "message": "Missing xh form data"
    });
  }
  const xh = body.xh as string;
  const exists = await isNotification(c, xh);
  return c.json({ mail: exists });
});

// 用户取消订阅通知
app.post('/removeNotification' , async(c) => {
  const body = await c.req.parseBody();
  if (!body['xh']) {
    c.status(400);
    return c.json({
      "status": "error",
      "message": "Missing xh form data"
    });
  }
  const xh = body.xh as string;
  const { success } = await c.env.DB.prepare(
    'DELETE FROM users WHERE xh = ?'
  ).bind(xh).run();

  return c.json({
    "status": success,
  });
});

// 获取全部订阅通知的用户
app.get('/all' , async(c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM users'
  ).all();
  return c.json(results);
});

export default {
  app,
  fetch: app.fetch,
  // 定时任务
  async scheduled(event, env, ctx) {
    const { results } = await env.DB.prepare(
      'SELECT * FROM users'
    ).all();

    // 依次发信
    for(let i = 0;i< results.length;i++) {
      const xh = results[i].xh;
      const code = results[i].code;
      const mail = results[i].mail;

      console.log(`send to ${mail} - ${xh}`);

      const response = await fetch("https://xqh5.17wanxiao.com/smartWaterAndElectricityService/SWAEServlet", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `param=%7B%22cmd%22%3A%22getbindroom%22%2C%22account%22%3A%22${xh}%22%7D&customercode=${code}&method=getbindroom`
      });
      
      const rsp: any = await response.json();

      // 没响应喵
      const body = JSON.parse(rsp.body);
      const existflag = parseInt(body.existflag);
      let cards = "";

      let odd = Number.MAX_VALUE;
      // 多个绑定宿舍添加
      if (existflag > 1) {
        for (let i = 0; i < existflag; i++) {
          const element = body.roomlist[i].detaillist[0];
          const roomfullname = body.roomlist[i].roomfullname;
          odd = Math.min(element.odd , odd);
          const use = element.use;
          const moreInfoReq = await moreInfo(body.roomlist[i] ,xh , code)
          cards += addCards(roomfullname ,use as string , odd as number , moreInfoReq,i , true);
        }
      }else {
        const roomfullname = body.roomfullname as string;
        odd = Math.min(body.detaillist[0].odd , odd);
        const moreInfoReq = await moreInfo(body ,xh , code);
        cards += addCards(roomfullname , body.detaillist[0].use as string , odd , moreInfoReq,0 , true);
      }

      // 如果有低电量的就发送邮件
      if(odd < 20) {
        // 发送邮件
        await WorkerMailer.send(
          {
            host: host,
            port: port,
            credentials: {
              username: MAIL_USERNAME,
              password: MAIL_PASSWORD
            },
            authType: 'plain',
            secure: false,
          },
          {
          from: { name: '电量提醒', email: SENDER_ADDRESS },
          to: mail,
          subject: '宿舍电量低于20度',
          html: 
          `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                ${css}
              </style>
            </head>
            <body>
              <div class="dashboard">
                ${cards}
              </div>
            </body>
            </html>
          `,
        });
      }
    }
    console.log("ok\n");
  }
}