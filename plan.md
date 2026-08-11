# 开发计划与进度

## 当前任务（进行中）
一次性需求：ESC 取消连边、Select 模式 + Delete 删除、全模式键盘快捷键、导出背景透明。

### 已完成（代码已改，未提交）
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

### 验证结果（无头 Edge + CDP 实测）
- [x] `npx vue-tsc --noEmit` 通过；`npm run build` 通过
- [x] 模式快捷键全部生效（V/D/E/F/X/G 切换正确）
- [x] Delete 无选中时不误删（3 节点 3 边不变）
- [x] select 模式：hover 扫描定位节点 → 单击选中 → Delete 删除（节点 3→2，边 3→1）
- [x] 导出背景透明复选框勾选生效、SVG 下载点击正常
- [ ] **ESC 取消连边**：代码已实现（keydown 机制已由 Delete 用例间接验证），端到端点击测试未跑完（headless 中节点屏幕命中区域仅 ~8px，定位困难；测试脚本 `cdp-test11.cjs` 卡在节点扫描）

### 后续步骤（恢复任务时）
1. 完成 ESC 取消连边端到端验证：方案 A = 输入文本后点"固定全部"锁定初始位置 + 点"适应视图"放大（fitView scale≈0.88，节点直径~18px 易命中），再点击两节点验证 ESC 中断连边；方案 B = 信任现有实现直接提交
2. 验证通过后提交：`git -c user.name="wbw" -c user.email="wbw@local" commit -m "feat: ESC取消连边，新增select模式(Delete删除/全模式快捷键)，导出背景透明"`

## 历史已完成需求（均已提交）
- 提示框：纯 DOM、对角绕开鼠标→简化跟随、淡入飞入/淡出飞出、鼠标穿透、仅点/边 hover 显示
- 左侧 Graph Data 文本框可编辑（`lastLoaded` 防覆盖回写）；撤销按钮响应式修复
- 支持字母/中文节点标签，边格式 `in out [value maxflow cost comment]`（`_` 占位）
- 节点数 > 300 自动关闭排斥力（O(n²) 优化）+ 面板提示
- PNG 导出 4x 质量修复 + SVG 矢量导出（均不含边界线/遮罩；背景透明开关）
