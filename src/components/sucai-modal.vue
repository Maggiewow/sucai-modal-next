<!--
 * @Author: your name
 * @Date: 2020-07-23 10:38:24
 * @LastEditTime: 2024-01-23 10:44:21
 * @LastEditors: 易木
 * @Description: In User Settings Edit
 * @FilePath: \sucai-modal-next\src\components\sucai-modal.vue
-->
<template>
  <div>
    <Modal
      v-model="modal"
      :title="`${typeName}`"
      width="970px"
      :mask-closable="false"
      :closable="false"
      @on-visible-change="changeShow"
    >
      <div>
        <material-tabs
          ref="materialTabs"
          :type="materialType"
          :fileLimitNum="fileLimitNum"
          :modalKey="modal"
          :baseUrl="baseUrl"
          :from="from"
          :websocketUrl="websocketUrl"
          :highLimit="m_high_code_rate_limit"
          @start_transcode="start_transcode"
          :showPictureOfArticle="articleCover"
          @beforeSaveToStore="beforeSaveToStore"
          @afterSaveToStore="afterSaveToStore"
        >
        </material-tabs>
      </div>
      <div slot="footer">
        <Button
          type="primary"
          :loading="buttonLoading"
          v-if="materialType == 'voice' && choosedMaterials.length == 1"
          @click="handleAddVoiceCover"
          >添加封面</Button
        >
        <Button @click="cancel">取消</Button>
        <Button type="primary" @click="ok" :loading="buttonLoading">{{
          materialType == 'video' && !onlyChooseVideo ? '添加封面' : '确定'
        }}</Button>
      </div>
    </Modal>
  </div>
</template>

<script>
import MaterialTabs from './material-tabs'
import { Button, Modal, Message } from 'view-design'
// import 'view-design/dist/styles/iview.css';
import '@/index.less'
import config from '@/config'
import Bus from '../libs/bus'
import { checkIsTranscode } from '@/api/data'
import Cookies from 'js-cookie'
export default {
  name: 'sucai-modal-next',
  props: {
    type: {
      type: String,
      default: 'image',
    },
    modalKey: {
      type: Boolean,
      default: false,
    },
    fileLimitNum: {
      type: Number,
      default: 1,
    },
    baseUrl: {
      type: String,
      default: '',
    },
    from: {
      type: String,
      default: 'article',
    },
    websocketUrl: {
      type: String,
      default: 'wss://sucai.shandian.design/',
    },
    high_code_rate_limit: {
      type: String | Number,
      default: '0',
    },
    showPictureOfArticle: {
      type: Boolean,
      default: false,
    },
    onlyChooseVideo: {
      type: Boolean,
      default: false,
    },
    // onlyChooseVideo:true时 控制是否转码
    videoNeedTranscode: {
      type: Boolean,
      default: false,
    },
  },
  watch: {
    modalKey() {
      this.modal = this.modalKey
    },
    type() {
      this.materialType = this.type
    },
    baseUrl() {
      config.baseUrl.pro = this.baseUrl
    },
    high_code_rate_limit() {
      this.m_high_code_rate_limit = this.high_code_rate_limit
    },
    showPictureOfArticle() {
      this.articleCover = this.showPictureOfArticle
    },
  },
  components: {
    MaterialTabs,
    Button,
    Modal,
    Message,
  },
  data() {
    return {
      modal: false,
      tabsMenu: {
        image: [
          { index: 1, title: '素材库' },
          { index: 2, title: '本地库' },
        ],
        video: [
          { index: 1, title: '素材库' },
          { index: 2, title: '本地库' },
          { index: 3, title: '插入视频' },
        ],
        voice: [
          { index: 1, title: '素材库' },
          { index: 2, title: '本地库' },
        ],
      },
      choosedMaterials: [],
      materialType: this.type,
      m_high_code_rate_limit: this.high_code_rate_limit,
      showComs: false,
      articleCover: this.showPictureOfArticle,
      buttonLoading: false,
      ws: null, //webSocket所用
      wsInterval: undefined,
    }
  },
  computed: {
    typeName() {
      let mtypeName = ''
      switch (this.materialType) {
        case 'image':
          mtypeName = '图片素材选择'
          break
        case 'video':
          mtypeName = '视频素材选择'
          break
        case 'voice':
          mtypeName = '音频素材选择'
          break
        case 'coverImg':
          mtypeName = '封面选择'
          break
        case 'transcodeVideo':
          mtypeName = '转码视频选择'
          break
      }
      return mtypeName
    },
  },
  mounted() {
    let vm = this
    Bus.$on('doMaterials', (list) => {
      // console.log('modal', list);
      this.choosedMaterials = list
    })
    config.baseUrl.pro = vm.baseUrl
  },
  methods: {
    ok() {
      if (this.choosedMaterials.length === 0) {
        Message.error('请选择素材！')
        return false
      }
      if (this.materialType == 'video') {
        if (this.onlyChooseVideo) {
          this.$emit('chooseVideoOk', this.choosedMaterials)
          if (this.videoNeedTranscode) {
            this.checkIsTranscode(this.choosedMaterials[0].id)
          }
        } else {
          this.$emit('chooseVideoOk', this.choosedMaterials)
          this.initWebSocket('file_id', this.choosedMaterials[0].id)
          this.checkIsTranscode(this.choosedMaterials[0].id)
          this.materialType = 'coverImg'
          this.choosedMaterials = []
          let params = { type: 'image', highLimit: this.high_code_rate_limit }
          // Bus.$emit('openModal', params);
          this.$refs.materialTabs.watchOpenModal('image', this.high_code_rate_limit)
        }
      } else if (this.materialType == 'coverImg') {
        this.$emit('chooseCoverOk', this.choosedMaterials)
        this.choosedMaterials = []
      } else if (this.materialType == 'voiceImg') {
        this.$emit('chooseVoiceCoverOk', this.choosedMaterials)
        this.choosedMaterials = []
      } else {
        this.$emit('handleMaterialModalOk', this.choosedMaterials)
        this.choosedMaterials = []
      }
    },
    cancel() {
      this.$emit('handleMaterialModalCancle')
    },
    handleAddVoiceCover() {
      this.$emit('handleStartChooseVoiceCover', this.choosedMaterials)
      this.initWebSocket('file_id', this.choosedMaterials[0].id)
      this.checkIsTranscode(this.choosedMaterials[0].id)
      this.materialType = 'voiceImg'
      this.choosedMaterials = []
      let params = { type: 'image', highLimit: this.high_code_rate_limit }
      this.$refs.materialTabs.watchOpenModal('image', this.high_code_rate_limit)
    },
    changeShow(status) {
      if (status) {
        this.materialType = this.type
        let params = { type: this.type, highLimit: this.high_code_rate_limit }
        // Bus.$emit('openModal', params);
        // console.log(this.articleCover);
        this.$refs.materialTabs.watchOpenModal(this.type, this.high_code_rate_limit)
      } else {
        this.$refs.materialTabs.watchCloseModal(this.type, this.high_code_rate_limit)
        this.wsInterval && clearInterval(this.wsInterval)
        // Bus.$emit('closeModal');
      }
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
              _this.$refs.materialTabs.cutTimePic(data.data.urls)
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
    start_transcode(id) {
      // let orgId = Cookies.get('orgId')
      // if(orgId && orgId == '10339' && this.high_code_rate_limit == '0'){
      //   console.log('这是融媒体,并且没开电视播放，不转码')
      // } else {
      //   this.$emit('start_transcode', id);
      // }
    },
    checkIsTranscode(id) {
      checkIsTranscode(this.baseUrl)
        .then((res) => {
          let mSwitch = res.data.data.switch
          if (mSwitch) {
            let orgId = Cookies.get('orgId')
            if (orgId && orgId == '10339' && this.high_code_rate_limit == '0') {
              console.log('这是融媒体,并且没开电视播放，不转码')
            } else {
              this.$emit('start_transcode', id)
            }
          }
        })
        .catch((err) => {
          console.log(err)
        })
    },
    beforeSaveToStore() {
      this.buttonLoading = true
    },
    afterSaveToStore() {
      this.buttonLoading = false
    },
    //socket -ping
    intervalSend() {
      let item = {
        type: 'ping',
      }
      this.ws.send(JSON.stringify(item))
    },
  },
}
</script>

<style lang="less" scoped></style>
