<template>
	<div class="flexItem" @contextmenu="(e)=>{e.preventDefault();}">
		<index></index>
		<router-view></router-view>
	</div>
</template>


<script lang="ts" setup>

import Index from "./view/index.vue";


</script>


<style>
.flexItem {
	display: flex;
	flex-wrap: wrap;
	height: 100%
}
.flexRow{
	display: flex;
	flex-direction: row;
}
.flexColumn {
	display: flex;
	flex-direction: column;
	justify-content: center;
}

@font-face {
	font-family: 'PingFangSC-Regular';
	src: url('./assets/font/PingFang Regular.ttf');
}
.cursor{
	cursor: pointer;
}
</style>
