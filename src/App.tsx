import { useDebugValue, useMemo, useState } from 'react';
import reactLogo from './assets/react.svg';
import './App.css';
import { useDebugValueAnywhere } from './use-debug-value';
import { Docs } from './docs';

function useCount() {
  const [count, setCount] = useState(0);

  const v = useMemo(() => {
    return `count is ${count}`;
  }, [count]);

  useDebugValueAnywhere('useCount', count);
  return [count, setCount] as const;
}

function App() {
  const [count, setCount] = useCount();
  useDebugValue(count);
  useDebugValueAnywhere('app', {
    count: `count->${count}`,
  });

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <Docs />
    </div>
  );
}

export default App;
