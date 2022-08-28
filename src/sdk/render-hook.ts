import {
  DebugHookData,
  DebugHookKey,
  ForwardRef,
  FunctionComponent,
  HostComponent,
  HostText,
  SimpleMemoComponent,
} from './constant';

export interface ReactDevtoolGlobalHook {
  isDisabled: boolean;
  supportsFiber: true;

  inject(internals: any): number;

  checkDCE(): void;

  onScheduleFiberRoot?: (
    rendererID: number,
    root: ReactFiberRootNode,
    children: any,
  ) => void;
  onCommitFiberRoot?: (
    rendererID: number,
    root: ReactFiberRootNode,
    schedulerPriority: number | undefined,
    didError: boolean,
  ) => void;
  onCommitFiberUnmount?: (rendererID: number, fiber: any) => void;

  // 以下的方法必须实现相关逻辑
  onPostCommitFiberRoot?: (
    rendererID: number,
    root: ReactFiberRootNode,
  ) => void;
}

export interface ClassComponentState {
  [key: string]: any;
  next: null;
}

export interface HookLinkedQueue {
  memoizedState: any; // 渲染时的值
  next: HookLinkedQueue | null;
  // ...
  // 下面两个属性暂时用不到，先忽略
  // queue: any
  // baseQueue: any
  // baseState: any
}

export interface ReactFiberRootNode {
  current: ReactFiberNode;
}

export interface ReactFiberNode {
  tag: number;
  stateNode: null | HTMLElement;
  child?: ReactFiberNode;
  sibling?: ReactFiberNode;
  memoizedProps?: Record<string, any>;
  memoizedState: ClassComponentState | HookLinkedQueue | null;

  return: ReactFiberNode; // parent
}

function isHookLinkedQueue(state: any): state is HookLinkedQueue {
  return state && 'next' in state && 'memoizedState' in state;
}

function retrieveHookValue(hook: HookLinkedQueue) {
  const data = hook.memoizedState;
  if (!data) {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(data, 'current')) {
    return;
  }
  const current = data.current;
  if (!Object.prototype.hasOwnProperty.call(current, DebugHookKey)) {
    return;
  }

  return current[DebugHookKey] as {
    name: string;
    data: any;
  };
}

function inspectDebugHooksOfFiber(node: ReactFiberNode) {
  const hasHooks = [
    FunctionComponent,
    SimpleMemoComponent,
    ForwardRef,
  ].includes(node.tag);
  if (!hasHooks) {
    return;
  }

  if (!isHookLinkedQueue(node.memoizedState)) {
    return;
  }

  const result: any[] = [];

  let current: HookLinkedQueue | null = node.memoizedState;
  while (current) {
    const data = retrieveHookValue(current);
    if (data) {
      result.push(data);
    }
    current = current.next;
  }

  return result;
}

function findNativeNodesForFiber(node?: ReactFiberNode) {
  const nativeNodes: HTMLElement[] = [];
  if (!node) {
    return nativeNodes;
  }

  let current: ReactFiberNode | undefined = node.child;
  const collectStateNode = () => {
    if (!current) {
      return;
    }

    if (current.tag === HostComponent || current.tag === HostText) {
      if (current.stateNode) {
        nativeNodes.push(current.stateNode);
      }
    } else {
      nativeNodes.push(...findNativeNodesForFiber(current.child));
    }
  };

  const { child } = node;
  current = child;
  collectStateNode();

  current = child?.sibling;
  while (current) {
    collectStateNode();
    current = current.sibling;
  }

  return nativeNodes;
}

export class ReactDOMInjectHook implements ReactDevtoolGlobalHook {
  isDisabled: boolean = false;
  supportsFiber: true = true;

  private index = 0;

  private readonly debugComponents = new Map<any, any>();

  constructor() {
    (window as any)[DebugHookData] = this.debugComponents;
  }

  inject(renderer: any): number {
    this.index += 1;
    return this.index;
  }

  checkDCE(): void {}

  onCommitFiberRoot(
    rendererID: number,
    root: ReactFiberRootNode,
    schedulerPriority: number | undefined,
    didError: boolean,
  ) {
    this.debugComponents.clear();
    this.visitFiberNode(root.current);
    this.logComponents();
  }

  logComponents() {
    if (this.debugComponents.size) {
      this.debugComponents.forEach((value, key) => {
        console.log('fiber node', key);
        console.log('native nodes', findNativeNodesForFiber(key));
        console.log('debug value', JSON.stringify(value, null, 2));
      });
    }
  }

  inspectFiber(node: ReactFiberNode) {
    const value = inspectDebugHooksOfFiber(node);
    if (value && value.length) {
      this.debugComponents.set(node, value);
    }
  }

  visitFiberNode(node?: ReactFiberNode) {
    if (!node) {
      return;
    }
    this.inspectFiber(node);

    this.visitFiberNode(node.child);

    let { sibling } = node;
    while (sibling) {
      this.visitFiberNode(sibling);
      sibling = sibling.sibling;
    }
  }
}
