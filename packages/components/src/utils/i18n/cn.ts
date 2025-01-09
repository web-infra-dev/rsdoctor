import en from './en';
// TODO: fix this
const cn: typeof en = {
  Overall: '概览',
  'Compile Analysis': '编译分析',
  'Bundle Alerts': '编译预警',
  'Help Center': '帮助中心',
  'Rsdoctor Introduction': 'Rsdoctor 介绍',
  'Compilation Alerts': '编译预警',
  'Plugins Analysis': 'Plugins 分析',
  LoadersAnalysis: 'Loaders 分析',
  'Loaders Timeline': 'Loaders 概览',
  'Loaders Analysis': 'Loaders 分析',
  PluginsAnalysis: 'Plugins 分析',
  ModuleResolve: 'Module Resolve 分析',
  'Bundle Analysis': '产物分析',
  BundleSize: '产物体积分析',
  'Module Graph': 'Module Graph',
  TreeShaking: 'Tree Shaking',
  'Rule Index': '错误索引信息',
  Resources: '资源',
  'Project Overall': '项目信息概览',
  'Compile Overall': '编译数据概览',
  'Bundle Overall': '产物数据概览',
  'Expand Omitted':
    ' reasons 树会默认折叠中间的第三方引入的模块，点击这个图标可以查看完整树图',
  'Concatenated Tag':
    '串联模块，hover 上去可以显示聚合成的主模块名称。注：聚合模块 bundled size 为零，有可能是因为被聚合到了主模块中。',

  'the file content not changed after transpiled by this loader':
    '该文件内容在 loader 处理前后没有发生变化',

  /** Bundle Size */
  'Output Assets List': '产物文件列表',
  'filter the output assets which size is greater than the input value':
    '筛选大小大于输入值的产物文件',
  'filter the modules which size is greater than the input value':
    '筛选大小大于输入值的模块',
  'After Compile': '编译后',
  'After Bundle': '打包后',
  CodeModeExplain: 'Lite 模式下或纯 stats.json 上传的情况下只有 source code.',
  DuplicatePakCodeExplain:
    '纯 stats.json 输入的情况下没有代码，可使用 Rsdoctor 插件参与构建会有对应代码。',
};

export default cn;
