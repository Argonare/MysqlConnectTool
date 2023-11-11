<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed, getCurrentInstance, nextTick, onMounted, reactive, ref, toRaw} from "vue";
import {Check, Close, Filter, Switch} from "@element-plus/icons-vue";
import {ElMessage, ElMessageBox} from "element-plus";
import {empty, emptyDefault} from '@/js/common'

const {proxy}: any = getCurrentInstance();
const route = useRoute();
const table = ref()
const ht = ref(300)
const tableColumn = reactive([])
const tableData = ref([])
const showMenu = ref(false)
const changedFlag = ref(0)
const headerType = ref("en")
let oldData = []
let oldDataMap = {}
let primaryKey = ""
let oldValue = null
let changedData = {}
let field = {}
let pageSize = 100
let currentPage = 1
let count: number = 0
let mode = ref("")
let modeData = null


nextTick(() => {
	proxy.$request("desc_table", route.query).then(data => {
		console.log(data)
		let tableDesc = []
		data.forEach(e => {
			if (e.Key != "") {
				primaryKey = e.Field
			}
			field[e.Field] = e
			tableColumn.push({prop: e.Field, label: e.Field, comment: emptyDefault(e.Comment), hideFlag: false})
		})
	})
	getData()

})
calHeight()

const changeHeader = () => {
	headerType.value = headerType.value == 'en' ? "cn" : "en"
}

const getData = () => {
	console.log("获取数据")
	let param = JSON.parse(JSON.stringify(route.query))
	param.pageSize = pageSize
	param.currentPage = currentPage
	proxy.$request("get_data", param).then(data => {
		tableData.value = data.list
		oldData = JSON.parse(JSON.stringify(data.list))
		oldData.forEach(e => {
			oldDataMap[e["@uuid"]] = e
		})

		count = data.count
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
		e.target.parentElement.classList.add("changed")
		changedFlag.value = 1
	}
}

let editX = ref(null);
let editY = ref(null);
let chooseData = null
const cellClick = (scope) => {
	chooseData = scope
	oldValue = tableData.value[scope.$index][scope.column.label]
	editX.value = scope.$index
	editY.value = scope.column.no
}


function calHeight() {
	nextTick(() => {
		ht.value = document.querySelector('.el-table').parentElement.clientHeight - 75
	})
}

const handleSizeChange = (val: number) => {
	pageSize = val;
	getData()
}
const handleCurrentChange = (val: number) => {
	currentPage = val;
	getData()
}
window.addEventListener('resize', calHeight)
defineExpose({
	getData
})
document.onkeydown = function (e) {
	if (route.path != "/DataTable") {
		// evt.preventDefault();
		return;
	}

	let code = e.keyCode || e.which;
	if (code == 116) {
		if (e.preventDefault) {
			e.preventDefault();
			getData()
		}
	}
}
//设置菜单出现的位置
const showMenuPosition = (event) => {
	let menu = document.querySelector("#menu");
	let item = menu.parentElement.parentElement.parentElement.parentElement.parentElement
	showMenu.value = true
	menu["style"].left = event.clientX - item.offsetLeft + "px";
	menu["style"].top = event.clientY - item.offsetTop - 54 + "px";
	// 改变自定义菜单的隐藏与显示
	menu["style"].display = "block";
	menu["style"].zIndex = 1000;
}
const setMenu = (str) => {
	if (mode.value == "row") {
		for (let i in modeData.row) {
			if (i == "@uuid" || (i == primaryKey && empty(str))) {
				continue
			}
			modeData.row[i] = str
		}
	} else if (mode.value == "column") {
		if (modeData.property == primaryKey && empty(str)) {
			ElMessage.error("主键不允许设空")
			return
		}
		tableData.value.forEach(e => {
			e[modeData.property] = str
		})
	} else if (mode.value == "cell") {
		if (empty(str) && modeData.column.property == primaryKey) {
			ElMessage.error("主键不允许设空")
			return
		}
		modeData.row[modeData.column.property] = str
	}
}
const setEmpty = (flag) => {
	console.log(mode.value + " 点击了设置空白字符串")
	changedFlag.value = 1
	setMenu("")
}
const setNull = (flag) => {
	console.log(mode.value + " 点击了设置null")
	changedFlag.value = 1
	setMenu(null)
}


document.addEventListener('click', e => {
	showMenu.value = false
})
const clearSelected = () => {
	selectedRow.value.clear()
	selectedCell.value.clear()
	selectedHeader.value.clear()
}
//行全选右键
const selectedRow = ref(new Set([]))
const rowRightClick = (row, event, showMenu = false) => {

	clearSelected()
	document.getElementsByClassName("table")[0].classList.add("showTree")
	selectedRow.value.add(row.$index)
	if (showMenu) {
		mode.value = "row"
		modeData = row
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
	selectedCell.value.add(row.$index + "," + row.cellIndex)
	if (showMenu) {
		mode.value = "cell"
		modeData = row
		showMenuPosition(event)
	}
}
const selectedCellClass = ({row, column, rowIndex, columnIndex}) => {
	if (selectedHeader.value.has(columnIndex) && columnIndex != 0) {
		return 'selectedRow subCell'
	}

	if (selectedCell.value.has(rowIndex + "," + columnIndex)) {
		return 'selectedRow subCell'
	}
	return 'subCell'
}
const selectedHeader = ref(new Set([]))
const HeaderRightClick = (column, event, showMenu = false) => {
	clearSelected()
	document.getElementsByClassName("table")[0].classList.remove("showTree")
	selectedHeader.value.add(column.no)
	if (showMenu && column.no != 0) {
		mode.value = "column"
		modeData = column
		showMenuPosition(event)
	}
}
const selectedHeaderClass = ({row, column, rowIndex, columnIndex}) => {
	if (selectedHeader.value.has(columnIndex) && columnIndex != 0) {
		return 'selectedRow headerCell'
	}
	return 'headerCell'
}
//清空修改
const clearChange = () => {
	console.log("点击了清空")
	changedFlag.value = 0
	tableData.value = JSON.parse(JSON.stringify(oldData))
	changedData = {}
	document.querySelectorAll(".changed").forEach(e => {
		e.classList.remove("changed")
	})
}

const deleteLine = () => {
	console.log("删除一行")
	ElMessageBox.confirm("是否删除选中数据？", "警告", {
		confirmButtonText: '确定',
		cancelButtonText: '取消',
		type: 'warning',
	}).then(() => {
		let param = JSON.parse(JSON.stringify(route.query))
		param["primaryKey"] = primaryKey
		param["ids"] = [modeData["row"][primaryKey] + ""]
		proxy.$request("delete_sql", param).then(data => {
			ElMessage.success("操作成功")
			getData()
		})
	})


}
//应用修改
//TODO 删除判断
const changeApply = () => {
	console.log("点击了应用")
	let d = {}

	tableData.value.forEach(e => {
		d[e["@uuid"]] = e
	})
	oldData.forEach(e => {
		let item = d[e['@uuid']]
		let res = {primaryKey: primaryKey}
		let flag = 0
		if (item == null) {
			//添加的数据
			return;
		}
		for (let i in e) {
			if (i == "@uuid") continue;
			if (item[i] != e[i]) {
				res[i] = {value: item[i], type: field[i].Type}
				flag = 1
			}
		}
		if (flag == 1) {
			changedData[oldDataMap[e['@uuid']][primaryKey]] = res
		}
	})
	proxy.$request("update_table", Object.assign({}, route.query, {updateData: changedData})).then(() => {
		document.querySelectorAll(".changed").forEach(e => {
			e.classList.remove("changed")
		})
	})
}
const hideColumn = () => {

	tableColumn[modeData['no'] - 1]["hideFlag"] = true
	console.log(tableColumn)
}

const columnFilter = computed(() => {
	return tableColumn.filter((res: any) => {
		return res.hideFlag == false
	})
})

</script>

<template>
	<div class="topButton">
		<el-button size="small" :icon="Switch" @click="changeHeader">切换表头({{ headerType }})</el-button>
		<el-button size="small" :icon="Filter">筛选</el-button>
	</div>
	<el-table :data="tableData" border class="table" ref="table" :fit="true" table-layout='auto'
	          @header-contextmenu=" ( column, event) =>HeaderRightClick(column, event,true)"
	          @contextmenu="()=>{}"
	          :row-class-name="selectedRowClass"
	          :scrollbar-always-on="true" :header-cell-class-name="selectedHeaderClass"
	          :cell-class-name="selectedCellClass">
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
		<el-table-column v-for="(item,index) in columnFilter" :key="index" :prop="item.prop" :label="item.label"
		                 :width="flexWidth(item.label)" :min-width="0" :show-overflow-tooltip="true">
			<template #header>
				{{ headerType == 'en' ? item.label : item.comment }}
			</template>
			<template #default="scope">
				<input v-if="editX==scope.$index&& editY==scope.column.no"
				       v-model="scope.row[item.prop]" id="ipt" class="ipt" v-focus
				       :placeholder="scope.row[item.prop]==null?'NULL':''"
				       @blur="iptBlur(scope, $event)"/>
				<div class="iptDiv" v-else :class="scope.row[item.prop]==null?'nullDiv':''"
				     @click.right="(event)=>cellRightClick(scope,event,true)"
				     @click="cellClick(scope)">{{ scope.row[item?.prop] ?? 'NULL' }}
				</div>

			</template>
		</el-table-column>
	</el-table>
	<div class="flexBottom">
		<el-pagination
			background
			class="pagination"
			:total="count"
			v-model:page-size="pageSize"
			v-model:current-page="currentPage"
			@size-change="handleSizeChange"
			@current-change="handleCurrentChange"
			layout="total, prev, pager, next"
		/>
		<div class="bottomCheck">
			<el-button type="primary" :icon="Check" :disabled="changedFlag==0" @click="changeApply">应用</el-button>
			<el-button :icon="Close" :disabled="changedFlag==0" @click="clearChange">取消</el-button>
		</div>
	</div>
	<div v-show="showMenu" id="menu" class="menuDiv">
		<div class="menuUl">
			<p @click="setEmpty">设置为空白字符串</p>
			<p @click="setNull">设置为 NULL</p>
			<el-divider/>
			<p @click="deleteLine" v-if="mode=='column'">添加到筛选</p>
			<p @click="hideColumn" v-if="mode=='column'">隐藏本列</p>
			<p @click="deleteLine" v-if="mode=='column'">显示全部</p>
			<p @click="deleteLine" v-if="mode=='row'">删除 记录</p>
		</div>
	</div>
</template>

<style scoped>

.topButton {
	background: white;
	width: 100%;
	border-left: 1px solid var(--el-border-color-light);

	& .el-button {
		border: unset !important;
		margin: 3px;
	}
}

.flexBottom {
	display: flex;
	border: 1px solid var(--el-border-color-light);
	border-top: unset;
}

.bottomCheck {
	background: white;
	display: flex;
	padding-right: 1em;
}

.bottomCheck .el-button:first-child {
	margin-left: 1.5em;
}

.bottomCheck .el-button {
	align-self: center;
}

/deep/ tr:hover > td {
	background-color: unset !important;
}

/deep/ tr:hover > td.selectedRow {
	background: #409EFF !important;
}

/deep/ .selectedRow {
	background: #409EFF !important;
	color: white;
}

.nullDiv {
	opacity: 0.5;
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
	width: 100%;
	background: white;
	padding: 5px 10px
}


</style>