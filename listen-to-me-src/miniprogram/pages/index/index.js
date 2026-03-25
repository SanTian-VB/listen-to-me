/**
 * 将你的 Listen to Me H5 部署到 HTTPS 域名后，把完整根地址写在这里（末尾可加 /）
 * 例如：https://listen.example.com/
 *
 * 注意：该域名必须在「微信公众平台 → 开发 → 开发管理 → 开发设置 → 业务域名」中校验通过，
 * 且下载校验文件放到网站根目录。
 */
const H5_BASE = ''

Page({
  data: {
    h5Url: '',
  },
  onLoad() {
    const base = (H5_BASE || '').trim().replace(/\/$/, '')
    if (!base) {
      this.setData({ h5Url: '' })
      return
    }
    this.setData({
      h5Url: `${base}/`,
    })
  },
})
