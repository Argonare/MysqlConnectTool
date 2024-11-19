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

const {proxy} = getCurrentInstance();
const route = useRoute();
// https://gitee.com/172463468/codemirror5-mybatis-sqlquery
import {CodeMirror} from 'codemirror-editor-vue3';
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/hint/show-hint.js'

import {getCurrentInstance, onMounted, ref} from "vue";
import {useRoute} from "vue-router";

let connection = ref({})
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
    console.log("初始化myEditor页面")
    initEditor()
    
});

async function initEditor() {
    if (!connection.value.database) {
        return;
    }
    selfObj.existTables = await getAllTables();
    exampleDataInit(selfObj.existTables);
    mybatisHandler(CodeMirror)
    mybatisHintHandler(CodeMirror)
    sqlqueryHandler(CodeMirror)
    sqlqueryHintHandler(CodeMirror)
    
    editorItem = createMybatisEditor(selfObj.value, "codemirror", codemirror.value);
    keypressSqlEditor(selfObj, getColsOfSchema, getTablesOfSchema);
}


async function getAllTables(databaseId) {
    
    if (!connection.value.database) {
        console.log("database为空")
        return null;
    }
    return new Promise((resolve, reject) => {
        proxy.$request("get_table", connection.value).then(data => {
            let tableData = {}
            data.forEach(e => {
                let key = connection.value.title+"."+e.databases
                if (!tableData[key]) {
                    tableData[key] = {}
                }
                tableData[key][connection.value.title+"."+e.name] = e.comment
            })
            resolve(tableData)
            console.log("获取数据库信息>>", tableData);
            //接口返回处理完成执行回调
        })
    })
    
    
}


/**
 * [可以不实现]后台接口：查询生效schema的表
 * queryVal={databaseId: "111",schemaType: "public"]}
 */
function getTablesOfSchema(selfObj, queryVal, callbackHint) {
    //支持跨库 {"public.TBL_DICT":"表1"} 或 不跨库 {"TBL_DICT":"表1"}
    proxy.$request("get_table", connection.value).then(data => {
        let tableData = {}
        data.forEach(e => {
            let key = e.id + "-" + e.databases
            if (!tableData[key]) {
                tableData[key] = {}
            }
            tableData[key][e.name] = e.comment
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
    console.log(999)
    proxy.$request("get_table_and_field", connection.value).then(data => {
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

function exampleDataInit(schemaMap) {
    console.log(schemaMap)
    
    // schema信息（从接口获取）
    var databaseMap = {};
    console.log(databaseList.value)
    databaseList.value.forEach(item => {
        databaseMap[item.title+"."+item.database] = item;
    })
    selfObj.schemaTypes = {};
    for (let k in schemaMap[selfObj.databaseId]) {
        selfObj.schemaTypes[k] = false;
    }
    
    if (selfObj.sqlEditor) {
        //修改schema集合
        selfObj.hintOptions["schemaTypes"] = selfObj.schemaTypes;
        //修改sql类型
        var mappingDbType = {"postgres": "text/x-pgsql", "mysql": "text/x-mysql"};
        selfObj.sqlEditor.setOption("sqlMode", mappingDbType[databaseMap[selfObj.databaseId].type]);
    }
    selfObj.mainSchema = databaseMap[selfObj.databaseId].title
    for (let e in selfObj.schemaTypes) {
        selfObj.schemaTypes[e] = (selfObj.mainSchema === e);
    }
    
}

const getContent = () => {
    return editorItem.getValue()
}

const setContent = (content) => {
    editorItem.setValue(content)
}

const setDatabase = () => {

}
const setConnection = (data) => {
    connection.value = data
    initEditor()
}

const databaseList = ref([])

const setDataBases = (a, b) => {
    databaseList.value = a.value.map(e => {
        return {id: e.id, type: "mysql", title: e.name, database: e.database}
    })
    if (databaseList.value.length === 1 && databaseList.value[0].database) {
        let dm=databaseList.value[0]
        selfObj.databaseId = dm.title+"."+dm.database
        connection.value = databaseList.value[0]
    } else {
        selfObj.databaseId = b.name+"."+b.value.database
        connection.value = b.value
    }
    
}

defineExpose({
    getContent,
    setContent,
    setConnection,
    setDataBases
})

</script>

<template>
    <textarea ref="codemirror" class="codemirror flex1" id="sqlcontent"></textarea>
</template>

<style scoped>
</style>