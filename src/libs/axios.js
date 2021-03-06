/*
 * @Author: your name
 * @Date: 2020-05-11 11:17:25
 * @LastEditTime: 2022-06-30 10:49:32
 * @LastEditors: 赵婷婷
 * @Description: In User Settings Edit
 * @FilePath: \files\src\libs\axios.js
 */
import axios from 'axios';
import store from '@/store';
// import { Spin } from 'view-design'
import Cookies from 'js-cookie';
import { getHeaders } from './util';
import { Message } from 'view-design';
import config from '@/config';
const addErrorLog = (errorInfo) => {
  const {
    statusText,
    status,
    request: { responseURL },
  } = errorInfo;
  let info = {
    type: 'ajax',
    code: status,
    mes: statusText,
    url: responseURL,
  };
  if (!responseURL.includes('save_error_logger')) store.dispatch('addErrorLog', info);
};

class HttpRequest {
  constructor() {
    this.queue = {};
  }
  getInsideConfig() {
    const config = {
      headers: getHeaders(),
    };
    return config;
  }
  destroy(url) {
    delete this.queue[url];
    if (!Object.keys(this.queue).length) {
      // Spin.hide()
    }
  }
  interceptors(instance, url) {
    // 请求拦截
    instance.interceptors.request.use(
      (config) => {
        // 添加全局的loading...
        if (!Object.keys(this.queue).length) {
          // Spin.show() // 不建议开启，因为界面不友好
        }
        this.queue[url] = true;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    // 响应拦截
    instance.interceptors.response.use(
      (res) => {
        this.destroy(url);
        const { data, status } = res;
        if (status != 200) {
          Message.error(data.msg);
        } else {
        }
        return { data, status };
      },
      (error) => {
        this.destroy(url);
        let errorInfo = error.response;
        if (!errorInfo) {
          const {
            request: { statusText, status },
            config,
          } = JSON.parse(JSON.stringify(error));
          errorInfo = {
            statusText,
            status,
            request: { responseURL: config.url },
          };
        }
        addErrorLog(errorInfo);
        return Promise.reject(error);
      }
    );
  }
  request(options) {
    const instance = axios.create();
    options = Object.assign(this.getInsideConfig(), options);
    options.baseURL = '';
    this.interceptors(instance, options.url);
    return instance(options);
  }
}
export default HttpRequest;
