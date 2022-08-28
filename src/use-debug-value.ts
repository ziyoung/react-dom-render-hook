import { useRef } from 'react';
import { DebugHookKey } from './sdk/constant';

export function useDebugValueAnywhere(name: string, data: any) {
  const ref = useRef({
    [DebugHookKey]: {
      name,
      data,
    },
  });
  ref.current[DebugHookKey].name = name;
  ref.current[DebugHookKey].data = data;
}
