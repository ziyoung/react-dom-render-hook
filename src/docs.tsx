import { useDebugValueAnywhere } from './use-debug-value';

export function Docs() {
  useDebugValueAnywhere('docs', 'document');
  return (
    <>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <div className="doc-sites">
        <a href="https://reactjs.org">react</a>
        <a href="https://vitejs.dev">vite</a>
      </div>
    </>
  );
}
