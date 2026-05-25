# 造价勇者：一级造价师 RPG 学习计划

本项目是一个 Windows 本地运行的一级造价师学习推进网页。它面向 2026 年一级造价工程师（土木建筑工程）备考，核心能力包括每日任务、科目勾选、角色等级 EXP、真题/错题记录、资料链接和外部考试得分记录。

## Windows 使用

1. 安装 Node.js LTS: <https://nodejs.org/>
2. 解压项目压缩包。
3. 双击 `启动学习计划.bat`。
4. 浏览器会打开 `http://127.0.0.1:4173`。

学习数据保存在解压目录的 `data/app-data.json`。备份时复制整个项目目录，或至少复制 `data/app-data.json`。

## 开发命令

```bash
npm test
npm start
```

## 打包

在项目父目录执行：

```bash
zip -r yizaostudy.zip yizaostudy -x "yizaostudy/.git/*" "yizaostudy/data/*.json" "yizaostudy/*.zip"
```

## 设计边界

- 本地单用户，电脑浏览器优先。
- 不直连粉笔账号，不批量搬运付费或受限题库内容。
- 公开题源以来源链接和用户手动导入为主。
- 后续可扩展公网访问、登录、HTTPS、自动备份和半自动题目解析。
