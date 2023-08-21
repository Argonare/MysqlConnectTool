import {createRouter, createWebHashHistory, createWebHistory} from "vue-router";

const routes = [
    {
        path: "/",
        name: "首页",
        component: () => import(/* webpackChunkName: "about" */ "../App.vue"),
    }, {
        path: "/connectDialog",
        name: "test",
        component: () => import(/* webpackChunkName: "about" */ "../components/menuItem.vue"),
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
})
export default router