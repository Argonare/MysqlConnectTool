<script lang="ts" setup>

import {nextTick, onMounted, ref, watch} from 'vue'
import ConnectDialog from "@/components/connectDialog.vue";
import MenuItem from "@/components/menuItem.vue";
import ConnectTree from "@/components/connectTree.vue";
import RightWindow from "@/components/rightWindow.vue";

import {onBeforeRouteUpdate, useRoute, useRouter} from 'vue-router'

import {useStore} from '@/../store'

const route = useRoute()
const router = useRouter()
const store = useStore()
const connectDialog = ref(null)
const connectTree = ref(null)
const rightWindow = ref(null)

const connectData = (params: Object) => {
    connectTree.value.addData(params)
};
onMounted(() => {
    setTimeout(() => {
        connectTree.value.refreshData()
    }, 1000)
    if (route.path == "/") {
        return
    }
    let nickNames = route.fullPath.split("nickName=")
    let nickName;
    if (nickNames.length == 1) {
        nickName = route.name
    } else {
        nickName = nickNames[1]
    }
    store.commit('add_tabs', {route: route.fullPath, name: route.name, nickName: nickName});
    store.commit('set_active_index', route.fullPath);
    dragControllerDiv()
});
watch(router.currentRoute, (to) => {
    if (route.path == "/") {
        return
    }
    let flag = false;
    for (let item of store.state.openTab) {
        if (item.route === to.fullPath) {
            store.commit('set_active_index', to.fullPath)
            flag = true;
            break;
        }
    }

    if (!flag) {
        let nickNames = to.fullPath.split("nickName=")
        let nickName;
        if (nickNames.length == 1) {
            nickName = to.name
        } else {
            nickName = nickNames[1]
        }
        store.commit('add_tabs', {route: to.fullPath, name: to.name, nickName: nickName});
        store.commit('set_active_index', to.fullPath);
    }

});
const dragControllerDiv = () => {
    let left = document.getElementById('left-tree')
    let line = document.getElementById('resize')
    let right = document.getElementById('right-content')
    // 鼠标按下事件
    line.onmousedown = function (e) {
        let startX = e.clientX
        line.left = line.offsetLeft
        // 鼠标拖动事件
        document.onmousemove = function (e) {
            let moveLen = line.left + (e.clientX - startX)
	        console.log(moveLen)
            if (
                moveLen >= document.body.clientWidth * 0.1 &&
                moveLen <= document.body.clientWidth * 0.5
            ) {
                line.style.left = moveLen + 'px'
                left.style.width = moveLen + 'px'
                right.style.width = document.body.clientWidth - moveLen + 'px'
            }
        }
        document.onmouseup = function () {
            document.onmousemove = null
            document.onmouseup = null
        }
    }
}

const addConnect = () => {
    connectDialog.value.show()
}
const openEditor = () => {
	let param = ""
	// for (let i = store.state.openTab.length - 1; i <= 0; i--) {
	// 	if (store.state.openTab[i].length>0 && store.state.openTab[i].indexOf("tableData") > 0) {
	// 		param = store.state.openTab[i].split("?")[1]
	// 		break
	// 	}
	// }
	router.push({path: "/sqlEditor"})
}
</script>

<template>
    <menu-item class="width100 menuClass"></menu-item>
    <div class="scroll width100">
        <el-col :span="24" class="flex" style="height: 62px">
            <div class="flex flexColumn iconItem" @click="addConnect">
                <Connection class="btnIcon"/>
                <div>
                    连接
                </div>
            </div>
            <div class="flex flexColumn iconItem" @click="openEditor">
                <Edit class="btnIcon"/>
                <div>
                    查询
                </div>
            </div>
        </el-col>
        <el-col :span="24" class="flex height100">
            <div class=" white" id="left-tree">
                <connect-tree ref="connectTree"></connect-tree>
                <div id="resize" class="resize" title="收缩侧边栏">⋮</div>
            </div>
            <div class="" id="right-content">
                <right-window ref="rightWindow"></right-window>
            </div>
        </el-col>
    </div>
    <footer></footer>
    <connect-dialog ref="connectDialog" @onReceiveMsg="connectData"></connect-dialog>
</template>

<style scoped>
#left-tree {
    width: 25%;
    position: relative;
    vertical-align: top;
    display: inline-block;
    box-sizing: border-box;
    -ms-flex-negative: 0;
    flex-shrink: 0;
    height: 100%;
}

.resize {
    cursor: col-resize;
    position: absolute;
    top: 50%;
    transform: translate(0, -50%);
    right: -10px;
    background-color: #d6d6d6;
    border-radius: 5px;
    margin-top: -10px;
    width: 10px;
    height: 40px;
    background-size: cover;
    background-position: 50%;
    font-size: 32px;
    color: #fff;
    z-index: 999;
}

.resize:hover {
    background: #89cbff;
}

#right-content {
    margin-left: 10px;
    height: 100%;
    width: 75%;
    display: inline-block;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    vertical-align: top;
    overflow: auto;
}

.white {
    background: white;
}

footer {
    height: 20px;
    width: 100%;
    background: #ccc;
}

.menuClass {
    height: 60px;
}

.width100 {
    width: 100%;
}

.height100 {
    height: calc(100% - 65px)
}

.btnIcon {
    height: 2em;
    font-size: 1em;
}

.iconItem {
    width: 4em;
    height: 4em;
    padding: 0.2em 0.3em;
}

.iconItem:hover {
    background: #79bbff;
    cursor: pointer;
}

.iconItem:hover div, .iconItem:hover .btnIcon {
    color: white;
}

.iconItem > div {
    width: 100%;
    font-size: 12px;
    text-align: center;
}

.flex {
    display: flex;
}

.flexColumn {
    flex-direction: column;
    justify-content: center;
}


.scroll {
    overflow: scroll;
    background-color: #F7F7F7;
    display: flex;
    flex-wrap: wrap;
    height: calc(100% - 80px);
}

</style>