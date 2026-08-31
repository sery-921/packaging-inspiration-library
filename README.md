# 包装灵感库 (Packaging Inspiration Library)
 
 记录打动你的包装结构、外观与开箱体验，日后设计时随时翻找参考。
 
 线上画廊：<https://sery-921.github.io/packaging-inspiration-library/>
 
 ## 它是怎么工作的
 
 整个应用是一个纯静态站点，不需要运行任何后端服务器。所有数据以文件形式存在 GitHub 仓库里：
 
 - **数据**：`data/entries.json`
 - **照片**：`images/` 目录（仅 JPG，PNG 被 `.gitignore` 排除）
 - **刀模文件**：`dielines/` 目录（PDF / JPG）
 
 打开网站后自动进入**只读浏览模式**，任何人都可以查看画廊。需要录入或编辑时，点击右上角徽章，输入 GitHub Personal Access Token，即可切换到**编辑模式**——所有读写操作都通过 GitHub Contents API 直接操作仓库，在哪个设备、哪里的网络都可以编辑，不限于局域网。
 
 推送到 `main` 分支后，GitHub Actions 自动部署到 GitHub Pages，同事拿公开链接即可浏览。
 
 ## 特性
 
 - 拍照录入，多角度照片（正面 / 侧面 / 开箱 / 内衬等），上传后立即可见
 - 结构化字段：标题、盒型、尺寸（L×W×H）、内衬结构、材料（类型 / 厚度 / 备注）、外观风格标签、产品品类、开箱体验、灵感备注、来源、日期
 - 盒型 / 材料 / 品类支持从预设列表选择，也可自定义输入
 - 外观风格标签支持预设快选 + 自定义输入
 - 刀模文件上传（PDF / JPG，前期手动传，后期考虑按尺寸自动生成）
 - 检索：条件组合筛选（盒型 / 材料 / 品类 / 风格）+ 关键词搜索 + 日期范围
 - 两种模式：只读浏览（默认）/ 编辑模式（连接 GitHub 后启用）
 - 图片灯箱、详情弹层、编辑弹层，移动端适配
 
 ## 使用方式
 
 ### 只读浏览
 
 打开 [GitHub Pages 链接](https://sery-921.github.io/packaging-inspiration-library/) 即可浏览，无需任何配置。
 
 ### 编辑录入
 
 1. 打开网站，点击右上角「只读浏览」徽章
 2. 输入你的 GitHub Personal Access Token（需要 `Contents: Read and write` 权限）
    - 没有 Token？[点这里生成](https://github.com/settings/tokens?type=beta)
 3. Token 只存在浏览器 `localStorage`，不会上传到任何地方
 4. 连接后自动进入编辑模式，可以新建、编辑、删除记录，上传照片和刀模文件
 5. 编辑模式下的图片走 `raw.githubusercontent.com` 直链，上传后立即可见，无需等待 Pages 重建
 
 手机和电脑都可以编辑，不限于同一 WiFi——只要有 Token 和网络就行。
 
 ### 本地开发（可选）
 
 如果想在本地跑一个服务器预览（仅只读浏览，不走 GitHub API）：
 
 ```bash
 npm start
 # 或
 node server.js
 ```
 
 浏览器打开 <http://localhost:3000>。手机连同一 WiFi 访问 `http://<电脑IP>:3000` 也可以浏览。
 注意：本地服务器的 `/api` 端点仍然存在，但日常编辑流程已改为直接走 GitHub API，不再依赖它。
 
 ## 字段说明
 
 `data/entries.json` 每条记录包含：
 
 | 字段 | 说明 |
 |------|------|
 | `id` | 自动生成的时间戳 + 随机后缀 |
 | `createdAt` / `updatedAt` | 创建 / 更新时间（ISO） |
 | `title` | 标题 |
 | `date` | 记录日期 |
 | `boxType` | 盒型（预设或自定义） |
 | `dimensions` | `{ L, W, H }` 尺寸，单位 mm |
 | `insertStructure` | 内衬结构描述 |
 | `appearanceStyle` | 外观风格标签数组 |
 | `material` | `{ type, thickness, note }` |
 | `productCategory` | 产品品类 |
 | `unboxingExperience` | 开箱体验 |
 | `inspirationNotes` | 灵感备注 |
 | `photos` | `[{ url, file, angle }]` 多角度照片 |
 | `dieline` | `{ url, file, format }` 刀模文件 |
 | `source` | 来源 |
 
 ## 部署
 
 推送到 `main` 分支后，`.github/workflows/deploy.yml` 自动触发 GitHub Pages 部署。仓库 Settings → Pages → Source 设为 GitHub Actions 即可。
 
 ## 数据自有
 
 所有数据就是仓库里的 JSON 和图片文件，不依赖任何云服务。git 提交历史本身就是从 0 到 1 的迭代记录。Token 只存在本地浏览器，数据读写全走你自己的 GitHub 仓库。
 
 ## 技术栈
 
 纯静态前端（原生 HTML / CSS / JS）+ GitHub Contents API + GitHub Pages。`server.js` 是可选的本地预览服务器，零依赖（仅用 Node 内置 `http` 模块）。
