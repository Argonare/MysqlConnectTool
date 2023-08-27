<script lang="ts" setup>

import {onMounted, ref, watch} from 'vue'
import ConnectDialog from "@/components/connectDialog.vue";
import MenuItem from "@/components/menuItem.vue";
import ConnectTree from "@/components/connectTree.vue";
import RightWindow from "@/components/rightWindow.vue";

import {onBeforeRouteUpdate, useRoute, useRouter} from 'vue-router'

import {useStore} from '@/../store'

const route = useRoute()
const router = useRouter()
const store = useStore()
const connectDialog = ref(null)
const connectTree = ref(null)
const rightWindow = ref(null)

const connectData = (params: Object) => {
	connectTree.value.addData(params)
};
onMounted(() => {
	connectTree.value.refreshData()
	if (route.path !== '/') {
		console.log('1');
		store.commit('add_tabs', {route: '/', name: '首页'});
		store.commit('add_tabs', {route: route.path, name: route.name});
		store.commit('set_active_index', route.path);
	} else {
		// 	console.log('2');
		// 	store.commit('add_tabs', {route: '/', name: '首页'});
		// 	store.commit('set_active_index', "/");
		// 	router.push('/');
	}
});
watch(router.currentRoute, () => {
	let flag = false;
	for (let item of store.state.openTab) {
		console.log("item.name", item.name)
		console.log("t0.name", route.name)

		if (item.name === route.name) {
			console.log('to.path', route.path);
			store.commit('set_active_index', route.path)
			flag = true;
			break;
		}
	}

	if (!flag) {
		console.log('to.path', route.path);
		store.commit('add_tabs', {route: route.path, name: route.name});
		store.commit('set_active_index', route.path);
	}
});


const addConnect = () => {
	connectDialog.value.show()
}
const openEditor = () => {
	let param = ""
	// for (let i = store.state.openTab.length - 1; i <= 0; i--) {
	// 	if (store.state.openTab[i].length>0 && store.state.openTab[i].indexOf("tableData") > 0) {
	// 		param = store.state.openTab[i].split("?")[1]
	// 		break
	// 	}
	// }
	router.push({path: "/sqlEditor"})
}
</script>

<template>
	<menu-item></menu-item>
	<div class="scroll">
		<el-col :span="24" class="flex" style="height: 62px">
			<div class="flex flexColumn iconItem" @click="addConnect">
				<Connection class="btnIcon"/>
				<div>
					连接
				</div>
			</div>
			<div class="flex flexColumn iconItem" @click="openEditor">
				<Edit class="btnIcon"/>
				<div>
					查询
				</div>
			</div>
		</el-col>
		<el-col :span="6" class="height100">
			<connect-tree ref="connectTree"></connect-tree>
		</el-col>
		<el-col :span="18" class="height100">
			<right-window ref="rightWindow"></right-window>
		</el-col>
	</div>
	<connect-dialog ref="connectDialog" @onReceiveMsg="connectData"></connect-dialog>
</template>

<style scoped>
.height100 {
	height: calc(100% - 62px);
}

.btnIcon {
	height: 2em;
	font-size: 1em;
}

.iconItem {
	width: 4em;
	height: 4em;
	padding: 0.2em 0.3em;
}

.iconItem:hover {
	background: #79bbff;
	cursor: pointer;
}

.iconItem:hover div, .iconItem:hover .btnIcon {
	color: white;
}

.iconItem > div {
	width: 100%;
	font-size: 12px;
	text-align: center;
}

.flex {
	display: flex;
}

.flexColumn {
	flex-direction: column;
	justify-content: center;
}


.scroll {
	overflow: scroll;
	background-color: #F7F7F7;
	display: flex;
	flex-wrap: wrap;
	height: 100%;
}

</style>