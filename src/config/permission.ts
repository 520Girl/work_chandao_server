/**
 * ChanDAO 权限定义
 * Source: src/modules/base/menu.json (权限系统的源头)
 * 规范: 通过cool-admin的menu.json管理权限，该文件作为参考
 */
export const PERMISSIONS = {
  // ==================== 系统管理 ====================
  // 菜单管理
  'base:sys:menu:add': '新增菜单',
  'base:sys:menu:delete': '删除菜单',
  'base:sys:menu:update': '编辑菜单',
  'base:sys:menu:page': '菜单分页',
  'base:sys:menu:list': '菜单列表',
  'base:sys:menu:info': '菜单详情',

  // 角色管理
  'base:sys:role:add': '新增角色',
  'base:sys:role:delete': '删除角色',
  'base:sys:role:update': '编辑角色',
  'base:sys:role:page': '角色分页',
  'base:sys:role:list': '角色列表',
  'base:sys:role:info': '角色详情',
  'base:sys:role:permission': '角色权限',
  'base:sys:role:resources': '资源管理',

  // 部门管理
  'base:sys:department:add': '新增部门',
  'base:sys:department:update': '更新部门',
  'base:sys:department:delete': '删除部门',
  'base:sys:department:order': '部门排序',
  'base:sys:department:page': '部门分页',
  'base:sys:department:list': '部门列表',
  'base:sys:department:info': '部门详情',

  // 用户管理
  'base:sys:user:add': '新增用户',
  'base:sys:user:update': '编辑用户',
  'base:sys:user:delete': '删除用户',
  'base:sys:user:move': '用户转移',
  'base:sys:user:page': '用户分页',
  'base:sys:user:list': '用户列表',
  'base:sys:user:info': '用户详情',

  // 参数配置
  'base:sys:param:add': '新增参数',
  'base:sys:param:update': '编辑参数',
  'base:sys:param:delete': '删除参数',
  'base:sys:param:page': '参数分页',
  'base:sys:param:list': '参数列表',
  'base:sys:param:info': '参数详情',

  // 请求日志
  'base:sys:log:page': '日志分页',
  'base:sys:log:clear': '清除日志',
  'base:sys:log:getKeep': '获取保留天数',
  'base:sys:log:setKeep': '设置保留天数',

  // ==================== 字典 ====================
  'dict:info:add': '新增字典',
  'dict:info:delete': '删除字典',
  'dict:info:update': '编辑字典',
  'dict:info:page': '字典分页',
  'dict:info:list': '字典列表',
  'dict:info:info': '字典详情',
  'dict:type:add': '新增字典类型',
  'dict:type:delete': '删除字典类型',
  'dict:type:update': '编辑字典类型',
  'dict:type:page': '字典类型分页',
  'dict:type:list': '字典类型列表',
  'dict:type:info': '字典类型详情',

  // ==================== 数据回收站 ====================
  'recycle:data:restore': '恢复数据',
  'recycle:data:delete': '彻底删除',
  'recycle:data:info': '数据详情',
  'recycle:data:page': '数据分页',

  // ==================== 文件管理 ====================
  'upload:file:delete': '删除文件',
  'upload:file:page': '文件分页',

  // ==================== 空间管理 ====================
  'space:info:add': '新增空间',
  'space:info:delete': '删除空间',
  'space:info:update': '编辑空间',
  'space:info:page': '空间分页',
  'space:info:list': '空间列表',
  'space:info:info': '空间详情',
  'space:info:getConfig': '获取空间配置',
  'space:type:add': '新增空间类型',
  'space:type:delete': '删除空间类型',
  'space:type:update': '编辑空间类型',
  'space:type:page': '空间类型分页',
  'space:type:list': '空间类型列表',
  'space:type:info': '空间类型详情',

  // ==================== 用户管理 ====================
  'user:info:add': '新增用户',
  'user:info:delete': '删除用户',
  'user:info:update': '编辑用户',
  'user:info:page': '用户分页',
  'user:info:list': '用户列表',
  'user:info:info': '用户详情',
  'user:profile:read': '查看个人信息',
  'user:team:join': '加入团队',
  'user:role:assign': '分配角色（超管）',

  // ==================== 插件管理 ====================
  'plugin:info:add': '新增插件',
  'plugin:info:delete': '删除插件',
  'plugin:info:update': '编辑插件',
  'plugin:info:page': '插件分页',
  'plugin:info:list': '插件列表',
  'plugin:info:info': '插件详情',

  // ==================== 业务管理 ====================
  // 设备管理
  'device:info:add': '新增设备',
  'device:info:delete': '删除设备',
  'device:info:update': '编辑设备',
  'device:info:page': '设备分页',
  'device:info:list': '设备列表',
  'device:info:info': '设备详情',
  'device:forceUnbind': '强制解绑',
  'device:receive': '接收设备数据',

  // 冥想报告
  'meditation:report:add': '新增报告',
  'meditation:report:delete': '删除报告',
  'meditation:report:update': '编辑报告',
  'meditation:report:page': '报告分页',
  'meditation:report:list': '报告列表',
  'meditation:report:info': '报告详情',
  'meditation:start': '开始冥想',
  'report:share': '分享报告',

  // 社区动态
  'post:info:add': '新增动态',
  'post:info:delete': '删除动态',
  'post:info:update': '编辑动态',
  'post:info:page': '动态分页',
  'post:info:list': '动态列表',
  'post:info:info': '动态详情',
  'post:share': '分享动态',
  'post:manual:manage': '管理手动动态',
  'post:audit': '审核动态',

  // 活动管理
  'activity:create': '创建活动',
  'activity:update': '修改活动',
  'activity:join': '参加活动',
  'activity:manage': '管理活动',
  'activity:template:add': '新增模板',
  'activity:template:delete': '删除模板',
  'activity:template:update': '编辑模板',
  'activity:template:page': '模板分页',
  'activity:template:list': '模板列表',
  'activity:template:info': '模板详情',
  'activity:template:manage': '管理活动模板',

  // 商品管理
  'shop:product:add': '新增商品',
  'shop:product:delete': '删除商品',
  'shop:product:update': '编辑商品',
  'shop:product:page': '商品分页',
  'shop:product:list': '商品列表',
  'shop:product:info': '商品详情',
  'shop:product:manage': '商品管理',

  // 订单管理
  'shop:order:add': '新增订单',
  'shop:order:delete': '删除订单',
  'shop:order:update': '编辑订单',
  'shop:order:page': '订单分页',
  'shop:order:list': '订单列表',
  'shop:order:info': '订单详情',
  'shop:order:shipped': '发货',
  'shop:order:manage': '订单管理',
  'order:create': '创建订单',
  'order:read': '查看订单',
};

export default PERMISSIONS;
