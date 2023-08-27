<script setup lang="ts">
import {Codemirror} from "vue-codemirror";
import {javascript} from "@codemirror/lang-javascript";
import {oneDark} from "@codemirror/theme-one-dark";
import {ref} from "vue";


const code = ref(`console.log('Hello, world!')`);
const extensions = [javascript()];

</script>

<template>
	<codemirror
		v-model="code"
		placeholder="Code gose here..."
		:style="{ height: '400px' }"
		:autofocus="true"
		:indent-with-tab="true"
		:tabSize="2"
		:extensions="extensions"
	/>
</template>

<style scoped>

</style>