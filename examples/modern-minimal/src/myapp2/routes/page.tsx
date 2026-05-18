import { Helmet } from '@modern-js/runtime/head';
// import './index.css';
import React from 'react';

const Index = (): React.JSX.Element => (
  <div className="container-box">
    <Helmet />
    Hello world
  </div>
);

export default Index;
