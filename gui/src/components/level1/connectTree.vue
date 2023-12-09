<script setup lang="ts">

import {TreeOptionProps} from "element-plus/es/components/tree/src/tree.type";
import {getCurrentInstance, onMounted, reactive, ref, toRaw} from "vue";
import {useRouter} from "vue-router";
import {useStore} from "vuex";

const router = useRouter()
const {proxy}: any = getCurrentInstance();
const store = useStore()
const tree = ref()

let tmpData = []

const getSavedData = () => {
	return new Promise((resolve) => {
		proxy.$request("get_config", {}).then(data => {
			data.forEach(e => {
				e = <Tree>e
			})
			let saved: Tree[] = data
			if (saved == null) {
				return [];
			}
			saved.forEach((e, index) => {
				e.id = index
				tree.value!.append(e)
			})
			tmpData = saved
			store.state.connectList = saved
			resolve(saved)
		})
	})

}

onMounted(() => {
	getSavedData()
})


const refreshData = async () => {

	return <Tree []>getSavedData()
}

let data = reactive<Tree[]>([])

const addData = (treeData: object) => {
	treeData.id = data.length
	tree.value!.append(treeData)
	tmpData.push(treeData)
	store.state.connectList = tmpData
	proxy.$request("save_config", tmpData).then(data => {

	})
}


interface Tree {
	id: number
	name: string
	ip: string
	username: string
	password: string
	port: number
	level: number
	database: string
	children?: database[]
}

interface database {
	name: string
	children?: table[]
}

interface table {
	name: string
}

let clickNum = 0
const handleNodeClick = (data: Tree) => {
	clickNum++;
	setTimeout(function () {
		if (clickNum === 2) {
			if (data.level == 3) {
				console.log("点击了左侧菜单")
				let connect_data = toRaw(tree.value.getNode(data.id).parent.parent.data)
				store.state.lastConnect = connect_data
				connect_data.database = data.databases
				connect_data.table = data.name
				connect_data.nickName = data.name
				delete connect_data.sql
				router.push({path: "/DataTable", query: connect_data})
			}
		}
		clickNum = 0
	}, 300)


}


let defaultProps: TreeOptionProps = {
	children: 'children',
	label: 'name',
	isLeaf: 'leaf',
}

const loadNode = (node: Node, resolve: (data: Tree[]) => void) => {
	if (node.level === 1) {
		proxy.$request("get_database", toRaw(node.data)).then(data => {
			data.forEach(e => {
				e = <Tree>e
			})
			return resolve(data)
		})
	} else if (node.level === 2) {

		let d = JSON.parse(JSON.stringify(toRaw(node.parent.data)))
		d.database = node.data.name
		proxy.$request("get_table", d).then(data => {
			data.forEach(e => {
				e = <Tree>e
			})
			console.log(data)
			return resolve(data)
		})
	} else {

		resolve(data)
	}

}
let currentData = null;
const showMenuPosition = (event, data, node: Node) => {
	currentData = node
	showMenu.value = data.level

	let menu = document.querySelector("#menu");
	let item = menu.parentElement

	menu["style"].left = event.clientX - item.offsetLeft + "px";
	menu["style"].top = event.clientY - item.offsetTop + "px";
	// 改变自定义菜单的隐藏与显示
	menu["style"].display = "block";
	menu["style"].zIndex = 1000;
}
document.addEventListener('click', e => {
	showMenu.value = 0
})
const showMenu = ref(0)
defineExpose({
	addData,
	refreshData
})
const addTable = () => {
	let data = toRaw(currentData.parent.data)
	let connect_data = toRaw(currentData.parent.parent.data)
	store.state.lastConnect = connect_data
	connect_data.database = data.Database
	connect_data.table = currentData.data.name
	connect_data.nickName = data.name
	delete connect_data.sql
	console.log(connect_data)
	router.push({path: "/tableEdit", query: connect_data})
}
const deleteTable = () => {

}
const editTable = () => {

}
</script>
<template>
	<el-scrollbar style="height: 100%;">
		<el-tree :data="data"
		         :load="loadNode"
		         lazy
		         node-key="id"
		         :props="defaultProps"
		         @node-click="handleNodeClick"
		         :expand-on-click-node="false"
		         ref="tree"
		         :highlight-current="true"
		         @node-contextmenu="showMenuPosition"
		         empty-text=""/>
	</el-scrollbar>
	{{ showMenu }}
	<div v-show="showMenu!=0" id="menu" class="menuDiv">
		<div class="menuUl" v-if="showMenu==3">
			<p @click="editTable">设计表</p>
			<p @click="addTable">新建表</p>
			<p @click="deleteTable">删除表</p>
			<el-divider/>
		</div>
	</div>
</template>

<style scoped>
/deep/ .el-tree {
	min-width: 100%;
	height: 100%;
	display: inline-block !important;
}

#menu {
	position: absolute;

	.menuUl > p {
		margin: 0;
		cursor: pointer;
		border-bottom: 1px solid rgba(255, 255, 255, 0.47);
		padding: 5px 1.5em;
		font-size: 12px;

		&:hover {
			background-color: #eee;
		}
	}

	.menuUl {
		min-width: 70px;
		height: auto;
		font-size: 14px;
		text-align: left;
		border-radius: 3px;
		background-color: #fff;
		color: black;
		list-style: none;
		border: 1px solid #ccc;
		padding: 0;

	}
}
</style>