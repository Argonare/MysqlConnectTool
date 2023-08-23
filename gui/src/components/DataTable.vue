<script setup lang="ts">
import {useRoute} from "vue-router";
import {getCurrentInstance, nextTick, onMounted, reactive, ref, toRaw} from "vue";


const {proxy}: any = getCurrentInstance();
const route = useRoute();
const table = ref()

onMounted(() => {
    proxy.$request("desc_table", route.query).then(data => {
        let tableDesc = []
        data.forEach(e => {
            tableColumn.push({prop: e.Field, label: e.Field})
        })

    })
    proxy.$request("get_data", route.query).then(data => {
        tableData.value = data
    })
})
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
    console.log(trueWidth+24)
    return trueWidth+24;
}


let tableColumn = reactive([])
let tableData = ref([])

</script>

<template>
    <el-table :data="tableData" border class="table" ref="table" :fit="true" table-layout='auto'
              :scrollbar-always-on="true" header-cell-class-name="headCell">
        <el-table-column v-for="item in tableColumn" :key="item.prop" :prop="item.prop" :label="item.label"
                         :width="flexWidth(item.label)" :min-width="0">
            <template #header>
                {{ item.label }}
            </template>
            <template #default="scope">
                {{ scope.row[item.prop] }}
            </template>
        </el-table-column>
    </el-table>
</template>

<style scoped>
/deep/ .el-table__body-wrapper {
    height: 100%;
}

.table {
    width: 100%;
    height: 100%
}

/deep/ .headCell .cell {
    color: #333;
    font-size: 10px;
}
</style>