<script setup>
import {javascript} from "@codemirror/lang-javascript";

const extensions = [javascript()];
import {
	mybatisHandler,
	createMybatisEditor,
	initValueMybatisEditor,
	mybatisHintHandler
} from "@/js/mybatis"
import {sqlqueryHandler, sqlqueryHintHandler, keypressSqlEditor} from "@/js/mybatissql"

// https://gitee.com/172463468/codemirror5-mybatis-sqlquery
import {CodeMirror} from 'codemirror-editor-vue3';
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/hint/show-hint.js'

import {onMounted, ref} from "vue";
const codemirror = ref()
let editorItem;
onMounted(() => {
	mybatisHandler(CodeMirror)
	mybatisHintHandler(CodeMirror)
	sqlqueryHandler(CodeMirror)
	sqlqueryHintHandler(CodeMirror)
	const selfObj = {
		existTables: {}, //已查询的表
		existTableCols: {}, //已查询的表字段
		databaseId: null, //当前数据库id
		schemaTypes: null, //当前数据库的模式集合
		mainSchema: null, //当前数据库的主模式
		sqlEditor: null, //sql编辑器
		hintOptions: null, //提示框hint对象
	};
	editorItem=createMybatisEditor(selfObj, "codemirror", codemirror.value);
	keypressSqlEditor(selfObj, getColsOfSchema, getTablesOfSchema);
});


/**
 * [可以不实现]后台接口：查询生效schema的表
 * queryVal={databaseId: "111",schemaType: "public"]}
 */
function getTablesOfSchema(selfObj, queryVal, callbackHint) {
	//支持跨库 {"public.TBL_DICT":"表1"} 或 不跨库 {"TBL_DICT":"表1"}
	var testdata = {
		"1-test2": {"test2.TBL_TEST_ORDER": "表3X"},
	};
	var key = queryVal["databaseId"] + "-" + queryVal["schemaType"];
	var data = testdata[key];
	console.log("实时查询Schema>>", key, data);
	//接口返回处理完成执行回调
	callbackHint(data);

	// $('#exampleSelect2').change();
}


/**
 * [必须实现]后台接口：查询生效的表的字段
 * queryVal={databaseId: "111",tableNames: ["public.XXXX1","public.XXXX2"]}
 */
function getColsOfSchema(selfObj, queryVal, callbackHint) {
	//表字段合集，根据条件动态查询接口返回，因为所有表字段的数量可能达到数万+++，不可能一次性存在前端
	var sqlTables = {};

	var testdata = {
		"1": {
			"public.TBL_DICT": [["AA1", "AA2", "AA3"], ["AA1标题AA1标题AA1标题AA1标题AA1标题", "AA2标题", "AA3标题"], ["VARCHAR(50)", "VARCHAR(60)", "TIMESTAMP"], ["主键：是    非空：是<br>分区：是<br>详情详情详情详情1详情详情详情详情1详情详情详情详情1详情详情详情详情1详情详情详情详情1", "", "详情详情详情详情3"]]
			,
			"public.TBL_DICT_DTL": [["BBXXXX1", "BB2", "BB3"], ["BB1XXXX标题", "BB2标题", "BB3标题"], ["VARCHAR(50)", "VARCHAR(100)", "TIMESTAMP"]]
			,
			"test.TBL_TEST": [["XX1", "XX2", "XX3"], ["XX1标题", "XX2标题", "XX3标题"]]
			,
			"test2.TBL_TEST_ORDER": [["CC1", "CC2", "CC3"], ["CC1标题", "CC2标题", "CC3标题"]]
		},
		"2": {
			"book.TBL_DICT": [["AA1", "AA2", "AA3"], ["AA1标题", "AA2标题", "AA3标题"], ["CHAR(50)", "CHAR(60)", "TIMESTAMP"], ["11", "22", "33"]]
			, "book.TBL_DICT_DTL": [["BB1", "BB2", "BB3"], ["BB1标题", "BB2标题", "BB3标题"]]
			, "test.TBL_TEST": [["XX1", "XX2", "XX3"], ["XX1标题", "XX2标题", "XX3标题"]]
		},
	};

	var t = testdata[queryVal["databaseId"]];
	queryVal["tableNames"].forEach(item => {
		t.forEach((k, v) => {
			if (item.toLowerCase() === k.toLowerCase()) {
				sqlTables[k] = v;
				return;
			}
		})
	})
	console.log("实时查询字段>>", queryVal["tableNames"], t);
	//接口返回处理完成执行回调
	callbackHint(sqlTables);
}
const getContent=()=>{
    return editorItem.getValue()
}

const setContent=(content)=>{
    editorItem.setValue(content)
}
defineExpose({
    getContent,
    setContent
})

</script>

<template>
	<textarea ref="codemirror" class="codemirror flex1" id="sqlcontent"></textarea>
</template>

<style scoped>

</style>