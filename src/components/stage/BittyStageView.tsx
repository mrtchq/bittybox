import React, { useEffect } from 'react';
import { BittyStage, EtherTransition } from '../BittyStage';
import { useStage, StageMode, StageProvider } from '../../stores/stageStore';
import { StageEditor } from './StageEditor';
import { PasswordLockStage } from './PasswordLockStage';
import { TimeLockStage } from './TimeLockStage';
import { AccessLimitStage } from './AccessLimitStage';
import { EncryptionStage } from './EncryptionStage';
import { AgenticLockStage } from './AgenticLockStage';
import { PreviewStage } from './PreviewStage';
import type { UseAccountResult } from '../../hooks/useAccount';
import type { BittyMetadata, BittyChainDraft } from '../../types';

export interface BittyStageViewProps {
  content: string;
  onChangeContent?: (content: string) => void;
  metadata: BittyMetadata;
  onChangeMetadata?: (metadata: BittyMetadata) => void;
  bittyUrl?: string;
  onGenerate?: () => void;
  isGenerating?: boolean;
  calculatedCreditCost?: number;
  chainEnabled?: boolean;
  chainIndex?: number;
  chainTotal?: number;
  chainMax?: number;
  chainDraft?: BittyChainDraft | null;
  isLastChainBox?: boolean;
  onToggleChain?: (enabled: boolean) => void;
  onCreateNextChainPage?: (mode: 'clone' | 'scratch') => void;
  onGoToChainPage?: (index: number) => void;
  onDeleteLastChainBox?: () => void;
  account?: UseAccountResult;
  isPro?: boolean;
  onOpenPaywall?: (featureName?: string) => void;
}

const StageDispatcher: React.FC<BittyStageViewProps> = (props) => {
  const { state, setContent, setTitle, setDescription, syncFromExternal, discardDraft, exitMode } = useStage();

  // Sync incoming props to stage store
  useEffect(() => {
    if (props.content !== state.content) {
      setContent(props.content);
    }
  }, [props.content]);

  useEffect(() => {
    syncFromExternal({
      title: props.metadata.title || 'My Box',
      description: props.metadata.description || '',
      favicon: props.metadata.favicon || '📦',
      password: props.metadata.password || '',
      timeLockEnabled: Boolean(props.metadata.lockConfig?.timeWindow?.mode),
      accessLimitEnabled: Boolean(props.metadata.lockConfig?.openLimit?.enabled),
      accessLimitMaxOpens: props.metadata.lockConfig?.openLimit?.maxOpens || 1,
      showRemainingAccessCount: props.metadata.lockConfig?.openLimit?.showRemainingCount ?? true,
    });
  }, [props.metadata]);

  // Handle browser Back / popstate so users smoothly return to Editor without leaving page
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (state.mode !== 'editor') {
        discardDraft();
      }
    };

    if (state.mode !== 'editor') {
      window.history.pushState({ stageMode: state.mode }, '', `#stage=${state.mode}`);
    } else if (window.location.hash.startsWith('#stage=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [state.mode, discardDraft]);

  // Sync state changes back up to parent
  useEffect(() => {
    if (state.content !== props.content) {
      props.onChangeContent?.(state.content);
    }
  }, [state.content]);

  useEffect(() => {
    const nextLockConfig: Record<string, any> = { ...(props.metadata.lockConfig || {}) };

    if (state.timeLockEnabled) {
      nextLockConfig.timeWindow = {
        mode: state.timeLockMode,
        durationHours: state.timeLockMode === 'expiry' ? state.timeExpiryHours : undefined,
        delayHours: state.timeLockMode === 'delay' ? state.timeDelayHours : undefined,
        openAt: state.timeLockMode === 'range' ? state.timeOpenAt : undefined,
        lockAt: state.timeLockMode === 'range' ? state.timeLockAt : undefined,
        hybridRevealMode: state.timeLockMode === 'hybrid' ? state.hybridRevealMode : undefined,
        hybridSelfDestructHours: state.timeLockMode === 'hybrid' ? state.hybridSelfDestructHours : undefined,
        showCountdown: state.showTimeCountdown,
      };
    } else {
      delete nextLockConfig.timeWindow;
    }

    if (state.accessLimitEnabled) {
      nextLockConfig.openLimit = {
        enabled: true,
        maxOpens: state.accessLimitMaxOpens,
        showRemainingCount: state.showRemainingAccessCount,
      };
    } else {
      delete nextLockConfig.openLimit;
    }

    if (state.agenticEnabled) {
      nextLockConfig.agentic = {
        enabled: true,
        requireMcp: state.agenticRequireMcp,
        roleFilter: state.agenticRoleFilter || undefined,
      };
    } else {
      delete nextLockConfig.agentic;
    }

    const hasAnyLock = Object.keys(nextLockConfig).length > 0;

    const updatedMeta: BittyMetadata = {
      ...props.metadata,
      title: state.title,
      description: state.description,
      favicon: state.favicon,
      password: state.password.trim() ? state.password.trim() : undefined,
      lockConfig: hasAnyLock ? nextLockConfig : undefined,
    };

    props.onChangeMetadata?.(updatedMeta);
  }, [
    state.title,
    state.description,
    state.favicon,
    state.password,
    state.timeLockEnabled,
    state.timeLockMode,
    state.timeExpiryHours,
    state.timeDelayHours,
    state.timeOpenAt,
    state.timeLockAt,
    state.hybridRevealMode,
    state.hybridSelfDestructHours,
    state.showTimeCountdown,
    state.accessLimitEnabled,
    state.accessLimitMaxOpens,
    state.showRemainingAccessCount,
    state.agenticEnabled,
    state.agenticRequireMcp,
    state.agenticRoleFilter,
  ]);

  const renderStageView = (mode: StageMode) => {
    switch (mode) {
      case 'passwordLock':
        return <PasswordLockStage />;
      case 'timeLock':
        return <TimeLockStage />;
      case 'accessLimitLock':
        return <AccessLimitStage />;
      case 'encryption':
        return <EncryptionStage />;
      case 'agenticLock':
        return <AgenticLockStage />;
      case 'preview':
        return <PreviewStage />;
      case 'editor':
      default:
        return (
          <StageEditor
            onGenerate={props.onGenerate}
            isGenerating={props.isGenerating}
            calculatedCreditCost={props.calculatedCreditCost}
            bittyUrl={props.bittyUrl}
            chainEnabled={props.chainEnabled}
            chainIndex={props.chainIndex}
            chainTotal={props.chainTotal}
            chainMax={props.chainMax}
            chainDraft={props.chainDraft}
            isLastChainBox={props.isLastChainBox}
            onToggleChain={props.onToggleChain}
            onCreateNextChainPage={props.onCreateNextChainPage}
            onGoToChainPage={props.onGoToChainPage}
            onDeleteLastChainBox={props.onDeleteLastChainBox}
            account={props.account}
            isPro={props.isPro}
            onOpenPaywall={props.onOpenPaywall}
          />
        );
    }
  };

  return (
    <BittyStage>
      <EtherTransition mode={state.mode}>
        {renderStageView(state.mode)}
      </EtherTransition>
    </BittyStage>
  );
};

export const BittyStageView: React.FC<BittyStageViewProps> = (props) => {
  return (
    <StageProvider
      initial={{
        content: props.content,
        title: props.metadata.title || 'My Box',
        description: props.metadata.description || '',
        favicon: props.metadata.favicon || '📦',
        password: props.metadata.password || '',
        timeLockEnabled: Boolean(props.metadata.lockConfig?.timeWindow?.mode),
        accessLimitEnabled: Boolean(props.metadata.lockConfig?.openLimit?.enabled),
        accessLimitMaxOpens: props.metadata.lockConfig?.openLimit?.maxOpens || 1,
        showRemainingAccessCount: props.metadata.lockConfig?.openLimit?.showRemainingCount ?? true,
      }}
    >
      <StageDispatcher {...props} />
    </StageProvider>
  );
};
