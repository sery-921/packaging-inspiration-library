# 开发日志

记录包装灵感库从 0 到 1 的设计与决策过程。

## v0.1.0 - 2026-08-19 骨架搭建

### 需求定位

用户是包装工程方向实习生，想做一个个人灵感记录工具。通过多轮问答确认了核心需求：

- 主用途：设计新包装时翻找参考，附带分享给同事
- 录入场景：手边实物拍照为主（拆完快递/拿到样品），也记录网上图片
- 硬需求：手机能访问、边拍边录
- 字段：标题、内衬结构、盒型、外观审美、材料（含环保关注）、尺寸、开箱体验、产品品类、灵感备注、刀模文件、日期、来源
- 刀模：前期手动上传文件，按尺寸自动生成为后期加分项
- 检索：条件组合筛选 + 关键词搜索 + 日期范围
- 分享：同事通过公开链接只读浏览，不能在线编辑，上传走用户本人
- 数据自有：全部数据存本地 git 仓库，不依赖云服务

### 架构决策

采用与装箱工具一致的路子，分两层：

1. 本地编辑模式：Node http 服务器（零依赖），处理图片上传（base64）和 JSON 读写，手机局域网访问
2. 静态发布模式：纯静态站点部署到 GitHub Pages，同事只读浏览

数据以 entries.json + 图片文件形式存在仓库里，git 历史即迭代记录。

### 技术选型

- 服务端：纯 Node.js 内置 http 模块，不引入任何 npm 依赖，避免安装问题
- 图片上传：客户端 FileReader 转 base64，JSON 发送，服务端解码写文件。避开 multipart 解析的复杂性
- 前端：原生 HTML/CSS/JS，沿用装箱工具的 navy/orange/paper 设计系统
- 模式探测：前端自动探测 /api 是否可达，有则编辑模式，无则只读

### 字段设计

entries.json 每条记录包含：id、createdAt、updatedAt、title、date、boxType、dimensions{L,W,H}、insertStructure、appearanceStyle[]、material{type,thickness,ecoFriendly,note}、productCategory、unboxingExperience、inspirationNotes、photos[{url,file,angle}]、dieline{url,file,format}、source

### 待办

- [ ] 启动验证：本地跑通、手机访问测试
- [ ] GitHub 推送
- [ ] 后期：刀模按尺寸自动生成（加分项）
- [ ] 后期：内网穿透支持远程编辑（加分项）
