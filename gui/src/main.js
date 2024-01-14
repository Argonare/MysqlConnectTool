import {createApp} from 'vue'
import App from './App.vue'

// 自定义图标库
import SvgIcon from '@/components/SvgIcon/index.vue'
// 自定义样式
import '@/assets/main.scss'
// 组件库 ElementPlus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css' // 暗黑模式
import {ElMessage} from 'element-plus'
// 图标库 ElementPlus
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import store from "../store"
import Vuex from 'vuex'
import router from './route'

import contextmenu from "v-contextmenu";
import "v-contextmenu/dist/themes/default.css";

const app = createApp(App)

// app.use(Vuex)
app.use(contextmenu)
app.use(store)
app.use(router)
app.use(ElementPlus)


for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}


app.component('SvgIcon', SvgIcon)

app.directive('focus', {
    // 当被绑定的元素插入到 DOM 中时……
    mounted: function (el) {
        // 聚焦元素
        if (el.querySelector("input") != null) {
            el.querySelector("input").focus()
        }
    }
})
app.config.globalProperties.$request = (func, data) => {
    return new Promise((resolve) => {
        window.pywebview.api[func](data).then((res) => {
            if (typeof (res) != "object") {
                res = JSON.parse(res)
            }
            if (res.code === 200) {
                resolve(res.data)
            } else {
                ElMessage.error(res.msg)
            }
        }).catch((res) => {
            ElMessage.error(res.message)

        })
    })

}


app.mount('#app')

