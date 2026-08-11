<template>
  <div class="section">
    <h3>样式配置</h3>
    <div class="cfg-row">
      <span class="label">节点半径</span>
      <input v-model.number="style.nodeRadius" type="range" min="10" max="45" />
      <span class="val">{{ style.nodeRadius }}</span>
    </div>
    <div class="cfg-row">
      <span class="label">边理想长度</span>
      <input v-model.number="style.edgeIdealLength" type="range" min="50" max="300" step="5" />
      <span class="val">{{ style.edgeIdealLength }}</span>
    </div>
    <div class="cfg-row">
      <span class="label">排斥强度</span>
      <input v-model.number="style.repulsionK" type="range" min="0" max="6000000" step="100000" />
      <span class="val">{{ style.repulsionK }}</span>
    </div>
    <div class="cfg-row">
      <span class="label">节点填充</span>
      <input v-model="style.nodeFill" type="color" />
      <button class="reset" @click="style.nodeFill = ''">默认</button>
    </div>
    <div class="cfg-row">
      <span class="label">节点描边</span>
      <input v-model="style.nodeStroke" type="color" />
      <button class="reset" @click="style.nodeStroke = ''">默认</button>
    </div>
    <div class="cfg-row">
      <span class="label">标签颜色</span>
      <input v-model="style.labelColor" type="color" />
      <button class="reset" @click="style.labelColor = ''">默认</button>
    </div>
    <div class="cfg-row">
      <span class="label">边颜色</span>
      <input v-model="style.edgeColor" type="color" />
      <button class="reset" @click="style.edgeColor = ''">默认</button>
    </div>
    <label class="check"><input v-model="style.showGrid" type="checkbox" /> 显示网格</label>
  </div>
</template>

<script setup lang="ts">
import { graphStyle } from '../store/theme'

const style = graphStyle
</script>

<style scoped>
.cfg-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.cfg-row .label {
  width: 66px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-dim);
}

.cfg-row input[type='range'] {
  flex: 1;
  min-width: 0;
}

.cfg-row input[type='color'] {
  width: 34px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  background: none;
  cursor: pointer;
}

.val {
  width: 30px;
  text-align: right;
  font-size: 12px;
  color: var(--accent);
  font-family: Consolas, monospace;
}

.reset {
  padding: 2px 8px;
  font-size: 11px;
}

.check {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text);
}
</style>
