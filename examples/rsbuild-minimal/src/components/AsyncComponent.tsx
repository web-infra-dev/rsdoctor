import { sharedUtility, SHARED_CONSTANT } from '../utils/shared';

const AsyncComponent = () => {
  const result = sharedUtility('from async component');

  return (
    <div>
      <h2>Async Component</h2>
      <p>{result}</p>
      <p>Constant: {SHARED_CONSTANT}</p>
    </div>
  );
};

export default AsyncComponent;
