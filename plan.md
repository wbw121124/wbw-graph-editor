# 开发计划与进度

## 项目目标
wbw-graph-editor：基于 Vue3 + Canvas 的图论算法教学工具 —— 支持 6 种模式编辑（Select/Draw/Edit/Delete/Drag/Force），文本定义图（节点/边/权值/容量/费用/注释），力导向布局，最短路径/最大流/最小费用流算法动画，PNG/SVG 导出，友好的提示框与快捷键操作。

## 当前任务（已完成 ✔ 提交 850e633）
一次性需求：ESC 取消连边、Select 模式 + Delete 删除、全模式键盘快捷键、导出背景透明。

### 已完成改动
| 文件 | 改动 |
|---|---|
| `src/types/graph.ts` | `EditorMode` 加 `'select'`；`GraphStyle` 加 `exportTransparentBg` |
| `src/store/theme.ts` | `graphStyle` 初始化 `exportTransparentBg: false` |
| `src/render/canvasRenderer.ts` | `UiHoverState` 加 `selectedEdgeId`；`drawEdge` 选中高亮（`theme.selected` + 线宽 2.6）；`drawScene` 加 `transparentBg` 参数（透明时跳过背景 fillRect，网格/边标签底色保留） |
| `src/composables/useCanvasInteraction.ts` | `onMouseUp` 加 select 分支：点节点/边选中（再点取消）、点空白取消；拖拽移动/平移照常 |
| `src/components/GraphCanvas.vue` | hover 加 `selectedEdgeId`；全局 `keydown`：ESC 清连边/选中，Delete/Backspace 在 select 模式删除选中节点/边，模式快捷键 `V`=select `D`=draw `E`=edit `X`=delete `G`=drag `F`=force；忽略 INPUT/TEXTAREA/SELECT/contenteditable 焦点 |
| `src/components/ModeToolbar.vue` | 加 Select 按钮 + hint |
| `src/components/ConfigPanel.vue` | 加"导出背景透明"复选框 |
| `src/render/svgExport.ts` | `buildSvg(graph, overlay, { transparentBg? })`，透明时跳过背景 rect |
| `src/components/CommandPanel.vue` | `emptyHover` 补 `selectedEdgeId`；PNG/SVG 导出读取 `graphStyle.exportTransparentBg` |

### 验证结果（无头 Edge + CDP 实测，全部通过）
- [x] `npx vue-tsc --noEmit` 通过；`npm run build` 通过
- [x] 模式快捷键全部生效（V/D/E/F/X/G 切换正确）
- [x] Delete 无选中时不误删（3 节点 3 边不变）
- [x] select 模式：单击选中节点 → Delete 删除（节点 3→2，边 3→1）
- [x] 导出背景透明复选框勾选生效、SVG 下载点击正常
- [x] **ESC 取消连边**（cdp-test12：固定全部 + 适应视图定位两节点 → draw 模式点 A → ESC → 点 B 无边 3→3；再点 A 无边 3→4，正常连边不受影响）
- [x] 已推送 origin（计划：保留 plan.md 全量记录）

## 下一步（待用户确认优先级）
按收益排序的候选优化/新需求：
1. **算法动画/速度控制增强**（如动画速率滑块、逐步执行、暂停/继续）
2. **编辑能力补全**：Edit 模式编辑边权/容量/费用弹出框、节点标签编辑
3. **保存/加载**：本地 localStorage 自动保存或 .txt 文件导入导出
4. **视觉增强**：深色主题、节点/边样式自定义面板
5. **i18n / 多语言**

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
