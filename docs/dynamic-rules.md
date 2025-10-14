# Dynamic Rules System

rsdoctor 现在支持通过第三方 npm 包动态下发规则，这使得规则的管理和分发更加灵活。

## 架构设计

### 1. 规则包约定

动态规则包需要遵循以下约定：

- **包名格式**: `@rsdoctor/rules-*` 或任意合法的 npm 包名
- **入口文件**: 必须导出 `rules` 数组
- **元数据**: 可选的 `meta` 对象，包含包信息

### 2. 动态加载器

新增 `DynamicRuleLoader` 类，负责：

- 从 npm 包或本地路径加载规则
- 缓存已加载的规则包
- 处理加载错误和版本兼容性

### 3. 插件接口扩展

插件配置新增 `dynamicRules` 字段：

```ts
interface RsdoctorPluginOptions {
  linter?: {
    // 原有配置
    level?: 'Error' | 'Warn';
    extends?: ExtendRuleData[];
    rules?: Record<string, any>;

    // 新增动态规则配置
    dynamicRules?: {
      packages?: Array<{
        package: string; // 包名或路径
        version?: string; // 版本约束
        enabled?: boolean; // 是否启用
        rules?: Record<string, any>; // 规则配置
      }>;
      cacheDir?: string; // 缓存目录
      enableCache?: boolean; // 是否启用缓存
      resolver?: Function; // 自定义解析器
    };
  };
}
```

## 使用方式

### 1. 基本配置

```ts
// rsbuild.config.ts
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';

export default {
  plugins: [
    new RsdoctorRspackPlugin({
      linter: {
        level: 'Error',
        dynamicRules: {
          packages: [
            {
              package: '@rsdoctor/rules-example',
              version: '^1.0.0',
              enabled: true,
              rules: {
                'bundle-size-limit': ['on', { maxSize: 2 * 1024 * 1024 }],
                'unused-dependencies': 'warn',
              },
            },
          ],
        },
      },
    }),
  ],
};
```

### 2. 本地规则包

```ts
dynamicRules: {
  packages: [
    {
      package: './rules/my-custom-rules',
      enabled: true,
      rules: {
        'my-custom-rule': ['on', { threshold: 100 }],
      },
    },
  ],
}
```

### 3. 多个规则包

```ts
dynamicRules: {
  packages: [
    {
      package: '@rsdoctor/rules-bundle',
      version: '^1.0.0',
      rules: {
        'bundle-size-limit': 'on',
      },
    },
    {
      package: '@rsdoctor/rules-performance',
      version: '^2.0.0',
      rules: {
        'loader-performance': 'warn',
      },
    },
  ],
}
```

## 创建规则包

### 1. 包结构

```
your-rules-package/
├── package.json
├── index.js
└── README.md
```

### 2. package.json

```json
{
  "name": "@rsdoctor/rules-example",
  "version": "1.0.0",
  "description": "Example dynamic rules package",
  "main": "index.js",
  "type": "module",
  "peerDependencies": {
    "@rsdoctor/core": "^1.0.0"
  }
}
```

### 3. 规则定义

```js
// index.js
import { defineRule } from '@rsdoctor/core/rules';

const MyCustomRule = defineRule(() => ({
  meta: {
    category: 'bundle',
    severity: 'Warn',
    title: 'my-custom-rule',
    defaultConfig: {
      threshold: 100,
    },
  },
  check({ chunkGraph, report, ruleConfig }) {
    const assets = chunkGraph.getAssets();
    const totalSize = assets.reduce((total, asset) => total + asset.size, 0);

    if (totalSize > ruleConfig.threshold) {
      report({
        message: `Bundle size exceeds threshold: ${totalSize} > ${ruleConfig.threshold}`,
        detail: {
          type: 'text',
          text: 'Consider optimizing your bundle size',
        },
      });
    }
  },
}));

export const rules = [MyCustomRule];
```

## 优势

### 1. 灵活性

- 规则可以独立开发和发布
- 支持版本管理和更新
- 可以按需加载和配置

### 2. 可维护性

- 规则逻辑与核心代码分离
- 便于测试和调试
- 支持社区贡献

### 3. 性能

- 支持缓存机制
- 按需加载，减少初始开销
- 异步加载，不阻塞构建

### 4. 兼容性

- 向后兼容现有配置
- 支持混合使用内置规则和动态规则
- 支持规则优先级和覆盖

## 最佳实践

### 1. 规则包命名

- 使用 `@rsdoctor/rules-*` 命名空间
- 包名要清晰描述规则用途
- 遵循语义化版本控制

### 2. 规则设计

- 保持规则单一职责
- 提供合理的默认配置
- 包含详细的文档和示例

### 3. 错误处理

- 优雅处理加载失败
- 提供有意义的错误信息
- 支持降级和回退

### 4. 性能优化

- 避免在规则中执行重操作
- 合理使用缓存
- 优化规则执行顺序

## 迁移指南

### 从 extends 迁移到 dynamicRules

**之前:**

```ts
import { MyCustomRule } from './rules/my-custom-rule';

new RsdoctorRspackPlugin({
  linter: {
    extends: [MyCustomRule],
    rules: {
      'my-custom-rule': ['on', { threshold: 100 }],
    },
  },
});
```

**之后:**

```ts
new RsdoctorRspackPlugin({
  linter: {
    dynamicRules: {
      packages: [
        {
          package: './rules/my-custom-rule',
          rules: {
            'my-custom-rule': ['on', { threshold: 100 }],
          },
        },
      ],
    },
  },
});
```

## 未来规划

1. **规则市场**: 建立规则包的市场和评级系统
2. **自动更新**: 支持规则的自动检查和更新
3. **规则组合**: 支持规则包之间的依赖和组合
4. **可视化配置**: 提供图形化的规则配置界面
5. **性能监控**: 监控规则执行性能，提供优化建议
