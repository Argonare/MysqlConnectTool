<script setup lang="ts">

import {ref} from "vue";
import {TabPaneName} from "element-plus";
import {useStore} from "vuex";
import {useRouter} from "vue-router";

const store = useStore()
const router = useRouter()
let tabIndex = 2
const activeTab = ref('2')
const editableTabs = ref([
	{
		title: 'Tab 1',
		name: '1',
		route: 'Tab 1 content',
	},
	{
		title: 'Tab 2',
		name: '2',
		route: 'Tab 2 content',
	},
])
const getAllTab = () => {
	return editableTabs.value
}
const tabClick = (tab) => {
	console.log("tab", tab);
	router.push({path: activeTab.value});
}
const tabRemove = (targetName) => {
	console.log("tabRemove", targetName);
	//首页不删
	if (targetName == '/') {
		return
	}
	store.commit('delete_tabs', targetName);
	if (activeTab === targetName) {
		// 设置当前激活的路由
		if (editableTabs.value && editableTabs.value.length >= 1) {
			this.$store.commit('set_active_index', editableTabs.value[editableTabs.value.length - 1].route);
			router.push({path: activeTab.value});
		} else {
			router.push({path: '/'});
		}
	}
}


defineExpose({
	getAllTab
})
</script>

<template>
	<el-tabs
		v-model="store._state.data.activeIndex"
		type="card"
		class="demo-tabs"
		tab-click="tabClick"
		tab-remove="tabRemove"
	>
		<el-tab-pane
			v-for="item in store._state.data.openTab"
			:key="item.name"
			:name="item.route"
			:label="item.name"
			style="height:100%"
		>
			<div style="height:100%">
				<router-view/>
			</div>
		</el-tab-pane>
	</el-tabs>
</template>

<style scoped>
.el-tabs__content{
	height: 100% !important;
}
.el-tabs{
	height: 100%;
}

</style>