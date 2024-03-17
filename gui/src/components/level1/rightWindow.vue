<script setup lang="ts">

import {ref} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";

const store = useStore()
const router = useRouter()
const panel = ref(null)
const getPramData = (path) => {
	let param = {}
	if (path.indexOf("?") != -1) {
		let params = path.split("?")[1].split("&")
		params.forEach(e => {
			param[e.split("=")[0]] = e.split("=")[1]
		})
	}
	return param
}
const tabClick = (tab) => {
	console.log("点击了页签")
	let path = store.state.openTab[Number(tab.index)].route
	let param = getPramData(path)
	store.state.lastConnect = param
	router.push({path: path, query: param});
}
const tabRemove = (targetName) => {
	//首页不删
	console.log(222)
	// if (targetName == '/' || targetName == "/empty") {
	//     return
	// }
	store.commit('delete_tabs', targetName);
	if (store.state.activeIndex === targetName) {
		// 设置当前激活的路由
		if (store.state.openTab && store.state.openTab.length >= 1) {
			let path = store.state.openTab[store.state.openTab.length - 1].route
			store.commit('set_active_index', path);
			let param = getPramData(path)
			router.push({path: store.state.activeIndex, query: param});
		} else {
			router.push({path: '/'});
		}
	}
}
const getData = () => {
	panel.value.getData()
}
//禁止鼠标中键
document.addEventListener("mousedown", function (mouseEvent) {
	if (mouseEvent.button != 1) {
		return;
	}
	console.log(mouseEvent)
	if (mouseEvent.target.className.indexOf("el-tabs__item")!=-1) {
		let url=mouseEvent.target.id.replace("tab-","");
		store.commit('delete_tabs', url);
	}
	mouseEvent.preventDefault();
	mouseEvent.stopPropagation();
});


defineExpose({
	getData
})
</script>

<template>
	<el-tabs
		v-model="store.state.activeIndex"
		type="card"
		class="demo-tabs"
		@tab-click="tabClick"
		@tab-remove="tabRemove"
		v-if="store.state.openTab.length"
		:closable="true"
	>
		<el-tab-pane
			v-for="item in store.state.openTab"
			:key="item.name"
			:name="item.route"
			:label="item.nickName"
			style="height:100%"
		>
			<div class="panel" ref="panel">
				<router-view/>
			</div>
		</el-tab-pane>
	</el-tabs>
</template>

<style scoped>
/deep/ .el-tabs__content {
	height: calc(100% - 40px);
}

.panel {
	display: flex;
	flex-direction: column;
	height: 100%
}

.el-tabs {
	height: 100%;
}

/deep/ .el-tabs__header {
	margin-bottom: 0 !important;
}

/deep/ .el-tabs__header {
	background: white;
}
</style>