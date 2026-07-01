import type { ReactNode } from 'react';

type CombineWizardProps = {
  appearanceToolbar?: ReactNode;
};

export function CombineWizard({ appearanceToolbar }: CombineWizardProps) {
  return (
    <main className="appShell">
      {appearanceToolbar}
      <header className="hero">
        <div>
          <p className="eyebrow">PANDORA</p>
          <h1>Combiná varios archivos en una sola planilla</h1>
          <p>Cargá tus archivos, organizá las columnas y generá un único Excel.</p>
        </div>
      </header>

      <div className="wizard">
        <section className="panel">
          <h2>Combinar archivos</h2>
          <p className="muted">Herramienta en construcción. Próximo paso: cargar archivos de origen.</p>
        </section>
      </div>
    </main>
  );
}
