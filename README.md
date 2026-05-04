# 陪玩副驾 AI

面向真人陪玩的 AI 辅助工作台原型。当前版本是无构建依赖的静态可交互 MVP，用本地模板模拟 AI 输出，用 `localStorage` 保存数据。

## 运行方式

直接在浏览器打开 `index.html` 即可。

如果后续需要本地服务，可以在项目目录执行：

```powershell
npx serve .
```

## 当前功能

- 首页工作台和快捷入口
- 陪玩人设设置
- 老板档案新增、编辑、删除、列表、详情
- 开单准备模拟生成
- 实时辅助模拟生成
- 订单复盘模拟生成和保存
- 老板画像更新建议
- 联系提醒轻量规则
- 话术复制
- 常用话术收藏
- 设置页数据备份 / 导入 / 恢复示例

## 测试方式

运行烟测脚本：

```powershell
node .\tests\smoke.test.js
```

当前烟测覆盖：

- 静态入口文件存在
- `index.html` 正确加载资源
- MVP 导航和渲染函数存在
- 示例人设、老板、订单数据存在
- 开单准备、实时辅助、订单复盘生成字段完整
- AI 输出包含可复制、可收藏卡片
- 设置页备份导入结构校验
- 移动端关键样式存在

## 版本管理

项目已启用 Git。建议每个稳定节点提交一次：

```powershell
git status --short
git add .
git commit -m "说明本次改动"
```

查看历史：

```powershell
git log --oneline --decorate --max-count=10
```

回滚到某个历史版本前，先确认当前状态：

```powershell
git status --short
```

再根据需要用 `git revert <commit>` 创建反向提交。避免直接使用 `git reset --hard`，除非明确确认要丢弃本地改动。

## 数据说明

数据保存在浏览器 `localStorage`，键名是 `pwai-state-v1`。页面右上角“重置示例”会覆盖本地数据为内置示例。
