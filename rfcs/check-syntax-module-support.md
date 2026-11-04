# RFC：在 @rsbuild/plugin-check-syntax 中支持模块语法检查

- 状态：提案，尚未在上游实现。
- 日期：2026-11-04。
- 建议实现仓库：`rstackjs/rsbuild-plugin-check-syntax`。
- 问题基线：`@rsbuild/plugin-check-syntax@2.0.1`。
- 主要使用方：Rsbuild、直接使用 `CheckSyntaxRspackPlugin` 的项目，以及调用 `CheckSyntax` 的 Rsdoctor。

## 提案摘要

建议由 `@rsbuild/plugin-check-syntax` 提供正式的 `sourceType: 'script' | 'module'` 配置，并允许调用方为单次检查指定语法模式。插件根据确定的语法模式和目标 ECMAScript 版本完成一次解析，再统一生成、过滤和上报错误。

Rsdoctor 通过该接口传入构建产物的模块类型，移除自己维护的 Acorn 模块重试逻辑。Acorn 继续作为上游检查器的内部实现，Rsdoctor 无需直接依赖它。

第一阶段交付公开接口、严格的版本边界和 Rsdoctor 迁移所需的能力；第二阶段补齐构建元数据、文件扩展名及 HTML 模块脚本的自动接入。独立调用 `CheckSyntax` 且未配置模式时，继续默认使用 script，避免无条件改变现有行为。

## 1. 问题背景

### 1.1 两个相互独立的检查维度

构建产物的语法检查至少需要同时确定以下两个维度：

| 维度 | 作用 | 例子 |
| --- | --- | --- |
| `ecmaVersion` | 限定可接受的 ECMAScript 语法版本 | ES2019 不应接受可选链；ES2021 不应接受顶层 await |
| `sourceType` | 确定代码按普通脚本还是 ECMAScript 模块解释 | `export` 属于模块语法；模块自动启用严格模式 |

只有 `ecmaVersion` 无法表达代码的执行上下文；只有 module 模式也无法证明代码符合目标语法版本。上游需要组合这两个维度，而不是通过重试放宽其中一个。

### 1.2 2.0.1 的实际行为

`CheckSyntax.tryParse()` 内部调用 Acorn，但只传入版本参数：

```ts
parse(code, { ecmaVersion: this.ecmaVersion });
```

Acorn 默认使用 script 模式。`CheckSyntax` 的配置类型没有 `sourceType`，也没有公开内部的 Acorn `parse()`。调用方无法通过现有选项要求它使用 module 模式。

2.0.1 的 `check()` 支持处理 `.js`、`.mjs`、`.cjs`、`.jsx` 文件，但这些文件最终都进入上述解析入口。识别 `.mjs` 扩展名只代表文件被选中检查，并不代表使用了模块语法。

直接使用 `CheckSyntaxRspackPlugin` 时，插件同样没有将 `compilation.outputOptions.module` 传入解析器。Rsbuild 包装入口也没有提供相应的配置。

上述行为已通过本地安装的 2.0.1 产物核对；2026-11-04 查阅的上游源码也呈现相同调用方式。参见 [CheckSyntax 源码](https://github.com/rstackjs/rsbuild-plugin-check-syntax/blob/main/src/checkSyntax.ts)、[配置类型](https://github.com/rstackjs/rsbuild-plugin-check-syntax/blob/main/src/types.ts)、[Rspack 插件入口](https://github.com/rstackjs/rsbuild-plugin-check-syntax/blob/main/src/CheckSyntaxPlugin.ts) 和 [Rsbuild 入口](https://github.com/rstackjs/rsbuild-plugin-check-syntax/blob/main/src/index.ts)。这些 main 链接可能随上游开发发生变化，本文的问题基线仍为 2.0.1。

### 1.3 ESM 产物的误报

以下代码对 ES2015 模块合法：

```js
export const value = 1;
```

如果按 script 模式检查，解析器会因为 `export` 报错。错误来自语法模式不匹配，不能据此判断代码超出了 ES2015。

相同问题也会影响静态 `import`、`import.meta` 和顶层 await。它们还各自具有版本边界，因此不能简单忽略包含 `import`、`export` 或 `await` 的报错。

### 1.4 严格模式导致的漏报

模块代码即使不包含 `import` 或 `export`，也必须遵循模块严格模式。例如：

```js
function value(a, a) {
  return a;
}
```

这段代码在非严格的普通脚本中可以通过解析，在模块中应被拒绝。先按 script 解析、只有失败后才重试 module，会直接接受这个例子，因此重试机制无法完整替代正确的语法模式选择。

模块严格模式属于语法上下文的一部分。判断模式不能依赖“代码是否出现 import/export”或“第一次解析是否失败”。

### 1.5 HTML 模块脚本的遗漏

2.0.1 的 HTML 提取逻辑只选取未设置 `type`、`application/javascript` 或 `text/javascript` 的内联脚本，跳过了 `<script type="module">`。该问题属于遗漏检查，与 JS 产物按 script 解析造成的误报不同。

上游补齐模块支持时，需要明确覆盖这个入口。不能只修改 Acorn 的参数，就宣称所有入口均支持 ESM。参见 [HTML 脚本提取源码](https://github.com/rstackjs/rsbuild-plugin-check-syntax/blob/main/src/generateHtmlScripts.ts)。

## 2. Rsdoctor 当前补偿逻辑及其限制

Rsdoctor 的 `ecma-version-check` 已经使用 `CheckSyntax`。额外的 Acorn 调用仅用于补偿 ESM 产物的误报，逻辑如下：

1. 记录 `checkSyntax.errors.length`。
2. 调用插件检查当前产物。
3. 当 `output.module === true`、目标版本为 ES2015+，且插件新增错误时，用相同 `ecmaVersion` 按 module 模式重试。
4. 重试成功则撤销本次新增的插件错误；失败则保留原错误。

这能修复一部分 ESM 误报，但有以下限制：

- **检查职责分散。** 上游维护解析、错误生成、source map 映射和排除规则，下游另行决定哪些解析错误应该撤销。
- **存在漏报。** script 解析已通过时不会进行 module 解析，无法发现上一节的严格模式问题。
- **错误原因可能不准确。** module 重试失败后保留的是 script 模式错误，可能只提示“不允许 export”，没有指出真正超出目标版本的模块语法。
- **增加重复解析。** 合法 ESM 经常会先触发一次 script 解析失败，再执行一次 module 解析；第一次错误还可能已经经过 source map 处理。
- **依赖实现细节。** 下游通过截断公共 `errors` 数组撤销错误，而不是接收检查器最终确定的结果；未来的并发调用和错误收集方式变更会使这种耦合更难维护。

另外，直接从插件的间接依赖路径加载 Acorn，不是可靠的替代方案：插件没有承诺该依赖路径或解析 API 是公开接口，包管理器隔离及上游实现变更都可能破坏它。

相关下游代码位于 `packages/core/src/rules/rules/ecma-version-check/index.ts`。本节描述重试机制的设计及限制，不将当前工作区未提交状态视为可发布实现。

## 3. 为什么应在上游解决

语法模式是检查器执行解析必需的信息。`CheckSyntax` 已经负责将目标环境转换为版本、解析代码、映射错误和应用排除规则，因此也应该接收并使用语法模式。

在上游实现后，所有入口共享同一条检查链路：

```text
调用方或资源元数据确定 sourceType
                  ↓
使用既有规则确定 ecmaVersion
                  ↓
验证模式与版本的组合
                  ↓
按确定的模式进行一次 Acorn 解析
                  ↓
source map 映射、错误过滤、统一上报
```

Rsdoctor 只需提供它已知的构建信息，并把插件错误转为报告。未来其他使用 `CheckSyntax` 的工具也可复用该能力，无需分别维护 ESM 重试逻辑。

## 4. 目标与范围

本提案要求：

- 同时支持 script 和 module 语法，并保持 ECMAScript 版本边界。
- 模块始终遵循严格模式，包括没有 import/export 的模块。
- 直接 API、Rspack 插件及 Rsbuild 包装入口使用相同语义。
- 保留现有错误格式、source map 能力与排除选项。
- 支持同一检查器并发检查不同语法模式的资源。
- 为 Rsdoctor 删除直接 Acorn 依赖提供稳定的公开接口。

本提案不承担以下工作：

- 将代码转译为目标版本，或检查 polyfill、运行时 API、模块加载器及浏览器全部特性支持。
- 更换上游解析器，或在 Rsdoctor 中建立另一套 AST 语法版本映射表。
- 通过宽松解析、忽略模块相关错误或先后尝试两种模式，使代码尽可能通过检查。
- 第一阶段实现通用源码模式猜测、CommonJS 特殊语义、JSX 新增支持或 HTML 定位体系重构。

“模块语法可解析”不等于“目标浏览器具备模块加载能力”。诊断和文档都应保留这一能力边界。

## 5. 第一阶段：公开语法模式接口

### 5.1 配置建议

以下是拟新增接口，不是 2.0.1 已支持的 API：

```ts
export type SourceType = 'script' | 'module';

export interface ParseContext {
  sourceType?: SourceType;
}

// 在现有选项上新增，保留其余字段。
export type CheckSyntaxOptions = {
  sourceType?: SourceType;
  // ...existing options
};

// 在现有类上扩展以下签名，保留其余成员。
export class CheckSyntax {
  check(
    filepath: string,
    code?: string,
    context?: ParseContext,
  ): Promise<void>;

  tryParse(
    filepath: string,
    code: string,
    context?: ParseContext,
  ): Promise<void>;
}
```

`PluginCheckSyntaxOptions` 继续派生自检查器选项，使 `pluginCheckSyntax()` 和 `CheckSyntaxRspackPlugin` 也能接收 `sourceType`。新增公开类型从包入口导出，不要求调用方导入包内私有路径或 Acorn 类型。

第一阶段的选择优先级为：单次调用的 `context.sourceType` > 构造选项中的 `sourceType` > `'script'`。

`ecmaVersion` 仍按现有规则确定：显式配置优先，否则由 `targets` 推导。`sourceType` 不参与推导、不修改最终版本。

### 5.2 使用示例

对全部资源使用模块模式：

```ts
const checker = new CheckSyntax({
  ecmaVersion: 2020,
  sourceType: 'module',
});

await checker.check('bundle.js', 'export const url = import.meta.url;');
```

同一实例检查混合资源：

```ts
await Promise.all([
  checker.check('legacy.js', scriptCode, { sourceType: 'script' }),
  checker.check('module.js', moduleCode, { sourceType: 'module' }),
]);
```

单次模式作为函数参数向下传递。调用方不应在检查前修改 `checker.sourceType`，检查器内部也不能临时修改共享字段再恢复，否则并发时可能串用模式。

### 5.3 解析与版本边界

核心解析最终等价于：

```ts
parse(code, {
  ecmaVersion: this.ecmaVersion,
  sourceType: context.sourceType ?? this.sourceType ?? 'script',
});
```

上面只展示参数传递；正式实现还必须包含模式与版本的组合检查，以及既有错误处理链路。

不能认为 Acorn 设置了 module 就一定拒绝低版本的模块声明。Acorn 文档明确说明，module 模式下 import/export 声明即使在 `ecmaVersion < 6` 时也可被接受。因此，需要在上游明确保护 ES3/ES5 与 module 模式的冲突。参见 [Acorn 解析选项文档](https://github.com/acornjs/acorn/blob/master/acorn/README.md)。

建议采用以下确定的策略：

| 最终模式 | 最终目标版本 | 处理方式 |
| --- | --- | --- |
| script | 任意受支持版本 | 按该版本的 script 语法检查 |
| module | ES2015+，包括数字别名 `6` | 按该版本的 module 语法检查 |
| module | `latest` | 按当前解析器支持的最新 module 语法检查 |
| module | ES3 或 ES5 | 生成“module 模式要求 ES2015+”诊断，不提升目标版本、不回退 script |

版本判断必须同时处理数字别名和年份，例如 `6` 与 `2015` 表示相同版本；不能把 `latest` 当数字比较。

该策略也会拒绝“代码正文只有 ES5 语法、但调用方明确指定 module”的组合。这是本 RFC 提议的新契约：模式声明本身需要 ES2015+。上游评审需要明确接受这项行为，避免实现时默默改变策略。

### 5.4 错误处理

普通解析失败继续走既有的 `generateError` 流程：使用实际模式下的 Acorn 错误，执行 source map 映射，再应用 `exclude`、`excludeErrorMessage`，最终写入 `errors`。

对于 module 与 ES3/ES5 的组合冲突，使用固定且可读的诊断，附带资源路径和起始位置；诊断也应进入同一过滤流程，不能只向控制台打印或绕过排除配置。

`excludeOutput` 继续在读取、解析产物前生效，`excludeErrorLogs` 继续只控制展示。新增模式不改变这些选项的含义。

不得通过删除某次 script 报错，模拟 module 检查成功；也不得直接忽略 import/export 相关报错。每个资源只按已经确定的模式检查。

### 5.5 调用语义

新增参数为可选参数，原有调用继续有效。`check(filepath, undefined, context)` 表示读文件后按指定模式检查；`check(filepath, '', context)` 表示检查调用方提供的空代码，不应改为从磁盘读文件。

当前实现使用 `if (code)` 区分这两个入口。接入新签名时应改为判断 `code !== undefined`，并为该边界补充测试。

第一阶段中，`sourceType` 配置面向独立 JavaScript 资源或直接传入的 JS 字符串。检查 HTML 文件时不应将整个 HTML 或所有内联脚本强制解释为 module；HTML 中的模式按第二阶段的逐标签设计处理。

## 6. 第二阶段：让各入口提供准确的资源上下文

第一阶段允许调用方明确配置模式。第二阶段解决常见入口的自动接入，并以独立测试保证选择规则一致。

### 6.1 JS 文件与构建产物

建议由调用边界按以下优先级确定模式，再传入检查器：

1. 使用方针对当前资源显式传入的模式。
2. 用户在插件构造选项中显式配置的模式。
3. 文件扩展名声明：`.mjs` 使用 module，`.cjs` 使用 script。
4. Rspack 编译上下文：当前 compilation 的 `outputOptions.module === true` 时，普通 `.js` 产物使用 module。
5. 缺少上述信息时使用 script。

明确的文件类型优先于整个 compilation 的默认模式，避免同一编译产生的辅助 `.cjs` 文件被当成模块。对于没有模式元数据的 `.js` 复制资源，允许使用方通过单次参数覆盖；不能只搜索 import/export 来推断模式。

独立 API 不要求遍历上层 `package.json` 推断 `.js` 类型，因为浏览器产物的加载方式未必与 Node.js 包边界一致。需要这种上下文的调用方应显式传入。

多 compiler、多 environment 或 child compilation 必须使用资源所属 compilation 的信息，不能用全局第一个配置决定所有产物的模式。模式不得通过共享实例字段在并发资源之间传播。

### 6.2 HTML 内联脚本

将 HTML 提取结果从纯字符串改为内部结构，至少保留 `code` 和 `sourceType`；定位需要时保留原始 HTML 中的偏移。

| 标签 | 模式与处理 |
| --- | --- |
| `<script>` | script |
| `<script type="text/javascript">` | script |
| `<script type="application/javascript">` | script |
| `<script type="module">` | module |
| `<script type="importmap">`、JSON 数据脚本 | 不作为 JS 检查 |
| `<script src="...">` | 不在内联提取阶段读取或抓取；本地外部资源由既有产物入口处理 |

HTML 中每个标签自己的类型决定模式，同一个 HTML 内可以同时包含 script 和 module。插件级 `sourceType` 不能覆盖标签的执行语义；直接传入的 JS 字符串仍按第一阶段的显式参数处理。

新增模块脚本检查可能暴露过去被跳过的错误，应在发布说明中明确这一行为变化。若没有实现 HTML 行列换算，不能宣称诊断已经精确定位到原 HTML；尤其要避免先 `trim()` 再直接复用代码片段位置。完整 HTML 定位能力可以另行扩展，但新入口至少应明确其定位基准。

### 6.3 发布边界

第一阶段无需等待 HTML 工作完成即可发布，Rsdoctor 可通过公开参数完成迁移。发布说明需列明第一阶段仍要求显式提供模块模式，尚未补齐 HTML 模块脚本扫描或扩展名自动选择。

第二阶段改变部分资源的默认选择及扫描范围，建议单独列出行为变更；是否作为后续 minor 或放入 major，由上游维护者结合兼容性策略决定。

## 7. 验证方案

### 7.1 解析语义矩阵

下表除注明配置冲突外，失败都应产生与实际语法模式对应的解析诊断：

| 代码或条件 | 模式 | 目标版本 | 预期 |
| --- | --- | --- | --- |
| `var value = 1;` | script | ES5 | 通过 |
| `export const value = 1;` | script | ES2015 | 拒绝 |
| `export const value = 1;` | module | ES2015 | 通过 |
| `import value from 'pkg';` | module | ES2015 | 通过 |
| `export var value = 1;` | module | ES5 | 组合冲突诊断 |
| `var value = 1;` | module | ES5 | 组合冲突诊断，验证本 RFC 的显式契约 |
| `function value(a, a) { return a; }` | script | ES2024 | 通过 |
| 相同的重复形参代码 | module | ES2024 | 拒绝，验证没有 import/export 时的严格模式 |
| `const value = input?.value;` | module | ES2019 / ES2020 | 分别拒绝 / 通过 |
| `export const url = import.meta.url;` | module | ES2019 / ES2020 | 分别拒绝 / 通过 |
| `export * as ns from 'pkg';` | module | ES2019 / ES2020 | 分别拒绝 / 通过 |
| `await Promise.resolve(); export {};` | module | ES2021 / ES2022 | 分别拒绝 / 通过 |
| `await Promise.resolve();` | script | ES2024 | 拒绝 |
| `const = ;` | 两种模式分别测试 | 受支持版本 | 均拒绝，保留实际解析错误 |
| 合法基础模块 | module | `6` / `2015` / `latest` | 均通过，验证版本别名及 latest |

### 7.2 API、过滤与错误回归

- 旧构造参数、两参数 `check()` 和 `tryParse()` 的默认 script 行为保持一致。
- 单次模式覆盖构造默认值，且不改变后续调用；同一实例并发检查两种模式不会串用参数。
- `code === ''` 不读文件；未传代码才读文件。
- source map 存在和缺失时，都能生成既有格式的诊断；模块错误的位置来自 module 解析结果。
- `exclude`、`excludeOutput`、`excludeErrorMessage` 和 `excludeErrorLogs` 按既有职责生效，组合冲突诊断同样能被过滤。
- 失败资源只产生预期数量的错误；调用方无需删除或截断错误数组。

### 7.3 第二阶段集成回归

- `.mjs`、`.cjs`、普通 `.js` 分别遵循已公布的优先级，显式配置和资源覆盖可用。
- `CheckSyntaxRspackPlugin` 从当前 compilation 获得模式，覆盖多编译配置与并发检查。
- Rsbuild 包装入口正确传递用户选项及各 environment 的上下文。
- 同一 HTML 内的普通与模块脚本各按自身模式检查；JSON/importmap 不被误当作 JS。
- 使用真实构建产物验证 source map 映射、排除规则和错误展示，而不是只验证直接调用 Acorn 的示例。

这些测试应主要放在上游。Rsdoctor 只保留验证接口接入和报告输出的必要回归测试，不重复维护完整的解析器合规矩阵。

## 8. Rsdoctor 迁移方案

上游发布包含第一阶段接口的正式版本后，在独立变更中完成：

1. 升级 `@rsbuild/plugin-check-syntax`，将最低可用版本限定为包含新接口的版本。
2. 在 `ecma-version-check` 调用边界，根据产物所属构建配置传入正确的 `sourceType`。现有规则若只处理单一配置，可先保持该范围；多配置能力必须按真实资源归属另行接入，不能声称本次自动解决。
3. 删除 `canRetryAsModule`、额外 Acorn `parse()`、`errorCount` 以及 `errors.length = errorCount` 等错误撤销逻辑。
4. 将配置中的 `ecmaVersion` 类型派生自 `PluginCheckSyntaxOptions['ecmaVersion']`，避免通过类型导入保留直接 Acorn 依赖。
5. 确认没有其他直接使用点后，从 core 移除 `acorn`，通过 pnpm 正常更新锁文件。上游仍可间接依赖 Acorn，这是检查器的实现选择。
6. 不增加 pnpm 补丁；清除仍存在的补丁注册和补丁文件。插件包最终构建时应使用正常发布产物。
7. 运行 core 的 ESM、版本边界、严格模式及报告相关回归，并完成 core 构建，确认公开类型和打包结果可用。

拟使用方式如下，具体单次参数名称以最终上游 API 为准：

```ts
await checkSyntax.check(assetPath, asset.content, {
  sourceType: buildConfig.output?.module === true ? 'module' : 'script',
});
```

调用方不再以目标版本低于 ES2015 为由将真实 ESM 强制标为 script；目标版本与模式冲突由上游按第五节的规则诊断。

在正式版本发布前，保留已明确接受的下游兼容方案及其限制。不能先删除重试逻辑，再依靠过滤 import/export 错误掩盖功能缺失。

## 9. 备选方案与取舍

| 方案 | 能解决的问题 | 主要代价与不足 |
| --- | --- | --- |
| 上游公开 sourceType 并统一检查 | 模式选择、严格模式、版本边界和统一错误处理 | 需要上游实现、测试并发布；本 RFC 推荐 |
| Rsdoctor 保留直接 Acorn 重试 | 能消除一部分 ESM 误报 | 有严格模式漏报、重复解析和错误撤销耦合，适合作为过渡 |
| pnpm patch 上游产物 | 能在当前工作区快速使用模块解析 | 依赖特定版本及构建文件结构；类型与运行时补丁都要维护 |
| 从上游间接依赖路径加载 Acorn | 避免显式声明直接依赖 | 依赖未公开的安装结构，无法形成稳定接口 |
| 替换为 Espree 等包装器 | 可以获得模式和版本选项 | 部分工具内部仍依赖 Acorn，错误链路仍分散，没有解决职责归属 |
| 使用 SWC Next 解析后自行判断语法版本 | 可以复用 Rsdoctor 的另一解析器 | 需要自己维护完整语法版本映射，不能仅靠“解析成功”证明符合目标版本 |
| 删除 ESM 检查或忽略模块相关错误 | 减少误报和调用代码 | 会遗漏真实的不兼容语法，降低规则能力，不采用 |

补丁可作为维护者本地验证上游思路的手段，但不作为 Rsdoctor 最终依赖方案。仅在插件实例上添加并修改 `sourceType` 字段，也不足以形成完整接口：还需要版本保护、调用参数、入口传递、并发行为和回归测试。

## 10. 兼容性、风险与发布说明

第一阶段通过新增可选参数与配置实现，默认 script 保持原行为，原则上适合以新增能力发布。显式使用 module 后，先前遗漏的严格模式问题会暴露，这是模式正确后的预期结果，应在文档中给出示例。

第二阶段自动识别 `.mjs`、接入 compilation 元数据及开始扫描 HTML 模块脚本，可能使现有项目出现新的诊断，需单独说明扫描范围和优先级。用户显式配置应有稳定、可测试的覆盖方式。

本提案不会消除按 ECMAScript 年份检查与浏览器逐特性支持之间的粒度差异，也不会验证缺失 polyfill 或运行时模块加载能力。source map 定位的既有限制继续存在，HTML 新入口需要明确位置基准。

实现应保留“每份代码只按最终模式解析一次”的约束，避免为兼容旧行为重新引入先 script 后 module 的隐式重试。解析和过滤的性能回归只需围绕实际新增入口验证，不要求为纯接口变更建立无关的基准工程。

## 11. 交付顺序与验收条件

建议拆为三个可独立评审的变更：

1. **上游公开接口。** 增加 sourceType、单次上下文、ES3/ES5 保护、完整模式矩阵及接口文档；明确 HTML 在该阶段的支持边界并发布正式版本。
2. **Rsdoctor 接入。** 升级版本并删除直接 Acorn 重试逻辑，保留必要的集成回归；不依赖本地补丁和包内私有路径。
3. **上游入口补齐。** 按已公布优先级接入文件扩展名、Rspack/Rsbuild 构建元数据和 HTML 模块脚本，单独记录默认行为变化。

第一阶段与 Rsdoctor 迁移的验收条件：

- 合法 ESM 不再因按 script 解析而误报。
- 超出目标版本的 ESM 特性仍被拒绝，module 配置不会绕过 ES3/ES5 边界。
- 不含 import/export 的模块依然执行严格模式检查。
- 错误生成、source map 映射、过滤和输出统一由上游处理。
- 同一实例并发处理不同模式时，模式不会相互影响。
- Rsdoctor 无需直接引入 Acorn，也无需截断插件错误数组或应用 pnpm 补丁。
- 尚未交付的自动识别与 HTML 支持明确列为后续范围，不在发布文档中提前承诺。

上游评审需要确认的主要决策是：是否接受“module 与 ES3/ES5 无条件产生组合冲突诊断”的契约，以及第二阶段默认行为变化的版本发布策略。API 名称可以调整，但不应削弱语法模式与版本独立、单次调用不修改共享状态、错误统一处理这三个约束。
