/**
 * English language pack
 */

export const en = {
  // Common
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    refresh: 'Refresh',
    loading: 'Loading...',
    noData: 'No data available',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    open: 'Open',
    online: 'Online',
    offline: 'Offline',
    unknown: 'Unknown'
  },

  // Navigation
  navigation: {
    home: 'Home',
    about: 'About Us',
    devices: 'Devices',
    dashboard: 'Dashboard',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    profile: 'Profile',
    settings: 'Settings',
    help: 'Help',
    support: 'Support'
  },

  // Authentication
  auth: {
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    email: 'Email Address',
    confirmPassword: 'Confirm Password',
    rememberMe: 'Remember Me',
    forgotPassword: 'Forgot Password?',
    loginSuccess: 'Login successful',
    loginFailed: 'Login failed',
    registerSuccess: 'Registration successful',
    registerFailed: 'Registration failed',
    invalidCredentials: 'Invalid username or password',
    accountLocked: 'Account is locked',
    sessionExpired: 'Session expired, please login again',
    welcomeBack: 'Welcome back!',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',
    noAccount: 'Don\'t have an account?',
    termsAndPrivacy: 'I agree to the Terms of Service and Privacy Policy'
  },

  // User roles
  roles: {
    admin: 'Administrator',
    operator: 'Operator',
    viewer: 'Viewer'
  },

  // Devices
  devices: {
    title: 'Device Management',
    deviceList: 'Device List',
    deviceDetails: 'Device Details',
    deviceStatus: 'Device Status',
    deviceType: 'Device Type',
    deviceName: 'Device Name',
    deviceId: 'Device ID',
    serialNumber: 'Serial Number',
    firmwareVersion: 'Firmware Version',
    lastSeen: 'Last Seen',
    batteryLevel: 'Battery Level',
    location: 'Location',
    ipAddress: 'IP Address',
    addDevice: 'Add Device',
    editDevice: 'Edit Device',
    deleteDevice: 'Delete Device',
    deviceOnline: 'Device Online',
    deviceOffline: 'Device Offline',
    deviceError: 'Device Error',
    deviceMaintenance: 'Device Maintenance',
    smartSensor: 'Smart Sensor',
    smartGateway: 'Smart Gateway',
    smartController: 'Smart Controller'
  },

  // Sensors
  sensors: {
    temperature: 'Temperature',
    humidity: 'Humidity',
    pressure: 'Pressure',
    light: 'Light',
    temperatureUnit: '°C',
    humidityUnit: '%RH',
    pressureUnit: 'hPa',
    lightUnit: 'lux',
    sensorData: 'Sensor Data',
    realTimeData: 'Real-time Data',
    historicalData: 'Historical Data',
    dataChart: 'Data Chart',
    threshold: 'Threshold',
    highThreshold: 'High Threshold',
    lowThreshold: 'Low Threshold',
    normalRange: 'Normal Range',
    abnormalValue: 'Abnormal Value'
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    overview: 'System Overview',
    statistics: 'Statistics',
    totalDevices: 'Total Devices',
    onlineDevices: 'Online Devices',
    activeUsers: 'Active Users',
    systemAlerts: 'System Alerts',
    recentActivity: 'Recent Activity',
    deviceStatus: 'Device Status',
    alertList: 'Alert List',
    systemHealth: 'System Health',
    performance: 'Performance Metrics',
    dataUsage: 'Data Usage',
    storageUsage: 'Storage Usage',
    networkStatus: 'Network Status'
  },

  // Alerts
  alerts: {
    title: 'Alert Management',
    alertList: 'Alert List',
    alertLevel: 'Alert Level',
    alertType: 'Alert Type',
    alertMessage: 'Alert Message',
    alertTime: 'Alert Time',
    alertStatus: 'Alert Status',
    active: 'Active',
    resolved: 'Resolved',
    acknowledged: 'Acknowledged',
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
    error: 'Error',
    acknowledgeAlert: 'Acknowledge Alert',
    resolveAlert: 'Resolve Alert',
    deleteAlert: 'Delete Alert',
    alertSettings: 'Alert Settings',
    notificationSettings: 'Notification Settings',
    emailNotification: 'Email Notification',
    smsNotification: 'SMS Notification',
    webhookNotification: 'Webhook Notification'
  },

  // User Management
  users: {
    title: 'User Management',
    userList: 'User List',
    addUser: 'Add User',
    editUser: 'Edit User',
    deleteUser: 'Delete User',
    username: 'Username',
    email: 'Email',
    role: 'Role',
    status: 'Status',
    lastLogin: 'Last Login',
    createdAt: 'Created At',
    active: 'Active',
    inactive: 'Inactive',
    changePassword: 'Change Password',
    resetPassword: 'Reset Password',
    userProfile: 'User Profile',
    permissions: 'Permissions',
    userSettings: 'User Settings'
  },

  // System Settings
  settings: {
    title: 'System Settings',
    general: 'General Settings',
    system: 'System Configuration',
    network: 'Network Settings',
    security: 'Security Settings',
    notifications: 'Notification Settings',
    backup: 'Backup Settings',
    maintenance: 'Maintenance Settings',
    systemInfo: 'System Information',
    version: 'Version Information',
    uptime: 'Uptime',
    memoryUsage: 'Memory Usage',
    cpuUsage: 'CPU Usage',
    diskUsage: 'Disk Usage',
    networkSettings: 'Network Configuration',
    mqttSettings: 'MQTT Configuration',
    databaseSettings: 'Database Configuration',
    logSettings: 'Log Configuration'
  },

  // Form Validation
  validation: {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    minLength: 'Minimum {min} characters required',
    maxLength: 'Maximum {max} characters allowed',
    passwordMismatch: 'Passwords do not match',
    invalidFormat: 'Invalid format',
    numberRequired: 'Please enter a number',
    positiveNumber: 'Please enter a positive number',
    url: 'Please enter a valid URL',
    phone: 'Please enter a valid phone number'
  },

  // Error Messages
  errors: {
    networkError: 'Network connection failed',
    serverError: 'Server error',
    unauthorized: 'Unauthorized access',
    forbidden: 'Access forbidden',
    notFound: 'Resource not found',
    timeout: 'Request timeout',
    unknownError: 'Unknown error',
    fileUploadError: 'File upload failed',
    fileDownloadError: 'File download failed',
    dataLoadError: 'Data loading failed',
    dataSaveError: 'Data saving failed',
    dataDeleteError: 'Data deletion failed'
  },

  // Success Messages
  success: {
    dataSaved: 'Data saved successfully',
    dataDeleted: 'Data deleted successfully',
    dataUpdated: 'Data updated successfully',
    fileUploaded: 'File uploaded successfully',
    fileDownloaded: 'File downloaded successfully',
    emailSent: 'Email sent successfully',
    settingsUpdated: 'Settings updated successfully',
    passwordChanged: 'Password changed successfully',
    profileUpdated: 'Profile updated successfully'
  },

  // Time Related
  time: {
    now: 'Now',
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    thisYear: 'This Year',
    lastYear: 'Last Year',
    secondsAgo: '{count} seconds ago',
    minutesAgo: '{count} minutes ago',
    hoursAgo: '{count} hours ago',
    daysAgo: '{count} days ago',
    weeksAgo: '{count} weeks ago',
    monthsAgo: '{count} months ago',
    yearsAgo: '{count} years ago'
  },

  // Page Titles
  pageTitles: {
    home: 'IoT Device Management Platform - Professional IoT Solutions',
    about: 'About Us - IoT Device Management Platform',
    devices: 'Device Overview - IoT Device Management Platform',
    login: 'Login - IoT Device Management Platform',
    register: 'Register - IoT Device Management Platform',
    dashboard: 'Dashboard - IoT Device Management Platform',
    deviceProfile: 'Device Profile - IoT Device Management Platform',
    deviceDashboard: 'Data Dashboard - IoT Device Management Platform',
    deviceManager: 'Management Platform - IoT Device Management Platform'
  }
};
