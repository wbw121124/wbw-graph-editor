# 开发计划与进度

## 项目目标
wbw-graph-editor：基于 Vue3 + Canvas 的图论算法教学工具 —— 支持 6 种模式编辑（Select/Draw/Edit/Delete/Drag/Force），文本定义图（节点/边/权值/容量/费用/注释），力导向布局，最短路径/最大流/最小费用流算法动画，PNG/SVG 导出，友好的提示框与快捷键操作。

## 当前任务
继续todo列表的剩下任务（批3c~批4，任务列表：批1: C9 URL 分享 + C10 剪贴板PNG + C11 GitHub链接 + A3 快捷键弹窗 + B8 环形/网格布局 + 右键菜单
批2: A2 算法书签+日志导出 (runner 工厂/快照/静默重放)
批2b: A4 算法对比模式 (复用书签基建)
批3a: B5 自环支持 (创建/编辑/双锚点出入几何+命中)
批3b: 边视觉绕点路由 (渲染+temp边+命中+SVG导出)
批3c: B6 框选批量操作 (rect选择/批量移动删除固定)
批4: B7 样式撤销 (统一历史 [graph,style])
验证: vue-tsc+build+CDP 探针/回归+Node单测 (自环解析/路由/布局)
plan.md 记录 + 分批提交推送）

### 已完成改动
| 文件                             | 改动                                                                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/GraphCanvas.vue` | tooltip 首次显示时 ref 未绑定导致定位停在 (0,0)——`updateTip()` 末尾追加 `nextTick(() => placeTip(lastMouseX, lastMouseY))`                            |
| `src/components/LeftPanel.vue`   | deep watcher 同步 textarea 时未更新 `lastLoaded`，图变化（如有向/无向切换）会把 500ms 防抖窗口内未载入的编辑回退——watcher 同步时同时更新 `lastLoaded` |

剩下请看 git 历史

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
- [ ] 
剩下请看 git 历史

## 下一步（待用户确认优先级）
请自行思考

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
- 力导向：repulsionK>0 时弹簧力误用 d²/k（恒吸引、无胡克恢复，理想长度近乎无感），改为恒用 (d-k)*2；`Math.min(mag,50)` 步长上限提为可调 `maxMoveStep`（ConfigPanel 滑块 5-200）；Node 单测验证（k=300 收敛≈309，旧≈151；cap 5/200 快慢区分；repK=0 收敛 120 无回归）（35214d9）
- 剩下请看 git 历史

## 写给大语言模型
请你使用中文思考进行思考，每次修改后请记得 `git commit`