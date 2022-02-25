/*
 * @Author: your name
 * @Date: 2020-07-23 09:48:43
 * @LastEditTime: 2022-02-25 10:48:27
 * @LastEditors: 赵婷婷
 * @Description: In User Settings Edit
 * @FilePath: \sucai-modal\src\router\index.js
 */

import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '../views/Home.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
];

const router = new VueRouter({
  routes,
});

export default router;
