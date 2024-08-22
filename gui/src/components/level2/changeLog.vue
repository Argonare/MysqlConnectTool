<script setup>
import {getCurrentInstance, onMounted, ref} from "vue";
import {useRoute} from "vue-router";

const {proxy} = getCurrentInstance();
const route = useRoute();
onMounted(() => {
    getData()
})
const getData = async () => {
    proxy.$request("get_change_log", route.query).then(data => {
        let list = []
        for (let i in data) {
            list = [...list, ...data[i]]
        }
        
        tableData.value = list
    })
}

const tableData = ref([])
</script>

<template>
    <el-table :data="tableData" style="width: 100%" border>
        <el-table-column prop="time" label="变更时间" width="180"/>
        <el-table-column prop="sql" label="执行的sql"/>
    </el-table>
</template>

<style scoped>

</style>