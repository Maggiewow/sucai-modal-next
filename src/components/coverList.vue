<!--
 * @Author: your name
 * @Date: 2020-08-18 14:33:28
 * @LastEditTime: 2023-10-17 17:33:31
 * @LastEditors: 易木
 * @Description: In User Settings Edit
 * @FilePath: \sucai-modal-next\src\components\coverList.vue
-->
<template>
  <div>
    <div class="coverDom">
      <div span="6" v-for="(item, index) of coverList" :key="index" class="coverItem">
        <div class="materialItemBox" @click="chooseItemCheck(index)" @dblclick="previewImg(item)">
          <i class="materialItemThumb" :style="getThumb(item)"></i>
          <img src="../assets/choosed.png" class="choosed_logo" v-if="item.choosed" />
          <img src="../assets/noChoosed.png" class="choosed_logo" v-else />
        </div>
        <div class="materialItemInfo">
          <div class="materialItemTitle">{{ item.name }}</div>
          <div class="materialItemMore">
            <span v-if="item.width">{{ item.width }}*{{ item.height }}</span>
            <span v-if="item.size">{{ getSize(item.size) }}</span>
          </div>
        </div>
      </div>
    </div>
    <Modal v-model="preview_value" width="60" class="preview-modal" title="抽帧封面预览">
      <img :src="preview_cover" />
    </Modal>
  </div>
</template>

<script>
import { renderSize } from '@/libs/util.js'
import config from '@/config'
import Bus from '../libs/bus'
import { Message, Modal } from 'view-design'
// import 'view-design/dist/styles/iview.css';
import '@/index.less'
export default {
  name: 'CoverList',
  props: {
    list: {
      type: Array,
      default: [],
    },
    fileNumLimit: {
      type: Number,
      default: 1,
    },
  },
  components: {
    Message,
    Modal,
  },
  watch: {
    list() {
      this.coverList = this.list
    },
  },
  mounted() {
    Bus.$on('closeModal', () => {
      this.choosedCover = []
    })
  },
  data() {
    return {
      coverList: this.list,
      choosedCover: [],
      preview_value: false,
      preview_cover: '',
    }
  },
  computed: {
    chooseNum() {
      return this.choosedCover.length
    },
  },
  methods: {
    getSize: (item) => renderSize(item),
    getThumb(item) {
      return 'backgroundImage:url(' + item.url + ')'
    },
    chooseItemCheck(index) {
      let item = this.coverList[index]
      let _this = this
      let choosed = _this.coverList[index].choosed ? true : false
      if (!choosed) {
        if (_this.fileNumLimit === 1 && _this.chooseNum > 0) {
          this.coverList = this.coverList.map((item) => ({
            ...item,
            choosed: false,
          }))
          _this.choosedMaterials = []

          this.$nextTick(() => {
            _this.$set(this.coverList[index], 'choosed', true)
            _this.choosedMaterials.push(item)

            Bus.$emit('doMaterials', _this.choosedMaterials)
          })
          return
        }
        if (_this.chooseNum >= this.fileNumLimit) {
          Message.error('已选封面过多！')
        } else {
          _this.$set(_this.coverList[index], 'choosed', true)
          _this.choosedCover.push(item)
          Bus.$emit('doMaterials', _this.choosedCover)
        }
      } else {
        _this.$set(_this.coverList[index], 'choosed', false)
        _this.choosedCover.splice(index, 1)
        Bus.$emit('doMaterials', _this.choosedCover)
      }
    },
    previewImg(item) {
      this.preview_cover = item.url
      this.preview_value = true
    },
    //清除选中态
    clearChoosedList() {
      this.choosedCover = []
    },
  },
}
</script>

<style lang="less" scoped>
.coverDom {
  height: 400px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  .coverItem {
    width: 19%;
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
      margin-top: 10px;
      margin-bottom: 15px;
      .materialItemTitle {
        width: 100%;
        height: 24px;
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: none;
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
}
.preview-modal {
  text-align: center;
  img {
    width: 90%;
  }
}
</style>
