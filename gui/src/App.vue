<template>
	<div class="flexItem" @contextmenu="(e)=>{e.preventDefault();}" style="width: 100%">
		<index></index>
<!--		<router-view></router-view>-->
	</div>
</template>


<script lang="ts" setup>

import Index from "./view/index.vue";


</script>


<style>
*{
    font-family: PingFang SC;
}
.flexItem {
	display: flex;
	flex-wrap: wrap;
	flex-direction: row;
	height: 100%
}
.flexRow{
	display: flex;
	flex-direction: row;
}
.flexColumn {
	display: flex;
	flex-direction: column;
}

@font-face {
	font-family: 'PingFang SC';
	src: url('./assets/font/pfMedium.woff2');
}
.cursor{
	cursor: pointer;
}
.justCenter{
	justify-content: center;
}
.height100{
    height: 100%;
}
</style>
