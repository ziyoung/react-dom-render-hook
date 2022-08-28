import { ReactDevtoolGlobalHook, ReactDOMInjectHook } from './render-hook';

const GLOBAL_HOOK_KEY = '__REACT_DEVTOOLS_GLOBAL_HOOK__';

const hook = new ReactDOMInjectHook();

function getDevtoolHook() {
  return (window as any)[GLOBAL_HOOK_KEY] as ReactDevtoolGlobalHook | undefined;
}

function setDevtoolHook(hook: ReactDevtoolGlobalHook) {
  (window as any)[GLOBAL_HOOK_KEY] = hook;
}

install();

function install() {
  let currentHook = getDevtoolHook();
  if (currentHook) {
    const oldOnCommitFiberRoot = currentHook.onCommitFiberRoot;
    currentHook.onCommitFiberRoot = function (...args) {
      hook.onCommitFiberRoot.apply(hook, args);
      if (oldOnCommitFiberRoot) {
        oldOnCommitFiberRoot.apply(this, args);
      }
    };
  } else {
    setDevtoolHook(hook);
  }
}
