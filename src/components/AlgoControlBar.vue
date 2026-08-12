<template>
	<div class="section control-bar">
		<div class="btn-row">
			<button @click="playPause">
				{{ algoRunner.auto.value ? t('ctrl.pause') : t('ctrl.play') }}
			</button>
			<button @click="algoRunner.step()">{{ t('ctrl.step') }}</button>
			<button @click="algoRunner.cancel()">{{ t('ctrl.reset') }}</button>
		</div>
		<div class="speed-row">
			<span class="dim">{{ t('ctrl.speed') }}</span>
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
			{{ algoRunner.doneMessage || t('ctrl.done') }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { algoRunner } from "../algorithms/runner";
import { t } from "../i18n";

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
