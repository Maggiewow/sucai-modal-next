/*
 * @Author: your name
 * @Date: 2020-08-13 10:13:33
 * @LastEditTime: 2022-02-25 10:08:42
 * @LastEditors: 赵婷婷
 * @Description: In User Settings Edit
 * @FilePath: \sucai-modal-next\src\components\index.js
 */
import SucaiModalNext from './sucai-modal.vue';
SucaiModalNext.install = function (Vue) {
  Vue.component(SucaiModalNext.name, SucaiModalNext);
};
export default SucaiModalNext;
