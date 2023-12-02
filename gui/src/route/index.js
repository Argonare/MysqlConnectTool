import {createRouter, createWebHashHistory, createWebHistory} from "vue-router";

const routes = [
    {
        path: "/",
        name: "首页",
        component: () => import(/* webpackChunkName: "about" */ "../App.vue"),
    },
    {
        path: "/empty",
        name: "对象",
        component: () => import(/* webpackChunkName: "about" */ "@/components/empty.vue"),
    },

    {
        path: "/DataTable",
        name: "表格数据",
        component: () => import(/* webpackChunkName: "about" */ "@/components/level2/DataTable.vue"),
    }
    , {
        path: "/sqlEditor",
        name: "sql编辑器",
        component: () => import(/* webpackChunkName: "about" */ "../components/level2/sqlEditor.vue"),
    }, {
        path: "/tableEdit",
        name: "表编辑",
        component: () => import(/* webpackChunkName: "about" */ "../components/level2/tableEdit.vue"),
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
})
export default router