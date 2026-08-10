# wbw-graph-editor 开发计划

## 项目目标
构建一个类似 https://csacademy.com/app/graph_editor/ 的图论可视化编辑器，额外支持**图论算法演示**与**自定义算法**（用户编写 JS 代码驱动可视化动画）。

## 技术栈
- Vite 7 + Vue 3 + TypeScript
- Canvas 2D 手写渲染（零图库依赖）
- CodeMirror 6（自定义算法编辑器）
- 无 Pinia，模块级 reactive store

## 功能清单（对照）
### 编辑器核心（仿 CSAcademy）
- [x] 三栏布局：左栏（图数据/统计）· 中央画布 · 右栏（模式/配置/算法）
- [x] 四种模式：Draw（加节点/连边）、Edit（改标签/权重/容量/费用）、Delete（点删）、Force（力导向布局，点击固定/解固、拖拽后固定）
- [x] Graph Data 文本双向同步：`u` / `u v` / `u v w` / `u v w c f`（权重/容量/费用），自定义标签开关
- [x] 有向/无向切换、0-based/1-based 编号转换
- [x] 快照式撤销/重做（最多 300 步）
- [x] 缩放（滚轮以光标为中心）、空白拖拽平移
- [x] 样式配置：节点半径、边理想长度、节点填充/描边/标签/边颜色、网格开关
- [x] 命令：固定全部/解除固定、树形排列（DFS 树布局）、适应视图、下载 PNG、生成标记（Graph Data + LaTeX TikZ）、清空
- [x] Dark/Light 主题切换（CSS 变量 + Canvas 主题对象，localStorage 记忆，默认深色）

### 内置算法（generator 步进 + 统一事件流 + 播放/暂停/单步/速度）
- [x] 遍历：BFS、DFS
- [x] 最短路：Dijkstra、Bellman-Ford、SPFA、Floyd-Warshall（矩阵弹窗）
- [x] 最小生成树：Prim、Kruskal
- [x] 结构：环检测（三色法）、拓扑排序（Kahn）、Tarjan SCC（同色标注）
- [x] 网络流：Dinic、ISAP、MPM、HLPP（溢出量标注）、费用流 SSP、上下界流、最小割（割边标红）
- [x] 匹配：匈牙利最大匹配、最小点覆盖（König 构造）
- [x] 源点/汇点选择（下拉）、算法提示、日志面板、矩阵弹窗

### 自定义算法
- [x] 只读图 API `G`：nodeCount/nodes/labels/neighbors/edge/edges/isDirected/label
- [x] 可视化 API `api`：emit(事件)/await step()/log/done
- [x] CodeMirror 6 编辑器（语法高亮、跟随主题）
- [x] 预置模板：BFS、DFS、Dijkstra、Tarjan SCC、边着色
- [x] localStorage 保存管理（新建/保存/删除/选择）
- [x] 与内置算法共用播放控制条与日志

## 当前进度（截至 2026-08-10）
已完成 10 个步骤中的 9.5 个（含脚手架/数据层/渲染层/交互层/布局算法/编辑 UI/算法核心/高级算法/自定义算法；算法 UI 与整合已完成，正在收尾验证）。
已提交 commit：脚手架、数据层、渲染层、交互层、布局算法、编辑 UI、算法核心、高级算法、自定义算法（共 10 个 commit，master 分支）。

## 进行中：收尾修复（未完成，勿动）
1. **flow.ts 残量网络 rev 引用 bug（进行中）**
   - 已改：`Arc.rev` 从"全局 arcs 数组索引"改为"对偶弧对象引用"（buildNet 的 add 函数已改，第 33 行）
   - 未改完（8 处 `adj.get(...)![a.rev]` 需改为直接 `a.rev`）：
     - 94 行（sstFlow dfs）、146 行（dinic dfs）、211 行（isap aug）
     - 305 行（mpm pushToT）、317 行（mpm pullFromS 的 rev 取值）
     - 381 行（hlpp 源点推满）、392 行（hlpp push）、490 行（ssp 增广）
   - 验证：`npx esbuild smoke.ts --bundle --format=esm --outfile=smoke.mjs && node smoke.mjs` 全部 PASS 后，删除 smoke.ts / smoke.mjs / test-polyfill.ts
2. **交互层修复（已改，待验证提交）**：未按下鼠标时移动画布触发平移/拖拽 → 增加 `mouseDown` 标志（useCanvasInteraction.ts 已改，尚未提交）
3. 完成后依次执行：`npx vue-tsc --noEmit` → `npm run build` → 删除临时测试文件 → `git add -A && git commit`

## 待办
- [ ] 完成 flow.ts rev 引用修复（见上）
- [ ] 验证冒烟测试全部通过（BFS/Dijkstra/Floyd 已 PASS；Dinic/费用流曾因 rev bug 崩溃）
- [ ] 交互 bug 修复提交
- [ ] 删除临时测试文件（smoke.ts、smoke.mjs、test-polyfill.ts）
- [ ] 最终 build + 类型检查 + 提交
- [ ] 浏览器人工验收：画布交互、算法动画、自定义算法运行、主题切换、导出
