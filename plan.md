# 开发计划与进度

## 项目目标
wbw-graph-editor：基于 Vue3 + Canvas 的图论算法教学工具 —— 支持 6 种模式编辑（Select/Draw/Edit/Delete/Drag/Force），文本定义图（节点/边/权值/容量/费用/注释），力导向布局，最短路径/最大流/最小费用流算法动画，PNG/SVG 导出，友好的提示框与快捷键操作。

## 当前任务（已完成 ✔ 提交 3b9ce0c）
CDP 全量实测回归（cdp-test13.cjs，21 项断言全过，连续两轮 ALL PASS），修复实测发现的 2 个 bug。

### 已完成改动
| 文件 | 改动 |
|---|---|
| `src/components/GraphCanvas.vue` | tooltip 首次显示时 ref 未绑定导致定位停在 (0,0)——`updateTip()` 末尾追加 `nextTick(() => placeTip(lastMouseX, lastMouseY))` |
| `src/components/LeftPanel.vue` | deep watcher 同步 textarea 时未更新 `lastLoaded`，图变化（如有向/无向切换）会把 500ms 防抖窗口内未载入的编辑回退——watcher 同步时同时更新 `lastLoaded` |

### 验证结果（无头 Edge + CDP 实测，全部通过）
- [x] `npx vue-tsc --noEmit` 通过；`npm run build` 通过
- [x] 双击空白建点/双击节点弹窗/坐标编辑保存关闭/X=1000 持久化
- [x] Ctrl+Z 撤销坐标编辑/Ctrl+Y 重做（数值精确校验）
- [x] 新增节点 1→2 撤销 2→1 重做 1→2
- [x] 文本载入有向图 `0\n1\n0 1 5`（2 节点 1 边）
- [x] 双击边弹窗（权值 5、有向图翻转按钮可用）→ 翻转后文本变 `1 0 5`
- [x] ConfigPanel 7 滑块（含 4 新增）、边宽可调至 3；色板单组 8 色块
- [x] 顶栏中/EN 切换（Undo/撤销）+ localStorage `wbw-lang` 持久化
- [x] 实测方法论沉淀：工具提示锚点探测（anchorNear 16px 网格 + 位置校验）、两点视图标定（worldToScreen）、载入后力导向重新平衡导致节点快速移动 → 先固定全部节点再定位

## 下一步（待用户确认优先级）
按收益排序的候选优化/新需求：
1. **算法动画/速度控制增强**（如动画速率滑块、逐步执行、暂停/继续）
2. **保存/加载**：本地 localStorage 自动保存或 .txt 文件导入导出
3. **视觉增强**：深色主题
4. **算法面板补全**：更多图论算法、结果可视化
5. **性能优化**：大数据量图的渲染/布局优化

## 具体任务备忘
- 保持 `git -c user.name="wbw" -c user.email="wbw@local" commit` 提交约定；完成需求后 push 到 `origin`（https://github.com/wbw121124/wbw-graph-editor）
- 改动后必跑 `npx vue-tsc --noEmit` 与 `npm run build`
- 验证方式：`npm run preview` + 无头 Edge CDP 脚本（`C:\Users\yl\AppData\Local\Temp\opencode\cdp-test*.cjs`），端口 9222
- plan.md 随每次需求更新进度

## 历史已完成需求（均已提交）
- 提示框：纯 DOM、淡入飞入/淡出飞出、鼠标穿透、仅点/边 hover 显示
- 左侧 Graph Data 文本框可编辑（`lastLoaded` 防覆盖回写）；撤销按钮响应式修复
- 支持字母/中文节点标签，边格式 `in out [value maxflow cost comment]`（`_` 占位）
- 节点数 > 300 自动关闭排斥力（O(n²) 优化）+ 面板提示
- PNG 导出 4x 质量修复 + SVG 矢量导出（均不含边界线/遮罩；背景透明开关）
- ESC 取消连边、Select 模式 + Delete 删除、全模式快捷键、导出背景透明（850e633）
- 双击编辑弹窗（节点/边）、坐标编辑、边方向翻转、Ctrl+Z/Y 撤销重做快捷键（367b535/71734ed/e595c57/4e490c3）
- 样式配置：边宽/字号/箭头/网格间距滑块 + 颜色预设色板（3ddcd2f/41ce3d3/763e55e）
- i18n 双语言：语言基础设施/全组件文案/算法层与日志/匹配与网络流算法日志/顶栏切换按钮（8225664→e50f2f4）
- tooltip 首显定位 + 文本区 lastLoaded 同步修复（3b9ce0c）
- draw 模式双击加点（不再双击弹编辑框），单击空白不再加点（模式提示同步更新）
- draw 快速连击被浏览器合并为单次 dblclick（第 3/4 次只发 click detail 递增），改为点击链计数（500ms/8px 链、偶数次=双击加点），dblclick 兜底 80ms 去重；4 连击实测 [2,0]，两对双击 [4,0]（2+1+1 正确），cdp-test13 21 项全过（a4a6847）
