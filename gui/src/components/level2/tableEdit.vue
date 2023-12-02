<script setup>
import {ref} from "vue";

const tableData = ref([{}])
const editX = ref(null)
const editY = ref(null)
let oldValue = null;

const iptBlur = (scope, e) => {
	let newValue = scope.row[scope.column.label]
	//判断是否修改
	if (oldValue !== newValue) {
		console.log(111)
	}
}
const cellClick = (scope) => {
	oldValue = tableData.value[scope.$index][scope.column.label]
	editX.value = scope.$index
	editY.value = scope.column.no
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
			<el-table-column prop="Field" label="字段名" width="180">
				<template #default="scope">
					<input v-if="editX===scope.$index&& editY===scope.column.no"
					       v-model="scope.row.Field" v-focus
					       @blur="iptBlur(scope, $event)"/>
					<div class="iptDiv" v-else
					     @click="cellClick(scope)">{{ scope.row.Field }}
					</div>

				</template>
			</el-table-column>
			<el-table-column prop="Type" label="类型" width="100"></el-table-column>
			<el-table-column prop="Type" label="长度" width="90"></el-table-column>
			<el-table-column prop="Type" label="小数点" width="90"></el-table-column>
			<el-table-column prop="Key" label="不是null" width="90"></el-table-column>
			<el-table-column prop="name" label="主键" width="90"></el-table-column>
			<el-table-column prop="Comment" label="注释"></el-table-column>
		</el-table>
	</div>
</template>

<style scoped>
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