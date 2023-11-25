<template>
	<el-menu
		:default-active="activeIndex"
		class="menu"
		mode="horizontal"
		@select="handleSelect"
	>
		<el-sub-menu index="1">
			<template #title>文件</template>
			<el-menu-item index="2-1">新建</el-menu-item>
		</el-sub-menu>
	</el-menu>
</template>

<script lang="ts" setup>

import {ref} from "vue";

const activeIndex = ref('1')
const handleSelect = (key: string, keyPath: string[]) => {
	console.log(key, keyPath)
}

</script>


<style scoped>
.el-sub-menu__icon-arrow {
	display: none;
}
</style>
<style lang="scss">
:root {
	--el-menu-icon-width: 0px
}
</style>