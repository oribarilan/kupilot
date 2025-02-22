import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as pako from 'pako';
import { KupilotKustoClient } from './kupilotKustoClient';

export interface CommandsProps {
    request: vscode.ChatRequest;
    stream: vscode.ChatResponseStream;
    kustoClient: KupilotKustoClient;
    logger: vscode.TelemetryLogger;
    cancellationToken: vscode.CancellationToken;
    chatHistory?: vscode.LanguageModelChatMessage[];
}

// Use gpt-4o since it is fast and high quality. gpt-3.5-turbo and gpt-4 are also available.
export const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-4o' };
export const SYS_PROMPT =
    'You are an Azure Data Explorer (aka Kusto) master. ' +
    'Your job is to help the user gain insights from the data of the given cluster.\n' +
    'If you write a Kusto query: \n' +
    '1. wrap it in triple backticks and specify the language as `kusto`.\n' +
    '2. use table names without the database as a prefix.\n';

export async function configureCluster() {
    try {
        const config = vscode.workspace.getConfiguration('kupilot');
        if (config.get('clusterUri') && config.get('database') && config.get('tenantId')) {
            vscode.window.showInformationMessage('You are about to override existing cluster configs. Proceed?', 'Yes', 'No')
                .then((selection) => {
                    if (selection === 'Yes') {
                        // continue
                    } else if (selection === 'No') {
                        return;
                    } else {
                        // The user dismissed the message without selecting an option
                        return;
                    }
                });
        }
        const clusterUri = await vscode.window.showInputBox({
            placeHolder: 'https://clusterName.kusto.windows.net',
            prompt: '#1: Enter your kusto cluster URI',
            ignoreFocusOut: true,
            validateInput: text => {
                // verify that the input is a valid URI
                try {
                    new URL(text);
                    return null;
                } catch (err) {
                    return 'Invalid URI';
                }
            }
        });
        const database = await vscode.window.showInputBox({
            placeHolder: 'database name',
            prompt: '#2: Enter your database name',
            ignoreFocusOut: true,
        });
        const tenantId = await vscode.window.showInputBox({
            placeHolder: 'tenant id',
            prompt: '#3: Enter your tenant id',
            ignoreFocusOut: true,
        });
        await config.update('clusterUri', clusterUri, vscode.ConfigurationTarget.Global);
        await config.update('database', database, vscode.ConfigurationTarget.Global);
        await config.update('tenantId', tenantId, vscode.ConfigurationTarget.Global);
    } catch (err) {
        vscode.window.showWarningMessage('Kupilot: Failed to configure cluster');
        console.error(err);
    }
}

export async function getBestPractices(): Promise<string> {
    const bestPracticesPath = path.join(__dirname, 'artifacts', 'best_practices.md');
    const bestPractices = await fs.promises.readFile(bestPracticesPath, 'utf-8');
    return bestPractices;
}

export function generateQueryLink(cluster: string, database: string, query: string) {
    const compressedQuery = pako.gzip(query);
    const base64EncodedQuery = Buffer.from(compressedQuery).toString('base64');
    const urlEncodedQuery = encodeURIComponent(base64EncodedQuery);
    const shareable = `https://dataexplorer.azure.com/clusters/${cluster}/databases/${database}?query=${urlEncodedQuery}`;
    return shareable;
}

export function handleError(
    logger: vscode.TelemetryLogger,
    err: any,
    stream: vscode.ChatResponseStream
): void {
    // making the chat request might fail because
    // - model does not exist
    // - user consent not given
    // - quote limits exceeded
    logger.logError(err);

    if (err instanceof vscode.LanguageModelError) {
        console.log(err.message, err.code, err.cause);
        if (err.cause instanceof Error && err.cause.message.includes('off_topic')) {
            stream.markdown(vscode.l10n.t("I'm sorry, I can only explain computer science concepts."));
        }
    } else {
        // re-throw other errors so they show up in the UI
        throw err;
    }
}

export async function processChatResponse(
    stream: vscode.ChatResponseStream,
    chatResponse: vscode.LanguageModelChatResponse,
    kustoClient: KupilotKustoClient
): Promise<string> {
    // Process the chat response:
    // stream response as-is to the user
    // call kustoQueryHandler to handle kusto queries if exist
    let response = '';
    for await (const fragment of chatResponse.text) {
        response += fragment;
        stream.markdown(fragment);
    }
    return kustoQueryHandler(stream, kustoClient, response);
}

export function kustoQueryHandler(
    stream: vscode.ChatResponseStream,
    kustoClient: KupilotKustoClient,
    response: string
): string {
    // Search for the existence of a Kusto query in chat response
    // if exists, performs some handling on it:
    // - create a button to execute it in the browser
    const query = getKustoQuery(response);
    if (query && kustoClient) {
        const uri = vscode.Uri.parse(
            generateQueryLink(kustoClient.clusterName, kustoClient.database, query)
        );
        stream.button({
            command: 'vscode.open',
            title: 'Execute in browser',
            arguments: [uri],
        });
    }
    return query;
}

export function getKustoQuery(text: string): string {
    const regex = /```kusto([\s\S]*?)```/;
    const match = text.match(regex);
    return match ? match[1] : '';
}
