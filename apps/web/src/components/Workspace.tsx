"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';

import { BuilderTopBar, TopMode } from './BuilderTopBar';
import { BuilderLeftPanel, LeftPanelTab } from './BuilderLeftPanel';
import { Terminal } from './Terminal';
import { Workbench } from './Workbench';
import { useWorkspace } from '../hooks/useWorkspace';
import { useAI } from '../hooks/useAI';

const Workspace: React.FC = () => {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') ?? '';

  const workspace = useWorkspace();
  const ai = useAI({
    files: workspace.files,
    folders: workspace.folders,
    elementCounter: workspace.elementCounter,
    devServerActive: workspace.devServerActive,
    lastCompileError: workspace.lastCompileError,
    setFiles: workspace.setFiles,
    setElementCounter: workspace.setElementCounter,
    setOpenTabs: workspace.setOpenTabs,
    setActiveFile: workspace.setActiveFile,
    setLastCompileError: workspace.setLastCompileError,
    handleAddConsoleLine: workspace.handleAddConsoleLine,
    simulateTerminalBuildAndStart: workspace.simulateTerminalBuildAndStart,
    handleStartDevServer: workspace.handleStartDevServer,
    executeTransaction: workspace.executeTransaction,
    workspaceReady: workspace.workspaceReady,
    projectId: workspace.projectId,
    webcontainerStatus: workspace.webcontainerStatus,
    saveImmediately: workspace.saveImmediately,
    isAiGeneratingRef: workspace.isAiGeneratingRef,
  });

  const initialPromptSentRef = React.useRef(false);

  // Builder.io Mode and Left tab states
  const [topMode, setTopMode] = React.useState<TopMode>("design");
  const [leftTab, setLeftTab] = React.useState<LeftPanelTab>("agent");

  // Auto-send initial prompt from URL query param once workspace is ready
  React.useEffect(() => {
    if (!workspace.workspaceReady || !initialPrompt || initialPromptSentRef.current) return;
    initialPromptSentRef.current = true;
    void ai.handleSendMessage(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.workspaceReady]);

  // Sync designMode to showInspector
  React.useEffect(() => {
    if (topMode === "design") {
      workspace.setShowInspector(true);
    } else {
      workspace.setShowInspector(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topMode]);

  // Auto-switch to Style tab when user selects an element in design mode
  React.useEffect(() => {
    if (workspace.selectedElement && topMode === "design") {
      setLeftTab("style");
    }
  }, [workspace.selectedElement, topMode]);

  // Sync TopMode to Workbench view (Code -> split-screen, Design/Interact -> preview-only)
  React.useEffect(() => {
    if (topMode === "code") {
      workspace.setWorkbenchView("split");
    } else {
      workspace.setWorkbenchView("preview");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topMode]);

  const handleSelectLayer = React.useCallback(
    (dataId: string, tag: string, classes: string[]) => {
      // The layers tree only knows the static source id (there's no live DOM
      // node / runtime id when selecting from the tree instead of clicking
      // the canvas) -- set both id and sourceId to it so handleUpdateElement's
      // `selectedElement.sourceId === elementId` check still matches and the
      // inspector's active-state stays in sync after an edit made this way.
      workspace.handleSelectElement({
        id: dataId,
        sourceId: dataId,
        tagName: tag,
        classes,
        text: "",
        filePath: workspace.activeFile,
      });
    },
    [workspace],
  );

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden" style={{ background: '#141414' }}>
      {/* Builder.io Top Bar */}
      <BuilderTopBar
        mode={topMode}
        onModeChange={setTopMode}
        projectName={workspace.projectName}
        activeFile={workspace.activeFile}
        devServerActive={workspace.devServerActive}
        webcontainerStatus={workspace.webcontainerStatus}
        onRefresh={() => {
          // Trigger a refresh/reload on the LivePreview iframe
          const iframe = document.querySelector('iframe[title="App preview"]') as HTMLIFrameElement | null;
          if (iframe) {
            iframe.src = iframe.src;
          }
        }}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Side Panel (Builder.io inspired Agent/Style/Layers/Library/Comments) */}
        <BuilderLeftPanel
          activeTab={leftTab}
          onTabChange={setLeftTab}
          files={workspace.files}
          activeFile={workspace.activeFile}
          selectedElement={workspace.selectedElement}
          onSelectElement={workspace.handleSelectElement}
          onUpdateElement={workspace.handleUpdateElement}
          onUpdateArrayItemField={workspace.handleUpdateArrayItemField}
          onSelectLayer={handleSelectLayer}
          onInsertComponent={workspace.handleInsertComponent}
          sessions={ai.sessions}
          activeSessionId={ai.activeSessionId}
          messages={ai.messages}
          onSendMessage={ai.handleSendMessage}
          onCancelMessage={ai.handleCancelMessage}
          isGenerating={ai.isGenerating}
          lastCompileError={workspace.lastCompileError}
          activeModel={ai.activeModel}
          onSelectModel={ai.setActiveModel}
          onNewSession={ai.createNewSession}
          onSwitchSession={ai.switchSession}
          onDeleteSession={ai.deleteSession}
          onFixError={ai.handleFixError}
        />

        {/* Right workspace: Workbench (Editor & Preview) + Terminal */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-[#1c1c1c]">
          <Allotment vertical>
            <Allotment.Pane minSize={240} preferredSize={600}>
              <Workbench
                files={workspace.files}
                folders={workspace.folders}
                activeFile={workspace.activeFile}
                openTabs={workspace.openTabs}
                view={workspace.workbenchView}
                onViewChange={workspace.setWorkbenchView}
                showFileTree={workspace.showFileTree}
                onToggleFileTree={() => workspace.setShowFileTree((v) => !v)}
                onSelectFile={workspace.handleSelectFile}
                onUpdateFile={workspace.handleUpdateFile}
                onCloseTab={workspace.handleCloseTab}
                onCreateFile={workspace.handleCreateFile}
                onCreateFolder={workspace.handleCreateFolder}
                onDeleteFile={workspace.handleDeleteFile}
                onDeleteFolder={workspace.handleDeleteFolder}
                selectedElement={workspace.selectedElement}
                onSelectElement={workspace.handleSelectElement}
                designMode={workspace.showInspector}
                onAddConsoleLine={workspace.handleAddConsoleLine}
                devServerActive={workspace.devServerActive}
                onStartDevServer={workspace.handleStartDevServer}
                onDropComponent={workspace.handleDropComponent}
                onDeleteElement={workspace.handleElementDelete}
                onRuntimeError={ai.handleRuntimeError}
                onFixError={ai.handleFixError}
                webcontainerUrl={workspace.webcontainerUrl}
                webcontainerStatus={workspace.webcontainerStatus}
              />
            </Allotment.Pane>

            <Allotment.Pane minSize={80} maxSize={240} preferredSize={120}>
              <Terminal
                files={workspace.files}
                consoleLines={workspace.consoleLines}
                onClearConsole={workspace.handleClearConsole}
                onAddConsoleLine={workspace.handleAddConsoleLine}
                onUpdateFile={workspace.handleUpdateFile}
                onSetDevServerActive={workspace.setDevServerActive}
                terminalHistory={workspace.terminalHistory}
                setTerminalHistory={workspace.setTerminalHistory}
              />
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
