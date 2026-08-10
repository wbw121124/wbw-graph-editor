<template>
	<div class="section control-bar">
		<div class="btn-row">
			<button @click="playPause">
				{{ algoRunner.auto.value ? "暂停" : "播放" }}
			</button>
			<button @click="algoRunner.step()">单步</button>
			<button @click="algoRunner.cancel()">重置</button>
		</div>
		<div class="speed-row">
			<span class="dim">速度</span>
			<input
				type="range"
				min="40"
				max="2000"
				step="10"
				:value="algoRunner.speed.value"
				@input="onSpeed"
			/>
			<span class="val">{{ algoRunner.speed.value }}ms</span>
		</div>
		<div v-if="algoRunner.status === 'done'" class="done-msg">
			{{ algoRunner.doneMessage || "完成" }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { algoRunner } from "../algorithms/runner";

function playPause() {
	if (algoRunner.auto.value) algoRunner.pause();
	else algoRunner.play();
}

function onSpeed(e: Event) {
	algoRunner.speed.value = Number((e.target as HTMLInputElement).value);
}
</script>

<style scoped>
.control-bar {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.btn-row {
	display: flex;
	gap: 6px;
}

.btn-row button {
	flex: 1;
}

.speed-row {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
}

.speed-row input {
	flex: 1;
}

.val {
	font-family: Consolas, monospace;
	color: var(--accent);
	font-size: 11px;
	width: 44px;
	text-align: right;
}

.done-msg {
	font-size: 12px;
	color: var(--ok);
	font-weight: 600;
}
</style>
