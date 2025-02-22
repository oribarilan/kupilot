import * as vscode from 'vscode';
import { KupilotKustoClient } from '../kupilotKustoClient';
import { CommandsProps, getBestPractices, handleError, MODEL_SELECTOR, processChatResponse, SYS_PROMPT } from '../common';

export const somethingNewCommand = async ({
    request,
    stream,
    kustoClient,
    logger,
    cancellationToken,
    chatHistory = [],
}: CommandsProps) => {
    stream.progress('Thinking creatively...');
    let query = '';
    try {
        const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
        if (model) {
            let topic = request.prompt || '';
            if (request.prompt === '') {
                // take a random topic from the list
                const topics = [
                    'KQL',
                    'distribution',
                    'noSQL',
                    'columnar data store',
                    'query optimization',
                    'data ingestion',
                    'data visualization',
                    'time series',
                ];
                topic = topics[Math.floor(Math.random() * topics.length)];
            }
            const messages = [
                ...chatHistory,
                vscode.LanguageModelChatMessage.User(
                    'Please tell me something very specific about Azure Data Explorer, in the following context' +
                        '<Context>\n' +
                        `Topic: ${topic}\n` +
                        '</Context>\n'
                ),
            ];
            console.log(messages);
            const chatResponse = await model.sendRequest(
                messages,
                { modelOptions: { temperature: 0.7 } },
                cancellationToken
            );
            query = await processChatResponse(stream, chatResponse, kustoClient);
        }
    } catch (err) {
        console.error(err);
        stream.markdown('Failed.');
        handleError(logger, err, stream);
    }

    logger.logUsage('request', { kind: 'somethingNew' });
    return { metadata: { command: 'somethingNew', query: query } };
};
