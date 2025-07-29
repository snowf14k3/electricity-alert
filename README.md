# electricity-alert

完美校园 低电费提醒

- 一个基于[Worker-Mailer](https://github.com/zou-yu/worker-mailer/tree/main)的电费预警通知系统

- [体验链接](https://room.snowflak3.icu/)

## 如何使用

可以在已经部署的worker，通过 `workername.xxx.workers.dev/学校代码/学号` 查询学号下绑定的房间，在网页中填写邮箱即可开启通知。

[学校代码查看处](https://github.com/zuwei522/perfect-campus_electricity-alert/blob/ef06292f46acbbd322480095eef2f1be2382c44e/school-list.md)，（倘若你没能找到自己的学校代码，那只能自己抓包了）

<img width="971" height="796" alt="image" src="https://github.com/user-attachments/assets/e413c878-a9e8-446d-89f1-477a16025702" />

开启通知后，系统会定时在 12点 和 19点 自动查询在完美校园上所绑定的所有房间的剩余度数，若低于设定的20度，则通过 邮箱 向用户指定 的邮箱发送预警信息。

<img width="1067" height="440" alt="image" src="https://github.com/user-attachments/assets/113006e1-5629-4d1b-8a26-28a7907d9dbd" />

## 部署项目
  
  1. clone 本仓库到本地
  2. 使用 `npm install` 初始化本项目
  3. 更改 src/index.ts 中cloudflare env注释下的数值（懒得改用cloudflare自带环境变量了）
  4. 通过命令创建 d1 数据库 `npx wrangler d1 create users`，创建成功后从cli中输出的 `database_id` 填入到 `wrangler.toml` 中的d1_databases中
  5. 在 d1 数据库 中创建表 `npx wrangler d1 execute users --remote --file=./users.sql`
  6. 最后使用 `npm run deploy` 推送到 cloudflare worker上

## 一些限制

  1. Cloudflare Workers 禁用 25 端口的出站连接，您无法在 25 端口提交邮件，但是主流的 587 和 465 等端口是支持的
  2. 由于cloudflare的并行请求限制,可能短时间内发送的邮件有限(可能会导致某些账号的邮件丢失...)
  3. 完美校园曾封杀过国外ip，导致系统无法使用(现已恢复)。
  4. 用户数量过多可能会出现请求失败的问题（没试过）。
  5. 每个 Worker 实例对并发 TCP 连接数有限制，无法一次连接发送多封邮件，需要重复与smtp服务器通信。

## 优化

  1. 通过网页查询时，让前端自行查询，服务器查询速度较慢
  2. 写的代码有些狗屎，请见谅
