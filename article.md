# 隐藏在 ReactDOM 中的渲染钩子

# 可选标题 2：那些与 ReactDOM 相关的渲染

# 可选标题 3：React Devtools 的原理与定制

有过 React 经验的开发者基本使用 [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)。DevTools 提供了丰富的能力：展示组件树，组件的 props 与组件中 hook 的值等属性。

![react devtools](./public/devtool.png)

React Devtools 是如何检测当前网页是否存在使用使用 React 以及组件的众多属性呢？

打开 [ReactDOM](https://cdn.jsdelivr.net/npm/react-dom@17.0.1/umd/react-dom.development.js)代码，你会留意许多与 devtool 相关的代码。

```js
function injectInternals(internals) {
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
    // No DevTools
    return false;
  }
  var hook = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  try {
    rendererID = hook.inject(internals); // We have successfully injected, so now it is safe to set up hooks.
    injectedHook = hook;
  } catch (err) {
    // ...
  } // DevTools exists
}
```

ReactDOM 在特定的渲染阶段还会调用 `__REACT_DEVTOOLS_GLOBAL_HOOK__` 上的生命周期相关的方法，比如 `onCommitFiberRoot`，`onCommitFiberUnmount`。

```js
function onCommitRoot(root, priorityLevel) {
  if (injectedHook && typeof injectedHook.onCommitFiberRoot === 'function') {
    try {
      // ...
      injectedHook.onCommitFiberRoot(rendererID, root, priorityLevel, didError);
    } catch (err) {}
  }
}

function onCommitUnmount(fiber) {
  if (injectedHook && typeof injectedHook.onCommitFiberUnmount === 'function') {
    try {
      injectedHook.onCommitFiberUnmount(rendererID, fiber);
    } catch (err) {}
  }
}
```

正是借助 `__REACT_DEVTOOLS_GLOBAL_HOOK__`， React Devtools 便与 ReactDOM 建立起了联系，从而获取了组件相关的信息。

让我们先一谈 ReactDevtool 的实现原理，再了解完原理之后，我们仍然可以利用原理开发一些有趣的有趣的前端小工具。突破特殊的 hook，从而在移动端场景特殊的 React Devtools。

## Devtools 原理简介(可以删除)

打开浏览器控制台输入 `__REACT_DEVTOOLS_GLOBAL_HOOK__`，你就可以看到 React Devtools 注入的 hook。

![__REACT_DEVTOOLS_GLOBAL_HOOK__](./public/hook.png)

这个对象十分复杂，有几个特殊的方法倒是很值得关注。

- onCommitFiberRoot
- onCommitFiberUnmount
- onPostCommitFiberRoot

ReactDOM 在适当的时机会调用钩子上的这些方法。

`commit` 这个关键字是不是让你想起 React Fiber 架构。我们知道 Fiber 架构就分为了 schedule、reconcile（vdom 转 fiber）、commit（更新到 dom）三个阶段。在 Commit 阶段，我们可以获得非常多的信息。

通过对 Fiber 。

## FiberNode

React 16 中引入了 Fiber 架构之后，会先把 Virtual DOM 转成 Fiber，然后再渲染 Fiber。`onCommitFiberRoot` 等这些方法中的传递的数据也包含了 Fiber 节点（FiberNode）。

FiberNode 的结构是比较复杂的，可以简单抽象为如下的结构：

```ts
interface ReactFiberNode {
  tag: number;
  stateNode: null | HTMLElement; // dom 节点
  memoizedProps?: Record<string, any>; // props
  memoizedState: ClassComponentState | HookLinkedQueue | null; // hooks

  child?: ReactFiberNode;
  sibling?: ReactFiberNode;
  return: ReactFiberNode; // parent
  // ...
}
```

从上面的结构可以看出，组件相关的信息都包含在 FiberNode 中。`stateNode` 为其对应真实的 DOM 节点，`memoizedProps` 为组件的 `props`。当组件为函数式组件时，`tag` 为 0，`memoizedState` 保存了组件中的 hooks 信息。当组件为类组件是，`tag` 为 1，`memoizedState` 则是组件的 `state`。

Fiber 节点形成一个链表结构，`child` 为子节点，`sibling` 为相邻节点，`return` 指向父节点。在了解结构时，便可以对节点进行遍历。比如实现 `findNativeNodesForFiber` 方法，用来找到 FiberNode 对应的真实 DOM 节点。

```ts
function findNativeNodesForFiber(node?: ReactFiberNode) {
  // ...
  // 先遍历 child
  const { child } = node;
  collectStateNode();

  // 再遍历所有的 sibling
  let current = child?.sibling;
  while (current) {
    collectStateNode();
    current = current.sibling;
  }
  // ...
}
```

### memoizedState 与 React Hooks

上文中提到当组件为函数式组件时，`memoizedState` 保存了 React Hooks 相关的信息。与 FiberNode 类似，React Hooks 最终也形成一个链表。

```ts
export interface HookLinkedQueue {
  memoizedState: any; // 渲染时的值
  next: HookLinkedQueue | null;
  // ...
}
```

React Hook 将其数据都保存在 `memoizedState` 上。比如对于 `useRef` 来说，`ref.current` 值就是 `memoizedState`。比如实现一些 `inspectRefHooksOfFiber` 来获取组件内包含的 `useRef` 中的值。

```ts
function inspectRefHooksOfFiber(node: ReactFiberNode) {
  let current: HookLinkedQueue | null = node.memoizedState;
  while (current) {
    retrieveValue(current);
    current = current.next;
  }
}
```

## 实践：useDebugValueAnywhere

[useDebugValue](https://zh-hans.reactjs.org/docs/hooks-reference.html#usedebugvalue) 是 React 内置的一个 hook，用以在 React Devtools 中显示自定义 hook 的标签。它的限制是只能在 hook 中使用。在了解前面的知识后，我们可以实现一个增加版的 `useDebugValueAnywhere`。
