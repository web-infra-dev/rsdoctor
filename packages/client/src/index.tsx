import '@rsdoctor/components/i18n';
import App from './App';
import ReactDOM from 'react-dom/client';
import './common/styles/base.scss';
import icon from './common/imgs/icon.svg';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);

root.render(<App />);

const link = document.createElement('link');
link.setAttribute('type', 'image/x-icon');
link.setAttribute('rel', 'icon');
link.setAttribute('href', icon);
document.head.appendChild(link);