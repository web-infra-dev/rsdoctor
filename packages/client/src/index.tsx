import '@rsdoctor/components/i18n';
import App from './main';
import './common/styles/base.scss';
import icon from './common/imgs/icon.svg';

const link = document.createElement('link');
link.setAttribute('type', 'image/x-icon');
link.setAttribute('rel', 'icon');
link.setAttribute('href', icon);
document.head.appendChild(link);

// must export Component at the entry file in edenx.
export default App;
