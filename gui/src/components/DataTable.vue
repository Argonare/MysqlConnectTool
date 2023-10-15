<script setup lang="ts">
import {useRoute} from "vue-router";
import {getCurrentInstance, nextTick, onMounted, reactive, ref, toRaw} from "vue";

const {proxy}: any = getCurrentInstance();
const route = useRoute();
const table = ref()
const ht = ref(300)
const tableColumn = reactive([])
const tableData = ref([])
const contextmenu = ref(null)
const menuFlag = ref(null)

let primaryKey = ""
let oldValue = null
let changedData = null
let field = {}
let pageSize = 100
let currentPage = 1
let count = 0
let rightClickItem = ref("")
let showMenu = ref(false)


calHeight()
onMounted(() => {
	console.log(route.query)
	proxy.$request("desc_table", route.query).then(data => {
		let tableDesc = []
		data.forEach(e => {
			if (e.Key != "") {
				primaryKey = e.Field
			}
			field[e.Field] = e
			tableColumn.push({prop: e.Field, label: e.Field})
		})
		console.log(field)
	})
	getData()

})
const getData = () => {
	let param = JSON.parse(JSON.stringify(route.query))
	param.pageSize = pageSize
	param.currentPage = currentPage
	proxy.$request("get_data", param).then(data => {
		tableData.value = data.list
		count = data.count
		console.log(data)
	})
}
const flexWidth = (title, fontSize = 16) => {
	if (tableData.value.length === 0) { //表格没数据不做处理
		return;
	}
	let titleWidth = 0
	let canvas = document.createElement("canvas");
	let context = canvas.getContext("2d");
	context.font = fontSize + "px PingFangSC-Regular";
	let trueWidth = context.measureText("这里放了六字").width
	titleWidth = context.measureText("title").width
	if (trueWidth < titleWidth) {
		trueWidth = titleWidth
	}
	return trueWidth + 24;
}


const iptBlur = (scope, e: any) => {
	// 输入框失焦之后，背景颜色变为粉色

	let newValue = scope.row[scope.column.label]
	//判断是否修改
	if (oldValue != newValue) {
		if (changedData == null) {
			changedData = {}
		}
		let key = scope.column.label
		if (changedData[scope.row["@uuid"]] == null) {
			changedData[scope.row["@uuid"]] = {}
			changedData[scope.row["@uuid"]]["primaryKey"] = primaryKey
		}
		changedData[scope.row["@uuid"]][key] = {value: newValue, type: field[scope.column.label].Type}
		e.target.parentElement.classList.add("changed")
	}
	console.log(changedData)
}

let editX = ref(null);
let editY = ref(null);
let chooseData = null
const cellClick = (scope) => {
	console.log("点击了" + scope.$index + " " + scope.column.no)
	chooseData = scope
	oldValue = tableData.value[scope.$index][scope.column.label]
	// request_update(scope)
	editX.value = scope.$index
	editY.value = scope.column.no
	// setTimeout(() => {
	// 	document.getElementById("ipt").focus()
	// })


}
const request_update = (scope) => {
	//判断是否同一行，不是同一行更新
	if (editX.value != null && editX.value != scope.$index && changedData != null) {
		proxy.$request("update_table", Object.assign({}, route.query, {updateData: changedData})).then(data => {

		})
		setTimeout(() => {
			let dom = document.querySelectorAll(".changed")
			for (let i = 0; i < dom.length; i++) {
				dom[i].classList.remove("changed")
			}
		},)

		changedData = null
	}
}

function calHeight() {
	nextTick(() => {
		ht.value = document.querySelector('.el-table').parentElement.clientHeight - 45
	})
}

const handleSizeChange = (val: number) => {
	console.log("handleSizeChange", val);
	pageSize = val;
	getData()
}
const handleCurrentChange = (val: number) => {
	console.log(`current page: ${val}`);
	currentPage = val;
	getData()
}
window.addEventListener('resize', calHeight)
defineExpose({
	getData
})
document.onkeydown = function (e) {
	var evt = window.event || e;
	if (route.path != "/DataTable") {
		// evt.preventDefault();
		return;
	}

	var code = evt.keyCode || evt.which;
	console.log(code)
	if (code == 116) {
		if (evt.preventDefault) {
			evt.preventDefault();
			getData()
		} else {
			evt.keyCode = 0;
			evt.returnValue = false
		}
	}
}
const globalClick = () => {

}
//type=1 菜单 2 单元格 3 index
const rightClick = (row, column, cell, event, type = 2) => {

	console.log("点击了右键")
	// menuFlag=line 右击了第一列的icon，操作一整行

	if (column.no == 0) {
		menuFlag.value = "line"
	} else {
		menuFlag.value = "cell"
	}
	rightClickItem.value = row

}
//设置菜单出现的位置
const showMenuPosition = (event) => {
	let menu = document.querySelector("#menu");
	let item = menu.parentElement.parentElement.parentElement.parentElement.parentElement
	showMenu.value = true
	menu.style.left = event.clientX - item.offsetLeft + "px";
	menu.style.top = event.clientY - item.offsetTop - 50 + "px";
	// 改变自定义菜单的隐藏与显示
	menu.style.display = "block";
	menu.style.zIndex = 1000;
}
const rowClicked = () => {
	menuFlag.value = true
}
const setEmpty = (flag) => {
	console.log("点击了设置空白字符串" + flag)
	let row = rightClickItem.value
	for (let item in row) {
		if (item == "@uuid") {
			continue
		}
		row[item] = ""
	}
	rightClickItem.value = row
}
const setNull = (flag) => {
	console.log("点击了设置null" + flag)
	let row = rightClickItem.value
	for (let item in row) {
		if (item == "@uuid") {
			continue
		}
		row[item] = null
	}
	rightClickItem.value = row
}

document.addEventListener('click', e => {
	showMenu.value = false
})
const clearSelected = () => {
	selectedRow.value.clear()
	selectedCell.value.clear()
}
//列全选右键
const selectedRow = ref(new Set([]))
const rowRightClick = (row, event, showMenu = false) => {
	clearSelected()
	document.getElementsByClassName("table")[0].classList.add("showTree")
	selectedRow.value.add(row.$index)
	if (showMenu) {
		showMenuPosition(event)
	}
}

const selectedRowClass = (arg) => {
	if (selectedRow.value.has(arg.rowIndex)) {
		return 'selectedRow'
	}
	return ''
}
//单元格右键
const selectedCell = ref(new Set([]))
const cellRightClick = (row, event, showMenu = false) => {
	clearSelected()
	document.getElementsByClassName("table")[0].classList.remove("showTree")
	selectedCell.value.add(row.$index+","+row.cellIndex)
	console.log(row)
	if (showMenu) {
		showMenuPosition(event)
	}
}
const selectedCellClass=({ row, column, rowIndex, columnIndex })=>{
	if(selectedCell.value.has(rowIndex+","+columnIndex)){
		return 'selectedRow subCell'
	}
	return 'subCell'
}
</script>

<template>
	<el-table :data="tableData" border class="table" ref="table" :fit="true" table-layout='auto'
	          :max-height="ht"
	          @header-contextmenu=" (row, column,cell, event) =>rightClick(row, column,cell, event,1)"
	          @contextmenu="globalClick"
	          :row-class-name="selectedRowClass"
	          :scrollbar-always-on="true" header-cell-class-name="headCell" :cell-class-name="selectedCellClass">
		<el-table-column label="" width="40px" align="center">
			<template #default="scope">
				<div @click="rowRightClick(scope,null)"
				     @click.right="(event)=>rowRightClick(scope,event,true)">
					<el-icon>
						<DArrowRight/>
					</el-icon>
				</div>
			</template>
		</el-table-column>
		<el-table-column v-for="item in tableColumn" :key="item.prop" :prop="item.prop" :label="item.label"
		                 :width="flexWidth(item.label)" :min-width="0" :show-overflow-tooltip="true">
			<template #header>
				{{ item.label }}
			</template>
			<template #default="scope">

				<input v-if="editX==scope.$index&& editY==scope.column.no"
				       v-model="scope.row[item.prop]" id="ipt" class="ipt" v-focus
				       :placeholder="scope.row[item.prop]==null?'NULL':''"
				       @blur="iptBlur(scope, $event)"/>
				<div class="iptDiv" v-else
				     @click.right="(event)=>cellRightClick(scope,event,true)"
				     @click="cellClick(scope)">{{ scope.row[item.prop] }}
				</div>

			</template>
		</el-table-column>
	</el-table>
	<el-pagination
		background
		class="pagination"
		:total="parseInt(count)"
		v-model:page-size="pageSize"
		v-model:current-page="currentPage"
		:page-sizes="[10, 30, 50, 100]"
		@size-change="handleSizeChange"
		@current-change="handleCurrentChange"
		layout="total, sizes, prev, pager, next, jumper"
	/>
	<div v-show="showMenu" id="menu" class="menuDiv">
		<div class="menuUl">
			<p @click="setEmpty">设置为空白字符串</p>
			<p>设置为 NULL</p>
			<el-divider/>
			<p>删除</p>
		</div>
	</div>
</template>

<style scoped>

/deep/  tr:hover > td {
	background-color: unset  !important;
}
/deep/  tr:hover > td.selectedRow {
	background: #409EFF !important;
}
/deep/ .selectedRow {
	background: #409EFF !important;
	color: white;
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

.table {
	width: 100%;
	height: 100%;
}

/deep/ .el-divider {
	margin: 5px 0;
	width: auto;
}

/deep/ .changed {
	background: rgb(247, 236, 254);
}

/deep/ .headCell .cell {
	color: #333;
	font-size: 10px;
}

/deep/ .ipt {
	border: none;
	outline: none;
	padding: 0 5px;
	width: -webkit-fill-available;
	height: 23px;
}

/deep/ .el-popper {
	display: none !important;
}

/deep/ .iptDiv {
	padding: 0 5px;
	width: 100%;
	display: list-item;
}

/deep/ .ipt:hover {
	background: rgb(245, 247, 250);
}

/deep/ .subCell {
	padding: 0;
}

/deep/ .subCell .cell {
	padding: 0;
	height: 20px;
}

/deep/ .el-table__cell {
	height: 20px;
}

/deep/ .el-table__body {
	padding-bottom: 1em;
}

.el-pagination {
	float: right;
	width: 100%;
	justify-content: right;
	background: white;
	padding: 5px 10px
}


</style>