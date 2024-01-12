import '@rsdoctor/components/i18n';
import App from './App';
import ReactDOM from 'react-dom/client';
import './common/styles/base.scss';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);

root.render(<App />);

const link = document.createElement('link');
link.setAttribute('type', 'image/x-icon');
link.setAttribute('rel', 'icon');
link.setAttribute('href', 'https://lf3-static.bytednsdoc.com/obj/eden-cn/lognuvj/rsdoctor/logo/rsdoctor.png');
document.head.appendChild(link);