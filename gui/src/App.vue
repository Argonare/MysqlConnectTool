<template>
	<div class="flexItem">
		<index></index>
		<router-view></router-view>
	</div>
</template>


<script lang="ts" setup>

import Index from "./view/index.vue";
</script>


<style>
.flexItem{
    display: flex;
    flex-wrap: wrap;
    height: 100%
}
@font-face {
  font-family: 'PingFangSC-Regular';
  src: url('./assets/font/PingFang Regular.ttf');
}
</style>
