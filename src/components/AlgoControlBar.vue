<template>
	<div class="section control-bar">
		<div class="btn-row">
			<button @click="playPause">
				{{ runner.auto.value ? t('ctrl.pause') : t('ctrl.play') }}
			</button>
			<button @click="runner.step()">{{ t('ctrl.step') }}</button>
			<button @click="runner.cancel()">{{ t('ctrl.reset') }}</button>
		</div>
		<div class="btn-row">
			<button :disabled="!runner.canBookmark" @click="addBookmark">{{ t('ctrl.bookmarkAdd') }}</button>
		</div>
		<div v-if="runner.bookmarks.value.length > 0" class="bookmark-row">
			<span class="dim">{{ t('ctrl.bookmarks') }}</span>
			<span
				v-for="bm in runner.bookmarks.value"
				:key="bm.id"
				class="bookmark-chip"
				:title="t('ctrl.bookmarkJump')"
				@click="runner.jumpToBookmark(bm.id)"
			>
				{{ bm.name }}
				<span class="chip-x" @click.stop="runner.removeBookmark(bm.id)">×</span>
			</span>
		</div>
		<div class="speed-row">
			<span class="dim">{{ t('ctrl.speed') }}</span>
			<input
				type="range"
				min="40"
				max="2000"
				step="10"
				:value="runner.speed.value"
				@input="onSpeed"
			/>
			<span class="val">{{ runner.speed.value }}ms</span>
		</div>
		<div v-if="runner.status === 'done'" class="done-msg">
			{{ runner.doneMessage || t('ctrl.done') }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { algoRunner, type AlgorithmRunner } from "../algorithms/runner";
import { t } from "../i18n";

const props = defineProps<{ runner?: AlgorithmRunner }>();
const runner = computed(() => props.runner ?? algoRunner);

function playPause() {
	if (runner.value.auto.value) runner.value.pause();
	else runner.value.play();
}

function onSpeed(e: Event) {
	runner.value.speed.value = Number((e.target as HTMLInputElement).value);
}

function addBookmark() {
	runner.value.addBookmark();
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

.bookmark-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
	font-size: 11px;
}

.bookmark-chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	background: var(--panel-2);
	border: 1px solid var(--border);
	border-radius: 10px;
	padding: 2px 8px;
	cursor: pointer;
	color: var(--accent);
}

.bookmark-chip:hover {
	border-color: var(--accent);
}

.chip-x {
	color: var(--text-dim);
	padding: 0 2px;
}

.chip-x:hover {
	color: #e05555;
}
</style>