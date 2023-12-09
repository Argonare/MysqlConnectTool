<script setup>
import {getCurrentInstance, nextTick, reactive, ref} from "vue";
import {emptyDefault} from "@/js/common";
import {useRoute} from "vue-router";

const {proxy} = getCurrentInstance();
const tableData = ref([{}])
const editX = ref(null)
const editY = ref(null)
const route = useRoute();
let oldValue = null;
nextTick(() => {
	proxy.$request("desc_table", route.query).then(data => {
		console.log(data)
		tableData.value = []
		data.forEach(e => {
			var reg = /[1-9][0-9]*/g
			let matchRes = e.Type.match(reg)
			tableData.value.push({
				field: e.Field,
				type: e.Type.split("(")[0],
				length: matchRes && matchRes.length > 0 ? matchRes[0] : null,
				pointLen: matchRes && matchRes.length > 1 ? matchRes[1] : null,
				isNull: e.Null === 'YES',
				comment: emptyDefault(e.Comment),
				hideFlag: false,
				primary: e.Key === "PRI"
			})
		})
	})

})

const iptBlur = (scope, e) => {
	let newValue = scope.row[scope.column.label]
	//判断是否修改
	if (oldValue !== newValue) {
		console.log(111)
	}
	// editX.value = null
	// editY.value = null
}
const cellClick = (scope) => {
	oldValue = tableData.value[scope.$index][scope.column.label]
	editX.value = scope.$index
	editY.value = scope.column.no
}
const changeFlag = (row, flag) => {
	row[flag] = !row[flag]
}
</script>

<template>
	<div class="tabPanel flexColumn">


		<div class="flexRow topBar">
			<div class="flexRow primaryBtn">
				<el-icon>
					<Document></Document>
				</el-icon>
				<div class="barFont">保存</div>
			</div>
			<el-divider direction="vertical"/>
			<div class="flexRow primaryBtn">
				<el-icon>
					<CirclePlus/>
				</el-icon>
				<div class="barFont">添加字段</div>
			</div>
			<div class="flexRow primaryBtn">
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
		<el-table :data="tableData" style="width: 100%" border class="subTable">
			<el-table-column prop="field" label="字段名" width="180">
				<template #default="scope">
					<el-input size="small" v-if="editX===scope.$index&& editY===scope.column.no"
					          v-model="scope.row.field" v-focus @blur="iptBlur(scope, $event)"/>
					<div v-else @click="cellClick(scope)">{{ scope.row.field }}</div>
				</template>
			</el-table-column>
			<el-table-column prop="type" label="类型" width="100"></el-table-column>
			<el-table-column prop="length" label="长度" width="90">
				<template #default="scope">
					<el-input size="small" v-if="editX===scope.$index&& editY===scope.column.no"
					          v-model.number="scope.row.length" v-focus @blur="iptBlur(scope, $event)"/>
					<div v-else @click="cellClick(scope)" class="height20">{{ scope.row.length }}</div>
				</template>
			</el-table-column>
			<el-table-column prop="pointLen" label="小数点" width="90">
				<template #default="scope">
					<el-input size="small" v-if="editX===scope.$index&& editY===scope.column.no"
					          v-model.number="scope.row.pointLen" v-focus @blur="iptBlur(scope, $event)"/>
					<div v-else @click="cellClick(scope)" class="height20" >{{ scope.row.pointLen }}</div>
				</template>
			</el-table-column>
			<el-table-column prop="isNull" label="是否null" width="90" align="center">
				<template #default="scope">
					<el-tag class="cursor yesTag" v-if="scope.row.isNull" :disable-transitions="true"
					        @click="changeFlag(scope.row,'isNull')">
						是
					</el-tag>
					<el-tag class="cursor noTag" type="danger" v-else :disable-transitions="true"
					        @click="changeFlag(scope.row,'isNull')">
						否
					</el-tag>
				</template>
			</el-table-column>
			<el-table-column prop="primary" label="主键" width="90">
				<template #default="scope">
					<el-tag class="cursor yesTag" v-if="scope.row.primary" :disable-transitions="true"
					        @click="changeFlag(scope.row,'primary')">
						是
					</el-tag>
					<el-tag class="cursor noTag" type="danger" v-else :disable-transitions="true"
					        @click="changeFlag(scope.row,'primary')">
						否
					</el-tag>
				</template>
			</el-table-column>
			<el-table-column prop="comment" label="注释">
				<template #default="scope">
					<el-input size="small" v-if="editX===scope.$index&& editY===scope.column.no"
					          v-model="scope.row.comment" v-focus @blur="iptBlur(scope, $event)"/>
					<div v-else @click="cellClick(scope)">{{ scope.row.comment }}</div>
				</template>
			</el-table-column>
		</el-table>
	</div>
</template>

<style scoped>
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
	}

	& .dangerBtn:hover {
		background: #F56C6C;
		color: white;
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