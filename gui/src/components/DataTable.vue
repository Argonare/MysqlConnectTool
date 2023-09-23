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

let primaryKey = ""
let oldValue = null
let changedData = null
let field = {}
let pageSize = 100
let currentPage = 1
let count = 0
let rightClickItem = ref("")
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
		if (changedData[scope.row[primaryKey]] == null) {
			changedData[scope.row[primaryKey]] = {}
			changedData[scope.row[primaryKey]]["primaryKey"] = primaryKey
		}
		changedData[scope.row[primaryKey]][key] = {value: newValue, type: field[scope.column.label].Type}
		e.target.parentElement.classList.add("changed")
	}
	console.log(changedData)
}

let editX = ref(null);
let editY = ref(null);
let chooseData = null
const cellClick = (scope) => {
	chooseData = scope
	oldValue = tableData.value[scope.$index][scope.column.label]
	request_update(scope)
	editX.value = scope.$index
	editY.value = scope.column.no
	setTimeout(() => {
		document.getElementById("ipt").focus()

	})


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
	console.log(table.value.getSelectionRows())
	console.log(column)
	console.log(type)
	// editX.value = scope.$index
	// editY.value = scope.column.no
	rightClickItem.value = row
}

</script>

<template>
	<el-table :data="tableData" border class="table" ref="table" :fit="true" table-layout='auto'
	          :max-height="ht"
	          @header-contextmenu=" (row, column,cell, event) =>rightClick(row, column,cell, event,1)"
	          @cell-contextmenu="rightClick"
	          v-contextmenu:contextmenu
	          @contextmenu="globalClick"
	          :scrollbar-always-on="true" header-cell-class-name="headCell" cell-class-name="subCell">
		<el-table-column label="" width="40px" align="center">
          <template  #default="scope">
            <div>
              <el-icon><DArrowRight /></el-icon>
            </div>
          </template>
        </el-table-column>
		<el-table-column v-for="item in tableColumn" :key="item.prop" :prop="item.prop" :label="item.label"

		                 :width="flexWidth(item.label)" :min-width="0" :show-overflow-tooltip="true">
			<template #header>
				{{ item.label }}
			</template>
			<template #default="scope">
				<input v-show="editX==scope.$index&& editY==scope.column.no"
				       v-model="scope.row[item.prop]" id="ipt" class="ipt" autofocus="autofocus"
				       @blur="iptBlur(scope, $event)"/>
				<div class="iptDiv" v-show="!(editX==scope.$index&& editY==scope.column.no)"
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
	<div v-show="rightClickItem !='' ">
		<v-contextmenu ref="contextmenu">
			<v-contextmenu-item>设为空白字符串</v-contextmenu-item>
			<v-contextmenu-item>设为null</v-contextmenu-item>
			<v-contextmenu-item>菜单3</v-contextmenu-item>
		</v-contextmenu>
	</div>
</template>

<style scoped>

.table {
	width: 100%;
	height: 100%;
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