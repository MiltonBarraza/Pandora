import { ImportWizard } from './components/ImportWizard/ImportWizard';
import { IconsPreview } from './dev/IconsPreview';

export default function App() {
  if (window.location.pathname === '/icons-preview' || window.location.pathname === '/dev/icons') {
    return <IconsPreview />;
  }

  return <ImportWizard />;
}
