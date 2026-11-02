/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Hook Customizado de Gerenciamento Global de Atalhos de Teclado
 * Gerencia F1, F2, F3, F4, F5, F6, ESC, Delete e garante foco constante no leitor de código de barras
 */

import { useEffect, useCallback, RefObject } from 'react';

export interface ShortcutHandlers {
  onSales?: () => void;      // F1
  onSearch?: () => void;     // F2
  onRegister?: () => void;   // F3
  onDiscount?: () => void;   // F4
  onPayment?: () => void;    // F5
  onReprint?: () => void;    // F6
  onCancel?: () => void;     // ESC
  onDelete?: () => void;     // Delete
}

export interface UseKeyboardShortcutsOptions {
  barcodeInputRef: RefObject<HTMLInputElement | null>;
  handlers: ShortcutHandlers;
  disabled?: boolean;
  isModalOpen?: boolean;
}

export function useKeyboardShortcuts({
  barcodeInputRef,
  handlers,
  disabled = false,
  isModalOpen = false,
}: UseKeyboardShortcutsOptions) {
  /**
   * Garante o foco no leitor de código de barras
   */
  const focusBarcode = useCallback(() => {
    if (disabled || isModalOpen) return;

    // Se o elemento ativo for outro input ou textarea fora do leitor, não rouba foco
    const active = document.activeElement;
    if (active && active !== barcodeInputRef.current) {
      const tagName = active.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return;
      }
    }

    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus({ preventScroll: true });
    }
  }, [barcodeInputRef, disabled, isModalOpen]);

  // Listener para capturar teclas de atalho
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Teclas de função do navegador que precisam ter seu comportamento padrão anulado
      // (ex: F5 no Windows normalmente recarrega a página; F1 abre ajuda; F3 busca no navegador)
      const functionKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
      if (functionKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Se um modal ou janela secundária estiver aberta, apenas repassa ESC se o modal não tratar
      if (isModalOpen) {
        if (e.key === 'Escape' && handlers.onCancel) {
          e.preventDefault();
          handlers.onCancel();
        }
        return;
      }

      // Mapeamento dos atalhos quando nenhum modal bloqueante estiver ativo
      switch (e.key) {
        case 'F1':
          if (handlers.onSales) handlers.onSales();
          break;

        case 'F2':
          if (handlers.onSearch) handlers.onSearch();
          break;

        case 'F3':
          if (handlers.onRegister) handlers.onRegister();
          break;

        case 'F4':
          if (handlers.onDiscount) handlers.onDiscount();
          break;

        case 'F5':
          if (handlers.onPayment) handlers.onPayment();
          break;

        case 'F6':
          if (handlers.onReprint) handlers.onReprint();
          break;

        case 'Escape':
          e.preventDefault();
          if (handlers.onCancel) handlers.onCancel();
          break;

        case 'Delete':
          // Apenas dispara se não estiver editando texto dentro de um input
          if (document.activeElement === barcodeInputRef.current && barcodeInputRef.current?.value) {
            // Se o operador está no leitor e tem texto digitado, deixa o Delete apagar caracteres
            return;
          }
          if (handlers.onDelete) {
            e.preventDefault();
            handlers.onDelete();
          }
          break;

        default:
          // Se o operador estiver teclando caracteres alfanuméricos normais (ou leitor bipando)
          // mas o foco estava perdido em um elemento estático (ex: clicou em uma linha da tabela ou fundo),
          // redireciona imediatamente o foco para o campo do leitor para não perder o código lido!
          if (!isModalOpen && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const active = document.activeElement;
            const isTypingField =
              active &&
              (active.tagName.toLowerCase() === 'input' ||
                active.tagName.toLowerCase() === 'textarea' ||
                active.tagName.toLowerCase() === 'select');

            if (!isTypingField && barcodeInputRef.current) {
              barcodeInputRef.current.focus({ preventScroll: true });
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [disabled, isModalOpen, handlers, barcodeInputRef]);

  // Monitora cliques e perda de foco para devolver o foco ao campo de leitura
  useEffect(() => {
    if (disabled || isModalOpen) return;

    // Foco inicial
    focusBarcode();

    const handleWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Se clicou em um botão, input, link ou controle interativo, permite foco normal
      const isInteractive =
        target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('a') ||
        target.closest('[role="button"]');

      if (!isInteractive) {
        // Clicou no fundo ou em elementos não editáveis: retorna ao leitor
        setTimeout(focusBarcode, 20);
      }
    };

    window.addEventListener('click', handleWindowClick);
    return () => {
      window.removeEventListener('click', handleWindowClick);
    };
  }, [disabled, isModalOpen, focusBarcode]);

  return {
    focusBarcode,
  };
}
