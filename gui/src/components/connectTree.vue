<script setup lang="ts">

import {TreeOptionProps} from "element-plus/es/components/tree/src/tree.type";
import {getCurrentInstance, reactive, ref, toRaw} from "vue";
import {ElMessage} from "element-plus";
import {useRouter} from "vue-router";

const router = useRouter()
const {proxy}: any = getCurrentInstance();

const tree = ref()
const refreshData = () => {
	console.log("refresh")
	let saved: Tree[] = JSON.parse(localStorage.getItem("connect"))

	if (saved == null) {
		return [];
	}
	saved.forEach((e, index) => {
		e.id = index
	})
	return saved
}

let data = reactive<Tree[]>(refreshData())
const refreshTreeNode = (unid) => {
	let node = tree.value.getNode(unid);
	if (node) {
		node.loaded = false;
		node.expand();
	}
}
const addData = (treeData: object) => {
	let saved: Tree[] = JSON.parse(localStorage.getItem("connect"))
	if (saved == null) {
		saved = []
	}
	treeData.id = saved.length
	saved.push(<Tree>treeData)
	tree.value!.append(treeData)
	localStorage.setItem("connect", JSON.stringify(saved))
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

const handleNodeClick = (data: Tree) => {
	router.push({path: "/connectDialog"})
	console.log(data)
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
		console.log(d)
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
	<el-tree :data="data"
	         :load="loadNode"
	         lazy
	         node-key="id"
	         :props="defaultProps"
	         @node-click="handleNodeClick"
	         :expand-on-click-node="false"
	         ref="tree"
	         empty-text=""/>
</template>

<style scoped>
.el-tree {
	height: 100%;
}
</style>