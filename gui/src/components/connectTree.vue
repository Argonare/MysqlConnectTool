<script setup lang="ts">

import {TreeOptionProps} from "element-plus/es/components/tree/src/tree.type";
import {getCurrentInstance, reactive, ref, toRaw} from "vue";
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
				console.log("click")
				let connect_data = toRaw(tree.value.getNode(data.id).parent.parent.data)
				store.state.lastConnect = connect_data
				console.log(connect_data)
				connect_data.table = data.name
				connect_data.nickName = data.name
				router.push({path: "/DataTable", query: connect_data})
				// router.push({name: "表格数据", state : {data: JSON.stringify(connect_data)}})
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

		let d = toRaw(node.parent.data)
		d.database = node.data.name
		proxy.$request("get_table", d).then(data => {
			data.forEach(e => {
				e = <Tree>e
			})
			return resolve(data)
		})
	} else {

		resolve(data)
	}

}
defineExpose({
	addData,
	refreshData
})
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
		         empty-text=""/>
	</el-scrollbar>
</template>

<style scoped>
/deep/ .el-tree {
	min-width: 100%;
	height: 100%;
	display: inline-block !important;
}
</style>