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
    font-weight: 400;
}
:deep(.el-table) thead th{
    font-weight: 400;
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
.textCenter{
    text-align: center;
}
.width100{
    width: 100%;
}
.alignCenter{
	align-self: center;
}
.rightItem{
	margin-left: auto;
}
</style>
