'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, LockKeyhole, ShieldCheck, ShieldX, X } from 'lucide-react';

type Decision = 'pending' | 'approved' | 'denied';
type DemoRequest = {
  id: string;
  tool: string;
  description: string;
  arguments: Record<string, string>;
};

const EXAMPLE = {
  tool: 'rez__demo__echo',
  description: 'Retornar uma mensagem de teste, sem acessar arquivos ou terminal.',
  arguments: { message: 'Olá! Esta é uma simulação da REZ.' },
};

export default function ToolApprovalDemo({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [request, setRequest] = useState<DemoRequest | null>(null);
  const [decision, setDecision] = useState<Decision>('pending');

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const modal = closeButtonRef.current?.closest('[role="dialog"]');
      if (!modal) return;
      const controls = Array.from(modal.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus(); };
  }, [onClose]);

  function simulate() {
    setRequest({ ...EXAMPLE, id: crypto.randomUUID(), arguments: { ...EXAMPLE.arguments } });
    setDecision('pending');
  }

  function decide(next: 'approved' | 'denied') {
    if (!request || decision !== 'pending') return;
    setDecision(next);
  }

  return (
    <div className="permissionsBackdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="permissionsPanel" role="dialog" aria-modal="true" aria-labelledby="permissions-dialog-title">
      <div className="permissionsTop">
        <div className="permissionsTitle"><ShieldCheck size={19} /><strong id="permissions-dialog-title">Laboratório de permissões</strong></div>
        <button ref={closeButtonRef} className="permissionsClose" type="button" onClick={onClose} aria-label="Fechar laboratório"><X size={18} /></button>
      </div>
      <p className="permissionsWarning"><LockKeyhole size={15} /> Simulação local: nenhuma permissão real é concedida, e nenhuma ferramenta é executada.</p>
      <p className="permissionsHelp">Veja como a REZ poderá mostrar o nome da ferramenta e seus argumentos antes de solicitar seu consentimento.</p>
      <button className="simulateButton" type="button" onClick={simulate}>Simular solicitação de ferramenta</button>
      {request && (
        <div className="permissionRequest" aria-live="polite">
          <div className="permissionRequestHeader">
            <strong>{decision === 'pending' ? 'Aguardando sua decisão' : decision === 'approved' ? 'Aprovada na simulação' : 'Negada na simulação'}</strong>
            {decision === 'approved' ? <Check size={18} /> : decision === 'denied' ? <ShieldX size={18} /> : <LockKeyhole size={18} />}
          </div>
          <dl>
            <dt>Ferramenta</dt><dd><code>{request.tool}</code></dd>
            <dt>Descrição</dt><dd>{request.description}</dd>
            <dt>Argumentos</dt><dd><pre>{JSON.stringify(request.arguments, null, 2)}</pre></dd>
            <dt>ID da simulação</dt><dd><code>{request.id}</code></dd>
          </dl>
          {decision === 'pending' ? (
            <div className="permissionActions">
              <button type="button" className="permissionDeny" onClick={() => decide('denied')}>Negar</button>
              <button type="button" className="permissionApprove" onClick={() => decide('approved')}>Aprovar simulação</button>
            </div>
          ) : <p className="permissionsResult">Decisão registrada apenas nesta tela. Para testar novamente, crie outra solicitação.</p>}
        </div>
      )}
    </section>
    </div>
  );
}
