DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `xh` TEXT NOT NULL, /* 学号 */
  `code` TEXT NOT NULL, /* 学校码 */
  `mail` TEXT NOT NULL, /* 发送邮箱 */
  PRIMARY KEY (`xh`)
);