# 个人驾驶台 · Personal Dashboard

> 透明毛玻璃（frosted-glass）风格的个人工作台：今日待办 / 本周 PAD / 季度 OKR / 月度复盘 / 周复盘，单一橙色强调色，数据 100% 本地持久化。

一个 Chrome 扩展 + GitHub Pages 双部署的小工具。打开新标签页即进入驾驶台，所有数据存储在 `localStorage` 里，不依赖任何后端。

## 🪟 在线预览

- **桌面端**：[GitHub Pages → index.html](https://zea76855.github.io/personal-dashboard/)
- **移动端**：[GitHub Pages → mobile.html](https://zea76855.github.io/personal-dashboard/mobile.html)

> 推荐 Chrome / Edge 桌面浏览器（毛玻璃 backdrop-filter 兼容性最好）。移动端浏览器会自动适配 4 标签底部导航布局。

## 📦 文件结构

| 文件 | 角色 |
|---|---|
| `index.html` | 桌面驾驶台（GitHub Pages 入口 / Chrome 新标签页） |
| `mobile.html` | 移动端 4 标签应用 |
| `popup.html` | Chrome 扩展图标点击弹窗 |
| `dashboard.js` | 桌面驾驶台逻辑（数据层/渲染层/弹窗/导入导出） |
| `mobile.js` | 移动端 Store→Computed→Views→Switch 架构 |
| `popup.js` | 浏览器图标弹窗逻辑 |
| `manifest.json` | Chrome MV3 扩展配置 |
| `.gitignore` | 忽略 macOS 临时文件 |

## 🚀 本地预览

不需要构建工具——纯静态 HTML。

```bash
# 方式 1：直接双击 index.html / mobile.html 在浏览器打开
open index.html

# 方式 2：起一个本地静态服务器（推荐，毛玻璃 backdrop-filter 在 file:// 下偶发失效）
python3 -m http.server 8080
# 然后访问 http://localhost:8080/
```

## 🧩 作为 Chrome 扩展加载

1. 打开 `chrome://extensions`
2. 右上打开「开发者模式」
3. 点「加载已解压的扩展程序」
4. 选择本仓库根目录（包含 `manifest.json` 的那一层）
5. 新标签页即可生效

## 💾 数据持久化

**所有数据都存在浏览器的 `localStorage` 里**，关闭浏览器、重启电脑后仍然存在。

| Key | 内容 | 来源 |
|---|---|---|
| `wb_pwd_init` | 首次初始化标记 | 0/1 |
| `wb_pwd_task` | 今日待办（任务） | 数组 |
| `wb_pwd_obj` | 季度 OKR / O | 数组 |
| `wb_pwd_kr` | KR（关键结果） | 数组 |
| `wb_pwd_hi` | 周复盘亮点 | 数组 |

桌面端键全部以 `wb_pwd_` 开头，移动端共用同一份键，桌面与移动自动数据互通。

### 数据导入 / 导出

头像 → 个人中心 → 数据管理：
- **导出备份**：下载 `personal-dashboard-backup-YYYYMMDD.json`，包含全部 state
- **载入示例**：恢复出厂数据
- **清除所有数据**：带二次确认的清空

## 🎨 设计原则

- 单一橙色强调色（`#EA543F` / `#F97316`），不引入第二色
- 毛玻璃 `backdrop-filter: blur(22px) saturate(180%)`
- 卡片入场错峰动画 + 模态弹出动画 + 进度条 scaleX 过渡
- 移动端底部 Tab 导航 + safe-area 适配
- 入场动画尊重 `prefers-reduced-motion`

## 📃 License

MIT
