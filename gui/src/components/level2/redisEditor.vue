<script setup lang="ts">
import {useRoute, useRouter} from "vue-router";
import {computed, getCurrentInstance, nextTick, onMounted, reactive, ref, toRaw, toRefs} from "vue";
import {useStore} from "vuex";
import {ElMessage} from "element-plus";
import {Refresh} from "@element-plus/icons-vue";
import { defineEmits } from 'vue';


const emit = defineEmits(['removed'])
const route = useRoute()

const {proxy}: any = getCurrentInstance();
const form = ref({
    key: '',
    type: '',
    ttl: '',
    value: ''
})
onMounted(() => {
    window.addEventListener('pywebviewready', function () {
        selectByKey()
    })
    if (window["pywebview"]) {
        selectByKey()
    }
})
const onSubmit = () => {
    console.log('submit!')
}
let queryData = route.query
const selectByKey = (data = null) => {
    if (data != null) {
        queryData = data
    }
    proxy.$request("select_by_key", queryData).then(data => {
        form.value = data
        try {
            form.value.value = JSON.parse(form.value.value)
            
            form.value.value = JSON.stringify(form.value.value, null, 2)
        } catch (e) {
        
        }
        
        console.log(data)
    })
}

const submit = () => {
    proxy.$request("update_table", Object.assign({}, queryData, {"updateData": [form.value]})).then(() => {
        ElMessage.success("修改成功")
    })
}

const deleteKey = () => {
    proxy.$request("delete_sql", Object.assign({}, queryData, {"keys": [form.value.key]})).then(() => {
        ElMessage.success("删除成功")
        emit("removed",form.value.key)
    })
}

defineExpose({
    selectByKey,
})


</script>

<template>
    <div style="height: 100%;max-width: 90%;padding-top: 10px" class="flexColumn">
        <el-form :model="form" class="flexColumn flex1" label-width="40">
            <el-form-item label="键">
                <el-input v-model="form.key" readonly spellcheck="false"/>
            </el-form-item>
            <div class="flexRow width100">
                <el-form-item label="类型" class="flex1">
                    <el-input v-model="form.type" spellcheck="false"/>
                </el-form-item>
                <el-form-item label="ttl" style="width: 150px">
                    <el-input v-model="form.ttl" type="number" spellcheck="false"/>
                </el-form-item>
                 <el-button type="primary" :icon="Refresh" plain style="margin-left: 20px" @click="selectByKey" />
            </div>
            
            <el-form-item label="值" class="flex1">
                <!--                TODO 能看json缩略图，收起json-->
                <el-input type="textarea" v-model="form.value" style="height: 100%" class="textCss" spellcheck="false"/>
            </el-form-item>
        </el-form>
        <div style="margin-bottom: 12px;text-align: right">
            <el-button type="primary" @click="submit">提交</el-button>
            <el-button type="danger" @click="deleteKey">删除</el-button>
            <el-button>关闭</el-button>
        </div>
    </div>
</template>

<style scoped>
:deep(textarea) {
    height: 100% !important;
    min-height: unset !important;
}
</style>