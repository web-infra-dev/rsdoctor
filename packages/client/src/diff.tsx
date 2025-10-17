import '@rsdoctor/components/i18n';
import ReactDOM from 'react-dom/client';
import DiffApp from './DiffApp';
import './common/styles/base.scss';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);

root.render(<DiffApp />);

const link = document.createElement('link');
link.setAttribute('type', 'image/x-icon');
link.setAttribute('rel', 'icon');
link.setAttribute(
  'href',
  'https://assets.rspack.rs/rsdoctor/rsdoctor-logo-960x960.png',
);
document.head.appendChild(link);
