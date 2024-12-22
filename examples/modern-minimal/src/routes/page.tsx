import { Helmet } from '@modern-js/runtime/head';
import { sumBy } from 'lodash';
import { chalk } from '@rsdoctor/utils/logger';
import './index.css';

var objects = [{ 'n': 4 }, { 'n': 2 }, { 'n': 8 }, { 'n': 6 }];

const a = sumBy(objects, function(o) { return o.n; })
chalk('aaaaaaaaaaaaaaaaa');
console.log(a);

const Index = (): JSX.Element => (
  <div className="container-box">
    <Helmet />
    Hello world
  </div>
);

export default Index;
