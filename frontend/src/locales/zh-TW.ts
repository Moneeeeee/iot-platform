/**
 * 繁體中文語言包
 */

export const zhTW = {
  // 通用
  common: {
    confirm: '確認',
    cancel: '取消',
    save: '儲存',
    delete: '刪除',
    edit: '編輯',
    add: '新增',
    search: '搜尋',
    filter: '篩選',
    export: '匯出',
    import: '匯入',
    refresh: '重新整理',
    loading: '載入中...',
    noData: '暫無資料',
    success: '操作成功',
    error: '操作失敗',
    warning: '警告',
    info: '提示',
    yes: '是',
    no: '否',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    close: '關閉',
    open: '開啟',
    online: '線上',
    offline: '離線',
    unknown: '未知'
  },

  // 導航
  navigation: {
    home: '首頁',
    about: '關於我們',
    devices: '設備總覽',
    dashboard: '儀表板',
    login: '登入',
    register: '註冊',
    logout: '登出',
    profile: '個人資料',
    settings: '設定',
    help: '說明',
    support: '技術支援'
  },

  // 認證
  auth: {
    login: '登入',
    register: '註冊',
    logout: '登出',
    username: '使用者名稱',
    password: '密碼',
    email: '電子郵件地址',
    confirmPassword: '確認密碼',
    rememberMe: '記住我',
    forgotPassword: '忘記密碼？',
    loginSuccess: '登入成功',
    loginFailed: '登入失敗',
    registerSuccess: '註冊成功',
    registerFailed: '註冊失敗',
    invalidCredentials: '使用者名稱或密碼錯誤',
    accountLocked: '帳戶已被鎖定',
    sessionExpired: '會話已過期，請重新登入',
    welcomeBack: '歡迎回來！',
    createAccount: '建立帳戶',
    alreadyHaveAccount: '已有帳戶？',
    noAccount: '沒有帳戶？',
    termsAndPrivacy: '我同意服務條款和隱私政策'
  },

  // 使用者角色
  roles: {
    admin: '管理員',
    operator: '操作員',
    viewer: '檢視者'
  },

  // 設備相關
  devices: {
    title: '設備管理',
    deviceList: '設備清單',
    deviceDetails: '設備詳情',
    deviceStatus: '設備狀態',
    deviceType: '設備類型',
    deviceName: '設備名稱',
    deviceId: '設備ID',
    serialNumber: '序號',
    firmwareVersion: '韌體版本',
    lastSeen: '最後上線',
    batteryLevel: '電池電量',
    location: '位置',
    ipAddress: 'IP位址',
    addDevice: '新增設備',
    editDevice: '編輯設備',
    deleteDevice: '刪除設備',
    deviceOnline: '設備線上',
    deviceOffline: '設備離線',
    deviceError: '設備錯誤',
    deviceMaintenance: '設備維護',
    smartSensor: '智慧感測器',
    smartGateway: '智慧閘道',
    smartController: '智慧控制器'
  },

  // 感測器相關
  sensors: {
    temperature: '溫度',
    humidity: '濕度',
    pressure: '壓力',
    light: '光照',
    temperatureUnit: '°C',
    humidityUnit: '%RH',
    pressureUnit: 'hPa',
    lightUnit: 'lux',
    sensorData: '感測器資料',
    realTimeData: '即時資料',
    historicalData: '歷史資料',
    dataChart: '資料圖表',
    threshold: '閾值',
    highThreshold: '高閾值',
    lowThreshold: '低閾值',
    normalRange: '正常範圍',
    abnormalValue: '異常值'
  },

  // 儀表板
  dashboard: {
    title: '儀表板',
    overview: '系統概覽',
    statistics: '統計資訊',
    totalDevices: '總設備數',
    onlineDevices: '線上設備',
    activeUsers: '活躍使用者',
    systemAlerts: '系統告警',
    recentActivity: '最近活動',
    deviceStatus: '設備狀態',
    alertList: '告警清單',
    systemHealth: '系統健康',
    performance: '效能指標',
    dataUsage: '資料使用量',
    storageUsage: '儲存使用量',
    networkStatus: '網路狀態'
  },

  // 告警
  alerts: {
    title: '告警管理',
    alertList: '告警清單',
    alertLevel: '告警級別',
    alertType: '告警類型',
    alertMessage: '告警資訊',
    alertTime: '告警時間',
    alertStatus: '告警狀態',
    active: '活躍',
    resolved: '已解決',
    acknowledged: '已確認',
    critical: '嚴重',
    warning: '警告',
    info: '資訊',
    error: '錯誤',
    acknowledgeAlert: '確認告警',
    resolveAlert: '解決告警',
    deleteAlert: '刪除告警',
    alertSettings: '告警設定',
    notificationSettings: '通知設定',
    emailNotification: '電子郵件通知',
    smsNotification: '簡訊通知',
    webhookNotification: 'Webhook通知'
  },

  // 使用者管理
  users: {
    title: '使用者管理',
    userList: '使用者清單',
    addUser: '新增使用者',
    editUser: '編輯使用者',
    deleteUser: '刪除使用者',
    username: '使用者名稱',
    email: '電子郵件',
    role: '角色',
    status: '狀態',
    lastLogin: '最後登入',
    createdAt: '建立時間',
    active: '啟用',
    inactive: '未啟用',
    changePassword: '修改密碼',
    resetPassword: '重設密碼',
    userProfile: '使用者資料',
    permissions: '權限',
    userSettings: '使用者設定'
  },

  // 系統設定
  settings: {
    title: '系統設定',
    general: '一般設定',
    system: '系統配置',
    network: '網路設定',
    security: '安全設定',
    notifications: '通知設定',
    backup: '備份設定',
    maintenance: '維護設定',
    systemInfo: '系統資訊',
    version: '版本資訊',
    uptime: '運行時間',
    memoryUsage: '記憶體使用',
    cpuUsage: 'CPU使用',
    diskUsage: '磁碟使用',
    networkSettings: '網路配置',
    mqttSettings: 'MQTT配置',
    databaseSettings: '資料庫配置',
    logSettings: '日誌配置'
  },

  // 表單驗證
  validation: {
    required: '此欄位為必填項',
    email: '請輸入有效的電子郵件地址',
    minLength: '最少需要{min}個字元',
    maxLength: '最多允許{max}個字元',
    passwordMismatch: '兩次輸入的密碼不一致',
    invalidFormat: '格式不正確',
    numberRequired: '請輸入數字',
    positiveNumber: '請輸入正數',
    url: '請輸入有效的URL位址',
    phone: '請輸入有效的手機號碼'
  },

  // 錯誤資訊
  errors: {
    networkError: '網路連線失敗',
    serverError: '伺服器錯誤',
    unauthorized: '未授權存取',
    forbidden: '禁止存取',
    notFound: '資源未找到',
    timeout: '請求逾時',
    unknownError: '未知錯誤',
    fileUploadError: '檔案上傳失敗',
    fileDownloadError: '檔案下載失敗',
    dataLoadError: '資料載入失敗',
    dataSaveError: '資料儲存失敗',
    dataDeleteError: '資料刪除失敗'
  },

  // 成功資訊
  success: {
    dataSaved: '資料儲存成功',
    dataDeleted: '資料刪除成功',
    dataUpdated: '資料更新成功',
    fileUploaded: '檔案上傳成功',
    fileDownloaded: '檔案下載成功',
    emailSent: '電子郵件發送成功',
    settingsUpdated: '設定更新成功',
    passwordChanged: '密碼修改成功',
    profileUpdated: '資料更新成功'
  },

  // 時間相關
  time: {
    now: '現在',
    today: '今天',
    yesterday: '昨天',
    tomorrow: '明天',
    thisWeek: '本週',
    lastWeek: '上週',
    thisMonth: '本月',
    lastMonth: '上月',
    thisYear: '今年',
    lastYear: '去年',
    secondsAgo: '{count}秒前',
    minutesAgo: '{count}分鐘前',
    hoursAgo: '{count}小時前',
    daysAgo: '{count}天前',
    weeksAgo: '{count}週前',
    monthsAgo: '{count}月前',
    yearsAgo: '{count}年前'
  },

  // 頁面標題
  pageTitles: {
    home: 'IoT設備管理平台 - 專業的物聯網解決方案',
    about: '關於我們 - IoT設備管理平台',
    devices: '設備總覽 - IoT設備管理平台',
    login: '登入 - IoT設備管理平台',
    register: '註冊 - IoT設備管理平台',
    dashboard: '儀表板 - IoT設備管理平台',
    deviceProfile: '設備介紹 - IoT設備管理平台',
    deviceDashboard: '資料大盤 - IoT設備管理平台',
    deviceManager: '管理平台 - IoT設備管理平台'
  }
};
