<script setup lang="ts">

import {ref} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";

const store = useStore()
const router = useRouter()
const panel = ref(null)
const getPramData = (path) => {
    let param = {}
    if (path.indexOf("?") != -1) {
        let params = path.split("?")[1].split("&")
        params.forEach(e => {
            param[e.split("=")[0]] = e.split("=")[1]
        })
    }
    return param
}
const tabClick = (tab) => {
    console.log("click")
    let path = store.state.openTab[Number(tab.index)].route
    let param = getPramData(path)

    router.push({path: path, query: param});
}
const tabRemove = (targetName) => {
    //首页不删
    console.log(222)
    // if (targetName == '/' || targetName == "/empty") {
    //     return
    // }
    store.commit('delete_tabs', targetName);
    if (store.state.activeIndex === targetName) {
        // 设置当前激活的路由
        if (store.state.openTab && store.state.openTab.length >= 1) {
            let path = store.state.openTab[store.state.openTab.length - 1].route
            store.commit('set_active_index', path);
            let param = getPramData(path)
            router.push({path: store.state.activeIndex, query: param});
        } else {
            router.push({path: '/'});
        }
    }
}
const getData = () => {
    panel.value.getData()
}
defineExpose({
    getData
})
</script>

<template>
    <el-tabs
        v-model="store.state.activeIndex"
        type="card"
        class="demo-tabs"
        @tab-click="tabClick"
        @tab-remove="tabRemove"
        v-if="store.state.openTab.length"
        :closable="true"
    >
        <el-tab-pane
            v-for="item in store.state.openTab"
            :key="item.name"
            :name="item.route"
            :label="item.nickName"
            style="height:100%"
        >
            <div style="height:100%" ref="panel">
                <router-view/>
            </div>
        </el-tab-pane>
    </el-tabs>
</template>

<style scoped>
/deep/ .el-tabs__content {
    height: calc(100% - 60px);
}

.el-tabs {
    height: 100%;
}

/deep/ .el-tabs__header {
    background: white;
}
</style>