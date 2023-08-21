import {useStore as baseUseStore,createStore} from 'vuex'

export default createStore({
    state: {
        openTab: [],//所有打开的路由
        activeIndex: '/', //也可以是默认激活路径；激活状态
    },
    mutations: {
        // 添加tabs
        add_tabs(state, data) {
            console.log("store")
            this.state.openTab.push(data);
        },
        // 删除tabs
        delete_tabs(state, route) {
            let index = 0;
            for (let option of state.openTab) {
                if (option.route === route) {
                    break;
                }
                index++;
            }
            this.state.openTab.splice(index, 1);
        },
        // 设置当前激活的tab
        set_active_index(state, index) {
            this.state.activeIndex = index;
        },
    },

    actions: {},
    modules: {}

})

export function useStore() {
    return baseUseStore()
}