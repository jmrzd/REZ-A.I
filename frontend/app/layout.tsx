import type { ReactNode } from 'react';
import './style.css';
export const metadata = { title: 'Rez A.I', description: 'Seu assistente de IA híbrida' };
export default function Layout({children}:{children:ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html> }
