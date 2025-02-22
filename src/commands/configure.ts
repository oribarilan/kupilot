import * as vscode from 'vscode';
import { CommandsProps, configureCluster, handleError, MODEL_SELECTOR, SYS_PROMPT } from '../common';

export const configureCommand = async ({
    request,
    stream,
    kustoClient,
    logger,
    cancellationToken,
    chatHistory = [],
}: CommandsProps) => {
    stream.progress("Let's configure your Kusto connection");
    await configureCluster();

    logger.logUsage('request', { kind: 'configure' });
    return { metadata: { command: 'configure', query: '' } };
};
