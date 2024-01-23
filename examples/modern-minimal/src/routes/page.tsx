import { Helmet } from '@modern-js/runtime/head';
import './index.css';

const Index = (): JSX.Element => (
  <div className="container-box">
    <Helmet />
    Hello world
  </div>
);

export default Index;
