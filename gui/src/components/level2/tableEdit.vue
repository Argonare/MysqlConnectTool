<script setup>
import {getCurrentInstance, nextTick, onMounted, reactive, ref} from "vue";

onMounted(() => {
	nextTick(() => {
		proxy.$request("desc_table", route.query).then(data => {
			tableData.value = []
			data.forEach((e, index) => {
				var reg = /[1-9][0-9]*/g
				let matchRes = e.Type.match(reg)
				let item = {
					index: index,
					field: e.Field,
					type: e.Type.split("(")[0],
					len: matchRes && matchRes.length > 0 ? matchRes[0] : null,
					pointLen: matchRes && matchRes.length > 1 ? matchRes[1] : null,
					isNull: e.Null === 'YES',
					comment: emptyDefault(e.Comment),
					hideFlag: false,
					primary: e.Key === "PRI"
				}
				tableData.value.push(item)
				tableMap[item["field"]] = JSON.parse(JSON.stringify(item))
			})
		})
	})
})

import {emptyDefault} from "@/js/common";
import {useRoute} from "vue-router";


const {proxy} = getCurrentInstance();
const tableData = ref([{}])
const editX = ref(null)
const editY = ref(null)
const route = useRoute();
let oldValue = null;
let tableMap = {}


const changeList = {}
const iptBlur = (scope, e, field) => {
	let newValue = scope.row[scope.column.property]
	//判断是否修改
	if (oldValue !== newValue) {
		if (scope.row.field === null || scope.row.field === '') {
			return;
		}
		if (changeList[scope.row.index] == null) {
			changeList[scope.row.index] = {}
		}
		changeList[scope.row.index][field] = scope.row[field]
	}
	editX.value = null
	editY.value = null
}
const cellClick = (scope) => {
	oldValue = tableData.value[scope.$index][scope.column.property]
	editX.value = scope.$index
	editY.value = scope.column.no
}
const changeFlag = (row, flag) => {
	row[flag] = !row[flag]
}
const typeOption = ref([
	{label: "varchar", hasLen: true, hasPoint: false, len: 255},
	{label: "int", hasLength: true, hasPoint: false},
	{label: "decimal", hasLength: true, hasPoint: true},
])
const typeMap = reactive({})
typeOption.value.forEach(e => {
	typeMap[e.label] = e
})
const add = () => {
	let index = tableData.value.length > 0 ? (tableData.value[tableData.value.length - 1]["index"] + 1) : 0
	let item = {primary: false, isNull: false, index: index, add: true}
	tableData.value.push(item)
	changeList[item.index] = item
}
const pAdd = () => {
	let index = tableData.value.length > 0 ? (tableData.value[tableData.value.length - 1]["index"] + 1) : 0
	let item = {primary: false, isNull: false, index: index, add: true}

	tableData.value.splice(activeRow.value, 0, item)
	changeList[item.index] = item
}


const canEdit = (scope, field = null) => {
	if (editX.value === scope.$index && editY.value === scope.column.no) {
		if (field == null) {
			return true;
		}
		if (typeMap[scope.row.type] && typeMap[scope.row.type][field]) {
			return true;
		}
	}
	return false;
}
const activeRow = ref(null)
const selectedRow = ({row, rowIndex}) => {
	if (rowIndex === activeRow.value) {
		return 'selectedRow'
	}
	return ''
}
const icoClick = (row) => {
	activeRow.value = row.index
}
const save = () => {
	if (JSON.stringify(changeList) === "{}") {
		return
	}
	let param = {...route.query, ...changeList}
	proxy.$request("alert_table", param).then(data => {
		console.log(data)
	})
	console.log(changeList)
}
const btnClick = (scope, flag) => {
	cellClick(scope);
	changeFlag(scope.row, flag);
	iptBlur(scope, null, flag)
}
</script>

<template>
	<div class="tabPanel flexColumn">
		<div class="flexRow topBar">
			<div class="flexRow primaryBtn" @click="save">
				<el-icon>
					<Document></Document>
				</el-icon>
				<div class="barFont">保存</div>
			</div>
			<el-divider direction="vertical"/>
			<div class="flexRow primaryBtn" @click="add">
				<el-icon>
					<CirclePlus/>
				</el-icon>
				<div class="barFont">添加字段</div>
			</div>
			<div class="flexRow primaryBtn" @click="pAdd">
				<el-icon>
					<ArrowLeft/>
				</el-icon>
				<div class="barFont">插入字段</div>
			</div>
			<div class="flexRow dangerBtn">
				<el-icon>
					<CircleClose/>
				</el-icon>
				<div class="barFont">删除字段</div>
			</div>
		</div>
		<el-table :data="tableData" style="width: 100%" border class="subTable" :row-class-name="selectedRow"
		          @cell-click="(row, column, cell, event)=>icoClick(row)">
			<el-table-column width="40" align="center" prop="ico">
				<template #default="scope">
					<el-icon>
						<ArrowRight/>
					</el-icon>
				</template>
			</el-table-column>
			<el-table-column prop="field" label="字段名" width="180">
				<template #default="scope">
					<el-input size="small" v-if="canEdit(scope)"
					          v-model="scope.row.field" v-focus @blur="iptBlur(scope, $event,'field')"/>
					<div v-else @click="cellClick(scope)" class="height20">{{ scope.row.field }}</div>
				</template>
			</el-table-column>
			<el-table-column prop="type" label="类型" width="120">
				<template #default="scope">
					<el-select v-model="scope.row.type" size="small" placeholder="选择类型"
					           v-if="canEdit(scope)">
						<el-option
							v-for="item in typeOption"
							:key="item.label"
							:label="item.label"
							:value="item.label"
						/>
					</el-select>
					<div v-else @click="cellClick(scope)" class="height20">{{ scope.row.type }}</div>
				</template>
			</el-table-column>
			<el-table-column prop="len" label="长度" width="90">
				<template #default="scope">
					<el-input v-if="canEdit(scope,'hasLen')"
					          size="small" v-model.number="scope.row.len" v-focus @blur="iptBlur(scope, $event,'len')"/>
					<div v-else @click="cellClick(scope)" class="height20">{{ scope.row.len }}</div>
				</template>
			</el-table-column>
			<el-table-column prop="pointLen" label="小数点" width="90">
				<template #default="scope">
					<el-input size="small" v-model.number="scope.row.pointLen" v-focus
					          @blur="iptBlur(scope, $event,'pointLen')"
					          v-if="canEdit(scope,'hasPoint')"/>
					<div v-else @click="cellClick(scope)" class="height20">{{ scope.row.pointLen }}</div>
				</template>
			</el-table-column>
			<el-table-column prop="isNull" label="是否null" width="90" align="center">
				<template #default="scope">
					<el-tag class="cursor yesTag" v-if="scope.row.isNull" :disable-transitions="true"
					        @click="btnClick(scope,'isNull')">
						是
					</el-tag>
					<el-tag class="cursor noTag" type="danger" v-else :disable-transitions="true"
					        @click="btnClick(scope,'isNull')">
						否
					</el-tag>
				</template>
			</el-table-column>
			<el-table-column prop="primary" label="主键" width="90">
				<template #default="scope">
					<el-tag class="cursor yesTag" v-if="scope.row.primary" :disable-transitions="true"
					        @click="btnClick(scope,'primary')">
						是
					</el-tag>
					<el-tag class="cursor noTag" type="danger" v-else :disable-transitions="true"
					        @click="btnClick(scope,'primary')">
						否
					</el-tag>
				</template>
			</el-table-column>
			<el-table-column prop="comment" label="注释">
				<template #default="scope">
					<el-input size="small" v-if="editX===scope.$index&& editY===scope.column.no"
					          v-model="scope.row.comment" v-focus @blur="iptBlur(scope, $event,'comment')"/>
					<div v-else @click="cellClick(scope)" class="height20">{{ scope.row.comment }}</div>
				</template>
			</el-table-column>
		</el-table>
	</div>
</template>

<style scoped>

/deep/ .selectedRow {
	background: #e7f2ff;
}

.noTag:hover {
	background: #f56c6c;
	color: white;
}

.yesTag:hover {
	background: #409eff;
	color: white;
}

.height20 {
	min-height: 20px;
}

/deep/ .el-input {
	font-size: 14px;
}

.tabPanel {
	height: 100vh;
}

.subTable {
	flex: 1;
}

.topBar {
	padding: 0.5em;

	& .barFont {
		height: 20px;
		line-height: 20px;
		align-self: center;
	}

	& > *:not(.el-divider) {
		padding: 2px 7px;
		border-radius: 3px;
		cursor: pointer;
	}

	& .primaryBtn:hover {
		background: #409EFF;
		color: white;
		box-shadow: 0 2px 12px 0 rgba(0, 0, 0, .1);
	}

	& .dangerBtn:hover {
		background: #F56C6C;
		color: white;
		box-shadow: 0 2px 12px 0 rgba(0, 0, 0, .1);
	}


	/deep/ .el-icon {
		align-self: center;
		padding-right: 3px;
	}

	.el-divider--vertical {
		height: 100%;
	}

}
</style>