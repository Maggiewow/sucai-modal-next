<!--
 * 修改 适应原本的sucai-modal v53 => v56 增加控制并发
 * @Author: your name
 * @Date: 2020-07-23 09:48:43
 * @LastEditTime: 2023-10-19 11:08:11
 * @LastEditors: 易木
 * @Description: In User Settings Edit
 * @FilePath: \sucai-modal\src\views\Home.vue
-->
<template>
  <div class="js-modal-inner">
    <Button class="upload-btn" type="primary" icon="ios-cloud-upload-outline"
      >上传<input
        ref="fileInput"
        type="file"
        multiple
        class="select-file-input"
        :accept="acceptType"
        @change="handleFileChange"
    /></Button>

    <div class="file-list">
      <div class="file-item" v-for="(item, index) in uploadList" :key="index">
        <template v-if="!item.removed">
          <!-- 上传中  v-if="item.upload_status === 0 || item.upload_status === 1"-->
          <queue-chunk
            v-if="modalKey"
            ref="queueDom"
            :baseUrl="sck_url"
            :max="onceMaxChunk"
            @setProgress="(percent) => setUploadProgress(percent, index)"
            @success="allChunkUploaded"
            @error="uploadError"
          />
          <!-- stroke-color="#E2EDFE" -->
          <Progress
            class="deep-pro-bar"
            :percent="calcPercent(item.upload_status, item.upload_percent)"
            :stroke-width="40"
            stroke-color="#F3F3F3"
            hide-info
          />
          <div class="file-info-line">
            <div class="title-col">
              <div class="file-type top-level" :icon="fileCategory(item.ext, item.file_type)"></div>
              <Poptip
                trigger="hover"
                placement="bottom"
                style="height: 57px"
                v-if="item.file_type == 'image' && item.url"
              >
                <p class="name-text top-level" :title="item.filename">{{ item.filename }}</p>
                <div class="image-preview-dom" slot="content">
                  <img :src="item.url" class="image-preview-self" />
                </div>
              </Poptip>
              <p v-else class="name-text top-level" :title="item.filename">{{ item.filename }}</p>
            </div>
            <p class="size-text top-level">{{ bytesToSize(item.size) }}</p>
            <p class="status-text top-level">
              <span class="green-tips" v-if="item.upload_status === 2">{{
                uploadStatusText[item.upload_status]
              }}</span>
              <span class="red-tips" v-else-if="item.upload_status === 3">{{
                uploadStatusText[item.upload_status]
              }}</span>
              <span class="grey-tips" v-else>{{ uploadStatusText[item.upload_status] }}</span>
            </p>
            <Icon
              class="close-icon top-level"
              size="18"
              type="md-close"
              @click="removeFile(item, index)"
            />
          </div>
        </template>
      </div>
      <p class="no-content-tips" v-if="!showUploadList || showUploadList.length === 0">
        暂无文件
      </p>
    </div>
  </div>
</template>

<script>
import QueueChunk from './queue-chunk.vue'
import CoverList from '../coverList.vue'
import { Button, Message, Progress, Icon, Poptip } from 'view-design'
import { uploadInit, uploadFinish, uploadStop } from '@/api/upload'
import { calcBytesToSize, getFileMD5 } from './tools'
import { FILE_TYPE_MAP, Base_Content_Type } from './constant'
export default {
  name: 'js-upload',
  components: { Button, Progress, Icon, QueueChunk, CoverList, Poptip },
  props: {
    accept: {
      type: String,
      default: null,
    },
    // 上传最大数量 默认为100
    fileNumLimit: {
      type: Number,
      default: 100,
    },
    // 是否需要高码率
    highLimit: {
      type: String | Number,
      default: '0',
    },
    baseUrl: {
      type: String,
      default: 'https://shandianyun-sck.iqilu.com/',
    },
    modalKey: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      uploadStatusText: {
        0: '校验中...',
        1: '上传中...',
        2: '上传完成',
        3: '上传失败',
      },
      uploadList: [],
      chunkMap: {},
      allPendingFiles: [],
      onceMaxNum: 5, // 一次最多上传5个文件
      onceMaxChunk: 5, // 每个文件一次最多上传5个分片
      sck_url: this.baseUrl,
    }
  },
  watch: {
    uploadList: {
      deep: true,
      handler() {},
    },
    baseUrl() {
      this.sck_url = this.baseUrl
    },
  },
  computed: {
    // image video text voice
    acceptType() {
      if (!Object.keys(FILE_TYPE_MAP).includes(this.accept)) {
        Message.error('选择的文件类型错误')
        return ''
      }
      let fileType = FILE_TYPE_MAP[this.accept].format.map((ext) => `.${ext}`).join(',')
      return fileType
    },
    // 用户删除的文件在列表中不去掉 变为removed:true
    showUploadList() {
      let list = this.uploadList.filter(({ removed }) => !removed)
      return list
    },
  },
  methods: {
    handleFileChange(e) {
      const files = e.target.files
      if (!files) return
      let fileCount = files.length + (this.uploadList.length || 0)
      if (fileCount > this.fileNumLimit) {
        // 不符合数量的处理
        Message.warning('文件上传已达到最大上限数')
        // Message.warning('文件数不能超过' + this.fileNumLimit + '个，你已选择了' + fileCount + '个');
        // bugfix: input上传同名文件不触发change方法
        this.$refs.fileInput.value = ''
        return
      }
      // let fileArr = Object.values(files).map((file, index) => this.modifyPerFile(file, index));
      const { newList, newUploadList } = this.modifyFiles(Object.values(files))
      this.$set(this, 'allPendingFiles', this.allPendingFiles.concat(newList))
      this.$set(this, 'uploadList', this.uploadList.concat(newUploadList))
      // 超过5的先传5 剩下的每次上传成功就再开始上传一个
      const onceMaxUploadArr = this.allPendingFiles.splice(0, this.onceMaxNum)
      onceMaxUploadArr.forEach((file) => {
        this.beforeUpload(file)
      })
      // bugfix: input上传同名文件不触发change方法
      this.$refs.fileInput.value = ''
    },
    modifyFiles(list) {
      let newUploadList = []
      let newList = list.map((file, index) => {
        // 设置id 防止多文件上传出现错误
        file.id = new Date().getTime() + '_' + index
        let arr = file.name ? file.name.split('.') : []
        if (arr && arr.length > 0) {
          file.ext = arr[arr.length - 1]
        }
        if (!file.type && file.ext) {
          file.type = Base_Content_Type[file.ext]
        }
        let { id, name, type, lastModifiedDate, size, ext } = file
        let uploadItem = {
          id,
          name,
          type,
          lastModifiedDate,
          size,
          ext,
          filename: file.name,
          upload_status: 0, // 文件校验中
          upload_percent: 0, // 0-100
          removed: false,
        }
        newUploadList.push(uploadItem)
        return file
      })
      return { newList, newUploadList }
    },
    // 弃用：逐个添加uploadList可能存在问题
    // 增加文件参数 并添加到uploadList中
    modifyPerFile(file, index) {
      // 设置id 防止多文件上传出现错误
      file.id = new Date().getTime() + '_' + index
      let arr = file.name ? file.name.split('.') : []
      if (arr && arr.length > 0) {
        file.ext = arr[arr.length - 1]
      }
      let newIndex = this.uploadList ? this.uploadList.length : 0
      let { id, name, type, lastModifiedDate, size, ext } = file
      this.$set(this.uploadList, newIndex, {
        id,
        name,
        type,
        lastModifiedDate,
        size,
        ext,
        filename: file.name,
        upload_status: 0, // 文件校验中
        upload_percent: 0, // 0-100
      })
      return file
    },
    // 处理上传
    beforeUpload(file) {
      // 得到md5码 获取切片
      getFileMD5(file, (md5, chunkObj) => {
        file.file_md5 = md5
        this.chunkMap[file.id] = chunkObj
        // 拿md5码查询后台数据库是否存在此md5码，如果存在则无需上传
        this.initCheckUpload(file)
      })
    },
    initCheckUpload(file) {
      let { ext, file_md5, type, size } = file
      // 判空：大小为0或者file_md5代表null
      if (size === 0 || file_md5 === 'd41d8cd98f00b204e9800998ecf8427e') {
        this.uploadError(file, { msg: '文件可能有损坏，请上传正确的文件格式' })
        return
      }
      let initArgs = {
        ext, // "jpg"
        MIME_type: type, // "image/jpeg"
        file_md5, // "6e259b9afb49248cd60c2dc78aaf9498"
        video_high_code_rate_limit: this.highLimit, // "0"
      }
      uploadInit(this.sck_url, initArgs)
        .then((res) => {
          if (res.status == 200) {
            let { status, uuid, current_chunk, extra } = res.data.data
            // 1：未上传过 2：已存在了 直接finish
            if (status === '1') {
              file.current_chunk = current_chunk
              file.uuid = uuid
              // TODO 断点续传
              this.uploadAllChunk(file)
            } else if (status === '2') {
              if (extra.file_type == this.accept) {
                this.uploadSuccess(file, extra)
              } else {
                this.uploadError(file, { msg: '文件类型选择错误' })
              }
              // this.uploadSuccess(file, extra)
            }
          } else {
            console.log('init Error', file, res)
            this.uploadError(file, { msg: '文件检查失败' })
          }
        })
        .catch((err) => {
          console.log('init catch', err.response)
          this.uploadError(file, { msg: err.response.data.msg || '文件检查失败' })
        })
    },
    calcPercent(status, percent) {
      let percentNum = 0
      if (status === 0) {
        percentNum = 0
      } else if (status === 2) {
        percentNum = 100
      } else {
        percentNum = percent
      }
      return percentNum
    },
    setUploadProgress(percent, index) {
      this.$set(this.uploadList[index], 'upload_percent', percent)
    },
    uploadAllChunk(file) {
      let i = 0
      // 文件上传中
      this.uploadList.forEach((item, index) => {
        if (item.id === file.id) {
          item.upload_status = 1
          item.uuid = file.uuid
          i = index
        }
      })
      setTimeout(() => {
        // {0: Blob, 1: Blob} ==> [['0', Blob], ['1', Blob]]
        let list = Object.entries(this.chunkMap[file.id])
        if (this.$refs.queueDom[i]) {
          this.$refs.queueDom[i].queueUpload(file, list)
        }
      }, 200)
    },
    allChunkUploaded(file) {
      let params = {
        uuid: file.uuid,
        video_high_code_rate_limit: this.highLimit,
      }
      uploadFinish(this.sck_url, params)
        .then((res) => {
          let { data, status } = res
          if (status === 200) {
            console.log(data.data)
            console.log(this.accept)
            if (data.data.file_type == this.accept) {
              this.uploadSuccess(file, data.data)
            } else {
              this.uploadError(file, { msg: '文件类型选择错误' })
            }
          } else {
            this.uploadError(file, { msg: data.msg || '文件合并失败' })
          }
        })
        .catch((err) => {
          let errorMessage = '文件合并失败'
          if (this.highLimit == '1') {
            errorMessage = '上传失败，请检查是否是视频码率过低'
          }
          console.log('合并失败catch', err)
          this.uploadError(file, { msg: errorMessage })
        })
    },
    // 上传成功调用
    uploadSuccess(file, data) {
      delete this.chunkMap[file.id]
      this.uploadList.forEach((item, index) => {
        if (item.id === file.id) {
          let extra = {
            ...item,
            ...data,
            filename: file.name,
            upload_status: 2,
          }
          console.log('上传成功', extra)
          this.$set(this.uploadList, index, extra)
          this.$emit('success', file, extra)
        }
      })
      if (this.allPendingFiles && this.allPendingFiles.length > 0) {
        // 下一文件 上传
        let file = this.allPendingFiles.splice(0, 1)[0]
        file && this.beforeUpload(file)
      } else {
        this.allPendingFiles = []
      }
    },
    // 上传失败调用
    uploadError(file, error) {
      // 文件上传中
      this.uploadList.forEach((item) => {
        item.id === file.id && (item.upload_status = 3)
      })
      this.$emit('error', error.msg || '上传失败')
    },
    // 终止分片上传过程 防止损耗性能 closemodal时必须终止全部上传过程
    removeFile(item, index) {
      if ([1].includes(item.upload_status)) {
        uploadStop(this.sck_url, item.uuid).then((res) => {
          console.log('正在上传中--已终止', res)
        })
      }
      // 如果此时大视频正在校验中或者上传中 终止queueDom上传
      if ([0, 1].includes(item.upload_status)) {
        this.$refs.queueDom[index] && this.$refs.queueDom[index].destroy()
      }
      setTimeout(() => {
        // 2023/3/24 uploadList改为软删除 不影响上传进行中文件的索引值
        // this.uploadList.splice(index, 1)
        let obj = this.uploadList[index]
        this.$set(this.uploadList, index, { ...obj, removed: true })
        // id匹配this.allPendingFiles 删除这一项
        this.allPendingFiles = this.allPendingFiles.filter(({ id }) => id !== item.id)
        this.$emit('remove', item, index)
      }, 200)
    },
    // 根据文件扩展名得到文件类型  ext ==> type
    fileCategory(ext, fileType) {
      if (fileType) return fileType
      let type = ''
      Object.keys(FILE_TYPE_MAP).forEach((_type) => {
        const extensions = FILE_TYPE_MAP[_type].format
        if (extensions.includes(ext)) {
          type = _type
        }
      })
      return type
    },
    // 单位转换
    bytesToSize: calcBytesToSize,
    destroy() {
      this.allPendingFiles = []
      this.uploadList = []
      this.chunkMap = {}
    },
  },
}
</script>

<style lang="less" scoped>
@import url('./style');
.image-preview-dom {
  width: 200px;
  text-align: center;
  .image-preview-self {
    max-width: 100%;
    max-height: 200px;
  }
}
</style>
