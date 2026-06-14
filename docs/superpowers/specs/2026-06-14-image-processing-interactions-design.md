# 图片处理交互增强设计

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为图片处理工作台补上滚轮缩放和鼠标点击取色，让裁剪预览更顺手，抠图关键色更快选定。

**Architecture:** 交互数学下沉到纯模型，负责把预览坐标换算回原图像素，并把滚轮方向映射到稳定的缩放步进。UI 面板只负责发出鼠标事件和展示当前状态，hook 负责把取色结果写回抠图参数并触发重算。

**Tech Stack:** React, TypeScript, Ant Design, canvas 取色与预览渲染，node:test

---

## Scope

- 裁剪预览区支持鼠标滚轮缩放。
- 抠图面板支持鼠标点击取色。
- 现有滑杆和颜色选择器保留，作为精细调节入口。

## Behavior

- 在裁剪预览图上滚轮上滑，预览放大。
- 在裁剪预览图上滚轮下滑，预览缩小。
- 缩放继续限制在现有 `0.5x` 到 `3x` 范围内。
- 在抠图预览图上点击任意位置，读取该点的原图像素颜色并更新关键色。
- 点击取色后，抠图结果会自动刷新。
- 取色只在已有处理图时可用。

## Implementation Notes

- 增加纯模型函数，负责：
  - 计算滚轮后的新缩放值
  - 根据预览容器、显示图像尺寸和点击坐标，计算原图像素坐标
  - 从 canvas 取出点击点的 RGB
- 裁剪预览面板在图像元素上绑定 `onWheel`，只拦截含 Ctrl/Meta 的页面缩放以外的普通滚轮。
- 色键面板在原图预览区域上绑定点击事件，点击后更新 `workspace.matte.keyColor`。
- 保持原来的颜色选择器不变，避免把吸管变成唯一入口。

## Testing

- 新增模型测试覆盖：
  - 滚轮向上增加缩放，向下减少缩放
  - 缩放结果被夹在上下限内
  - 点击预览坐标能换算回正确原图像素
  - 边缘点击能被夹在图像边界内
  - 取色读取到正确 RGB
- 运行 `npm test`
- 运行 `npm run build`
- 浏览器里验证：
  - 裁剪预览滚轮缩放可用
  - 抠图预览点击后关键色更新

