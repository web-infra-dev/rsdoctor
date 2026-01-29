import './App.css';
import './semver';
import './semver7';

const App = () => {
  // Dynamically import shared.ts to make it an async chunk
  // @ts-expect-error - Dynamic import for testing splitChunk behavior
  import('./utils/shared').then(() => {
    console.log('Shared module loaded as async chunk');
  });

  return (
    <>
      <div className="content">
        <h1>Rsbuild with React</h1>
        <p>Start building amazing things with Rsbuild.</p>
      </div>
      <button className="button">Button</button>
    </>
  );
};

export default App;
