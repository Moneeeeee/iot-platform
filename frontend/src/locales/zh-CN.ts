/**
 * 中文简体语言包
 */

export const zhCN = {
  // 通用
  common: {
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    search: '搜索',
    filter: '筛选',
    export: '导出',
    import: '导入',
    refresh: '刷新',
    loading: '加载中...',
    noData: '暂无数据',
    success: '操作成功',
    error: '操作失败',
    warning: '警告',
    info: '提示',
    yes: '是',
    no: '否',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    close: '关闭',
    open: '打开',
    online: '在线',
    offline: '离线',
    unknown: '未知'
  },

  // 导航
  navigation: {
    home: '首页',
    about: '关于我们',
    devices: '设备总览',
    dashboard: '仪表板',
    login: '登录',
    register: '注册',
    logout: '退出登录',
    profile: '个人资料',
    settings: '设置',
    help: '帮助',
    support: '技术支持'
  },

  // 认证
  auth: {
    login: '登录',
    register: '注册',
    logout: '退出登录',
    username: '用户名',
    password: '密码',
    email: '邮箱地址',
    confirmPassword: '确认密码',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    loginSuccess: '登录成功',
    loginFailed: '登录失败',
    registerSuccess: '注册成功',
    registerFailed: '注册失败',
    invalidCredentials: '用户名或密码错误',
    accountLocked: '账户已被锁定',
    sessionExpired: '会话已过期，请重新登录',
    welcomeBack: '欢迎回来！',
    createAccount: '创建账户',
    alreadyHaveAccount: '已有账户？',
    noAccount: '没有账户？',
    termsAndPrivacy: '我同意服务条款和隐私政策'
  },

  // 用户角色
  roles: {
    admin: '管理员',
    operator: '操作员',
    viewer: '查看者'
  },

  // 设备相关
  devices: {
    title: '设备管理',
    deviceList: '设备列表',
    deviceDetails: '设备详情',
    deviceStatus: '设备状态',
    deviceType: '设备类型',
    deviceName: '设备名称',
    deviceId: '设备ID',
    serialNumber: '序列号',
    firmwareVersion: '固件版本',
    lastSeen: '最后在线',
    batteryLevel: '电池电量',
    location: '位置',
    ipAddress: 'IP地址',
    addDevice: '添加设备',
    editDevice: '编辑设备',
    deleteDevice: '删除设备',
    deviceOnline: '设备在线',
    deviceOffline: '设备离线',
    deviceError: '设备错误',
    deviceMaintenance: '设备维护',
    smartSensor: '智能传感器',
    smartGateway: '智能网关',
    smartController: '智能控制器'
  },

  // 传感器相关
  sensors: {
    temperature: '温度',
    humidity: '湿度',
    pressure: '压力',
    light: '光照',
    temperatureUnit: '°C',
    humidityUnit: '%RH',
    pressureUnit: 'hPa',
    lightUnit: 'lux',
    sensorData: '传感器数据',
    realTimeData: '实时数据',
    historicalData: '历史数据',
    dataChart: '数据图表',
    threshold: '阈值',
    highThreshold: '高阈值',
    lowThreshold: '低阈值',
    normalRange: '正常范围',
    abnormalValue: '异常值'
  },

  // 仪表板
  dashboard: {
    title: '仪表板',
    overview: '系统概览',
    statistics: '统计信息',
    totalDevices: '总设备数',
    onlineDevices: '在线设备',
    activeUsers: '活跃用户',
    systemAlerts: '系统告警',
    recentActivity: '最近活动',
    deviceStatus: '设备状态',
    alertList: '告警列表',
    systemHealth: '系统健康',
    performance: '性能指标',
    dataUsage: '数据使用量',
    storageUsage: '存储使用量',
    networkStatus: '网络状态'
  },

  // 告警
  alerts: {
    title: '告警管理',
    alertList: '告警列表',
    alertLevel: '告警级别',
    alertType: '告警类型',
    alertMessage: '告警信息',
    alertTime: '告警时间',
    alertStatus: '告警状态',
    active: '活跃',
    resolved: '已解决',
    acknowledged: '已确认',
    critical: '严重',
    warning: '警告',
    info: '信息',
    error: '错误',
    acknowledgeAlert: '确认告警',
    resolveAlert: '解决告警',
    deleteAlert: '删除告警',
    alertSettings: '告警设置',
    notificationSettings: '通知设置',
    emailNotification: '邮件通知',
    smsNotification: '短信通知',
    webhookNotification: 'Webhook通知'
  },

  // 用户管理
  users: {
    title: '用户管理',
    userList: '用户列表',
    addUser: '添加用户',
    editUser: '编辑用户',
    deleteUser: '删除用户',
    username: '用户名',
    email: '邮箱',
    role: '角色',
    status: '状态',
    lastLogin: '最后登录',
    createdAt: '创建时间',
    active: '激活',
    inactive: '未激活',
    changePassword: '修改密码',
    resetPassword: '重置密码',
    userProfile: '用户资料',
    permissions: '权限',
    userSettings: '用户设置'
  },

  // 系统设置
  settings: {
    title: '系统设置',
    general: '通用设置',
    system: '系统配置',
    network: '网络设置',
    security: '安全设置',
    notifications: '通知设置',
    backup: '备份设置',
    maintenance: '维护设置',
    systemInfo: '系统信息',
    version: '版本信息',
    uptime: '运行时间',
    memoryUsage: '内存使用',
    cpuUsage: 'CPU使用',
    diskUsage: '磁盘使用',
    networkSettings: '网络配置',
    mqttSettings: 'MQTT配置',
    databaseSettings: '数据库配置',
    logSettings: '日志配置'
  },

  // 表单验证
  validation: {
    required: '此字段为必填项',
    email: '请输入有效的邮箱地址',
    minLength: '最少需要{min}个字符',
    maxLength: '最多允许{max}个字符',
    passwordMismatch: '两次输入的密码不一致',
    invalidFormat: '格式不正确',
    numberRequired: '请输入数字',
    positiveNumber: '请输入正数',
    url: '请输入有效的URL地址',
    phone: '请输入有效的手机号码'
  },

  // 错误信息
  errors: {
    networkError: '网络连接失败',
    serverError: '服务器错误',
    unauthorized: '未授权访问',
    forbidden: '禁止访问',
    notFound: '资源未找到',
    timeout: '请求超时',
    unknownError: '未知错误',
    fileUploadError: '文件上传失败',
    fileDownloadError: '文件下载失败',
    dataLoadError: '数据加载失败',
    dataSaveError: '数据保存失败',
    dataDeleteError: '数据删除失败'
  },

  // 成功信息
  success: {
    dataSaved: '数据保存成功',
    dataDeleted: '数据删除成功',
    dataUpdated: '数据更新成功',
    fileUploaded: '文件上传成功',
    fileDownloaded: '文件下载成功',
    emailSent: '邮件发送成功',
    settingsUpdated: '设置更新成功',
    passwordChanged: '密码修改成功',
    profileUpdated: '资料更新成功'
  },

  // 时间相关
  time: {
    now: '现在',
    today: '今天',
    yesterday: '昨天',
    tomorrow: '明天',
    thisWeek: '本周',
    lastWeek: '上周',
    thisMonth: '本月',
    lastMonth: '上月',
    thisYear: '今年',
    lastYear: '去年',
    secondsAgo: '{count}秒前',
    minutesAgo: '{count}分钟前',
    hoursAgo: '{count}小时前',
    daysAgo: '{count}天前',
    weeksAgo: '{count}周前',
    monthsAgo: '{count}月前',
    yearsAgo: '{count}年前'
  },

  // 页面标题
  pageTitles: {
    home: 'IoT设备管理平台 - 专业的物联网解决方案',
    about: '关于我们 - IoT设备管理平台',
    devices: '设备总览 - IoT设备管理平台',
    login: '登录 - IoT设备管理平台',
    register: '注册 - IoT设备管理平台',
    dashboard: '仪表板 - IoT设备管理平台',
    deviceProfile: '设备介绍 - IoT设备管理平台',
    deviceDashboard: '数据大盘 - IoT设备管理平台',
    deviceManager: '管理平台 - IoT设备管理平台'
  }
};
