<!--
 * @Author: your name
 * @Date: 2020-07-23 14:51:28
 * @LastEditTime: 2023-08-23 11:03:43
 * @LastEditors: 易木
 * @Description: In User Settings Edit
 * @FilePath: \sucai-modal-next\src\components\sucaiList.vue
-->
<template>
  <div>
    <Row :gutter="20">
      <i-col span="6">
        <Tree
          class="folder-tree narrow-scroll-bar"
          :data="foldersMenu"
          :load-data="getFolders"
          @on-select-change="chooseFolder"
        ></Tree>
      </i-col>
      <i-col span="18">
        <div class="chooseTips">已选{{ chooseNum }} 张</div>
        <Row :gutter="20" style="height: 400px">
          <i-col span="6" v-for="(item, index) of materialList" :key="index" class="materialItem">
            <div class="materialItemBox" @click="chooseItemCheck(index)">
              <i class="materialItemThumb" :style="getThumb(item)"></i>
              <img src="../assets/choosed.png" class="choosed_logo" v-if="item.choosed" />
              <img src="../assets/noChoosed.png" class="choosed_logo" v-else />
            </div>
            <div class="materialItemInfo">
              <div class="materialItemTitle" :title="item.name">
                {{ item.name }}
              </div>
              <div class="materialItemMore">
                <span>{{ item.width }}*{{ item.height }}</span>
                <span>{{ getSize(item.size) || '未知大小' }}</span>
              </div>
            </div>
          </i-col>
        </Row>
      </i-col>
    </Row>
  </div>
</template>

<script>
import Vue from 'vue'
import { getFolders, getCooperateFolders } from '@/api/data'
import { renderSize } from '@/libs/util.js'
import { Row, Col, Tree, Dropdown, DropdownItem, DropdownMenu, Message } from 'view-design'
Vue.component('Dropdown', Dropdown)
Vue.component('DropdownMenu', DropdownMenu)
import config from '@/config'
// import 'view-design/dist/styles/iview.css';
import '@/index.less'
import Bus from '../libs/bus'
import voiceLogo from '../assets/voice.png'
export default {
  name: 'sucaiList',
  components: {
    [Row.name]: Row,
    [Col.name]: Col,
    Tree,
    Message,
  },

  props: {
    list: {
      type: Array,
      default: () => {
        return []
      },
    },
    maxNum: {
      type: Number,
      default: 1,
    },
    baseUrl: {
      type: String,
    },
    type: {
      type: String,
      default: 'image',
    },
    websocketUrl: {
      type: String,
      default: 'wss://sucai.shandian.design/',
    },
  },
  watch: {
    list() {
      this.materialList = this.list
    },
    type: {
      handler(type) {
        if (type) {
          this.materialType = this.type
          this.getFolders()
          this.getCooperateFoldersFun()
        }
      },
      immediate: true,
    },
  },
  data() {
    return {
      materialList: this.list,
      foldersMenu: [
        {
          id: 0,
          title: '素材',
          loading: false,
          children: [],
          selected: true,
          expand: false,
        },
      ],
      choosedMaterials: [],
      materialType: '',
      ws: null, //webSocket所用
      wsInterval: undefined,
      cutTUrls: [],
    }
  },
  computed: {
    chooseNum() {
      return this.choosedMaterials.length
    },
  },
  mounted() {
    // Bus.$on('openModal', (args) => {
    //   this.choosedMaterials = [];
    // });
    // this.getFolders();
  },
  methods: {
    chooseItemCheck(index) {
      let url, compress
      let item = this.materialList[index]
      let _this = this
      let choosed = _this.materialList[index].choosed ? true : false
      if (!choosed) {
        // 优化选择 仅单张的时候
        if (_this.maxNum === 1 && _this.chooseNum > 0) {
          this.materialList = this.materialList.map((item) => ({
            ...item,
            choosed: false,
          }))
          _this.choosedMaterials = []

          this.$nextTick(() => {
            _this.$set(this.materialList[index], 'choosed', true)
            _this.choosedMaterials.push(item)

            Bus.$emit('doMaterials', _this.choosedMaterials)
          })
          return
        }

        if (_this.chooseNum > _this.maxNum - 1) {
          Message.error(`已选素材已超过${this.maxNum}张！`)
        } else {
          _this.$set(this.materialList[index], 'choosed', true)
          _this.choosedMaterials.push(item)

          Bus.$emit('doMaterials', _this.choosedMaterials)
        }
      } else {
        _this.$set(this.materialList[index], 'choosed', false)
        let order = _this.choosedMaterials.findIndex((choosedItem) => choosedItem.id == item.id)
        if (order || order === 0) {
          _this.choosedMaterials.splice(order, 1)
          Bus.$emit('doMaterials', _this.choosedMaterials)
        } else {
          console.error('逻辑错误', order)
        }
      }
    },
    clearChoosed() {
      this.choosedMaterials = []
    },
    getFolders(item, callback) {
      let path_id = 0
      let getFolderMethod = getFolders
      if (item) {
        path_id = item.id
        if (item.cloud_type == 'local_coop') {
          getFolderMethod = getCooperateFolders
        }
      }
      getFolderMethod(this.baseUrl, this.materialType, path_id)
        .then((res) => {
          let foldersMenu = res.data.data.map((folder) => {
            let folderItem = {
              title: folder.file_name,
              loading: false,
              children: [],
              id: folder.id,
              cloud_type: folder.cloud_type || '',
            }
            return folderItem
          })
          if (item) {
            callback(foldersMenu)
          } else {
            this.foldersMenu[0].children = foldersMenu
            this.foldersMenu[0].expand = true
          }
        })
        .catch((err) => {
          console.log(err)
        })
      // if (item) {

      // } else {
      //   getFolders(this.baseUrl, this.materialType, 0)
      //     .then((res) => {
      //       let foldersMenu = res.data.data.map((folder) => {
      //         let folderItem = {
      //           title: folder.file_name,
      //           loading: false,
      //           children: [],
      //           id: folder.id,
      //         }
      //         return folderItem
      //       })

      //     })
      //     .catch((err) => {
      //       console.log(err)
      //     })
      // }
    },
    getCooperateFoldersFun(item, callback) {
      let path_id = item ? item.id : 0
      getCooperateFolders(this.baseUrl, this.materialType, path_id).then((res) => {
        let foldersMenu = res.data.data.map((folder) => {
          let folderItem = {
            title: folder.file_name,
            loading: false,
            children: [],
            id: folder.id,
            cloud_type: folder.cloud_type || '',
          }
          return folderItem
        })
        console.log(foldersMenu, '共建素材库')

        //如果有共建素材库那就展示
        if (foldersMenu && foldersMenu.length) {
          let coopFolders = {
            id: 'coop-0',
            folderId: 0,
            title: '共建素材',
            loading: false,
            children: foldersMenu,
            selected: false,
            expand: false,
            cloud_type: 'local_coop',
          }
          if (this.foldersMenu.length == 1) {
            this.foldersMenu.push(coopFolders)
          }
          //  else {
          //   this.foldersMenu[1] = coopFolders
          // }
        }
      })
    },
    getThumb(item) {
      if (this.materialType === 'image') {
        return 'backgroundImage:url(' + item.thumb + ')'
      } else if (this.materialType === 'video') {
        return 'backgroundImage:url(' + item.cover + ')'
      } else if (this.materialType === 'voice') {
        return 'backgroundImage:url("https://shandianyun-sck.iqilu.com/icon-huatong.png"); background-size: 40% 50%'
      }
    },
    getSize: (item) => renderSize(item),
    //选中文件夹
    chooseFolder(array, attr) {
      this.$emit('chooseFolder', attr.id, attr.cloud_type)
    },
    initWebSocket(ident_type, ident) {
      let _this = this
      let websocketPath = _this.websocketUrl + 'socket.io '
      _this.ws = new WebSocket(websocketPath)
      let ws = _this.ws
      if ('WebSocket' in window) {
        ws.onopen = function() {
          //当WebSocket创建成功时，触发onopen事件
          let item = {
            type: 'receive',
            version: '2.00',
            request: {
              ident_type: ident_type,
              ident: ident,
            },
          }
          ws.send(JSON.stringify(item)) //将消息发送到服务端
          _this.wsInterval = setInterval(() => {
            _this.intervalSend()
          }, 45000)
        }
        ws.onmessage = function(e) {
          //当客户端收到服务端发来的消息时，触发onmessage事件，参数e.data包含server传递过来的数据
          let data = JSON.parse(e.data)
          switch (data.type) {
            case 'init':
              break
            case 'reply':
              // console.log(data.data);
              break
            case 'push':
              // _this.cutTUrls = _this.cutTUrls.concat(data.data.urls)
              _this.$emit('cutTimePic', data.data.urls)
              break
          }
        }
        ws.onclose = function(e) {
          //当客户端收到服务端发送的关闭连接请求时，触发onclose事件
          console.log(e)
          console.log('close')
        }
        ws.onerror = function(e) {
          //如果出现连接、处理、接收、发送数据失败的时候触发onerror事件
          console.log(e)
        }
      } else {
        console.log('您的浏览器不支持WebSocket')
      }
    },
    intervalSend() {
      let item = {
        type: 'ping',
      }
      this.ws.send(JSON.stringify(item))
    },
  },
}
</script>

<style lang="less" scoped>
.chooseTips {
  margin: 2px 10px 10px 0;
}
.materialItem {
  .materialItemBox {
    background-color: #f1f3f5;
    height: 130px;
    position: relative;
    .choosed_logo {
      width: 20px;
      height: 20px;
      position: absolute;
      right: 10px;
      top: 10px;
    }
    .materialItemThumb {
      display: block;
      height: 0;
      padding-bottom: 130px;
      background-size: contain;
      background-position: center center;
      background-repeat: no-repeat;
      border-radius: 3px;
      overflow: hidden;
    }
  }
  .materialItemInfo {
    width: 100%;
    margin-bottom: 15px;
    margin-top: 10px;
    .materialItemTitle {
      width: 100%;
      height: 24px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 16px;
      margin-top: 5px;
    }
    .materialItemMore {
      color: #999;
      font-size: 14px;
      span {
        margin-right: 10px;
      }
    }
  }
}
.folder-tree {
  height: 500px;
  overflow-y: auto;

  ::v-deep .ivu-tree-children {
    overflow: hidden;
  }
}
.narrow-scroll-bar::-webkit-scrollbar {
  /*滚动条整体样式*/
  width: 5px;
  /*高宽分别对应横竖滚动条的尺寸*/
  height: 1px;
}

.narrow-scroll-bar::-webkit-scrollbar-thumb {
  /*滚动条里面小方块*/
  /* border-radius: 6px; */
  /* box-shadow: inset 0 0 5px rgba(55, 153, 245, 0.2); */
  background: #aaa;
}

.narrow-scroll-bar::-webkit-scrollbar-track {
  /*滚动条里面轨道*/
  /* box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2); */
  /* border-radius: 6px; */
  background: #f2f2f2;
}
</style>
