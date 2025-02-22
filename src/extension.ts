import * as vscode from 'vscode';
import { KupilotKustoClient } from './kupilotKustoClient';
import { configureCluster, handleError, MODEL_SELECTOR, processChatResponse, SYS_PROMPT } from './common';
import { exploreTablesCommand } from './commands/exploreDb';
import { optimizeCommand } from './commands/optimize';
import { somethingNewCommand } from './commands/somethingNew';
import { configureCommand } from './commands/configure';
import { explainCommand } from './commands/explain';
import { previewResultsCommand } from './commands/previewResults';

const KUPILOT_CONFIGURE_COMMAND_ID = 'kupilot.config';
const KUPILOT_PARTICIPANT_ID = 'kusto.kupilot';

enum CommandNames {
    ExploreDB = 'exploreDb',
    Optimize = 'optimize',
    SomethingNew = 'somethingNew',
    Configure = 'configure',
    ResultsPreview = 'resultsPreview',
    Explain = 'explain',
}

const commandsToNaturalLanguage: Record<CommandNames, string> = {
    [CommandNames.ExploreDB]: 'Can you please explore my database?',
    [CommandNames.Optimize]: 'Can you please optimize my query?',
    [CommandNames.SomethingNew]: 'Can you please show me something new?',
    [CommandNames.Configure]: 'Can you help me configure my cluster?',
    [CommandNames.ResultsPreview]: 'Can you show me a preview of the results?',
    [CommandNames.Explain]: 'Can you please explain the following code to me?',
};

const buildChatHistoryAndSystemPrompt = async ({
    request,
    context,
    kustoClient,
    stream,
}: {
    request: vscode.ChatRequest;
    context: vscode.ChatContext;
    kustoClient: KupilotKustoClient;
    stream: vscode.ChatResponseStream;
}) => {
    const initialData = [vscode.LanguageModelChatMessage.User(`${SYS_PROMPT} \n`)];
    if (kustoClient) {
        const dbSchema = await kustoClient.getSchema();
        initialData.push(vscode.LanguageModelChatMessage.User(`${dbSchema.toString()} \n`));
    } else if (request.command !== CommandNames.Configure) {
        const lines = [
            'I am much better when you show me your cluster! Run `@kupilot /configure` to set it up.',
            'Providing cluster information will allow me to assist you better! Run `@kupilot /configure` to set it up.',
            'Hook me up with your cluster by running `@kupilot /configure` so I can help you better!',
            "Note that you haven't configured your cluster yet. Do it now by running `@kupilot /configure`!",
        ];
        const randomLine = lines[Math.floor(Math.random() * lines.length)];
        stream.markdown(randomLine + '\n\n');
    }
    return [
        ...initialData,
        ...context.history
            .map((history) => {
                if (history instanceof vscode.ChatRequestTurn) {
                    // In case the user passed a command, transform it to natural language.
                    if (!history.prompt && history.command) {
                        const naturalLanguageCommand =
                            commandsToNaturalLanguage[history.command as CommandNames];
                        return naturalLanguageCommand
                            ? vscode.LanguageModelChatMessage.User(naturalLanguageCommand)
                            : null;
                    }

                    return vscode.LanguageModelChatMessage.User(history.prompt);
                } else if (history instanceof vscode.ChatResponseTurn) {
                    if (history.result.errorDetails) {
                        return;
                    }

                    const responses = history.response.map((response) => {
                        if (response instanceof vscode.ChatResponseMarkdownPart) {
                            return response.value.value;
                        }
                    });

                    return vscode.LanguageModelChatMessage.Assistant(responses.filter(Boolean).join(','));
                }

                return;
            })
            .filter((historyItem) => !!historyItem),
    ];
};

interface IKupilotChatResult extends vscode.ChatResult {
    metadata: {
        command: string;
        // query if exists, empty string otherwise
        query: string;
    };
}

export function activate(context: vscode.ExtensionContext) {
    // const clusterUri = "https://kupilot.eastus2.kusto.windows.net";
    // const database = "investigations";
    // const tenantId = "9bc6f80b-73d8-4d7c-ae26-572c276851a5";
    const config = vscode.workspace.getConfiguration('kupilot');
    const clusterUri = config.get<string>('clusterUri');
    const database = config.get<string>('database');
    const tenantId = config.get<string>('tenantId');

    const logger = vscode.env.createTelemetryLogger({
        sendEventData(eventName, data) {
            // Capture event telemetry
            console.log(`Event: ${eventName}`);
            console.log(`Data: ${JSON.stringify(data)}`);
        },
        sendErrorData(error, data) {
            // Capture error telemetry
            console.error(`Error: ${error}`);
            console.error(`Data: ${JSON.stringify(data)}`);
        },
    });

    let kustoClient: KupilotKustoClient;
    if (clusterUri && database && tenantId) {
        kustoClient = new KupilotKustoClient(clusterUri, tenantId, database);
    }

    // Define the Kupilot chat handler.
    const handler: vscode.ChatRequestHandler = async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<IKupilotChatResult> => {
        const chatHistory = await buildChatHistoryAndSystemPrompt({ request, context, kustoClient, stream });
        // To talk to an LLM in your subcommand handler implementation, your
        // extension can use VS Code's `requestChatAccess` API to access the Copilot API.
        // The GitHub Copilot Chat extension implements this provider.
        if (request.command === CommandNames.ExploreDB) {
            if (!kustoClient) {
                handleError(logger, new Error('No cluster configured, please run /configure'), stream);
                return { metadata: { command: CommandNames.ExploreDB, query: '' } };
            }
            return await exploreTablesCommand({
                request,
                stream,
                kustoClient,
                logger,
                cancellationToken: token,
                chatHistory,
            });
        } else if (request.command === CommandNames.Optimize) {
            if (!kustoClient) {
                handleError(logger, new Error('No cluster configured, please run /configure'), stream);
                return { metadata: { command: CommandNames.Optimize, query: '' } };
            }
            return await optimizeCommand({
                request,
                stream,
                kustoClient,
                logger,
                cancellationToken: token,
                chatHistory,
            });
        } else if (request.command === CommandNames.Optimize) {
            if (!kustoClient) {
                handleError(logger, new Error('No cluster configured, please run /configure'), stream);
                return { metadata: { command: CommandNames.Optimize, query: '' } };
            }
            return await optimizeCommand({
                request,
                stream,
                kustoClient,
                logger,
                cancellationToken: token,
                chatHistory,
            });
        } else if (request.command === CommandNames.ResultsPreview) {
            return await previewResultsCommand({
                request,
                stream,
                kustoClient,
                logger,
                cancellationToken: token,
            });
        } else if (request.command === CommandNames.Configure) {
            const result = await configureCommand({
                request,
                stream,
                kustoClient,
                logger,
                cancellationToken: token,
            });

            const config = vscode.workspace.getConfiguration('kupilot');
            const clusterUri = config.get<string>('clusterUri');
            const database = config.get<string>('database');
            const tenantId = config.get<string>('tenantId');
            if (!clusterUri || !database || !tenantId) {
                handleError(
                    logger,
                    new Error('Missing cluster information, please re-run /configure'),
                    stream
                );
                return { metadata: { command: CommandNames.Configure, query: '' } };
            }

            kustoClient = new KupilotKustoClient(clusterUri, tenantId, database);
            return result;
        } else if (request.command === CommandNames.Explain) {
            return await explainCommand({
                request,
                stream,
                kustoClient,
                logger,
                cancellationToken: token,
            });
        } else {
            let query = '';
            try {
                const editor = vscode.window.activeTextEditor;
                const selection = editor?.selection;
                let highlighted;
                if (selection && !selection.isEmpty) {
                    const selectionRange = new vscode.Range(
                        selection.start.line,
                        selection.start.character,
                        selection.end.line,
                        selection.end.character
                    );
                    highlighted = editor.document.getText(selectionRange);
                }
                const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
                if (model) {
                    const messages = [
                        ...chatHistory,
                        ...(highlighted
                            ? [
                                  vscode.LanguageModelChatMessage.User(
                                      `Highlighted text in editor is: ${highlighted}`
                                  ),
                              ]
                            : []),
                        vscode.LanguageModelChatMessage.User(request.prompt),
                    ];

                    const chatResponse = await model.sendRequest(messages, {}, token);
                    query = await processChatResponse(stream, chatResponse, kustoClient);
                }
            } catch (err) {
                handleError(logger, err, stream);
            }

            logger.logUsage('request', { kind: '' });
            return { metadata: { command: '', query: query } };
        }
    };

    // Chat participants appear as top-level options in the chat input
    // when you type `@`, and can contribute sub-commands in the chat input
    // that appear when you type `/`.
    const kupilot = vscode.chat.createChatParticipant(KUPILOT_PARTICIPANT_ID, handler);
    kupilot.iconPath = vscode.Uri.joinPath(context.extensionUri, 'kupilot.jpg');
    kupilot.followupProvider = {
        provideFollowups(
            result: IKupilotChatResult,
            context: vscode.ChatContext,
            token: vscode.CancellationToken
        ) {
            let followups: vscode.ChatFollowup[] = [];
            if (result.metadata.query) {
                const wrappedQuery = `\n\n\`\`\`kusto\n${result.metadata.query}\n\`\`\``;
                const followup = {
                    prompt: wrappedQuery,
                    label: vscode.l10n.t('Preview query results'),
                    command: CommandNames.ResultsPreview,
                } satisfies vscode.ChatFollowup;
                followups.push(followup);
            } else {
                const followup = {
                    prompt: 'Tell me something about Kusto',
                    label: vscode.l10n.t('Tell me something about Kusto'),
                    command: CommandNames.SomethingNew,
                } satisfies vscode.ChatFollowup;
                followups.push(followup);
            }
            return followups;
        },
    };

    context.subscriptions.push(
        kupilot.onDidReceiveFeedback((feedback: vscode.ChatResultFeedback) => {
            // Log chat result feedback to be able to compute the success matric of the participant
            // unhelpful / totalRequests is a good success metric
            logger.logUsage('chatResultFeedback', {
                kind: feedback.kind,
            });
        })
    );

    context.subscriptions.push(
        kupilot,
        vscode.commands.registerTextEditorCommand(
            KUPILOT_CONFIGURE_COMMAND_ID,
            async (textEditor: vscode.TextEditor) => {
                await configureCluster();
            }
        )
    );
}

export function deactivate() { }
