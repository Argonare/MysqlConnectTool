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
let selfObj = ref({
    existTables: {}, //已查询的表
    existTableCols: {}, //已查询的表字段
    databaseId: null, //当前数据库id
    schemaTypes: null, //当前数据库的模式集合
    mainSchema: null, //当前数据库的主模式
    sqlEditor: null, //sql编辑器
    hintOptions: null, //提示框hint对象
});
let editorItem;
onMounted(() => {
    mybatisHandler(CodeMirror)
    mybatisHintHandler(CodeMirror)
    sqlqueryHandler(CodeMirror)
    sqlqueryHintHandler(CodeMirror)
    
    editorItem = createMybatisEditor(selfObj.value, "codemirror", codemirror.value);
    console.log(222)
    keypressSqlEditor(selfObj.value, getColsOfSchema, getTablesOfSchema);
});


/**
 * [可以不实现]后台接口：查询生效schema的表
 * queryVal={databaseId: "111",schemaType: "public"]}
 */
function getTablesOfSchema(selfObj, queryVal, callbackHint) {
    //支持跨库 {"public.TBL_DICT":"表1"} 或 不跨库 {"TBL_DICT":"表1"}
    proxy.$request("get_table", route.query).then(data => {
        let tableData = {}
        data.forEach(e => {
            let key=e.id+"-"+e.databases
            if (!tableData[key]) {
                tableData[key]={}
            }
            tableData[key][e.name]=e.comment
        })
        var key = queryVal["databaseId"] + "-" + queryVal["schemaType"];
        var data = tableData[key];
        console.log('查询字段', queryVal)
        console.log("实时查询Schema>>", key, data);
        //接口返回处理完成执行回调
        callbackHint(data);
    })
}


/**
 * [必须实现]后台接口：查询生效的表的字段
 * queryVal={databaseId: "111",tableNames: ["public.XXXX1","public.XXXX2"]}
 */
function getColsOfSchema(selfObj, queryVal, callbackHint) {
    //表字段合集，根据条件动态查询接口返回，因为所有表字段的数量可能达到数万+++，不可能一次性存在前端
    var sqlTables = {};
    proxy.$request("get_table_and_field", route.query).then(data => {
        console.log('查询字段', queryVal)
        console.log(data)
        var t = data[queryVal["databaseId"]];
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
        
    })
    
}

const getContent = () => {
    return editorItem.getValue()
}

const setContent = (content) => {
    editorItem.setValue(content)
}

const setDatabase = () => {

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